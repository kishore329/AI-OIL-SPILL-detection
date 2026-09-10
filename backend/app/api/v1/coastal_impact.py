"""
Coastal Impact Predictor & Time-to-Impact API Endpoints — Module 13.
Routes:
  GET  /api/v1/incidents/{incident_id}/coastal-impact
  POST /api/v1/incidents/{incident_id}/coastal-impact/predict
  GET  /api/v1/incidents/{incident_id}/time-to-impact
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.coastal_impact import (
    CoastalImpactResponse,
    TimeToImpactResponse,
    CoastalImpactPredictRequest,
)
from app.services.coastal_impact_service import CoastalImpactService

router = APIRouter(prefix="/incidents", tags=["Module 13: Coastal Impact Predictor"])


@router.get(
    "/{incident_id}/coastal-impact",
    response_model=CoastalImpactResponse,
    summary="Get coastal impact prediction and affected locations",
    description=(
        "Returns the estimated coastal locations, beaches, ports, coastal settlements, "
        "and fishing zones threatened by predicted oil movement along with arrival horizons (NOW to 24H)."
    ),
)
def get_coastal_impact(
    incident_id: str,
    db: Session = Depends(get_db),
):
    return CoastalImpactService.get_latest(db, incident_id)


@router.post(
    "/{incident_id}/coastal-impact/predict",
    response_model=CoastalImpactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Run or simulate new coastal impact and time-to-impact analysis",
    description=(
        "Executes a new spatial trajectory intersection calculation against coastal targets, "
        "re-evaluating estimated hours to impact and updating persisted impact predictions."
    ),
)
def run_coastal_impact_predict(
    incident_id: str,
    payload: CoastalImpactPredictRequest = CoastalImpactPredictRequest(),
    db: Session = Depends(get_db),
):
    return CoastalImpactService.predict(db, incident_id, payload)


@router.get(
    "/{incident_id}/time-to-impact",
    response_model=TimeToImpactResponse,
    summary="Get concise time-to-impact metric and shoreline contact alert",
    description=(
        "Returns the earliest estimated impact arrival horizon, target name, urgency level, "
        "and timeline counts for rapid operational alerts and priority dispatch."
    ),
)
def get_time_to_impact(
    incident_id: str,
    db: Session = Depends(get_db),
):
    return CoastalImpactService.get_time_to_impact(db, incident_id)
