"""
Abstract Base Provider for Oil Spill Movement Prediction.
Enables pluggable meteorological/oceanographic models (e.g. NOAA GNOME, Copernicus CMEMS, or Lagrangian Physics).
"""
from abc import ABC, abstractmethod
from typing import NamedTuple, Optional
from datetime import datetime


class PredictionDriftResult(NamedTuple):
    forecast_points: list[dict]
    trajectory_geojson: str
    predicted_positions_geojson: str
    uncertainty_corridor_geojson: str
    environmental_conditions: dict
    model_name: str
    confidence: float
    is_simulated: bool


class BaseMovementPredictionProvider(ABC):
    """Abstract interface that all movement prediction providers must implement."""

    @abstractmethod
    def predict(
        self,
        origin_lat: float,
        origin_lon: float,
        spill_area_km2: float,
        detection_time: datetime,
        wind_speed_ms: Optional[float] = None,
        wind_direction_deg: Optional[float] = None,
        current_speed_ms: Optional[float] = None,
        current_direction_deg: Optional[float] = None,
        forecast_horizon_hours: float = 24.0,
    ) -> PredictionDriftResult:
        """Calculate forward trajectory displacement and return structured results."""
        pass
