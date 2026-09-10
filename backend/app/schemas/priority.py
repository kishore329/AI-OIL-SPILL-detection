"""
Pydantic schemas for Incident Priority Engine.
Defines ranked queue items, factor breakdowns, and priority query responses.
"""
from __future__ import annotations
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.enums import IncidentSeverity, IncidentStatus


class PriorityFactorsSummary(BaseModel):
    """Component score breakdown contributing to the total priority score (sum max 100)."""
    risk_score_component: float = Field(..., description="Contribution from hazard risk score (max 35 pts)")
    urgency_eta_component: float = Field(..., description="Contribution from shoreline proximity & ETA (max 25 pts)")
    environmental_component: float = Field(..., description="Contribution from marine protected areas & fishing zones (max 15 pts)")
    spill_size_component: float = Field(..., description="Contribution from spill area & volume (max 15 pts)")
    status_urgency_component: float = Field(..., description="Contribution from operational uncontained status (max 10 pts)")


class PriorityRankItem(BaseModel):
    """Ranked incident item in the priority dispatch queue."""
    rank: int = Field(..., ge=1, description="Queue position: #1 is highest urgency")
    incident_id: str
    incident_code: str
    priority_score: float = Field(..., ge=0.0, le=100.0, description="Deterministic priority score 0-100")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Underlying multi-factor risk score")
    severity: IncidentSeverity
    status: IncidentStatus
    spill_area_km2: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_coastline_km: Optional[float] = None
    coastline_eta_hours: Optional[float] = Field(None, description="Estimated time in hours until shoreline impact (at 2.5 km/h surface drift)")
    urgency_level: str = Field(..., description="IMMEDIATE, HIGH, ELEVATED, or ROUTINE")
    reason: str = Field(..., description="Explainable justification of why this incident holds this queue rank")
    factors: PriorityFactorsSummary
    detected_at: Optional[datetime] = None


class PriorityQueueResponse(BaseModel):
    """Response payload for priority queue endpoints."""
    total_active: int
    queue_length: int
    highest_priority_incident: Optional[str] = None
    items: list[PriorityRankItem]
    model_disclaimer: str = Field(
        "AI-driven deterministic operational priority ranking for emergency response dispatch",
        description="Advisory disclaimer"
    )
    generated_at: datetime


class PriorityRankSimulationItem(BaseModel):
    """Simulation incident payload for POST /api/v1/priority/rank."""
    incident_id: Optional[str] = None
    incident_code: str
    risk_score: float = Field(..., ge=0.0, le=100.0)
    severity: IncidentSeverity
    status: IncidentStatus = IncidentStatus.DETECTED
    spill_area_km2: float = Field(1.0, ge=0.0)
    latitude: float
    longitude: float
    distance_coastline_km: Optional[float] = None
    distance_protected_area_km: Optional[float] = None
    distance_fishing_zone_km: Optional[float] = None
    detection_confidence: Optional[float] = 0.90


class PrioritySimulationRequest(BaseModel):
    """Payload for POST /api/v1/priority/rank."""
    incidents: list[PriorityRankSimulationItem]
