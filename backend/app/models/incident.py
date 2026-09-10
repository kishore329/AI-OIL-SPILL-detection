"""
Incident ORM model — works without PostGIS/GeoAlchemy2.
Geometry stored as GeoJSON text; lat/lon as Float columns.
When PostGIS becomes available, geometry columns can be added via migration.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Float, DateTime,
    Enum as SAEnum, Text, Index, Boolean,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base
from app.models.enums import IncidentStatus, IncidentSeverity


def _uuid() -> str:
    return str(uuid.uuid4())


class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = (
        Index("ix_incidents_risk_score", "risk_score"),
    )

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_code = Column(String(50), unique=True, nullable=False, index=True)

    # Status & classification
    status = Column(
        SAEnum(IncidentStatus, name="incident_status_enum", create_type=True),
        nullable=False,
        default=IncidentStatus.DETECTED,
        index=True,
    )
    severity = Column(
        SAEnum(IncidentSeverity, name="incident_severity_enum", create_type=True),
        nullable=False,
        default=IncidentSeverity.MODERATE,
        index=True,
    )

    # Scores
    risk_score = Column(Float, nullable=True)
    detection_confidence = Column(Float, nullable=True)
    spill_area_km2 = Column(Float, nullable=True)

    # Location (lat/lon always present for map rendering)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Geometry as GeoJSON strings (PostGIS-ready upgrade path)
    # POINT geometry: {"type":"Point","coordinates":[lng,lat]}
    location_geojson = Column(Text, nullable=True)
    # MULTIPOLYGON geometry: standard GeoJSON
    spill_geometry_geojson = Column(Text, nullable=True)

    # Metadata
    description = Column(Text, nullable=True)
    source = Column(String(100), nullable=True, default="SATELLITE")
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Timestamps
    detected_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    detection_results = relationship(
        "DetectionResult", back_populates="incident", cascade="all, delete-orphan"
    )
    risk_assessments = relationship(
        "RiskAssessment", back_populates="incident", cascade="all, delete-orphan"
    )
    events = relationship(
        "IncidentEvent",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="IncidentEvent.created_at",
    )
    movement_predictions = relationship(
        "MovementPrediction",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="MovementPrediction.created_at.desc()",
    )
    ecosystem_risk_assessments = relationship(
        "EcosystemRiskAssessment",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="EcosystemRiskAssessment.analyzed_at.desc()",
    )
    coastal_impact_predictions = relationship(
        "CoastalImpactPrediction",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="CoastalImpactPrediction.estimated_hours_to_impact.asc()",
    )
    optimized_routes = relationship(
        "OptimizedRoute",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="OptimizedRoute.created_at.desc()",
    )
    response_assignments = relationship(
        "ResponseAssignment",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="ResponseAssignment.created_at.desc()",
    )
    cleanup_plans = relationship(
        "CleanupPlan",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="CleanupPlan.created_at.desc()",
    )
    resource_assignments = relationship(
        "ResourceAssignment",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="ResourceAssignment.created_at.desc()",
    )
    source_analyses = relationship(
        "SourceAnalysis",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="SourceAnalysis.created_at.desc()",
    )
    economic_assessments = relationship(
        "EconomicAssessment",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="EconomicAssessment.created_at.desc()",
    )
    economic_assumptions = relationship(
        "EconomicAssumption",
        back_populates="incident",
        cascade="all, delete-orphan",
    )
    recovery_assessments = relationship(
        "EnvironmentalRecoveryAssessment",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="EnvironmentalRecoveryAssessment.created_at.desc()",
    )
    recovery_predictions = relationship(
        "RecoveryPrediction",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="RecoveryPrediction.horizon_months.asc()",
    )
    recovery_factors = relationship(
        "RecoveryFactor",
        back_populates="incident",
        cascade="all, delete-orphan",
    )
    alerts = relationship(
        "Alert",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="Alert.created_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<Incident {self.incident_code} [{self.severity}/{self.status}]>"

