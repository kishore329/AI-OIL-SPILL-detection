"""
API endpoints for Smart Cleanup Planner — Module 15.
Provides decision-support response strategy recommendations, rule evaluation,
and lifecycle event creation when response recommendations are approved.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.cleanup_planner import (
    CleanupPlanResponse,
    CleanupPlanGenerateRequest,
    CleanupRecommendationItem,
    RecommendationStatusUpdateRequest,
)
from app.services.cleanup_planner.service import SmartCleanupPlannerService

router = APIRouter(prefix="/incidents", tags=["Cleanup Planner (Module 15)"])


@router.get(
    "/{incident_id}/cleanup-plan",
    response_model=CleanupPlanResponse,
    summary="Get active cleanup plan for an incident",
    description="Retrieves the current strategic cleanup response plan with prioritized action recommendations. If no plan has been generated yet, one is automatically created.",
)
def get_cleanup_plan(
    incident_id: str,
    db: Session = Depends(get_db),
):
    try:
        return SmartCleanupPlannerService.get_cleanup_plan(db, incident_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve cleanup plan: {str(e)}",
        )


@router.post(
    "/{incident_id}/cleanup-plan/generate",
    response_model=CleanupPlanResponse,
    summary="Generate or re-evaluate cleanup plan",
    description="Runs the multi-criteria cleanup rules engine across current movement, ecosystem, and fleet readiness data.",
)
def generate_cleanup_plan(
    incident_id: str,
    payload: CleanupPlanGenerateRequest = CleanupPlanGenerateRequest(),
    db: Session = Depends(get_db),
):
    try:
        return SmartCleanupPlannerService.generate_cleanup_plan(db, incident_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate cleanup plan: {str(e)}",
        )


@router.post(
    "/{incident_id}/cleanup-plan/recommendations/{recommendation_id}/status",
    response_model=CleanupRecommendationItem,
    summary="Accept or reject a response recommendation",
    description="Allows authorized Incident Commanders to approve or decline a response strategy. Approvals automatically log an IncidentEvent in the audit trail.",
)
def update_recommendation_status(
    incident_id: str,
    recommendation_id: str,
    payload: RecommendationStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    try:
        return SmartCleanupPlannerService.update_recommendation_status(
            db,
            incident_id=incident_id,
            recommendation_id=recommendation_id,
            target_status=payload.status,
            decision_notes=payload.decision_notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update recommendation status: {str(e)}",
        )
