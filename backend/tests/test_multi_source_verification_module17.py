"""
Comprehensive unit and integration test suite for Module 17 — Multi-Source Verification.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database.session import SessionLocal, engine, Base
from app.models.incident import Incident
from app.models.enums import IncidentStatus, IncidentSeverity
from app.services.multi_source_verification.verification_engine import (
    MultiSourceVerificationEngine,
    EvidencePayload,
)
from app.services.multi_source_verification.service import MultiSourceVerificationService


client = TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def sample_incident(db: Session):
    inc = Incident(
        incident_code=f"TEST-VERIF-{uuid.uuid4().hex[:6].upper()}",
        status=IncidentStatus.DETECTED,
        severity=IncidentSeverity.HIGH,
        latitude=13.08,
        longitude=80.35,
        spill_area_km2=4.5,
        detection_confidence=0.88,
        description="Multi-Source Verification Test Incident",
        source="SATELLITE",
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc


def test_engine_weight_normalization_and_scoring():
    engine = MultiSourceVerificationEngine()
    
    evidence_list = [
        EvidencePayload("SATELLITE", "Satellite SAR", 0.90, "SAR_RADAR_ANOMALY", True, 0.95, "LIVE"),
        EvidencePayload("DRONE", "Tactical Drone", 0.85, "THERMAL_FOOTAGE", True, 0.90, "SIMULATED"),
        EvidencePayload("METOCEAN_CONTEXT", "Buoy Telemetry", 0.88, "CURRENT_CONVERGENCE", True, 0.92, "LIVE"),
    ]

    result = engine.evaluate(evidence_list)
    assert result.overall_confidence > 0.70
    assert result.decision in ("VERIFIED", "NEEDS_REVIEW")
    assert result.agreement_score == 1.0
    assert result.contradiction_detected is False
    assert sum(result.weights_summary.values()) == pytest.approx(1.0, 0.01)


def test_engine_contradictory_evidence_handling():
    engine = MultiSourceVerificationEngine()

    evidence_list = [
        EvidencePayload("SATELLITE", "Satellite SAR", 0.90, "SAR_RADAR_ANOMALY", True, 0.95, "LIVE"),
        EvidencePayload("DRONE", "Drone Camera", 0.85, "VISUAL_CLEAR_WATER", False, 0.90, "LIVE"),  # Contradicts!
    ]

    result = engine.evaluate(evidence_list)
    assert result.contradiction_detected is True
    assert result.decision == "NEEDS_REVIEW"
    assert "Contradictory evidence detected" in result.explanation


def test_single_source_low_confidence_restriction():
    engine = MultiSourceVerificationEngine()

    # Single low-confidence citizen report
    evidence_list = [
        EvidencePayload("CITIZEN_REPORT", "Local Resident", 0.50, "EYEWITNESS_REPORT", True, 0.60, "SIMULATED"),
    ]

    result = engine.evaluate(evidence_list)
    assert result.decision == "NEEDS_REVIEW"  # Restricted from auto-verification!
    assert "Single-source detection requires operator review" in result.explanation or "Moderate evidence" in result.explanation


def test_verification_service_evaluation_and_lifecycle_sync(db: Session, sample_incident: Incident):
    service = MultiSourceVerificationService()

    res = service.evaluate_incident_verification(db, sample_incident.id)
    assert res.incident_id == sample_incident.id
    assert res.overall_confidence_score > 0.0
    assert res.decision in ("VERIFIED", "NEEDS_REVIEW", "REJECTED")
    assert len(res.evidence_breakdown) >= 5

    # Check data origin tags present
    origins = [ev.data_origin for ev in res.evidence_breakdown]
    assert "LIVE" in origins or "SIMULATED" in origins


def test_verification_api_flow(sample_incident: Incident):
    # 1. GET /api/v1/incidents/{id}/verification
    get_res = client.get(f"/api/v1/incidents/{sample_incident.id}/verification")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["incident_id"] == sample_incident.id
    assert "overall_confidence_score" in data
    assert "evidence_breakdown" in data

    # 2. POST /api/v1/incidents/{id}/verify
    verify_res = client.post(f"/api/v1/incidents/{sample_incident.id}/verify", json={"force_recalculate": True})
    assert verify_res.status_code == 200
    assert verify_res.json()["decision"] in ("VERIFIED", "NEEDS_REVIEW", "REJECTED")

    # 3. POST /api/v1/incidents/{id}/verification/evidence
    evidence_payload = {
        "source_code": "DRONE",
        "provider_name": "Emergency Response Recon Flight",
        "confidence": 0.94,
        "quality_score": 0.95,
        "data_origin": "LIVE",
        "evidence_type": "UAV_MULTISPECTRAL_HD",
        "agrees_with_spill": True,
        "notes": "Clear multi-spectral oil film boundary confirmed.",
    }
    add_res = client.post(f"/api/v1/incidents/{sample_incident.id}/verification/evidence", json=evidence_payload)
    assert add_res.status_code == 201
    assert len(add_res.json()["evidence_breakdown"]) >= 6

    # 4. POST /api/v1/incidents/{id}/verification/override
    override_payload = {
        "decision": "VERIFIED",
        "decision_notes": "Authorized by Coast Guard Commander based on UAV & satellite consensus.",
        "operator_name": "Commander Saravanan",
    }
    override_res = client.post(f"/api/v1/incidents/{sample_incident.id}/verification/override", json=override_payload)
    assert override_res.status_code == 200
    assert override_res.json()["decision"] == "VERIFIED"
    assert "Commander Saravanan" in override_res.json()["verified_by"]
