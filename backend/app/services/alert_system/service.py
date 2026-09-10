"""
Module 23 — Smart Alert and Restriction System Service.
Generates multi-domain operational alerts based on Risk (Module 5), Priority (Module 6),
Movement (Module 11), Coastal Impact (Module 13), and Ecosystem (Module 12) models.

Enforces the critical policy:
1. The system strictly RECOMMENDS operational restrictions (e.g. fishing halt, port delay, beach barrier).
2. Legal / operational enforcement requires OPERATOR CONFIRMATION.
3. Every lifecycle event and operator action is auditable.
"""
from __future__ import annotations
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.incident import Incident
from app.models.risk import RiskAssessment
from app.models.coastal_impact import CoastalImpactPrediction
from app.models.incident_event import IncidentEvent
from app.models.alert import Alert, AlertRule, AlertRecipient, AlertEvent

logger = logging.getLogger("oil_spill.alert_system")


# Default configurable rules seed data
DEFAULT_ALERT_RULES = [
    {
        "rule_code": "RULE_RISK_CRITICAL",
        "rule_name": "Critical Spill Risk Threshold (>= 76)",
        "alert_type": "CRITICAL_SPILL_ALERT",
        "severity": "CRITICAL",
        "condition_metric": "risk_score",
        "operator": ">=",
        "threshold_value": 76.0,
        "template_title": "CRITICAL SPILL ALERT: High-Risk Incident Escalation",
        "template_message": "Incident {incident_code} risk index is {metric_value:.1f}/100 (>= 76). Extreme hazard to marine and coastal environments.",
        "recommended_action": "Recommend immediate escalation to Tier-3 incident status and notification of Maritime Rescue Coordination Centre (MRCC).",
        "restriction_type": "CONTAINMENT_MOBILIZATION",
        "notes": "Triggered when composite risk score meets or exceeds 76.",
    },
    {
        "rule_code": "RULE_COASTAL_6H",
        "rule_name": "Shoreline Landfall Warning (<= 6h)",
        "alert_type": "COASTAL_WARNING",
        "severity": "HIGH",
        "condition_metric": "coastline_eta_hours",
        "operator": "<=",
        "threshold_value": 6.0,
        "template_title": "COASTAL WARNING: Shoreline Landfall Projected",
        "template_message": "Oil slick trajectory is projected to reach coastal sector {target_location} in {metric_value:.1f} hours.",
        "recommended_action": "Recommend immediate deployment of shoreline exclusion booms and issuing public beach advisory.",
        "restriction_type": "BEACH_CLOSURE",
        "notes": "Triggered when beach or shoreline sector impact ETA is within 6 hours.",
    },
    {
        "rule_code": "RULE_FISHING_6H",
        "rule_name": "Fishing Zone Impact Warning (<= 6h)",
        "alert_type": "FISHING_WARNING",
        "severity": "HIGH",
        "condition_metric": "fishing_eta_hours",
        "operator": "<=",
        "threshold_value": 6.0,
        "template_title": "FISHING WARNING: Commercial Grounds Threat",
        "template_message": "Oil slick projected to intercept active fishing ground {target_location} in {metric_value:.1f} hours.",
        "recommended_action": "Recommend temporary advisory suspending trawling and artisanal fishing within target maritime sector.",
        "restriction_type": "FISHING_RESTRICTION",
        "notes": "Triggered when commercial fishing ground ETA is within 6 hours.",
    },
    {
        "rule_code": "RULE_PORT_12H",
        "rule_name": "Port & Harbor Traffic Warning (<= 12h)",
        "alert_type": "PORT_WARNING",
        "severity": "HIGH",
        "condition_metric": "port_eta_hours",
        "operator": "<=",
        "threshold_value": 12.0,
        "template_title": "PORT WARNING: Navigational Channel Impact",
        "template_message": "Oil plume approaching port approach waters at {target_location} with estimated ETA of {metric_value:.1f} hours.",
        "recommended_action": "Recommend port authority notify harbor master, place tugboats on standby, and restrict inbound vessel queuing.",
        "restriction_type": "PORT_TRAFFIC_SUSPENSION",
        "notes": "Triggered when commercial port or harbor approach ETA is within 12 hours.",
    },
    {
        "rule_code": "RULE_PROTECTED_AREA_12H",
        "rule_name": "Marine Sanctuary & Reserve Warning (<= 12h)",
        "alert_type": "PROTECTED_AREA_WARNING",
        "severity": "CRITICAL",
        "condition_metric": "protected_area_eta_hours",
        "operator": "<=",
        "threshold_value": 12.0,
        "template_title": "PROTECTED AREA WARNING: Sensitive Ecology Threat",
        "template_message": "Sensitive marine ecosystem / protected reserve {target_location} projected to be impacted within {metric_value:.1f} hours.",
        "recommended_action": "Recommend priority deployment of sorbent barriers and environmental defense skimmers at reef/mangrove inlets.",
        "restriction_type": "PROTECTED_AREA_DEFENSE",
        "notes": "Triggered when marine park or sanctuary impact ETA is within 12 hours.",
    },
    {
        "rule_code": "RULE_VESSEL_TRAFFIC",
        "rule_name": "Vessel Traffic Corridor Warning",
        "alert_type": "VESSEL_WARNING",
        "severity": "MEDIUM",
        "condition_metric": "vessel_proximity_nm",
        "operator": "<=",
        "threshold_value": 5.0,
        "template_title": "VESSEL WARNING: Shipping Lane Contamination",
        "template_message": "Oil slick encompasses or approaches active shipping corridor within {metric_value:.1f} nautical miles.",
        "recommended_action": "Recommend broadcasting VHF Channel 16 / NAVTEX advisory advising commercial vessels to maintain minimum 3nm buffer.",
        "restriction_type": "VESSEL_EXCLUSION",
        "notes": "Triggered when slick approaches primary shipping corridor within 5nm.",
    },
    {
        "rule_code": "RULE_RESPONSE_ESCALATION",
        "rule_name": "Incident Severity & Priority Escalation",
        "alert_type": "RESPONSE_TEAM_ALERT",
        "severity": "HIGH",
        "condition_metric": "incident_severity_rank",
        "operator": ">=",
        "threshold_value": 3.0,
        "template_title": "RESPONSE TEAM ALERT: Response Strike Team Readiness",
        "template_message": "Incident {incident_code} severity escalated to {target_location}. Regional response strike teams placed on readiness status.",
        "recommended_action": "Recommend staging oil recovery skimmers, dispersant application craft, and high-tensile boom arrays.",
        "restriction_type": "RESOURCE_MOBILIZATION",
        "notes": "Triggered when incident severity is HIGH (3) or CRITICAL (4).",
    },
    {
        "rule_code": "RULE_COMMUNITY_8H",
        "rule_name": "Coastal Community Proximity Alert (<= 8h)",
        "alert_type": "COMMUNITY_ALERT",
        "severity": "MEDIUM",
        "condition_metric": "community_eta_hours",
        "operator": "<=",
        "threshold_value": 8.0,
        "template_title": "COMMUNITY ALERT: Coastal Settlement Inhalation/Contact Advisory",
        "template_message": "Projected slick drift passes within coastal settlement zone {target_location} in {metric_value:.1f} hours.",
        "recommended_action": "Recommend advising local civil defense to notify coastal communities and monitor volatile organic compound (VOC) air quality.",
        "restriction_type": "PUBLIC_HEALTH_ADVISORY",
        "notes": "Triggered when slick drift approaches populated coastal settlement within 8 hours.",
    },
]

# Standard agency routing per alert type
ALERT_RECIPIENT_ROUTING = {
    "CRITICAL_SPILL_ALERT": [
        ("Coast Guard MRCC", "NAVTEX_BROADCAST"),
        ("National Disaster Management Agency", "IN_APP_POPUP"),
    ],
    "COASTAL_WARNING": [
        ("Coastal Municipal Administration", "IN_APP_POPUP"),
        ("Marine Police & Lifeguards", "SMS_GATEWAY"),
    ],
    "FISHING_WARNING": [
        ("State Fisheries Department", "VHF_RADIO"),
        ("Coastal Fishermen Cooperatives", "SMS_GATEWAY"),
    ],
    "PORT_WARNING": [
        ("Port Traffic Management & VTS", "VHF_RADIO"),
        ("Harbor Master Operations", "IN_APP_POPUP"),
    ],
    "PROTECTED_AREA_WARNING": [
        ("Marine Sanctuary Directorate", "IN_APP_POPUP"),
        ("Ecology & Wildlife Rapid Response", "SMS_GATEWAY"),
    ],
    "VESSEL_WARNING": [
        ("Vessel Traffic Service (VTS)", "NAVTEX_BROADCAST"),
        ("Coastal Maritime Radio Station", "VHF_RADIO"),
    ],
    "RESPONSE_TEAM_ALERT": [
        ("National Spill Strike Team", "SMS_GATEWAY"),
        ("Tier-2 Regional Response Contractor", "IN_APP_POPUP"),
    ],
    "COMMUNITY_ALERT": [
        ("District Disaster Management Authority", "SMS_GATEWAY"),
        ("Local Public Health Directorate", "IN_APP_POPUP"),
    ],
}


def seed_default_rules(db: Session) -> int:
    """Ensure all default alert rules exist in the database."""
    seeded_count = 0
    for rule_data in DEFAULT_ALERT_RULES:
        existing = db.query(AlertRule).filter(AlertRule.rule_code == rule_data["rule_code"]).first()
        if not existing:
            new_rule = AlertRule(
                id=str(uuid.uuid4()),
                rule_code=rule_data["rule_code"],
                rule_name=rule_data["rule_name"],
                alert_type=rule_data["alert_type"],
                severity=rule_data["severity"],
                condition_metric=rule_data["condition_metric"],
                operator=rule_data["operator"],
                threshold_value=rule_data["threshold_value"],
                template_title=rule_data["template_title"],
                template_message=rule_data["template_message"],
                recommended_action=rule_data["recommended_action"],
                restriction_type=rule_data["restriction_type"],
                is_active=True,
                notes=rule_data.get("notes"),
            )
            db.add(new_rule)
            seeded_count += 1
    if seeded_count > 0:
        db.commit()
    return seeded_count


def _eval_condition(actual: float, operator: str, threshold: float) -> bool:
    """Evaluates mathematical condition against a threshold."""
    if operator == ">=":
        return actual >= threshold
    elif operator == "<=":
        return actual <= threshold
    elif operator == ">":
        return actual > threshold
    elif operator == "<":
        return actual < threshold
    elif operator == "==":
        return abs(actual - threshold) < 1e-5
    return False


def _map_severity_to_rank(severity_val: Any) -> float:
    """Converts severity string or enum to numeric rank."""
    s = str(getattr(severity_val, "value", severity_val) or "").upper()
    if "CRITICAL" in s:
        return 4.0
    if "HIGH" in s:
        return 3.0
    if "MODERATE" in s or "MEDIUM" in s:
        return 2.0
    return 1.0


def evaluate_incident_alerts(
    incident_id: str,
    db: Session,
    force_recheck: bool = False,
) -> list[Alert]:
    """
    Evaluates an incident against all active alert rules across Risk, Coastal Impact,
    Movement, and Priority domains. Generates alerts and logs events.
    Applies deduplication to prevent flooding duplicate alerts.
    """
    # Ensure default rules are present
    seed_default_rules(db)

    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        logger.warning(f"Incident {incident_id} not found for alert evaluation.")
        return []

    # Gather incident telemetry & metrics
    risk_score = 0.0
    if incident.risk_score is not None:
        risk_score = float(incident.risk_score)
    else:
        # Check latest risk assessment
        latest_risk = (
            db.query(RiskAssessment)
            .filter(RiskAssessment.incident_id == incident_id)
            .order_by(desc(RiskAssessment.id))
            .first()
        )
        if latest_risk and latest_risk.risk_score is not None:
            risk_score = float(latest_risk.risk_score)

    severity_rank = _map_severity_to_rank(incident.severity)
    severity_str = str(getattr(incident.severity, "value", incident.severity) or "MODERATE").upper()

    # Query coastal impact predictions
    impacts = (
        db.query(CoastalImpactPrediction)
        .filter(CoastalImpactPrediction.incident_id == incident_id)
        .all()
    )

    # Active rules
    active_rules = db.query(AlertRule).filter(AlertRule.is_active.is_(True)).all()
    rules_by_code = {r.rule_code: r for r in active_rules}

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=6)
    generated_alerts: list[Alert] = []

    # 1. Evaluate Risk Threshold (RULE_RISK_CRITICAL)
    risk_rule = rules_by_code.get("RULE_RISK_CRITICAL")
    if risk_rule and _eval_condition(risk_score, risk_rule.operator, risk_rule.threshold_value):
        alert = _create_or_update_alert(
            db=db,
            incident=incident,
            rule=risk_rule,
            target_location="Maritime Sector",
            target_asset_type="INCIDENT_ZONE",
            eta_hours=0.0,
            metric_value=risk_score,
            now=now,
            cutoff=cutoff,
            force_recheck=force_recheck,
            context={"risk_score": risk_score, "spill_area_km2": incident.spill_area_km2},
        )
        if alert:
            generated_alerts.append(alert)

    # 2. Evaluate Severity Escalation (RULE_RESPONSE_ESCALATION)
    resp_rule = rules_by_code.get("RULE_RESPONSE_ESCALATION")
    if resp_rule and _eval_condition(severity_rank, resp_rule.operator, resp_rule.threshold_value):
        alert = _create_or_update_alert(
            db=db,
            incident=incident,
            rule=resp_rule,
            target_location=severity_str,
            target_asset_type="RESPONSE_LEVEL",
            eta_hours=0.0,
            metric_value=severity_rank,
            now=now,
            cutoff=cutoff,
            force_recheck=force_recheck,
            context={"severity": severity_str, "severity_rank": severity_rank},
        )
        if alert:
            generated_alerts.append(alert)

    # 3. Evaluate Coastal Impact Targets
    for imp in impacts:
        t_type = (imp.target_type or "").upper()
        eta = float(imp.estimated_hours_to_impact)
        loc = imp.target_location

        # Shoreline / Beach Landfall (RULE_COASTAL_6H)
        coast_rule = rules_by_code.get("RULE_COASTAL_6H")
        if coast_rule and ("BEACH" in t_type or "COAST" in t_type):
            if _eval_condition(eta, coast_rule.operator, coast_rule.threshold_value):
                a = _create_or_update_alert(
                    db=db,
                    incident=incident,
                    rule=coast_rule,
                    target_location=loc,
                    target_asset_type=t_type,
                    eta_hours=eta,
                    metric_value=eta,
                    now=now,
                    cutoff=cutoff,
                    force_recheck=force_recheck,
                    context={"distance_km": imp.distance_km, "target_type": t_type},
                )
                if a:
                    generated_alerts.append(a)

        # Fishing Zone (RULE_FISHING_6H)
        fish_rule = rules_by_code.get("RULE_FISHING_6H")
        if fish_rule and ("FISH" in t_type):
            if _eval_condition(eta, fish_rule.operator, fish_rule.threshold_value):
                a = _create_or_update_alert(
                    db=db,
                    incident=incident,
                    rule=fish_rule,
                    target_location=loc,
                    target_asset_type="FISHING_ZONE",
                    eta_hours=eta,
                    metric_value=eta,
                    now=now,
                    cutoff=cutoff,
                    force_recheck=force_recheck,
                    context={"distance_km": imp.distance_km, "target_type": t_type},
                )
                if a:
                    generated_alerts.append(a)

        # Port / Harbor (RULE_PORT_12H)
        port_rule = rules_by_code.get("RULE_PORT_12H")
        if port_rule and ("PORT" in t_type or "HARBOR" in t_type):
            if _eval_condition(eta, port_rule.operator, port_rule.threshold_value):
                a = _create_or_update_alert(
                    db=db,
                    incident=incident,
                    rule=port_rule,
                    target_location=loc,
                    target_asset_type="PORT",
                    eta_hours=eta,
                    metric_value=eta,
                    now=now,
                    cutoff=cutoff,
                    force_recheck=force_recheck,
                    context={"distance_km": imp.distance_km, "target_type": t_type},
                )
                if a:
                    generated_alerts.append(a)

        # Protected Area / Marine Park (RULE_PROTECTED_AREA_12H)
        prot_rule = rules_by_code.get("RULE_PROTECTED_AREA_12H")
        if prot_rule and ("PROTECTED" in t_type or "PARK" in t_type or "SANCTUARY" in t_type or "RESERVE" in t_type):
            if _eval_condition(eta, prot_rule.operator, prot_rule.threshold_value):
                a = _create_or_update_alert(
                    db=db,
                    incident=incident,
                    rule=prot_rule,
                    target_location=loc,
                    target_asset_type="PROTECTED_AREA",
                    eta_hours=eta,
                    metric_value=eta,
                    now=now,
                    cutoff=cutoff,
                    force_recheck=force_recheck,
                    context={"distance_km": imp.distance_km, "target_type": t_type},
                )
                if a:
                    generated_alerts.append(a)

        # Community / Settlement (RULE_COMMUNITY_8H)
        comm_rule = rules_by_code.get("RULE_COMMUNITY_8H")
        if comm_rule and ("COMMUNITY" in t_type or "SETTLEMENT" in t_type or "TOWN" in t_type):
            if _eval_condition(eta, comm_rule.operator, comm_rule.threshold_value):
                a = _create_or_update_alert(
                    db=db,
                    incident=incident,
                    rule=comm_rule,
                    target_location=loc,
                    target_asset_type="COASTAL_SETTLEMENT",
                    eta_hours=eta,
                    metric_value=eta,
                    now=now,
                    cutoff=cutoff,
                    force_recheck=force_recheck,
                    context={"distance_km": imp.distance_km, "target_type": t_type},
                )
                if a:
                    generated_alerts.append(a)

    # 4. Fallback synthetic check if no coastal targets yet exist but incident is high risk
    # Ensure active alerts exist for major incidents
    vessel_rule = rules_by_code.get("RULE_VESSEL_TRAFFIC")
    if vessel_rule and incident.spill_area_km2 and incident.spill_area_km2 > 5.0:
        # High likelihood of shipping lane proximity
        est_prox_nm = max(1.2, 5.0 - min(4.0, incident.spill_area_km2 * 0.1))
        if _eval_condition(est_prox_nm, vessel_rule.operator, vessel_rule.threshold_value):
            a = _create_or_update_alert(
                db=db,
                incident=incident,
                rule=vessel_rule,
                target_location="Primary Coastal Shipping Channel",
                target_asset_type="SHIPPING_LANE",
                eta_hours=1.0,
                metric_value=est_prox_nm,
                now=now,
                cutoff=cutoff,
                force_recheck=force_recheck,
                context={"estimated_proximity_nm": est_prox_nm},
            )
            if a:
                generated_alerts.append(a)

    db.commit()
    return generated_alerts


def _create_or_update_alert(
    db: Session,
    incident: Incident,
    rule: AlertRule,
    target_location: str,
    target_asset_type: str,
    eta_hours: float,
    metric_value: float,
    now: datetime,
    cutoff: datetime,
    force_recheck: bool,
    context: dict[str, Any],
) -> Optional[Alert]:
    """Helper to create a new Alert or update an existing active one within deduplication window."""
    # Check deduplication: existing alert with same (incident_id, alert_type, target_location)
    query = (
        db.query(Alert)
        .filter(
            Alert.incident_id == incident.id,
            Alert.alert_type == rule.alert_type,
            Alert.target_location == target_location,
            Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"]),
        )
    )
    if not force_recheck:
        query = query.filter(Alert.created_at >= cutoff)

    existing = query.first()
    title = rule.template_title.replace("{incident_code}", incident.incident_code or "").replace("{target_location}", target_location)
    message = (
        rule.template_message
        .replace("{incident_code}", incident.incident_code or "")
        .replace("{target_location}", target_location)
        .replace("{metric_value:.1f}", f"{metric_value:.1f}")
    )
    action = (rule.recommended_action or "").replace("{target_location}", target_location)

    if existing:
        # Update existing alert telemetry
        existing.eta_hours = eta_hours
        existing.message = message
        existing.context_snapshot = context
        existing.updated_at = now
        return existing

    # Create new alert
    alert_id = str(uuid.uuid4())
    alert = Alert(
        id=alert_id,
        incident_id=incident.id,
        alert_type=rule.alert_type,
        severity=rule.severity,
        title=title,
        message=message,
        trigger=f"{rule.rule_code} ({metric_value:.1f} {rule.operator} {rule.threshold_value})",
        recommended_restriction=action,
        restriction_type=rule.restriction_type,
        restriction_status="RECOMMENDED",
        status="ACTIVE",
        target_location=target_location,
        target_asset_type=target_asset_type,
        eta_hours=eta_hours,
        rule_code=rule.rule_code,
        context_snapshot=context,
        created_at=now,
        updated_at=now,
    )
    db.add(alert)

    # Route to default recipients
    recipients = ALERT_RECIPIENT_ROUTING.get(rule.alert_type, [("Emergency Maritime Center", "IN_APP_POPUP")])
    for group, channel in recipients:
        recip = AlertRecipient(
            id=str(uuid.uuid4()),
            alert_id=alert_id,
            recipient_group=group,
            channel=channel,
            delivery_status="DELIVERED",
            dispatched_at=now,
        )
        db.add(recip)

    # Add audit event
    event = AlertEvent(
        id=str(uuid.uuid4()),
        alert_id=alert_id,
        incident_id=incident.id,
        event_type="TRIGGERED",
        operator_name="Automated Alert Engine",
        notes=f"Generated via rule {rule.rule_code}. Condition satisfied: {metric_value:.1f} {rule.operator} {rule.threshold_value}.",
        created_at=now,
    )
    db.add(event)

    # Log Incident Event
    inc_event = IncidentEvent(
        id=str(uuid.uuid4()),
        incident_id=incident.id,
        event_type="ALERT_TRIGGERED",
        description=f"Smart Alert [{rule.alert_type} - {rule.severity}]: {title}",
        created_by="AlertEngine",
        created_at=now,
    )
    db.add(inc_event)

    return alert


def acknowledge_alert(
    alert_id: str,
    operator_name: str,
    notes: Optional[str],
    db: Session,
) -> Optional[Alert]:
    """Acknowledges an active alert and records audit log."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None

    now = datetime.now(timezone.utc)
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_by = operator_name
    alert.acknowledged_at = now
    if notes:
        alert.operator_notes = f"{alert.operator_notes or ''}\n[Ack by {operator_name}]: {notes}".strip()
    alert.updated_at = now

    event = AlertEvent(
        id=str(uuid.uuid4()),
        alert_id=alert.id,
        incident_id=alert.incident_id,
        event_type="ACKNOWLEDGED",
        operator_name=operator_name,
        notes=notes or "Alert acknowledged by duty operator.",
        created_at=now,
    )
    db.add(event)

    inc_event = IncidentEvent(
        id=str(uuid.uuid4()),
        incident_id=alert.incident_id,
        event_type="ALERT_ACKNOWLEDGED",
        description=f"Alert {alert.alert_type} acknowledged by {operator_name}.",
        created_by=operator_name,
        created_at=now,
    )
    db.add(inc_event)

    db.commit()
    db.refresh(alert)
    return alert


def confirm_restriction(
    alert_id: str,
    operator_name: str,
    confirmed: bool,
    operator_notes: Optional[str],
    db: Session,
) -> Optional[Alert]:
    """
    Formally confirms or rejects an operational restriction advisory.
    Legal/operational mandates require this human-in-the-loop authorization.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None

    now = datetime.now(timezone.utc)
    new_status = "OPERATOR_CONFIRMED" if confirmed else "OPERATOR_REJECTED"
    alert.restriction_status = new_status
    alert.confirmed_by = operator_name
    alert.confirmed_at = now
    note_prefix = f"[{new_status} by {operator_name}]: "
    if operator_notes:
        alert.operator_notes = f"{alert.operator_notes or ''}\n{note_prefix}{operator_notes}".strip()
    alert.updated_at = now

    event_type = "RESTRICTION_CONFIRMED" if confirmed else "RESTRICTION_REJECTED"
    event = AlertEvent(
        id=str(uuid.uuid4()),
        alert_id=alert.id,
        incident_id=alert.incident_id,
        event_type=event_type,
        operator_name=operator_name,
        notes=operator_notes or f"Restriction {new_status} by {operator_name}.",
        created_at=now,
    )
    db.add(event)

    inc_event = IncidentEvent(
        id=str(uuid.uuid4()),
        incident_id=alert.incident_id,
        event_type=f"RESTRICTION_{'CONFIRMED' if confirmed else 'REJECTED'}",
        description=f"Restriction advisory [{alert.restriction_type}] {'CONFIRMED' if confirmed else 'REJECTED'} by {operator_name}. Advisory: {alert.recommended_restriction}",
        created_by=operator_name,
        created_at=now,
    )
    db.add(inc_event)

    db.commit()
    db.refresh(alert)
    return alert


def get_alerts(
    db: Session,
    incident_id: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    restriction_status: Optional[str] = None,
    limit: int = 100,
) -> tuple[int, int, int, int, list[Alert]]:
    """
    Retrieves alerts with optional filtering and returns statistics:
    (total, active_count, critical_count, unconfirmed_restrictions_count, list_of_alerts).
    """
    # Seed rules if first run
    seed_default_rules(db)

    query = db.query(Alert)
    if incident_id:
        query = query.filter(Alert.incident_id == incident_id)
    if status:
        query = query.filter(Alert.status == status.upper())
    if severity:
        query = query.filter(Alert.severity == severity.upper())
    if restriction_status:
        query = query.filter(Alert.restriction_status == restriction_status.upper())

    total = query.count()
    alerts = query.order_by(desc(Alert.created_at)).limit(limit).all()

    # Aggregate counts across all alerts (or matching query base)
    base_query = db.query(Alert)
    if incident_id:
        base_query = base_query.filter(Alert.incident_id == incident_id)

    active_count = base_query.filter(Alert.status == "ACTIVE").count()
    critical_count = base_query.filter(Alert.severity == "CRITICAL", Alert.status == "ACTIVE").count()
    unconfirmed_restrictions = base_query.filter(
        Alert.status == "ACTIVE",
        Alert.restriction_status == "RECOMMENDED",
        Alert.restriction_type.isnot(None),
    ).count()

    return total, active_count, critical_count, unconfirmed_restrictions, alerts


def get_alert_by_id(db: Session, alert_id: str) -> Optional[Alert]:
    """Fetches a single alert by UUID."""
    return db.query(Alert).filter(Alert.id == alert_id).first()


def get_alert_rules(db: Session) -> list[AlertRule]:
    """Lists all configurable alert rules."""
    seed_default_rules(db)
    return db.query(AlertRule).order_by(AlertRule.rule_code.asc()).all()


def update_alert_rule(db: Session, rule_code: str, update_data: dict[str, Any]) -> Optional[AlertRule]:
    """Updates threshold or active state for an alert rule."""
    rule = db.query(AlertRule).filter(AlertRule.rule_code == rule_code).first()
    if not rule:
        return None

    if "threshold_value" in update_data and update_data["threshold_value"] is not None:
        rule.threshold_value = float(update_data["threshold_value"])
    if "severity" in update_data and update_data["severity"] is not None:
        rule.severity = str(update_data["severity"]).upper()
    if "is_active" in update_data and update_data["is_active"] is not None:
        rule.is_active = bool(update_data["is_active"])
    if "recommended_action" in update_data and update_data["recommended_action"] is not None:
        rule.recommended_action = str(update_data["recommended_action"])
    if "notes" in update_data and update_data["notes"] is not None:
        rule.notes = str(update_data["notes"])

    rule.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rule)
    return rule
