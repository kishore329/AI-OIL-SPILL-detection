"""
Smart Cleanup Planner Service — Module 15.
Coordinates rule evaluation, plan generation, database persistence,
and lifecycle event creation when response recommendations are approved.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.cleanup_plan import CleanupPlan, CleanupRecommendation
from app.models.movement_prediction import MovementPrediction
from app.models.ecosystem_risk import EcosystemRiskAssessment
from app.models.coastal_impact import CoastalImpactPrediction
from app.models.emergency_vessel import EmergencyVessel
from app.schemas.cleanup_planner import (
    CleanupPlanResponse,
    CleanupRecommendationItem,
    CleanupPlanGenerateRequest,
    EnvironmentalContext,
)
from app.services.cleanup_planner.rules_engine import CleanupRulesEngine

logger = logging.getLogger("cleanup_planner")


class SmartCleanupPlannerService:
    """Service providing decision-support cleanup planning and lifecycle tracking."""

    @classmethod
    def _gather_incident_context(cls, db: Session, incident: Incident) -> dict[str, Any]:
        """Collect environmental, spatial, and fleet readiness context from all modules."""
        # Baseline detection area
        spill_area = float(incident.spill_area_km2 or 1.0)
        severity = str(incident.severity.value if hasattr(incident.severity, "value") else incident.severity)

        # Module 11: Movement prediction environmental parameters
        wind_speed = 5.0
        wind_dir = 180.0
        current_speed = 0.5
        current_dir = 90.0
        wave_height = 1.0

        latest_movement = (
            db.query(MovementPrediction)
            .filter(MovementPrediction.incident_id == incident.id)
            .order_by(MovementPrediction.created_at.desc())
            .first()
        )
        if latest_movement and latest_movement.environmental_conditions:
            env = latest_movement.environmental_conditions
            if isinstance(env, dict):
                wind_speed = float(env.get("wind_speed_ms") or 5.0)
                wind_dir = float(env.get("wind_direction_deg") or 180.0)
                current_speed = float(env.get("current_speed_ms") or 0.5)
                current_dir = float(env.get("current_direction_deg") or 90.0)
                wave_height = float(env.get("wave_height_m") or 1.0)

        # Module 12: Ecosystem risk vulnerable zone
        most_sensitive_eco = None
        latest_eco = (
            db.query(EcosystemRiskAssessment)
            .filter(EcosystemRiskAssessment.incident_id == incident.id)
            .order_by(EcosystemRiskAssessment.analyzed_at.desc())
            .first()
        )
        if latest_eco and latest_eco.most_sensitive_type:
            most_sensitive_eco = latest_eco.most_sensitive_type

        # Module 13: Coastal Impact earliest horizon and minimum distance
        coastal_distance_km = 45.0
        coastal_eta_hours = None

        coastal_preds = (
            db.query(CoastalImpactPrediction)
            .filter(CoastalImpactPrediction.incident_id == incident.id)
            .order_by(CoastalImpactPrediction.estimated_hours_to_impact.asc())
            .all()
        )
        if coastal_preds:
            coastal_eta_hours = float(coastal_preds[0].estimated_hours_to_impact)
            min_dist = min((p.distance_km for p in coastal_preds if p.distance_km is not None), default=45.0)
            coastal_distance_km = float(min_dist)

        # Module 14: Available emergency vessels
        available_vessels_count = db.query(EmergencyVessel).filter(EmergencyVessel.is_available.is_(True)).count()

        # Module 05: Priority score
        priority_score = 50.0
        if incident.risk_assessments:
            latest_risk = sorted(incident.risk_assessments, key=lambda r: r.created_at, reverse=True)[0]
            priority_score = float(latest_risk.composite_score or 50.0)

        return {
            "spill_area_km2": spill_area,
            "severity": severity,
            "wind_speed_ms": wind_speed,
            "wind_direction_deg": wind_dir,
            "current_speed_ms": current_speed,
            "current_direction_deg": current_dir,
            "wave_height_m": wave_height,
            "most_sensitive_ecosystem": most_sensitive_eco,
            "coastal_distance_km": coastal_distance_km,
            "earliest_coastal_impact_hours": coastal_eta_hours,
            "available_response_vessels": available_vessels_count,
            "incident_priority_score": priority_score,
            "oil_type": "HEAVY_CRUDE",
        }

    @classmethod
    def generate_cleanup_plan(
        cls,
        db: Session,
        incident_id: str,
        payload: CleanupPlanGenerateRequest | None = None,
    ) -> CleanupPlanResponse:
        """Generate and persist a smart cleanup plan for an incident."""
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident with ID {incident_id} not found.")

        # If existing plan exists and force_recalculate is False, return latest plan
        if payload and not payload.force_recalculate:
            existing_plan = (
                db.query(CleanupPlan)
                .filter(CleanupPlan.incident_id == incident_id)
                .order_by(CleanupPlan.created_at.desc())
                .first()
            )
            if existing_plan:
                return cls._format_plan_response(existing_plan, incident)

        # Gather real-time context across modules
        context = cls._gather_incident_context(db, incident)

        # Apply payload overrides if provided
        if payload and payload.oil_type:
            context["oil_type"] = payload.oil_type

        # Determine strategy and tier
        tier = CleanupRulesEngine.classify_spill_tier(
            context["spill_area_km2"], context["severity"]
        )

        strategy = (
            payload.strategy_focus
            if payload and payload.strategy_focus
            else CleanupRulesEngine.determine_primary_strategy(
                context["coastal_distance_km"],
                context["earliest_coastal_impact_hours"],
                context["spill_area_km2"],
                context["most_sensitive_ecosystem"],
            )
        )

        # Evaluate rules engine recommendations
        recs_data = CleanupRulesEngine.evaluate_recommendations(context)

        # Create or update CleanupPlan record
        plan = CleanupPlan(
            incident_id=incident.id,
            spill_size_tier=tier,
            oil_type=context["oil_type"],
            overall_strategy=strategy,
            status="ACTIVE",
            environmental_context=json.dumps(context),
            decision_support_disclaimer=(
                "[DECISION SUPPORT ONLY] Recommendations provide operational decision support for Incident Commanders "
                "and Coast Guard Response Teams. Does NOT constitute autonomous emergency command or dispatch authority."
            ),
        )
        db.add(plan)
        db.flush()

        # Add recommendations
        for item in recs_data:
            rec = CleanupRecommendation(
                plan_id=plan.id,
                action=item["action"],
                action_title=item["action_title"],
                reason=item["reason"],
                priority=item["priority"],
                suitability_score=item["suitability_score"],
                required_resources=json.dumps(item["required_resources"]),
                limitations=json.dumps(item["limitations"]),
                operational_status="RECOMMENDED",
            )
            db.add(rec)

        db.commit()
        db.refresh(plan)
        return cls._format_plan_response(plan, incident)

    @classmethod
    def get_cleanup_plan(cls, db: Session, incident_id: str) -> CleanupPlanResponse:
        """Get latest cleanup plan for an incident, generating one if none exists."""
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident with ID {incident_id} not found.")

        plan = (
            db.query(CleanupPlan)
            .filter(CleanupPlan.incident_id == incident_id)
            .order_by(CleanupPlan.created_at.desc())
            .first()
        )
        if not plan:
            return cls.generate_cleanup_plan(db, incident_id, CleanupPlanGenerateRequest(force_recalculate=True))

        return cls._format_plan_response(plan, incident)

    @classmethod
    def update_recommendation_status(
        cls,
        db: Session,
        incident_id: str,
        recommendation_id: str,
        target_status: str,
        decision_notes: str | None = None,
    ) -> CleanupRecommendationItem:
        """
        Accept or reject a recommendation.
        If ACCEPTED, an IncidentEvent is automatically logged into the incident audit trail.
        """
        target_status = target_status.upper()
        if target_status not in ["ACCEPTED", "REJECTED"]:
            raise ValueError(f"Invalid target status '{target_status}'. Must be 'ACCEPTED' or 'REJECTED'.")

        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident with ID {incident_id} not found.")

        rec = (
            db.query(CleanupRecommendation)
            .join(CleanupPlan)
            .filter(
                CleanupRecommendation.id == recommendation_id,
                CleanupPlan.incident_id == incident_id,
            )
            .first()
        )
        if not rec:
            raise ValueError(f"Recommendation {recommendation_id} not found for incident {incident_id}.")

        rec.operational_status = target_status
        rec.decision_notes = decision_notes
        rec.updated_at = datetime.now(timezone.utc)

        # Log into IncidentEvent lifecycle audit trail if accepted
        if target_status == "ACCEPTED":
            req_res_list = json.loads(rec.required_resources) if rec.required_resources else []
            resources_summary = ", ".join(req_res_list[:3]) if req_res_list else "Standard response units"

            event_desc = (
                f"Incident Commander APPROVED cleanup strategy: '{rec.action_title}' "
                f"(Priority: {rec.priority}, Suitability: {rec.suitability_score:.0f}%). "
                f"Required Resources: {resources_summary}. "
                f"Commander Notes: {decision_notes or 'Approved for rapid deployment.'}"
            )

            evt = IncidentEvent(
                incident_id=incident.id,
                event_type="CLEANUP_ACTION_ACCEPTED",
                description=event_desc,
                created_by="Incident Commander",
            )
            db.add(evt)
            logger.info("Logged IncidentEvent for accepted cleanup recommendation: %s", rec.action_title)

        db.commit()
        db.refresh(rec)

        req_res = json.loads(rec.required_resources) if isinstance(rec.required_resources, str) else []
        limits = json.loads(rec.limitations) if isinstance(rec.limitations, str) else []

        return CleanupRecommendationItem(
            id=rec.id,
            action=rec.action,
            action_title=rec.action_title,
            reason=rec.reason,
            priority=rec.priority,
            suitability_score=rec.suitability_score,
            required_resources=req_res,
            limitations=limits,
            operational_status=rec.operational_status,
            decision_notes=rec.decision_notes,
            created_at=rec.created_at.isoformat(),
            updated_at=rec.updated_at.isoformat(),
        )

    @classmethod
    def _format_plan_response(cls, plan: CleanupPlan, incident: Incident) -> CleanupPlanResponse:
        """Format ORM model into Pydantic schema."""
        env_raw = json.loads(plan.environmental_context) if isinstance(plan.environmental_context, str) else {}
        env_ctx = EnvironmentalContext(
            wind_speed_ms=env_raw.get("wind_speed_ms"),
            wind_direction_deg=env_raw.get("wind_direction_deg"),
            current_speed_ms=env_raw.get("current_speed_ms"),
            current_direction_deg=env_raw.get("current_direction_deg"),
            wave_height_m=env_raw.get("wave_height_m"),
            coastal_distance_km=env_raw.get("coastal_distance_km"),
            earliest_coastal_impact_hours=env_raw.get("earliest_coastal_impact_hours"),
            most_sensitive_ecosystem=env_raw.get("most_sensitive_ecosystem"),
            spill_area_km2=env_raw.get("spill_area_km2"),
            incident_priority_score=env_raw.get("incident_priority_score"),
            available_response_vessels=env_raw.get("available_response_vessels", 0),
        )

        recs: list[CleanupRecommendationItem] = []
        for r in plan.recommendations:
            req_res = json.loads(r.required_resources) if isinstance(r.required_resources, str) else []
            limits = json.loads(r.limitations) if isinstance(r.limitations, str) else []
            recs.append(
                CleanupRecommendationItem(
                    id=r.id,
                    action=r.action,
                    action_title=r.action_title,
                    reason=r.reason,
                    priority=r.priority,
                    suitability_score=r.suitability_score,
                    required_resources=req_res,
                    limitations=limits,
                    operational_status=r.operational_status,
                    decision_notes=r.decision_notes,
                    created_at=r.created_at.isoformat(),
                    updated_at=r.updated_at.isoformat(),
                )
            )

        return CleanupPlanResponse(
            id=plan.id,
            incident_id=plan.incident_id,
            incident_code=incident.incident_code,
            plan_code=plan.plan_code,
            spill_size_tier=plan.spill_size_tier,
            oil_type=plan.oil_type,
            overall_strategy=plan.overall_strategy,
            status=plan.status,
            environmental_context=env_ctx,
            recommendations=recs,
            decision_support_disclaimer=plan.decision_support_disclaimer,
            created_at=plan.created_at.isoformat(),
            updated_at=plan.updated_at.isoformat(),
        )
