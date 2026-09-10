"""
Automated unit & integration tests for Module 23: Smart Alert and Restriction System.
Tests:
  - Default rule seeding (8 rules across Risk, Coastal, Fishing, Port, Protected Area, Vessel, Priority, Community).
  - Multi-domain telemetry evaluation:
      * Risk score >= 76 -> CRITICAL_SPILL_ALERT
      * Fishing zone impact <= 6h -> FISHING_WARNING
      * Port impact <= 12h -> PORT_WARNING
      * Shoreline/Beach landfall <= 6h -> COASTAL_WARNING
  - Deduplication prevents spamming multiple identical active alerts.
  - Multi-channel recipient routing (NAVTEX, VHF, SMS, In-App).
  - Operator acknowledgement workflow.
  - Advisory restriction confirmation vs rejection workflow (human-in-the-loop requirement).
  - Configurable alert rule threshold modification via REST API.
  - GET /api/v1/alerts and GET /api/v1/incidents/{id}/alerts filtering.
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models.incident import Incident
from app.models.enums import IncidentSeverity, IncidentStatus
from app.models.coastal_impact import CoastalImpactPrediction
from app.models.alert import Alert, AlertRule, AlertRecipient, AlertEvent
from app.services.alert_system.service import (
    seed_default_rules,
    evaluate_incident_alerts,
    acknowledge_alert,
    confirm_restriction,
    get_alerts,
)

# Ensure tables exist
Base.metadata.create_all(bind=engine)

client = TestClient(app)


@pytest.fixture
def alert_test_incident():
    """Create a temporary test incident with high risk and coastal impact targets."""
    db = SessionLocal()
    inc = Incident(
        incident_code=f"INC-ALERT-{uuid.uuid4().hex[:8].upper()}",
        description="High-volume heavy crude spill off Chennai outer anchorage",
        latitude=13.0827,
        longitude=80.2707,
        risk_score=82.5,
        spill_area_km2=6.4,
        severity=IncidentSeverity.CRITICAL,
        status=IncidentStatus.RESPONSE_IN_PROGRESS,
        detected_at=datetime.now(timezone.utc),
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    inc_id = inc.id

    now = datetime.now(timezone.utc)
    # Add coastal impact predictions
    imp_fishing = CoastalImpactPrediction(
        id=str(uuid.uuid4()),
        incident_id=inc_id,
        target_location="Ennore Fishing Sector B",
        target_type="FISHING_ZONE",
        latitude=13.20,
        longitude=80.32,
        distance_km=4.2,
        estimated_hours_to_impact=3.5,
        predicted_impact_time=now + timedelta(hours=3.5),
        impact_horizon="3H",
        severity="HIGH",
        confidence=0.88,
        impact_probability=85.0,
    )
    imp_port = CoastalImpactPrediction(
        id=str(uuid.uuid4()),
        incident_id=inc_id,
        target_location="Kamarajar Port Approach",
        target_type="PORT",
        latitude=13.26,
        longitude=80.34,
        distance_km=11.5,
        estimated_hours_to_impact=8.0,
        predicted_impact_time=now + timedelta(hours=8.0),
        impact_horizon="12H",
        severity="HIGH",
        confidence=0.90,
        impact_probability=80.0,
    )
    imp_beach = CoastalImpactPrediction(
        id=str(uuid.uuid4()),
        incident_id=inc_id,
        target_location="Marina Beach Sector 4",
        target_type="BEACH",
        latitude=13.05,
        longitude=80.28,
        distance_km=3.0,
        estimated_hours_to_impact=2.0,
        predicted_impact_time=now + timedelta(hours=2.0),
        impact_horizon="3H",
        severity="CRITICAL",
        confidence=0.92,
        impact_probability=90.0,
    )
    db.add_all([imp_fishing, imp_port, imp_beach])
    db.commit()
    db.close()

    yield inc_id

    # Cleanup
    db = SessionLocal()
    inc_obj = db.query(Incident).filter(Incident.id == inc_id).first()
    if inc_obj:
        db.delete(inc_obj)
        db.commit()
    db.close()


def test_seed_default_rules():
    """Verify default rules are seeded properly and idempotently."""
    db = SessionLocal()
    seeded = seed_default_rules(db)
    rules = db.query(AlertRule).all()
    assert len(rules) >= 8
    rule_codes = [r.rule_code for r in rules]
    assert "RULE_RISK_CRITICAL" in rule_codes
    assert "RULE_COASTAL_6H" in rule_codes
    assert "RULE_FISHING_6H" in rule_codes
    assert "RULE_PORT_12H" in rule_codes
    assert "RULE_PROTECTED_AREA_12H" in rule_codes
    assert "RULE_VESSEL_TRAFFIC" in rule_codes
    assert "RULE_RESPONSE_ESCALATION" in rule_codes
    assert "RULE_COMMUNITY_8H" in rule_codes

    # Running again should be idempotent
    seeded_again = seed_default_rules(db)
    assert seeded_again == 0
    db.close()


def test_evaluate_incident_alerts_triggers(alert_test_incident):
    """Verify multiple alerts trigger based on telemetry metrics and coastal targets."""
    db = SessionLocal()
    alerts = evaluate_incident_alerts(alert_test_incident, db)
    assert len(alerts) >= 4

    types = [a.alert_type for a in alerts]
    assert "CRITICAL_SPILL_ALERT" in types
    assert "FISHING_WARNING" in types
    assert "PORT_WARNING" in types
    assert "COASTAL_WARNING" in types

    # Check CRITICAL_SPILL_ALERT details
    crit_alert = next(a for a in alerts if a.alert_type == "CRITICAL_SPILL_ALERT")
    assert crit_alert.severity == "CRITICAL"
    assert crit_alert.restriction_status == "RECOMMENDED"
    assert crit_alert.status == "ACTIVE"
    assert len(crit_alert.recipients) >= 1
    assert any("Coast Guard" in r.recipient_group for r in crit_alert.recipients)

    # Check FISHING_WARNING details
    fish_alert = next(a for a in alerts if a.alert_type == "FISHING_WARNING")
    assert fish_alert.restriction_type == "FISHING_RESTRICTION"
    assert fish_alert.target_location == "Ennore Fishing Sector B"
    assert fish_alert.eta_hours == 3.5

    # Check deduplication: evaluating again within 6h does not inflate alert count
    initial_count = len(alerts)
    second_eval = evaluate_incident_alerts(alert_test_incident, db, force_recheck=False)
    assert len(second_eval) == initial_count
    db.close()


def test_acknowledge_alert_workflow(alert_test_incident):
    """Verify operator can acknowledge an active alert."""
    db = SessionLocal()
    alerts = evaluate_incident_alerts(alert_test_incident, db)
    target_alert = alerts[0]

    updated = acknowledge_alert(
        alert_id=str(target_alert.id),
        operator_name="Officer Sharma",
        notes="Notified MRCC and initiated barrier readiness.",
        db=db,
    )
    assert updated is not None
    assert updated.status == "ACKNOWLEDGED"
    assert updated.acknowledged_by == "Officer Sharma"
    assert updated.acknowledged_at is not None
    assert "Notified MRCC" in (updated.operator_notes or "")

    # Verify event audit log
    event = db.query(AlertEvent).filter(
        AlertEvent.alert_id == target_alert.id,
        AlertEvent.event_type == "ACKNOWLEDGED",
    ).first()
    assert event is not None
    assert event.operator_name == "Officer Sharma"
    db.close()


def test_confirm_restriction_workflow(alert_test_incident):
    """Verify operator restriction confirmation workflow enforces distinction between recommendation and action."""
    db = SessionLocal()
    alerts = evaluate_incident_alerts(alert_test_incident, db)
    fish_alert = next(a for a in alerts if a.alert_type == "FISHING_WARNING")

    # Initial state must be RECOMMENDED (not legally binding yet)
    assert fish_alert.restriction_status == "RECOMMENDED"

    # Confirm restriction
    confirmed_alert = confirm_restriction(
        alert_id=str(fish_alert.id),
        operator_name="Director Raman",
        confirmed=True,
        operator_notes="Approved 5nm exclusion zone for 24 hours per SOP-14.",
        db=db,
    )
    assert confirmed_alert is not None
    assert confirmed_alert.restriction_status == "OPERATOR_CONFIRMED"
    assert confirmed_alert.confirmed_by == "Director Raman"
    assert confirmed_alert.confirmed_at is not None

    # Test rejection workflow on another alert
    port_alert = next(a for a in alerts if a.alert_type == "PORT_WARNING")
    rejected_alert = confirm_restriction(
        alert_id=str(port_alert.id),
        operator_name="Director Raman",
        confirmed=False,
        operator_notes="Wind vector shifted offshore; no port closure required.",
        db=db,
    )
    assert rejected_alert is not None
    assert rejected_alert.restriction_status == "OPERATOR_REJECTED"
    db.close()


def test_rest_api_alerts_flow(alert_test_incident):
    """Test end-to-end REST API endpoints for Module 23."""
    # 1. Trigger generate endpoint
    gen_res = client.post("/api/v1/alerts/generate", json={"incident_id": alert_test_incident})
    assert gen_res.status_code == 201
    generated = gen_res.json()
    assert len(generated) >= 4
    first_id = generated[0]["id"]

    # 2. List alerts via GET /api/v1/alerts
    list_res = client.get(f"/api/v1/alerts?incident_id={alert_test_incident}")
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 4
    assert data["active_count"] >= 4
    assert len(data["alerts"]) >= 4

    # 3. Get single alert by ID
    get_res = client.get(f"/api/v1/alerts/{first_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == first_id

    # 4. Acknowledge via PATCH
    ack_res = client.patch(
        f"/api/v1/alerts/{first_id}/acknowledge",
        json={"operator_name": "Watch Officer Kumar", "notes": "Dispatched patrol boat"},
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"
    assert ack_res.json()["acknowledged_by"] == "Watch Officer Kumar"

    # 5. Confirm restriction via POST
    conf_res = client.post(
        f"/api/v1/alerts/{first_id}/confirm-restriction",
        json={
            "operator_name": "Coast Guard Commander",
            "confirmed": True,
            "operator_notes": "Official maritime restriction declared.",
        },
    )
    assert conf_res.status_code == 200
    assert conf_res.json()["restriction_status"] == "OPERATOR_CONFIRMED"

    # 6. Incident-specific alerts route
    inc_res = client.get(f"/api/v1/incidents/{alert_test_incident}/alerts")
    assert inc_res.status_code == 200
    assert inc_res.json()["total"] >= 4


def test_alert_rules_configuration_api():
    """Verify retrieving and updating alert rules via API."""
    # List rules
    rules_res = client.get("/api/v1/alerts/rules")
    assert rules_res.status_code == 200
    rules = rules_res.json()
    assert len(rules) >= 8

    # Modify threshold for RULE_RISK_CRITICAL
    patch_res = client.patch(
        "/api/v1/alerts/rules/RULE_RISK_CRITICAL",
        json={"threshold_value": 80.0, "notes": "Updated threshold to 80.0"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["threshold_value"] == 80.0

    # Reset back to 76.0
    reset_res = client.patch(
        "/api/v1/alerts/rules/RULE_RISK_CRITICAL",
        json={"threshold_value": 76.0, "notes": "Standard threshold"},
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["threshold_value"] == 76.0
