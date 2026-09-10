"""
Pydantic schemas for Vessel Tracking, AIS Trajectories, and Suspect Attribution.
Used to identify which ships passed through an oil spill and rank them by oil leakage priority.
"""
from typing import Optional
from pydantic import BaseModel, Field


class AISWaypoint(BaseModel):
    """A single geographic waypoint along a vessel's historical AIS trajectory."""
    latitude: float
    longitude: float
    timestamp: str
    speed_knots: float
    course_deg: float


class SuspectVessel(BaseModel):
    """
    Commercial vessel identified within spatial and temporal proximity of an oil spill,
    ranked by algorithmic probability of being the source of the oil leakage.
    """
    id: str
    name: str
    vessel_type: str  # e.g. Crude Oil Tanker (VLCC), Chemical Tanker, Bulk Carrier
    mmsi: str
    imo: str
    flag: str
    callsign: str
    destination: str
    cargo_type: str
    deadweight_tonnage: int
    
    # Current realtime coordinates & motion
    current_lat: float
    current_lon: float
    heading_deg: float
    current_speed_knots: float
    
    # Historical AIS track passing by the spill
    trajectory: list[AISWaypoint]
    
    # Leakage Suspicion Metrics
    leak_probability_score: float = Field(
        ..., description="Algorithmic probability (0-100%) that this ship caused the oil spill"
    )
    suspicion_rank: int = Field(
        ..., description="1 = Highest priority suspect for oil leakage"
    )
    priority_tier: str = Field(
        ..., description="PRIMARY_SUSPECT, SECONDARY_SUSPECT, or CLEARED"
    )
    closest_approach_km: float = Field(
        ..., description="Minimum distance in km between vessel track and oil spill centroid"
    )
    closest_approach_time: str = Field(
        ..., description="Timestamp when the vessel was closest to the spill"
    )
    speed_at_incident: float = Field(
        ..., description="Speed in knots when passing the spill coordinates"
    )
    anomaly_indicators: list[str] = Field(
        default_factory=list,
        description="Specific operational anomalies (e.g. speed drop, track intersection, high-risk cargo)"
    )
    recommended_action: str = Field(
        ..., description="Coast Guard / MRCC tactical response recommendation"
    )


class SuspectVesselsResponse(BaseModel):
    """Response containing suspect vessels ranked by oil leakage priority."""
    incident_id: str
    incident_code: str
    incident_latitude: float
    incident_longitude: float
    spill_area_km2: Optional[float] = None
    detection_time: Optional[str] = None
    total_suspects: int
    primary_suspect: Optional[SuspectVessel] = None
    suspects: list[SuspectVessel]


class ActiveVesselPoint(BaseModel):
    """Lightweight representation of an active vessel for the live map layer."""
    id: str
    name: str
    vessel_type: str
    mmsi: str
    flag: str
    current_lat: float
    current_lon: float
    heading_deg: float
    speed_knots: float
    destination: str
    is_suspect: bool = False
    associated_incident_code: Optional[str] = None
    leak_probability: Optional[float] = None
    trajectory: list[list[float]] = Field(
        default_factory=list, description="Array of [lat, lon] waypoints for map rendering"
    )


class ActiveVesselsResponse(BaseModel):
    """Collection of active vessels for the map layer."""
    total: int
    vessels: list[ActiveVesselPoint]


class VesselAlertRequest(BaseModel):
    """Request to trigger Coast Guard MRCC intercept notice on a suspect vessel."""
    incident_id: str
    alert_type: str = "MRCC_INTERCEPT_NOTICE"  # MRCC_INTERCEPT_NOTICE, PORT_STATE_CONTROL_FLAG, AERIAL_RECON
    officer_notes: Optional[str] = None
