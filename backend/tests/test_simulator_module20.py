"""
Automated unit & integration tests for Module 20: What-If Oil Spill Simulator.
Tests:
  - Isolation guarantee: verifying simulation does NOT modify or create real incident records
  - Simulation calculations: movement trajectory, Fay radial spreading, risk, ecosystem, coastal, economic, response
  - Oil type physical variances (Heavy Crude vs Refined Diesel)
  - Input boundary and schema validation (negative spill size, invalid lat/lon, invalid duration, invalid oil type)
  - API endpoints: POST create, GET list, GET by ID, POST run, GET compare, DELETE
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models.incident import Incident
from app.models.simulation import SimulationRun, SimulationInput, SimulationOutput

# Ensure all tables are created
Base.metadata.create_all(bind=engine)

client = TestClient(app)


def test_simulation_incident_isolation():
    """
    CRITICAL REQUIREMENT:
    Verify that creating and running a simulation does NOT modify, create,
    or delete records in the production 'incidents' database.
    """
    db = SessionLocal()
    try:
        incident_count_before = db.query(Incident).count()
        all_incident_ids_before = {inc.id for inc in db.query(Incident.id).all()}

        # Run a hypothetical 500-barrel simulation scenario
        payload = {
            "name": "Isolation Test Scenario",
            "notes": "Testing isolation from live production incidents",
            "inputs": {
                "latitude": 13.0827,
                "longitude": 80.2707,
                "spill_size": 500.0,
                "spill_size_unit": "BARRELS",
                "oil_type": "LIGHT_CRUDE",
                "wind_speed_kmh": 25.0,
                "wind_direction_deg": 225.0,
                "current_speed_knots": 2.0,
                "current_direction_deg": 45.0,
                "duration_hours": 24.0,
            },
            "auto_run": True,
        }
        res = client.post("/api/v1/simulations", json=payload)
        assert res.status_code == 201
        data = res.json()
        sim_id = data["id"]

        # Check production incidents count and IDs after simulation run
        incident_count_after = db.query(Incident).count()
        all_incident_ids_after = {inc.id for inc in db.query(Incident.id).all()}

        assert incident_count_before == incident_count_after, "Simulation MUST NOT create or delete production incidents!"
        assert all_incident_ids_before == all_incident_ids_after, "Production incident IDs must remain strictly identical!"
        assert sim_id not in all_incident_ids_after, "Simulation ID must never exist in the incidents table!"

        # Verify simulation record exists in simulation_runs and simulation_outputs
        sim_run = db.query(SimulationRun).filter(SimulationRun.id == sim_id).first()
        assert sim_run is not None
        assert sim_run.inputs is not None
        assert sim_run.outputs is not None
    finally:
        db.close()


def test_simulation_calculation_pipeline():
    """
    Verify the multi-domain consequence calculation pipeline:
    Movement, Coastal Landfall, Ecosystem Risk, Risk Engine, Priority, Economic Loss, Response Tactics.
    """
    payload = {
        "name": "Bay of Bengal Hypothetical Spill",
        "notes": "Offshore tanker leak scenario",
        "inputs": {
            "latitude": 13.120,
            "longitude": 80.350,
            "spill_size": 1200.0,
            "spill_size_unit": "BARRELS",
            "oil_type": "HEAVY_CRUDE",
            "wind_speed_kmh": 20.0,
            "wind_direction_deg": 90.0,  # From East -> pushes West towards coastline
            "current_speed_knots": 1.2,
            "current_direction_deg": 270.0,  # Heading West towards coastline
            "duration_hours": 36.0,
        },
        "auto_run": True,
    }

    res = client.post("/api/v1/simulations", json=payload)
    assert res.status_code == 201
    data = res.json()

    assert data["status"] == "COMPLETED"
    assert data["inputs"] is not None
    assert data["outputs"] is not None

    out = data["outputs"]

    # 1. Movement Prediction
    movement = out["predicted_movement"]
    assert movement["drift_speed_kmh"] > 0
    assert movement["total_drift_distance_km"] > 0
    assert len(movement["waypoints"]) > 0
    # Spreading area must expand over time
    first_wp = movement["waypoints"][0]
    last_wp = movement["waypoints"][-1]
    assert last_wp["slick_area_km2"] >= first_wp["slick_area_km2"]
    assert last_wp["uncertainty_radius_km"] >= first_wp["uncertainty_radius_km"]

    # 2. Coastal Impact
    coastal = out["coastal_impact"]
    assert "closest_distance_to_coast_km" in coastal
    assert "threatened_assets" in coastal
    assert isinstance(coastal["threatened_assets"], list)

    # 3. Ecosystem Impact
    eco = out["ecosystem_impact"]
    assert "vulnerability_score" in eco
    assert 0.0 <= eco["vulnerability_score"] <= 100.0
    assert "zones" in eco

    # 4. Risk Assessment
    risk = out["risk"]
    assert 0.0 <= risk["score"] <= 100.0
    assert risk["level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert "factors" in risk
    assert risk["factors"]["spill_volume_score"] > 0

    # 5. Priority
    priority = out["priority"]
    assert 0.0 <= priority["priority_score"] <= 100.0
    assert priority["urgency_tier"] in ["IMMEDIATE", "HIGH", "ELEVATED", "ROUTINE"]

    # 6. Economic Impact
    econ = out["economic_estimate"]
    assert econ["total_expected_usd"] > 0
    assert econ["low_estimate_usd"] < econ["total_expected_usd"] < econ["high_estimate_usd"]
    assert "pillars" in econ
    assert econ["pillars"]["commercial_fisheries_usd"] >= 0
    assert econ["pillars"]["containment_operational_opex_usd"] > 0

    # 7. Response Recommendations
    recs = out["recommendations"]
    assert recs["response_tier"] in ["TIER_1_SMALL", "TIER_2_MEDIUM", "TIER_3_MAJOR"]
    assert recs["containment_boom_meters"] >= 500.0
    assert recs["daily_skimmer_capacity_m3"] > 0
    assert len(recs["tactical_actions"]) >= 3

    # 8. Prominent Disclaimer
    assert "disclaimer" in out
    assert "PROBABILISTIC SCENARIO MODEL" in out["disclaimer"]


def test_oil_type_variance():
    """
    Verify that physical and chemical properties vary by oil type:
    Heavy Crude vs Diesel Refined.
    """
    heavy_payload = {
        "name": "Heavy Crude Run",
        "inputs": {
            "latitude": 13.0,
            "longitude": 80.3,
            "spill_size": 1000.0,
            "spill_size_unit": "BARRELS",
            "oil_type": "HEAVY_CRUDE",
            "duration_hours": 24.0,
        },
        "auto_run": True,
    }
    diesel_payload = {
        "name": "Diesel Run",
        "inputs": {
            "latitude": 13.0,
            "longitude": 80.3,
            "spill_size": 1000.0,
            "spill_size_unit": "BARRELS",
            "oil_type": "DIESEL_REFINED",
            "duration_hours": 24.0,
        },
        "auto_run": True,
    }

    res_heavy = client.post("/api/v1/simulations", json=heavy_payload)
    res_diesel = client.post("/api/v1/simulations", json=diesel_payload)

    assert res_heavy.status_code == 201
    assert res_diesel.status_code == 201

    heavy_data = res_heavy.json()["outputs"]
    diesel_data = res_diesel.json()["outputs"]

    # Heavy crude has much higher persistence hazard than diesel
    heavy_persist = heavy_data["risk"]["factors"]["persistence_hazard_score"]
    diesel_persist = diesel_data["risk"]["factors"]["persistence_hazard_score"]
    assert heavy_persist > diesel_persist

    # Diesel dispersant suitability is False (not recommended for light/refined fuels)
    assert diesel_data["recommendations"]["dispersant_suitable"] is False


def test_invalid_simulation_inputs():
    """Verify input validation rules (negative spill size, invalid lat/lon, invalid duration)."""
    # Negative spill size
    bad_spill = {
        "inputs": {
            "latitude": 13.0,
            "longitude": 80.0,
            "spill_size": -50.0,
            "spill_size_unit": "BARRELS",
        }
    }
    res1 = client.post("/api/v1/simulations", json=bad_spill)
    assert res1.status_code == 422

    # Out of range latitude
    bad_lat = {
        "inputs": {
            "latitude": 120.0,
            "longitude": 80.0,
            "spill_size": 500.0,
        }
    }
    res2 = client.post("/api/v1/simulations", json=bad_lat)
    assert res2.status_code == 422

    # Out of range duration (e.g. 0 hours or > 168 hours)
    bad_duration = {
        "inputs": {
            "latitude": 13.0,
            "longitude": 80.0,
            "spill_size": 500.0,
            "duration_hours": 0.0,
        }
    }
    res3 = client.post("/api/v1/simulations", json=bad_duration)
    assert res3.status_code == 422

    # Invalid oil type
    bad_oil = {
        "inputs": {
            "latitude": 13.0,
            "longitude": 80.0,
            "spill_size": 500.0,
            "oil_type": "UNKNOWN_KEROSENE_GRADE",
        }
    }
    res4 = client.post("/api/v1/simulations", json=bad_oil)
    assert res4.status_code == 422


def test_simulation_lifecycle_and_api_endpoints():
    """Verify list, get by ID, rerun, compare, and delete API endpoints."""
    # 1. Create scenario with auto_run=False
    create_payload = {
        "name": "Deferred Execution Scenario",
        "inputs": {
            "latitude": 13.05,
            "longitude": 80.30,
            "spill_size": 750.0,
            "spill_size_unit": "BARRELS",
            "oil_type": "LIGHT_CRUDE",
            "duration_hours": 24.0,
        },
        "auto_run": False,
    }
    res = client.post("/api/v1/simulations", json=create_payload)
    assert res.status_code == 201
    sim1 = res.json()
    assert sim1["status"] == "CREATED"
    assert sim1["outputs"] is None

    # 2. Trigger run via POST /{id}/run
    res_run = client.post(f"/api/v1/simulations/{sim1['id']}/run")
    assert res_run.status_code == 200
    sim1_ran = res_run.json()
    assert sim1_ran["status"] == "COMPLETED"
    assert sim1_ran["outputs"] is not None

    # 3. Create second scenario for comparison
    sim2_payload = {
        "name": "Second Scenario for Comparison",
        "inputs": {
            "latitude": 13.05,
            "longitude": 80.30,
            "spill_size": 3000.0,
            "spill_size_unit": "BARRELS",
            "oil_type": "BUNKER_FUEL",
            "duration_hours": 24.0,
        },
        "auto_run": True,
    }
    res_sim2 = client.post("/api/v1/simulations", json=sim2_payload)
    assert res_sim2.status_code == 201
    sim2 = res_sim2.json()

    # 4. List simulations
    res_list = client.get("/api/v1/simulations")
    assert res_list.status_code == 200
    list_items = res_list.json()
    assert len(list_items) >= 2

    # 5. Get simulation by ID
    res_get = client.get(f"/api/v1/simulations/{sim1['id']}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == sim1["id"]

    # 6. Compare scenarios via GET /api/v1/simulations/compare
    res_compare = client.get(f"/api/v1/simulations/compare?ids={sim1['id']},{sim2['id']}")
    assert res_compare.status_code == 200
    cmp_data = res_compare.json()
    assert len(cmp_data["scenarios"]) == 2
    assert "delta_summary" in cmp_data
    assert "spill_volume_ratio" in cmp_data["delta_summary"]

    # 7. Delete scenario
    res_del = client.delete(f"/api/v1/simulations/{sim1['id']}")
    assert res_del.status_code == 204

    # Confirm deletion
    res_404 = client.get(f"/api/v1/simulations/{sim1['id']}")
    assert res_404.status_code == 404
