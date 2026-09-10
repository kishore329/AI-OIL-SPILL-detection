"""
RiskEngine — Explainable, multi-factor decision-support risk scoring for oil spills.
Combines spill dimensions, coastal proximity, environmental sensitivity,
human exposure, and detection confidence into an explainable 0–100 score.
"""
from __future__ import annotations
import math
import uuid
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import IncidentSeverity, ZoneType, ZoneSensitivity
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.risk import RiskAssessment
from app.models.environmental_zone import EnvironmentalZone
from app.gis.spatial_service import (
    haversine_km,
    COASTLINE_COORDINATES,
    SIMULATION_PORTS,
    SIMULATION_SHIPPING_LANES,
)
from app.schemas.risk import (
    RiskFactor,
    RiskCalculateRequest,
    RiskAssessmentResponse,
    IncidentRiskHistoryResponse,
)

logger = logging.getLogger(__name__)


@dataclass
class RiskWeights:
    """Configurable component weight limits summing to 100."""
    spill_size_max: float = 25.0
    coastal_proximity_max: float = 25.0
    environmental_max: float = 20.0
    human_exposure_max: float = 15.0
    spread_max: float = 15.0


@dataclass
class RiskThresholds:
    """Configurable severity boundary thresholds."""
    low_max: float = 25.0
    moderate_max: float = 50.0
    high_max: float = 75.0
    critical_max: float = 100.0

    def classify(self, score: float) -> IncidentSeverity:
        if score <= self.low_max:
            return IncidentSeverity.LOW
        elif score <= self.moderate_max:
            return IncidentSeverity.MODERATE
        elif score <= self.high_max:
            return IncidentSeverity.HIGH
        else:
            return IncidentSeverity.CRITICAL


def calculate_min_distance_to_coast(lat: float, lon: float) -> float:
    """Calculate geodesic distance in km to closest point along coastal perimeter."""
    min_d = float("inf")
    for c_lon, c_lat in COASTLINE_COORDINATES:
        d = haversine_km(lat, lon, c_lat, c_lon)
        if d < min_d:
            min_d = d
    return round(min_d, 2)


class RiskEngine:
    weights = RiskWeights()
    thresholds = RiskThresholds()

    # ── 1. Spill Size Factor (Max 25 pts) ──────────────────────────────────
    @classmethod
    def _calc_spill_size(cls, area_km2: float) -> tuple[float, str]:
        max_pts = cls.weights.spill_size_max
        if area_km2 <= 0.0:
            return 0.0, "Negligible or zero surface oil slick observed"
        elif area_km2 < 2.0:
            # 1 to 6 pts
            pts = 1.0 + (area_km2 / 2.0) * 5.0
            reason = f"Minor surface slick ({area_km2:.1f} km²) with limited localized volume"
        elif area_km2 < 10.0:
            # 6 to 14 pts
            pts = 6.0 + ((area_km2 - 2.0) / 8.0) * 8.0
            reason = f"Moderate oil slick ({area_km2:.1f} km²) capable of shoreline fouling"
        elif area_km2 < 35.0:
            # 14 to 20 pts
            pts = 14.0 + ((area_km2 - 10.0) / 25.0) * 6.0
            reason = f"Substantial oil slick ({area_km2:.1f} km²) posing extensive regional spread"
        elif area_km2 < 70.0:
            # 20 to 24 pts
            pts = 20.0 + ((area_km2 - 35.0) / 35.0) * 4.0
            reason = f"Severe large-scale spill ({area_km2:.1f} km²) exceeding critical volume threshold"
        else:
            # 24 to 25 pts
            pts = min(max_pts, 24.0 + min(1.0, (area_km2 - 70.0) / 50.0))
            reason = f"Catastrophic mega-spill ({area_km2:.1f} km²) requiring multi-agency national mobilization"

        return round(min(max_pts, max(0.0, pts)), 1), reason

    # ── 2. Coastal Shoreline Proximity (Max 25 pts) ─────────────────────────
    @classmethod
    def _calc_coastal_proximity(cls, dist_km: float) -> tuple[float, str]:
        max_pts = cls.weights.coastal_proximity_max
        if dist_km <= 5.0:
            pts = max_pts - (dist_km / 5.0) * 2.0
            reason = f"Immediate nearshore threat ({dist_km:.1f} km from shoreline); imminent landfall risk"
        elif dist_km <= 20.0:
            pts = 18.0 + ((20.0 - dist_km) / 15.0) * 5.0
            reason = f"Close coastal waters ({dist_km:.1f} km); tidal drift can reach coastline within 24–48 hours"
        elif dist_km <= 50.0:
            pts = 10.0 + ((50.0 - dist_km) / 30.0) * 7.5
            reason = f"Intermediate coastal proximity ({dist_km:.1f} km); offshore response window available"
        elif dist_km <= 100.0:
            pts = 4.0 + ((100.0 - dist_km) / 50.0) * 5.5
            reason = f"Outer shelf waters ({dist_km:.1f} km); low immediate shoreline contamination hazard"
        else:
            pts = max(1.0, 4.0 - min(3.0, (dist_km - 100.0) / 100.0))
            reason = f"Deep offshore location ({dist_km:.1f} km); ocean currents provide significant dispersion buffer"

        return round(min(max_pts, max(0.0, pts)), 1), reason

    # ── 3. Marine & Environmental Sensitivity (Max 20 pts) ─────────────────
    @classmethod
    def _calc_environmental(
        cls, dist_mpa_km: float, dist_fishing_km: float, mpa_sens: str, fish_sens: str
    ) -> tuple[float, str]:
        max_pts = cls.weights.environmental_max

        # Weight MPA closer
        mpa_score = 0.0
        if dist_mpa_km <= 15.0:
            mpa_score = 11.0 if mpa_sens in ("CRITICAL", "HIGH") else 8.0
        elif dist_mpa_km <= 40.0:
            mpa_score = 7.0 if mpa_sens in ("CRITICAL", "HIGH") else 5.0
        elif dist_mpa_km <= 80.0:
            mpa_score = 3.5
        else:
            mpa_score = 1.0

        # Weight Fishing zones
        fish_score = 0.0
        if dist_fishing_km <= 12.0:
            fish_score = 9.0 if fish_sens in ("CRITICAL", "HIGH") else 6.5
        elif dist_fishing_km <= 35.0:
            fish_score = 6.0
        elif dist_fishing_km <= 70.0:
            fish_score = 3.0
        else:
            fish_score = 1.0

        total_pts = round(min(max_pts, mpa_score + fish_score), 1)

        if total_pts >= 15.0:
            reason = (
                f"Critical marine habitat exposure: Protected reserve within {dist_mpa_km:.1f} km "
                f"and active fishing grounds within {dist_fishing_km:.1f} km"
            )
        elif total_pts >= 9.0:
            reason = (
                f"Moderate ecological vulnerability: Sensitive marine sectors within {min(dist_mpa_km, dist_fishing_km):.1f} km"
            )
        else:
            reason = (
                f"Low ecological vulnerability: Nearest protected habitat is {dist_mpa_km:.1f} km away"
            )

        return total_pts, reason

    # ── 4. Human & Economic Exposure (Max 15 pts) ───────────────────────────
    @classmethod
    def _calc_human_exposure(cls, dist_port_km: float, dist_lane_km: float) -> tuple[float, str]:
        max_pts = cls.weights.human_exposure_max

        port_score = 0.0
        if dist_port_km <= 15.0:
            port_score = 8.5
        elif dist_port_km <= 40.0:
            port_score = 5.5
        elif dist_port_km <= 80.0:
            port_score = 3.0
        else:
            port_score = 1.0

        lane_score = 0.0
        if dist_lane_km <= 10.0:
            lane_score = 6.5
        elif dist_lane_km <= 30.0:
            lane_score = 4.0
        elif dist_lane_km <= 60.0:
            lane_score = 2.0
        else:
            lane_score = 0.5

        total_pts = round(min(max_pts, port_score + lane_score), 1)

        if total_pts >= 11.0:
            reason = (
                f"High maritime & economic disruption: Commercial port terminal {dist_port_km:.1f} km away "
                f"and arterial shipping lane within {dist_lane_km:.1f} km"
            )
        elif total_pts >= 6.0:
            reason = f"Moderate economic impact: Nearest commercial port is {dist_port_km:.1f} km away"
        else:
            reason = f"Minimal infrastructure exposure: Major ports ({dist_port_km:.1f} km) outside primary hazard zone"

        return total_pts, reason

    # ── 5. Spill Spread Severity (Max 15 pts) ──────────────────────────────
    @classmethod
    def _calc_spread(cls, spread_severity: str, area_km2: float) -> tuple[float, str]:
        max_pts = cls.weights.spread_max
        sev_upper = (spread_severity or "MODERATE").upper()

        if sev_upper == "CRITICAL":
            pts = 14.5
            reason = "Active turbulent dispersal and rapid surface slick fragmentation"
        elif sev_upper == "HIGH":
            pts = 11.0
            reason = "High surface spreading velocity with persistent hydrocarbon sheen"
        elif sev_upper == "MODERATE":
            pts = 7.0
            reason = "Steady moderate slick advection under seasonal sea currents"
        else:  # LOW
            pts = 3.0
            reason = "Localized, slow-spreading or contained hydrocarbon sheen"

        return round(min(max_pts, pts), 1), reason

    # ── 6. Confidence Modifier ─────────────────────────────────────────────
    @classmethod
    def _apply_confidence(cls, raw_score: float, confidence: float) -> tuple[float, Optional[str]]:
        """
        Dampens score if confidence is low (< 0.70) to reflect uncertainty,
        while maintaining clear risk indication.
        """
        if confidence >= 0.70:
            return raw_score, None

        # Damping factor between 0.80 and 0.95
        factor = 0.80 + (confidence / 0.70) * 0.15
        damped = round(raw_score * factor, 1)
        note = (
            f"Score adjusted by {factor:.2f} due to moderate sensor certainty ({confidence*100:.1f}%). "
            f"Ground-truth verification advised."
        )
        return damped, note

    # ── Main Evaluator ─────────────────────────────────────────────────────
    @classmethod
    def calculate(
        cls,
        db: Session,
        req: RiskCalculateRequest,
    ) -> RiskAssessmentResponse:
        """
        Calculates normalized risk score (0-100), severity classification,
        and full explainability factor breakdown. Persists record to DB.
        """
        incident: Optional[Incident] = None
        incident_code: Optional[str] = None

        # If incident_id is given, load from DB
        if req.incident_id:
            incident = db.get(Incident, req.incident_id)
            if not incident:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Incident '{req.incident_id}' not found.",
                )
            incident_code = incident.incident_code

        # Resolve parameters (Request overrides take precedence over Incident DB record)
        area_km2 = (
            req.spill_area_km2
            if req.spill_area_km2 is not None
            else (incident.spill_area_km2 if incident and incident.spill_area_km2 is not None else 5.0)
        )
        lat = (
            req.latitude
            if req.latitude is not None
            else (incident.latitude if incident and incident.latitude is not None else 10.85)
        )
        lon = (
            req.longitude
            if req.longitude is not None
            else (incident.longitude if incident and incident.longitude is not None else 79.90)
        )
        conf = (
            req.detection_confidence
            if req.detection_confidence is not None
            else (incident.detection_confidence if incident and incident.detection_confidence is not None else 0.85)
        )
        spread_sev = (
            req.spread_severity
            if req.spread_severity is not None
            else (incident.severity.value if incident else "MODERATE")
        )

        # ── Resolve Spatial Distances ──────────────────────────────────────────
        # Coastline
        dist_coast = (
            req.distance_coastline_km
            if req.distance_coastline_km is not None
            else calculate_min_distance_to_coast(lat, lon)
        )

        # Query environmental zones from DB if available
        zones = db.execute(select(EnvironmentalZone)).scalars().all()

        # Nearest Protected Area
        min_mpa_d = float("inf")
        mpa_sens = "MODERATE"
        for z in zones:
            if z.zone_type == ZoneType.PROTECTED_AREA and z.latitude and z.longitude:
                d = haversine_km(lat, lon, z.latitude, z.longitude)
                if d < min_mpa_d:
                    min_mpa_d = d
                    mpa_sens = z.sensitivity.value if z.sensitivity else "MODERATE"
        if min_mpa_d == float("inf"):
            min_mpa_d = 45.0  # default fallback

        dist_mpa = req.distance_protected_area_km if req.distance_protected_area_km is not None else min_mpa_d

        # Nearest Fishing Zone
        min_fish_d = float("inf")
        fish_sens = "MODERATE"
        for z in zones:
            if z.zone_type == ZoneType.FISHING_ZONE and z.latitude and z.longitude:
                d = haversine_km(lat, lon, z.latitude, z.longitude)
                if d < min_fish_d:
                    min_fish_d = d
                    fish_sens = z.sensitivity.value if z.sensitivity else "HIGH"
        if min_fish_d == float("inf"):
            min_fish_d = 25.0

        dist_fishing = req.distance_fishing_zone_km if req.distance_fishing_zone_km is not None else min_fish_d

        # Nearest Commercial Port
        min_port_d = float("inf")
        for p in SIMULATION_PORTS:
            d = haversine_km(lat, lon, p["latitude"], p["longitude"])
            if d < min_port_d:
                min_port_d = d
        if min_port_d == float("inf"):
            min_port_d = 50.0

        dist_port = req.distance_port_km if req.distance_port_km is not None else min_port_d

        # Nearest Shipping Lane
        min_lane_d = 30.0
        if req.distance_shipping_lane_km is not None:
            dist_lane = req.distance_shipping_lane_km
        else:
            # Estimate to nearest simulation lane point
            for lane in SIMULATION_SHIPPING_LANES:
                coords = json.loads(lane["geometry_geojson"])["coordinates"]
                for p_lon, p_lat in coords:
                    d = haversine_km(lat, lon, p_lat, p_lon)
                    if d < min_lane_d:
                        min_lane_d = d
            dist_lane = min_lane_d

        # ── Compute Sub-Scores ─────────────────────────────────────────────────
        score_size, reason_size = cls._calc_spill_size(area_km2)
        score_coast, reason_coast = cls._calc_coastal_proximity(dist_coast)
        score_env, reason_env = cls._calc_environmental(dist_mpa, dist_fishing, mpa_sens, fish_sens)
        score_human, reason_human = cls._calc_human_exposure(dist_port, dist_lane)
        score_spread, reason_spread = cls._calc_spread(spread_sev, area_km2)

        # ── Module 12 Ecosystem Risk Modifier (additive, up to +5 pts) ──────────
        # Query most recent EcosystemRiskAssessment for this incident if it exists.
        # This is a pluggable factor — no modification to existing scoring logic.
        ecosystem_modifier = 0.0
        ecosystem_modifier_reason: Optional[str] = None
        coastal_impact_modifier = 0.0
        coastal_impact_modifier_reason: Optional[str] = None

        if incident:
            try:
                from sqlalchemy import select as _select
                from app.models.ecosystem_risk import EcosystemRiskAssessment as _ERA
                era = (
                    db.execute(
                        _select(_ERA)
                        .where(_ERA.incident_id == incident.id)
                        .order_by(_ERA.analyzed_at.desc())
                    )
                    .scalars()
                    .first()
                )
                if era and era.risk_engine_modifier > 0:
                    ecosystem_modifier = era.risk_engine_modifier
                    ecosystem_modifier_reason = (
                        f"Marine Ecosystem Risk Analyzer (Module 12) detected "
                        f"{era.zones_analyzed} sensitive zone(s) within {era.radius_km_used:.0f} km. "
                        f"Most critical: {era.most_sensitive_zone or 'N/A'} "
                        f"({era.overall_severity} ecosystem risk, score {era.overall_risk_score:.1f}/100). "
                        f"Additive environmental modifier: +{ecosystem_modifier:.2f} pts."
                    )
                    score_env = round(min(cls.weights.environmental_max + 5.0, score_env + ecosystem_modifier), 1)
            except Exception:
                pass  # Ecosystem data unavailable — continue without modifier

            # ── Module 13 Coastal Impact Modifier (additive, up to +4 pts) ──────────
            try:
                from sqlalchemy import select as _select
                from app.models.coastal_impact import CoastalImpactPrediction as _CIP
                c_preds = (
                    db.execute(
                        _select(_CIP)
                        .where(_CIP.incident_id == incident.id)
                        .order_by(_CIP.estimated_hours_to_impact.asc())
                    )
                    .scalars()
                    .all()
                )
                if c_preds:
                    earliest_pred = c_preds[0]
                    h_impact = earliest_pred.estimated_hours_to_impact
                    if h_impact <= 12.0:
                        coastal_impact_modifier = round(max(0.5, 4.0 * (1.0 - h_impact / 12.0)), 2)
                        coastal_impact_modifier_reason = (
                            f"Coastal Impact Predictor (Module 13) forecast arrival at "
                            f"{earliest_pred.target_location} in ~{h_impact:.1f} hours "
                            f"({earliest_pred.severity} severity). Additive coastal modifier: +{coastal_impact_modifier:.2f} pts."
                        )
                        score_coast = round(min(cls.weights.coastal_proximity_max + 4.0, score_coast + coastal_impact_modifier), 1)
            except Exception:
                pass  # Coastal impact data unavailable — continue without modifier

        raw_total = score_size + score_coast + score_env + score_human + score_spread
        final_score, conf_note = cls._apply_confidence(raw_total, conf)
        final_score = round(min(100.0, max(0.0, final_score)), 1)

        severity = cls.thresholds.classify(final_score)

        # ── Construct Factors Breakdown ────────────────────────────────────────
        factors = [
            RiskFactor(
                name="Spill Size & Volume",
                score=score_size,
                max_score=cls.weights.spill_size_max,
                percentage=round((score_size / cls.weights.spill_size_max) * 100, 1),
                reason=reason_size,
            ),
            RiskFactor(
                name="Coastal Shoreline Proximity",
                score=score_coast,
                max_score=cls.weights.coastal_proximity_max,
                percentage=round((score_coast / cls.weights.coastal_proximity_max) * 100, 1),
                reason=reason_coast
                + (f" [+{coastal_impact_modifier:.2f} pts from Module 13 Coastal Impact Predictor]" if coastal_impact_modifier else ""),
            ),
            RiskFactor(
                name="Marine & Ecological Sensitivity",
                score=score_env,
                max_score=cls.weights.environmental_max,
                percentage=round((score_env / cls.weights.environmental_max) * 100, 1),
                reason=reason_env
                + (f" [+{ecosystem_modifier:.2f} pts from Module 12 Ecosystem Analyzer]" if ecosystem_modifier else ""),
            ),
            RiskFactor(
                name="Human & Port Infrastructure Exposure",
                score=score_human,
                max_score=cls.weights.human_exposure_max,
                percentage=round((score_human / cls.weights.human_exposure_max) * 100, 1),
                reason=reason_human,
            ),
            RiskFactor(
                name="Spread Dynamics & Dispersion",
                score=score_spread,
                max_score=cls.weights.spread_max,
                percentage=round((score_spread / cls.weights.spread_max) * 100, 1),
                reason=reason_spread,
            ),
        ]

        # Append ecosystem factor as a named breakdown entry if modifier was applied
        if ecosystem_modifier_reason:
            factors.append(
                RiskFactor(
                    name="Ecosystem Risk Factor (Module 12)",
                    score=ecosystem_modifier,
                    max_score=5.0,
                    percentage=round((ecosystem_modifier / 5.0) * 100, 1),
                    reason=ecosystem_modifier_reason,
                )
            )

        # Append coastal impact factor as a named breakdown entry if modifier was applied
        if coastal_impact_modifier_reason:
            factors.append(
                RiskFactor(
                    name="Coastal Time-to-Impact Factor (Module 13)",
                    score=coastal_impact_modifier,
                    max_score=4.0,
                    percentage=round((coastal_impact_modifier / 4.0) * 100, 1),
                    reason=coastal_impact_modifier_reason,
                )
            )

        if conf_note:
            factors.append(
                RiskFactor(
                    name="Detection Confidence Adjustment",
                    score=round(final_score - raw_total, 1),
                    max_score=0.0,
                    percentage=round(conf * 100, 1),
                    reason=conf_note,
                )
            )

        now = datetime.now(timezone.utc)

        # ── Persist to Database ────────────────────────────────────────────────
        assessment_id = str(uuid.uuid4())
        inc_id = incident.id if incident else None

        record = RiskAssessment(
            id=assessment_id,
            incident_id=inc_id,
            risk_score=final_score,
            severity=severity,
            spill_size_score=score_size,
            coastal_proximity_score=score_coast,
            environmental_score=score_env,
            spread_score=score_spread,
            human_exposure_score=score_human,
            explanation=json.dumps([f.model_dump() for f in factors]),
            created_at=now,
        )
        db.add(record)

        # Update Incident if linked
        if incident:
            old_score = incident.risk_score
            incident.risk_score = final_score
            incident.severity = severity
            incident.updated_at = now

            # Audit event
            event = IncidentEvent(
                id=str(uuid.uuid4()),
                incident_id=incident.id,
                event_type="RISK_EVALUATED",
                description=(
                    f"Risk score evaluated at {final_score:.1f}/100 ({severity.value}). "
                    f"Previous score: {old_score or 'none'}."
                ),
                created_by="risk_engine",
            )
            db.add(event)

        db.commit()
        db.refresh(record)

        return RiskAssessmentResponse(
            assessment_id=record.id,
            incident_id=inc_id,
            incident_code=incident_code,
            risk_score=final_score,
            severity=severity,
            spill_size_score=score_size,
            coastal_proximity_score=score_coast,
            environmental_score=score_env,
            human_exposure_score=score_human,
            spread_score=score_spread,
            factors=factors,
            distances={
                "coastline_km": dist_coast,
                "protected_area_km": dist_mpa,
                "fishing_zone_km": dist_fishing,
                "commercial_port_km": dist_port,
                "shipping_lane_km": dist_lane,
            },
            calculation_timestamp=now,
        )

    @classmethod
    def get_incident_risk_history(
        cls, db: Session, incident_id: str
    ) -> IncidentRiskHistoryResponse:
        """Retrieves chronological risk assessments for an incident."""
        incident = db.get(Incident, incident_id)
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        q = (
            select(RiskAssessment)
            .where(RiskAssessment.incident_id == incident_id)
            .order_by(RiskAssessment.created_at.desc())
        )
        rows = db.execute(q).scalars().all()

        assessments = []
        for r in rows:
            factors_list = []
            if r.explanation:
                try:
                    raw_factors = json.loads(r.explanation)
                    factors_list = [RiskFactor(**f) for f in raw_factors]
                except Exception:
                    pass

            assessments.append(
                RiskAssessmentResponse(
                    assessment_id=r.id,
                    incident_id=r.incident_id,
                    incident_code=incident.incident_code,
                    risk_score=r.risk_score,
                    severity=r.severity or IncidentSeverity.MODERATE,
                    spill_size_score=r.spill_size_score or 0.0,
                    coastal_proximity_score=r.coastal_proximity_score or 0.0,
                    environmental_score=r.environmental_score or 0.0,
                    human_exposure_score=r.human_exposure_score or 0.0,
                    spread_score=r.spread_score or 0.0,
                    factors=factors_list,
                    calculation_timestamp=r.created_at,
                )
            )

        return IncidentRiskHistoryResponse(
            incident_id=incident.id,
            incident_code=incident.incident_code,
            current_risk_score=incident.risk_score or 0.0,
            current_severity=incident.severity,
            total_assessments=len(assessments),
            assessments=assessments,
        )
