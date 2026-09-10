"""
Module 24 — Oil Spill AI Assistant Pydantic Schemas.
Validation and serialization schemas for conversational assistant queries,
grounded multi-module domain citations, and message histories.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Operator prompt or operational query")
    conversation_id: Optional[str] = Field(None, description="Optional existing conversation UUID to resume session")
    incident_id: Optional[str] = Field(None, description="Optional incident UUID to anchor conversation context")


class AssistantMessageSchema(BaseModel):
    id: str
    conversation_id: str
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str
    sources: list[str] = Field(default_factory=list, description="Verified domain source tags, e.g. 'Risk Assessment (Module 5)'")
    referenced_incident_id: Optional[str] = None
    referenced_incident_code: Optional[str] = None
    referenced_location: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AssistantChatResponse(BaseModel):
    conversation_id: str
    message: AssistantMessageSchema
    suggested_followups: list[str] = Field(default_factory=list, description="Contextual follow-up suggestions")


class AssistantConversationResponse(BaseModel):
    id: str
    title: str
    incident_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: list[AssistantMessageSchema] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class AssistantConversationListItem(BaseModel):
    id: str
    title: str
    incident_id: Optional[str] = None
    message_count: int = 0
    updated_at: datetime

    model_config = {"from_attributes": True}
