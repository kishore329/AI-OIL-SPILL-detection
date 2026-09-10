"""
RiskAssessment ORM model.
Stores multi-factor risk scores for an incident.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Float, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.models.enums import IncidentSeverity
from sqlalchemy import Enum as SAEnum


def _uuid():
    return str(uuid.uuid4())


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Composite risk score (0–100)
    risk_score = Column(Float, nullable=False, default=0.0)
    severity = Column(
        SAEnum(IncidentSeverity, name="incident_severity_enum", create_type=False),
        nullable=True,
    )

    # Sub-scores (each 0–100)
    spill_size_score = Column(Float, nullable=True)
    coastal_proximity_score = Column(Float, nullable=True)
    environmental_score = Column(Float, nullable=True)
    spread_score = Column(Float, nullable=True)
    human_exposure_score = Column(Float, nullable=True)

    explanation = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    incident = relationship("Incident", back_populates="risk_assessments")

    def __repr__(self) -> str:
        return f"<RiskAssessment incident={self.incident_id} score={self.risk_score}>"
