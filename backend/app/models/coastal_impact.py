"""
CoastalImpactPrediction ORM model — Module 13: Coastal Impact Predictor and Time-to-Impact.
Stores predicted shoreline and coastal asset impacts along with estimated arrival horizons,
distances, and severity classifications derived from Module 11 movement trajectories.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class CoastalImpactPrediction(Base):
    """Specific affected coastal asset or shoreline sector prediction record."""

    __tablename__ = "coastal_impact_predictions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Coastal target details
    target_location = Column(String(200), nullable=False)
    target_type = Column(String(50), nullable=False)  # BEACH, COASTAL_SETTLEMENT, PORT, FISHING_ZONE, PROTECTED_AREA, TOURISM, INFRASTRUCTURE, COASTLINE
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # Spatial proximity to predicted drift trajectory
    distance_km = Column(Float, nullable=False, default=0.0)

    # Estimated time metrics
    estimated_hours_to_impact = Column(Float, nullable=False)  # e.g., 3.5 hours (0.0 if already contacting)
    predicted_impact_time = Column(DateTime(timezone=True), nullable=False)
    impact_horizon = Column(String(20), nullable=False, default="3H")  # NOW, 1H, 3H, 6H, 12H, 24H, >24H

    # Risk & confidence
    severity = Column(String(20), nullable=False, default="MODERATE")  # LOW, MODERATE, HIGH, CRITICAL
    confidence = Column(Float, nullable=False, default=0.85)  # 0.0 to 1.0
    impact_probability = Column(Float, nullable=False, default=75.0)  # 0 to 100%

    # Algorithm attribution
    prediction_source = Column(String(100), nullable=False, default="MODULE_11_LAGRANGIAN_TRAJECTORY")
    spatial_relation = Column(String(50), nullable=False, default="DOWNWIND_APPROACHING")
    summary_notes = Column(Text, nullable=True)
    is_simulated = Column(Boolean, nullable=False, default=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship to parent incident
    incident = relationship("Incident", back_populates="coastal_impact_predictions")

    def __repr__(self) -> str:
        return (
            f"<CoastalImpactPrediction id={self.id} incident={self.incident_id} "
            f"target={self.target_location} eta={self.estimated_hours_to_impact}h sev={self.severity}>"
        )
