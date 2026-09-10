"""
Unit and integration tests for Oil Spill Risk Engine.
Tests:
  - Low risk scoring (< 25)
  - Moderate risk scoring (26-50)
  - High risk scoring (51-75)
  - Critical risk scoring (76-100)
  - Boundary values (0 area, 0 distance, extreme distances)
  - Missing data & graceful defaults
  - Factor explainability structure and reasons
  - DB persistence & history audit
"""
from fastapi.testclient import TestClient
from app.main import app
from app.services.risk_engine import RiskEngine
from app.schemas.risk import RiskCalculateRequest
from app.models.enums import IncidentSeverity

client = TestClient(app)


def test_risk_critical_spill():
    """Verify catastrophic spill near coast & protected area produces CRITICAL score (>75)."""
    res = client.post(
        "/api/v1/risk/calculate",
        json={
            "spill_area_km2": 85.0,
            "distance_coastline_km": 3.2,
            "distance_protected_area_km": 8.0,
            "distance_fishing_zone_km": 5.0,
            "distance_port_km": 10.0,
            "distance_shipping_lane_km": 6.0,
            "spread_severity": "CRITICAL",
            "detection_confidence": 0.95,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["risk_score"] >= 76.0
    assert data["severity"] == "CRITICAL"
    assert len(data["factors"]) >= 5

    # Check factors have names, scores, and reasons
    for factor in data["factors"]:
        assert "name" in factor
        assert "score" in factor
        assert "reason" in factor
        assert factor["score"] >= 0.0


def test_risk_high_spill():
    """Verify substantial spill produces HIGH score (51–75)."""
    res = client.post(
        "/api/v1/risk/calculate",
        json={
            "spill_area_km2": 25.0,
            "distance_coastline_km": 18.0,
            "distance_protected_area_km": 25.0,
            "distance_fishing_zone_km": 20.0,
            "distance_port_km": 35.0,
            "distance_shipping_lane_km": 20.0,
            "spread_severity": "HIGH",
            "detection_confidence": 0.88,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert 51.0 <= data["risk_score"] <= 75.0
    assert data["severity"] == "HIGH"


def test_risk_moderate_spill():
    """Verify localized spill at intermediate distance produces MODERATE score (26–50)."""
    res = client.post(
        "/api/v1/risk/calculate",
        json={
            "spill_area_km2": 4.5,
            "distance_coastline_km": 42.0,
            "distance_protected_area_km": 55.0,
            "distance_fishing_zone_km": 40.0,
            "distance_port_km": 60.0,
            "distance_shipping_lane_km": 35.0,
            "spread_severity": "MODERATE",
            "detection_confidence": 0.80,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert 26.0 <= data["risk_score"] <= 50.0
    assert data["severity"] == "MODERATE"


def test_risk_low_spill():
    """Verify trace spill far offshore produces LOW score (0–25)."""
    res = client.post(
        "/api/v1/risk/calculate",
        json={
            "spill_area_km2": 0.4,
            "distance_coastline_km": 160.0,
            "distance_protected_area_km": 140.0,
            "distance_fishing_zone_km": 110.0,
            "distance_port_km": 150.0,
            "distance_shipping_lane_km": 80.0,
            "spread_severity": "LOW",
            "detection_confidence": 0.75,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["risk_score"] <= 25.0
    assert data["severity"] == "LOW"


def test_risk_boundary_values():
    """Verify boundary inputs: 0 area, 0 distance, extreme distances, 0/1 confidence."""
    # Test 0 area and extreme distance
    res_zero = client.post(
        "/api/v1/risk/calculate",
        json={
            "spill_area_km2": 0.0,
            "distance_coastline_km": 500.0,
            "distance_protected_area_km": 500.0,
            "distance_fishing_zone_km": 500.0,
            "distance_port_km": 500.0,
            "distance_shipping_lane_km": 500.0,
            "spread_severity": "LOW",
            "detection_confidence": 1.0,
        },
    )
    assert res_zero.status_code == 200
    assert 0.0 <= res_zero.json()["risk_score"] <= 20.0

    # Test extreme high area and 0 distance
    res_max = client.post(
        "/api/v1/risk/calculate",
        json={
            "spill_area_km2": 500.0,
            "distance_coastline_km": 0.0,
            "distance_protected_area_km": 0.0,
            "distance_fishing_zone_km": 0.0,
            "distance_port_km": 0.0,
            "distance_shipping_lane_km": 0.0,
            "spread_severity": "CRITICAL",
            "detection_confidence": 0.99,
        },
    )
    assert res_max.status_code == 200
    assert 90.0 <= res_max.json()["risk_score"] <= 100.0


def test_risk_missing_data_defaults():
    """Verify request with minimal or empty fields gracefully applies defaults without crashing."""
    res = client.post("/api/v1/risk/calculate", json={})
    assert res.status_code == 200
    data = res.json()
    assert "risk_score" in data
    assert 0.0 <= data["risk_score"] <= 100.0
    assert data["severity"] in ("LOW", "MODERATE", "HIGH", "CRITICAL")


def test_risk_incident_history_and_persistence():
    """Verify calculating risk for an incident saves historical records and returns history."""
    # Get an existing incident
    inc_res = client.get("/api/v1/incidents?page_size=1")
    assert inc_res.status_code == 200
    incident_id = inc_res.json()["items"][0]["id"]

    # Calculate risk first time
    calc1 = client.post("/api/v1/risk/calculate", json={"incident_id": incident_id})
    assert calc1.status_code == 200
    id1 = calc1.json()["assessment_id"]

    # Calculate risk second time with updated area
    calc2 = client.post(
        "/api/v1/risk/calculate",
        json={"incident_id": incident_id, "spill_area_km2": 45.0},
    )
    assert calc2.status_code == 200
    id2 = calc2.json()["assessment_id"]
    assert id1 != id2  # Does not overwrite; creates new record

    # Retrieve history
    hist_res = client.get(f"/api/v1/risk/incident/{incident_id}/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["total_assessments"] >= 2
    assert any(a["assessment_id"] == id1 for a in hist_data["assessments"])
    assert any(a["assessment_id"] == id2 for a in hist_data["assessments"])


def test_risk_summary():
    """Verify GET /api/v1/risk/summary returns fleet statistics and distribution."""
    res = client.get("/api/v1/risk/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_active_incidents" in data
    assert "average_risk_score" in data
    assert "severity_distribution" in data
    assert "CRITICAL" in data["severity_distribution"]
    assert "top_risk_incidents" in data
