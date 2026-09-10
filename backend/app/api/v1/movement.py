"""
Oil Spill Movement Predictor API endpoints — /api/v1/incidents/{incident_id}/movement
Module 11: Calculates forward drift trajectory (+1h, +3h, +6h, +12h, +24h)
using wind drift, ocean surface currents, and Fay's radial spreading.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.movement import (
    MovementPredictionRequest,
    MovementPredictionResponse,
    MovementHistoryItem,
)
from app.services.movement_prediction import MovementPredictionService

router = APIRouter(prefix="/incidents", tags=["Module 11: Movement Predictor"])


@router.get(
    "/{incident_id}/movement",
    response_model=MovementPredictionResponse,
    summary="Get latest oil spill movement trajectory prediction",
    description=(
        "Returns the calculated forward trajectory path, forecast milestone coordinates "
        "(+1h, +3h, +6h, +12h, +24h), environmental forcing conditions, and uncertainty envelope."
    ),
)
def get_movement_prediction(
    incident_id: str,
    db: Session = Depends(get_db),
):
    return MovementPredictionService.get_latest_prediction(db, incident_id)


@router.post(
    "/{incident_id}/movement/predict",
    response_model=MovementPredictionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Run or simulate new forward movement prediction",
    description=(
        "Executes a new Lagrangian drift trajectory simulation with optional user-supplied "
        "wind and current overrides, saves the prediction run to DB, and logs an audit event."
    ),
)
def run_movement_prediction(
    incident_id: str,
    payload: MovementPredictionRequest = MovementPredictionRequest(),
    db: Session = Depends(get_db),
):
    return MovementPredictionService.run_prediction(db, incident_id, payload)


@router.get(
    "/{incident_id}/movement/history",
    response_model=list[MovementHistoryItem],
    summary="Get historical prediction runs for an incident",
    description="Returns chronological audit list of previous forecast executions.",
)
def get_movement_history(
    incident_id: str,
    db: Session = Depends(get_db),
):
    return MovementPredictionService.get_prediction_history(db, incident_id)
