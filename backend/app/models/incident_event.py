"""
IncidentEvent ORM model.
Audit trail / history log for an incident lifecycle.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.session import Base


def _uuid():
    return str(uuid.uuid4())


class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    event_type = Column(String(100), nullable=False)   # e.g. STATUS_CHANGED, NOTE_ADDED
    description = Column(Text, nullable=False)
    created_by = Column(String(100), nullable=True, default="system")

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    incident = relationship("Incident", back_populates="events")

    def __repr__(self) -> str:
        return f"<IncidentEvent {self.event_type} incident={self.incident_id}>"
