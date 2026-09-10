"""
Module 22 — Environmental Recovery Predictor REST API.
Provides endpoints for computing multi-horizon recovery trajectories,
querying assessments, managing kinetic baseline factors, and progressing lifecycle status.
"""
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.environmental_recovery import RecoveryFactor
from app.schemas.environmental_recovery import (
    EnvironmentalRecoveryResponse,
    RecoveryCalculationRequest,
    RecoveryFactorResponse,
    RecoveryFactorUpdate,
    LifecycleTransitionRequest,
    LifecycleTransitionResponse,
)
from app.services.environmental_recovery.service import EnvironmentalRecoveryService

incident_router = APIRouter(
    prefix="/incidents/{incident_id}/recovery",
    tags=["Module 22: Environmental Recovery Predictor"],
)

factors_router = APIRouter(
    prefix="/recovery/factors",
    tags=["Module 22: Environmental Recovery Factors"],
)


@incident_router.post(
    "",
    response_model=EnvironmentalRecoveryResponse,
    summary="Calculate Environmental Recovery Trajectories",
    description=(
        "Estimates ecological regeneration across Mangroves, Coral Reefs, Fisheries, "
        "Marine Habitats, and Coastal Ecosystems for 1M, 3M, 6M, 12M, and 24M horizons. "
        "Integrates Ecosystem Risk (Module 12) and Cleanup Plan (Module 15) telemetry."
    ),
)
def calculate_recovery(
    incident_id: str,
    request: Optional[RecoveryCalculationRequest] = None,
    db: Session = Depends(get_db),
):
    return EnvironmentalRecoveryService.calculate_incident_recovery(
        db=db,
        incident_id=incident_id,
        request=request,
    )


@incident_router.get(
    "",
    response_model=EnvironmentalRecoveryResponse,
    summary="Get Latest Environmental Recovery Assessment",
    description="Retrieves the latest computed recovery assessment and itemized predictions for an incident.",
)
def get_latest_recovery(
    incident_id: str,
    db: Session = Depends(get_db),
):
    result = EnvironmentalRecoveryService.get_latest_recovery_assessment(
        db=db,
        incident_id=incident_id,
    )
    if not result:
        # Compute on-the-fly if not computed yet
        result = EnvironmentalRecoveryService.calculate_incident_recovery(
            db=db,
            incident_id=incident_id,
        )
    return result


@incident_router.post(
    "/transition-lifecycle",
    response_model=LifecycleTransitionResponse,
    summary="Transition Incident Lifecycle to Recovery Stage",
    description=(
        "Advances incident lifecycle status to RECOVERY (or MONITORING) and writes an immutable "
        "audit trail record to the incident event timeline."
    ),
)
def transition_lifecycle_stage(
    incident_id: str,
    request: LifecycleTransitionRequest,
    db: Session = Depends(get_db),
):
    return EnvironmentalRecoveryService.transition_lifecycle_to_recovery(
        db=db,
        incident_id=incident_id,
        authorizing_officer=request.authorizing_officer,
        transition_notes=request.transition_notes,
    )


@factors_router.get(
    "",
    response_model=list[RecoveryFactorResponse],
    summary="Get Baseline Environmental Recovery Factors",
    description="Returns default kinetic rate parameters and asymptotic ceilings across all 5 target habitats.",
)
def get_baseline_factors(
    db: Session = Depends(get_db),
):
    return EnvironmentalRecoveryService.get_or_create_default_factors(db)


@factors_router.put(
    "/{factor_id}",
    response_model=RecoveryFactorResponse,
    summary="Update Baseline Recovery Factor",
    description="Updates kinetic recovery rate or asymptotic maximum recovery parameters for a specific habitat.",
)
def update_baseline_factor(
    factor_id: str,
    payload: RecoveryFactorUpdate,
    db: Session = Depends(get_db),
):
    factor = db.query(RecoveryFactor).filter(RecoveryFactor.id == factor_id).first()
    if not factor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Recovery factor {factor_id} not found")

    if payload.baseline_recovery_rate_k is not None:
        factor.baseline_recovery_rate_k = payload.baseline_recovery_rate_k
    if payload.asymptotic_max_recovery is not None:
        factor.asymptotic_max_recovery = payload.asymptotic_max_recovery
    if payload.shape_exponent_gamma is not None:
        factor.shape_exponent_gamma = payload.shape_exponent_gamma
    if payload.ecosystem_sensitivity_weight is not None:
        factor.ecosystem_sensitivity_weight = payload.ecosystem_sensitivity_weight
    if payload.base_confidence is not None:
        factor.base_confidence = payload.base_confidence
    if payload.notes is not None:
        factor.notes = payload.notes

    db.commit()
    db.refresh(factor)
    return factor
