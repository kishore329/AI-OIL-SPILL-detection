"""
Pydantic schemas for IncidentEvent.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class IncidentEventCreate(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100,
                            examples=["STATUS_CHANGED", "NOTE_ADDED", "TEAM_ASSIGNED"])
    description: str = Field(..., min_length=1)
    created_by: Optional[str] = Field("system", max_length=100)

    model_config = {"from_attributes": True}


class IncidentEventResponse(BaseModel):
    id: str
    incident_id: str
    event_type: str
    description: str
    created_by: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
