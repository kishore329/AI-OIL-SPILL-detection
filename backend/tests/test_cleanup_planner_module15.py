"""
Comprehensive unit and integration tests for Module 15 — Smart Cleanup Planner.
Tests rules engine, multi-criteria scoring, API endpoints, error handling,
and lifecycle event logging upon recommendation acceptance.
"""
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import get_db
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.enums import IncidentSeverity, IncidentStatus
from app.models.cleanup_plan import CleanupPlan, CleanupRecommendation
from app.services.cleanup_planner.rules_engine import CleanupRulesEngine
from app.services.cleanup_planner.service import SmartCleanupPlannerService

client_instance = TestClient(app)

@pytest.fixture
def client():
    return client_instance


@pytest.fixture
def test_db():
    gen = get_db()
    db_session = next(gen)
    yield db_session
    try:
        next(gen)
    except StopIteration:
        pass


@pytest.fixture
def sample_incident(test_db):
    inc_code = f"TEST-CP-{uuid.uuid4().hex[:6].upper()}"
    incident = Incident(
        incident_code=inc_code,
        description="Offshore Tanker Rupture Test",
        latitude=13.08,
        longitude=80.35,
        severity=IncidentSeverity.HIGH,
        status=IncidentStatus.RESPONSE_IN_PROGRESS,
        spill_area_km2=2.8,
    )
    test_db.add(incident)
    test_db.commit()
    test_db.refresh(incident)
    return incident


class TestCleanupRulesEngine:
    """Test multi-criteria response rules and scoring."""

    def test_spill_tier_classification(self):
        assert CleanupRulesEngine.classify_spill_tier(0.2, "LOW") == "TIER_1_SMALL"
        assert CleanupRulesEngine.classify_spill_tier(1.5, "MEDIUM") == "TIER_2_MEDIUM"
        assert CleanupRulesEngine.classify_spill_tier(0.1, "CRITICAL") == "TIER_3_MAJOR"
        assert CleanupRulesEngine.classify_spill_tier(6.5, "HIGH") == "TIER_3_MAJOR"

    def test_primary_strategy_selection(self):
        strat1 = CleanupRulesEngine.determine_primary_strategy(
            coastal_distance_km=15.0, coastal_eta_hours=8.0, spill_area_km2=2.0, sensitive_ecosystem="MANGROVE"
        )
        assert strat1 == "SHORELINE_PROTECTION_AND_EXCLUSION_BOOMING"

        strat2 = CleanupRulesEngine.determine_primary_strategy(
            coastal_distance_km=85.0, coastal_eta_hours=None, spill_area_km2=4.0, sensitive_ecosystem=None
        )
        assert strat2 == "OFFSHORE_CONTAINMENT_AND_MECHANICAL_SKIMMING"

    def test_containment_boom_wave_penalty(self):
        calm_ctx = {"spill_area_km2": 2.0, "oil_type": "HEAVY_CRUDE", "wave_height_m": 0.8, "current_speed_ms": 0.3}
        rough_ctx = {"spill_area_km2": 2.0, "oil_type": "HEAVY_CRUDE", "wave_height_m": 2.5, "current_speed_ms": 1.2}

        calm_recs = CleanupRulesEngine.evaluate_recommendations(calm_ctx)
        rough_recs = CleanupRulesEngine.evaluate_recommendations(rough_ctx)

        calm_boom = next(r for r in calm_recs if r["action"] == "CONTAINMENT_BOOM_DEPLOYMENT")
        rough_boom = next(r for r in rough_recs if r["action"] == "CONTAINMENT_BOOM_DEPLOYMENT")

        assert calm_boom["suitability_score"] > rough_boom["suitability_score"]
        assert "splashover" in rough_boom["reason"].lower() or "wave" in rough_boom["reason"].lower()

    def test_dispersant_environmental_restrictions(self):
        nearshore_ctx = {
            "coastal_distance_km": 5.0,
            "most_sensitive_ecosystem": "CORAL_REEF",
            "oil_type": "CRUDE_OIL",
        }
        offshore_ctx = {
            "coastal_distance_km": 60.0,
            "most_sensitive_ecosystem": None,
            "oil_type": "CRUDE_OIL",
            "wave_height_m": 1.2,
        }

        near_recs = CleanupRulesEngine.evaluate_recommendations(nearshore_ctx)
        off_recs = CleanupRulesEngine.evaluate_recommendations(offshore_ctx)

        near_disp = next(r for r in near_recs if r["action"] == "DISPERSANT_APPLICATION")
        off_disp = next(r for r in off_recs if r["action"] == "DISPERSANT_APPLICATION")

        assert near_disp["suitability_score"] <= 25.0
        assert "RESTRICTED" in near_disp["reason"]
        assert off_disp["suitability_score"] >= 65.0

    def test_shoreline_protection_urgency(self):
        urgent_ctx = {"coastal_distance_km": 8.0, "earliest_coastal_impact_hours": 4.5}
        distant_ctx = {"coastal_distance_km": 90.0, "earliest_coastal_impact_hours": None}

        urgent_recs = CleanupRulesEngine.evaluate_recommendations(urgent_ctx)
        distant_recs = CleanupRulesEngine.evaluate_recommendations(distant_ctx)

        urgent_shore = next(r for r in urgent_recs if r["action"] == "SHORELINE_PROTECTION_BARRIER")
        distant_shore = next(r for r in distant_recs if r["action"] == "SHORELINE_PROTECTION_BARRIER")

        assert urgent_shore["priority"] == "CRITICAL"
        assert urgent_shore["suitability_score"] > distant_shore["suitability_score"]


class TestCleanupPlannerService:
    """Test SmartCleanupPlannerService operations and persistence."""

    def test_generate_and_persist_plan(self, test_db, sample_incident):
        plan_resp = SmartCleanupPlannerService.generate_cleanup_plan(
            test_db, sample_incident.id
        )

        assert plan_resp.incident_id == sample_incident.id
        assert plan_resp.plan_code.startswith("CP-")
        assert len(plan_resp.recommendations) >= 5
        assert plan_resp.decision_support_disclaimer is not None

        # Verify DB persistence
        db_plan = test_db.query(CleanupPlan).filter(CleanupPlan.id == plan_resp.id).first()
        assert db_plan is not None
        assert len(db_plan.recommendations) >= 5

    def test_accept_recommendation_creates_incident_event(self, test_db, sample_incident):
        plan_resp = SmartCleanupPlannerService.generate_cleanup_plan(
            test_db, sample_incident.id
        )
        first_rec = plan_resp.recommendations[0]

        # Accept the recommendation
        updated_rec = SmartCleanupPlannerService.update_recommendation_status(
            test_db,
            incident_id=sample_incident.id,
            recommendation_id=first_rec.id,
            target_status="ACCEPTED",
            decision_notes="Authorized by Coast Guard Commander for immediate deployment.",
        )

        assert updated_rec.operational_status == "ACCEPTED"
        assert updated_rec.decision_notes == "Authorized by Coast Guard Commander for immediate deployment."

        # Verify that IncidentEvent was logged
        events = (
            test_db.query(IncidentEvent)
            .filter(
                IncidentEvent.incident_id == sample_incident.id,
                IncidentEvent.event_type == "CLEANUP_ACTION_ACCEPTED",
            )
            .all()
        )
        assert len(events) >= 1
        assert first_rec.action_title in events[0].description


class TestCleanupPlannerAPI:
    """Test REST API endpoints for Module 15."""

    def test_get_cleanup_plan_endpoint(self, client, sample_incident):
        res = client.get(f"/api/v1/incidents/{sample_incident.id}/cleanup-plan")
        assert res.status_code == 200
        data = res.json()
        assert data["incident_id"] == sample_incident.id
        assert len(data["recommendations"]) > 0

    def test_generate_cleanup_plan_post_endpoint(self, client, sample_incident):
        payload = {
            "oil_type": "DIESEL",
            "strategy_focus": "SHORELINE_DEFENSE",
            "force_recalculate": True,
        }
        res = client.post(
            f"/api/v1/incidents/{sample_incident.id}/cleanup-plan/generate",
            json=payload,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["oil_type"] == "DIESEL"
        assert data["overall_strategy"] == "SHORELINE_DEFENSE"

    def test_update_recommendation_status_endpoint(self, client, sample_incident):
        # 1. Fetch plan
        plan_res = client.get(f"/api/v1/incidents/{sample_incident.id}/cleanup-plan")
        rec_id = plan_res.json()["recommendations"][0]["id"]

        # 2. Accept
        res = client.post(
            f"/api/v1/incidents/{sample_incident.id}/cleanup-plan/recommendations/{rec_id}/status",
            json={"status": "ACCEPTED", "decision_notes": "Deploy immediately from Chennai Port."},
        )
        assert res.status_code == 200
        assert res.json()["operational_status"] == "ACCEPTED"

        # 3. Reject second recommendation
        rec_id2 = plan_res.json()["recommendations"][1]["id"]
        res2 = client.post(
            f"/api/v1/incidents/{sample_incident.id}/cleanup-plan/recommendations/{rec_id2}/status",
            json={"status": "REJECTED", "decision_notes": "Not needed for current calm conditions."},
        )
        assert res2.status_code == 200
        assert res2.json()["operational_status"] == "REJECTED"

    def test_invalid_status_rejected_with_400(self, client, sample_incident):
        plan_res = client.get(f"/api/v1/incidents/{sample_incident.id}/cleanup-plan")
        rec_id = plan_res.json()["recommendations"][0]["id"]

        res = client.post(
            f"/api/v1/incidents/{sample_incident.id}/cleanup-plan/recommendations/{rec_id}/status",
            json={"status": "INVALID_STATUS"},
        )
        assert res.status_code == 400

    def test_nonexistent_incident_returns_404(self, client):
        fake_id = str(uuid.uuid4())
        res = client.get(f"/api/v1/incidents/{fake_id}/cleanup-plan")
        assert res.status_code == 404
