"""
Module 21 — Economic Damage Estimator Service.
Implements a transparent, explainable 6-category economic loss estimation engine:
  1. Cleanup Cost
  2. Fisheries Impact
  3. Tourism Impact
  4. Coastal Business Impact
  5. Infrastructure Impact
  6. Other Modeled Natural Resource Remediation

Integrates directly with:
  - Movement Prediction (Module 11)
  - Marine Ecosystem Risk Analyzer (Module 12)
  - Coastal Impact Predictor (Module 13)
  - Cleanup Planner (Module 15)

DISCLAIMER:
  Results are mathematical model scenario estimates, not official government losses.
"""
from __future__ import annotations
import json
import logging
import math
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.incident import Incident
from app.models.economic_impact import (
    EconomicAssumption,
    EconomicAssessment,
    EconomicAssessmentCategory,
)
from app.models.movement_prediction import MovementPrediction
from app.models.ecosystem_risk import EcosystemRiskAssessment
from app.models.coastal_impact import CoastalImpactPrediction
from app.models.cleanup_plan import CleanupPlan

logger = logging.getLogger("economic_estimator")

MODEL_NAME = "TRANSPARENT_ECONOMIC_DAMAGE_MODEL_V1"
STATUTORY_DISCLAIMER = (
    "[MODEL ESTIMATE — NOT AN OFFICIAL GOVERNMENT ECONOMIC ASSESSMENT] "
    "Calculated figures are transparent mathematical scenario approximations based on configurable "
    "unit costs, disruption durations, and environmental risk indicators. They do not constitute official "
    "government loss decrees or statutory legal liabilities."
)


def format_currency_display(amount: float, currency: str = "INR") -> str:
    """
    Formats amounts into standard human-readable units:
    - INR: ₹ Cr (Crore, 10^7) or ₹ Lakh (10^5) or standard ₹
    - USD: $M or $K or standard $
    """
    curr = currency.upper()
    if curr == "INR":
        if amount >= 10_000_000:
            return f"₹{amount / 10_000_000:.1f} Cr"
        elif amount >= 100_000:
            return f"₹{amount / 100_000:.1f} Lakh"
        else:
            return f"₹{amount:,.0f}"
    else:
        if amount >= 1_000_000:
            return f"${amount / 1_000_000:.2f}M"
        elif amount >= 1_000:
            return f"${amount / 1_000:.1f}K"
        else:
            return f"${amount:,.0f}"


class EconomicDamageEstimatorService:
    """Core service for transparent economic impact calculations."""

    @classmethod
    def get_or_create_default_assumptions(cls, db: Session) -> EconomicAssumption:
        """Retrieves or seeds the default baseline economic assumptions profile."""
        default_prof = (
            db.query(EconomicAssumption)
            .filter(EconomicAssumption.is_default == True)
            .first()
        )
        if not default_prof:
            default_prof = EconomicAssumption(
                name="INDIAN_OCEAN_COASTAL_BASELINE",
                currency="INR",
                exchange_rate_usd_to_inr=83.5,
                cleanup_cost_per_km2=1500000.0,
                shoreline_cleanup_per_km=4500000.0,
                fisheries_daily_value_per_km2=95000.0,
                fisheries_recovery_days_default=30.0,
                tourism_daily_value_per_km=250000.0,
                tourism_disruption_days_default=21.0,
                business_daily_loss_per_km=120000.0,
                business_disruption_days_default=14.0,
                infrastructure_daily_loss_per_facility=3500000.0,
                infrastructure_disruption_days_default=7.0,
                other_ecosystem_remediation_per_point=1200000.0,
                is_default=True,
                notes="Baseline standard scenario unit assumptions for Indian coastal corridors.",
            )
            db.add(default_prof)
            db.commit()
            db.refresh(default_prof)
        return default_prof

    @classmethod
    def get_assumptions_for_incident(
        cls,
        db: Session,
        incident_id: str,
        custom_overrides: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Builds active assumption dictionary merging baseline defaults,
        incident overrides, and runtime custom overrides.
        """
        baseline = cls.get_or_create_default_assumptions(db)
        assump = {
            "name": baseline.name,
            "currency": baseline.currency,
            "exchange_rate_usd_to_inr": baseline.exchange_rate_usd_to_inr,
            "cleanup_cost_per_km2": baseline.cleanup_cost_per_km2,
            "shoreline_cleanup_per_km": baseline.shoreline_cleanup_per_km,
            "fisheries_daily_value_per_km2": baseline.fisheries_daily_value_per_km2,
            "fisheries_recovery_days_default": baseline.fisheries_recovery_days_default,
            "tourism_daily_value_per_km": baseline.tourism_daily_value_per_km,
            "tourism_disruption_days_default": baseline.tourism_disruption_days_default,
            "business_daily_loss_per_km": baseline.business_daily_loss_per_km,
            "business_disruption_days_default": baseline.business_disruption_days_default,
            "infrastructure_daily_loss_per_facility": baseline.infrastructure_daily_loss_per_facility,
            "infrastructure_disruption_days_default": baseline.infrastructure_disruption_days_default,
            "other_ecosystem_remediation_per_point": baseline.other_ecosystem_remediation_per_point,
        }

        # Check for incident-saved profile
        inc_prof = (
            db.query(EconomicAssumption)
            .filter(EconomicAssumption.incident_id == incident_id)
            .order_by(desc(EconomicAssumption.updated_at))
            .first()
        )
        if inc_prof:
            for k in assump.keys():
                if hasattr(inc_prof, k) and getattr(inc_prof, k) is not None:
                    assump[k] = getattr(inc_prof, k)

        # Apply runtime custom overrides if provided
        if custom_overrides:
            for k, v in custom_overrides.items():
                if k in assump and v is not None:
                    try:
                        assump[k] = float(v) if isinstance(assump[k], float) else v
                    except (ValueError, TypeError):
                        pass

        return assump

    @classmethod
    def calculate_economic_impact(
        cls,
        db: Session,
        incident_id: str,
        display_currency: str = "INR",
        custom_overrides: Optional[dict[str, Any]] = None,
    ) -> EconomicAssessment:
        """
        Executes the transparent 6-category calculation and persists
        the assessment and itemized category breakdown to the database.
        """
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        assumptions = cls.get_assumptions_for_incident(db, incident_id, custom_overrides)
        target_currency = display_currency.upper()
        if target_currency not in ["INR", "USD"]:
            target_currency = "INR"

        fx_rate = assumptions.get("exchange_rate_usd_to_inr", 83.5)

        # Helper to convert baseline INR unit cost to target display currency
        def to_curr(inr_amount: float) -> float:
            if target_currency == "USD":
                return inr_amount / fx_rate
            return inr_amount

        # ── 1. Gather Integrated Inputs from other Modules ──
        spill_area_km2 = float(incident.spill_area_km2 or 1.0)
        confidence_points = 0.70

        # Module 11: Movement Prediction
        latest_movement = (
            db.query(MovementPrediction)
            .filter(MovementPrediction.incident_id == incident_id)
            .order_by(desc(MovementPrediction.created_at))
            .first()
        )
        if latest_movement and latest_movement.predicted_area_km2:
            spill_area_km2 = max(spill_area_km2, float(latest_movement.predicted_area_km2))
            confidence_points += 0.05

        # Module 12: Marine Ecosystem Risk
        latest_eco = (
            db.query(EcosystemRiskAssessment)
            .filter(EcosystemRiskAssessment.incident_id == incident_id)
            .order_by(desc(EcosystemRiskAssessment.analyzed_at))
            .first()
        )
        affected_fishing_area_km2 = max(1.0, spill_area_km2 * 1.5)
        vulnerable_biomes_count = 1
        if latest_eco and latest_eco.zone_results_json:
            confidence_points += 0.05
            try:
                eco_zones = json.loads(latest_eco.zone_results_json)
                if isinstance(eco_zones, list):
                    vulnerable_biomes_count = max(1, len(eco_zones))
                    fishing_zones = [z for z in eco_zones if "FISHING" in str(z.get("zone_type", "")).upper()]
                    if fishing_zones:
                        affected_fishing_area_km2 = max(affected_fishing_area_km2, len(fishing_zones) * 4.5)
            except Exception:
                pass

        # Module 13: Coastal Impact
        coastal_preds = (
            db.query(CoastalImpactPrediction)
            .filter(CoastalImpactPrediction.incident_id == incident_id)
            .all()
        )
        shoreline_impacted = False
        impacted_shoreline_km = 0.0
        affected_beaches_km = 0.0
        affected_business_km = 0.0
        infrastructure_facilities_count = 0

        if coastal_preds:
            confidence_points += 0.05
            shoreline_impacted = any(p.estimated_hours_to_impact <= 24.0 for p in coastal_preds)
            for p in coastal_preds:
                t_type = str(p.target_type).upper()
                if "BEACH" in t_type or "TOURISM" in t_type:
                    affected_beaches_km += 2.0  # Assumed standard beach front coverage
                if "PORT" in t_type or "INFRASTRUCTURE" in t_type:
                    infrastructure_facilities_count += 1
                if "SETTLEMENT" in t_type or "COASTAL" in t_type:
                    affected_business_km += 2.5

        if shoreline_impacted and impacted_shoreline_km == 0.0:
            impacted_shoreline_km = max(2.0, math.sqrt(spill_area_km2) * 1.8)
            affected_beaches_km = max(affected_beaches_km, impacted_shoreline_km * 0.6)
            affected_business_km = max(affected_business_km, impacted_shoreline_km * 0.4)

        # Module 15: Cleanup Planner Response Tier
        latest_cleanup = (
            db.query(CleanupPlan)
            .filter(CleanupPlan.incident_id == incident_id)
            .order_by(desc(CleanupPlan.created_at))
            .first()
        )
        tier_multiplier = 1.0
        if latest_cleanup:
            confidence_points += 0.05
            if latest_cleanup.tier == "TIER_3_MAJOR":
                tier_multiplier = 1.5
            elif latest_cleanup.tier == "TIER_2_MEDIUM":
                tier_multiplier = 1.25

        confidence_score = round(min(0.95, max(0.60, confidence_points)), 2)

        # ── 2. Category Calculations (in target currency) ──
        # Category 1: Cleanup Cost
        # cleanup_cost = (spill_area * cleanup_cost_per_area) + (shoreline_km * shoreline_cleanup_per_km) * tier_mult
        unit_cleanup_km2 = to_curr(assumptions["cleanup_cost_per_km2"])
        unit_shoreline_km = to_curr(assumptions["shoreline_cleanup_per_km"])
        offshore_clean = spill_area_km2 * unit_cleanup_km2
        shore_clean = impacted_shoreline_km * unit_shoreline_km
        cleanup_cost = round((offshore_clean + shore_clean) * tier_multiplier, 0)
        cleanup_formula = (
            f"({spill_area_km2:.1f} km² slick × {format_currency_display(unit_cleanup_km2, target_currency)}/km²)"
            + (f" + ({impacted_shoreline_km:.1f} km shoreline × {format_currency_display(unit_shoreline_km, target_currency)}/km)" if impacted_shoreline_km > 0 else "")
            + f" × Tier factor ({tier_multiplier:.2f}x)"
        )

        # Category 2: Fisheries Impact
        # fisheries_loss = affected_fishing_area × estimated_daily_value × estimated_duration
        unit_fish_daily = to_curr(assumptions["fisheries_daily_value_per_km2"])
        fish_days = assumptions["fisheries_recovery_days_default"]
        fisheries_loss = round(affected_fishing_area_km2 * unit_fish_daily * fish_days, 0)
        fisheries_formula = (
            f"{affected_fishing_area_km2:.1f} km² affected fishing zone × "
            f"{format_currency_display(unit_fish_daily, target_currency)}/day × {fish_days:.0f} days disruption"
        )

        # Category 3: Tourism Impact
        # tourism_loss = affected_tourism_area × estimated_daily_value × estimated_duration
        unit_tourism_daily = to_curr(assumptions["tourism_daily_value_per_km"])
        tourism_days = assumptions["tourism_disruption_days_default"]
        tourism_loss = round(affected_beaches_km * unit_tourism_daily * tourism_days, 0)
        tourism_formula = (
            f"{affected_beaches_km:.1f} km recreational beach front × "
            f"{format_currency_display(unit_tourism_daily, target_currency)}/km/day × {tourism_days:.0f} days beach closure"
        )

        # Category 4: Coastal Business Impact
        # business_loss = coastal_business_exposure × estimated_daily_loss × duration
        unit_biz_daily = to_curr(assumptions["business_daily_loss_per_km"])
        biz_days = assumptions["business_disruption_days_default"]
        business_loss = round(affected_business_km * unit_biz_daily * biz_days, 0)
        business_formula = (
            f"{affected_business_km:.1f} km coastal economic zone × "
            f"{format_currency_display(unit_biz_daily, target_currency)}/km/day × {biz_days:.0f} days disruption"
        )

        # Category 5: Critical Infrastructure Impact
        # infrastructure_loss = affected_facilities × estimated_daily_loss × duration
        unit_infra_daily = to_curr(assumptions["infrastructure_daily_loss_per_facility"])
        infra_days = assumptions["infrastructure_disruption_days_default"]
        infrastructure_loss = round(max(0, infrastructure_facilities_count) * unit_infra_daily * infra_days, 0)
        infrastructure_formula = (
            f"{infrastructure_facilities_count} commercial port/plant facilities × "
            f"{format_currency_display(unit_infra_daily, target_currency)}/facility/day × {infra_days:.0f} days transit delays"
        )

        # Category 6: Other Modeled Impact (Ecosystem remediation)
        # other_loss = vulnerable_biomes × remediation_per_point
        unit_eco_point = to_curr(assumptions["other_ecosystem_remediation_per_point"])
        other_loss = round(vulnerable_biomes_count * unit_eco_point, 0)
        other_formula = (
            f"{vulnerable_biomes_count} sensitive marine biomes at risk × "
            f"{format_currency_display(unit_eco_point, target_currency)}/biome habitat restoration"
        )

        total_amount = round(
            cleanup_cost + fisheries_loss + tourism_loss + business_loss + infrastructure_loss + other_loss,
            0,
        )
        total_formatted = format_currency_display(total_amount, target_currency)

        # ── 3. Database Persistence ──
        assessment = EconomicAssessment(
            incident_id=incident_id,
            currency=target_currency,
            total_estimated_amount=total_amount,
            total_formatted=total_formatted,
            confidence=confidence_score,
            assumptions_used=assumptions,
            model_name=MODEL_NAME,
            disclaimer=STATUTORY_DISCLAIMER,
        )
        db.add(assessment)
        db.flush()

        cat_data = [
            ("CLEANUP", "Offshore & Shoreline Cleanup Cost", cleanup_cost, cleanup_formula),
            ("FISHERIES", "Commercial Fisheries Impact", fisheries_loss, fisheries_formula),
            ("TOURISM", "Tourism & Beach Disruption Impact", tourism_loss, tourism_formula),
            ("COASTAL_BUSINESS", "Coastal Maritime Business Impact", business_loss, business_formula),
            ("INFRASTRUCTURE", "Critical Port & Marine Infrastructure", infrastructure_loss, infrastructure_formula),
            ("OTHER_MODELED", "Natural Resource & Ecosystem Restoration", other_loss, other_formula),
        ]

        for code, title, amt, formula in cat_data:
            cat_obj = EconomicAssessmentCategory(
                assessment_id=assessment.id,
                incident_id=incident_id,
                category=code,
                category_title=title,
                estimated_amount=amt,
                formatted_amount=format_currency_display(amt, target_currency),
                currency=target_currency,
                calculation_formula=formula,
                assumptions_snapshot=assumptions,
                confidence=confidence_score,
            )
            db.add(cat_obj)

        db.commit()
        db.refresh(assessment)
        return assessment

    @classmethod
    def get_latest_assessment(cls, db: Session, incident_id: str) -> Optional[EconomicAssessment]:
        """Fetches the latest economic damage assessment for an incident."""
        return (
            db.query(EconomicAssessment)
            .filter(EconomicAssessment.incident_id == incident_id)
            .order_by(desc(EconomicAssessment.created_at))
            .first()
        )

    @classmethod
    def list_historical_assessments(cls, db: Session, incident_id: str) -> list[EconomicAssessment]:
        """Lists historical economic damage assessments for an incident."""
        return (
            db.query(EconomicAssessment)
            .filter(EconomicAssessment.incident_id == incident_id)
            .order_by(desc(EconomicAssessment.created_at))
            .all()
        )
