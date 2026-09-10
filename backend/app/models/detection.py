"""
DetectionResult ORM model.
Stores ML model outputs for satellite/drone image analyses.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.session import Base


def _uuid():
    return str(uuid.uuid4())


class DetectionResult(Base):
    __tablename__ = "detection_results"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    detected = Column(Boolean, nullable=False, default=False)
    confidence = Column(Float, nullable=True)
    spill_area_km2 = Column(Float, nullable=True)
    model_name = Column(String(100), nullable=False, default="DEMO-SAR-UNET-V1 (DEMO MODEL)")
    processing_time_ms = Column(Float, nullable=True)
    potential_false_positive = Column(Boolean, nullable=False, default=False)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geometry_geojson = Column(Text, nullable=True)
    image_reference = Column(String(512), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    incident = relationship("Incident", back_populates="detection_results")

    def __repr__(self) -> str:
        return f"<DetectionResult {self.id} detected={self.detected} conf={self.confidence}>"
