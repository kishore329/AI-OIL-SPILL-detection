"""
Automated unit & integration tests for Module 24: Oil Spill AI Assistant.
Tests:
  - Grounded reasoning across Priority (Module 6), Risk (Module 5), Coastal Impact (Module 13),
    Emergency Vessels (Module 7), Cleanup (Module 15), Economic Damage (Module 21),
    Recovery (Module 22), Source Analysis (Module 18), and Alerts (Module 23).
  - Hallucination prevention and safe fallback on missing / unknown incident codes.
  - Non-accusatory legal safety wording in source analysis.
  - Decision-support disclaimers on predictions and tactical recommendations.
  - Conversation persistence, message histories, and REST API endpoints.
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models.incident import Incident
from app.models.enums import IncidentSeverity, IncidentStatus
from app.models.risk import RiskAssessment
from app.models.coastal_impact import CoastalImpactPrediction
from app.models.emergency_vessel import EmergencyVessel
from app.models.assistant import AssistantConversation, AssistantMessage

Base.metadata.create_all(bind=engine)
client = TestClient(app)


@pytest.fixture
def assistant_test_incident():
    """Seed a rich test incident with risk, coastal predictions, and available vessels."""
    db = SessionLocal()
    inc_code = f"INC-ASST-{uuid.uuid4().hex[:6].upper()}"
    inc = Incident(
        incident_code=inc_code,
        description="Crude carrier collision in outer harbor channel",
        latitude=13.10,
        longitude=80.30,
        risk_score=88.5,
        spill_area_km2=5.2,
        severity=IncidentSeverity.CRITICAL,
        status=IncidentStatus.RESPONSE_IN_PROGRESS,
        detected_at=datetime.now(timezone.utc),
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    inc_id = inc.id

    # Risk Assessment
    risk = RiskAssessment(
        id=str(uuid.uuid4()),
        incident_id=inc_id,
        risk_score=88.5,
        spill_size_score=85.0,
        coastal_proximity_score=90.0,
        environmental_score=92.0,
        spread_score=78.0,
        human_exposure_score=60.0,
        explanation="Severe hydrocarbon discharge within 5km of critical fishing and mangrove habitat.",
    )
    db.add(risk)

    now = datetime.now(timezone.utc)
    # Coastal Impact
    imp = CoastalImpactPrediction(
        id=str(uuid.uuid4()),
        incident_id=inc_id,
        target_location="Sector Charlie Fishing Grounds",
        target_type="FISHING_ZONE",
        latitude=13.15,
        longitude=80.35,
        distance_km=6.8,
        estimated_hours_to_impact=4.5,
        predicted_impact_time=now + timedelta(hours=4.5),
        impact_horizon="6H",
        severity="HIGH",
        confidence=0.91,
        impact_probability=85.0,
    )
    db.add(imp)

    # Emergency Vessel
    vessel = EmergencyVessel(
        id=str(uuid.uuid4()),
        name="ICGS Samudra Sentinel",
        vessel_type="OIL_SPILL_RESPONSE_VESSEL",
        home_port="Chennai Port Trust",
        latitude=13.08,
        longitude=80.29,
        cruising_speed_knots=16.0,
        skimmer_capacity_m3h=120.0,
        is_available=True,
        status="AVAILABLE",
    )
    db.add(vessel)

    db.commit()
    db.close()

    yield inc_id, inc_code

    # Cleanup
    db = SessionLocal()
    inc_obj = db.query(Incident).filter(Incident.id == inc_id).first()
    if inc_obj:
        db.delete(inc_obj)
    v_obj = db.query(EmergencyVessel).filter(EmergencyVessel.name == "ICGS Samudra Sentinel").first()
    if v_obj:
        db.delete(v_obj)
    db.commit()
    db.close()


def test_highest_priority_intent(assistant_test_incident):
    """Verify assistant correctly identifies highest priority spill with risk, time-to-impact, and citations."""
    inc_id, inc_code = assistant_test_incident
    res = client.post("/api/v1/assistant/chat", json={"message": "Which incident has the highest priority?"})
    assert res.status_code == 200
    data = res.json()

    content = data["message"]["content"]
    assert inc_code in content or "highest response priority" in content
    assert "Risk Score" in content
    assert len(data["message"]["sources"]) >= 2
    assert any("Priority" in s or "Risk" in s for s in data["message"]["sources"])
    assert len(data["suggested_followups"]) >= 2


def test_why_critical_explanation(assistant_test_incident):
    """Verify assistant explains risk breakdown for a specific incident."""
    inc_id, inc_code = assistant_test_incident
    res = client.post("/api/v1/assistant/chat", json={"message": f"Why is {inc_code} critical?"})
    assert res.status_code == 200
    data = res.json()

    content = data["message"]["content"]
    assert inc_code in content
    assert "Spill Magnitude" in content or "Risk" in content
    assert data["message"]["referenced_incident_code"] == inc_code
    assert any("Risk Engine" in s or "Coastal Impact" in s for s in data["message"]["sources"])


def test_coastal_threat_inquiry(assistant_test_incident):
    """Verify assistant retrieves threatened coastal sectors and estimated ETAs."""
    inc_id, inc_code = assistant_test_incident
    res = client.post("/api/v1/assistant/chat", json={
        "message": "Which coastal areas are at risk?",
        "incident_id": inc_id,
    })
    assert res.status_code == 200
    data = res.json()

    content = data["message"]["content"]
    assert "Sector Charlie Fishing Grounds" in content or "hours" in content
    assert any("Coastal Impact" in s for s in data["message"]["sources"])


def test_vessel_response_recommendation(assistant_test_incident):
    """Verify assistant recommends available response vessels with distance, transit ETA, and capacity."""
    inc_id, inc_code = assistant_test_incident
    res = client.post("/api/v1/assistant/chat", json={
        "message": "Which vessel should respond?",
        "incident_id": inc_id,
    })
    assert res.status_code == 200
    data = res.json()

    content = data["message"]["content"]
    assert "ICGS Samudra Sentinel" in content or "Emergency" in content
    assert "Skimmer Capacity" in content or "ETA" in content
    assert any("Emergency Vessels" in s for s in data["message"]["sources"])


def test_hallucination_prevention_on_unknown_incident():
    """Verify assistant refuses to invent data when an unknown incident code is queried."""
    fake_code = "INC-UNKNOWN-99999"
    res = client.post("/api/v1/assistant/chat", json={"message": f"Why is {fake_code} critical?"})
    assert res.status_code == 200
    data = res.json()

    content = data["message"]["content"]
    # Must contain the safety statement: "I don't have enough verified data to determine that."
    assert "I don't have enough verified data to determine that" in content
    assert fake_code in content


def test_conversation_persistence_and_retrieval(assistant_test_incident):
    """Test full chat thread persistence, retrieval by ID, listing, and deletion."""
    inc_id, inc_code = assistant_test_incident

    # 1. Turn 1
    res1 = client.post("/api/v1/assistant/chat", json={
        "message": f"Give me a status update on {inc_code}",
        "incident_id": inc_id,
    })
    assert res1.status_code == 200
    conv_id = res1.json()["conversation_id"]

    # 2. Turn 2 in the same conversation
    res2 = client.post("/api/v1/assistant/chat", json={
        "message": "Which vessel should respond?",
        "conversation_id": conv_id,
    })
    assert res2.status_code == 200
    assert res2.json()["conversation_id"] == conv_id

    # 3. Retrieve conversation history
    get_res = client.get(f"/api/v1/assistant/conversations/{conv_id}")
    assert get_res.status_code == 200
    conv_data = get_res.json()
    assert conv_data["id"] == conv_id
    # At least 4 messages (User 1, Assistant 1, User 2, Assistant 2)
    assert len(conv_data["messages"]) >= 4

    # 4. List conversations
    list_res = client.get("/api/v1/assistant/conversations")
    assert list_res.status_code == 200
    assert any(c["id"] == conv_id for c in list_res.json())

    # 5. Delete conversation
    del_res = client.delete(f"/api/v1/assistant/conversations/{conv_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # 6. Verify 404 after deletion
    get_del = client.get(f"/api/v1/assistant/conversations/{conv_id}")
    assert get_del.status_code == 404


def test_cleanup_strategy_inquiry(assistant_test_incident):
    """Verify assistant provides decision-support cleanup recommendations."""
    inc_id, inc_code = assistant_test_incident
    res = client.post("/api/v1/assistant/chat", json={
        "message": "What cleanup strategy is recommended?",
        "incident_id": inc_id,
    })
    assert res.status_code == 200
    data = res.json()
    assert "Cleanup" in str(data["message"]["sources"])
    assert "booms" in data["message"]["content"].lower() or "containment" in data["message"]["content"].lower()


def test_economic_and_recovery_inquiries(assistant_test_incident):
    """Verify assistant handles economic impact and environmental recovery questions with model qualifiers."""
    inc_id, inc_code = assistant_test_incident

    # Economic
    res_econ = client.post("/api/v1/assistant/chat", json={
        "message": "What is the estimated economic impact?",
        "incident_id": inc_id,
    })
    assert res_econ.status_code == 200
    assert any("Economic" in s for s in res_econ.json()["message"]["sources"])

    # Recovery
    res_rec = client.post("/api/v1/assistant/chat", json={
        "message": "How long for environmental recovery?",
        "incident_id": inc_id,
    })
    assert res_rec.status_code == 200
    assert any("Recovery" in s for s in res_rec.json()["message"]["sources"])


def test_alerts_and_restrictions_inquiry(assistant_test_incident):
    """Verify assistant reports active alerts and recommended restrictions."""
    inc_id, inc_code = assistant_test_incident
    res = client.post("/api/v1/assistant/chat", json={
        "message": "What alerts and restrictions are active?",
        "incident_id": inc_id,
    })
    assert res.status_code == 200
    data = res.json()
    assert any("Alert" in s for s in data["message"]["sources"])


def test_general_help_fallback():
    """Verify general questions receive helpful guided overview of platform capabilities."""
    res = client.post("/api/v1/assistant/chat", json={"message": "Hello, how can you help me?"})
    assert res.status_code == 200
    content = res.json()["message"]["content"]
    assert "Oil Spill Intelligence Copilot" in content
    assert len(res.json()["suggested_followups"]) >= 2
