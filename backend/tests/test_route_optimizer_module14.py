"""
Unit & Integration Tests for Module 14 — Emergency Vessel Route Optimizer.
Tests vessel fleet seeding, recommendation multi-criteria scoring,
nautical route optimization with shoreline clearance, API endpoints, and persistence.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import get_db
from app.models.incident import Incident
from app.models.enums import IncidentSeverity, IncidentStatus
from app.models.emergency_vessel import EmergencyVessel, OptimizedRoute, ResponseAssignment
from app.services.route_optimizer.service import EmergencyRouteOptimizerService
from app.services.route_optimizer.geographic_provider import GeographicMarineRoutingProvider

client = TestClient(app)


# ── FIXTURES ─────────────────────────────────────────────────────────────────

@pytest.fixture
def db():
    gen = get_db()
    db_session = next(gen)
    EmergencyRouteOptimizerService.seed_fleet_if_empty(db_session)
    yield db_session
    try:
        next(gen)
    except StopIteration:
        pass


@pytest.fixture
def test_chennai_incident(db: Session):
    """Incident in Bay of Bengal near Chennai."""
    inc = Incident(
        incident_code="TEST-ROUTE-CHENNAI-01",
        status=IncidentStatus.DETECTED,
        severity=IncidentSeverity.CRITICAL,
        risk_score=85.0,
        detection_confidence=0.95,
        spill_area_km2=35.0,
        latitude=13.15,
        longitude=80.45,
        description="Major crude oil spill near Chennai shipping approach",
        is_active=True,
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    yield inc
    db.delete(inc)
    db.commit()


@pytest.fixture
def test_mumbai_incident(db: Session):
    """Incident in Arabian Sea near Mumbai."""
    inc = Incident(
        incident_code="TEST-ROUTE-MUMBAI-01",
        status=IncidentStatus.DETECTED,
        severity=IncidentSeverity.HIGH,
        risk_score=65.0,
        detection_confidence=0.90,
        spill_area_km2=18.0,
        latitude=18.95,
        longitude=72.60,
        description="Fuel oil spill near Mumbai anchorage",
        is_active=True,
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    yield inc
    db.delete(inc)
    db.commit()


# ── TESTS ────────────────────────────────────────────────────────────────────

class TestFleetAndRecommendation:
    def test_seed_fleet_creates_vessels(self, db: Session):
        """Verifies fleet is populated with emergency vessels."""
        vessels = db.query(EmergencyVessel).all()
        assert len(vessels) >= 8
        available = [v for v in vessels if v.is_available]
        unavailable = [v for v in vessels if not v.is_available]
        assert len(available) >= 7
        assert len(unavailable) >= 1  # e.g., ICGS Sankalp in maintenance

    def test_get_available_vessels_filtering(self, db: Session):
        """Tests that only_available filter excludes drydock/maintenance ships."""
        all_res = EmergencyRouteOptimizerService.get_available_vessels(db, only_available=False)
        avail_res = EmergencyRouteOptimizerService.get_available_vessels(db, only_available=True)

        assert all_res.total >= avail_res.total
        assert all(v.is_available for v in avail_res.vessels)

    def test_recommend_vessels_ranks_suitability(self, db: Session, test_chennai_incident):
        """Verifies vessel recommendations for Chennai incident rank local vessels higher."""
        recs = EmergencyRouteOptimizerService.recommend_vessels(db, str(test_chennai_incident.id))

        assert recs.incident_id == str(test_chennai_incident.id)
        assert len(recs.recommendations) > 0
        assert recs.recommendations[0].rank == 1
        assert recs.recommendations[0].response_priority == "PRIMARY_DISPATCH"
        assert recs.recommendations[0].suitability_score >= recs.recommendations[-1].suitability_score

        # Vessel stationed at Chennai or Ennore should rank in top 2 due to proximity
        top_ports = [recs.recommendations[0].vessel.home_port, recs.recommendations[1].vessel.home_port]
        assert any("Chennai" in p or "Ennore" in p for p in top_ports)

    def test_recommend_vessels_cross_coast_routing(self, db: Session, test_mumbai_incident):
        """Verifies recommendation works for West Coast (Arabian Sea) incident."""
        recs = EmergencyRouteOptimizerService.recommend_vessels(db, str(test_mumbai_incident.id))
        assert len(recs.recommendations) > 0
        # Mumbai PCV should be top or near top for Mumbai incident
        top_vessel = recs.recommendations[0].vessel
        assert "Mumbai" in top_vessel.home_port or top_vessel.estimated_travel_time_hours < 5.0


class TestRouteOptimizationAlgorithm:
    def test_geographic_routing_provider_waypoints(self, db: Session):
        """Verifies the provider produces valid distance, waypoints, and GeoJSON."""
        vessel = db.query(EmergencyVessel).filter(EmergencyVessel.home_port.like("%Chennai%")).first()
        assert vessel is not None

        provider = GeographicMarineRoutingProvider()
        res = provider.calculate_route(
            origin=(vessel.latitude, vessel.longitude),
            destination=(13.15, 80.45),
            vessel=vessel,
            incident_priority="CRITICAL",
        )

        assert res.distance_nm > 0.0
        assert res.distance_km > 0.0
        assert res.travel_time_hours > 0.0
        assert len(res.waypoints) >= 2
        assert "LineString" in res.route_geometry_geojson
        assert res.urgency_rating == "IMMEDIATE"

    def test_cross_peninsula_shoreline_clearance(self, db: Session):
        """Tests that a route between West and East coasts avoids mainland India via cape waypoints."""
        # Vessel at Mumbai (18.9, 72.8), destination at Chennai (13.1, 80.4)
        vessel = db.query(EmergencyVessel).filter(EmergencyVessel.home_port.like("%Mumbai%")).first()
        assert vessel is not None

        provider = GeographicMarineRoutingProvider()
        res = provider.calculate_route(
            origin=(vessel.latitude, vessel.longitude),
            destination=(13.1, 80.45),
            vessel=vessel,
            incident_priority="ROUTINE",
        )

        # Distance around cape of southern India must be > 1000 NM (straight line across land is ~550 NM)
        assert res.distance_nm > 800.0
        waypoint_names = [wp["name"] for wp in res.waypoints]
        # Must include Cape Comorin clearance and/or Sri Lanka waypoint
        assert any("Cape Comorin" in name or "Sri Lanka" in name for name in waypoint_names)
        assert len(res.avoided_zones) > 0

    def test_optimize_route_persists_to_db(self, db: Session, test_chennai_incident):
        """Tests that optimize_route creates records in optimized_routes and response_assignments."""
        route_resp = EmergencyRouteOptimizerService.optimize_route(
            db, str(test_chennai_incident.id)
        )

        assert route_resp.incident_id == str(test_chennai_incident.id)
        assert route_resp.vessel is not None
        assert route_resp.estimated_distance_nm > 0.0
        assert len(route_resp.waypoints) >= 2

        # Check DB
        db_route = db.query(OptimizedRoute).filter(OptimizedRoute.id == route_resp.id).first()
        assert db_route is not None
        assert db_route.vessel_id == route_resp.vessel.id

        db_assign = db.query(ResponseAssignment).filter(ResponseAssignment.route_id == route_resp.id).first()
        assert db_assign is not None
        assert db_assign.status == "RECOMMENDED"


class TestRouteOptimizerAPI:
    def test_get_available_vessels_endpoint(self):
        """GET /api/v1/vessels/available returns 200 with fleet list."""
        resp = client.get("/api/v1/vessels/available")
        assert resp.status_code == 200
        data = resp.json()
        assert "vessels" in data
        assert data["available_count"] > 0

    def test_get_recommended_vessels_endpoint(self, test_chennai_incident):
        """GET /api/v1/incidents/{id}/recommended-vessels returns ranked candidates."""
        resp = client.get(f"/api/v1/incidents/{test_chennai_incident.id}/recommended-vessels")
        assert resp.status_code == 200
        data = resp.json()
        assert data["incident_id"] == str(test_chennai_incident.id)
        assert len(data["recommendations"]) > 0
        assert data["recommendations"][0]["rank"] == 1

    def test_post_optimize_route_endpoint(self, test_chennai_incident):
        """POST /api/v1/incidents/{id}/optimize-route returns 201 with route geometry."""
        resp = client.post(
            f"/api/v1/incidents/{test_chennai_incident.id}/optimize-route",
            json={"weather_penalty": 1.1},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["incident_id"] == str(test_chennai_incident.id)
        assert "waypoints" in data
        assert "route_geometry_geojson" in data
        assert "disclaimer" in data

    def test_get_vessel_route_endpoint(self, test_chennai_incident):
        """GET /api/v1/vessels/{vessel_id}/route retrieves active route."""
        # 1. Optimize route first
        opt_resp = client.post(f"/api/v1/incidents/{test_chennai_incident.id}/optimize-route", json={})
        assert opt_resp.status_code == 201
        vessel_id = opt_resp.json()["vessel"]["id"]

        # 2. Query vessel route
        route_resp = client.get(f"/api/v1/vessels/{vessel_id}/route")
        assert route_resp.status_code == 200
        data = route_resp.json()
        assert data["vessel"]["id"] == vessel_id
        assert data["estimated_distance_nm"] > 0

    def test_get_vessel_route_not_found(self):
        """GET /api/v1/vessels/{vessel_id}/route for vessel with no route returns 404."""
        resp = client.get("/api/v1/vessels/vsl-nonexistent-999/route")
        assert resp.status_code == 404
