"""
Vessel Tracking & AIS Suspect Attribution API endpoints — /api/v1/vessels
Identifies ships passing by an oil spill and ranks them by priority/probability of oil leakage.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.incident import Incident
from app.schemas.vessel import (
    SuspectVesselsResponse,
    ActiveVesselsResponse,
    VesselAlertRequest,
)
from app.gis.vessel_service import VesselService

router = APIRouter(prefix="/vessels", tags=["Vessels & AIS Tracking"])


@router.get(
    "/suspect/{incident_id}",
    response_model=SuspectVesselsResponse,
    summary="Get suspect vessels correlated with an oil spill",
    description=(
        "Correlates historical AIS vessel tracks with the incident's coordinates, "
        "detecting ships that passed by this way and ranking them by priority of oil leakage."
    ),
)
def get_suspect_vessels_for_incident(
    incident_id: str,
    db: Session = Depends(get_db),
):
    # Query incident by incident_code or uuid
    incident = db.execute(
        select(Incident).where(Incident.incident_code == incident_id)
    ).scalar_one_or_none()

    if not incident:
        # Check if it's a valid UUID string before querying by id
        try:
            import uuid
            uuid.UUID(incident_id)
            incident = db.get(Incident, incident_id)
        except (ValueError, TypeError):
            incident = None

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )

    return VesselService.get_suspect_vessels_for_incident(incident, db)


@router.get(
    "/live",
    response_model=ActiveVesselsResponse,
    summary="Get active vessel fleet and suspect trajectories for map",
    description="Returns commercial vessels transiting global shipping lanes, with suspect ships highlighted.",
)
def get_live_active_vessels(
    db: Session = Depends(get_db),
):
    return VesselService.get_live_active_vessels(db)


@router.post(
    "/{vessel_id}/alert",
    summary="Dispatch Coast Guard MRCC Intercept Notice for a suspect ship",
    description=(
        "Dispatches an official interception and Port State Control inspection alert "
        "and logs the tactical action to the incident audit trail."
    ),
)
def dispatch_vessel_alert(
    vessel_id: str,
    payload: VesselAlertRequest,
    db: Session = Depends(get_db),
):
    result = VesselService.dispatch_vessel_intercept_alert(
        vessel_id=vessel_id,
        incident_id=payload.incident_id,
        alert_type=payload.alert_type,
        officer_notes=payload.officer_notes,
        db=db,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("detail", "Failed to dispatch alert"),
        )
    return result
