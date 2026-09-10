"""
Tests for GIS and Interactive Map endpoints — Module 5.
Verifies:
  - GET /api/v1/map/incidents
  - GET /api/v1/map/layers
  - GET /api/v1/incidents/{id}/nearby-zones
  - Haversine geodesic distance calculation
  - Proximity radius filtering
"""
from fastapi.testclient import TestClient
from app.main import app
from app.gis.spatial_service import haversine_km

client = TestClient(app)


def test_haversine_formula():
    """Verify haversine distance calculation between known coordinates."""
    # Distance between Mumbai (18.94, 72.84) and Chennai (13.08, 80.27) ~ 1030 km
    dist = haversine_km(18.94, 72.84, 13.08, 80.27)
    assert 1000 <= dist <= 1060


def test_get_map_incidents():
    """Test /api/v1/map/incidents returns incidents with coordinates and geometries."""
    res = client.get("/api/v1/map/incidents")
    assert res.status_code == 200
    data = res.json()
    assert "incidents" in data
    assert "total" in data
    assert data["total"] > 0
    first = data["incidents"][0]
    assert "id" in first
    assert "incident_code" in first
    assert "severity" in first
    assert "latitude" in first
    assert "longitude" in first


def test_get_map_layers():
    """Test /api/v1/map/layers returns all required GIS layers."""
    res = client.get("/api/v1/map/layers")
    assert res.status_code == 200
    data = res.json()
    assert "incidents" in data
    assert "protected_areas" in data
    assert "fishing_zones" in data
    assert "ports" in data
    assert "shipping_lanes" in data
    assert "coastline" in data
    assert data["is_demo_data"] is True
    assert len(data["ports"]) > 0
    assert len(data["shipping_lanes"]) > 0


def test_incident_nearby_zones():
    """Test spatial proximity analysis for a seeded incident."""
    # Fetch an incident first
    list_res = client.get("/api/v1/incidents?page_size=1")
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) > 0
    inc_id = items[0]["id"]

    # Query nearby zones with radius_km = 500
    res = client.get(f"/api/v1/incidents/{inc_id}/nearby-zones?radius_km=500")
    assert res.status_code == 200
    data = res.json()
    assert data["incident_id"] == inc_id
    assert data["radius_km"] == 500.0
    assert "zones" in data
    assert "total_nearby" in data

    # Verify each zone has distance and sensitivity
    for z in data["zones"]:
        assert z["distance_km"] <= 500.0
        assert "zone_type" in z
        assert "sensitivity" in z
        assert "name" in z


def test_nearby_zones_radius_filtering():
    """Test that smaller radius returns fewer or equal zones than larger radius."""
    list_res = client.get("/api/v1/incidents?page_size=1")
    inc_id = list_res.json()["items"][0]["id"]

    res_small = client.get(f"/api/v1/incidents/{inc_id}/nearby-zones?radius_km=25")
    assert res_small.status_code == 200
    count_small = res_small.json()["total_nearby"]

    res_large = client.get(f"/api/v1/incidents/{inc_id}/nearby-zones?radius_km=500")
    assert res_large.status_code == 200
    count_large = res_large.json()["total_nearby"]

    assert count_small <= count_large
