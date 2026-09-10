"""
Risk Engine API routes — /api/v1/risk
Provides explainable multi-factor risk assessment, factor breakdown,
and historical risk tracking for decision-support operations.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database.session import get_db
from app.models.incident import Incident
from app.models.enums import IncidentSeverity
from app.schemas.risk import (
    RiskCalculateRequest,
    RiskAssessmentResponse,
    IncidentRiskHistoryResponse,
)
from app.services.risk_engine import RiskEngine

router = APIRouter(prefix="/risk", tags=["Risk Engine"])


@router.post(
    "/calculate",
    response_model=RiskAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate explainable risk score",
    description=(
        "Calculates an explainable 0–100 decision-support risk score and severity classification "
        "(LOW, MODERATE, HIGH, CRITICAL) using a multi-factor transparent weighted model: "
        "Spill Area, Coastal Proximity, Marine Sensitivity, Human Exposure, and Spread Dynamics. "
        "Persists the assessment record to database."
    ),
)
def calculate_risk(
    payload: RiskCalculateRequest,
    db: Session = Depends(get_db),
):
    return RiskEngine.calculate(db, payload)


@router.get(
    "/incident/{incident_id}",
    response_model=RiskAssessmentResponse,
    summary="Get latest risk assessment for an incident",
    description="Returns the latest explainable risk score and factor breakdown for an incident.",
)
def get_incident_risk(
    incident_id: str,
    db: Session = Depends(get_db),
):
    history = RiskEngine.get_incident_risk_history(db, incident_id)
    if history.assessments:
        return history.assessments[0]
    # If no historical assessments exist, calculate on the fly
    return RiskEngine.calculate(db, RiskCalculateRequest(incident_id=incident_id))


@router.get(
    "/incident/{incident_id}/history",
    response_model=IncidentRiskHistoryResponse,
    summary="Get risk assessment history for an incident",
    description="Returns chronological audit history of all risk assessments calculated for an incident.",
)
def get_incident_risk_history(
    incident_id: str,
    db: Session = Depends(get_db),
):
    return RiskEngine.get_incident_risk_history(db, incident_id)


@router.get(
    "/summary",
    summary="Get executive risk overview summary",
    description="Returns fleet-wide risk statistics, severity distribution, and highest-risk active spills.",
)
def get_risk_summary(
    db: Session = Depends(get_db),
):
    incidents = (
        db.execute(select(Incident).where(Incident.is_active == True))  # noqa: E712
        .scalars()
        .all()
    )

    critical_count = sum(1 for i in incidents if i.severity == IncidentSeverity.CRITICAL)
    high_count = sum(1 for i in incidents if i.severity == IncidentSeverity.HIGH)
    moderate_count = sum(1 for i in incidents if i.severity == IncidentSeverity.MODERATE)
    low_count = sum(1 for i in incidents if i.severity == IncidentSeverity.LOW)

    scores = [i.risk_score for i in incidents if i.risk_score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    # Top 5 highest risk incidents
    sorted_incidents = sorted(
        incidents, key=lambda x: (x.risk_score or 0.0), reverse=True
    )[:5]
    top_critical = [
        {
            "id": i.id,
            "incident_code": i.incident_code,
            "severity": i.severity.value,
            "risk_score": i.risk_score,
            "spill_area_km2": i.spill_area_km2,
            "latitude": i.latitude,
            "longitude": i.longitude,
            "status": i.status.value,
        }
        for i in sorted_incidents
    ]

    highest_score = max(scores) if scores else 0.0

    return {
        "total_active_incidents": len(incidents),
        "average_risk_score": avg_score,
        "highest_risk_score": round(highest_score, 1),
        "severity_distribution": {
            "CRITICAL": critical_count,
            "HIGH": high_count,
            "MODERATE": moderate_count,
            "LOW": low_count,
        },
        "top_risk_incidents": top_critical,
        "model_label": "AI-assisted risk assessment model",
    }
