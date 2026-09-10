"""
Comprehensive test suite for Module 18 — Probable Spill Source Analyzer.
Tests reverse trajectory advection, candidate source area ranking, safe-wording compliance,
missing vessel resilience, and REST API endpoints.
"""
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.source_analysis import SourceAnalysis, SourceCandidate, SourceEvidence
from app.models.enums import IncidentStatus, IncidentSeverity
from app.services.source_analyzer.reverse_drift_engine import ReverseDriftEngine
from app.services.source_analyzer.service import SourceAnalyzerService

client = TestClient(app)


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def sample_incident(db_session: Session) -> Incident:
    inc = Incident(
        incident_code=f"TEST-SRC-{uuid.uuid4().hex[:6].upper()}",
        latitude=13.0827,
        longitude=80.3700,
        severity=IncidentSeverity.HIGH,
        status=IncidentStatus.DETECTED,
        spill_area_km2=2.4,
        detection_confidence=0.88,
        description="Hydrocarbon sheen detected 12 NM off Chennai port entrance.",
        source="SATELLITE",
    )
    db_session.add(inc)
    db_session.commit()
    db_session.refresh(inc)
    return inc


class TestReverseDriftEngine:
    def test_reverse_advection_direction(self):
        """Verify that reverse drift vector points opposite to forward advection vector."""
        engine = ReverseDriftEngine()
        res = engine.calculate_reverse_trajectory(
            origin_lat=13.0827,
            origin_lon=80.3700,
            spill_area_km2=2.0,
            detection_time=datetime.now(timezone.utc),
            wind_speed_ms=8.0,
            wind_direction_deg=225.0,  # From SW -> pushes to NE
            current_speed_ms=0.5,
            current_direction_deg=45.0,  # Towards NE
            lookback_hours=24.0,
        )

        assert len(res.steps) >= 4
        assert res.drift_speed_kmh > 0
        # Forward bearing towards NE (~40-60 deg), Backwards bearing towards SW (~220-240 deg)
        assert 180.0 <= res.backwards_bearing_deg <= 270.0
        
        # Verify first step is upstream (south/west of origin)
        first_step = res.steps[0]
        assert first_step.latitude < 13.0827 or first_step.longitude < 80.3700

    def test_uncertainty_envelope_expansion(self):
        """Verify that dispersion uncertainty radius grows with lookback time."""
        engine = ReverseDriftEngine()
        res = engine.calculate_reverse_trajectory(
            origin_lat=13.0827,
            origin_lon=80.3700,
            spill_area_km2=1.0,
            detection_time=datetime.now(timezone.utc),
            lookback_hours=24.0,
        )

        radii = [s.uncertainty_radius_km for s in res.steps]
        for i in range(len(radii) - 1):
            assert radii[i] <= radii[i + 1], "Uncertainty radius must expand backwards in time"

        assert res.envelope_polygon_geojson["type"] == "Polygon"
        assert len(res.envelope_polygon_geojson["coordinates"][0]) > 6


class TestSourceAnalyzerService:
    def test_candidate_ranking_and_bounds(self, db_session: Session, sample_incident: Incident):
        """Test candidate source regions generated with appropriate confidence scores and rank ordering."""
        service = SourceAnalyzerService()
        resp = service.evaluate_source_analysis(db_session, sample_incident.id, lookback_hours=24.0)

        assert resp.incident_id == sample_incident.id
        assert 60.0 <= resp.overall_confidence_score <= 100.0
        assert len(resp.candidates) == 3

        cand_a = resp.candidates[0]
        cand_b = resp.candidates[1]
        cand_c = resp.candidates[2]

        assert cand_a.candidate_code == "REGION_A"
        assert cand_b.candidate_code == "REGION_B"
        assert cand_c.candidate_code == "REGION_C"

        # Verify confidence ranking: Region A > Region B > Region C
        assert cand_a.confidence_score >= cand_b.confidence_score >= cand_c.confidence_score
        assert cand_a.rank_order == 1
        assert cand_b.rank_order == 2
        assert cand_c.rank_order == 3

    def test_strict_safe_wording_compliance(self, db_session: Session, sample_incident: Incident):
        """
        CRITICAL TEST: Ensure NO accusatory language is generated for any vessel or candidate.
        Mandatory presence of statutory advisory disclaimers.
        """
        service = SourceAnalyzerService()
        resp = service.evaluate_source_analysis(db_session, sample_incident.id, lookback_hours=24.0)

        # 1. Statutory disclaimer must be present
        assert "STATUTORY ADVISORY" in resp.legal_disclaimer
        assert "probabilistic mathematical model" in resp.legal_disclaimer
        assert "does not establish legal liability" in resp.legal_disclaimer

        # 2. Check all potentially relevant vessels
        forbidden_terms = [
            "caused the spill",
            "perpetrator",
            "guilty",
            "culprit",
            "illegal polluter",
            "responsible party determined",
            "violator",
        ]

        for vessel in resp.potentially_relevant_vessels:
            assert "Potentially relevant vessel" in vessel.relevance_wording
            assert "statutory investigation" in vessel.relevance_wording.lower()

            for term in forbidden_terms:
                assert term not in vessel.description.lower()
                assert term not in vessel.relevance_wording.lower()

    def test_missing_vessel_data_resilience(self, db_session: Session):
        """Verify analyzer functions smoothly even if no live AIS positions exist in DB."""
        inc_remote = Incident(
            incident_code=f"TEST-REMOTE-{uuid.uuid4().hex[:6].upper()}",
            latitude=5.5000,
            longitude=85.0000,  # Far offshore
            severity=IncidentSeverity.MODERATE,
            status=IncidentStatus.DETECTED,
            spill_area_km2=0.8,
            detection_confidence=0.80,
            source="SATELLITE",
        )
        db_session.add(inc_remote)
        db_session.commit()
        db_session.refresh(inc_remote)

        service = SourceAnalyzerService()
        resp = service.evaluate_source_analysis(db_session, inc_remote.id, lookback_hours=12.0)

        assert resp.incident_id == inc_remote.id
        assert resp.overall_confidence_score > 0
        assert len(resp.candidates) == 3

    def test_audit_event_logged(self, db_session: Session, sample_incident: Incident):
        """Verify that Source Analysis evaluation registers an IncidentEvent in the audit trail."""
        service = SourceAnalyzerService()
        service.evaluate_source_analysis(db_session, sample_incident.id)

        events = db_session.query(IncidentEvent).filter(
            IncidentEvent.incident_id == sample_incident.id,
            IncidentEvent.event_type == "SOURCE_ANALYSIS_EVALUATED"
        ).all()

        assert len(events) >= 1
        assert "Probable spill source analysis evaluated" in events[0].description


class TestSourceAnalysisAPI:
    def test_post_evaluate_endpoint(self, sample_incident: Incident):
        response = client.post(
            f"/api/v1/incidents/{sample_incident.id}/source-analysis",
            json={"lookback_hours": 24.0, "force_recalculate": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["incident_id"] == sample_incident.id
        assert data["overall_confidence_score"] >= 60.0
        assert len(data["candidates"]) == 3
        assert len(data["reverse_trajectory"]) >= 4
        assert "STATUTORY ADVISORY" in data["legal_disclaimer"]

    def test_get_analysis_endpoint(self, sample_incident: Incident):
        response = client.get(f"/api/v1/incidents/{sample_incident.id}/source-analysis")
        assert response.status_code == 200
        data = response.json()
        assert data["incident_id"] == sample_incident.id
        assert len(data["candidates"]) == 3
