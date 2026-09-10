"""
PriorityEngine — Deterministic incident priority dispatch ranking for oil spill response.
Ranks active incidents from highest operational urgency (#1) downward using a multi-factor
decision formula (0-100) combining risk, shoreline ETA, environmental sensitivity, spill size, and status.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.environmental_zone import EnvironmentalZone
from app.models.enums import IncidentSeverity, IncidentStatus, ZoneType
from app.gis.spatial_service import haversine_km, COASTLINE_COORDINATES
from app.schemas.priority import (
    PriorityRankItem,
    PriorityQueueResponse,
    PriorityFactorsSummary,
    PriorityRankSimulationItem,
)

logger = logging.getLogger(__name__)

# Assumed average oceanic surface slick drift velocity (wind + tidal current)
DEFAULT_DRIFT_SPEED_KMH = 2.5


class PriorityEngine:
    """Deterministic, explainable operational priority engine."""

    @staticmethod
    def calculate_distance_to_coastline(lat: float, lon: float) -> float:
        """Find minimum distance from coordinates to reference coastline nodes."""
        min_dist = float("inf")
        for c_lat, c_lon in COASTLINE_COORDINATES:
            d = haversine_km(lat, lon, c_lat, c_lon)
            if d < min_dist:
                min_dist = d
        return round(min_dist, 2)

    @staticmethod
    def calculate_coastline_eta_hours(distance_km: float, drift_speed_kmh: float = DEFAULT_DRIFT_SPEED_KMH) -> float:
        """Calculate estimated hours until shoreline impact given surface drift velocity."""
        if distance_km <= 0:
            return 0.0
        return round(distance_km / drift_speed_kmh, 1)

    @classmethod
    def evaluate_priority(
        cls,
        risk_score: float,
        severity: IncidentSeverity,
        status: IncidentStatus,
        spill_area_km2: float,
        distance_coastline_km: float,
        distance_protected_km: Optional[float] = None,
        distance_fishing_km: Optional[float] = None,
        custom_eta_hours: Optional[float] = None,
    ) -> tuple[float, PriorityFactorsSummary, str, str]:
        """
        Calculates normalized priority score (0-100), factors breakdown, urgency classification, and plain-language reason.
        """
        # 1. Risk Score Component (Max 35 pts)
        risk_norm = max(0.0, min(100.0, risk_score))
        risk_comp = round((risk_norm / 100.0) * 35.0, 1)

        # 2. Urgency & Coastline ETA Component (Max 25 pts)
        coast_dist = max(0.0, distance_coastline_km)
        eta_hours = custom_eta_hours if custom_eta_hours is not None else cls.calculate_coastline_eta_hours(coast_dist)
        if coast_dist <= 5.0 or eta_hours <= 2.0:
            urgency_comp = 25.0
        elif coast_dist <= 15.0 or eta_hours <= 6.0:
            urgency_comp = 22.0
        elif coast_dist <= 30.0 or eta_hours <= 12.0:
            urgency_comp = 18.0
        elif coast_dist <= 50.0 or eta_hours <= 20.0:
            urgency_comp = 13.0
        elif coast_dist <= 80.0:
            urgency_comp = 8.0
        else:
            urgency_comp = 3.0

        # 3. Environmental & Ecological Sensitivity (Max 15 pts)
        env_dists = [d for d in [distance_protected_km, distance_fishing_km] if d is not None]
        min_env_dist = min(env_dists) if env_dists else 50.0

        if min_env_dist <= 8.0:
            env_comp = 15.0
        elif min_env_dist <= 20.0:
            env_comp = 12.0
        elif min_env_dist <= 40.0:
            env_comp = 8.0
        elif min_env_dist <= 70.0:
            env_comp = 4.0
        else:
            env_comp = 1.0

        # 4. Spill Magnitude Component (Max 15 pts)
        area = max(0.0, spill_area_km2)
        if area >= 50.0:
            size_comp = 15.0
        elif area >= 25.0:
            size_comp = 12.5
        elif area >= 10.0:
            size_comp = 9.0
        elif area >= 3.0:
            size_comp = 6.0
        elif area >= 0.5:
            size_comp = 3.5
        else:
            size_comp = 1.0

        # 5. Operational Status Urgency Multiplier (Max 10 pts)
        status_weights = {
            IncidentStatus.DETECTED: 10.0,
            IncidentStatus.VERIFIED: 9.5,
            IncidentStatus.PRIORITIZED: 9.0,
            IncidentStatus.RESPONSE_IN_PROGRESS: 8.5,
            IncidentStatus.ASSIGNED: 7.5,
            IncidentStatus.CONTAINMENT: 4.0,
            IncidentStatus.MONITORING: 2.0,
            IncidentStatus.RESOLVED: 0.0,
        }
        status_comp = status_weights.get(status, 5.0)

        # Sum total (deterministic normalized 0-100)
        total_priority = round(
            min(100.0, max(0.0, risk_comp + urgency_comp + env_comp + size_comp + status_comp)),
            1,
        )

        # Urgency classification
        if total_priority >= 80.0:
            urgency_level = "IMMEDIATE"
        elif total_priority >= 60.0:
            urgency_level = "HIGH"
        elif total_priority >= 40.0:
            urgency_level = "ELEVATED"
        else:
            urgency_level = "ROUTINE"

        factors = PriorityFactorsSummary(
            risk_score_component=risk_comp,
            urgency_eta_component=urgency_comp,
            environmental_component=env_comp,
            spill_size_component=size_comp,
            status_urgency_component=status_comp,
        )

        # Plain language rationale
        reasons_list = []
        if risk_score >= 76.0:
            reasons_list.append(f"critical hazard risk ({risk_score:.1f}/100)")
        elif risk_score >= 51.0:
            reasons_list.append(f"high hazard risk ({risk_score:.1f}/100)")

        if eta_hours <= 12.0:
            reasons_list.append(f"imminent shoreline impact ETA of ~{eta_hours:.1f}h ({coast_dist:.1f} km)")
        elif coast_dist <= 30.0:
            reasons_list.append(f"close coastal proximity ({coast_dist:.1f} km)")

        if area >= 20.0:
            reasons_list.append(f"massive spill surface area ({area:.1f} km²)")
        elif area >= 5.0:
            reasons_list.append(f"substantial slick volume ({area:.1f} km²)")

        if min_env_dist <= 20.0:
            reasons_list.append(f"proximity to sensitive marine habitat ({min_env_dist:.1f} km)")

        if status == IncidentStatus.DETECTED:
            reasons_list.append("unverified fresh SAR alert requiring immediate containment dispatch")
        elif status == IncidentStatus.RESPONSE_IN_PROGRESS:
            reasons_list.append("active response operations underway")

        if not reasons_list:
            reasons_list.append(f"routine monitoring parameters ({area:.1f} km², {coast_dist:.1f} km offshore)")

        reason_str = f"{urgency_level} priority: Driven by " + ", and ".join(reasons_list) + "."

        return total_priority, factors, urgency_level, reason_str

    @classmethod
    def rank_incidents(
        cls,
        db: Session,
        limit: int = 50,
        include_resolved: bool = False,
        min_priority: float = 0.0,
    ) -> PriorityQueueResponse:
        """
        Extracts active incidents from DB, computes priority scores and ETAs,
        applies deterministic tie-breaking, and returns ranked queue.
        """
        # 1. Fetch incidents
        stmt = select(Incident)
        if not include_resolved:
            stmt = stmt.where(
                Incident.is_active == True,  # noqa: E712
                Incident.status != IncidentStatus.RESOLVED,
            )
        incidents = db.execute(stmt).scalars().all()

        # 2. Fetch environmental zones for spatial distance checking
        zones = db.execute(select(EnvironmentalZone)).scalars().all()
        protected_zones = [z for z in zones if z.zone_type == ZoneType.PROTECTED_AREA and z.latitude and z.longitude]
        fishing_zones = [z for z in zones if z.zone_type == ZoneType.FISHING_ZONE and z.latitude and z.longitude]

        evaluated_items = []
        for inc in incidents:
            lat = inc.latitude or 12.0
            lon = inc.longitude or 80.0

            # Shoreline distance & ETA (refined by Module 13 if available)
            dist_coast = cls.calculate_distance_to_coastline(lat, lon)
            pred_eta = None
            if hasattr(inc, "coastal_impact_predictions") and inc.coastal_impact_predictions:
                pred_eta = min((p.estimated_hours_to_impact for p in inc.coastal_impact_predictions), default=None)
            eta_hours = pred_eta if pred_eta is not None else cls.calculate_coastline_eta_hours(dist_coast)

            # Protected area min distance
            dist_prot = None
            if protected_zones:
                dist_prot = min(haversine_km(lat, lon, p.latitude, p.longitude) for p in protected_zones)

            # Fishing zone min distance
            dist_fish = None
            if fishing_zones:
                dist_fish = min(haversine_km(lat, lon, f.latitude, f.longitude) for f in fishing_zones)

            # Evaluate priority score
            priority_score, factors, urgency_level, reason = cls.evaluate_priority(
                risk_score=inc.risk_score or 50.0,
                severity=inc.severity,
                status=inc.status,
                spill_area_km2=inc.spill_area_km2 or 1.0,
                distance_coastline_km=dist_coast,
                distance_protected_km=dist_prot,
                distance_fishing_km=dist_fish,
                custom_eta_hours=pred_eta,
            )

            if priority_score >= min_priority:
                evaluated_items.append({
                    "incident": inc,
                    "priority_score": priority_score,
                    "risk_score": inc.risk_score or 50.0,
                    "distance_coastline_km": dist_coast,
                    "coastline_eta_hours": eta_hours,
                    "urgency_level": urgency_level,
                    "reason": reason,
                    "factors": factors,
                })

        # 3. Deterministic Sorting & Tie-Breaking
        # Order by:
        #  1) priority_score DESC
        #  2) risk_score DESC
        #  3) coastline_eta_hours ASC (closest to shore first)
        #  4) spill_area_km2 DESC
        #  5) detected_at ASC (earliest detected first)
        evaluated_items.sort(
            key=lambda item: (
                -item["priority_score"],
                -item["risk_score"],
                item["coastline_eta_hours"] if item["coastline_eta_hours"] is not None else 999.0,
                -(item["incident"].spill_area_km2 or 0.0),
                item["incident"].detected_at.timestamp() if item["incident"].detected_at else 0.0,
            )
        )

        # Slice limit
        sliced = evaluated_items[:limit]

        # 4. Build output rank items
        rank_items: list[PriorityRankItem] = []
        for idx, item in enumerate(sliced, start=1):
            inc = item["incident"]
            # Prepend rank explainability
            rank_reason = f"Rank #{idx} — " + item["reason"]

            rank_items.append(
                PriorityRankItem(
                    rank=idx,
                    incident_id=inc.id,
                    incident_code=inc.incident_code,
                    priority_score=item["priority_score"],
                    risk_score=item["risk_score"],
                    severity=inc.severity,
                    status=inc.status,
                    spill_area_km2=inc.spill_area_km2,
                    latitude=inc.latitude,
                    longitude=inc.longitude,
                    distance_coastline_km=item["distance_coastline_km"],
                    coastline_eta_hours=item["coastline_eta_hours"],
                    urgency_level=item["urgency_level"],
                    reason=rank_reason,
                    factors=item["factors"],
                    detected_at=inc.detected_at,
                )
            )

        highest_code = rank_items[0].incident_code if rank_items else None

        return PriorityQueueResponse(
            total_active=len(incidents),
            queue_length=len(rank_items),
            highest_priority_incident=highest_code,
            items=rank_items,
            generated_at=datetime.now(timezone.utc),
        )

    @classmethod
    def rank_simulation(cls, items: list[PriorityRankSimulationItem]) -> PriorityQueueResponse:
        """
        Ranks an arbitrary simulation list of incidents without querying the database.
        """
        evaluated = []
        for sim in items:
            dist_coast = (
                sim.distance_coastline_km
                if sim.distance_coastline_km is not None
                else cls.calculate_distance_to_coastline(sim.latitude, sim.longitude)
            )
            eta_hours = cls.calculate_coastline_eta_hours(dist_coast)

            priority_score, factors, urgency_level, reason = cls.evaluate_priority(
                risk_score=sim.risk_score,
                severity=sim.severity,
                status=sim.status,
                spill_area_km2=sim.spill_area_km2,
                distance_coastline_km=dist_coast,
                distance_protected_km=sim.distance_protected_area_km,
                distance_fishing_km=sim.distance_fishing_zone_km,
            )

            evaluated.append({
                "sim": sim,
                "priority_score": priority_score,
                "risk_score": sim.risk_score,
                "distance_coastline_km": dist_coast,
                "coastline_eta_hours": eta_hours,
                "urgency_level": urgency_level,
                "reason": reason,
                "factors": factors,
            })

        # Deterministic sorting
        evaluated.sort(
            key=lambda item: (
                -item["priority_score"],
                -item["risk_score"],
                item["coastline_eta_hours"] if item["coastline_eta_hours"] is not None else 999.0,
                -(item["sim"].spill_area_km2 or 0.0),
            )
        )

        rank_items: list[PriorityRankItem] = []
        for idx, item in enumerate(evaluated, start=1):
            s = item["sim"]
            rank_reason = f"Rank #{idx} — " + item["reason"]
            rank_items.append(
                PriorityRankItem(
                    rank=idx,
                    incident_id=s.incident_id or f"sim-{idx}",
                    incident_code=s.incident_code,
                    priority_score=item["priority_score"],
                    risk_score=item["risk_score"],
                    severity=s.severity,
                    status=s.status,
                    spill_area_km2=s.spill_area_km2,
                    latitude=s.latitude,
                    longitude=s.longitude,
                    distance_coastline_km=item["distance_coastline_km"],
                    coastline_eta_hours=item["coastline_eta_hours"],
                    urgency_level=item["urgency_level"],
                    reason=rank_reason,
                    factors=item["factors"],
                )
            )

        highest = rank_items[0].incident_code if rank_items else None
        return PriorityQueueResponse(
            total_active=len(items),
            queue_length=len(rank_items),
            highest_priority_incident=highest,
            items=rank_items,
            generated_at=datetime.now(timezone.utc),
        )
