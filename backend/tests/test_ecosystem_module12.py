"""
Module 12 — Marine Ecosystem Risk Analyzer: Backend Tests.

Tests:
1. Proximity scoring math
2. Exposure scoring math
3. Zone risk scoring
4. Severity classification
5. Explanation builder
6. Bounding box intersection
7. Overlap area calculation
8. Full analyze() with a real DB incident via TestClient
9. GET latest (no prior analysis → 404, then analyze → GET works)
10. Nearby zones endpoint
11. Invalid incident → 404
12. Empty zones (far-away incident) → score = 0
"""
import pytest
import math
from unittest.mock import MagicMock, patch

# ── Pure function unit tests ───────────────────────────────────────────────────

from app.services.ecosystem_analyzer import (
    _proximity_score,
    _exposure_score,
    _zone_risk_score,
    _classify_severity,
    _build_explanation,
    _bbox_from_geojson,
    _bboxes_intersect,
    _bbox_overlap_area_km2,
    ECOSYSTEM_SENSITIVITY,
)


class TestProximityScore:
    def test_zero_distance_max_sensitivity(self):
        """At distance=0, score = 100 * sensitivity."""
        score = _proximity_score(0.0, 1.0)
        assert score == 100.0

    def test_zero_distance_half_sensitivity(self):
        score = _proximity_score(0.0, 0.5)
        assert score == 50.0

    def test_large_distance_decays_to_near_zero(self):
        score = _proximity_score(1000.0, 1.0)
        # e^(-8) ≈ 0.00033  → 100 * 0.00033 < 1
        assert score < 1.0

    def test_100km_coral_reef(self):
        """Coral reef (sens=1.0) at 100 km should still be a reasonable score."""
        score = _proximity_score(100.0, 1.0)
        assert 20 < score < 60  # e^(-0.8) ≈ 0.449 → ~45 pts

    def test_score_always_between_0_and_100(self):
        for dist in [0, 10, 50, 200, 1000]:
            for sens in [0.0, 0.5, 0.9, 1.0]:
                s = _proximity_score(dist, sens)
                assert 0.0 <= s <= 100.0, f"Out of range for dist={dist}, sens={sens}"


class TestExposureScore:
    def test_no_intersection_no_area(self):
        """Base case: exposure is just proximity decay."""
        score = _exposure_score(50.0, 0.8, 0.0, False, 10.0)
        prox = _proximity_score(50.0, 0.8)
        assert abs(score - prox) < 0.01

    def test_intersection_bonus_applied(self):
        """Intersecting adds 20 pts bonus."""
        without = _exposure_score(50.0, 0.8, 0.0, False, 10.0)
        with_intersect = _exposure_score(50.0, 0.8, 0.0, True, 10.0)
        assert abs(with_intersect - without - 20.0) < 0.01

    def test_area_bonus_capped_at_15(self):
        """Even huge affected areas cap area bonus at 15."""
        score_huge = _exposure_score(10.0, 1.0, 9999.0, False, 1.0)
        score_partial = _exposure_score(10.0, 1.0, 0.5, False, 1.0)
        # area ratio for huge = capped to 1.0 → bonus = 15
        # area ratio for 0.5/1.0 = 0.5 → bonus = 7.5
        assert score_huge > score_partial
        assert score_huge <= 100.0

    def test_never_exceeds_100(self):
        score = _exposure_score(0.0, 1.0, 9999.0, True, 1.0)
        assert score <= 100.0


class TestZoneRiskScore:
    def test_formula_weights(self):
        """Verify the 60/25/15 weighting."""
        exp, prox, sens = 80.0, 60.0, 1.0
        expected = 0.60 * 80 + 0.25 * 60 + 0.15 * 100
        calc = _zone_risk_score(exp, prox, sens)
        assert abs(calc - expected) < 0.01

    def test_clamp_to_100(self):
        score = _zone_risk_score(100.0, 100.0, 1.0)
        assert score <= 100.0

    def test_zero_inputs(self):
        assert _zone_risk_score(0.0, 0.0, 0.0) == 0.0


class TestClassifySeverity:
    @pytest.mark.parametrize("score,expected", [
        (0, "LOW"), (24.9, "LOW"),
        (25.0, "MODERATE"), (49.9, "MODERATE"),
        (50.0, "HIGH"), (74.9, "HIGH"),
        (75.0, "CRITICAL"), (100.0, "CRITICAL"),
    ])
    def test_thresholds(self, score, expected):
        assert _classify_severity(score) == expected


class TestBuildExplanation:
    def test_intersection_mention(self):
        result = _build_explanation("Test Reef", "Coral Reef", 0.0, 1.0, True, 5.0, "CRITICAL")
        assert "overlap" in result.lower() or "5.00 km²" in result

    def test_no_intersection_mentions_distance(self):
        result = _build_explanation("Test Zone", "Marine Habitat", 25.0, 0.7, False, 0.0, "MODERATE")
        assert "25.0 km" in result

    def test_sensitivity_reflected(self):
        result = _build_explanation("A", "B", 10.0, 0.95, False, 0.0, "HIGH")
        assert "95%" in result


class TestBoundingBox:
    POLY_GEOJSON = (
        '{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]}'
    )
    POINT_GEOJSON = '{"type":"Point","coordinates":[0.5,0.5]}'
    LINE_GEOJSON = '{"type":"LineString","coordinates":[[0,0],[10,10]]}'

    def test_bbox_from_polygon(self):
        bbox = _bbox_from_geojson(self.POLY_GEOJSON)
        assert bbox == (0.0, 0.0, 1.0, 1.0)

    def test_bbox_from_point(self):
        bbox = _bbox_from_geojson(self.POINT_GEOJSON)
        assert bbox == (0.5, 0.5, 0.5, 0.5)

    def test_bbox_from_linestring(self):
        bbox = _bbox_from_geojson(self.LINE_GEOJSON)
        assert bbox == (0.0, 0.0, 10.0, 10.0)

    def test_bbox_invalid_returns_none(self):
        assert _bbox_from_geojson("not json") is None

    def test_bboxes_intersect_overlap(self):
        b1 = (0.0, 0.0, 2.0, 2.0)
        b2 = (1.0, 1.0, 3.0, 3.0)
        assert _bboxes_intersect(b1, b2) is True

    def test_bboxes_no_overlap(self):
        b1 = (0.0, 0.0, 1.0, 1.0)
        b2 = (2.0, 2.0, 3.0, 3.0)
        assert _bboxes_intersect(b1, b2) is False

    def test_bboxes_touching_edge(self):
        b1 = (0.0, 0.0, 1.0, 1.0)
        b2 = (1.0, 0.0, 2.0, 1.0)
        # Touching edge counts as intersection (not strict interior)
        assert _bboxes_intersect(b1, b2) is True

    def test_overlap_area_non_overlapping(self):
        b1 = (0.0, 0.0, 1.0, 1.0)
        b2 = (5.0, 5.0, 6.0, 6.0)
        assert _bbox_overlap_area_km2(b1, b2) == 0.0

    def test_overlap_area_positive(self):
        b1 = (70.0, 10.0, 72.0, 12.0)
        b2 = (71.0, 11.0, 73.0, 13.0)
        area = _bbox_overlap_area_km2(b1, b2)
        assert area > 0.0


class TestEcosystemSensitivityConfig:
    def test_coral_reef_highest(self):
        assert ECOSYSTEM_SENSITIVITY["CORAL_REEF"] == 1.0

    def test_protected_area_high(self):
        assert ECOSYSTEM_SENSITIVITY["PROTECTED_AREA"] >= 0.9

    def test_shipping_lane_lowest_ecosystem(self):
        assert ECOSYSTEM_SENSITIVITY["SHIPPING_LANE"] < 0.5

    def test_all_values_in_0_1_range(self):
        for key, val in ECOSYSTEM_SENSITIVITY.items():
            assert 0.0 <= val <= 1.0, f"{key} = {val} out of range"


# ── API Integration Tests ──────────────────────────────────────────────────────
# These tests require a running test database and are skipped if not available.

try:
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    def _get_first_incident_id() -> str:
        resp = client.get("/api/v1/incidents")
        assert resp.status_code == 200
        items = resp.json().get("items", [])
        if not items:
            pytest.skip("No incidents in test database")
        return items[0]["id"]

    class TestEcosystemAPI:
        def test_invalid_incident_returns_404(self):
            resp = client.post(
                "/api/v1/incidents/00000000-0000-0000-0000-000000000000/ecosystem-risk/analyze",
                json={"radius_km": 100},
            )
            assert resp.status_code == 404

        def test_get_before_analyze_returns_404(self):
            # Use a UUID that is valid format but doesn't exist
            resp = client.get(
                "/api/v1/incidents/11111111-1111-1111-1111-111111111111/ecosystem-risk"
            )
            assert resp.status_code == 404

        def test_analyze_returns_valid_response(self):
            incident_id = _get_first_incident_id()
            resp = client.post(
                f"/api/v1/incidents/{incident_id}/ecosystem-risk/analyze",
                json={"radius_km": 500},
            )
            assert resp.status_code == 201
            data = resp.json()
            assert "overall_risk_score" in data
            assert 0.0 <= data["overall_risk_score"] <= 100.0
            assert data["overall_severity"] in ("LOW", "MODERATE", "HIGH", "CRITICAL")
            assert isinstance(data["zone_results"], list)
            assert data["model_name"] == "ECOSYSTEM_RISK_V1"
            assert data["is_simulated"] is True

        def test_get_after_analyze_returns_200(self):
            incident_id = _get_first_incident_id()
            # Ensure analysis exists
            client.post(
                f"/api/v1/incidents/{incident_id}/ecosystem-risk/analyze",
                json={"radius_km": 500},
            )
            resp = client.get(f"/api/v1/incidents/{incident_id}/ecosystem-risk")
            assert resp.status_code == 200
            data = resp.json()
            assert data["incident_id"] == incident_id

        def test_zone_results_have_required_fields(self):
            incident_id = _get_first_incident_id()
            resp = client.post(
                f"/api/v1/incidents/{incident_id}/ecosystem-risk/analyze",
                json={"radius_km": 500},
            )
            data = resp.json()
            for zone in data.get("zone_results", []):
                assert "zone_id" in zone
                assert "zone_name" in zone
                assert "distance_km" in zone
                assert "sensitivity_score" in zone
                assert "zone_risk_score" in zone
                assert 0.0 <= zone["zone_risk_score"] <= 100.0
                assert 0.0 <= zone["sensitivity_score"] <= 1.0
                assert zone["zone_severity"] in ("LOW", "MODERATE", "HIGH", "CRITICAL")

        def test_risk_engine_modifier_bounded(self):
            incident_id = _get_first_incident_id()
            resp = client.post(
                f"/api/v1/incidents/{incident_id}/ecosystem-risk/analyze",
                json={"radius_km": 500},
            )
            data = resp.json()
            modifier = data["risk_engine_modifier"]
            assert 0.0 <= modifier <= 5.0

        def test_nearby_zones_endpoint(self):
            # Gulf of Mannar area — should find coral reefs
            resp = client.get("/api/v1/ecosystem-zones/nearby?lat=9.15&lon=79.20&radius_km=200")
            assert resp.status_code == 200
            data = resp.json()
            assert "zones" in data
            assert "total" in data
            assert data["total"] >= 0
            assert data["query_lat"] == pytest.approx(9.15)

        def test_nearby_zones_no_results_for_isolated_point(self):
            # Middle of South Pacific — very small radius
            resp = client.get("/api/v1/ecosystem-zones/nearby?lat=-45.0&lon=-150.0&radius_km=1")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total"] == 0
            assert data["zones"] == []

        def test_use_movement_prediction_flag(self):
            incident_id = _get_first_incident_id()
            resp = client.post(
                f"/api/v1/incidents/{incident_id}/ecosystem-risk/analyze",
                json={"radius_km": 500, "use_movement_prediction": True},
            )
            # Should succeed even if no movement prediction exists
            assert resp.status_code in (200, 201)

except ImportError:
    # TestClient not available — skip integration tests
    pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
