"""
Unit and integration tests for AI Oil Spill Detection Module.
Verifies:
  - DetectionModel and DemoDetector deterministic inference
  - File format validation (rejects invalid extensions)
  - Detection success (spill detected -> Incident created)
  - Negative detection (clean ocean -> no incident created)
  - Low confidence detection (potential_false_positive flagged)
  - Database persistence of DetectionResult
"""
import io
from fastapi.testclient import TestClient
from app.main import app
from app.ml.detection.demo_detector import DemoDetector

client = TestClient(app)


def test_demo_detector_deterministic():
    """Verify demo detector produces deterministic outputs for presets."""
    detector = DemoDetector()
    res1 = detector.predict(b"dummy", "slick.png", 10.85, 79.90, demo_preset="sentinel_sar_slick")
    res2 = detector.predict(b"dummy", "slick.png", 10.85, 79.90, demo_preset="sentinel_sar_slick")

    assert res1.detected is True
    assert res1.confidence == 0.942
    assert res1.spill_area_km2 == 67.4
    assert res1.potential_false_positive is False
    assert res1.confidence == res2.confidence
    assert res1.spill_area_km2 == res2.spill_area_km2


def test_api_detection_success():
    """Test POST /api/v1/detection/analyze with positive detection."""
    res = client.post(
        "/api/v1/detection/analyze",
        data={
            "demo_preset": "sentinel_sar_slick",
            "latitude": 10.85,
            "longitude": 79.90,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["detected"] is True
    assert data["confidence"] == 0.942
    assert data["spill_area_km2"] == 67.4
    assert "DEMO MODEL" in data["model_name"]
    assert data["incident_id"] is not None
    assert data["incident_code"].startswith("DET-")
    assert data["severity"] in ("CRITICAL", "HIGH", "MODERATE", "LOW")
    assert data["risk_score"] > 0.0


def test_api_detection_negative_control():
    """Test POST /api/v1/detection/analyze with clean ocean surface."""
    res = client.post(
        "/api/v1/detection/analyze",
        data={
            "demo_preset": "clean_ocean_water",
            "latitude": 15.0,
            "longitude": 72.0,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["detected"] is False
    assert data["spill_area_km2"] == 0.0
    assert data["incident_id"] is None
    assert data["incident_code"] is None


def test_api_detection_low_confidence_flag():
    """Test that confidence < 0.70 flags potential false positive."""
    res = client.post(
        "/api/v1/detection/analyze",
        data={
            "demo_preset": "low_confidence_sheen",
            "latitude": 15.4,
            "longitude": 73.8,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["detected"] is True
    assert data["confidence"] < 0.70
    assert data["potential_false_positive"] is True


def test_api_reject_invalid_file_extension():
    """Test that non-image file uploads are rejected with 400 Bad Request."""
    file_bytes = io.BytesIO(b"not an image file")
    files = {"image": ("test.pdf", file_bytes, "application/pdf")}
    res = client.post(
        "/api/v1/detection/analyze",
        files=files,
        data={"latitude": 10.0, "longitude": 80.0},
    )
    assert res.status_code == 400
    assert "Unsupported image format" in res.json()["detail"]


def test_api_valid_png_file_upload():
    """Test actual image file upload parsing and inference."""
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new("RGB", (64, 64), color=(20, 30, 40))
    img.save(buf, format="PNG")
    buf.seek(0)

    files = {"image": ("satellite_test.png", buf, "image/png")}
    res = client.post(
        "/api/v1/detection/analyze",
        files=files,
        data={"latitude": 12.5, "longitude": 80.2},
    )
    assert res.status_code == 200
    data = res.json()
    assert "detected" in data
    assert "confidence" in data
    assert data["confidence"] < 1.0  # Never claims 100%
    assert data["processing_time_ms"] > 0
    assert data["detection_id"] is not None
