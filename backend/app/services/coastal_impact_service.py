"""
Module 13 — Coastal Impact Predictor & Time-to-Impact Service.

Consumes Module 11 Lagrangian movement prediction trajectories to determine which
coastal locations (coastlines, beaches, coastal settlements, fishing grounds, ports,
tourism zones, and coastal infrastructure) may be affected by the expanding oil slick,
and computes the estimated time until impact (NOW, 1H, 3H, 6H, 12H, 24H).
"""
from __future__ import annotations

import json
import logging
import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.coastal_impact import CoastalImpactPrediction
from app.models.environmental_zone import EnvironmentalZone
from app.models.enums import IncidentSeverity, IncidentStatus, ZoneType
from app.gis.spatial_service import haversine_km, COASTLINE_COORDINATES, SIMULATION_PORTS
from app.services.movement_prediction import MovementPredictionService
from app.schemas.movement import MovementPredictionResponse, MovementPredictionRequest
from app.schemas.coastal_impact import (
    CoastalImpactItem,
    TimelineHorizonGroup,
    CoastalImpactResponse,
    TimeToImpactResponse,
    CoastalImpactPredictRequest,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# COASTAL ASSET CATALOG
# Enriched catalog of coastal targets across the Indian Ocean & global corridors
# ─────────────────────────────────────────────────────────────────────────────
STATIC_COASTAL_CATALOG = [
    # ── Beaches & Tourism Shorelines ──
    {
        "name": "Chennai Marina Beach",
        "type": "BEACH",
        "latitude": 13.050,
        "longitude": 80.282,
        "sensitivity": "CRITICAL",
        "notes": "World's second longest urban beach with high civilian and tourist density.",
    },
    {
        "name": "Besant Nagar (Elliot's) Beach",
        "type": "BEACH",
        "latitude": 12.999,
        "longitude": 80.272,
        "sensitivity": "HIGH",
        "notes": "Prominent recreational coastal shoreline south of Adyar river mouth.",
    },
    {
        "name": "Kovalam Beach Shoreline",
        "type": "BEACH",
        "latitude": 8.402,
        "longitude": 76.978,
        "sensitivity": "HIGH",
        "notes": "International tourist beach destination in Kerala.",
    },
    {
        "name": "Calangute & Baga Coast",
        "type": "BEACH",
        "latitude": 15.544,
        "longitude": 73.755,
        "sensitivity": "CRITICAL",
        "notes": "Prime tourism and hospitality belt along North Goa shoreline.",
    },
    {
        "name": "Juhu Beach Waterfront",
        "type": "BEACH",
        "latitude": 19.098,
        "longitude": 72.826,
        "sensitivity": "HIGH",
        "notes": "Heavily visited urban beach and intertidal zone in Mumbai.",
    },
    {
        "name": "Puri Golden Beach",
        "type": "BEACH",
        "latitude": 19.798,
        "longitude": 85.825,
        "sensitivity": "HIGH",
        "notes": "Blue Flag certified beach and pilgrim tourism shoreline in Odisha.",
    },
    {
        "name": "Galle Face Green Promenade (Colombo)",
        "type": "BEACH",
        "latitude": 6.927,
        "longitude": 79.843,
        "sensitivity": "HIGH",
        "notes": "Urban coastal promenade adjacent to Colombo port corridor.",
    },

    # ── Coastal Settlements & Fishing Communities ──
    {
        "name": "Kasimedu Fishermen Settlement",
        "type": "COASTAL_SETTLEMENT",
        "latitude": 13.125,
        "longitude": 80.298,
        "sensitivity": "CRITICAL",
        "notes": "Densely populated fishing colony and mechanized boat landing wharf.",
    },
    {
        "name": "Ennore Coastal Fishing Hamlet",
        "type": "COASTAL_SETTLEMENT",
        "latitude": 13.218,
        "longitude": 80.325,
        "sensitivity": "CRITICAL",
        "notes": "Traditional artisanal fishing community along Ennore creek inlet.",
    },
    {
        "name": "Versova Koliwada Village",
        "type": "COASTAL_SETTLEMENT",
        "latitude": 19.135,
        "longitude": 72.812,
        "sensitivity": "HIGH",
        "notes": "Indigenous fishing settlement dependent on Malad creek fisheries.",
    },
    {
        "name": "Fort Kochi Coastal Heritage Settlement",
        "type": "COASTAL_SETTLEMENT",
        "latitude": 9.965,
        "longitude": 76.242,
        "sensitivity": "HIGH",
        "notes": "Historic coastal community and Chinese fishing net installations.",
    },
    {
        "name": "Mandvi Coastal Town (Gulf of Kutch)",
        "type": "COASTAL_SETTLEMENT",
        "latitude": 22.833,
        "longitude": 69.355,
        "sensitivity": "MODERATE",
        "notes": "Shipbuilding and coastal artisan maritime town.",
    },
    {
        "name": "Vasco da Gama Coastal Colony",
        "type": "COASTAL_SETTLEMENT",
        "latitude": 15.398,
        "longitude": 73.812,
        "sensitivity": "HIGH",
        "notes": "Dense residential township around Mormugao bay.",
    },

    # ── Major Ports & Harbours ──
    {
        "name": "Chennai Port Petrochemical Basin",
        "type": "PORT",
        "latitude": 13.084,
        "longitude": 80.297,
        "sensitivity": "HIGH",
        "notes": "Deep draught berths with crude tanker pipelines.",
    },
    {
        "name": "Kamarajar Port (Ennore)",
        "type": "PORT",
        "latitude": 13.250,
        "longitude": 80.339,
        "sensitivity": "CRITICAL",
        "notes": "Dedicated coal and liquid chemical tanker discharge port.",
    },
    {
        "name": "Jawaharlal Nehru Port (JNPT)",
        "type": "PORT",
        "latitude": 18.949,
        "longitude": 72.951,
        "sensitivity": "HIGH",
        "notes": "India's largest container shipping gateway in Navi Mumbai.",
    },
    {
        "name": "Cochin International Port & SPM",
        "type": "PORT",
        "latitude": 9.967,
        "longitude": 76.271,
        "sensitivity": "CRITICAL",
        "notes": "Single point mooring crude discharge and LNG receiving terminal.",
    },
    {
        "name": "Visakhapatnam Port Outer Harbour",
        "type": "PORT",
        "latitude": 17.690,
        "longitude": 83.298,
        "sensitivity": "HIGH",
        "notes": "Eastern coast naval and crude oil handling terminal.",
    },
    {
        "name": "Deendayal Port (Kandla Oil Jetty)",
        "type": "PORT",
        "latitude": 23.013,
        "longitude": 70.220,
        "sensitivity": "CRITICAL",
        "notes": "Major crude terminal serving north Indian refineries.",
    },
    {
        "name": "V.O. Chidambaranar Port (Tuticorin)",
        "type": "PORT",
        "latitude": 8.754,
        "longitude": 78.196,
        "sensitivity": "HIGH",
        "notes": "All-weather artificial harbour on Gulf of Mannar corridor.",
    },

    # ── Critical Coastal Infrastructure ──
    {
        "name": "CPCL Ennore Marine Oil Terminal",
        "type": "INFRASTRUCTURE",
        "latitude": 13.242,
        "longitude": 80.334,
        "sensitivity": "CRITICAL",
        "notes": "Refinery sea-island crude discharge and submarine pipeline hub.",
    },
    {
        "name": "Trombay Marine Petrochemical Jetty",
        "type": "INFRASTRUCTURE",
        "latitude": 18.995,
        "longitude": 72.902,
        "sensitivity": "CRITICAL",
        "notes": "Crude storage and chemical refinery offloading infrastructure.",
    },
    {
        "name": "Kudankulam Coastal Water Intake",
        "type": "INFRASTRUCTURE",
        "latitude": 8.172,
        "longitude": 77.712,
        "sensitivity": "CRITICAL",
        "notes": "Seawater cooling intake for nuclear power generation facility.",
    },
    {
        "name": "Minjur Seawater Desalination Plant",
        "type": "INFRASTRUCTURE",
        "latitude": 13.287,
        "longitude": 80.338,
        "sensitivity": "CRITICAL",
        "notes": "100 MLD municipal drinking water intake facility for Chennai.",
    },

    # ── Fishing & Aquaculture Zones ──
    {
        "name": "Coromandel Coastal Shelf Fishery",
        "type": "FISHING_ZONE",
        "latitude": 12.850,
        "longitude": 80.260,
        "sensitivity": "HIGH",
        "notes": "Intensive inshore artisanal prawn and pelagic fishery zone.",
    },
    {
        "name": "Kerala Fishery Alpha Ground",
        "type": "FISHING_ZONE",
        "latitude": 10.500,
        "longitude": 75.500,
        "sensitivity": "HIGH",
        "notes": "Key sardine and mackerel purse-seine fishing ground.",
    },
    {
        "name": "Palk Bay Inshore Aquaculture",
        "type": "FISHING_ZONE",
        "latitude": 9.500,
        "longitude": 79.250,
        "sensitivity": "HIGH",
        "notes": "Traditional crab, seaweed, and shallow sea-cage farming area.",
    },

    # ── Protected Ecological Reserves ──
    {
        "name": "Gulf of Mannar Marine National Park",
        "type": "PROTECTED_AREA",
        "latitude": 9.050,
        "longitude": 79.100,
        "sensitivity": "CRITICAL",
        "notes": "Biosphere reserve with 21 coral islands and endangered Dugong habitat.",
    },
    {
        "name": "Chilika Lake Coastal Inlet",
        "type": "PROTECTED_AREA",
        "latitude": 19.720,
        "longitude": 85.300,
        "sensitivity": "CRITICAL",
        "notes": "Ramsar wetland and Irrawaddy dolphin breeding sanctuary.",
    },
    {
        "name": "Sundarbans Mangrove Reserve",
        "type": "PROTECTED_AREA",
        "latitude": 21.940,
        "longitude": 89.180,
        "sensitivity": "CRITICAL",
        "notes": "UNESCO world heritage tidal mangrove forest and delta barrier.",
    },
    {
        "name": "Malvan Marine Wildlife Sanctuary",
        "type": "PROTECTED_AREA",
        "latitude": 16.050,
        "longitude": 73.460,
        "sensitivity": "HIGH",
        "notes": "Coral patch and pearl oyster habitat along Konkan coast.",
    },
]

# Horizon boundaries in hours
HORIZONS = [
    ("NOW", "< 1 Hour", 0.0, 1.0),
    ("1H", "+1 to 3 Hours", 1.0, 3.0),
    ("3H", "+3 to 6 Hours", 3.0, 6.0),
    ("6H", "+6 to 12 Hours", 6.0, 12.0),
    ("12H", "+12 to 24 Hours", 12.0, 24.0),
    ("24H", "+24 to 36 Hours", 24.0, 36.0),
]


class CoastalImpactService:
    """Core analytical service for Module 13 Coastal Impact Predictor."""

    @classmethod
    def predict(
        cls,
        db: Session,
        incident_id: str,
        request: Optional[CoastalImpactPredictRequest] = None,
    ) -> CoastalImpactResponse:
        """
        Executes coastal impact prediction by consuming Module 11 Movement Prediction
        and evaluating spatial intersection / proximity against coastal assets.
        """
        incident = db.get(Incident, incident_id)
        if not incident or not incident.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        if incident.latitude is None or incident.longitude is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incident '{incident_id}' missing geographic coordinates.",
            )

        # 1. Fetch or execute Module 11 Movement Prediction
        movement_pred = cls._get_or_run_movement_prediction(db, incident_id, request)

        # 2. Gather candidate coastal assets
        candidates = cls._get_candidate_coastal_assets(db, incident.latitude, incident.longitude)

        # 3. Analyze impact trajectories
        affected_items = cls._calculate_asset_impacts(
            incident=incident,
            movement_pred=movement_pred,
            candidates=candidates,
            search_buffer_km=request.search_buffer_km if request else 80.0,
        )

        # 4. Delete previous predictions for this incident and persist new ones
        db.execute(delete(CoastalImpactPrediction).where(CoastalImpactPrediction.incident_id == incident_id))

        now_utc = datetime.now(timezone.utc)
        db_records = []
        for item in affected_items:
            rec = CoastalImpactPrediction(
                id=item.id,
                incident_id=incident_id,
                target_location=item.target_location,
                target_type=item.target_type,
                latitude=item.latitude,
                longitude=item.longitude,
                distance_km=item.distance_km,
                estimated_hours_to_impact=item.estimated_hours_to_impact,
                predicted_impact_time=datetime.fromisoformat(item.predicted_impact_time.replace("Z", "+00:00")),
                impact_horizon=item.impact_horizon,
                severity=item.severity,
                confidence=item.confidence,
                impact_probability=item.impact_probability,
                prediction_source=item.prediction_source,
                spatial_relation=item.spatial_relation,
                summary_notes=item.summary_notes,
                is_simulated=item.is_simulated,
                created_at=now_utc,
            )
            db.add(rec)
            db_records.append(rec)

        db.commit()

        # 5. Build timeline summary
        timeline_summary = cls._build_timeline_summary(affected_items)

        # 6. Overall earliest impact and severity
        earliest_hours = min((it.estimated_hours_to_impact for it in affected_items), default=None)
        earliest_item = next((it for it in affected_items if it.estimated_hours_to_impact == earliest_hours), None) if earliest_hours is not None else None

        overall_severity = "LOW"
        if any(it.severity == "CRITICAL" for it in affected_items):
            overall_severity = "CRITICAL"
        elif any(it.severity == "HIGH" for it in affected_items):
            overall_severity = "HIGH"
        elif any(it.severity == "MODERATE" for it in affected_items):
            overall_severity = "MODERATE"

        avg_confidence = round(
            sum(it.confidence for it in affected_items) / len(affected_items), 2
        ) if affected_items else 0.85

        # 7. GeoJSON FeatureCollection
        geojson_str = cls._build_impact_geojson(affected_items)

        return CoastalImpactResponse(
            incident_id=incident.id,
            incident_code=incident.incident_code,
            total_affected_locations=len(affected_items),
            earliest_impact_hours=earliest_hours,
            earliest_impact_location=earliest_item.target_location if earliest_item else None,
            earliest_impact_type=earliest_item.target_type if earliest_item else None,
            overall_coastal_severity=overall_severity,
            timeline_summary=timeline_summary,
            affected_locations=affected_items,
            impact_zones_geojson=geojson_str,
            model_name="COASTAL_IMPACT_V1",
            confidence_score=avg_confidence,
            is_simulated=True,
            analyzed_at=now_utc.isoformat(),
        )

    @classmethod
    def get_latest(cls, db: Session, incident_id: str) -> CoastalImpactResponse:
        """Retrieves stored coastal impact assessment or runs a fresh prediction."""
        incident = db.get(Incident, incident_id)
        if not incident or not incident.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        q = (
            select(CoastalImpactPrediction)
            .where(CoastalImpactPrediction.incident_id == incident_id)
            .order_by(CoastalImpactPrediction.estimated_hours_to_impact.asc())
        )
        records = db.execute(q).scalars().all()

        if not records:
            # Auto-run prediction
            return cls.predict(db, incident_id)

        affected_items: list[CoastalImpactItem] = []
        for r in records:
            affected_items.append(
                CoastalImpactItem(
                    id=str(r.id),
                    incident_id=str(r.incident_id),
                    target_location=r.target_location,
                    target_type=r.target_type,
                    latitude=r.latitude,
                    longitude=r.longitude,
                    distance_km=r.distance_km,
                    estimated_hours_to_impact=r.estimated_hours_to_impact,
                    predicted_impact_time=r.predicted_impact_time.isoformat(),
                    impact_horizon=r.impact_horizon,
                    severity=r.severity,
                    confidence=r.confidence,
                    impact_probability=r.impact_probability,
                    prediction_source=r.prediction_source,
                    spatial_relation=r.spatial_relation,
                    summary_notes=r.summary_notes,
                    is_simulated=r.is_simulated,
                )
            )

        timeline_summary = cls._build_timeline_summary(affected_items)
        earliest_hours = min((it.estimated_hours_to_impact for it in affected_items), default=None)
        earliest_item = next((it for it in affected_items if it.estimated_hours_to_impact == earliest_hours), None) if earliest_hours is not None else None

        overall_severity = "LOW"
        if any(it.severity == "CRITICAL" for it in affected_items):
            overall_severity = "CRITICAL"
        elif any(it.severity == "HIGH" for it in affected_items):
            overall_severity = "HIGH"
        elif any(it.severity == "MODERATE" for it in affected_items):
            overall_severity = "MODERATE"

        avg_confidence = round(
            sum(it.confidence for it in affected_items) / len(affected_items), 2
        ) if affected_items else 0.85

        latest_created = max((r.created_at for r in records), default=datetime.now(timezone.utc))

        return CoastalImpactResponse(
            incident_id=incident.id,
            incident_code=incident.incident_code,
            total_affected_locations=len(affected_items),
            earliest_impact_hours=earliest_hours,
            earliest_impact_location=earliest_item.target_location if earliest_item else None,
            earliest_impact_type=earliest_item.target_type if earliest_item else None,
            overall_coastal_severity=overall_severity,
            timeline_summary=timeline_summary,
            affected_locations=affected_items,
            impact_zones_geojson=cls._build_impact_geojson(affected_items),
            model_name="COASTAL_IMPACT_V1",
            confidence_score=avg_confidence,
            is_simulated=True,
            analyzed_at=latest_created.isoformat(),
        )

    @classmethod
    def get_time_to_impact(cls, db: Session, incident_id: str) -> TimeToImpactResponse:
        """Returns concise time-to-impact metrics for rapid alerts and priority dispatch."""
        full_res = cls.get_latest(db, incident_id)

        # Timeline counts dict
        timeline_counts = {h[0]: 0 for h in HORIZONS}
        for item in full_res.affected_locations:
            if item.impact_horizon in timeline_counts:
                timeline_counts[item.impact_horizon] += 1
            else:
                timeline_counts[item.impact_horizon] = 1

        earliest_h = full_res.earliest_impact_hours
        target = full_res.earliest_impact_location
        target_type = full_res.earliest_impact_type

        # Urgency classification
        contact_confirmed = False
        if earliest_h is not None:
            if earliest_h <= 1.0:
                urgency = "IMMEDIATE"
                contact_confirmed = True
                alert_summary = f"[ESTIMATED IMPACT IMMINENT] {target} ({target_type}) estimated contact within {earliest_h:.1f} hours! Immediate boom deployment required."
            elif earliest_h <= 6.0:
                urgency = "CRITICAL"
                alert_summary = f"[ESTIMATED IMPACT IN {earliest_h:.1f}H] Critical threat to {target} ({target_type}). Shoreline defense alert issued."
            elif earliest_h <= 12.0:
                urgency = "HIGH"
                alert_summary = f"[ESTIMATED IMPACT IN {earliest_h:.1f}H] Oil movement projected towards {target}. Pre-positioning containment skimmers recommended."
            elif earliest_h <= 24.0:
                urgency = "ELEVATED"
                alert_summary = f"[ESTIMATED IMPACT IN {earliest_h:.1f}H] Projected trajectory approaching {target} sector within 24 hours."
            else:
                urgency = "MONITORING"
                alert_summary = f"No immediate coastal threat within 24h. Tracking drift trajectory."
        else:
            urgency = "MONITORING"
            alert_summary = "No coastal landmasses projected along forward advection corridor."

        return TimeToImpactResponse(
            incident_id=full_res.incident_id,
            incident_code=full_res.incident_code,
            earliest_impact_hours=earliest_h,
            earliest_impact_target=target,
            earliest_impact_type=target_type,
            urgency_level=urgency,
            shoreline_contact_confirmed=contact_confirmed,
            total_threatened_assets=full_res.total_affected_locations,
            timeline_counts=timeline_counts,
            alert_summary=alert_summary,
            disclaimer=full_res.disclaimer,
        )

    # ── Internal Helpers ──────────────────────────────────────────────────────

    @classmethod
    def _get_or_run_movement_prediction(
        cls,
        db: Session,
        incident_id: str,
        request: Optional[CoastalImpactPredictRequest] = None,
    ) -> MovementPredictionResponse:
        """Fetches latest Module 11 prediction or executes a fresh one."""
        if request and request.force_movement_recalculate:
            move_req = MovementPredictionRequest(
                wind_speed_ms=request.wind_speed_ms,
                wind_direction_deg=request.wind_direction_deg,
                current_speed_ms=request.current_speed_ms,
                current_direction_deg=request.current_direction_deg,
            )
            return MovementPredictionService.run_prediction(db, incident_id, move_req)

        try:
            return MovementPredictionService.get_latest_prediction(db, incident_id)
        except HTTPException:
            # Run prediction with defaults
            return MovementPredictionService.run_prediction(
                db, incident_id, MovementPredictionRequest()
            )

    @classmethod
    def _get_candidate_coastal_assets(
        cls, db: Session, inc_lat: float, inc_lon: float
    ) -> list[dict]:
        """Gathers coastal assets from static catalog and DB EnvironmentalZone records."""
        assets = list(STATIC_COASTAL_CATALOG)

        # Query Environmental Zones from DB
        db_zones = db.execute(select(EnvironmentalZone)).scalars().all()
        for z in db_zones:
            if z.latitude is None or z.longitude is None:
                continue
            # Avoid duplicate names
            if any(a["name"].lower() == z.name.lower() for a in assets):
                continue

            z_type = z.zone_type.value if hasattr(z.zone_type, "value") else str(z.zone_type)
            z_sens = z.sensitivity.value if hasattr(z.sensitivity, "value") else str(z.sensitivity)

            assets.append({
                "name": z.name,
                "type": z_type,
                "latitude": z.latitude,
                "longitude": z.longitude,
                "sensitivity": z_sens,
                "notes": f"Database environmental zone with {z_sens} sensitivity classification.",
            })

        # Also add closest coastline nodes from COASTLINE_COORDINATES
        for idx, (c_lon, c_lat) in enumerate(COASTLINE_COORDINATES):
            d = haversine_km(inc_lat, inc_lon, c_lat, c_lon)
            if d <= 300.0:  # within regional distance
                assets.append({
                    "name": f"Mainland Coastline Sector #{idx+1}",
                    "type": "COASTLINE",
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "sensitivity": "HIGH",
                    "notes": f"Coastal shoreline perimeter node at {c_lat:.2f}N, {c_lon:.2f}E.",
                })

        return assets

    @classmethod
    def _calculate_asset_impacts(
        cls,
        incident: Incident,
        movement_pred: MovementPredictionResponse,
        candidates: list[dict],
        search_buffer_km: float = 80.0,
    ) -> list[CoastalImpactItem]:
        """
        Determines which candidate assets lie near or downstream of the forecast
        trajectory and computes the estimated time until impact.
        """
        inc_lat = incident.latitude
        inc_lon = incident.longitude
        base_confidence = movement_pred.confidence or 0.85
        now_utc = datetime.now(timezone.utc)

        forecast_points = movement_pred.forecast_points or []
        if not forecast_points:
            return []

        # Average drift velocity from forecast points (km / hour)
        last_fp = forecast_points[-1]
        total_dist_km = last_fp.distance_km
        total_hours = last_fp.horizon_hours or 24.0
        avg_speed_kmh = max(0.5, total_dist_km / total_hours) if total_hours > 0 else 2.5

        affected: list[CoastalImpactItem] = []

        for asset in candidates:
            a_lat = asset["latitude"]
            a_lon = asset["longitude"]

            # Distance from spill origin
            dist_origin = haversine_km(inc_lat, inc_lon, a_lat, a_lon)

            # Find closest distance to ANY milestone point along the trajectory
            min_dist_to_trajectory = dist_origin
            closest_horizon_hours = 0.0
            closest_fp_idx = 0

            for idx, fp in enumerate(forecast_points):
                d_fp = haversine_km(fp.latitude, fp.longitude, a_lat, a_lon)
                if d_fp < min_dist_to_trajectory:
                    min_dist_to_trajectory = d_fp
                    closest_horizon_hours = fp.horizon_hours
                    closest_fp_idx = idx

            # Dynamic expansion envelope radius at closest approach
            expansion_radius_km = 3.0 + (closest_horizon_hours * 0.8)

            # Spatial screening: is target within the search buffer and advection corridor?
            # 1. Direct proximity to origin (already nearby within 15 km)
            # 2. Or within (min_dist_to_trajectory <= expansion_radius_km + tolerance)
            max_threat_radius = min(search_buffer_km, max(12.0, expansion_radius_km * 2.2))

            if min_dist_to_trajectory > max_threat_radius and dist_origin > 20.0:
                continue

            # Calculate estimated hours to impact
            # Time to travel to projected closest point + cross-track arrival
            if dist_origin <= 2.0:
                est_hours = 0.0
                spatial_relation = "IMMEDIATE_CONTACT"
            elif closest_horizon_hours > 0:
                # Interpolate based on closest forecast milestone distance and cross-track offset
                fp_ref = forecast_points[closest_fp_idx]
                est_hours = round(
                    max(0.1, closest_horizon_hours - (1.0 - min_dist_to_trajectory / max_threat_radius) * 0.5), 1
                )
                if min_dist_to_trajectory <= expansion_radius_km:
                    spatial_relation = "DIRECT_TRAJECTORY_INTERSECT"
                else:
                    spatial_relation = "DOWNWIND_APPROACHING"
            else:
                est_hours = round(dist_origin / avg_speed_kmh, 1)
                spatial_relation = "PROXIMITY_DIFFUSION"

            # Cap est_hours within reasonable boundary
            est_hours = min(36.0, max(0.0, est_hours))

            # Determine horizon label
            horizon_label = ">24H"
            for code, _, h_min, h_max in HORIZONS:
                if h_min <= est_hours < h_max:
                    horizon_label = code
                    break

            # Calculate time-decayed confidence
            time_decay = max(0.4, 1.0 - (est_hours * 0.018))
            item_confidence = round(base_confidence * time_decay, 2)

            # Impact probability (0 to 100%)
            dist_factor = max(0.0, 1.0 - (min_dist_to_trajectory / max_threat_radius))
            impact_prob = round(min(98.0, max(15.0, dist_factor * item_confidence * 100.0)), 1)

            # Severity classification based on asset sensitivity and hours to arrival
            sens = asset.get("sensitivity", "MODERATE")
            if est_hours <= 3.0 or (est_hours <= 6.0 and sens in ("CRITICAL", "HIGH")):
                item_severity = "CRITICAL"
            elif est_hours <= 12.0 or sens == "CRITICAL":
                item_severity = "HIGH"
            elif est_hours <= 24.0:
                item_severity = "MODERATE"
            else:
                item_severity = "LOW"

            # Projected impact datetime
            impact_dt = now_utc + timedelta(hours=est_hours)

            # Plain-language explanation
            target_name = asset["name"]
            target_type_clean = asset["type"].replace("_", " ").title()
            summary = (
                f"{target_name} ({target_type_clean}) is estimated to be impacted in ~{est_hours:.1f} hours "
                f"({horizon_label}). Located {min_dist_to_trajectory:.1f} km from forecast advection center "
                f"with {impact_prob:.0f}% probability."
            )

            affected.append(
                CoastalImpactItem(
                    id=str(uuid.uuid4()),
                    incident_id=incident.id,
                    target_location=target_name,
                    target_type=asset["type"],
                    latitude=a_lat,
                    longitude=a_lon,
                    distance_km=round(min_dist_to_trajectory, 1),
                    estimated_hours_to_impact=est_hours,
                    predicted_impact_time=impact_dt.isoformat(),
                    impact_horizon=horizon_label,
                    severity=item_severity,
                    confidence=item_confidence,
                    impact_probability=impact_prob,
                    prediction_source="MODULE_11_LAGRANGIAN_TRAJECTORY",
                    spatial_relation=spatial_relation,
                    summary_notes=summary,
                    is_simulated=True,
                )
            )

        # Sort primarily by estimated time to impact (earliest first), then distance
        affected.sort(key=lambda x: (x.estimated_hours_to_impact, x.distance_km))

        # Limit to top 25 most critical targets for crisp performance & UI
        return affected[:25]

    @classmethod
    def _build_timeline_summary(cls, items: list[CoastalImpactItem]) -> list[TimelineHorizonGroup]:
        """Buckets affected locations into chronological timeline groups."""
        groups: list[TimelineHorizonGroup] = []

        for code, label, _, _ in HORIZONS:
            horizon_items = [it for it in items if it.impact_horizon == code]

            highest_sev = "LOW"
            if any(it.severity == "CRITICAL" for it in horizon_items):
                highest_sev = "CRITICAL"
            elif any(it.severity == "HIGH" for it in horizon_items):
                highest_sev = "HIGH"
            elif any(it.severity == "MODERATE" for it in horizon_items):
                highest_sev = "MODERATE"

            groups.append(
                TimelineHorizonGroup(
                    horizon=code,
                    hours_label=label,
                    locations_count=len(horizon_items),
                    highest_severity=highest_sev,
                    locations=horizon_items,
                )
            )

        return groups

    @classmethod
    def _build_impact_geojson(cls, items: list[CoastalImpactItem]) -> str:
        """Serializes affected coastal locations into GeoJSON FeatureCollection."""
        features = []
        for it in items:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [it.longitude, it.latitude],
                },
                "properties": {
                    "id": it.id,
                    "target_location": it.target_location,
                    "target_type": it.target_type,
                    "estimated_hours_to_impact": it.estimated_hours_to_impact,
                    "impact_horizon": it.impact_horizon,
                    "severity": it.severity,
                    "confidence": it.confidence,
                    "impact_probability": it.impact_probability,
                    "distance_km": it.distance_km,
                },
            })

        return json.dumps({
            "type": "FeatureCollection",
            "features": features,
        })
