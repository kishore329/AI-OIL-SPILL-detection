"""
Pydantic schemas for Module 18 — Probable Spill Source Analyzer.
"""
from typing import Optional, Any
from pydantic import BaseModel, Field


class ReverseTrajectoryPointSchema(BaseModel):
    hours_prior: float = Field(..., description="Hours prior to spill detection (positive float, e.g. 6.0)")
    timestamp: str = Field(..., description="ISO datetime of backwards trajectory step")
    latitude: float
    longitude: float
    uncertainty_radius_km: float = Field(..., description="Expanding dispersion / drift uncertainty radius")
    step_summary: str = Field(..., description="Description of backward advection step")


class SourceEvidenceItemSchema(BaseModel):
    id: str
    evidence_category: str = Field(..., description="REVERSE_TRAJECTORY, AIS_VESSEL_PROXIMITY, SHIPPING_LANE_OVERLAP, PORT_TRAFFIC_CONVERGENCE, HISTORICAL_SPILL_CLUSTER")
    title: str
    description: str
    confidence_weight: float
    
    # Contextual Vessel Information (strictly safe non-accusatory wording)
    vessel_name: Optional[str] = None
    vessel_mmsi: Optional[str] = None
    vessel_type: Optional[str] = None
    vessel_flag: Optional[str] = None
    vessel_speed_knots: Optional[float] = None
    vessel_distance_to_candidate_km: Optional[float] = None
    relevance_wording: str = Field(
        "Potentially relevant vessel located within candidate source area during estimated discharge timeframe. Requires statutory investigation.",
        description="Safe legal terminology descriptor"
    )
    evidence_data_json: Optional[dict[str, Any]] = None
    created_at: str

    model_config = {"from_attributes": True}


class SourceCandidateItemSchema(BaseModel):
    id: str
    name: str = Field(..., description="Region name (e.g. Region A — East-Bound Shipping Corridor)")
    candidate_code: str = Field(..., description="REGION_A, REGION_B, REGION_C")
    candidate_type: str = Field(..., description="SHIPPING_LANE, OFFSHORE_ANCHORAGE, PIPELINE_CORRIDOR, PORT_APPROACH, OPEN_SEA")
    latitude: float
    longitude: float
    radius_km: float
    boundary_geojson: Optional[dict[str, Any]] = None
    confidence_score: float = Field(..., ge=0.0, le=100.0, description="Estimated probability percentage (0-100%)")
    rank_order: int
    time_window_hours_ago_min: float
    time_window_hours_ago_max: float
    description: Optional[str] = None
    environmental_factors_summary: Optional[str] = None
    evidence_items: list[SourceEvidenceItemSchema] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class SourceAnalysisResponse(BaseModel):
    """Complete source attribution analysis dossier returned to client."""
    id: str
    incident_id: str
    incident_code: str
    analyzed_at: str
    lookback_hours: float
    overall_confidence_score: float = Field(..., ge=0.0, le=100.0, description="Primary source region confidence percentage")
    primary_source_region_name: str
    estimated_discharge_time_start: str
    estimated_discharge_time_end: str
    reverse_trajectory: list[ReverseTrajectoryPointSchema] = Field(default_factory=list)
    reverse_cone_geojson: Optional[dict[str, Any]] = None
    candidates: list[SourceCandidateItemSchema] = Field(default_factory=list)
    potentially_relevant_vessels: list[SourceEvidenceItemSchema] = Field(default_factory=list)
    methodology_notes: Optional[str] = None
    legal_disclaimer: str = Field(
        "[STATUTORY ADVISORY] This source attribution is a probabilistic mathematical model "
        "synthesized from reverse Lagrangian advection, AIS traffic records, and bathymetric shipping corridors. "
        "It identifies candidate areas and potentially relevant vessels for statutory investigation "
        "and does not establish legal liability or definitive fault."
    )

    model_config = {"from_attributes": True}


class SourceAnalysisRequest(BaseModel):
    """Payload to trigger or re-run probable source attribution analysis."""
    lookback_hours: float = Field(24.0, ge=1.0, le=72.0, description="Lookback time window in hours (default 24h)")
    force_recalculate: bool = Field(True, description="Force re-evaluation of reverse drift and vessel queries")
    custom_drift_multiplier: Optional[float] = Field(None, description="Optional calibration factor for reverse current/wind advection")
