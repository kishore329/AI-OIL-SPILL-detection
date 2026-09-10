"""
SQLAlchemy ORM models for Module 18 — Probable Spill Source Analyzer.
Reverse-trajectory Lagrangian modeling and contextual multi-source attribution.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.session import Base


def generate_uuid():
    return str(uuid.uuid4())


class SourceAnalysis(Base):
    """
    Master record for an incident's probable source attribution analysis.
    Stores estimated discharge time window, reverse drift trajectory, and overall confidence.
    """
    __tablename__ = "source_analyses"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    incident_id = Column(UUID(as_uuid=False), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    
    analyzed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    overall_confidence_score = Column(Float, nullable=False, default=0.0)  # 0.0 - 100.0%
    primary_source_region_name = Column(String(255), nullable=False)
    estimated_discharge_time_start = Column(DateTime(timezone=True), nullable=False)
    estimated_discharge_time_end = Column(DateTime(timezone=True), nullable=False)
    
    lookback_hours = Column(Float, default=24.0, nullable=False)
    reverse_trajectory_json = Column(JSON, nullable=True)  # List of coordinates and timestamps going back in time
    reverse_cone_geojson = Column(JSON, nullable=True)     # Polygon boundary representing uncertainty cone
    methodology_notes = Column(Text, nullable=True)
    
    # Statutory non-accusatory legal disclaimer
    legal_disclaimer = Column(
        Text,
        nullable=False,
        default=(
            "[STATUTORY ADVISORY] This source attribution is a probabilistic mathematical model "
            "synthesized from reverse Lagrangian advection, AIS traffic records, and bathymetric shipping corridors. "
            "It identifies candidate areas and potentially relevant vessels for statutory investigation "
            "and does not establish legal liability or definitive fault."
        ),
    )
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    incident = relationship("Incident", back_populates="source_analyses")
    candidates = relationship("SourceCandidate", back_populates="analysis", cascade="all, delete-orphan", order_by="SourceCandidate.rank_order")
    evidence_items = relationship("SourceEvidence", back_populates="analysis", cascade="all, delete-orphan")


class SourceCandidate(Base):
    """
    Ranked candidate source areas (e.g. Region A, Region B, Region C)
    derived from reverse drift intersections with shipping lanes, anchorages, and historical clusters.
    """
    __tablename__ = "source_candidates"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    analysis_id = Column(UUID(as_uuid=False), ForeignKey("source_analyses.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)  # e.g. "Region A — East-Bound Shipping Corridor"
    candidate_code = Column(String(50), nullable=False)  # e.g. "REGION_A", "REGION_B"
    candidate_type = Column(String(50), nullable=False, default="SHIPPING_LANE")  # SHIPPING_LANE, OFFSHORE_ANCHORAGE, PIPELINE_CORRIDOR, PORT_APPROACH, OPEN_SEA
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_km = Column(Float, nullable=False, default=5.0)
    boundary_geojson = Column(JSON, nullable=True)

    confidence_score = Column(Float, nullable=False, default=0.0)  # e.g. 78.0%
    rank_order = Column(Integer, nullable=False, default=1)
    
    time_window_hours_ago_min = Column(Float, nullable=False)  # e.g. 2.0 (hours prior to detection)
    time_window_hours_ago_max = Column(Float, nullable=False)  # e.g. 6.0 (hours prior to detection)
    
    description = Column(Text, nullable=True)
    environmental_factors_summary = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    analysis = relationship("SourceAnalysis", back_populates="candidates")
    evidence = relationship("SourceEvidence", back_populates="candidate", cascade="all, delete-orphan")


class SourceEvidence(Base):
    """
    Supporting evidence items (AIS track intersections, shipping lane overlaps,
    port traffic convergence, historical discharge clusters, and reverse drift physics).
    Uses strictly non-accusatory language.
    """
    __tablename__ = "source_evidence"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    analysis_id = Column(UUID(as_uuid=False), ForeignKey("source_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(UUID(as_uuid=False), ForeignKey("source_candidates.id", ondelete="SET NULL"), nullable=True, index=True)

    evidence_category = Column(String(50), nullable=False)  # REVERSE_TRAJECTORY, AIS_VESSEL_PROXIMITY, SHIPPING_LANE_OVERLAP, PORT_TRAFFIC_CONVERGENCE, HISTORICAL_SPILL_CLUSTER
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    confidence_weight = Column(Float, nullable=False, default=0.20)  # Contribution to candidate confidence
    
    # Contextual Vessel Information (when category == AIS_VESSEL_PROXIMITY)
    # Strictly safe terminology applied
    vessel_name = Column(String(255), nullable=True)
    vessel_mmsi = Column(String(20), nullable=True)
    vessel_type = Column(String(100), nullable=True)
    vessel_flag = Column(String(100), nullable=True)
    vessel_speed_knots = Column(Float, nullable=True)
    vessel_distance_to_candidate_km = Column(Float, nullable=True)
    
    # Safe wording descriptor (e.g. "Potentially relevant vessel located within candidate source region")
    relevance_wording = Column(
        String(255),
        nullable=False,
        default="Potentially relevant vessel located within candidate source area during estimated discharge timeframe. Requires statutory investigation.",
    )
    
    evidence_data_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    analysis = relationship("SourceAnalysis", back_populates="evidence_items")
    candidate = relationship("SourceCandidate", back_populates="evidence")
