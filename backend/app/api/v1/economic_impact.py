"""
Module 21 — Economic Damage Estimator REST API Router.
Endpoints:
  POST /api/v1/incidents/{incident_id}/economic-impact  -> Run transparent economic damage assessment
  GET  /api/v1/incidents/{incident_id}/economic-impact  -> Fetch latest assessment
  GET  /api/v1/incidents/{incident_id}/economic-impact/history -> Historical assessments
  GET  /api/v1/economic-impact/assumptions              -> Fetch baseline default assumptions
  PUT  /api/v1/economic-impact/assumptions              -> Update baseline default assumptions
"""
from __future__ import annotations
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.economic_impact import EconomicAssumption, EconomicAssessment
from app.schemas.economic_impact import (
    EconomicAssessmentRequest,
    EconomicAssessmentResponse,
    EconomicCategoryDetail,
    EconomicAssumptionResponse,
    EconomicAssumptionBase,
)
from app.services.economic_estimator.service import EconomicDamageEstimatorService

logger = logging.getLogger("economic_estimator_api")

incident_router = APIRouter(prefix="/incidents", tags=["Economic Damage Estimator"])
assumptions_router = APIRouter(prefix="/economic-impact", tags=["Economic Assumptions"])


def _serialize_assessment(assessment: EconomicAssessment) -> EconomicAssessmentResponse:
    """Helper to serialize assessment ORM and related categories."""
    cats: list[EconomicCategoryDetail] = []
    for c in assessment.categories:
        cats.append(
            EconomicCategoryDetail(
                category=c.category,
                category_title=c.category_title,
                estimated_amount=c.estimated_amount,
                formatted_amount=c.formatted_amount,
                currency=c.currency,
                calculation_formula=c.calculation_formula,
                assumptions_snapshot=c.assumptions_snapshot,
                confidence=c.confidence,
            )
        )

    return EconomicAssessmentResponse(
        id=assessment.id,
        incident_id=assessment.incident_id,
        currency=assessment.currency,
        total_estimated_amount=assessment.total_estimated_amount,
        total_formatted=assessment.total_formatted,
        confidence=assessment.confidence,
        categories=cats,
        assumptions_used=assessment.assumptions_used,
        model_name=assessment.model_name,
        disclaimer=assessment.disclaimer,
        created_at=assessment.created_at,
    )


@incident_router.post(
    "/{incident_id}/economic-impact",
    response_model=EconomicAssessmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Calculate economic damage estimation for an incident",
)
def calculate_economic_impact(
    incident_id: str,
    payload: Optional[EconomicAssessmentRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Computes a transparent 6-category economic impact assessment for an incident.
    Integrates Coastal Impact, Ecosystem Risk, and Movement Prediction indicators.
    """
    currency = payload.currency if payload else "INR"
    custom_overrides = payload.custom_assumptions if payload else None

    assessment = EconomicDamageEstimatorService.calculate_economic_impact(
        db=db,
        incident_id=incident_id,
        display_currency=currency,
        custom_overrides=custom_overrides,
    )
    return _serialize_assessment(assessment)


@incident_router.get(
    "/{incident_id}/economic-impact",
    response_model=EconomicAssessmentResponse,
    summary="Get latest economic damage assessment for an incident",
)
def get_economic_impact(
    incident_id: str,
    currency: str = Query("INR", description="Desired currency format: INR or USD"),
    auto_calculate: bool = Query(True, description="Auto-calculate if no assessment exists yet"),
    db: Session = Depends(get_db),
):
    """
    Retrieves the most recent economic impact assessment.
    If none exists and auto_calculate is True, executes initial calculation.
    """
    assessment = EconomicDamageEstimatorService.get_latest_assessment(db, incident_id)
    if not assessment:
        if auto_calculate:
            assessment = EconomicDamageEstimatorService.calculate_economic_impact(
                db=db,
                incident_id=incident_id,
                display_currency=currency,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No economic impact assessment found for incident '{incident_id}'.",
            )
    elif assessment.currency.upper() != currency.upper():
        # Currency changed, re-calculate in requested currency
        assessment = EconomicDamageEstimatorService.calculate_economic_impact(
            db=db,
            incident_id=incident_id,
            display_currency=currency,
        )

    return _serialize_assessment(assessment)


@incident_router.get(
    "/{incident_id}/economic-impact/history",
    response_model=list[EconomicAssessmentResponse],
    summary="List historical economic assessments for an incident",
)
def list_economic_history(
    incident_id: str,
    db: Session = Depends(get_db),
):
    """Lists past assessments for auditing changes over time."""
    records = EconomicDamageEstimatorService.list_historical_assessments(db, incident_id)
    return [_serialize_assessment(r) for r in records]


@assumptions_router.get(
    "/assumptions",
    response_model=EconomicAssumptionResponse,
    summary="Fetch system baseline configurable economic assumptions",
)
def get_baseline_assumptions(db: Session = Depends(get_db)):
    """Returns the active default configurable assumptions profile."""
    prof = EconomicDamageEstimatorService.get_or_create_default_assumptions(db)
    return prof


@assumptions_router.put(
    "/assumptions",
    response_model=EconomicAssumptionResponse,
    summary="Update system baseline configurable economic assumptions",
)
def update_baseline_assumptions(
    payload: EconomicAssumptionBase,
    db: Session = Depends(get_db),
):
    """Updates baseline unit values, daily parameters, and recovery durations."""
    prof = EconomicDamageEstimatorService.get_or_create_default_assumptions(db)

    for k, v in payload.model_dump().items():
        if hasattr(prof, k) and v is not None:
            setattr(prof, k, v)

    db.commit()
    db.refresh(prof)
    return prof
