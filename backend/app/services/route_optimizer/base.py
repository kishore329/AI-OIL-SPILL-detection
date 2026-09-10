"""
Abstract provider interface for marine route optimization — Module 14.
"""
from abc import ABC, abstractmethod
from typing import NamedTuple, Any

from app.models.emergency_vessel import EmergencyVessel


class RouteResult(NamedTuple):
    distance_nm: float
    distance_km: float
    travel_time_hours: float
    waypoints: list[dict[str, Any]]
    route_geometry_geojson: str
    provider_name: str
    confidence: float
    weather_delay_factor: float
    urgency_rating: str
    avoided_zones: list[str]


class BaseRouteOptimizerProvider(ABC):
    """Abstract base provider for calculating maritime response routes."""

    @abstractmethod
    def calculate_route(
        self,
        origin: tuple[float, float],
        destination: tuple[float, float],
        vessel: EmergencyVessel,
        incident_priority: str = "ROUTINE",
        weather_penalty: float = 1.05,
        avoid_restricted_zones: bool = True,
    ) -> RouteResult:
        """
        Calculates optimized marine route between origin and destination coordinates.
        Returns a RouteResult containing distance, waypoints, geometry, and travel time.
        """
        pass
