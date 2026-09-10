"""
EcosystemRiskAssessment ORM model — Module 12: Marine Ecosystem Risk Analyzer.
Stores per-incident ecosystem impact analysis including zone-level exposure scores,
intersection status, and the aggregated marine ecosystem risk score (0–100).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class EcosystemRiskAssessment(Base):
    """Top-level ecosystem risk analysis run for one incident."""

    __tablename__ = "ecosystem_risk_assessments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Overall composite score 0–100
    overall_risk_score = Column(Float, nullable=False, default=0.0)
    overall_severity = Column(String(20), nullable=False, default="LOW")   # LOW / MODERATE / HIGH / CRITICAL

    # Zone-level results stored as JSON array of EcosystemZoneRisk
    zone_results_json = Column(Text, nullable=True)

    # Most critical ecosystem identified
    most_sensitive_zone = Column(String(200), nullable=True)
    most_sensitive_type = Column(String(100), nullable=True)

    # Influence on the existing Risk Engine (additive modifier, ±5 pts)
    risk_engine_modifier = Column(Float, nullable=False, default=0.0)

    # Metadata
    zones_analyzed = Column(Integer, nullable=False, default=0)
    radius_km_used = Column(Float, nullable=False, default=100.0)
    used_movement_prediction = Column(Boolean, nullable=False, default=False)
    is_simulated = Column(Boolean, nullable=False, default=True)
    model_name = Column(String(100), nullable=False, default="ECOSYSTEM_RISK_V1")
    disclaimer = Column(Text, nullable=True)

    analyzed_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    incident = relationship("Incident", back_populates="ecosystem_risk_assessments")

    def __repr__(self) -> str:
        return (
            f"<EcosystemRiskAssessment id={self.id} "
            f"incident={self.incident_id} score={self.overall_risk_score}>"
        )
