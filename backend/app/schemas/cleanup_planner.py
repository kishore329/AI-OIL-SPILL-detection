"""
Pydantic schemas for Smart Cleanup Planner — Module 15.
"""
from typing import Optional
from pydantic import BaseModel, Field


class CleanupRecommendationItem(BaseModel):
    """Actionable cleanup response recommendation."""
    id: str
    action: str
    action_title: str
    reason: str
    priority: str = Field(..., description="CRITICAL, HIGH, MEDIUM, or LOW")
    suitability_score: float = Field(..., ge=0.0, le=100.0, description="Suitability score from 0 to 100")
    required_resources: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    operational_status: str = Field("RECOMMENDED", description="RECOMMENDED, ACCEPTED, REJECTED, or DEPLOYED")
    decision_notes: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class EnvironmentalContext(BaseModel):
    """Incident environmental and spatial telemetry used for plan generation."""
    wind_speed_ms: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    current_speed_ms: Optional[float] = None
    current_direction_deg: Optional[float] = None
    wave_height_m: Optional[float] = None
    coastal_distance_km: Optional[float] = None
    earliest_coastal_impact_hours: Optional[float] = None
    most_sensitive_ecosystem: Optional[str] = None
    spill_area_km2: Optional[float] = None
    incident_priority_score: Optional[float] = None
    available_response_vessels: Optional[int] = 0


class CleanupPlanResponse(BaseModel):
    """Complete strategic cleanup plan with prioritized recommendations."""
    id: str
    incident_id: str
    incident_code: str
    plan_code: str
    spill_size_tier: str
    oil_type: str
    overall_strategy: str
    status: str
    environmental_context: EnvironmentalContext
    recommendations: list[CleanupRecommendationItem]
    decision_support_disclaimer: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class CleanupPlanGenerateRequest(BaseModel):
    """Parameters for generating or re-evaluating a cleanup response plan."""
    oil_type: Optional[str] = Field(None, description="Optional override for oil category (e.g., HEAVY_CRUDE, DIESEL_FUEL)")
    strategy_focus: Optional[str] = Field(None, description="Optional strategic focus: OFFSHORE_DEFENSE, SHORELINE_PROTECTION, or BALANCED")
    force_recalculate: Optional[bool] = Field(False, description="Force re-generation of recommendations even if active plan exists")


class RecommendationStatusUpdateRequest(BaseModel):
    """Payload for operator accept/reject of an action recommendation."""
    status: str = Field(..., description="Target status: ACCEPTED or REJECTED")
    decision_notes: Optional[str] = Field(None, description="Operational notes or reason from Incident Commander")
