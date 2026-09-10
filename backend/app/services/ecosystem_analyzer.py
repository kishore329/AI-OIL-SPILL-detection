"""
Module 12 — Marine Ecosystem Risk Analyzer Service.

Analyzes the spatial relationship between an oil spill and sensitive marine ecosystems.
Uses configurable sensitivity weights, Haversine proximity decay, and optional polygon
intersection logic (bounding-box approximation when Shapely is unavailable).

The overall ecosystem risk score feeds into the existing Risk Engine as an additive
modifier — it does NOT replace the Risk Engine's calculation.
"""
from __future__ import annotations

import json
import logging
import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.environmental_zone import EnvironmentalZone
from app.models.ecosystem_risk import EcosystemRiskAssessment
from app.models.movement_prediction import MovementPrediction
from app.models.incident_event import IncidentEvent
from app.models.enums import ZoneType, ZoneSensitivity, IncidentSeverity
from app.gis.spatial_service import (
    haversine_km,
    SIMULATION_PORTS,
    SIMULATION_SHIPPING_LANES,
)
from app.schemas.ecosystem import (
    EcosystemZoneRisk,
    EcosystemAnalyzeRequest,
    EcosystemRiskResponse,
    EcosystemNearbyZoneItem,
    EcosystemNearbyResponse,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURABLE ECOSYSTEM SENSITIVITY TABLE
# These weights represent the ecological fragility of each ecosystem type.
# 1.0 = most sensitive, 0.0 = not sensitive.
# Override in config / environment variables for production deployments.
# ─────────────────────────────────────────────────────────────────────────────
ECOSYSTEM_SENSITIVITY: dict[str, float] = {
    # High-sensitivity biomes
    "CORAL_REEF":           1.00,
    "MANGROVE":             0.90,
    "SEAGRASS_BED":         0.88,
    "BREEDING_NURSERY":     0.85,
    "BIODIVERSITY_ZONE":    0.82,
    "MARINE_HABITAT":       0.80,
    # Protected designations
    "PROTECTED_AREA":       0.95,
    # Economic zones
    "FISHING_ZONE":         0.80,
    "COASTAL_SETTLEMENT":   0.70,
    # Infrastructure
    "PORT":                 0.50,
    "SHIPPING_LANE":        0.30,
    # Fallback
    "BEACH":                0.75,
    "GENERAL_HABITAT":      0.70,
    "DEFAULT":              0.60,
}

# Human-readable category labels for each zone_type value
ECOSYSTEM_CATEGORY_LABELS: dict[str, str] = {
    "CORAL_REEF":           "Coral Reef",
    "MANGROVE":             "Mangrove Forest",
    "SEAGRASS_BED":         "Seagrass Bed",
    "BREEDING_NURSERY":     "Breeding / Nursery Zone",
    "BIODIVERSITY_ZONE":    "Biodiversity Hotspot",
    "MARINE_HABITAT":       "Marine Habitat",
    "PROTECTED_AREA":       "Protected Marine Area",
    "FISHING_ZONE":         "Fishing / Trawling Zone",
    "COASTAL_SETTLEMENT":   "Coastal Settlement",
    "PORT":                 "Commercial Port",
    "SHIPPING_LANE":        "Shipping Transit Lane",
    "BEACH":                "Beach / Shoreline",
    "GENERAL_HABITAT":      "General Marine Habitat",
    "DEFAULT":              "Environmental Zone",
}

# Severity thresholds for zone-level risk classification
ZONE_SEVERITY_THRESHOLDS = {
    "LOW":      (0.0,  25.0),
    "MODERATE": (25.0, 50.0),
    "HIGH":     (50.0, 75.0),
    "CRITICAL": (75.0, 100.0),
}

# Overall risk severity thresholds
OVERALL_SEVERITY_THRESHOLDS = {
    "LOW":      (0.0,  25.0),
    "MODERATE": (25.0, 50.0),
    "HIGH":     (50.0, 75.0),
    "CRITICAL": (75.0, 100.0),
}

MODEL_NAME = "ECOSYSTEM_RISK_V1"
DISCLAIMER = (
    "[PROTOTYPE ESTIMATE] Marine ecosystem risk calculated using configurable sensitivity "
    "weights and Haversine proximity decay. Results are indicative and not an official "
    "environmental impact assessment. Consult qualified marine ecologists for regulatory decisions."
)


# ─────────────────────────────────────────────────────────────────────────────
# Internal zone descriptor
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class _ZoneDescriptor:
    id: str
    name: str
    zone_type_key: str          # Canonical key into ECOSYSTEM_SENSITIVITY
    latitude: Optional[float]
    longitude: Optional[float]
    geometry_geojson: Optional[str] = None
    is_demo: bool = True


# ─────────────────────────────────────────────────────────────────────────────
# Pure-Python geometry helpers (no Shapely dependency)
# ─────────────────────────────────────────────────────────────────────────────

def _bbox_from_geojson(geojson_str: str) -> Optional[tuple[float, float, float, float]]:
    """Return (min_lon, min_lat, max_lon, max_lat) from a GeoJSON geometry string, or None."""
    try:
        obj = json.loads(geojson_str)
        coords = _flatten_coords(obj)
        if not coords:
            return None
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        return (min(lons), min(lats), max(lons), max(lats))
    except Exception:
        return None


def _flatten_coords(geojson: dict) -> list[list[float]]:
    """Recursively extract all coordinate pairs from any GeoJSON geometry."""
    gtype = geojson.get("type", "")
    raw = geojson.get("coordinates", [])
    if gtype in ("Point",):
        return [raw] if raw else []
    elif gtype in ("MultiPoint", "LineString"):
        return list(raw)
    elif gtype in ("MultiLineString", "Polygon"):
        return [pt for ring in raw for pt in ring]
    elif gtype in ("MultiPolygon",):
        return [pt for poly in raw for ring in poly for pt in ring]
    elif gtype == "GeometryCollection":
        out = []
        for g in geojson.get("geometries", []):
            out.extend(_flatten_coords(g))
        return out
    return []


def _bboxes_intersect(
    b1: tuple[float, float, float, float],
    b2: tuple[float, float, float, float],
) -> bool:
    """Check if two bounding boxes overlap."""
    return not (b1[2] < b2[0] or b2[2] < b1[0] or b1[3] < b2[1] or b2[3] < b1[1])


def _bbox_overlap_area_km2(
    b1: tuple[float, float, float, float],
    b2: tuple[float, float, float, float],
) -> float:
    """Approximate overlap area in km² between two lat/lon bounding boxes."""
    if not _bboxes_intersect(b1, b2):
        return 0.0
    lon_min = max(b1[0], b2[0])
    lat_min = max(b1[1], b2[1])
    lon_max = min(b1[2], b2[2])
    lat_max = min(b1[3], b2[3])
    width_km = haversine_km(lat_min, lon_min, lat_min, lon_max)
    height_km = haversine_km(lat_min, lon_min, lat_max, lon_min)
    return round(width_km * height_km, 3)


# ─────────────────────────────────────────────────────────────────────────────
# Scoring helpers
# ─────────────────────────────────────────────────────────────────────────────

def _proximity_score(distance_km: float, sensitivity: float) -> float:
    """
    Proximity decay score (0–100).
    Close zones with high sensitivity score more.
    Uses an exponential decay: score = 100 * sensitivity * exp(-λ * dist)
    λ chosen so that at 200 km the score is ~13% of max.
    """
    lam = 0.008
    raw = 100.0 * sensitivity * math.exp(-lam * distance_km)
    return round(min(100.0, max(0.0, raw)), 2)


def _exposure_score(
    distance_km: float,
    sensitivity: float,
    affected_area_km2: float,
    intersects: bool,
    spill_area_km2: float,
) -> float:
    """
    Combined exposure score (0–100):
    - Base proximity decay
    - Bonus if polygons intersect
    - Bonus proportional to affected area relative to spill
    """
    base = _proximity_score(distance_km, sensitivity)

    intersection_bonus = 20.0 if intersects else 0.0

    area_ratio = 0.0
    if spill_area_km2 > 0 and affected_area_km2 > 0:
        area_ratio = min(1.0, affected_area_km2 / spill_area_km2)
    area_bonus = area_ratio * 15.0

    return round(min(100.0, base + intersection_bonus + area_bonus), 2)


def _zone_risk_score(exposure: float, proximity: float, sensitivity: float) -> float:
    """
    Final zone risk score (0–100).
    Weighted combination: 60% exposure + 25% proximity + 15% sensitivity ceiling
    """
    score = 0.60 * exposure + 0.25 * proximity + 0.15 * (sensitivity * 100.0)
    return round(min(100.0, max(0.0, score)), 2)


def _classify_severity(score: float) -> str:
    if score >= 75.0:
        return "CRITICAL"
    elif score >= 50.0:
        return "HIGH"
    elif score >= 25.0:
        return "MODERATE"
    return "LOW"


def _build_explanation(
    zone_name: str,
    category: str,
    distance_km: float,
    sensitivity: float,
    intersects: bool,
    affected_area_km2: float,
    severity: str,
) -> str:
    parts = []
    if intersects:
        parts.append(
            f"The oil spill polygon directly overlaps with {zone_name} (~{affected_area_km2:.2f} km² estimated contact area)."
        )
    else:
        parts.append(f"{zone_name} ({category}) is located {distance_km:.1f} km from the spill origin.")

    sens_pct = int(sensitivity * 100)
    parts.append(
        f"Ecosystem sensitivity rating: {sens_pct}% — "
        + ("critically fragile biome." if sensitivity >= 0.9 else
           "highly sensitive marine habitat." if sensitivity >= 0.7 else
           "moderate sensitivity.")
    )
    parts.append(f"Overall zone classification: {severity}.")
    return " ".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# Additional simulation ecosystem zones (coral reefs, mangroves, etc.)
# These supplement the existing EnvironmentalZone DB records.
# ─────────────────────────────────────────────────────────────────────────────
SIMULATION_ECOSYSTEM_ZONES: list[dict] = [
    # Indian Ocean / Arabian Sea
    {
        "id": "eco-lakshadweep-coral",
        "name": "Lakshadweep Coral Atoll Biosphere",
        "zone_type_key": "CORAL_REEF",
        "latitude": 10.57,
        "longitude": 72.64,
    },
    {
        "id": "eco-gulf-mannar-reef",
        "name": "Gulf of Mannar Coral Reef Reserve",
        "zone_type_key": "CORAL_REEF",
        "latitude": 9.15,
        "longitude": 79.20,
    },
    {
        "id": "eco-sundarbans-mangrove",
        "name": "Sundarbans Mangrove Delta (UNESCO World Heritage)",
        "zone_type_key": "MANGROVE",
        "latitude": 21.94,
        "longitude": 89.18,
    },
    {
        "id": "eco-pichavaram-mangrove",
        "name": "Pichavaram Mangrove Forest",
        "zone_type_key": "MANGROVE",
        "latitude": 11.43,
        "longitude": 79.79,
    },
    {
        "id": "eco-andaman-coral",
        "name": "Andaman & Nicobar Coral Gardens",
        "zone_type_key": "CORAL_REEF",
        "latitude": 12.00,
        "longitude": 93.00,
    },
    {
        "id": "eco-chilika-nursery",
        "name": "Chilika Lake Breeding & Nursery Lagoon",
        "zone_type_key": "BREEDING_NURSERY",
        "latitude": 19.72,
        "longitude": 85.32,
    },
    {
        "id": "eco-vembanad-habitat",
        "name": "Vembanad Lake Ramsar Wetland",
        "zone_type_key": "MARINE_HABITAT",
        "latitude": 9.60,
        "longitude": 76.42,
    },
    {
        "id": "eco-gulf-kutch-biodiversity",
        "name": "Gulf of Kutch Marine National Park",
        "zone_type_key": "BIODIVERSITY_ZONE",
        "latitude": 22.60,
        "longitude": 69.40,
    },
    {
        "id": "eco-nicobar-seagrass",
        "name": "Nicobar Seagrass Meadows",
        "zone_type_key": "SEAGRASS_BED",
        "latitude": 7.00,
        "longitude": 93.85,
    },
    {
        "id": "eco-malacca-habitat",
        "name": "Strait of Malacca Marine Biodiversity Corridor",
        "zone_type_key": "MARINE_HABITAT",
        "latitude": 4.00,
        "longitude": 100.00,
    },
    # Global ocean zones (for worldwide coverage)
    {
        "id": "eco-maldives-atoll",
        "name": "Maldivian Atoll Coral System",
        "zone_type_key": "CORAL_REEF",
        "latitude": 4.17,
        "longitude": 73.51,
    },
    {
        "id": "eco-persian-gulf-reef",
        "name": "Persian Gulf Fringing Reef Belt",
        "zone_type_key": "CORAL_REEF",
        "latitude": 26.00,
        "longitude": 50.55,
    },
    {
        "id": "eco-red-sea-reef",
        "name": "Red Sea Coral Triangle (UNESCO Priority)",
        "zone_type_key": "CORAL_REEF",
        "latitude": 20.00,
        "longitude": 38.50,
    },
    {
        "id": "eco-west-africa-mangrove",
        "name": "West African Niger Delta Mangrove Belt",
        "zone_type_key": "MANGROVE",
        "latitude": 4.50,
        "longitude": 5.20,
    },
    {
        "id": "eco-west-africa-nursery",
        "name": "Gulf of Guinea Coastal Nursery Grounds",
        "zone_type_key": "BREEDING_NURSERY",
        "latitude": 3.80,
        "longitude": 3.50,
    },
    {
        "id": "eco-seychelles-reef",
        "name": "Seychelles Inner Island Coral Complex",
        "zone_type_key": "CORAL_REEF",
        "latitude": -4.62,
        "longitude": 55.45,
    },
    {
        "id": "eco-mozambique-seagrass",
        "name": "Mozambique Channel Seagrass Beds",
        "zone_type_key": "SEAGRASS_BED",
        "latitude": -15.00,
        "longitude": 40.70,
    },
]


def _get_all_ecosystem_zones(db: Session) -> list[_ZoneDescriptor]:
    """
    Compile all ecosystem zones from:
    1. DB EnvironmentalZone records (Protected Areas, Fishing Zones, etc.)
    2. Simulation ecosystem zones (coral, mangrove, seagrass, etc.)
    """
    zones: list[_ZoneDescriptor] = []

    # 1. DB zones
    db_zones = db.execute(select(EnvironmentalZone)).scalars().all()
    for z in db_zones:
        if z.latitude is None or z.longitude is None:
            continue
        # Map DB zone_type enum to sensitivity key
        key = z.zone_type.value if z.zone_type.value in ECOSYSTEM_SENSITIVITY else "DEFAULT"
        zones.append(_ZoneDescriptor(
            id=z.id,
            name=z.name,
            zone_type_key=key,
            latitude=z.latitude,
            longitude=z.longitude,
            geometry_geojson=z.geometry_geojson,
            is_demo=True,
        ))

    # 2. Simulation ecosystem-specific zones
    for ez in SIMULATION_ECOSYSTEM_ZONES:
        zones.append(_ZoneDescriptor(
            id=ez["id"],
            name=ez["name"],
            zone_type_key=ez["zone_type_key"],
            latitude=ez["latitude"],
            longitude=ez["longitude"],
            geometry_geojson=None,
            is_demo=True,
        ))

    return zones


# ─────────────────────────────────────────────────────────────────────────────
# EcosystemAnalyzer — Main Service
# ─────────────────────────────────────────────────────────────────────────────

class EcosystemAnalyzer:
    """
    Module 12: Marine Ecosystem Risk Analyzer.

    Calculates how an oil spill may affect nearby marine ecosystems.
    Integrates with the existing Risk Engine as an additive factor (not a replacement).
    """

    @staticmethod
    def get_latest(db: Session, incident_id: str) -> EcosystemRiskResponse:
        """Return the most recent ecosystem risk assessment for an incident."""
        incident = db.get(Incident, incident_id)
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        record = (
            db.execute(
                select(EcosystemRiskAssessment)
                .where(EcosystemRiskAssessment.incident_id == incident_id)
                .order_by(EcosystemRiskAssessment.analyzed_at.desc())
            )
            .scalars()
            .first()
        )

        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"No ecosystem risk assessment found for incident '{incident_id}'. "
                    "POST to /ecosystem-risk/analyze to run one."
                ),
            )

        return EcosystemAnalyzer._to_response(record, incident.incident_code)

    @staticmethod
    def analyze(
        db: Session,
        incident_id: str,
        request: EcosystemAnalyzeRequest,
    ) -> EcosystemRiskResponse:
        """
        Run a fresh ecosystem risk analysis:
        1. Fetch incident + spill geometry
        2. Query all ecosystem zones within radius_km
        3. Calculate per-zone proximity / exposure / sensitivity scores
        4. Aggregate to overall ecosystem risk score (0–100)
        5. Compute Risk Engine modifier (±5 pts)
        6. Persist to ecosystem_risk_assessments table
        7. Log audit event
        8. Return structured response
        """
        incident = db.get(Incident, incident_id)
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        if incident.latitude is None or incident.longitude is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incident '{incident_id}' has no geographic coordinates.",
            )

        inc_lat: float = incident.latitude
        inc_lon: float = incident.longitude
        spill_area: float = incident.spill_area_km2 or 0.0
        radius_km: float = request.radius_km or 100.0

        # Parse spill bounding box for intersection detection
        spill_bbox: Optional[tuple[float, float, float, float]] = None
        if incident.spill_geometry_geojson:
            spill_bbox = _bbox_from_geojson(incident.spill_geometry_geojson)

        # ── Optionally extend search to +24h movement prediction positions ──
        extra_points: list[tuple[float, float]] = []
        movement_used = False
        if request.use_movement_prediction:
            mp = (
                db.execute(
                    select(MovementPrediction)
                    .where(MovementPrediction.incident_id == incident_id)
                    .order_by(MovementPrediction.created_at.desc())
                )
                .scalars()
                .first()
            )
            if mp and mp.forecast_points_json:
                try:
                    fps = json.loads(mp.forecast_points_json)
                    for fp in fps:
                        extra_points.append((fp["latitude"], fp["longitude"]))
                    movement_used = True
                except Exception:
                    pass

        # ── Gather all zones ──
        all_zones = _get_all_ecosystem_zones(db)
        zone_results: list[EcosystemZoneRisk] = []

        for z in all_zones:
            if z.latitude is None or z.longitude is None:
                continue

            # Primary distance from spill origin
            dist_km = haversine_km(inc_lat, inc_lon, z.latitude, z.longitude)

            # If movement prediction enabled, use min distance among all positions
            if movement_used and extra_points:
                for ep_lat, ep_lon in extra_points:
                    d = haversine_km(ep_lat, ep_lon, z.latitude, z.longitude)
                    dist_km = min(dist_km, d)

            # Skip if outside radius
            if dist_km > radius_km:
                continue

            # Intersection check (bounding box approximation)
            intersects = False
            affected_area_km2 = 0.0
            if spill_bbox and z.geometry_geojson:
                zone_bbox = _bbox_from_geojson(z.geometry_geojson)
                if zone_bbox and _bboxes_intersect(spill_bbox, zone_bbox):
                    intersects = True
                    affected_area_km2 = _bbox_overlap_area_km2(spill_bbox, zone_bbox)

            # Sensitivity weight
            sensitivity = ECOSYSTEM_SENSITIVITY.get(
                z.zone_type_key,
                ECOSYSTEM_SENSITIVITY["DEFAULT"],
            )
            category = ECOSYSTEM_CATEGORY_LABELS.get(z.zone_type_key, "Environmental Zone")

            # Score components
            prox_score = _proximity_score(dist_km, sensitivity)
            exp_score = _exposure_score(
                dist_km, sensitivity, affected_area_km2, intersects, spill_area
            )
            zone_score = _zone_risk_score(exp_score, prox_score, sensitivity)
            sev = _classify_severity(zone_score)
            explanation = _build_explanation(
                z.name, category, dist_km, sensitivity, intersects, affected_area_km2, sev
            )

            zone_results.append(EcosystemZoneRisk(
                zone_id=z.id,
                zone_name=z.name,
                zone_type=z.zone_type_key,
                ecosystem_category=category,
                distance_km=round(dist_km, 2),
                affected_area_km2=round(affected_area_km2, 3) if affected_area_km2 else None,
                intersects=intersects,
                sensitivity_score=round(sensitivity, 3),
                exposure_score=round(exp_score, 2),
                proximity_score=round(prox_score, 2),
                zone_risk_score=round(zone_score, 2),
                zone_severity=sev,
                explanation=explanation,
            ))

        # ── Aggregate overall score ──
        if not zone_results:
            overall_score = 0.0
        else:
            # Weighted average, biased toward highest-scoring zones
            scores = sorted([z.zone_risk_score for z in zone_results], reverse=True)
            # Top 3 zones contribute 70%, rest contribute 30%
            top = scores[:3]
            rest = scores[3:]
            if rest:
                overall_score = 0.70 * (sum(top) / len(top)) + 0.30 * (sum(rest) / len(rest))
            else:
                overall_score = sum(top) / len(top)
            overall_score = round(min(100.0, overall_score), 2)

        overall_severity = _classify_severity(overall_score)

        # ── Most sensitive zone ──
        most_sensitive = (
            max(zone_results, key=lambda z: z.zone_risk_score)
            if zone_results else None
        )

        # ── Risk Engine modifier: maps ecosystem risk into ±5 pt adjustment ──
        # High ecosystem risk → add up to +5 pts to Risk Engine environmental score
        risk_engine_modifier = round(min(5.0, overall_score / 20.0), 2)

        # ── Serialize zone results ──
        zone_json = json.dumps([z.model_dump() for z in zone_results])

        # ── Persist ──
        record = EcosystemRiskAssessment(
            id=str(uuid.uuid4()),
            incident_id=incident_id,
            overall_risk_score=overall_score,
            overall_severity=overall_severity,
            zone_results_json=zone_json,
            most_sensitive_zone=most_sensitive.zone_name if most_sensitive else None,
            most_sensitive_type=most_sensitive.ecosystem_category if most_sensitive else None,
            risk_engine_modifier=risk_engine_modifier,
            zones_analyzed=len(zone_results),
            radius_km_used=radius_km,
            used_movement_prediction=movement_used,
            is_simulated=True,
            model_name=MODEL_NAME,
            disclaimer=DISCLAIMER,
            analyzed_at=datetime.now(timezone.utc),
        )
        db.add(record)

        # ── Audit event ──
        try:
            evt = IncidentEvent(
                id=str(uuid.uuid4()),
                incident_id=incident_id,
                event_type="ECOSYSTEM_RISK_ANALYZED",
                description=(
                    f"Module 12 ecosystem risk analysis completed: {len(zone_results)} zones analyzed, "
                    f"overall score {overall_score:.1f}/100 ({overall_severity}). "
                    f"Risk Engine modifier: +{risk_engine_modifier:.2f} pts."
                ),
                created_by="EcosystemAnalyzer (Module 12)",
            )
            db.add(evt)
        except Exception as e:
            logger.warning(f"Could not log ecosystem audit event: {e}")

        db.commit()
        db.refresh(record)

        return EcosystemAnalyzer._to_response(record, incident.incident_code)

    @staticmethod
    def get_nearby_zones(
        db: Session,
        lat: float,
        lon: float,
        radius_km: float = 100.0,
    ) -> EcosystemNearbyResponse:
        """Return all ecosystem zones within radius_km of a given lat/lon point."""
        all_zones = _get_all_ecosystem_zones(db)
        items = []
        for z in all_zones:
            if z.latitude is None or z.longitude is None:
                continue
            dist = haversine_km(lat, lon, z.latitude, z.longitude)
            if dist <= radius_km:
                sensitivity = ECOSYSTEM_SENSITIVITY.get(
                    z.zone_type_key, ECOSYSTEM_SENSITIVITY["DEFAULT"]
                )
                items.append(EcosystemNearbyZoneItem(
                    zone_id=z.id,
                    zone_name=z.name,
                    zone_type=z.zone_type_key,
                    ecosystem_category=ECOSYSTEM_CATEGORY_LABELS.get(z.zone_type_key, "Environmental Zone"),
                    sensitivity_score=round(sensitivity, 3),
                    latitude=z.latitude,
                    longitude=z.longitude,
                    distance_km=round(dist, 2),
                    is_demo=z.is_demo,
                ))
        items.sort(key=lambda x: x.distance_km)
        return EcosystemNearbyResponse(
            query_lat=lat,
            query_lon=lon,
            radius_km=radius_km,
            total=len(items),
            zones=items,
        )

    @staticmethod
    def _to_response(record: EcosystemRiskAssessment, incident_code: str) -> EcosystemRiskResponse:
        """Convert ORM record to Pydantic response model."""
        zone_results: list[EcosystemZoneRisk] = []
        if record.zone_results_json:
            try:
                raw = json.loads(record.zone_results_json)
                zone_results = [EcosystemZoneRisk(**z) for z in raw]
            except Exception as e:
                logger.warning(f"Failed to deserialize zone results: {e}")

        return EcosystemRiskResponse(
            id=record.id,
            incident_id=record.incident_id,
            incident_code=incident_code,
            overall_risk_score=record.overall_risk_score,
            overall_severity=record.overall_severity,
            most_sensitive_zone=record.most_sensitive_zone,
            most_sensitive_type=record.most_sensitive_type,
            zone_results=zone_results,
            risk_engine_modifier=record.risk_engine_modifier,
            zones_analyzed=record.zones_analyzed,
            radius_km_used=record.radius_km_used,
            used_movement_prediction=record.used_movement_prediction,
            is_simulated=record.is_simulated,
            model_name=record.model_name,
            disclaimer=record.disclaimer or DISCLAIMER,
            analyzed_at=record.analyzed_at,
        )
