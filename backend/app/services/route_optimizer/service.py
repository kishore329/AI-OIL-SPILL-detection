"""
Emergency Route Optimizer Service — Module 14.

Manages emergency response vessel fleet, multi-criteria recommendation ranking
integrating Module 05 Priority Engine, nautical route optimization with shoreline
clearance, and database persistence.
"""
from __future__ import annotations

import json
import logging
import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.emergency_vessel import (
    EmergencyVessel,
    VesselPosition,
    ResponseResource,
    OptimizedRoute,
    ResponseAssignment,
)
from app.models.enums import IncidentSeverity
from app.gis.spatial_service import haversine_km
from app.services.priority_engine import PriorityEngine
from app.services.route_optimizer.geographic_provider import (
    GeographicMarineRoutingProvider,
    KM_PER_NAUTICAL_MILE,
)
from app.schemas.route_optimizer import (
    EmergencyVesselItem,
    AvailableVesselsResponse,
    NavigationalWaypoint,
    OptimizedRouteResponse,
    RecommendedVesselItem,
    RecommendedVesselsResponse,
    RouteOptimizeRequest,
)

logger = logging.getLogger(__name__)

# Baseline emergency response fleet stationed across strategic regional maritime hubs
DEFAULT_EMERGENCY_FLEET = [
    {
        "id": "vsl-icg-samudra-prahari",
        "name": "ICGS Samudra Prahari (PRV-01)",
        "vessel_type": "Dedicated Pollution Control Vessel (PCV)",
        "mmsi": "419000101",
        "callsign": "AVSP",
        "home_port": "Mumbai Port",
        "is_available": True,
        "status": "AVAILABLE",
        "capabilities": ["BOOM_DEPLOYMENT", "OIL_SKIMMING", "CHEMICAL_DISPERSANT", "OILY_WATER_SEPARATOR", "FIREFIGHTING"],
        "max_speed_knots": 21.0,
        "cruising_speed_knots": 16.5,
        "skimmer_capacity_m3h": 450.0,
        "boom_meters": 2000.0,
        "dispersant_liters": 50000.0,
        "latitude": 18.920,
        "longitude": 72.820,
        "heading_deg": 240.0,
    },
    {
        "id": "vsl-icg-shaunak",
        "name": "ICGS Shaunak (OPV-15)",
        "vessel_type": "Offshore Patrol & Pollution Control Vessel",
        "mmsi": "419000102",
        "callsign": "AVSK",
        "home_port": "Chennai Port",
        "is_available": True,
        "status": "AVAILABLE",
        "capabilities": ["BOOM_DEPLOYMENT", "OIL_SKIMMING", "CHEMICAL_DISPERSANT", "FAST_INTERCEPT"],
        "max_speed_knots": 23.5,
        "cruising_speed_knots": 18.0,
        "skimmer_capacity_m3h": 300.0,
        "boom_meters": 1400.0,
        "dispersant_liters": 25000.0,
        "latitude": 13.080,
        "longitude": 80.310,
        "heading_deg": 90.0,
    },
    {
        "id": "vsl-icg-varaha",
        "name": "ICGS Varaha (OPV-41)",
        "vessel_type": "Offshore Patrol Vessel",
        "mmsi": "419000103",
        "callsign": "AVVR",
        "home_port": "Cochin Port",
        "is_available": True,
        "status": "AVAILABLE",
        "capabilities": ["BOOM_DEPLOYMENT", "OIL_SKIMMING", "SALVAGE_TOW", "THERMAL_NIGHT_SAR"],
        "max_speed_knots": 22.0,
        "cruising_speed_knots": 16.0,
        "skimmer_capacity_m3h": 220.0,
        "boom_meters": 1100.0,
        "dispersant_liters": 18000.0,
        "latitude": 9.960,
        "longitude": 76.240,
        "heading_deg": 270.0,
    },
    {
        "id": "vsl-icg-vigraha",
        "name": "ICGS Vigraha (OPV-39)",
        "vessel_type": "Offshore Patrol Vessel",
        "mmsi": "419000104",
        "callsign": "AVVG",
        "home_port": "Visakhapatnam Port",
        "is_available": True,
        "status": "AVAILABLE",
        "capabilities": ["BOOM_DEPLOYMENT", "OIL_SKIMMING", "CHEMICAL_DISPERSANT", "HELIDECK_SPRAY"],
        "max_speed_knots": 23.0,
        "cruising_speed_knots": 17.5,
        "skimmer_capacity_m3h": 280.0,
        "boom_meters": 1300.0,
        "dispersant_liters": 22000.0,
        "latitude": 17.680,
        "longitude": 83.310,
        "heading_deg": 120.0,
    },
    {
        "id": "vsl-icg-rajdhwaj",
        "name": "ICGS Rajdhwaj (FPV-84)",
        "vessel_type": "Fast Patrol Interceptor",
        "mmsi": "419000105",
        "callsign": "AVRD",
        "home_port": "Kamarajar Port (Ennore)",
        "is_available": True,
        "status": "AVAILABLE",
        "capabilities": ["FAST_INTERCEPT", "BOOM_DEPLOYMENT", "THERMAL_NIGHT_SAR"],
        "max_speed_knots": 34.0,
        "cruising_speed_knots": 25.0,
        "skimmer_capacity_m3h": 120.0,
        "boom_meters": 600.0,
        "dispersant_liters": 8000.0,
        "latitude": 13.250,
        "longitude": 80.350,
        "heading_deg": 45.0,
    },
    {
        "id": "vsl-sci-mukta",
        "name": "SCI Urja (OSV)",
        "vessel_type": "Offshore Supply & Skimming Vessel",
        "mmsi": "419000106",
        "callsign": "AWSC",
        "home_port": "Deendayal Port (Kandla)",
        "is_available": True,
        "status": "AVAILABLE",
        "capabilities": ["OIL_SKIMMING", "BOOM_DEPLOYMENT", "OILY_WATER_SEPARATOR"],
        "max_speed_knots": 14.5,
        "cruising_speed_knots": 11.5,
        "skimmer_capacity_m3h": 380.0,
        "boom_meters": 1800.0,
        "dispersant_liters": 30000.0,
        "latitude": 22.980,
        "longitude": 70.180,
        "heading_deg": 180.0,
    },
    {
        "id": "vsl-tug-malviya",
        "name": "Ocean Salvage Tug Malviya 9",
        "vessel_type": "Emergency Salvage & Towing Tug",
        "mmsi": "419000107",
        "callsign": "ATML",
        "home_port": "Paradip Port",
        "is_available": True,
        "status": "AVAILABLE",
        "capabilities": ["SALVAGE_TOW", "FIREFIGHTING", "BOOM_DEPLOYMENT"],
        "max_speed_knots": 14.0,
        "cruising_speed_knots": 11.0,
        "skimmer_capacity_m3h": 150.0,
        "boom_meters": 900.0,
        "dispersant_liters": 12000.0,
        "latitude": 20.250,
        "longitude": 86.690,
        "heading_deg": 90.0,
    },
    {
        "id": "vsl-icg-samarth-goa",
        "name": "ICGS Samarth (OPV-11)",
        "vessel_type": "Advanced Offshore Patrol Vessel",
        "mmsi": "419000108",
        "callsign": "AVSM",
        "home_port": "Mormugao Port (Goa)",
        "is_available": True,
        "status": "AVAILABLE",
        "capabilities": ["BOOM_DEPLOYMENT", "OIL_SKIMMING", "CHEMICAL_DISPERSANT", "SALVAGE_TOW"],
        "max_speed_knots": 21.5,
        "cruising_speed_knots": 16.0,
        "skimmer_capacity_m3h": 320.0,
        "boom_meters": 1500.0,
        "dispersant_liters": 25000.0,
        "latitude": 15.410,
        "longitude": 73.780,
        "heading_deg": 300.0,
    },
    {
        "id": "vsl-icg-kanaklata-andaman",
        "name": "ICGS Kanaklata Barua (FPV-55)",
        "vessel_type": "Fast Patrol Interceptor",
        "mmsi": "419000109",
        "callsign": "AVKB",
        "home_port": "Port Blair Marine Terminal",
        "is_available": True,
        "status": "AVAILABLE",
        "capabilities": ["FAST_INTERCEPT", "BOOM_DEPLOYMENT", "THERMAL_NIGHT_SAR"],
        "max_speed_knots": 33.0,
        "cruising_speed_knots": 24.0,
        "skimmer_capacity_m3h": 140.0,
        "boom_meters": 700.0,
        "dispersant_liters": 10000.0,
        "latitude": 11.660,
        "longitude": 92.730,
        "heading_deg": 180.0,
    },
    {
        "id": "vsl-drydock-maintenance",
        "name": "ICGS Sankalp (Drydock Overhaul)",
        "vessel_type": "Offshore Patrol Vessel",
        "mmsi": "419000110",
        "callsign": "AVSK9",
        "home_port": "Cochin Shipyard",
        "is_available": False,
        "status": "MAINTENANCE",
        "capabilities": ["BOOM_DEPLOYMENT", "OIL_SKIMMING"],
        "max_speed_knots": 22.0,
        "cruising_speed_knots": 16.0,
        "skimmer_capacity_m3h": 250.0,
        "boom_meters": 1200.0,
        "dispersant_liters": 20000.0,
        "latitude": 9.940,
        "longitude": 76.280,
        "heading_deg": 0.0,
    },
]


class EmergencyRouteOptimizerService:
    """Service managing fleet status, recommendation scoring, and route optimization."""

    @classmethod
    def seed_fleet_if_empty(cls, db: Session) -> None:
        """Populates the default emergency response fleet in PostgreSQL if table is empty."""
        existing_count = db.execute(select(EmergencyVessel)).scalars().all()
        if existing_count:
            return

        now_utc = datetime.now(timezone.utc)
        for v in DEFAULT_EMERGENCY_FLEET:
            vessel = EmergencyVessel(
                id=v["id"],
                name=v["name"],
                vessel_type=v["vessel_type"],
                mmsi=v["mmsi"],
                callsign=v["callsign"],
                home_port=v["home_port"],
                is_available=v["is_available"],
                status=v["status"],
                capabilities_json=json.dumps(v["capabilities"]),
                max_speed_knots=v["max_speed_knots"],
                cruising_speed_knots=v["cruising_speed_knots"],
                skimmer_capacity_m3h=v["skimmer_capacity_m3h"],
                boom_meters=v["boom_meters"],
                dispersant_liters=v["dispersant_liters"],
                latitude=v["latitude"],
                longitude=v["longitude"],
                heading_deg=v["heading_deg"],
                created_at=now_utc,
                updated_at=now_utc,
            )
            db.add(vessel)
        db.commit()

    @classmethod
    def get_available_vessels(cls, db: Session, only_available: bool = False) -> AvailableVesselsResponse:
        """Returns fleet vessels with availability and equipment status."""
        cls.seed_fleet_if_empty(db)

        stmt = select(EmergencyVessel)
        if only_available:
            stmt = stmt.where(EmergencyVessel.is_available == True)  # noqa: E712

        vessels = db.execute(stmt).scalars().all()
        items = [cls._to_schema_item(v) for v in vessels]
        avail_count = sum(1 for v in items if v.is_available)

        return AvailableVesselsResponse(
            total=len(items),
            available_count=avail_count,
            vessels=items,
        )

    @classmethod
    def recommend_vessels(cls, db: Session, incident_id: str) -> RecommendedVesselsResponse:
        """
        Ranks available response vessels for an incident using multi-criteria scoring
        integrated with Module 05 Priority Engine urgency.
        """
        cls.seed_fleet_if_empty(db)

        incident = db.get(Incident, incident_id)
        if not incident or not incident.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        inc_lat = incident.latitude or 13.0
        inc_lon = incident.longitude or 80.3

        # Compute incident priority score from Module 05 Priority Engine
        dist_coast = PriorityEngine.calculate_distance_to_coastline(inc_lat, inc_lon)
        priority_score, factors, urgency_level, _ = PriorityEngine.evaluate_priority(
            risk_score=incident.risk_score or 50.0,
            severity=incident.severity or IncidentSeverity.MODERATE,
            status=incident.status,
            spill_area_km2=incident.spill_area_km2 or 10.0,
            distance_coastline_km=dist_coast,
        )

        is_critical_urgency = (incident.severity == IncidentSeverity.CRITICAL or priority_score >= 65.0)

        # Get available vessels
        available_vessels = (
            db.execute(select(EmergencyVessel).where(EmergencyVessel.is_available == True))  # noqa: E712
            .scalars()
            .all()
        )

        if not available_vessels:
            # Fallback to all vessels if none marked available
            available_vessels = db.execute(select(EmergencyVessel)).scalars().all()

        routing_provider = GeographicMarineRoutingProvider()
        scored_items: list[RecommendedVesselItem] = []

        for v in available_vessels:
            # Calculate preliminary transit distance
            route_res = routing_provider.calculate_route(
                origin=(v.latitude, v.longitude),
                destination=(inc_lat, inc_lon),
                vessel=v,
                incident_priority="CRITICAL" if is_critical_urgency else "ROUTINE",
            )

            dist_nm = route_res.distance_nm
            travel_hours = route_res.travel_time_hours

            # Multi-criteria scoring components (0 to 100):
            # 1. Proximity & ETA Score (40%): 1 hour = 100, 24 hours = 0
            eta_score = max(5.0, min(100.0, (1.0 - (travel_hours / 24.0)) * 100.0))

            # 2. Containment Equipment Fit (30%): Booms (max 2000m) + Skimmers (max 450 m3/h)
            equipment_score = min(
                100.0,
                ((v.boom_meters / 2000.0) * 50.0) + ((v.skimmer_capacity_m3h / 450.0) * 50.0),
            )

            # 3. Speed & Vessel Intercept Performance (20%):
            effective_speed = v.max_speed_knots if is_critical_urgency else v.cruising_speed_knots
            speed_score = min(100.0, (effective_speed / 34.0) * 100.0)

            # 4. Urgency Priority Boost (10%):
            # If critical, bonus for fast patrol/interceptor and high skimmer vessels
            urgency_score = 90.0 if (is_critical_urgency and (v.max_speed_knots >= 23.0 or v.skimmer_capacity_m3h >= 300.0)) else 60.0

            total_suitability = round(
                (0.40 * eta_score) + (0.30 * equipment_score) + (0.20 * speed_score) + (0.10 * urgency_score),
                1,
            )

            # Equipment match list
            caps = json.loads(v.capabilities_json) if v.capabilities_json else []
            match_tags = []
            if v.boom_meters >= 1000:
                match_tags.append(f"Heavy Containment Boom ({v.boom_meters:.0f}m)")
            elif v.boom_meters > 0:
                match_tags.append(f"Containment Boom ({v.boom_meters:.0f}m)")

            if v.skimmer_capacity_m3h >= 300:
                match_tags.append(f"High-Volume Skimmer ({v.skimmer_capacity_m3h:.0f} m³/h)")
            elif v.skimmer_capacity_m3h > 0:
                match_tags.append(f"Oil Skimmer ({v.skimmer_capacity_m3h:.0f} m³/h)")

            if v.dispersant_liters >= 20000:
                match_tags.append(f"Chemical Dispersant ({v.dispersant_liters:.0f}L)")

            if "FAST_INTERCEPT" in caps:
                match_tags.append("High-Speed Interceptor")

            # Plain-language rationale
            if travel_hours <= 2.5:
                time_desc = f"rapid on-scene arrival in ~{travel_hours:.1f}h ({dist_nm:.1f} NM)"
            elif travel_hours <= 6.0:
                time_desc = f"arrival in ~{travel_hours:.1f}h ({dist_nm:.1f} NM)"
            else:
                time_desc = f"long-range transit of ~{travel_hours:.1f}h ({dist_nm:.1f} NM)"

            rationale = (
                f"Stationed at {v.home_port}; provides {time_desc} with {v.boom_meters:.0f}m boom and "
                f"{v.skimmer_capacity_m3h:.0f} m³/h skimming capability. Overall equipment suitability: {total_suitability:.0f}%."
            )

            scored_items.append(
                RecommendedVesselItem(
                    vessel=cls._to_schema_item(v),
                    rank=1,  # Will update after sort
                    suitability_score=total_suitability,
                    estimated_distance_nm=dist_nm,
                    estimated_travel_time_hours=travel_hours,
                    suitability_rationale=rationale,
                    equipment_match=match_tags,
                    response_priority="PRIMARY_DISPATCH",
                )
            )

        # Sort descending by suitability score
        scored_items.sort(key=lambda x: x.suitability_score, reverse=True)

        for idx, it in enumerate(scored_items):
            it.rank = idx + 1
            if idx == 0:
                it.response_priority = "PRIMARY_DISPATCH"
            elif idx in (1, 2):
                it.response_priority = "BACKUP_DISPATCH"
            else:
                it.response_priority = "STANDBY"

        return RecommendedVesselsResponse(
            incident_id=incident.id,
            incident_code=incident.incident_code,
            incident_severity=incident.severity.value if hasattr(incident.severity, "value") else str(incident.severity),
            incident_priority_score=priority_score,
            total_vessels_evaluated=len(scored_items),
            recommendations=scored_items,
        )

    @classmethod
    def optimize_route(
        cls,
        db: Session,
        incident_id: str,
        request: Optional[RouteOptimizeRequest] = None,
    ) -> OptimizedRouteResponse:
        """
        Calculates and persists the optimized nautical route for the chosen emergency vessel.
        """
        cls.seed_fleet_if_empty(db)

        incident = db.get(Incident, incident_id)
        if not incident or not incident.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        inc_lat = incident.latitude or 13.05
        inc_lon = incident.longitude or 80.28

        # 1. Resolve target vessel
        vessel: Optional[EmergencyVessel] = None
        if request and request.vessel_id:
            vessel = db.get(EmergencyVessel, request.vessel_id)
            if not vessel:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Emergency vessel '{request.vessel_id}' not found.",
                )
        else:
            # Recommend top vessel
            recs = cls.recommend_vessels(db, incident_id)
            if recs.recommendations:
                top_id = recs.recommendations[0].vessel.id
                vessel = db.get(EmergencyVessel, top_id)

        if not vessel:
            # Fallback to first vessel in fleet
            vessel = db.execute(select(EmergencyVessel)).scalars().first()

        # 2. Run Route Optimizer Provider
        provider = GeographicMarineRoutingProvider()
        inc_sev = incident.severity.value if hasattr(incident.severity, "value") else str(incident.severity)
        weather_penalty = request.weather_penalty if request and request.weather_penalty else 1.05

        route_result = provider.calculate_route(
            origin=(vessel.latitude, vessel.longitude),
            destination=(inc_lat, inc_lon),
            vessel=vessel,
            incident_priority=inc_sev,
            weather_penalty=weather_penalty,
            avoid_restricted_zones=request.avoid_restricted_zones if request else True,
        )

        now_utc = datetime.now(timezone.utc)
        arrival_dt = now_utc + timedelta(hours=route_result.travel_time_hours)

        # 3. Persist OptimizedRoute to DB
        route_id = str(uuid.uuid4())
        db_route = OptimizedRoute(
            id=route_id,
            incident_id=incident.id,
            vessel_id=vessel.id,
            start_latitude=vessel.latitude,
            start_longitude=vessel.longitude,
            destination_latitude=inc_lat,
            destination_longitude=inc_lon,
            estimated_distance_nm=route_result.distance_nm,
            estimated_distance_km=route_result.distance_km,
            estimated_travel_time_hours=route_result.travel_time_hours,
            estimated_arrival_time=arrival_dt,
            route_geometry_geojson=route_result.route_geometry_geojson,
            waypoints_json=json.dumps(route_result.waypoints),
            routing_provider=route_result.provider_name,
            route_confidence=route_result.confidence,
            weather_delay_factor=route_result.weather_delay_factor,
            urgency_rating=route_result.urgency_rating,
            avoided_restricted_zones_json=json.dumps(route_result.avoided_zones),
            created_at=now_utc,
        )
        db.add(db_route)

        # 4. Record ResponseAssignment
        assignment = ResponseAssignment(
            id=str(uuid.uuid4()),
            incident_id=incident.id,
            vessel_id=vessel.id,
            route_id=route_id,
            status="RECOMMENDED",
            recommendation_rank=1,
            suitability_score=88.5,
            suitability_rationale=f"Optimized route computed via {route_result.provider_name} with {route_result.travel_time_hours:.1f}h ETA.",
            assigned_by="route_optimizer_engine",
            created_at=now_utc,
        )
        db.add(assignment)
        db.commit()

        # Build waypoints schema
        waypoints_schema = [
            NavigationalWaypoint(
                index=wp["index"],
                name=wp["name"],
                latitude=wp["latitude"],
                longitude=wp["longitude"],
                leg_distance_nm=wp["leg_distance_nm"],
                cumulative_distance_nm=wp["cumulative_distance_nm"],
                leg_eta_hours=wp["leg_eta_hours"],
                waypoint_type=wp.get("waypoint_type", "CLEARANCE_WAYPOINT"),
            )
            for wp in route_result.waypoints
        ]

        return OptimizedRouteResponse(
            id=route_id,
            incident_id=incident.id,
            incident_code=incident.incident_code,
            vessel=cls._to_schema_item(vessel),
            start_latitude=vessel.latitude,
            start_longitude=vessel.longitude,
            destination_latitude=inc_lat,
            destination_longitude=inc_lon,
            estimated_distance_nm=route_result.distance_nm,
            estimated_distance_km=route_result.distance_km,
            estimated_travel_time_hours=route_result.travel_time_hours,
            estimated_arrival_time=arrival_dt.isoformat(),
            route_geometry_geojson=route_result.route_geometry_geojson,
            waypoints=waypoints_schema,
            routing_provider=route_result.provider_name,
            route_confidence=route_result.confidence,
            weather_delay_factor=route_result.weather_delay_factor,
            urgency_rating=route_result.urgency_rating,
            avoided_restricted_zones=route_result.avoided_zones,
            created_at=now_utc.isoformat(),
        )

    @classmethod
    def get_vessel_route(cls, db: Session, vessel_id: str) -> OptimizedRouteResponse:
        """Retrieves the latest calculated route for a specific emergency vessel."""
        vessel = db.get(EmergencyVessel, vessel_id)
        if not vessel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Emergency vessel '{vessel_id}' not found.",
            )

        q = (
            select(OptimizedRoute)
            .where(OptimizedRoute.vessel_id == vessel_id)
            .order_by(OptimizedRoute.created_at.desc())
        )
        db_route = db.execute(q).scalars().first()

        if not db_route:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active optimized route found for vessel '{vessel_id}'.",
            )

        incident = db.get(Incident, db_route.incident_id)
        inc_code = incident.incident_code if incident else "INC-UNKNOWN"

        waypoints_data = json.loads(db_route.waypoints_json) if db_route.waypoints_json else []
        waypoints_schema = [
            NavigationalWaypoint(
                index=wp["index"],
                name=wp["name"],
                latitude=wp["latitude"],
                longitude=wp["longitude"],
                leg_distance_nm=wp["leg_distance_nm"],
                cumulative_distance_nm=wp["cumulative_distance_nm"],
                leg_eta_hours=wp["leg_eta_hours"],
                waypoint_type=wp.get("waypoint_type", "CLEARANCE_WAYPOINT"),
            )
            for wp in waypoints_data
        ]

        avoided_zones = json.loads(db_route.avoided_restricted_zones_json) if db_route.avoided_restricted_zones_json else []

        return OptimizedRouteResponse(
            id=str(db_route.id),
            incident_id=str(db_route.incident_id),
            incident_code=inc_code,
            vessel=cls._to_schema_item(vessel),
            start_latitude=db_route.start_latitude,
            start_longitude=db_route.start_longitude,
            destination_latitude=db_route.destination_latitude,
            destination_longitude=db_route.destination_longitude,
            estimated_distance_nm=db_route.estimated_distance_nm,
            estimated_distance_km=db_route.estimated_distance_km,
            estimated_travel_time_hours=db_route.estimated_travel_time_hours,
            estimated_arrival_time=db_route.estimated_arrival_time.isoformat(),
            route_geometry_geojson=db_route.route_geometry_geojson,
            waypoints=waypoints_schema,
            routing_provider=db_route.routing_provider,
            route_confidence=db_route.route_confidence,
            weather_delay_factor=db_route.weather_delay_factor,
            urgency_rating=db_route.urgency_rating,
            avoided_restricted_zones=avoided_zones,
            disclaimer=db_route.disclaimer,
            created_at=db_route.created_at.isoformat(),
        )

    # ── Helpers ──

    @staticmethod
    def _to_schema_item(v: EmergencyVessel) -> EmergencyVesselItem:
        caps = json.loads(v.capabilities_json) if v.capabilities_json else []
        return EmergencyVesselItem(
            id=v.id,
            name=v.name,
            vessel_type=v.vessel_type,
            mmsi=v.mmsi,
            callsign=v.callsign,
            home_port=v.home_port,
            is_available=v.is_available,
            status=v.status,
            capabilities=caps,
            max_speed_knots=v.max_speed_knots,
            cruising_speed_knots=v.cruising_speed_knots,
            skimmer_capacity_m3h=v.skimmer_capacity_m3h,
            boom_meters=v.boom_meters,
            dispersant_liters=v.dispersant_liters,
            latitude=v.latitude,
            longitude=v.longitude,
            heading_deg=v.heading_deg or 0.0,
            assigned_incident_id=str(v.assigned_incident_id) if v.assigned_incident_id else None,
        )
