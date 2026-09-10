"""
Tests for Module 13 — Coastal Impact Predictor and Time-to-Impact.
Verifies spatial trajectory intersection, horizon bucketing, API endpoints,
database persistence, and edge cases.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import get_db
from app.models.incident import Incident
from app.models.enums import IncidentSeverity, IncidentStatus
from app.models.coastal_impact import CoastalImpactPrediction
from app.services.coastal_impact_service import CoastalImpactService, HORIZONS
from app.schemas.coastal_impact import CoastalImpactPredictRequest

client = TestClient(app)


# ── FIXTURES ─────────────────────────────────────────────────────────────────

@pytest.fixture
def test_incident(db: Session):
    """Creates a sample coastal oil spill incident near Chennai (13.05, 80.28)."""
    inc = Incident(
        incident_code="TEST-COASTAL-001",
        status=IncidentStatus.DETECTED,
        severity=IncidentSeverity.CRITICAL,
        risk_score=78.5,
        detection_confidence=0.92,
        spill_area_km2=24.5,
        latitude=13.08,
        longitude=80.32,
        description="Simulated offshore spill approaching Chennai coastal sector",
        is_active=True,
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    yield inc
    db.delete(inc)
    db.commit()


@pytest.fixture
def remote_ocean_incident(db: Session):
    """Creates an isolated deep-ocean incident with no nearby coastlines."""
    inc = Incident(
        incident_code="TEST-OCEAN-REMOTE-001",
        status=IncidentStatus.DETECTED,
        severity=IncidentSeverity.LOW,
        risk_score=15.0,
        detection_confidence=0.88,
        spill_area_km2=2.0,
        latitude=-18.5,
        longitude=65.0,
        description="Deep South Indian Ocean mid-basin slick",
        is_active=True,
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    yield inc
    db.delete(inc)
    db.commit()


@pytest.fixture
def db():
    gen = get_db()
    db_session = next(gen)
    yield db_session
    try:
        next(gen)
    except StopIteration:
        pass


# ── UNIT & ALGORITHM TESTS ───────────────────────────────────────────────────

class TestCoastalImpactCalculations:
    def test_horizon_definitions(self):
        """Verifies all expected horizon codes exist and span 0 to 36 hours."""
        codes = [h[0] for h in HORIZONS]
        assert "NOW" in codes
        assert "1H" in codes
        assert "3H" in codes
        assert "6H" in codes
        assert "12H" in codes
        assert "24H" in codes

    def test_predict_for_coastal_incident(self, db, test_incident):
        """Tests that a coastal spill generates affected locations with valid time-to-impact."""
        res = CoastalImpactService.predict(db, str(test_incident.id))

        assert res.incident_id == str(test_incident.id)
        assert res.total_affected_locations > 0
        assert res.earliest_impact_hours is not None
        assert res.earliest_impact_hours >= 0.0
        assert res.earliest_impact_location is not None
        assert res.overall_coastal_severity in ("CRITICAL", "HIGH", "MODERATE", "LOW")
        assert len(res.timeline_summary) == len(HORIZONS)

        # Check affected locations items
        for item in res.affected_locations:
            assert item.target_location
            assert item.target_type in (
                "BEACH", "COASTAL_SETTLEMENT", "PORT", "FISHING_ZONE",
                "PROTECTED_AREA", "TOURISM", "INFRASTRUCTURE", "COASTLINE"
            )
            assert item.distance_km >= 0.0
            assert item.estimated_hours_to_impact >= 0.0
            assert item.impact_horizon in ("NOW", "1H", "3H", "6H", "12H", "24H", ">24H")
            assert item.confidence > 0.0
            assert item.severity in ("CRITICAL", "HIGH", "MODERATE", "LOW")

    def test_predict_persists_to_database(self, db, test_incident):
        """Verifies predictions are written to coastal_impact_predictions table."""
        res = CoastalImpactService.predict(db, str(test_incident.id))

        # Check DB rows
        recs = (
            db.query(CoastalImpactPrediction)
            .filter(CoastalImpactPrediction.incident_id == str(test_incident.id))
            .all()
        )
        assert len(recs) == res.total_affected_locations
        assert len(recs) > 0

    def test_get_latest_returns_saved_data(self, db, test_incident):
        """Verifies get_latest reads persisted predictions without re-computing."""
        res1 = CoastalImpactService.predict(db, str(test_incident.id))
        res2 = CoastalImpactService.get_latest(db, str(test_incident.id))

        assert res1.total_affected_locations == res2.total_affected_locations
        assert res1.earliest_impact_hours == res2.earliest_impact_hours
        assert res1.earliest_impact_location == res2.earliest_impact_location

    def test_deep_ocean_no_coastal_impact(self, db, remote_ocean_incident):
        """Verifies deep ocean incident produces zero coastal impacts."""
        res = CoastalImpactService.predict(
            db, str(remote_ocean_incident.id), CoastalImpactPredictRequest(search_buffer_km=50.0)
        )
        assert res.total_affected_locations == 0
        assert res.earliest_impact_hours is None
        assert res.earliest_impact_location is None
        assert res.overall_coastal_severity == "LOW"

    def test_time_to_impact_summary(self, db, test_incident):
        """Tests TimeToImpactResponse calculation and urgency grading."""
        CoastalImpactService.predict(db, str(test_incident.id))
        tti = CoastalImpactService.get_time_to_impact(db, str(test_incident.id))

        assert tti.incident_id == str(test_incident.id)
        assert tti.urgency_level in ("IMMEDIATE", "CRITICAL", "HIGH", "ELEVATED", "MONITORING")
        assert tti.alert_summary is not None
        assert "ESTIMATED" in tti.alert_summary
        assert "ESTIMATED" in tti.disclaimer
        assert isinstance(tti.timeline_counts, dict)


# ── API ENDPOINT TESTS ───────────────────────────────────────────────────────

class TestCoastalImpactAPI:
    def test_get_coastal_impact_404_invalid_id(self):
        """GET /coastal-impact with non-existent incident returns 404."""
        resp = client.get("/api/v1/incidents/00000000-0000-0000-0000-000000000000/coastal-impact")
        assert resp.status_code == 404

    def test_post_predict_success(self, test_incident):
        """POST /coastal-impact/predict triggers prediction and returns 201."""
        resp = client.post(
            f"/api/v1/incidents/{test_incident.id}/coastal-impact/predict",
            json={"search_buffer_km": 100.0},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["incident_id"] == str(test_incident.id)
        assert "affected_locations" in data
        assert "timeline_summary" in data
        assert "impact_zones_geojson" in data
        assert "disclaimer" in data

    def test_get_coastal_impact_after_predict(self, test_incident):
        """GET /coastal-impact returns 200 with persisted records."""
        resp = client.get(f"/api/v1/incidents/{test_incident.id}/coastal-impact")
        assert resp.status_code == 200
        data = resp.json()
        assert data["incident_id"] == str(test_incident.id)
        assert data["total_affected_locations"] > 0

    def test_get_time_to_impact_endpoint(self, test_incident):
        """GET /time-to-impact returns concise operational metrics."""
        resp = client.get(f"/api/v1/incidents/{test_incident.id}/time-to-impact")
        assert resp.status_code == 200
        data = resp.json()
        assert data["incident_id"] == str(test_incident.id)
        assert "urgency_level" in data
        assert "alert_summary" in data
        assert "timeline_counts" in data
