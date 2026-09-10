"""
Pydantic schemas for Map and GIS spatial endpoints.
"""
from typing import Optional
from pydantic import BaseModel, Field
from app.models.enums import IncidentSeverity, IncidentStatus, ZoneType, ZoneSensitivity


class MapIncidentPoint(BaseModel):
    """Lightweight incident representation for map rendering."""
    id: str
    incident_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_geojson: Optional[str] = None
    spill_geometry_geojson: Optional[str] = None
    risk_score: Optional[float] = None
    severity: IncidentSeverity
    status: IncidentStatus
    spill_area_km2: Optional[float] = None
    detection_confidence: Optional[float] = None
    description: Optional[str] = None
    source: Optional[str] = None

    model_config = {"from_attributes": True}


class MapResponse(BaseModel):
    """Collection of map points."""
    incidents: list[MapIncidentPoint]
    total: int


class NearbyZoneItem(BaseModel):
    """Environmental zone within spatial proximity of an incident."""
    zone_id: str
    name: str
    zone_type: ZoneType
    sensitivity: ZoneSensitivity
    distance_km: float = Field(..., description="Geodesic distance in kilometers from incident point")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geometry_geojson: Optional[str] = None
    is_demo: bool = True

    model_config = {"from_attributes": True}


class NearbyZonesResponse(BaseModel):
    """Response containing all environmental zones within the given radius."""
    incident_id: str
    incident_code: str
    incident_latitude: float
    incident_longitude: float
    radius_km: float
    total_nearby: int
    zones: list[NearbyZoneItem]


class GISLayerFeature(BaseModel):
    """Generic GIS vector feature for environmental layers."""
    id: str
    name: str
    feature_type: str  # FISHING_ZONE, PROTECTED_AREA, PORT, SHIPPING_LANE, COASTLINE
    sub_type: Optional[str] = None
    sensitivity: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geometry_geojson: Optional[str] = None
    description: Optional[str] = None
    is_demo: bool = True


class MapLayersResponse(BaseModel):
    """Aggregated GIS layers for frontend interactive map."""
    incidents: list[MapIncidentPoint]
    protected_areas: list[GISLayerFeature]
    fishing_zones: list[GISLayerFeature]
    ports: list[GISLayerFeature]
    shipping_lanes: list[GISLayerFeature]
    coastline: Optional[list[list[float]]] = None  # Coordinate sequence for coastal baseline
    is_demo_data: bool = True
