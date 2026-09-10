"""
Module 23 — Smart Alert and Restriction System API Router.
Endpoints for evaluating telemetry, retrieving operational alerts,
acknowledging warnings, confirming restrictions, and configuring trigger rules.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.incident import Incident
from app.models.alert import Alert, AlertRule
from app.schemas.alert import (
    AlertResponse,
    AlertListResponse,
    AlertGenerateRequest,
    AlertAcknowledgeRequest,
    RestrictionConfirmRequest,
    AlertRuleResponse,
    AlertRuleUpdate,
    AlertRecipientSchema,
    AlertEventSchema,
)
from app.services.alert_system import (
    evaluate_incident_alerts,
    get_alerts,
    get_alert_by_id,
    acknowledge_alert,
    confirm_restriction,
    get_alert_rules,
    update_alert_rule,
)

router = APIRouter(prefix="/alerts", tags=["Smart Alert & Restriction System"])
incident_alerts_router = APIRouter(prefix="/incidents", tags=["Smart Alert & Restriction System"])


def _to_alert_response(alert: Alert) -> AlertResponse:
    incident_code = alert.incident.incident_code if alert.incident else None
    return AlertResponse(
        id=str(alert.id),
        incident_id=str(alert.incident_id),
        incident_code=incident_code,
        alert_type=alert.alert_type,
        severity=alert.severity,
        title=alert.title,
        message=alert.message,
        trigger=alert.trigger,
        recommended_restriction=alert.recommended_restriction,
        restriction_type=alert.restriction_type,
        restriction_status=alert.restriction_status,
        status=alert.status,
        target_location=alert.target_location,
        target_asset_type=alert.target_asset_type,
        eta_hours=alert.eta_hours,
        acknowledged_by=alert.acknowledged_by,
        acknowledged_at=alert.acknowledged_at,
        confirmed_by=alert.confirmed_by,
        confirmed_at=alert.confirmed_at,
        operator_notes=alert.operator_notes,
        rule_code=alert.rule_code,
        context_snapshot=alert.context_snapshot or {},
        created_at=alert.created_at,
        updated_at=alert.updated_at,
        recipients=[AlertRecipientSchema.model_validate(r) for r in alert.recipients],
        events=[AlertEventSchema.model_validate(e) for e in alert.events],
    )


@router.get("", response_model=AlertListResponse)
def list_alerts(
    incident_id: Optional[str] = Query(None, description="Filter by incident UUID"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, ACKNOWLEDGED, RESOLVED)"),
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)"),
    restriction_status: Optional[str] = Query(None, description="Filter by restriction status (RECOMMENDED, OPERATOR_CONFIRMED, OPERATOR_REJECTED)"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Retrieve operational alerts with optional multi-attribute filtering."""
    total, active_count, critical_count, unconfirmed_count, alerts = get_alerts(
        db=db,
        incident_id=incident_id,
        status=status,
        severity=severity,
        restriction_status=restriction_status,
        limit=limit,
    )
    return AlertListResponse(
        total=total,
        active_count=active_count,
        critical_count=critical_count,
        unconfirmed_restrictions_count=unconfirmed_count,
        alerts=[_to_alert_response(a) for a in alerts],
    )


@router.post("/generate", response_model=list[AlertResponse], status_code=status.HTTP_201_CREATED)
def trigger_alert_generation(
    payload: AlertGenerateRequest,
    db: Session = Depends(get_db),
):
    """
    Evaluates incident against active rules across Risk, Coastal Impact,
    Movement, and Severity domains to produce or update alerts.
    """
    incident = db.query(Incident).filter(Incident.id == payload.incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {payload.incident_id} not found",
        )

    alerts = evaluate_incident_alerts(
        incident_id=payload.incident_id,
        db=db,
        force_recheck=payload.force_recheck,
    )
    return [_to_alert_response(a) for a in alerts]


@router.get("/rules", response_model=list[AlertRuleResponse])
def list_alert_rules(db: Session = Depends(get_db)):
    """List all configurable alerting rules and metric thresholds."""
    rules = get_alert_rules(db)
    return [AlertRuleResponse.model_validate(r) for r in rules]


@router.patch("/rules/{rule_code}", response_model=AlertRuleResponse)
def modify_alert_rule(
    rule_code: str,
    payload: AlertRuleUpdate,
    db: Session = Depends(get_db),
):
    """Modify threshold value or toggle activation of a specific alerting rule."""
    rule = update_alert_rule(db=db, rule_code=rule_code, update_data=payload.model_dump(exclude_unset=True))
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rule {rule_code} not found",
        )
    return AlertRuleResponse.model_validate(rule)


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: str, db: Session = Depends(get_db)):
    """Retrieve details, recipients, and timeline events for a specific alert."""
    alert = get_alert_by_id(db, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found",
        )
    return _to_alert_response(alert)


@router.patch("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_incident_alert(
    alert_id: str,
    payload: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
):
    """Acknowledge an active alert with operator signature and optional notes."""
    alert = acknowledge_alert(
        alert_id=alert_id,
        operator_name=payload.operator_name,
        notes=payload.notes,
        db=db,
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found",
        )
    return _to_alert_response(alert)


@router.post("/{alert_id}/confirm-restriction", response_model=AlertResponse)
def confirm_or_reject_restriction(
    alert_id: str,
    payload: RestrictionConfirmRequest,
    db: Session = Depends(get_db),
):
    """
    Formally confirm or reject a recommended operational restriction advisory.
    Distinguishes automated SYSTEM ALERT vs OPERATOR CONFIRMED ACTION.
    """
    alert = confirm_restriction(
        alert_id=alert_id,
        operator_name=payload.operator_name,
        confirmed=payload.confirmed,
        operator_notes=payload.operator_notes,
        db=db,
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found",
        )
    return _to_alert_response(alert)


# Nested route: GET /api/v1/incidents/{incident_id}/alerts
@incident_alerts_router.get("/{incident_id}/alerts", response_model=AlertListResponse)
def get_incident_alerts(
    incident_id: str,
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Retrieve all operational alerts specifically tied to an incident."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found",
        )

    total, active_count, critical_count, unconfirmed_count, alerts = get_alerts(
        db=db,
        incident_id=incident_id,
        status=status,
        severity=severity,
        limit=limit,
    )
    return AlertListResponse(
        total=total,
        active_count=active_count,
        critical_count=critical_count,
        unconfirmed_restrictions_count=unconfirmed_count,
        alerts=[_to_alert_response(a) for a in alerts],
    )
