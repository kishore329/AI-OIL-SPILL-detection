"""
ORM models for Module 16 — Response Resource Allocation.
Tables:
  - resource_assignments: Resource allocations to active incidents with scores and status.
  - resource_status_history: Audit history of status changes for equipment and teams.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class ResourceAssignment(Base):
    """Resource allocation record assigning equipment, vessel, or team to an incident."""

    __tablename__ = "resource_assignments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resource_id = Column(
        UUID(as_uuid=False),
        ForeignKey("response_resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    quantity_assigned = Column(Float, nullable=False, default=1.0)
    status = Column(
        String(30),
        nullable=False,
        default="ASSIGNED",
        index=True,
    )  # ASSIGNED, DEPLOYED, RELEASED, CANCELLED

    allocation_score = Column(Float, nullable=False, default=80.0)  # 0 to 100
    allocation_rationale = Column(Text, nullable=True)
    assigned_by = Column(String(100), nullable=False, default="Incident Commander")

    assigned_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    deployed_at = Column(DateTime(timezone=True), nullable=True)
    released_at = Column(DateTime(timezone=True), nullable=True)

    notes = Column(Text, nullable=True)

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

    incident = relationship("Incident", back_populates="resource_assignments")
    resource = relationship("ResponseResource", back_populates="assignments")

    def __repr__(self) -> str:
        return f"<ResourceAssignment id={self.id} incident={self.incident_id} resource={self.resource_id} status={self.status}>"


class ResourceStatusHistory(Base):
    """Immutable transition audit record of resource status changes."""

    __tablename__ = "resource_status_history"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    resource_id = Column(
        UUID(as_uuid=False),
        ForeignKey("response_resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    previous_status = Column(String(30), nullable=False)
    new_status = Column(String(30), nullable=False)
    changed_by = Column(String(100), nullable=False, default="System")
    reason = Column(Text, nullable=True)
    incident_id = Column(UUID(as_uuid=False), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    resource = relationship("ResponseResource", back_populates="status_history")

    def __repr__(self) -> str:
        return f"<ResourceStatusHistory resource={self.resource_id} {self.previous_status}->{self.new_status}>"
