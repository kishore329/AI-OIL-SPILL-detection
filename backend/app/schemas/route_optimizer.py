"""
Pydantic schemas for Emergency Vessel Route Optimizer — Module 14.
"""
from typing import Optional
from pydantic import BaseModel, Field


class EmergencyVesselItem(BaseModel):
    """Emergency response vessel specification and real-time status."""
    id: str
    name: str
    vessel_type: str
    mmsi: Optional[str] = None
    callsign: Optional[str] = None
    home_port: str
    is_available: bool
    status: str
    capabilities: list[str]
    max_speed_knots: float
    cruising_speed_knots: float
    skimmer_capacity_m3h: float
    boom_meters: float
    dispersant_liters: float
    latitude: float
    longitude: float
    heading_deg: Optional[float] = 0.0
    assigned_incident_id: Optional[str] = None

    model_config = {"from_attributes": True}


class AvailableVesselsResponse(BaseModel):
    """Fleet overview of all available and deployed emergency vessels."""
    total: int
    available_count: int
    vessels: list[EmergencyVesselItem]


class NavigationalWaypoint(BaseModel):
    """Nautical waypoint along maritime clearance route."""
    index: int
    name: str
    latitude: float
    longitude: float
    leg_distance_nm: float
    cumulative_distance_nm: float
    leg_eta_hours: float
    waypoint_type: str = "CLEARANCE_WAYPOINT"  # DEPARTURE, CLEARANCE_WAYPOINT, CORRIDOR_WAYPOINT, INCIDENT_DESTINATION


class OptimizedRouteResponse(BaseModel):
    """Complete optimized response route response with nautical waypoints and GeoJSON."""
    id: str
    incident_id: str
    incident_code: str
    vessel: EmergencyVesselItem
    start_latitude: float
    start_longitude: float
    destination_latitude: float
    destination_longitude: float
    estimated_distance_nm: float
    estimated_distance_km: float
    estimated_travel_time_hours: float
    estimated_arrival_time: str
    route_geometry_geojson: str
    waypoints: list[NavigationalWaypoint]
    routing_provider: str
    route_confidence: float
    weather_delay_factor: float
    urgency_rating: str
    avoided_restricted_zones: list[str] = Field(default_factory=list)
    disclaimer: str = (
        "[PROTOTYPE MARITIME ROUTE] Algorithmic navigation route with shoreline clearance for decision support. "
        "Not certified for SOLAS vessel bridge navigation or automated autopilot execution."
    )
    created_at: str


class RecommendedVesselItem(BaseModel):
    """Vessel ranked by recommendation engine for a specific incident."""
    vessel: EmergencyVesselItem
    rank: int
    suitability_score: float = Field(..., description="Overall fit score from 0 to 100")
    estimated_distance_nm: float
    estimated_travel_time_hours: float
    suitability_rationale: str
    equipment_match: list[str]
    response_priority: str = "PRIMARY_DISPATCH"  # PRIMARY_DISPATCH, BACKUP_DISPATCH, STANDBY


class RecommendedVesselsResponse(BaseModel):
    """Ranked recommendations of available response vessels for an incident."""
    incident_id: str
    incident_code: str
    incident_severity: str
    incident_priority_score: float
    total_vessels_evaluated: int
    recommendations: list[RecommendedVesselItem]
    decision_support_note: str = (
        "Decision support recommendation based on vessel speed, distance, containment equipment, "
        "and incident priority urgency. Operational commander review required before dispatch."
    )


class RouteOptimizeRequest(BaseModel):
    """Optional parameters for route optimization execution."""
    vessel_id: Optional[str] = Field(None, description="Selected vessel ID; defaults to top recommended vessel if omitted")
    avoid_restricted_zones: Optional[bool] = Field(True, description="Enforce coastal clearance and buffer around shoals")
    weather_penalty: Optional[float] = Field(1.05, ge=1.0, le=2.5, description="Environmental delay multiplier (1.0 = calm sea)")
