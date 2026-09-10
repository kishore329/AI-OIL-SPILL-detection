"""
Pydantic schemas for Oil Spill Movement Predictor — Module 11.
"""
from typing import Optional
from pydantic import BaseModel, Field


class ForecastPoint(BaseModel):
    """Specific forward milestone prediction point (+1h, +3h, +6h, +12h, +24h)."""
    horizon_hours: float = Field(..., description="Hours into the future (+1.0, +3.0, etc.)")
    timestamp: str = Field(..., description="Estimated UTC timestamp of arrival")
    latitude: float
    longitude: float
    distance_km: float = Field(..., description="Cumulative distance from spill origin in km")
    bearing_deg: float = Field(..., description="Direction of movement from origin in degrees (0-360)")
    bearing_cardinal: str = Field(..., description="Compass cardinal direction (e.g. NE, ENE, SSW)")
    estimated_area_km2: float = Field(..., description="Estimated expanded surface slick area in km²")
    arrival_time: str = Field(..., description="Formatted arrival time display")


class EnvironmentalConditions(BaseModel):
    """Atmospheric and oceanographic forcing conditions applied in drift model."""
    wind_speed_ms: float = Field(..., description="Wind speed in meters per second")
    wind_direction_deg: float = Field(..., description="Wind direction in degrees (direction FROM which wind blows)")
    current_speed_ms: float = Field(..., description="Ocean surface current velocity in m/s")
    current_direction_deg: float = Field(..., description="Ocean current set direction in degrees (direction TOWARDS which current flows)")
    water_temp_c: float = Field(26.5, description="Sea surface temperature in Celsius")
    wave_height_m: float = Field(1.2, description="Significant wave height in meters")


class MovementPredictionRequest(BaseModel):
    """Optional user-supplied overrides for what-if simulation."""
    wind_speed_ms: Optional[float] = Field(None, ge=0.0, le=50.0, description="Override wind speed in m/s")
    wind_direction_deg: Optional[float] = Field(None, ge=0.0, le=360.0, description="Override wind direction (0-360°)")
    current_speed_ms: Optional[float] = Field(None, ge=0.0, le=10.0, description="Override ocean current speed in m/s")
    current_direction_deg: Optional[float] = Field(None, ge=0.0, le=360.0, description="Override ocean current direction (0-360°)")
    forecast_horizon_hours: Optional[float] = Field(24.0, ge=1.0, le=72.0, description="Total forecast duration in hours")


class MovementPredictionResponse(BaseModel):
    """Complete movement trajectory forecast response."""
    id: str
    incident_id: str
    incident_code: str
    prediction_time: str
    forecast_horizon_hours: float
    origin_latitude: float
    origin_longitude: float
    origin_area_km2: float
    environmental_conditions: EnvironmentalConditions
    forecast_points: list[ForecastPoint]
    trajectory_geojson: Optional[str] = Field(None, description="GeoJSON LineString string of trajectory")
    predicted_positions_geojson: Optional[str] = Field(None, description="GeoJSON FeatureCollection of forecast milestones")
    uncertainty_corridor_geojson: Optional[str] = Field(None, description="GeoJSON Polygon string of uncertainty corridor")
    model_name: str
    confidence: float
    is_simulated: bool = True
    disclaimer: str = "Prototype Lagrangian drift trajectory model. Incorporates windage and surface current advection."
    created_at: str


class MovementHistoryItem(BaseModel):
    """Lightweight summary of a previous prediction run."""
    id: str
    prediction_time: str
    forecast_horizon_hours: float
    model_name: str
    confidence: float
    wind_speed_ms: Optional[float] = None
    current_speed_ms: Optional[float] = None
    created_at: str
