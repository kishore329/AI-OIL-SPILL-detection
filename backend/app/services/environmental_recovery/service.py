"""
Module 22 — Environmental Recovery Predictor Service.
Implements transparent asymptotic regeneration kinetics across Mangroves, Coral Reefs,
Fisheries, Marine Habitats, and Coastal Ecosystems over 1M, 3M, 6M, 12M, 24M horizons.
Synthesizes telemetry from Incident, EcosystemRisk (M12), and CleanupPlan (M15).
"""
from __future__ import annotations
import math
import uuid
from datetime import datetime, timezone
from typing import Optional, Any

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.incident import Incident
from app.models.enums import IncidentStatus, IncidentSeverity
from app.models.incident_event import IncidentEvent
from app.models.ecosystem_risk import EcosystemRiskAssessment
from app.models.cleanup_plan import CleanupPlan, CleanupRecommendation
from app.models.environmental_recovery import (
    RecoveryFactor,
    RecoveryPrediction,
    EnvironmentalRecoveryAssessment,
)
from app.schemas.environmental_recovery import (
    RecoveryPredictionItem,
    EcosystemTrajectoryDetail,
    MilestoneItem,
    EnvironmentalRecoveryResponse,
    RecoveryCalculationRequest,
    LifecycleTransitionResponse,
)


HORIZONS = [
    {"code": "1_MONTH", "months": 1, "short": "1M", "milestone": "Initial Toxic Dissipation & Containment Residuals"},
    {"code": "3_MONTHS", "months": 3, "short": "3M", "milestone": "Early Colonization & Water Column Stabilization"},
    {"code": "6_MONTHS", "months": 6, "short": "6M", "milestone": "Biomass Resurgence & Canopy Sprouting"},
    {"code": "12_MONTHS", "months": 12, "short": "12M", "milestone": "Substantial Habitat Functional Recovery"},
    {"code": "24_MONTHS", "months": 24, "short": "24M", "milestone": "Ecological Equilibrium & Near-Baseline Resiliency"},
]

DEFAULT_TARGET_PROFILES = [
    {
        "ecosystem_type": "MANGROVES",
        "ecosystem_title": "Mangrove Forests & Estuarine Swamps",
        "baseline_recovery_rate_k": 0.095,
        "asymptotic_max_recovery": 95.0,
        "shape_exponent_gamma": 1.15,
        "ecosystem_sensitivity_weight": 1.25,
        "base_confidence": 78.0,
        "notes": "Propagule recruitment requires tidal flushing; pneumatophores coated by heavy oil require 12-24 months for root respiration recovery.",
    },
    {
        "ecosystem_type": "CORAL_REEFS",
        "ecosystem_title": "Coral Reefs & Calcified Benthic Biomes",
        "baseline_recovery_rate_k": 0.045,
        "asymptotic_max_recovery": 88.0,
        "shape_exponent_gamma": 1.30,
        "ecosystem_sensitivity_weight": 1.50,
        "base_confidence": 72.0,
        "notes": "Calcification and polyp reproduction severely retarded by polycyclic aromatic hydrocarbons; slowest regeneration rate.",
    },
    {
        "ecosystem_type": "FISHERIES",
        "ecosystem_title": "Fisheries & Pelagic/Artisanal Spawning Grounds",
        "baseline_recovery_rate_k": 0.220,
        "asymptotic_max_recovery": 98.0,
        "shape_exponent_gamma": 1.00,
        "ecosystem_sensitivity_weight": 0.90,
        "base_confidence": 85.0,
        "notes": "Larval influx from contiguous open-water zones enables faster biomass and nursery restoration once chemical toxicity dissipates.",
    },
    {
        "ecosystem_type": "MARINE_HABITATS",
        "ecosystem_title": "Marine Habitats & Seagrass Meadows",
        "baseline_recovery_rate_k": 0.140,
        "asymptotic_max_recovery": 96.0,
        "shape_exponent_gamma": 1.10,
        "ecosystem_sensitivity_weight": 1.05,
        "base_confidence": 80.0,
        "notes": "Submerged aquatic vegetation and benthic epifauna recover as water column turbidity clears and dissolved oxygen normalizes.",
    },
    {
        "ecosystem_type": "COASTAL_ECOSYSTEMS",
        "ecosystem_title": "Intertidal Rocky Shores & Sandy Beaches",
        "baseline_recovery_rate_k": 0.120,
        "asymptotic_max_recovery": 95.0,
        "shape_exponent_gamma": 1.10,
        "ecosystem_sensitivity_weight": 1.10,
        "base_confidence": 82.0,
        "notes": "High-energy tidal surging and wave action accelerates physical and microbial bio-oxidation of stranded beach residues.",
    },
]


class EnvironmentalRecoveryService:
    """Core domain logic for environmental recovery modeling and lifecycle progression."""

    @staticmethod
    def get_or_create_default_factors(db: Session) -> list[RecoveryFactor]:
        """Fetch or initialize default baseline kinetic parameters."""
        existing = (
            db.query(RecoveryFactor)
            .filter(RecoveryFactor.is_default == True, RecoveryFactor.incident_id == None)  # noqa: E711, E712
            .all()
        )
        if len(existing) >= len(DEFAULT_TARGET_PROFILES):
            return existing

        created = []
        existing_types = {rf.ecosystem_type for rf in existing}
        for profile in DEFAULT_TARGET_PROFILES:
            if profile["ecosystem_type"] not in existing_types:
                factor = RecoveryFactor(
                    ecosystem_type=profile["ecosystem_type"],
                    ecosystem_title=profile["ecosystem_title"],
                    baseline_recovery_rate_k=profile["baseline_recovery_rate_k"],
                    asymptotic_max_recovery=profile["asymptotic_max_recovery"],
                    shape_exponent_gamma=profile["shape_exponent_gamma"],
                    ecosystem_sensitivity_weight=profile["ecosystem_sensitivity_weight"],
                    base_confidence=profile["base_confidence"],
                    is_default=True,
                    notes=profile["notes"],
                )
                db.add(factor)
                created.append(factor)

        if created:
            db.commit()
            for c in created:
                db.refresh(c)

        return (
            db.query(RecoveryFactor)
            .filter(RecoveryFactor.is_default == True, RecoveryFactor.incident_id == None)  # noqa: E711, E712
            .all()
        )

    @classmethod
    def calculate_incident_recovery(
        cls,
        db: Session,
        incident_id: str,
        request: Optional[RecoveryCalculationRequest] = None,
    ) -> EnvironmentalRecoveryResponse:
        """
        Calculate and persist environmental recovery trajectory projections across 5 horizons
        for all target ecosystems. Integrates Ecosystem Risk and Cleanup Plan data.
        """
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident {incident_id} not found")

        # 1. Inputs: Cleanup plan effectiveness (Module 15)
        cleanup_effectiveness = 0.60  # baseline default
        cleanup_plan = (
            db.query(CleanupPlan)
            .filter(CleanupPlan.incident_id == incident_id)
            .order_by(CleanupPlan.created_at.desc())
            .first()
        )
        if cleanup_plan and cleanup_plan.recommendations:
            scores = [r.suitability_score for r in cleanup_plan.recommendations if r.operational_status != "REJECTED"]
            if scores:
                cleanup_effectiveness = sum(scores) / (len(scores) * 100.0)
                cleanup_effectiveness = max(0.20, min(0.95, cleanup_effectiveness))

        if request and request.cleanup_effectiveness_override is not None:
            cleanup_effectiveness = max(0.0, min(1.0, request.cleanup_effectiveness_override))

        # 2. Inputs: Marine Ecosystem Risk Assessment (Module 12)
        ecosystem_risk_score = 50.0  # baseline default
        eco_assessment = (
            db.query(EcosystemRiskAssessment)
            .filter(EcosystemRiskAssessment.incident_id == incident_id)
            .order_by(EcosystemRiskAssessment.analyzed_at.desc())
            .first()
        )
        if eco_assessment:
            ecosystem_risk_score = eco_assessment.overall_risk_score

        # 3. Inputs: Incident Spill Severity & Exposure Duration
        severity_tier = incident.severity.value if hasattr(incident.severity, "value") else str(incident.severity)
        severity_weight_map = {
            "CRITICAL": 1.0,
            "HIGH": 0.80,
            "MODERATE": 0.50,
            "LOW": 0.25,
        }
        severity_factor = severity_weight_map.get(severity_tier.upper(), 0.50)

        exposure_hours = 24.0
        if incident.detected_at:
            det = incident.detected_at
            if det.tzinfo is None:
                det = det.replace(tzinfo=timezone.utc)
            delta = datetime.now(timezone.utc) - det
            exposure_hours = max(2.0, min(240.0, delta.total_seconds() / 3600.0))

        if request and request.exposure_duration_override_hours is not None:
            exposure_hours = max(1.0, request.exposure_duration_override_hours)

        # 4. Fetch baseline factors
        baseline_factors = cls.get_or_create_default_factors(db)
        factor_map = {f.ecosystem_type: f for f in baseline_factors}

        # 5. Create Top-level Assessment Record
        assessment = EnvironmentalRecoveryAssessment(
            incident_id=incident_id,
            cleanup_effectiveness_applied=cleanup_effectiveness,
            ecosystem_risk_score_applied=ecosystem_risk_score,
            exposure_duration_hours=exposure_hours,
            spill_severity_tier=severity_tier,
            ecosystems_evaluated_count=len(DEFAULT_TARGET_PROFILES),
            model_name="ECO_RECOVERY_ASYMPTOTIC_V1",
        )
        db.add(assessment)
        db.flush()

        prediction_items: list[RecoveryPrediction] = []
        trajectories_detail: list[EcosystemTrajectoryDetail] = []
        cumulative_24m_sum = 0.0

        for profile in DEFAULT_TARGET_PROFILES:
            eco_type = profile["ecosystem_type"]
            factor = factor_map.get(eco_type)

            k0 = factor.baseline_recovery_rate_k if factor else profile["baseline_recovery_rate_k"]
            r_max = factor.asymptotic_max_recovery if factor else profile["asymptotic_max_recovery"]
            gamma = factor.shape_exponent_gamma if factor else profile["shape_exponent_gamma"]
            sens = factor.ecosystem_sensitivity_weight if factor else profile["ecosystem_sensitivity_weight"]
            base_conf = factor.base_confidence if factor else profile["base_confidence"]

            # Apply custom overrides if supplied in request
            if request and request.custom_factors and eco_type in request.custom_factors:
                c_over = request.custom_factors[eco_type]
                if "baseline_recovery_rate_k" in c_over:
                    k0 = float(c_over["baseline_recovery_rate_k"])
                if "asymptotic_max_recovery" in c_over:
                    r_max = float(c_over["asymptotic_max_recovery"])
                if "shape_exponent_gamma" in c_over:
                    gamma = float(c_over["shape_exponent_gamma"])

            # Kinetic formulation:
            # Cleanup accelerates rate; high severity, long exposure and sensitive habitats moderate rate
            cleanup_mod = 1.0 + 0.40 * (cleanup_effectiveness - 0.50)
            sev_mod = 1.0 - 0.25 * (severity_factor - 0.50)
            exposure_mod = 1.0 - 0.20 * min(1.0, exposure_hours / 120.0)
            sens_mod = 1.0 / math.sqrt(max(0.5, sens))

            k_eff = max(0.012, k0 * cleanup_mod * sev_mod * exposure_mod * sens_mod)

            horizon_pcts: dict[str, float] = {}
            milestones: list[MilestoneItem] = []

            for h in HORIZONS:
                t = h["months"]
                # Asymptotic S-curve recovery equation
                # R(t) = R_max * (1 - e^(-k_eff * t))^gamma
                pct_raw = r_max * math.pow(max(0.0, 1.0 - math.exp(-k_eff * t)), gamma)
                pct = round(max(0.0, min(r_max, pct_raw)), 1)
                horizon_pcts[h["short"]] = pct

                milestones.append(
                    MilestoneItem(
                        month=t,
                        label=f"{pct}% at {h['short']}",
                        description=h["milestone"],
                        reached=pct >= 50.0,
                    )
                )

                # Horizon-level confidence calculation
                horizon_confidence = round(
                    max(50.0, min(95.0, base_conf - (t * 0.4) + (cleanup_effectiveness * 10.0))),
                    1,
                )

                assumptions_json = {
                    "formula": "R(t) = R_max * (1 - e^(-k_eff * t))^gamma",
                    "t_months": t,
                    "k_baseline": round(k0, 4),
                    "k_effective": round(k_eff, 4),
                    "asymptotic_max_pct": r_max,
                    "shape_exponent_gamma": gamma,
                    "cleanup_effectiveness_applied": round(cleanup_effectiveness, 2),
                    "spill_severity_tier": severity_tier,
                    "exposure_duration_hours": round(exposure_hours, 1),
                    "ecosystem_sensitivity_weight": sens,
                }

                pred_item = RecoveryPrediction(
                    assessment_id=assessment.id,
                    incident_id=incident_id,
                    ecosystem_type=eco_type,
                    ecosystem_title=profile["ecosystem_title"],
                    recovery_horizon=h["code"],
                    horizon_months=t,
                    estimated_recovery_percentage=pct,
                    confidence=horizon_confidence,
                    milestone_status=h["milestone"],
                    assumptions=assumptions_json,
                )
                db.add(pred_item)
                prediction_items.append(pred_item)

            cumulative_24m_sum += horizon_pcts.get("24M", 0.0)

            trajectories_detail.append(
                EcosystemTrajectoryDetail(
                    ecosystem_type=eco_type,
                    ecosystem_title=profile["ecosystem_title"],
                    baseline_k=round(k0, 4),
                    effective_k=round(k_eff, 4),
                    asymptotic_max=r_max,
                    trajectories=horizon_pcts,
                    milestones=milestones,
                )
            )

        # Overall composite 24-month recovery index
        assessment.overall_recovery_index_24m = round(
            cumulative_24m_sum / max(1, len(DEFAULT_TARGET_PROFILES)), 1
        )
        assessment.trajectories_summary_json = [t.model_dump() for t in trajectories_detail]

        # Lifecycle progression option
        if request and request.transition_to_recovery_stage:
            cls.transition_lifecycle_to_recovery(
                db=db,
                incident_id=incident_id,
                authorizing_officer="Automated Recovery Engine",
                transition_notes=request.operator_notes or "Advanced incident lifecycle to RECOVERY stage following environmental modeling assessment.",
            )

        db.commit()
        db.refresh(assessment)

        return cls._build_response(assessment, prediction_items, trajectories_detail)

    @classmethod
    def get_latest_recovery_assessment(
        cls, db: Session, incident_id: str
    ) -> Optional[EnvironmentalRecoveryResponse]:
        """Fetch the most recent environmental recovery assessment for an incident."""
        assessment = (
            db.query(EnvironmentalRecoveryAssessment)
            .filter(EnvironmentalRecoveryAssessment.incident_id == incident_id)
            .order_by(EnvironmentalRecoveryAssessment.created_at.desc())
            .first()
        )
        if not assessment:
            return None

        predictions = (
            db.query(RecoveryPrediction)
            .filter(RecoveryPrediction.assessment_id == assessment.id)
            .order_by(RecoveryPrediction.horizon_months.asc())
            .all()
        )

        trajectories = []
        if assessment.trajectories_summary_json:
            for item in assessment.trajectories_summary_json:
                trajectories.append(EcosystemTrajectoryDetail(**item))
        else:
            # Reconstruct trajectories from prediction rows if needed
            grouped: dict[str, dict[str, float]] = {}
            titles: dict[str, str] = {}
            for p in predictions:
                eco = p.ecosystem_type
                short = f"{p.horizon_months}M"
                grouped.setdefault(eco, {})[short] = p.estimated_recovery_percentage
                titles[eco] = p.ecosystem_title

            for eco, pcts in grouped.items():
                trajectories.append(
                    EcosystemTrajectoryDetail(
                        ecosystem_type=eco,
                        ecosystem_title=titles.get(eco, eco),
                        baseline_k=0.10,
                        effective_k=0.10,
                        asymptotic_max=95.0,
                        trajectories=pcts,
                        milestones=[],
                    )
                )

        return cls._build_response(assessment, predictions, trajectories)

    @staticmethod
    def transition_lifecycle_to_recovery(
        db: Session,
        incident_id: str,
        authorizing_officer: str = "Incident Commander",
        transition_notes: str = "Transitioned incident to environmental recovery and monitoring stage.",
    ) -> LifecycleTransitionResponse:
        """
        Transition incident status to RECOVERY and log an immutable event in the incident audit trail.
        """
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident {incident_id} not found")

        prev_status = incident.status.value if hasattr(incident.status, "value") else str(incident.status)
        incident.status = IncidentStatus.RECOVERY
        incident.updated_at = datetime.now(timezone.utc)

        event = IncidentEvent(
            incident_id=incident_id,
            event_type="LIFECYCLE_STAGE_TRANSITION",
            description=(
                f"Incident status updated from {prev_status} to RECOVERY by {authorizing_officer}. "
                f"Notes: {transition_notes}"
            ),
            created_by=authorizing_officer,
        )
        db.add(event)
        db.commit()
        db.refresh(incident)
        db.refresh(event)

        return LifecycleTransitionResponse(
            incident_id=incident_id,
            previous_status=prev_status,
            current_status="RECOVERY",
            event_id=event.id,
            authorizing_officer=authorizing_officer,
            notes=transition_notes,
            transitioned_at=event.created_at,
        )

    @staticmethod
    def _build_response(
        assessment: EnvironmentalRecoveryAssessment,
        predictions: list[RecoveryPrediction],
        trajectories: list[EcosystemTrajectoryDetail],
    ) -> EnvironmentalRecoveryResponse:
        pred_items = [
            RecoveryPredictionItem(
                id=p.id,
                assessment_id=p.assessment_id,
                incident_id=p.incident_id,
                ecosystem_type=p.ecosystem_type,
                ecosystem_title=p.ecosystem_title,
                recovery_horizon=p.recovery_horizon,
                horizon_months=p.horizon_months,
                estimated_recovery_percentage=p.estimated_recovery_percentage,
                confidence=p.confidence,
                milestone_status=p.milestone_status,
                assumptions=p.assumptions or {},
                created_at=p.created_at,
            )
            for p in predictions
        ]

        return EnvironmentalRecoveryResponse(
            id=assessment.id,
            incident_id=assessment.incident_id,
            overall_recovery_index_24m=assessment.overall_recovery_index_24m,
            cleanup_effectiveness_applied=assessment.cleanup_effectiveness_applied,
            ecosystem_risk_score_applied=assessment.ecosystem_risk_score_applied,
            exposure_duration_hours=assessment.exposure_duration_hours,
            spill_severity_tier=assessment.spill_severity_tier,
            ecosystems_evaluated_count=assessment.ecosystems_evaluated_count,
            confidence_percentage=assessment.confidence_percentage,
            trajectories=trajectories,
            predictions=pred_items,
            model_name=assessment.model_name,
            disclaimer=assessment.disclaimer,
            created_at=assessment.created_at,
        )
