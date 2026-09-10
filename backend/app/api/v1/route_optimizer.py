"""
Emergency Vessel Route Optimizer API Endpoints — Module 14.
Endpoints:
  GET  /api/v1/vessels/available
  GET  /api/v1/incidents/{incident_id}/recommended-vessels
  POST /api/v1/incidents/{incident_id}/optimize-route
  GET  /api/v1/vessels/{vessel_id}/route
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.route_optimizer import (
    AvailableVesselsResponse,
    RecommendedVesselsResponse,
    OptimizedRouteResponse,
    RouteOptimizeRequest,
)
from app.services.route_optimizer.service import EmergencyRouteOptimizerService

vessel_router = APIRouter(prefix="/vessels", tags=["Module 14: Emergency Vessels & Routing"])
incident_router = APIRouter(prefix="/incidents", tags=["Module 14: Emergency Vessels & Routing"])


@vessel_router.get(
    "/available",
    response_model=AvailableVesselsResponse,
    summary="Get available emergency response vessel fleet",
    description="Returns available emergency response vessels with on-board booms, skimmers, speed, and real-time positions.",
)
def get_available_vessels(
    only_available: bool = True,
    db: Session = Depends(get_db),
):
    return EmergencyRouteOptimizerService.get_available_vessels(db, only_available=only_available)


@vessel_router.get(
    "/{vessel_id}/route",
    response_model=OptimizedRouteResponse,
    summary="Get active optimized route for an emergency vessel",
    description="Returns the latest calculated marine navigational route, waypoints, and arrival time for this vessel.",
)
def get_vessel_route(
    vessel_id: str,
    db: Session = Depends(get_db),
):
    return EmergencyRouteOptimizerService.get_vessel_route(db, vessel_id)


@incident_router.get(
    "/{incident_id}/recommended-vessels",
    response_model=RecommendedVesselsResponse,
    summary="Get recommended emergency response vessels for an incident",
    description=(
        "Ranks available emergency response vessels by suitability score using transit distance, "
        "equipment capacity (booms/skimmers), speed, and Module 05 Priority Engine urgency."
    ),
)
def get_recommended_vessels(
    incident_id: str,
    db: Session = Depends(get_db),
):
    return EmergencyRouteOptimizerService.recommend_vessels(db, incident_id)


@incident_router.post(
    "/{incident_id}/optimize-route",
    response_model=OptimizedRouteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Calculate and save optimized emergency response route",
    description=(
        "Computes an optimized nautical clearance route from the recommended or selected vessel "
        "to the oil spill, avoiding shoreline hazards and shallow banks."
    ),
)
def optimize_route(
    incident_id: str,
    payload: RouteOptimizeRequest = RouteOptimizeRequest(),
    db: Session = Depends(get_db),
):
    return EmergencyRouteOptimizerService.optimize_route(db, incident_id, payload)
