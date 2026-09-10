"""
Pydantic schemas for Module 12 — Marine Ecosystem Risk Analyzer.
Covers per-zone ecosystem risk results and the aggregate incident-level response.
"""
from __future__ import annotations
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class EcosystemZoneRisk(BaseModel):
    """Risk profile for a single ecosystem zone relative to the spill."""
    zone_id: str
    zone_name: str
    zone_type: str                      # FISHING_ZONE, PROTECTED_AREA, CORAL_REEF, MANGROVE, etc.
    ecosystem_category: str             # Human-readable: "Coral Reef", "Mangrove Forest", etc.

    # Spatial metrics
    distance_km: float
    affected_area_km2: Optional[float] = None   # Estimated overlap/proximity area
    intersects: bool = False            # True if spill polygon overlaps zone polygon

    # Scoring breakdown
    sensitivity_score: float            # 0.0–1.0 — from configurable ecosystem weight table
    exposure_score: float               # 0.0–100.0 — proximity + area combined
    proximity_score: float              # 0.0–100.0 — distance-decay function
    zone_risk_score: float              # 0.0–100.0 — final weighted zone score
    zone_severity: str                  # LOW, MODERATE, HIGH, CRITICAL

    # Explanation
    explanation: str

    model_config = {"from_attributes": True}


class EcosystemAnalyzeRequest(BaseModel):
    """Optional override parameters for ecosystem analysis."""
    radius_km: Optional[float] = Field(100.0, ge=1.0, le=500.0, description="Search radius in km")
    use_movement_prediction: Optional[bool] = Field(
        False, description="If true, include +24h predicted positions in exposure calc"
    )


class EcosystemRiskResponse(BaseModel):
    """Aggregated marine ecosystem risk for one incident (Module 12 output)."""
    id: str
    incident_id: str
    incident_code: str

    # Top-level score
    overall_risk_score: float = Field(..., ge=0.0, le=100.0)
    overall_severity: str               # LOW, MODERATE, HIGH, CRITICAL

    # Most critical ecosystem
    most_sensitive_zone: Optional[str] = None
    most_sensitive_type: Optional[str] = None

    # Per-zone breakdown
    zone_results: list[EcosystemZoneRisk] = Field(default_factory=list)

    # Risk Engine integration
    risk_engine_modifier: float = Field(
        ...,
        description="Additive modifier applied to existing Risk Engine environmental score (±5 pts max)"
    )

    # Metadata
    zones_analyzed: int
    radius_km_used: float
    used_movement_prediction: bool
    is_simulated: bool
    model_name: str
    disclaimer: str

    analyzed_at: datetime

    model_config = {"from_attributes": True}


class EcosystemNearbyZoneItem(BaseModel):
    """Simplified ecosystem zone info for nearby-zones endpoint."""
    zone_id: str
    zone_name: str
    zone_type: str
    ecosystem_category: str
    sensitivity_score: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: float
    is_demo: bool = True


class EcosystemNearbyResponse(BaseModel):
    """Response for GET /api/v1/ecosystem-zones/nearby."""
    query_lat: float
    query_lon: float
    radius_km: float
    total: int
    zones: list[EcosystemNearbyZoneItem]
