"""
Pydantic schemas for Risk Engine calculations, factor breakdowns, and historical assessments.
"""
from __future__ import annotations
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.enums import IncidentSeverity


class RiskFactor(BaseModel):
    """Explainable risk factor component."""
    name: str = Field(..., description="Factor label, e.g. Coastal Proximity")
    score: float = Field(..., description="Calculated point contribution")
    max_score: float = Field(..., description="Maximum possible points for this factor")
    percentage: float = Field(..., description="Percentage of max score utilized")
    reason: str = Field(..., description="Plain-language explanation of why this score was assigned")


class RiskCalculateRequest(BaseModel):
    """Input payload for POST /api/v1/risk/calculate."""
    incident_id: Optional[str] = Field(None, description="Optional DB incident ID to pull parameters from")

    # Direct parameters (used if incident_id is omitted or for simulation overrides)
    spill_area_km2: Optional[float] = Field(None, ge=0.0, description="Spill surface area in km²")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    detection_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    spread_severity: Optional[str] = Field(None, description="CRITICAL, HIGH, MODERATE, LOW")
    distance_coastline_km: Optional[float] = Field(None, ge=0.0)
    distance_protected_area_km: Optional[float] = Field(None, ge=0.0)
    distance_fishing_zone_km: Optional[float] = Field(None, ge=0.0)
    distance_port_km: Optional[float] = Field(None, ge=0.0)
    distance_shipping_lane_km: Optional[float] = Field(None, ge=0.0)


class RiskAssessmentResponse(BaseModel):
    """Explainable risk assessment response."""
    assessment_id: str
    incident_id: Optional[str] = None
    incident_code: Optional[str] = None
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Normalized score 0-100")
    severity: IncidentSeverity = Field(..., description="Classification: LOW, MODERATE, HIGH, CRITICAL")
    model_disclaimer: str = Field(
        "Model-based decision-support score (AI-assisted risk assessment — not an official regulatory mandate)",
        description="Disclaimer note"
    )

    # Sub-scores
    spill_size_score: float
    coastal_proximity_score: float
    environmental_score: float
    human_exposure_score: float
    spread_score: float

    # Factor breakdown
    factors: list[RiskFactor]

    # Spatial context distances (km)
    distances: dict[str, Optional[float]] = Field(default_factory=dict)

    calculation_timestamp: datetime

    model_config = {"from_attributes": True}


class IncidentRiskHistoryResponse(BaseModel):
    """Chronological history of risk assessments for an incident."""
    incident_id: str
    incident_code: str
    current_risk_score: float
    current_severity: IncidentSeverity
    total_assessments: int
    assessments: list[RiskAssessmentResponse]
