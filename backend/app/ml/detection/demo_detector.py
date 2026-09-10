"""
Deterministic DEMO oil spill detector.
Produces strictly deterministic results based on selected demo preset or image hash.
Clearly labeled as DEMO MODEL and never claims 100% confidence.
"""
from __future__ import annotations
import io
import time
import json
import base64
import hashlib
from typing import Optional

from PIL import Image, ImageDraw
import numpy as np

from app.ml.detection.base import DetectionModel, DetectionOutput

MODEL_NAME = "DEMO-SAR-UNET-V1 (DEMO MODEL)"
FALSE_POSITIVE_THRESHOLD = 0.70  # Below 70% is flagged as potential false positive


def _generate_spill_polygon(lat: float, lon: float, scale: float = 0.04) -> str:
    """Generate a realistic simulated multi-vertex spill polygon centered at coordinates."""
    # Irregular polygon offsets
    offsets = [
        (-0.8, -0.6), (-0.4, -1.0), (0.2, -0.9), (0.8, -0.5),
        (1.1, -0.1), (0.9, 0.6), (0.5, 1.0), (0.0, 1.2),
        (-0.6, 0.8), (-1.0, 0.3), (-0.9, -0.2), (-0.8, -0.6)
    ]
    coords = [
        [round(lon + dx * scale, 5), round(lat + dy * scale, 5)]
        for dx, dy in offsets
    ]
    return json.dumps({
        "type": "MultiPolygon",
        "coordinates": [[coords]]
    })


def _create_visual_mask_base64(width: int = 400, height: int = 400, detected: bool = True, seed: int = 42) -> Optional[str]:
    """Create a semi-transparent colored segmentation mask overlay image encoded as base64."""
    if not detected:
        return None

    # Create RGBA canvas
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    np.random.seed(seed)
    cx, cy = width // 2, height // 2
    r = min(width, height) // 3

    # Generate organic spill contour points
    num_pts = 16
    angles = np.linspace(0, 2 * np.pi, num_pts, endpoint=False)
    radii = r * (0.65 + 0.35 * np.sin(angles * 2) + 0.15 * np.cos(angles * 3))
    pts = [(cx + int(radii[i] * np.cos(angles[i])), cy + int(radii[i] * np.sin(angles[i]))) for i in range(num_pts)]

    # Draw semi-transparent neon crimson spill mask with glowing outline
    draw.polygon(pts, fill=(239, 68, 68, 140), outline=(255, 100, 100, 240), width=3)

    # Add secondary smaller slick patch
    cx2, cy2 = cx + int(r * 0.7), cy - int(r * 0.4)
    pts2 = [(cx2 + int(radii[i] * 0.35 * np.cos(angles[i])), cy2 + int(radii[i] * 0.35 * np.sin(angles[i]))) for i in range(num_pts)]
    draw.polygon(pts2, fill=(249, 115, 22, 130), outline=(255, 160, 50, 220), width=2)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


class DemoDetector(DetectionModel):
    """
    Deterministic oil spill detector for simulation, testing, and SIH evaluation.
    Guarantees deterministic results — no random fluctuations.
    """

    def is_available(self) -> bool:
        return True

    def predict(
        self,
        image_bytes: bytes,
        filename: str,
        latitude: float,
        longitude: float,
        demo_preset: Optional[str] = None,
    ) -> DetectionOutput:
        start_time = time.perf_counter()

        # ── Preset 1: Sentinel-1 SAR Oil Slick (Confirmed Heavy Spill) ─────────
        if demo_preset == "sentinel_sar_slick":
            elapsed = round((time.perf_counter() - start_time) * 1000 + 138.5, 2)
            poly = _generate_spill_polygon(latitude, longitude, scale=0.065)
            mask = _create_visual_mask_base64(450, 450, detected=True, seed=101)
            return DetectionOutput(
                detected=True,
                confidence=0.942,  # 94.2%
                spill_area_km2=67.4,
                geometry_geojson=poly,
                mask_base64=mask,
                model_name=MODEL_NAME,
                processing_time_ms=elapsed,
                potential_false_positive=False,
                is_demo_model=True,
                details={
                    "sensor_type": "SENTINEL-1 C-SAR",
                    "polarization": "VV + VH",
                    "resolution_m": 10.0,
                    "anomaly_type": "Crude hydrocarbon dark formation",
                    "note": "[SIMULATION] Verified high-contrast SAR surface dampening.",
                },
            )

        # ── Preset 2: Drone Coastal Spill (Port / Nearshore Sheen) ─────────────
        if demo_preset == "drone_coastal_spill":
            elapsed = round((time.perf_counter() - start_time) * 1000 + 94.2, 2)
            poly = _generate_spill_polygon(latitude, longitude, scale=0.022)
            mask = _create_visual_mask_base64(450, 450, detected=True, seed=202)
            return DetectionOutput(
                detected=True,
                confidence=0.884,  # 88.4%
                spill_area_km2=8.2,
                geometry_geojson=poly,
                mask_base64=mask,
                model_name="DEMO-UAV-MULTISPECTRAL-V1 (DEMO MODEL)",
                processing_time_ms=elapsed,
                potential_false_positive=False,
                is_demo_model=True,
                details={
                    "sensor_type": "UAV RGB + NIR Multispectral",
                    "resolution_m": 0.25,
                    "anomaly_type": "Heavy bunker fuel sheen",
                    "note": "[SIMULATION] Nearshore industrial harbour discharge.",
                },
            )

        # ── Preset 3: Clean Ocean Water (Baseline Negative Control) ───────────
        if demo_preset == "clean_ocean_water":
            elapsed = round((time.perf_counter() - start_time) * 1000 + 72.1, 2)
            return DetectionOutput(
                detected=False,
                confidence=0.965,  # 96.5% confidence in clean surface
                spill_area_km2=0.0,
                geometry_geojson=None,
                mask_base64=None,
                model_name=MODEL_NAME,
                processing_time_ms=elapsed,
                potential_false_positive=False,
                is_demo_model=True,
                details={
                    "sensor_type": "SENTINEL-1 C-SAR",
                    "anomaly_type": "None — Normal backscatter",
                    "note": "[SIMULATION] Homogeneous sea surface; no oil slicks detected.",
                },
            )

        # ── Preset 4: Low Confidence Sheen (Potential False Positive) ─────────
        if demo_preset == "low_confidence_sheen":
            elapsed = round((time.perf_counter() - start_time) * 1000 + 115.0, 2)
            poly = _generate_spill_polygon(latitude, longitude, scale=0.015)
            mask = _create_visual_mask_base64(450, 450, detected=True, seed=303)
            return DetectionOutput(
                detected=True,
                confidence=0.582,  # 58.2% < 70% threshold
                spill_area_km2=3.5,
                geometry_geojson=poly,
                mask_base64=mask,
                model_name=MODEL_NAME,
                processing_time_ms=elapsed,
                potential_false_positive=True,
                is_demo_model=True,
                details={
                    "sensor_type": "LANDSAT-9 OLI",
                    "anomaly_type": "Possible biogenic slick / algal bloom",
                    "note": "[SIMULATION] Low backscatter gradient; potential false positive.",
                },
            )

        # ── Custom Uploaded Image: Deterministic Pixel Analysis & Hashing ──────
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            w, h = pil_img.size
            # Downsample for consistent fast analysis
            small = pil_img.resize((128, 128)).convert("L")
            arr = np.array(small)
            mean_val = float(np.mean(arr))
            dark_ratio = float(np.sum(arr < 90) / arr.size)
        except Exception:
            mean_val = 128.0
            dark_ratio = 0.15

        # Compute deterministic seed from image content hash
        digest = hashlib.sha256(image_bytes).hexdigest()
        seed_val = int(digest[:8], 16)

        # Deterministic decision based on dark patch ratio (mimics SAR dark patch detection)
        if dark_ratio > 0.10 or mean_val < 115.0:
            detected = True
            # Conf between 0.72 and 0.945 (never 1.0)
            raw_conf = 0.72 + (seed_val % 225) / 1000.0
            confidence = round(min(0.945, raw_conf), 3)
            # Area proportional to dark patch ratio and seed
            spill_area_km2 = round(2.0 + dark_ratio * 75.0 + (seed_val % 100) / 25.0, 1)
            poly = _generate_spill_polygon(latitude, longitude, scale=0.035)
            mask = _create_visual_mask_base64(350, 350, detected=True, seed=seed_val % 1000)
            is_fp = confidence < FALSE_POSITIVE_THRESHOLD
        else:
            detected = False
            confidence = round(0.86 + (seed_val % 110) / 1000.0, 3)
            spill_area_km2 = 0.0
            poly = None
            mask = None
            is_fp = False

        elapsed = round((time.perf_counter() - start_time) * 1000 + 85.0, 2)

        return DetectionOutput(
            detected=detected,
            confidence=confidence,
            spill_area_km2=spill_area_km2,
            geometry_geojson=poly,
            mask_base64=mask,
            model_name=MODEL_NAME,
            processing_time_ms=elapsed,
            potential_false_positive=is_fp,
            is_demo_model=True,
            details={
                "image_filename": filename,
                "input_resolution": f"{w}x{h}" if 'w' in locals() else "standard",
                "mean_luminance": round(mean_val, 1),
                "dark_pixel_ratio": round(dark_ratio, 3),
                "note": "[SIMULATION] Deterministic feature extraction on uploaded imagery.",
            },
        )
