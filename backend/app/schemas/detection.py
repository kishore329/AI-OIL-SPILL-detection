"""
Pydantic schemas for the AI Oil Spill Detection API.
"""
from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


class DetectionAnalyzeResponse(BaseModel):
    """Response returned by POST /api/v1/detection/analyze."""
    detected: bool = Field(..., description="Whether an oil spill was detected")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence (never 100%)")
    spill_area_km2: float = Field(..., ge=0.0, description="Estimated oil slick surface area in km²")
    geometry_geojson: Optional[str] = Field(None, description="Spill boundary polygon GeoJSON")
    mask_base64: Optional[str] = Field(None, description="Visual segmentation mask overlay (base64 PNG)")
    model_name: str = Field(..., description="Model name (clearly marked DEMO MODEL when applicable)")
    processing_time_ms: float = Field(..., description="Inference latency in milliseconds")
    potential_false_positive: bool = Field(False, description="Flagged when confidence is below 70%")
    is_demo_model: bool = Field(True, description="Simulation / demo model indicator")

    # Location & Incident context
    latitude: float
    longitude: float
    timestamp: datetime
    incident_id: Optional[str] = Field(None, description="Linked or newly created incident ID in database")
    incident_code: Optional[str] = Field(None, description="Linked or newly created incident code")
    severity: Optional[str] = Field(None, description="Calculated severity (CRITICAL, HIGH, MODERATE, LOW)")
    risk_score: Optional[float] = Field(None, description="Initial computed risk score (0-100)")
    priority_score: Optional[float] = Field(None, description="Assigned priority dispatch score (0-100)")
    urgency_level: Optional[str] = Field(None, description="IMMEDIATE, HIGH, ELEVATED, or ROUTINE")
    coastline_eta_hours: Optional[float] = Field(None, description="Estimated time to shoreline impact in hours")
    nearby_zones_count: Optional[int] = Field(0, description="Count of environmental zones within 50km radius")
    detection_id: str = Field(..., description="DetectionResult DB record ID")
    details: dict[str, Any] = Field(default_factory=dict)
