"""
Automated unit & integration tests for Module 21: Economic Damage Estimator.
Tests:
  - Transparent 6-category economic loss modeling
  - Default baseline assumptions seeding and updating
  - Custom assumption overrides on per-calculation basis
  - Currency formatting (Indian numbering ₹ Cr / ₹ Lakh, USD $M / $K)
  - Integration with Coastal Impact, Marine Ecosystem Risk, and Movement Prediction
  - Statutory advisory and non-official government loss labeling
  - REST API endpoints (POST calculate, GET latest, GET history, GET/PUT assumptions)
"""
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models.incident import Incident
from app.models.enums import IncidentSeverity, IncidentStatus
from app.models.coastal_impact import CoastalImpactPrediction
from app.models.ecosystem_risk import EcosystemRiskAssessment
from app.models.economic_impact import EconomicAssumption, EconomicAssessment

# Ensure tables exist
Base.metadata.create_all(bind=engine)

client = TestClient(app)


@pytest.fixture
def test_incident():
    """Create a temporary test incident."""
    db = SessionLocal()
    inc = Incident(
        incident_code=f"INC-ECON-{uuid.uuid4().hex[:8].upper()}",
        description="Cargo vessel crude spill for economic modeling verification",
        latitude=13.0827,
        longitude=80.2707,
        spill_area_km2=2.5,
        severity=IncidentSeverity.HIGH,
        status=IncidentStatus.DETECTED,
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
        db.query(EconomicAssessment).filter(EconomicAssessment.incident_id == inc_id).delete()
        db.query(CoastalImpactPrediction).filter(CoastalImpactPrediction.incident_id == inc_id).delete()
        del_inc = db.query(Incident).filter(Incident.id == inc_id).first()
        if del_inc:
            db.delete(del_inc)
        db.commit()
    finally:
        db.close()


def test_baseline_assumptions_api():
    """Verify default assumptions profile retrieval and updates."""
    # 1. GET baseline assumptions
    res = client.get("/api/v1/economic-impact/assumptions")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "INDIAN_OCEAN_COASTAL_BASELINE"
    assert data["currency"] == "INR"
    assert data["cleanup_cost_per_km2"] > 0
    assert data["fisheries_daily_value_per_km2"] > 0

    # 2. PUT update baseline assumption
    update_payload = {
        "name": "INDIAN_OCEAN_COASTAL_BASELINE",
        "currency": "INR",
        "exchange_rate_usd_to_inr": 84.0,
        "cleanup_cost_per_km2": 1600000.0,
        "shoreline_cleanup_per_km": 4800000.0,
        "fisheries_daily_value_per_km2": 98000.0,
        "fisheries_recovery_days_default": 35.0,
        "tourism_daily_value_per_km": 260000.0,
        "tourism_disruption_days_default": 25.0,
        "business_daily_loss_per_km": 130000.0,
        "business_disruption_days_default": 15.0,
        "infrastructure_daily_loss_per_facility": 3600000.0,
        "infrastructure_disruption_days_default": 8.0,
        "other_ecosystem_remediation_per_point": 1300000.0,
        "notes": "Updated baseline test parameter",
    }
    res_put = client.put("/api/v1/economic-impact/assumptions", json=update_payload)
    assert res_put.status_code == 200
    updated_data = res_put.json()
    assert updated_data["cleanup_cost_per_km2"] == 1600000.0
    assert updated_data["exchange_rate_usd_to_inr"] == 84.0


def test_calculate_economic_impact_math_and_categories(test_incident):
    """
    Verify transparent mathematical calculation across all 6 categories:
    Cleanup, Fisheries, Tourism, Business, Infrastructure, Other Modeled.
    """
    res = client.post(f"/api/v1/incidents/{test_incident}/economic-impact")
    assert res.status_code == 201
    data = res.json()

    assert data["incident_id"] == test_incident
    assert data["currency"] == "INR"
    assert data["total_estimated_amount"] > 0
    assert "₹" in data["total_formatted"]
    assert data["confidence"] >= 0.60
    assert "MODEL ESTIMATE — NOT AN OFFICIAL GOVERNMENT ECONOMIC ASSESSMENT" in data["disclaimer"]

    # Verify 6 categories exist
    cats = data["categories"]
    assert len(cats) == 6
    cat_keys = {c["category"] for c in cats}
    expected_keys = {
        "CLEANUP",
        "FISHERIES",
        "TOURISM",
        "COASTAL_BUSINESS",
        "INFRASTRUCTURE",
        "OTHER_MODELED",
    }
    assert cat_keys == expected_keys

    # Check that sum of category amounts matches total
    sum_cats = sum(c["estimated_amount"] for c in cats)
    assert round(sum_cats, 0) == round(data["total_estimated_amount"], 0)

    # Check each category formula
    for c in cats:
        assert c["calculation_formula"] != ""
        assert c["formatted_amount"].startswith("₹")
        assert c["confidence"] == data["confidence"]


def test_currency_formatting_indian_and_usd(test_incident):
    """Verify Indian currency units (Cr / Lakh) and USD conversion."""
    # 1. Calculate in INR
    res_inr = client.post(
        f"/api/v1/incidents/{test_incident}/economic-impact",
        json={"currency": "INR"},
    )
    assert res_inr.status_code == 201
    data_inr = res_inr.json()
    assert data_inr["currency"] == "INR"
    # Should use Cr or Lakh
    assert "Cr" in data_inr["total_formatted"] or "Lakh" in data_inr["total_formatted"]
    assert data_inr["total_formatted"].startswith("₹")

    # 2. Calculate in USD
    res_usd = client.post(
        f"/api/v1/incidents/{test_incident}/economic-impact",
        json={"currency": "USD"},
    )
    assert res_usd.status_code == 201
    data_usd = res_usd.json()
    assert data_usd["currency"] == "USD"
    assert data_usd["total_formatted"].startswith("$")
    assert data_usd["total_estimated_amount"] < data_inr["total_estimated_amount"]

    # Ratio should correspond to exchange rate (~83-84)
    ratio = data_inr["total_estimated_amount"] / data_usd["total_estimated_amount"]
    assert 80.0 <= ratio <= 86.0


def test_custom_assumptions_override(test_incident):
    """Verify that operator can pass custom unit costs and recovery days."""
    custom_overrides = {
        "cleanup_cost_per_km2": 3000000.0,  # Doubled unit cost
        "fisheries_recovery_days_default": 60.0,
    }
    res = client.post(
        f"/api/v1/incidents/{test_incident}/economic-impact",
        json={
            "currency": "INR",
            "custom_assumptions": custom_overrides,
        },
    )
    assert res.status_code == 201
    data = res.json()

    # Find cleanup category
    cleanup_cat = next(c for c in data["categories"] if c["category"] == "CLEANUP")
    assert "₹30.0 Lakh/km²" in cleanup_cat["calculation_formula"] or "3,000,000" in cleanup_cat["calculation_formula"]

    # Verify assumptions snapshot is recorded
    assert data["assumptions_used"]["cleanup_cost_per_km2"] == 3000000.0
    assert data["assumptions_used"]["fisheries_recovery_days_default"] == 60.0


def test_integration_with_coastal_and_ecosystem_modules(test_incident):
    """
    Verify that coastal predictions (threatened ports and beaches)
    scale up tourism and infrastructure impact figures.
    """
    db = SessionLocal()
    # Add coastal target predictions
    pred_beach = CoastalImpactPrediction(
        incident_id=test_incident,
        target_location="Marina Beach",
        target_type="BEACH",
        latitude=13.05,
        longitude=80.28,
        distance_km=1.2,
        estimated_hours_to_impact=4.0,
        predicted_impact_time=datetime.now(timezone.utc),
        impact_horizon="6H",
        severity="HIGH",
    )
    pred_port = CoastalImpactPrediction(
        incident_id=test_incident,
        target_location="Chennai Commercial Port",
        target_type="PORT",
        latitude=13.09,
        longitude=80.30,
        distance_km=2.5,
        estimated_hours_to_impact=8.0,
        predicted_impact_time=datetime.now(timezone.utc),
        impact_horizon="12H",
        severity="CRITICAL",
    )
    db.add(pred_beach)
    db.add(pred_port)
    db.commit()
    db.close()

    res = client.post(f"/api/v1/incidents/{test_incident}/economic-impact")
    assert res.status_code == 201
    data = res.json()

    cats = {c["category"]: c for c in data["categories"]}
    # Tourism loss should now account for the beach
    assert cats["TOURISM"]["estimated_amount"] > 0
    # Infrastructure loss should now account for the port
    assert cats["INFRASTRUCTURE"]["estimated_amount"] > 0
    assert "1 commercial port" in cats["INFRASTRUCTURE"]["calculation_formula"]


def test_get_latest_and_history_endpoints(test_incident):
    """Verify GET latest and historical assessment listings."""
    # Trigger 2 assessments
    client.post(f"/api/v1/incidents/{test_incident}/economic-impact")
    client.post(f"/api/v1/incidents/{test_incident}/economic-impact")

    # GET latest
    res_latest = client.get(f"/api/v1/incidents/{test_incident}/economic-impact")
    assert res_latest.status_code == 200
    assert res_latest.json()["incident_id"] == test_incident

    # GET history
    res_hist = client.get(f"/api/v1/incidents/{test_incident}/economic-impact/history")
    assert res_hist.status_code == 200
    history = res_hist.json()
    assert len(history) >= 2
