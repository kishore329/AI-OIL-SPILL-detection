"""
Pydantic schemas for Coastal Impact Predictor & Time-to-Impact — Module 13.
"""
from typing import Optional
from pydantic import BaseModel, Field


class CoastalImpactItem(BaseModel):
    """Specific affected coastal asset or shoreline sector prediction item."""
    id: str
    incident_id: str
    target_location: str = Field(..., description="Name of the coastal asset or sector")
    target_type: str = Field(..., description="Asset type: BEACH, PORT, COASTAL_SETTLEMENT, FISHING_ZONE, etc.")
    latitude: float
    longitude: float
    distance_km: float = Field(..., description="Geodesic distance from slick origin or trajectory path in km")
    estimated_hours_to_impact: float = Field(..., description="Estimated hours until oil makes contact")
    predicted_impact_time: str = Field(..., description="Projected arrival ISO timestamp")
    impact_horizon: str = Field(..., description="Categorical bucket: NOW, 1H, 3H, 6H, 12H, 24H, >24H")
    severity: str = Field(..., description="CRITICAL, HIGH, MODERATE, LOW")
    confidence: float = Field(..., description="Model confidence factor (0.0 to 1.0)")
    impact_probability: float = Field(..., description="Estimated impact probability percentage (0 to 100)")
    prediction_source: str = Field("MODULE_11_LAGRANGIAN_TRAJECTORY")
    spatial_relation: str = Field("DOWNWIND_APPROACHING")
    summary_notes: Optional[str] = None
    is_simulated: bool = True

    model_config = {"from_attributes": True}


class TimelineHorizonGroup(BaseModel):
    """Chronological impact horizon bucket (NOW, 1H, 3H, 6H, 12H, 24H)."""
    horizon: str = Field(..., description="NOW, 1H, 3H, 6H, 12H, 24H, >24H")
    hours_label: str = Field(..., description="e.g. '< 1 Hour', '+1 to 3 Hours', '+3 to 6 Hours'")
    locations_count: int = Field(..., description="Number of coastal targets threatened in this horizon")
    highest_severity: str = Field("LOW", description="Maximum severity in this horizon")
    locations: list[CoastalImpactItem] = Field(default_factory=list)


class CoastalImpactResponse(BaseModel):
    """Complete coastal impact assessment response for an incident."""
    incident_id: str
    incident_code: str
    total_affected_locations: int
    earliest_impact_hours: Optional[float] = Field(None, description="Minimum hours until earliest coastal impact")
    earliest_impact_location: Optional[str] = Field(None, description="Name of earliest coastal asset threatened")
    earliest_impact_type: Optional[str] = Field(None, description="Category of earliest coastal asset threatened")
    overall_coastal_severity: str = Field("LOW", description="Overall severity: CRITICAL, HIGH, MODERATE, LOW")
    timeline_summary: list[TimelineHorizonGroup] = Field(default_factory=list)
    affected_locations: list[CoastalImpactItem] = Field(default_factory=list)
    impact_zones_geojson: Optional[str] = Field(None, description="GeoJSON FeatureCollection of affected coastal points")
    model_name: str = "COASTAL_IMPACT_V1"
    confidence_score: float = Field(0.85, description="Average confidence score across targets")
    is_simulated: bool = True
    disclaimer: str = (
        "[ESTIMATED IMPACT] Time-to-impact is an algorithmic approximation based on "
        "Lagrangian trajectory advection and coastal boundary proximity. Not an official hydrographic hazard guarantee."
    )
    analyzed_at: str


class TimeToImpactResponse(BaseModel):
    """Concise time-to-impact metric summary designed for quick dashboard alerts and priority dispatch."""
    incident_id: str
    incident_code: str
    earliest_impact_hours: Optional[float] = Field(None, description="Earliest estimated hours to impact")
    earliest_impact_target: Optional[str] = Field(None, description="First affected coastal location")
    earliest_impact_type: Optional[str] = Field(None, description="Category of first affected asset")
    urgency_level: str = Field("MONITORING", description="IMMEDIATE, CRITICAL, HIGH, ELEVATED, MONITORING")
    shoreline_contact_confirmed: bool = Field(False, description="True if distance <= 1km or hours <= 0.5")
    total_threatened_assets: int
    timeline_counts: dict[str, int] = Field(default_factory=dict, description="Counts by horizon (NOW, 1H, 3H, 6H, 12H, 24H)")
    alert_summary: str
    disclaimer: str = (
        "[ESTIMATED IMPACT] Algorithmic estimate based on predictive drift model. Clearly marked as estimated."
    )


class CoastalImpactPredictRequest(BaseModel):
    """Optional parameters and overrides for coastal impact prediction simulation."""
    force_movement_recalculate: Optional[bool] = Field(False, description="Force re-run of Module 11 movement model")
    search_buffer_km: Optional[float] = Field(80.0, ge=10.0, le=300.0, description="Radial search buffer in km")
    wind_speed_ms: Optional[float] = Field(None, ge=0.0, le=50.0)
    wind_direction_deg: Optional[float] = Field(None, ge=0.0, le=360.0)
    current_speed_ms: Optional[float] = Field(None, ge=0.0, le=10.0)
    current_direction_deg: Optional[float] = Field(None, ge=0.0, le=360.0)
