"""
Automated unit & integration tests for Module 22: Environmental Recovery Predictor.
Tests:
  - Transparent asymptotic recovery kinetics across all 5 target ecosystems:
    Mangroves, Coral Reefs, Fisheries, Marine Habitats, and Coastal Ecosystems.
  - Multi-horizon progression: 1M, 3M, 6M, 12M, 24M.
  - Missing data graceful fallback handling.
  - Integration with Ecosystem Risk (Module 12) and Cleanup Plan (Module 15).
  - Custom factor parameter overrides.
  - Incident lifecycle stage transition to RECOVERY and event log auditing.
  - REST API endpoints (POST calculate, GET latest, POST transition, GET/PUT baseline factors).
  - Statutory advisory labeling (model-based estimate, no scientific certainty claimed).
"""
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models.incident import Incident
from app.models.enums import IncidentSeverity, IncidentStatus
from app.models.incident_event import IncidentEvent
from app.models.ecosystem_risk import EcosystemRiskAssessment
from app.models.cleanup_plan import CleanupPlan, CleanupRecommendation
from app.models.environmental_recovery import (
    RecoveryFactor,
    RecoveryPrediction,
    EnvironmentalRecoveryAssessment,
)

# Ensure tables exist
Base.metadata.create_all(bind=engine)

client = TestClient(app)


@pytest.fixture
def test_incident():
    """Create a temporary test incident."""
    db = SessionLocal()
    inc = Incident(
        incident_code=f"INC-RECOV-{uuid.uuid4().hex[:8].upper()}",
        description="Tanker discharge off Coromandel coast for environmental recovery evaluation",
        latitude=12.9512,
        longitude=80.1412,
        spill_area_km2=3.8,
        severity=IncidentSeverity.HIGH,
        status=IncidentStatus.RESPONSE_IN_PROGRESS,
        detected_at=datetime.now(timezone.utc),
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    inc_id = inc.id
    db.close()

    yield inc_id

    db = SessionLocal()
    try:
        db.query(RecoveryPrediction).filter(RecoveryPrediction.incident_id == inc_id).delete()
        db.query(EnvironmentalRecoveryAssessment).filter(EnvironmentalRecoveryAssessment.incident_id == inc_id).delete()
        db.query(CleanupPlan).filter(CleanupPlan.incident_id == inc_id).delete()
        db.query(EcosystemRiskAssessment).filter(EcosystemRiskAssessment.incident_id == inc_id).delete()
        db.query(IncidentEvent).filter(IncidentEvent.incident_id == inc_id).delete()
        del_inc = db.query(Incident).filter(Incident.id == inc_id).first()
        if del_inc:
            db.delete(del_inc)
        db.commit()
    finally:
        db.close()


def test_baseline_factors_api():
    """Verify default baseline kinetic factors are seeded and updateable."""
    # 1. Fetch baseline factors
    res = client.get("/api/v1/recovery/factors")
    assert res.status_code == 200
    factors = res.json()
    assert len(factors) >= 5

    types = {f["ecosystem_type"] for f in factors}
    assert "MANGROVES" in types
    assert "CORAL_REEFS" in types
    assert "FISHERIES" in types
    assert "MARINE_HABITATS" in types
    assert "COASTAL_ECOSYSTEMS" in types

    mangrove_factor = next(f for f in factors if f["ecosystem_type"] == "MANGROVES")
    assert mangrove_factor["baseline_recovery_rate_k"] > 0
    assert mangrove_factor["asymptotic_max_recovery"] >= 90.0

    # 2. Update a factor
    fid = mangrove_factor["id"]
    put_res = client.put(
        f"/api/v1/recovery/factors/{fid}",
        json={"baseline_recovery_rate_k": 0.098, "notes": "Calibrated with regional mangrove nursery growth rates"},
    )
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["baseline_recovery_rate_k"] == 0.098
    assert "mangrove nursery" in updated["notes"]


def test_recovery_calculation_all_5_target_ecosystems(test_incident):
    """Verify calculation produces non-decreasing recovery percentages across 1M, 3M, 6M, 12M, 24M."""
    res = client.post(f"/api/v1/incidents/{test_incident}/recovery", json={})
    assert res.status_code == 200
    data = res.json()

    assert data["incident_id"] == test_incident
    assert data["ecosystems_evaluated_count"] == 5
    assert data["overall_recovery_index_24m"] > 0
    assert "MODEL ESTIMATE" in data["disclaimer"]
    assert "NOT A SCIENTIFIC GUARANTEE" in data["disclaimer"]

    # Trajectories validation
    trajectories = data["trajectories"]
    assert len(trajectories) == 5

    traj_map = {t["ecosystem_type"]: t for t in trajectories}
    for req_type in ["MANGROVES", "CORAL_REEFS", "FISHERIES", "MARINE_HABITATS", "COASTAL_ECOSYSTEMS"]:
        assert req_type in traj_map
        t = traj_map[req_type]
        pcts = t["trajectories"]
        for h in ["1M", "3M", "6M", "12M", "24M"]:
            assert h in pcts
            assert 0.0 <= pcts[h] <= 100.0

        # Monotonic non-decreasing progression check
        assert pcts["1M"] <= pcts["3M"] <= pcts["6M"] <= pcts["12M"] <= pcts["24M"]
        assert len(t["milestones"]) == 5

    # Ecological kinetic relative check: Coral Reefs recover slower than Fisheries
    assert traj_map["CORAL_REEFS"]["trajectories"]["1M"] < traj_map["FISHERIES"]["trajectories"]["1M"]
    assert traj_map["CORAL_REEFS"]["trajectories"]["24M"] <= traj_map["FISHERIES"]["trajectories"]["24M"]

    # Predictions itemized check: 5 ecosystems * 5 horizons = 25 items
    predictions = data["predictions"]
    assert len(predictions) == 25
    for p in predictions:
        assert p["assumptions"]
        assert "formula" in p["assumptions"]
        assert "k_effective" in p["assumptions"]


def test_missing_data_graceful_fallbacks(test_incident):
    """Verify recovery calculation works even if no cleanup plan or ecosystem risk assessment exists."""
    db = SessionLocal()
    # Ensure no cleanup plan and no ecosystem risk assessment
    db.query(CleanupPlan).filter(CleanupPlan.incident_id == test_incident).delete()
    db.query(EcosystemRiskAssessment).filter(EcosystemRiskAssessment.incident_id == test_incident).delete()
    db.commit()
    db.close()

    res = client.post(f"/api/v1/incidents/{test_incident}/recovery", json={})
    assert res.status_code == 200
    data = res.json()
    assert data["cleanup_effectiveness_applied"] == 0.60  # Default baseline fallback
    assert data["ecosystem_risk_score_applied"] == 50.0   # Default baseline fallback
    assert len(data["trajectories"]) == 5


def test_integration_with_ecosystem_risk_and_cleanup_plan(test_incident):
    """Verify that cleanup plan effectiveness and ecosystem risk are gathered and influence rate."""
    db = SessionLocal()
    # 1. Create a high-suitability cleanup plan
    cp = CleanupPlan(
        incident_id=test_incident,
        plan_code="CP-TEST-RECOV",
        spill_size_tier="TIER_2_MEDIUM",
        overall_strategy="HIGH_EFFICIENCY_SKIMMING",
        status="ACTIVE",
    )
    db.add(cp)
    db.flush()

    rec1 = CleanupRecommendation(
        plan_id=cp.id,
        action="CONTAINMENT_BOOM",
        action_title="Offshore Boom Barrier",
        reason="Trap leading edge",
        priority="CRITICAL",
        suitability_score=92.0,
        operational_status="DEPLOYED",
    )
    rec2 = CleanupRecommendation(
        plan_id=cp.id,
        action="MECHANICAL_SKIMMING",
        action_title="High Capacity Skimmer",
        reason="Rapid recovery",
        priority="HIGH",
        suitability_score=88.0,
        operational_status="DEPLOYED",
    )
    db.add(rec1)
    db.add(rec2)

    # 2. Create an ecosystem risk assessment
    era = EcosystemRiskAssessment(
        incident_id=test_incident,
        overall_risk_score=75.0,
        overall_severity="HIGH",
        most_sensitive_zone="Gulf of Mannar Biosphere Reserve",
        most_sensitive_type="CORAL_REEF",
    )
    db.add(era)
    db.commit()
    db.close()

    res = client.post(f"/api/v1/incidents/{test_incident}/recovery", json={})
    assert res.status_code == 200
    data = res.json()

    # Average of 92 and 88 is 90% (0.90)
    assert abs(data["cleanup_effectiveness_applied"] - 0.90) < 0.05
    assert data["ecosystem_risk_score_applied"] == 75.0


def test_custom_factor_overrides(test_incident):
    """Verify user-supplied parameter overrides alter recovery trajectory."""
    # Run with standard baseline
    res_base = client.post(f"/api/v1/incidents/{test_incident}/recovery", json={})
    mangrove_base_24m = next(
        t["trajectories"]["24M"] for t in res_base.json()["trajectories"] if t["ecosystem_type"] == "MANGROVES"
    )

    # Run with heavily boosted kinetic rate k=0.35 and max recovery 99%
    res_override = client.post(
        f"/api/v1/incidents/{test_incident}/recovery",
        json={
            "custom_factors": {
                "MANGROVES": {
                    "baseline_recovery_rate_k": 0.35,
                    "asymptotic_max_recovery": 99.0,
                }
            },
            "cleanup_effectiveness_override": 0.95,
        },
    )
    assert res_override.status_code == 200
    mangrove_over_24m = next(
        t["trajectories"]["24M"] for t in res_override.json()["trajectories"] if t["ecosystem_type"] == "MANGROVES"
    )

    assert mangrove_over_24m > mangrove_base_24m


def test_lifecycle_transition_to_recovery(test_incident):
    """Verify advancing incident lifecycle status to RECOVERY and writing audit event."""
    res = client.post(
        f"/api/v1/incidents/{test_incident}/recovery/transition-lifecycle",
        json={
            "new_status": "RECOVERY",
            "authorizing_officer": "Commander K. Saravanan (MRCC Chennai)",
            "transition_notes": "Emergency containment completed; initiating 24-month long-term ecological rehabilitation and water quality monitoring.",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["current_status"] == "RECOVERY"
    assert data["incident_id"] == test_incident
    assert "Saravanan" in data["authorizing_officer"]

    # Verify incident in DB is updated
    db = SessionLocal()
    inc = db.query(Incident).filter(Incident.id == test_incident).first()
    assert inc.status == IncidentStatus.RECOVERY

    # Verify audit event was logged
    event = db.query(IncidentEvent).filter(IncidentEvent.id == data["event_id"]).first()
    assert event is not None
    assert event.event_type == "LIFECYCLE_STAGE_TRANSITION"
    assert "RECOVERY" in event.description
    db.close()


def test_get_recovery_endpoint(test_incident):
    """Verify GET endpoint fetches latest assessment."""
    # Ensure calculated first
    client.post(f"/api/v1/incidents/{test_incident}/recovery", json={})

    res = client.get(f"/api/v1/incidents/{test_incident}/recovery")
    assert res.status_code == 200
    data = res.json()
    assert data["incident_id"] == test_incident
    assert len(data["trajectories"]) == 5
