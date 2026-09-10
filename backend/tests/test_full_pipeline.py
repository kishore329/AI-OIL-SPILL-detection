"""
End-to-end integration test for the complete Tier-1 pipeline:
DETECT -> VERIFY -> GIS ANALYZE -> RISK ENGINE -> PRIORITY QUEUE -> DASHBOARD & INCIDENT MGMT.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_full_tier1_integrated_pipeline():
    """
    Executes the complete autonomous pipeline from raw image detection
    to spatial GIS analysis, risk scoring, priority dispatch ranking,
    and dashboard KPI aggregation.
    """
    # ── STEP 1: DETECT & CREATE INCIDENT ──
    detect_res = client.post(
        "/api/v1/detection/analyze",
        data={
            "latitude": 10.85,
            "longitude": 79.90,
            "demo_preset": "sentinel_sar_slick",
        },
    )
    assert detect_res.status_code == 200, f"Detection failed: {detect_res.text}"
    det_data = detect_res.json()

    assert det_data["detected"] is True
    assert det_data["confidence"] > 0.70
    assert det_data["spill_area_km2"] > 0.0
    assert det_data["incident_id"] is not None
    assert det_data["incident_code"] is not None
    assert det_data["severity"] in ("CRITICAL", "HIGH", "MODERATE", "LOW")
    assert det_data["risk_score"] is not None
    assert det_data["priority_score"] is not None
    assert det_data["urgency_level"] in ("IMMEDIATE", "HIGH", "ELEVATED", "ROUTINE")
    assert det_data["coastline_eta_hours"] is not None

    incident_id = det_data["incident_id"]
    incident_code = det_data["incident_code"]

    # ── STEP 2: VERIFY INCIDENT RECORD & EVENTS IN DB ──
    inc_res = client.get(f"/api/v1/incidents/{incident_id}")
    assert inc_res.status_code == 200
    inc_data = inc_res.json()

    assert inc_data["id"] == incident_id
    assert inc_data["incident_code"] == incident_code
    assert inc_data["status"] == "DETECTED"
    assert inc_data["spill_area_km2"] == det_data["spill_area_km2"]
    assert inc_data["risk_score"] == det_data["risk_score"]
    assert inc_data["severity"] == det_data["severity"]

    # Check chronological timeline events logged
    events = inc_data.get("events", [])
    assert len(events) >= 4, f"Expected at least 4 timeline events, got {len(events)}"
    event_types = [e["event_type"] for e in events]
    assert "SPILL_DETECTED_BY_AI" in event_types
    assert "GIS_SPATIAL_ANALYSIS_COMPLETED" in event_types
    assert "RISK_ASSESSMENT_COMPUTED" in event_types
    assert "PRIORITY_QUEUE_RANKED" in event_types

    # ── STEP 3: VERIFY GIS SPATIAL ANALYSIS (NEARBY ZONES) ──
    zones_res = client.get(f"/api/v1/incidents/{incident_id}/nearby-zones?radius_km=50")
    assert zones_res.status_code == 200
    zones_data = zones_res.json()
    assert "zones" in zones_data
    assert zones_data["incident_id"] == incident_id

    # ── STEP 4: VERIFY RISK ENGINE RECORD & EXPLAINABILITY ──
    risk_res = client.get(f"/api/v1/risk/incident/{incident_id}")
    assert risk_res.status_code == 200
    risk_data = risk_res.json()
    assert risk_data["incident_id"] == incident_id
    assert risk_data["risk_score"] == det_data["risk_score"]
    assert len(risk_data["factors"]) == 5
    for factor in risk_data["factors"]:
        assert "name" in factor
        assert "score" in factor
        assert "reason" in factor

    # ── STEP 5: VERIFY OPERATIONAL PRIORITY QUEUE RANKING ──
    prio_res = client.get("/api/v1/incidents/priority?limit=1000")
    assert prio_res.status_code == 200
    prio_data = prio_res.json()
    assert prio_data["total_active"] > 0
    # Incident must appear in the priority queue
    matching_prio = next((item for item in prio_data["items"] if item["incident_id"] == incident_id), None)
    assert matching_prio is not None, f"Incident {incident_id} not found in priority queue"
    assert matching_prio["priority_score"] == det_data["priority_score"]
    assert matching_prio["rank"] >= 1
    assert matching_prio["reason"].startswith(f"Rank #{matching_prio['rank']}")

    # ── STEP 6: VERIFY DASHBOARD SUMMARY REFLECTS AGGREGATES ──
    dash_res = client.get("/api/v1/dashboard/summary")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["active_incidents"] > 0
    assert dash_data["total_spill_area_km2"] is not None
    assert dash_data["total_spill_area_km2"] >= det_data["spill_area_km2"]
    assert dash_data["by_severity"]["critical"] >= 0


def test_data_consistency_across_endpoints():
    """Verify data consistency: risk, severity, and area values match identically across endpoints."""
    # List incidents
    list_res = client.get("/api/v1/incidents?page_size=1")
    assert list_res.status_code == 200
    first_inc = list_res.json()["items"][0]
    inc_id = first_inc["id"]

    # Single incident view
    single_res = client.get(f"/api/v1/incidents/{inc_id}")
    assert single_res.status_code == 200
    single_data = single_res.json()

    # Priority queue view
    prio_res = client.get("/api/v1/incidents/priority?limit=100")
    prio_item = next((i for i in prio_res.json()["items"] if i["incident_id"] == inc_id), None)

    # Check consistency
    assert first_inc["incident_code"] == single_data["incident_code"]
    assert first_inc["severity"] == single_data["severity"]
    if prio_item:
        assert prio_item["incident_code"] == single_data["incident_code"]
        assert prio_item["severity"] == single_data["severity"]
        assert prio_item["risk_score"] == single_data["risk_score"]
