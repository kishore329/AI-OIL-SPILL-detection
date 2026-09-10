"""
Deterministic Demo / Simulation Provider for Oil Spill Movement Prediction.
Generates realistic regional oceanographic drift conditions for prototype testing
when live satellite meteorological buoys are unavailable.
"""
from __future__ import annotations
import math
import hashlib
from datetime import datetime
from typing import Optional

from app.services.movement_prediction.base import (
    BaseMovementPredictionProvider,
    PredictionDriftResult,
)
from app.services.movement_prediction.physics_provider import LagrangianPhysicsProvider


class DemoMovementPredictionProvider(BaseMovementPredictionProvider):
    """
    Simulation provider that selects regional environmental forcing based on coordinates
    and delegates to the Lagrangian drift physics engine.
    """

    def __init__(self):
        self._physics = LagrangianPhysicsProvider()

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
        # If any condition was not provided, deterministically derive based on geographical coordinates
        h = int(hashlib.md5(f"{origin_lat:.2f},{origin_lon:.2f}".encode("utf-8")).hexdigest()[:8], 16)

        if wind_speed_ms is None:
            # Typical marine winds 5.5 - 9.5 m/s
            wind_speed_ms = round(5.5 + ((h % 40) / 10.0), 1)

        if wind_direction_deg is None:
            # Regional wind orientation (e.g. SW monsoon in Indian ocean: 210° - 250°)
            if 0.0 <= origin_lat <= 28.0 and 50.0 <= origin_lon <= 95.0:
                wind_direction_deg = round(215.0 + (h % 35), 1)
            else:
                wind_direction_deg = round(float((h * 13) % 360), 1)

        if current_speed_ms is None:
            # Ocean surface current 0.35 - 0.75 m/s
            current_speed_ms = round(0.35 + ((h % 40) / 100.0), 2)

        if current_direction_deg is None:
            # Regional coastal current: in Bay of Bengal / Arabian Sea flows northeastward / eastward
            if 0.0 <= origin_lat <= 28.0 and 50.0 <= origin_lon <= 95.0:
                current_direction_deg = round(45.0 + (h % 40), 1)
            else:
                current_direction_deg = round(float((h * 29) % 360), 1)

        result = self._physics.predict(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            spill_area_km2=spill_area_km2,
            detection_time=detection_time,
            wind_speed_ms=wind_speed_ms,
            wind_direction_deg=wind_direction_deg,
            current_speed_ms=current_speed_ms,
            current_direction_deg=current_direction_deg,
            forecast_horizon_hours=forecast_horizon_hours,
        )

        return PredictionDriftResult(
            forecast_points=result.forecast_points,
            trajectory_geojson=result.trajectory_geojson,
            predicted_positions_geojson=result.predicted_positions_geojson,
            uncertainty_corridor_geojson=result.uncertainty_corridor_geojson,
            environmental_conditions=result.environmental_conditions,
            model_name="DEMO_LAGRANGIAN_DRIFT_V1",
            confidence=0.88,
            is_simulated=True,
        )
