"""
Unit and integration tests for Incident Priority Engine.
Tests:
  - Multi-incident priority ranking and ordering
  - Tie-breaking with equal risk scores (proximity, ETA, spill size)
  - Status weighting (DETECTED vs CONTAINMENT vs RESOLVED)
  - Exclusion of resolved incidents from active queue
  - Deterministic explainability reasoning
  - API endpoints GET /api/v1/incidents/priority, GET /api/v1/priority/queue, POST /api/v1/priority/rank
"""
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.services.priority_engine import PriorityEngine
from app.schemas.priority import PriorityRankSimulationItem
from app.models.enums import IncidentSeverity, IncidentStatus
from app.database.session import SessionLocal

client = TestClient(app)


def test_priority_ranking_order():
    """Verify incidents are ranked deterministically from highest urgency (#1) downward."""
    res = client.get("/api/v1/incidents/priority?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) > 0
    assert data["items"][0]["rank"] == 1

    # Verify descending priority scores
    for i in range(len(data["items"]) - 1):
        curr_p = data["items"][i]["priority_score"]
        next_p = data["items"][i + 1]["priority_score"]
        assert curr_p >= next_p, f"Rank {i+1} score {curr_p} is less than Rank {i+2} score {next_p}"


def test_priority_tie_breaking_equal_risk():
    """
    Verify that when two incidents have identical risk scores, tie-breaking favors
    the incident with closer shoreline proximity (smaller ETA) and larger spill area.
    """
    items = [
        PriorityRankSimulationItem(
            incident_code="INC-FAR-OFFSHORE",
            risk_score=85.0,
            severity=IncidentSeverity.CRITICAL,
            status=IncidentStatus.DETECTED,
            spill_area_km2=10.0,
            latitude=15.0,
            longitude=70.0,
            distance_coastline_km=75.0,  # Far offshore, ETA 30.0h
        ),
        PriorityRankSimulationItem(
            incident_code="INC-IMMINENT-COASTAL",
            risk_score=85.0,  # Exact same risk score!
            severity=IncidentSeverity.CRITICAL,
            status=IncidentStatus.DETECTED,
            spill_area_km2=45.0,  # Larger spill
            latitude=18.9,
            longitude=72.8,
            distance_coastline_km=4.0,  # Very close, ETA 1.6h
        ),
    ]

    res = PriorityEngine.rank_simulation(items)
    assert len(res.items) == 2
    assert res.items[0].incident_code == "INC-IMMINENT-COASTAL"
    assert res.items[0].rank == 1
    assert res.items[1].incident_code == "INC-FAR-OFFSHORE"
    assert res.items[1].rank == 2
    assert res.items[0].priority_score > res.items[1].priority_score


def test_priority_status_weighting():
    """Verify that an active uncontained spill (DETECTED) has higher priority than one under CONTAINMENT."""
    items = [
        PriorityRankSimulationItem(
            incident_code="INC-CONTAINED",
            risk_score=70.0,
            severity=IncidentSeverity.HIGH,
            status=IncidentStatus.CONTAINMENT,
            spill_area_km2=20.0,
            latitude=12.5,
            longitude=80.2,
            distance_coastline_km=15.0,
        ),
        PriorityRankSimulationItem(
            incident_code="INC-FRESH-ALERT",
            risk_score=70.0,
            severity=IncidentSeverity.HIGH,
            status=IncidentStatus.DETECTED,
            spill_area_km2=20.0,
            latitude=12.5,
            longitude=80.2,
            distance_coastline_km=15.0,
        ),
    ]

    res = PriorityEngine.rank_simulation(items)
    assert res.items[0].incident_code == "INC-FRESH-ALERT"
    assert res.items[0].factors.status_urgency_component > res.items[1].factors.status_urgency_component


def test_priority_filtering_resolved():
    """Verify that RESOLVED incidents are excluded by default, but included when include_resolved=True."""
    # First create a test incident with RESOLVED status
    unique_code = f"TEST-RES-{uuid.uuid4().hex[:6].upper()}"
    create_res = client.post(
        "/api/v1/incidents",
        json={
            "incident_code": unique_code,
            "status": "RESOLVED",
            "severity": "CRITICAL",
            "risk_score": 99.0,
            "latitude": 13.0,
            "longitude": 80.0,
            "spill_area_km2": 2.5,
            "is_active": True,
        },
    )
    assert create_res.status_code == 201

    # Check default queue: unique_code should NOT appear
    default_q = client.get("/api/v1/incidents/priority?limit=200").json()
    assert not any(i["incident_code"] == unique_code for i in default_q["items"])

    # Check queue with include_resolved=true: total active count increases and service finds it
    resolved_q = client.get("/api/v1/incidents/priority?include_resolved=true&limit=200").json()
    assert resolved_q["total_active"] > default_q["total_active"]

    # Verify directly via PriorityEngine ranking
    db = SessionLocal()
    try:
        ranked = PriorityEngine.rank_incidents(db, include_resolved=True, limit=1000)
        assert any(i.incident_code == unique_code for i in ranked.items)
    finally:
        db.close()






def test_priority_explainability_reason():
    """Verify each ranked item includes a plain-language justification answering why it holds its rank."""
    res = client.get("/api/v1/incidents/priority?limit=5")
    assert res.status_code == 200
    data = res.json()
    for item in data["items"]:
        assert item["reason"].startswith(f"Rank #{item['rank']}")
        assert len(item["reason"]) > 20
        assert "factors" in item
        assert "risk_score_component" in item["factors"]
        assert "urgency_eta_component" in item["factors"]


def test_priority_api_routes():
    """Verify GET /api/v1/incidents/priority and /api/v1/priority/queue aliases work equivalently."""
    res1 = client.get("/api/v1/incidents/priority?limit=5")
    res2 = client.get("/api/v1/priority/queue?limit=5")
    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["queue_length"] == res2.json()["queue_length"]
    assert res1.json()["items"][0]["incident_code"] == res2.json()["items"][0]["incident_code"]


def test_priority_post_simulation_endpoint():
    """Verify POST /api/v1/priority/rank allows ad-hoc simulation ranking."""
    payload = {
        "incidents": [
            {
                "incident_code": "SIM-ALPHA",
                "risk_score": 92.0,
                "severity": "CRITICAL",
                "spill_area_km2": 55.0,
                "latitude": 19.0,
                "longitude": 72.8,
                "distance_coastline_km": 6.0,
            },
            {
                "incident_code": "SIM-BETA",
                "risk_score": 35.0,
                "severity": "LOW",
                "spill_area_km2": 1.2,
                "latitude": 14.0,
                "longitude": 70.0,
                "distance_coastline_km": 80.0,
            },
        ]
    }
    res = client.post("/api/v1/priority/rank", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["queue_length"] == 2
    assert data["items"][0]["incident_code"] == "SIM-ALPHA"
    assert data["items"][0]["rank"] == 1
    assert data["items"][0]["urgency_level"] == "IMMEDIATE"
