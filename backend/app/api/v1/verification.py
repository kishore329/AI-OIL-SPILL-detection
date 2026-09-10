"""
REST API endpoints for Module 17 — Multi-Source Verification.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.verification import (
    VerificationResponse,
    VerificationEvaluateRequest,
    VerificationEvidenceAddRequest,
    VerificationOverrideRequest,
)
from app.services.multi_source_verification import MultiSourceVerificationService

router = APIRouter(prefix="", tags=["Multi-Source Verification"])
verification_service = MultiSourceVerificationService()


@router.post(
    "/incidents/{incident_id}/verify",
    response_model=VerificationResponse,
    summary="Evaluate multi-source evidence and calculate incident verification consensus",
)
def evaluate_verification(
    incident_id: str,
    payload: VerificationEvaluateRequest = VerificationEvaluateRequest(),
    db: Session = Depends(get_db),
):
    """
    Evaluates multi-source evidence (satellite SAR, drone footage, citizen reports,
    AIS vessel tracking, and metocean buoy conditions) for an incident using
    configurable weighted scoring and contradiction detection.
    """
    try:
        return verification_service.evaluate_incident_verification(
            db,
            incident_id,
            custom_weights=payload.custom_weights,
            force_recalculate=payload.force_recalculate,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification evaluation failed: {str(e)}",
        )


@router.get(
    "/incidents/{incident_id}/verification",
    response_model=VerificationResponse,
    summary="Get multi-source verification dossier for an incident",
)
def get_verification(
    incident_id: str,
    db: Session = Depends(get_db),
):
    """
    Fetches the complete verification dossier for an incident, including overall
    confidence %, decision, data origin tags (LIVE/HISTORICAL/SIMULATED), and evidence breakdown.
    """
    try:
        return verification_service.get_incident_verification(db, incident_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch verification dossier: {str(e)}",
        )


@router.post(
    "/incidents/{incident_id}/verification/evidence",
    response_model=VerificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new evidence item to an incident verification record",
)
def add_evidence(
    incident_id: str,
    payload: VerificationEvidenceAddRequest,
    db: Session = Depends(get_db),
):
    """
    Appends a new evidence item (e.g. manual drone flight upload, citizen spotter photo,
    or acoustic sensor reading) and triggers dynamic re-evaluation of consensus.
    """
    try:
        return verification_service.add_custom_evidence(
            db, incident_id, payload.model_dump()
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit evidence: {str(e)}",
        )


@router.post(
    "/incidents/{incident_id}/verification/override",
    response_model=VerificationResponse,
    summary="Authorize manual operator verification decision override",
)
def override_decision(
    incident_id: str,
    payload: VerificationOverrideRequest,
    db: Session = Depends(get_db),
):
    """
    Allows an authorized incident commander to manually confirm, reject, or mark
    an incident for review with decision notes, updating the incident lifecycle.
    """
    try:
        return verification_service.override_verification_decision(
            db,
            incident_id,
            new_decision=payload.decision,
            decision_notes=payload.decision_notes,
            operator_name=payload.operator_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to override verification decision: {str(e)}",
        )
