"""
Module 24 — Oil Spill AI Assistant ORM Models.
Stores conversation sessions and message history with source citations,
referenced incident IDs, and coordinates for spatial mapping.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class AssistantConversation(Base):
    """
    Operator conversation session with the Oil Spill AI Assistant.
    Can optionally be anchored to a specific incident context.
    """
    __tablename__ = "assistant_conversations"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    title = Column(String(250), nullable=False, default="Operational Discussion")
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

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
    messages = relationship(
        "AssistantMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AssistantMessage.created_at.asc()",
    )
    incident = relationship("Incident", foreign_keys=[incident_id])

    def __repr__(self) -> str:
        return f"<AssistantConversation {self.id} title='{self.title}'>"


class AssistantMessage(Base):
    """
    Individual conversational turn between user operator and AI assistant.
    Maintains explicit source citations and referenced entity metadata.
    """
    __tablename__ = "assistant_messages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    conversation_id = Column(
        UUID(as_uuid=False),
        ForeignKey("assistant_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role = Column(String(20), nullable=False)  # "user", "assistant", "system"
    content = Column(Text, nullable=False)

    # List of source attribution tags, e.g. ["Risk Assessment (Module 5)", "Coastal Impact (Module 13)"]
    sources = Column(JSON, nullable=False, default=list)

    # Referenced incident linkage for 1-click dossier navigation
    referenced_incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    referenced_incident_code = Column(String(100), nullable=True)

    # Spatial coordinates for 1-click map focusing
    referenced_location = Column(JSON, nullable=True)  # {"latitude": 13.08, "longitude": 80.27, "name": "Ennore"}

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    conversation = relationship("AssistantConversation", back_populates="messages")
    referenced_incident = relationship("Incident", foreign_keys=[referenced_incident_id])

    def __repr__(self) -> str:
        return f"<AssistantMessage {self.id} role='{self.role}' conv={self.conversation_id}>"
