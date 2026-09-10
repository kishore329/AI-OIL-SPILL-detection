"""
Resource Allocation Scoring Engine — Module 16.
Computes multi-factor explainable allocation scores (0 to 100) based on:
  1. Capability Match (0-30 pts): Matches equipment to incident cleanup strategies
  2. Proximity & ETA (0-30 pts): Haversine distance, speed, and mobilization time
  3. Incident Priority Boost (0-25 pts): Urgency from Module 05 Priority Engine
  4. Risk Severity Weight (0-15 pts): Hazard severity from Module 04 Risk Assessment
"""
import json
import math
from typing import Optional, Any


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance in km between two lat/lon coordinates."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class ResourceAllocationEngine:
    """Multi-criteria explainable scoring engine for incident resource allocation."""

    # Strategic capability keywords mapped to cleanup response actions
    STRATEGY_CAPABILITY_MAP = {
        "CONTAINMENT_BOOM": ["BOOM_DEPLOYMENT", "SHORELINE_PROTECTION", "DEFLECTION_BOOM", "EXCLUSION_BOOM"],
        "SKIMMER_VESSEL": ["OIL_SKIMMING", "MECHANICAL_RECOVERY", "OLEOPHILIC_BRUSH", "WEIR_SKIMMING"],
        "RESPONSE_VESSEL": ["POLLUTION_RESPONSE", "BOOM_TOWING", "VESSEL_DISPATCH", "COMMAND_VESSEL"],
        "ABSORBENT_MATERIALS": ["ABSORBENT_MATERIALS", "SORBENT_BOOM", "SHEEN_RECOVERY"],
        "PERSONNEL": ["SHORELINE_CLEANUP", "SCAT_SURVEY", "HAZMAT_CREW", "BEACH_TASKFORCE"],
        "MONITORING_TEAM": ["MONITORING_AND_SURVEILLANCE", "UAV_SURVEILLANCE", "RADAR_TRACKING", "AERIAL_RECON"],
        "CLEANUP_EQUIPMENT": ["BEACH_CLEANUP", "VACUUM_RECOVERY", "HOT_WATER_FLUSHING", "DEBRIS_REMOVAL"],
    }

    @classmethod
    def evaluate_resource_score(
        cls,
        resource: Any,
        incident_latitude: float,
        incident_longitude: float,
        incident_priority: float = 50.0,
        incident_risk: float = 50.0,
        active_strategies: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """
        Calculates explainable allocation score and response metrics.
        Returns dict with:
          - allocation_score (0.0 to 100.0)
          - estimated_distance_km
          - estimated_response_time_hours
          - is_eligible (bool)
          - match_priority (CRITICAL, HIGH, MEDIUM, LOW)
          - allocation_rationale (str)
          - factors (dict of score components)
        """
        # 1. Eligibility Check
        res_status = getattr(resource, "status", "AVAILABLE")
        if res_status != "AVAILABLE":
            return {
                "allocation_score": 0.0,
                "estimated_distance_km": 0.0,
                "estimated_response_time_hours": 999.0,
                "is_eligible": False,
                "match_priority": "LOW",
                "allocation_rationale": f"Ineligible: Resource is currently {res_status}.",
                "factors": {
                    "capability_match_score": 0.0,
                    "proximity_eta_score": 0.0,
                    "priority_score_boost": 0.0,
                    "risk_severity_weight": 0.0,
                },
            }

        # 2. Distance & Response ETA
        r_lat = getattr(resource, "latitude", None) or 13.0
        r_lon = getattr(resource, "longitude", None) or 80.25
        dist_km = haversine_km(r_lat, r_lon, incident_latitude, incident_longitude)

        speed_knots = getattr(resource, "speed_knots", 0.0) or 0.0
        mobilization_hours = getattr(resource, "mobilization_time_hours", 1.0) or 1.0

        if speed_knots > 0:
            speed_kmh = speed_knots * 1.852
            transit_hours = dist_km / max(speed_kmh, 5.0)
        else:
            # Land-based convoy or port dispatch baseline: 40 km/h average
            transit_hours = dist_km / 40.0

        total_eta_hours = round(transit_hours + mobilization_hours, 1)

        # 3. Component Scoring
        # A. Proximity & ETA Score (0 - 30 pts)
        if total_eta_hours <= 1.5:
            proximity_score = 30.0
        elif total_eta_hours <= 3.0:
            proximity_score = 26.0
        elif total_eta_hours <= 6.0:
            proximity_score = 20.0
        elif total_eta_hours <= 12.0:
            proximity_score = 14.0
        elif total_eta_hours <= 24.0:
            proximity_score = 8.0
        else:
            proximity_score = max(2.0, 30.0 - (total_eta_hours * 0.8))

        # B. Capability Match Score (0 - 30 pts)
        category = getattr(resource, "resource_category", "CLEANUP_EQUIPMENT")
        caps_json = getattr(resource, "capabilities_json", "[]") or "[]"
        try:
            capabilities = json.loads(caps_json) if isinstance(caps_json, str) else list(caps_json)
        except Exception:
            capabilities = []

        capability_score = 15.0  # baseline
        strategy_matched = False

        if active_strategies:
            norm_strategies = [s.upper() for s in active_strategies]
            cat_caps = cls.STRATEGY_CAPABILITY_MAP.get(category, [])
            all_caps = [c.upper() for c in (capabilities + cat_caps)]

            # Check matching keywords
            matches = [c for c in all_caps if any(strat in c or c in strat for strat in norm_strategies)]
            if matches:
                capability_score = 30.0
                strategy_matched = True
            else:
                capability_score = 18.0
        else:
            # Default capability score based on general utility
            if category in ["CONTAINMENT_BOOM", "SKIMMER_VESSEL", "RESPONSE_VESSEL"]:
                capability_score = 28.0
                strategy_matched = True
            else:
                capability_score = 22.0

        # C. Incident Priority Score Boost (0 - 25 pts)
        prio_norm = max(0.0, min(100.0, incident_priority))
        priority_boost = round((prio_norm / 100.0) * 25.0, 1)

        # D. Incident Risk Score Weight (0 - 15 pts)
        risk_norm = max(0.0, min(100.0, incident_risk))
        risk_weight = round((risk_norm / 100.0) * 15.0, 1)

        # Total Score
        total_score = round(
            min(100.0, max(0.0, proximity_score + capability_score + priority_boost + risk_weight)),
            1,
        )

        # Priority Match Category
        if total_score >= 85.0:
            match_priority = "CRITICAL"
        elif total_score >= 70.0:
            match_priority = "HIGH"
        elif total_score >= 50.0:
            match_priority = "MEDIUM"
        else:
            match_priority = "LOW"

        # Rationale Construction
        reasons = []
        if strategy_matched:
            reasons.append(f"Direct operational fit for active cleanup strategy ({category.replace('_', ' ')})")
        else:
            reasons.append(f"General response asset ({category.replace('_', ' ')})")

        reasons.append(f"{dist_km:.1f} km from spill with ~{total_eta_hours:.1f}h total response ETA")

        if priority_boost >= 18.0:
            reasons.append(f"High incident dispatch priority (+{priority_boost:.0f} pts)")

        rationale = " • ".join(reasons)

        return {
            "allocation_score": total_score,
            "estimated_distance_km": round(dist_km, 1),
            "estimated_response_time_hours": total_eta_hours,
            "is_eligible": True,
            "match_priority": match_priority,
            "allocation_rationale": rationale,
            "factors": {
                "capability_match_score": capability_score,
                "proximity_eta_score": proximity_score,
                "priority_score_boost": priority_boost,
                "risk_severity_weight": risk_weight,
            },
        }
