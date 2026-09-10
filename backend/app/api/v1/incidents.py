"""
Incident API routes — /api/v1/incidents
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.enums import IncidentStatus, IncidentSeverity
from app.schemas.incident import (
    IncidentCreate, IncidentUpdate,
    IncidentResponse, IncidentListResponse,
)
from app.schemas.event import IncidentEventCreate, IncidentEventResponse
from app.schemas.map import NearbyZonesResponse
from app.services.incident_service import IncidentService
from app.gis.spatial_service import SpatialService

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get(
    "",
    response_model=IncidentListResponse,
    summary="List incidents",
    description="Returns paginated incidents with optional filtering by status, severity, and risk score.",
)
def list_incidents(
    status: Optional[IncidentStatus] = Query(None, description="Filter by status"),
    severity: Optional[IncidentSeverity] = Query(None, description="Filter by severity"),
    min_risk: Optional[float] = Query(None, ge=0, le=100, description="Minimum risk score"),
    max_risk: Optional[float] = Query(None, ge=0, le=100, description="Maximum risk score"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
):
    return IncidentService.list_incidents(
        db,
        status=status,
        severity=severity,
        min_risk=min_risk,
        max_risk=max_risk,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post(
    "",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create incident",
)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    return IncidentService.create_incident(db, payload)


@router.get(
    "/nearby",
    response_model=list[IncidentResponse],
    summary="Find nearby incidents",
    description="Returns incidents within radius_km of a lat/lon point.",
)
def find_nearby(
    lat: float = Query(..., ge=-90, le=90, description="Center latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Center longitude"),
    radius_km: float = Query(50.0, ge=0.1, le=5000, description="Search radius in km"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return IncidentService.find_nearby(db, lat, lon, radius_km, limit)


@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="Get incident by ID",
)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    return IncidentService.get_incident(db, incident_id)


@router.put(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="Update incident",
)
def update_incident(
    incident_id: str,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
):
    return IncidentService.update_incident(db, incident_id, payload)


@router.delete(
    "/{incident_id}",
    summary="Archive incident",
    description="Soft-deletes (archives) an incident. Data is preserved.",
)
def delete_incident(incident_id: str, db: Session = Depends(get_db)):
    return IncidentService.delete_incident(db, incident_id)


# ── Spatial Proximity: Nearby Environmental Zones ──────────────────────────

@router.get(
    "/{incident_id}/nearby-zones",
    response_model=NearbyZonesResponse,
    summary="Get environmental zones near incident",
    description=(
        "Returns all protected areas, fishing zones, ports, and sensitive ecosystems "
        "within a configurable radius (e.g., radius_km=10 or 50) of the incident."
    ),
)
def get_nearby_zones(
    incident_id: str,
    radius_km: float = Query(50.0, ge=0.5, le=1000.0, description="Proximity search radius in km"),
    db: Session = Depends(get_db),
):
    return SpatialService.get_nearby_zones(db, incident_id, radius_km)


# ── Events sub-resource ────────────────────────────────────────────────────

@router.get(
    "/{incident_id}/events",
    response_model=list[IncidentEventResponse],
    summary="Get incident events",
)
def list_events(incident_id: str, db: Session = Depends(get_db)):
    return IncidentService.list_events(db, incident_id)


@router.post(
    "/{incident_id}/events",
    response_model=IncidentEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add event to incident",
)
def create_event(
    incident_id: str,
    payload: IncidentEventCreate,
    db: Session = Depends(get_db),
):
    return IncidentService.create_event(db, incident_id, payload)
