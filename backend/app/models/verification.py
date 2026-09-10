"""
SQLAlchemy ORM models for Module 17 — Multi-Source Verification.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.session import Base


def generate_uuid():
    return str(uuid.uuid4())


class VerificationSource(Base):
    """
    Standardized registry of evidence sources (Satellite, Drone, Citizen, AIS, Metocean, etc.)
    with default weights and metadata.
    """
    __tablename__ = "verification_sources"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=False, index=True)  # e.g., SATELLITE, DRONE, CITIZEN_REPORT
    name = Column(String(100), nullable=False)
    default_weight = Column(Float, nullable=False, default=0.20)  # e.g. 0.30 for satellite, 0.20 for drone
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<VerificationSource {self.code} weight={self.default_weight}>"


class VerificationRecord(Base):
    """
    Master multi-source verification dossier for a specific oil spill incident.
    """
    __tablename__ = "verification_records"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    incident_id = Column(UUID(as_uuid=False), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    
    overall_confidence = Column(Float, nullable=False, default=0.0)  # 0.0 to 1.0 (or 0 to 100%)
    decision = Column(String(30), nullable=False, default="NEEDS_REVIEW")  # VERIFIED, NEEDS_REVIEW, REJECTED
    cross_source_agreement_score = Column(Float, nullable=False, default=1.0)  # 0.0 to 1.0
    contradiction_detected = Column(Boolean, default=False)
    explanation = Column(Text, nullable=True)
    
    verified_by = Column(String(100), default="Verification Engine")  # "Verification Engine" or operator name
    verified_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    incident = relationship("Incident", backref="verification_records")
    evidence_items = relationship(
        "VerificationEvidence",
        back_populates="verification_record",
        cascade="all, delete-orphan",
        order_by="VerificationEvidence.created_at.desc()"
    )

    def __repr__(self):
        return f"<VerificationRecord incident={self.incident_id} decision={self.decision} confidence={self.overall_confidence}>"


class VerificationEvidence(Base):
    """
    Individual evidence item submitted or collected from a specific evidence provider.
    """
    __tablename__ = "verification_evidence"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    verification_record_id = Column(UUID(as_uuid=False), ForeignKey("verification_records.id", ondelete="CASCADE"), nullable=False, index=True)
    
    source_code = Column(String(50), nullable=False)  # SATELLITE, DRONE, CITIZEN_REPORT, AIS_VESSEL, METOCEAN_CONTEXT
    provider_name = Column(String(100), nullable=False)  # Sentinel-1 SAR, UAV Strike Drone-4, Citizen Spotter #14, etc.
    
    confidence = Column(Float, nullable=False)  # 0.0 to 1.0 (e.g. 0.92 for 92%)
    weight_applied = Column(Float, nullable=False, default=0.20)  # Weight used during evaluation
    quality_score = Column(Float, nullable=False, default=1.0)  # 0.0 to 1.0 (data reliability / resolution multiplier)
    
    data_origin = Column(String(20), nullable=False, default="SIMULATED")  # LIVE, HISTORICAL, SIMULATED
    evidence_type = Column(String(100), nullable=False)  # SAR_ANOMALY, THERMAL_FOOTAGE, EYEWITNESS_PHOTO, AIS_TRACK_OVERLAP, CURRENT_CONVERGENCE
    
    agrees_with_spill = Column(Boolean, default=True)  # True = confirms spill presence, False = contradicts/clear water
    evidence_metadata = Column(JSON, nullable=True)  # Raw provider payload (coordinates, image URL, vessel MMSI, sensor SNR, etc.)
    notes = Column(Text, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationship
    verification_record = relationship("VerificationRecord", back_populates="evidence_items")

    def __repr__(self):
        return f"<VerificationEvidence source={self.source_code} confidence={self.confidence} agrees={self.agrees_with_spill}>"
