"""
Pydantic schemas for Incident CRUD and responses.
"""
from __future__ import annotations
import json
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.enums import IncidentStatus, IncidentSeverity
from app.schemas.event import IncidentEventResponse


# ── GeoJSON helpers ────────────────────────────────────────────────────────

class GeoPoint(BaseModel):
    """GeoJSON Point geometry."""
    type: str = "Point"
    coordinates: list[float] = Field(..., min_length=2, max_length=3)

    @field_validator("coordinates")
    @classmethod
    def validate_coords(cls, v: list[float]) -> list[float]:
        if len(v) < 2:
            raise ValueError("coordinates must have at least [lng, lat]")
        lng, lat = v[0], v[1]
        if not (-180 <= lng <= 180):
            raise ValueError(f"longitude {lng} out of range [-180, 180]")
        if not (-90 <= lat <= 90):
            raise ValueError(f"latitude {lat} out of range [-90, 90]")
        return v


class GeoPolygon(BaseModel):
    """GeoJSON Polygon or MultiPolygon geometry."""
    type: str = Field(..., pattern=r"^(Polygon|MultiPolygon)$")
    coordinates: Any  # nested list structure varies


# ── Request schemas ────────────────────────────────────────────────────────

class IncidentCreate(BaseModel):
    """Schema for creating a new incident."""
    incident_code: str = Field(..., min_length=1, max_length=50,
                               examples=["INC-2024-001"])
    status: IncidentStatus = IncidentStatus.DETECTED
    severity: IncidentSeverity = IncidentSeverity.MODERATE
    risk_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    detection_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    spill_area_km2: Optional[float] = Field(None, ge=0.0)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    location_geojson: Optional[str] = Field(None,
                                            description="GeoJSON Point string")
    spill_geometry_geojson: Optional[str] = Field(None,
                                                   description="GeoJSON MultiPolygon string")
    description: Optional[str] = None
    source: Optional[str] = Field("SATELLITE", max_length=100)
    detected_at: Optional[datetime] = None

    @field_validator("location_geojson", "spill_geometry_geojson", mode="before")
    @classmethod
    def validate_geojson(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, dict):
            return json.dumps(v)
        try:
            json.loads(v)  # validate it's valid JSON
        except (json.JSONDecodeError, TypeError):
            raise ValueError("must be valid GeoJSON")
        return v

    @model_validator(mode="after")
    def sync_location(self) -> "IncidentCreate":
        """Auto-generate location_geojson from lat/lon if not provided."""
        if (self.latitude is not None and self.longitude is not None
                and self.location_geojson is None):
            self.location_geojson = json.dumps({
                "type": "Point",
                "coordinates": [self.longitude, self.latitude],
            })
        return self

    model_config = {"from_attributes": True}


class IncidentUpdate(BaseModel):
    """Schema for updating an existing incident (all fields optional)."""
    status: Optional[IncidentStatus] = None
    severity: Optional[IncidentSeverity] = None
    risk_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    detection_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    spill_area_km2: Optional[float] = Field(None, ge=0.0)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    location_geojson: Optional[str] = None
    spill_geometry_geojson: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = Field(None, max_length=100)
    detected_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Response schemas ───────────────────────────────────────────────────────

class IncidentResponse(BaseModel):
    """Full incident representation returned by the API."""
    id: str
    incident_code: str
    status: IncidentStatus
    severity: IncidentSeverity
    risk_score: Optional[float] = None
    detection_confidence: Optional[float] = None
    spill_area_km2: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_geojson: Optional[str] = None
    spill_geometry_geojson: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    is_active: bool = True
    detected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    events: list[IncidentEventResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class IncidentListResponse(BaseModel):
    """Paginated list of incidents."""
    items: list[IncidentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
