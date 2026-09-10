"""
Map API routes — /api/v1/map
Geographic data and layer aggregation for frontend Leaflet map.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.incident import Incident
from app.schemas.map import MapResponse, MapIncidentPoint, MapLayersResponse
from app.gis.spatial_service import SpatialService

router = APIRouter(prefix="/map", tags=["Map"])


@router.get(
    "/incidents",
    response_model=MapResponse,
    summary="Get map incident data",
    description=(
        "Returns lightweight geographic data for all active incidents, "
        "including coordinates, severity, status, and spill geometry GeoJSON."
    ),
)
def get_map_incidents(
    active_only: bool = Query(True, description="Only return active incidents"),
    db: Session = Depends(get_db),
):
    q = select(Incident)
    if active_only:
        q = q.where(Incident.is_active == True)  # noqa: E712

    rows = db.execute(q).scalars().all()
    points = [MapIncidentPoint.model_validate(r) for r in rows]

    return MapResponse(incidents=points, total=len(points))


@router.get(
    "/layers",
    response_model=MapLayersResponse,
    summary="Get complete GIS map layers",
    description=(
        "Returns all geospatial layers for the interactive map: "
        "Incidents, Spill Polygons, Fishing Zones, Protected Marine Areas, Ports, "
        "Shipping Lanes, and Coastal baseline. All simulation data clearly tagged."
    ),
)
def get_map_layers(
    active_only: bool = Query(True, description="Only return active incidents"),
    db: Session = Depends(get_db),
):
    return SpatialService.get_map_layers(db, active_only=active_only)
