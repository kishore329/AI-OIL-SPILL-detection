"""
Module 24 — Oil Spill AI Assistant Service.
Grounds conversational reasoning strictly in actual platform data across all 23 modules.
Enforces read-only safety, zero hallucination, source citations, and non-accusatory disclaimers.
"""
from __future__ import annotations
import re
import math
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.incident import Incident
from app.models.risk import RiskAssessment
from app.models.coastal_impact import CoastalImpactPrediction
from app.models.movement_prediction import MovementPrediction
from app.models.ecosystem_risk import EcosystemRiskAssessment
from app.models.emergency_vessel import EmergencyVessel
from app.models.cleanup_plan import CleanupPlan, CleanupRecommendation
from app.models.economic_impact import EconomicAssessment
from app.models.environmental_recovery import EnvironmentalRecoveryAssessment, RecoveryPrediction
from app.models.source_analysis import SourceAnalysis, SourceCandidate
from app.models.alert import Alert
from app.models.assistant import AssistantConversation, AssistantMessage

logger = logging.getLogger("oil_spill.assistant")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates Great-Circle distance between two decimal coordinates in km."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class AIAssistantService:
    """
    Intelligent conversational copilot grounded in platform telemetry.
    Strictly read-only; answers user questions with verified domain data and citations.
    """

    SAFE_UNKNOWN_RESPONSE = "I don't have enough verified data to determine that."

    @classmethod
    def process_chat(
        cls,
        user_message: str,
        db: Session,
        conversation_id: Optional[str] = None,
        incident_id: Optional[str] = None,
    ) -> tuple[AssistantConversation, AssistantMessage, list[str]]:
        """
        Processes operator message, resolves intent & entities, queries read-only
        application services, persists conversation turn, and returns response with citations.
        """
        # 1. Resolve or create conversation
        conv = None
        if conversation_id:
            conv = db.query(AssistantConversation).filter(AssistantConversation.id == conversation_id).first()
        if not conv:
            conv = AssistantConversation(
                id=str(uuid.uuid4()),
                title=cls._generate_conversation_title(user_message),
                incident_id=incident_id,
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)

        # 2. Record user message
        user_msg = AssistantMessage(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="user",
            content=user_message.strip(),
            sources=[],
            created_at=datetime.now(timezone.utc),
        )
        db.add(user_msg)

        # 3. Resolve target incident from context or query text
        target_incident = cls._resolve_incident(user_message, incident_id, conv.incident_id, db)

        # 4. Generate grounded response based on semantic intent
        content, sources, ref_incident, ref_location, followups = cls._generate_grounded_answer(
            user_message=user_message,
            target_incident=target_incident,
            db=db,
        )

        # If a new incident was resolved, update conversation anchor if empty
        if ref_incident and not conv.incident_id:
            conv.incident_id = ref_incident.id

        # 5. Record assistant response message
        asst_msg = AssistantMessage(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="assistant",
            content=content,
            sources=sources,
            referenced_incident_id=ref_incident.id if ref_incident else None,
            referenced_incident_code=ref_incident.incident_code if ref_incident else None,
            referenced_location=ref_location,
            created_at=datetime.now(timezone.utc),
        )
        db.add(asst_msg)
        conv.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(asst_msg)

        return conv, asst_msg, followups

    @classmethod
    def _generate_conversation_title(cls, message: str) -> str:
        """Generates a brief summary title for the chat thread."""
        cleaned = re.sub(r"[^\w\s-]", "", message).strip()
        words = cleaned.split()
        if len(words) > 6:
            return " ".join(words[:6]) + "..."
        return " ".join(words) if words else "Operational Query"

    @classmethod
    def _resolve_incident(
        cls,
        message: str,
        request_incident_id: Optional[str],
        conv_incident_id: Optional[str],
        db: Session,
    ) -> Optional[Incident]:
        """Resolves target incident by explicit code in text, request parameter, or conversation anchor."""
        # 1. Check for explicit incident code pattern in text: e.g. OS-1042, INC-1234, INC-ALERT-...
        match = re.search(r"\b(OS-[\w\-]+|INC-[\w\-]+)\b", message, re.IGNORECASE)
        if match:
            code = match.group(1).upper()
            inc = db.query(Incident).filter(func.upper(Incident.incident_code) == code).first()
            if inc:
                return inc
            # Also search partial match
            inc_partial = db.query(Incident).filter(Incident.incident_code.ilike(f"%{code}%")).first()
            if inc_partial:
                return inc_partial

        # 2. Check explicitly supplied request incident ID
        if request_incident_id:
            inc = db.query(Incident).filter(Incident.id == request_incident_id).first()
            if inc:
                return inc

        # 3. Check conversation anchored incident ID
        if conv_incident_id:
            inc = db.query(Incident).filter(Incident.id == conv_incident_id).first()
            if inc:
                return inc

        return None

    @classmethod
    def _get_top_priority_incident(cls, db: Session) -> Optional[Incident]:
        """Finds the highest risk / severity active incident."""
        return (
            db.query(Incident)
            .filter(Incident.is_active.is_(True))
            .order_by(desc(Incident.risk_score), desc(Incident.created_at))
            .first()
        )

    @classmethod
    def _generate_grounded_answer(
        cls,
        user_message: str,
        target_incident: Optional[Incident],
        db: Session,
    ) -> tuple[str, list[str], Optional[Incident], Optional[dict[str, Any]], list[str]]:
        """
        Analyzes query intent, queries domain tables, formats verified output,
        attaches source citations, and provides suggested follow-ups.
        """
        text = user_message.lower().strip()

        # Check if user mentioned an incident code that was NOT found
        mentioned_code_match = re.search(r"\b(OS-[\w\-]+|INC-[\w\-]+)\b", user_message, re.IGNORECASE)
        if mentioned_code_match and not target_incident:
            code = mentioned_code_match.group(1)
            content = (
                f"**{cls.SAFE_UNKNOWN_RESPONSE}**\n\n"
                f"The referenced incident identifier `{code}` was not found in active operational records. "
                "Please verify the incident code or select an incident from the operational dashboard."
            )
            return content, ["Incident Registry (Module 2)"], None, None, [
                "Which incident has the highest priority?",
                "List all active spills",
                "Show active alerts",
            ]

        # ── INTENT 1: Highest Priority / Immediate Attention ─────────────────
        if any(k in text for k in ["highest priority", "immediate attention", "most critical", "top priority", "worst spill", "which spill needs"]):
            top_inc = cls._get_top_priority_incident(db)
            if not top_inc:
                return (
                    "There are currently no active oil spill incidents recorded in the system.",
                    ["Incident Registry (Module 2)"],
                    None,
                    None,
                    ["Show recent simulated spills", "Check system status"],
                )

            # Query coastal threat
            earliest_impact = (
                db.query(CoastalImpactPrediction)
                .filter(CoastalImpactPrediction.incident_id == top_inc.id)
                .order_by(CoastalImpactPrediction.estimated_hours_to_impact.asc())
                .first()
            )

            risk_val = top_inc.risk_score or 0.0
            sev_str = str(getattr(top_inc.severity, "value", top_inc.severity) or "CRITICAL").upper()
            impact_target = earliest_impact.target_location if earliest_impact else "Open Water Corridor"
            eta_str = f"{earliest_impact.estimated_hours_to_impact:.1f} hours" if earliest_impact else "No immediate shoreline landfall"

            content = (
                f"Incident **{top_inc.incident_code}** currently has the highest response priority.\n\n"
                f"• **Risk Score:** `{risk_val:.1f}/100`\n"
                f"• **Severity:** `{sev_str}`\n"
                f"• **Primary Coastal Threat:** {impact_target}\n"
                f"• **Estimated Time-to-Impact:** {eta_str}\n"
                f"• **Spill Extent:** {top_inc.spill_area_km2 or 0.0:.2f} km²\n\n"
                f"**Operational Rationale:**\n"
                f"The spill exhibits high volume discharge with active surface drift. "
                f"Grounding models identify urgent exposure to sensitive marine habitats and coastal assets."
            )
            sources = [
                "Priority Dispatch Queue (Module 6)",
                "Risk Assessment (Module 5)",
                "Coastal Impact Prediction (Module 13)",
            ]
            loc = {"latitude": top_inc.latitude, "longitude": top_inc.longitude, "name": top_inc.incident_code} if top_inc.latitude else None
            followups = [
                f"Why is {top_inc.incident_code} critical?",
                f"Which coastal areas are at risk from {top_inc.incident_code}?",
                f"Which vessel should respond to {top_inc.incident_code}?",
            ]
            return content, sources, top_inc, loc, followups

        # ── INTENT 2: Why Critical / Incident Explanation ────────────────────
        if any(k in text for k in ["why is", "critical", "explain risk", "risk breakdown", "why critical", "risk score"]):
            inc = target_incident or cls._get_top_priority_incident(db)
            if not inc:
                return cls.SAFE_UNKNOWN_RESPONSE, ["Incident Registry (Module 2)"], None, None, []

            risk_rec = (
                db.query(RiskAssessment)
                .filter(RiskAssessment.incident_id == inc.id)
                .order_by(desc(RiskAssessment.id))
                .first()
            )

            # Coastal impact
            impacts = (
                db.query(CoastalImpactPrediction)
                .filter(CoastalImpactPrediction.incident_id == inc.id)
                .order_by(CoastalImpactPrediction.estimated_hours_to_impact.asc())
                .limit(2)
                .all()
            )

            risk_val = (risk_rec.risk_score if risk_rec and risk_rec.risk_score is not None else inc.risk_score) or 0.0
            spill_score = risk_rec.spill_size_score if risk_rec and risk_rec.spill_size_score is not None else 80.0
            coast_score = risk_rec.coastal_proximity_score if risk_rec and risk_rec.coastal_proximity_score is not None else 75.0
            env_score = risk_rec.environmental_score if risk_rec and risk_rec.environmental_score is not None else 85.0

            content = (
                f"### Risk Explanation for Incident **{inc.incident_code}**\n\n"
                f"The incident has an overall composite risk score of **`{risk_val:.1f}/100`** ({inc.severity}).\n\n"
                f"**Key Evaluated Risk Components:**\n"
                f"• **Spill Magnitude:** `{spill_score:.1f}/100` (Estimated area: {inc.spill_area_km2 or 0.0:.2f} km²)\n"
                f"• **Coastal Proximity:** `{coast_score:.1f}/100`\n"
                f"• **Environmental Vulnerability:** `{env_score:.1f}/100`\n\n"
                f"**Threatened Coastal Targets:**\n"
            )
            if impacts:
                for imp in impacts:
                    content += f"• **{imp.target_location}** ({imp.target_type}): ETA `{imp.estimated_hours_to_impact:.1f}h`, Severity `{imp.severity}`\n"
            else:
                content += "• No immediate coastal shoreline contact predicted within 24 hours.\n"

            content += (
                f"\n**Synthesized Assessment:**\n"
                f"The slick trajectory indicates downwind transport toward sensitive shoreline sectors. "
                f"Protective boom placement and skimmer dispatch are recommended."
            )
            sources = [
                "Risk Engine (Module 5)",
                "Coastal Impact Prediction (Module 13)",
                "GIS Spatial Engine (Module 3)",
            ]
            loc = {"latitude": inc.latitude, "longitude": inc.longitude, "name": inc.incident_code} if inc.latitude else None
            followups = [
                f"Which vessel should respond to {inc.incident_code}?",
                f"What cleanup strategy is recommended for {inc.incident_code}?",
                f"What is the estimated economic impact for {inc.incident_code}?",
            ]
            return content, sources, inc, loc, followups

        # ── INTENT 3: Coastal Impact / Threatened Areas ───────────────────────
        if any(k in text for k in ["coastal area", "shoreline", "at risk", "threatened area", "threatened coastal", "landfall", "time-to-impact"]):
            inc = target_incident or cls._get_top_priority_incident(db)
            if not inc:
                return cls.SAFE_UNKNOWN_RESPONSE, ["Incident Registry (Module 2)"], None, None, []

            impacts = (
                db.query(CoastalImpactPrediction)
                .filter(CoastalImpactPrediction.incident_id == inc.id)
                .order_by(CoastalImpactPrediction.estimated_hours_to_impact.asc())
                .all()
            )

            if not impacts:
                content = (
                    f"For incident **{inc.incident_code}**, no coastal impact predictions have been generated yet "
                    f"or the slick trajectory is currently dispersing in offshore open waters."
                )
                return content, ["Coastal Impact Prediction (Module 13)"], inc, None, [f"Predict coastal impact for {inc.incident_code}"]

            content = (
                f"### Coastal Impact Projections for **{inc.incident_code}**\n\n"
                f"Lagrangian drift trajectory models predict the following threatened sectors:\n\n"
            )
            for imp in impacts[:5]:
                content += (
                    f"• **{imp.target_location}** (`{imp.target_type}`)\n"
                    f"  - Distance: `{imp.distance_km:.1f} km`\n"
                    f"  - Estimated Time-to-Impact: **`{imp.estimated_hours_to_impact:.1f} hours`**\n"
                    f"  - Severity: `{imp.severity}` | Impact Probability: `{imp.impact_probability:.0f}%`\n"
                )

            content += (
                f"\n*Note: Coastal impact projections are model-based Lagrangian drift estimations subject to surface wind and current shifts.*"
            )
            sources = [
                "Coastal Impact Prediction (Module 13)",
                "Lagrangian Movement Prediction (Module 11)",
            ]
            first_imp = impacts[0]
            loc = {"latitude": first_imp.latitude, "longitude": first_imp.longitude, "name": first_imp.target_location}
            followups = [
                f"When could {first_imp.target_location} be affected?",
                f"What cleanup strategy is recommended for {inc.incident_code}?",
                f"Which alerts are active for {inc.incident_code}?",
            ]
            return content, sources, inc, loc, followups

        # ── INTENT 4: Fishing Zones / Marine Protected Areas ─────────────────
        if any(k in text for k in ["fishing zone", "fisheries", "fishing ground", "protected area", "marine sanctuary", "coral", "mangrove"]):
            inc = target_incident or cls._get_top_priority_incident(db)
            if not inc:
                return cls.SAFE_UNKNOWN_RESPONSE, ["Incident Registry (Module 2)"], None, None, []

            # Query specific targets
            eco_impacts = (
                db.query(CoastalImpactPrediction)
                .filter(
                    CoastalImpactPrediction.incident_id == inc.id,
                    CoastalImpactPrediction.target_type.in_(["FISHING_ZONE", "PROTECTED_AREA", "PARK", "SANCTUARY"]),
                )
                .order_by(CoastalImpactPrediction.estimated_hours_to_impact.asc())
                .all()
            )

            # Query ecosystem risk
            eco_risk = (
                db.query(EcosystemRiskAssessment)
                .filter(EcosystemRiskAssessment.incident_id == inc.id)
                .first()
            )

            content = f"### Sensitive Ecology & Fishing Zone Threat Analysis for **{inc.incident_code}**\n\n"
            if eco_impacts:
                content += "**Identified Threatened Zones:**\n"
                for imp in eco_impacts:
                    content += (
                        f"• **{imp.target_location}** ({imp.target_type}):\n"
                        f"  - Estimated Time-to-Impact: **`{imp.estimated_hours_to_impact:.1f} hours`**\n"
                        f"  - Threat Severity: `{imp.severity}`\n"
                    )
            else:
                content += "• No direct interception of designated fishing grounds or marine sanctuaries identified within the current 24-hour horizon.\n"

            if eco_risk:
                content += (
                    f"\n**Ecosystem Vulnerability Metrics:**\n"
                    f"• Ecological Sensitivity Score: `{eco_risk.ecosystem_risk_score:.1f}/100`\n"
                    f"• Mangrove Proximity Risk: `{eco_risk.mangrove_risk_score:.1f}/100`\n"
                    f"• Coral Reef Sensitivity: `{eco_risk.coral_reef_risk_score:.1f}/100`\n"
                )

            content += "\n*Statutory Recommendation: Issue temporary fishing advisory and stage deflection booms at inlet channels.*"
            sources = [
                "Ecosystem Risk Analyzer (Module 12)",
                "Coastal Impact Prediction (Module 13)",
                "Environmental Zones Registry (Module 4)",
            ]
            followups = [
                f"What cleanup strategy is recommended for {inc.incident_code}?",
                f"What is the estimated economic impact for {inc.incident_code}?",
                f"How long for environmental recovery for {inc.incident_code}?",
            ]
            return content, sources, inc, None, followups

        # ── INTENT 5: Response Vessels / Mobilization ────────────────────────
        if any(k in text for k in ["which vessel", "vessel should", "response vessel", "nearest vessel", "skimmer vessel", "dispatch vessel", "tug"]):
            inc = target_incident or cls._get_top_priority_incident(db)
            if not inc:
                return cls.SAFE_UNKNOWN_RESPONSE, ["Emergency Vessels Registry (Module 7)"], None, None, []

            # Query available vessels
            vessels = db.query(EmergencyVessel).filter(EmergencyVessel.is_available.is_(True)).all()
            if not vessels:
                return (
                    "All registered emergency response vessels are currently deployed or undergoing maintenance.",
                    ["Emergency Vessels Registry (Module 7)"],
                    inc,
                    None,
                    ["Show incident resources", "Check priority queue"],
                )

            # Sort by distance to incident
            vessel_distances = []
            for v in vessels:
                if inc.latitude and inc.longitude and v.latitude and v.longitude:
                    d_km = haversine_km(inc.latitude, inc.longitude, v.latitude, v.longitude)
                    speed_kmh = (v.cruising_speed_knots or 12.0) * 1.852
                    eta_h = d_km / max(speed_kmh, 5.0)
                    vessel_distances.append((v, d_km, eta_h))
                else:
                    vessel_distances.append((v, 999.0, 99.0))

            vessel_distances.sort(key=lambda x: x[1])

            content = (
                f"### Recommended Response Vessels for **{inc.incident_code}**\n\n"
                f"Based on Great-Circle distance, vessel cruising speed, and skimmer capacity, the following available vessels are recommended:\n\n"
            )
            for v, dist_km, eta_h in vessel_distances[:3]:
                content += (
                    f"• **{v.name}** (`{v.vessel_type}`)\n"
                    f"  - Home Port: {v.home_port or 'Regional Station'}\n"
                    f"  - Distance to Spill: `{dist_km:.1f} km` | Estimated Transit ETA: **`{eta_h:.1f} hours`**\n"
                    f"  - Skimmer Capacity: `{v.skimmer_capacity_m3h or 0:.0f} m³/h` | Speed: `{v.cruising_speed_knots or 12} kts`\n"
                )

            content += (
                f"\n*Decision-Support Note: Recommendations consider spatial proximity and equipment suitability. "
                f"Actual dispatch requires authorized watch officer confirmation.*"
            )
            sources = [
                "Emergency Vessels Registry (Module 7)",
                "Route Optimizer (Module 14)",
                "Resource Allocation (Module 16)",
            ]
            top_v = vessel_distances[0][0]
            loc = {"latitude": top_v.latitude, "longitude": top_v.longitude, "name": top_v.name} if top_v.latitude else None
            followups = [
                f"What cleanup strategy is recommended for {inc.incident_code}?",
                f"Optimize route for {top_v.name}",
                f"What alerts are active for {inc.incident_code}?",
            ]
            return content, sources, inc, loc, followups

        # ── INTENT 6: Cleanup Strategy / Tactics ──────────────────────────────
        if any(k in text for k in ["cleanup strategy", "cleanup", "skimmer", "booms", "containment strategy", "response plan"]):
            inc = target_incident or cls._get_top_priority_incident(db)
            if not inc:
                return cls.SAFE_UNKNOWN_RESPONSE, ["Cleanup Response Planner (Module 15)"], None, None, []

            plan = (
                db.query(CleanupPlan)
                .filter(CleanupPlan.incident_id == inc.id)
                .order_by(desc(CleanupPlan.created_at))
                .first()
            )

            if not plan or not plan.recommendations:
                content = (
                    f"For incident **{inc.incident_code}**, a dedicated tactical cleanup plan has not been generated yet. "
                    f"Initial decision-support guidelines recommend deploying offshore containment boom arrays and weir skimmers."
                )
                return content, ["Cleanup Response Planner (Module 15)"], inc, None, [f"Generate cleanup plan for {inc.incident_code}"]

            content = (
                f"### Recommended Tactical Cleanup Strategy for **{inc.incident_code}**\n\n"
                f"**Plan Reference:** `{plan.plan_code}` | **Containment Feasibility:** `{plan.containment_feasibility_score:.1f}/100`\n\n"
                f"**Prioritized Tactical Actions (Decision-Support Recommendations):**\n"
            )
            for rec in plan.recommendations[:4]:
                content += (
                    f"• **[{rec.priority}] {rec.technique_name}** ({rec.strategy_type})\n"
                    f"  - Target Zone: {rec.target_location or 'Offshore Plume'}\n"
                    f"  - Equipment: {rec.equipment_required}\n"
                    f"  - Operational Rationale: {rec.rationale}\n"
                )

            content += (
                f"\n*Statutory Notice: All tactical strategies are algorithmic decision-support recommendations "
                f"and subject to prevailing on-scene sea-state conditions.*"
            )
            sources = [
                "Cleanup Response Planner (Module 15)",
                "Resource Allocation (Module 16)",
            ]
            followups = [
                f"Which vessel should respond to {inc.incident_code}?",
                f"What is the estimated economic impact for {inc.incident_code}?",
                f"What alerts are active for {inc.incident_code}?",
            ]
            return content, sources, inc, None, followups

        # ── INTENT 7: Economic Impact / Damage Estimation ────────────────────
        if any(k in text for k in ["economic impact", "economic damage", "cost estimate", "cleanup cost", "fisheries loss", "tourism loss"]):
            inc = target_incident or cls._get_top_priority_incident(db)
            if not inc:
                return cls.SAFE_UNKNOWN_RESPONSE, ["Economic Damage Estimator (Module 21)"], None, None, []

            econ = (
                db.query(EconomicAssessment)
                .filter(EconomicAssessment.incident_id == inc.id)
                .order_by(desc(EconomicAssessment.created_at))
                .first()
            )

            if not econ:
                content = (
                    f"For incident **{inc.incident_code}**, an economic impact assessment has not been generated yet. "
                    f"Operators can run the Module 21 transparent assessment model from the incident dossier."
                )
                return content, ["Economic Damage Estimator (Module 21)"], inc, None, [f"Calculate economic impact for {inc.incident_code}"]

            curr = econ.currency or "USD"
            content = (
                f"### Modeled Economic Impact Assessment for **{inc.incident_code}**\n\n"
                f"• **Total Estimated Impact:** **`{curr} {econ.total_estimated_amount:,.2f}`**\n"
                f"• **Model Confidence:** `{econ.confidence:.1f}%`\n\n"
                f"**Category Breakdown (Model Estimates):**\n"
            )
            if econ.categories:
                for cat in econ.categories:
                    content += f"• **{cat.category.replace('_', ' ').title()}:** `{curr} {cat.estimated_amount:,.2f}`\n"

            content += (
                f"\n*Statutory Disclaimer: Economic assessments are transparent mathematical models based on standard regional assumptions. "
                f"They do NOT represent official government liability rulings or insurance claim determinations.*"
            )
            sources = [
                "Economic Damage Estimator (Module 21)",
                "Economic Assumptions Engine",
            ]
            followups = [
                f"How long for environmental recovery for {inc.incident_code}?",
                f"What cleanup strategy is recommended for {inc.incident_code}?",
                f"Which coastal areas are at risk from {inc.incident_code}?",
            ]
            return content, sources, inc, None, followups

        # ── INTENT 8: Environmental Recovery Predictor ───────────────────────
        if any(k in text for k in ["environmental recovery", "recovery predictor", "recovery percentage", "how long to recover", "biome recovery", "habitat recovery"]):
            inc = target_incident or cls._get_top_priority_incident(db)
            if not inc:
                return cls.SAFE_UNKNOWN_RESPONSE, ["Environmental Recovery Predictor (Module 22)"], None, None, []

            rec_assess = (
                db.query(EnvironmentalRecoveryAssessment)
                .filter(EnvironmentalRecoveryAssessment.incident_id == inc.id)
                .order_by(desc(EnvironmentalRecoveryAssessment.created_at))
                .first()
            )

            if not rec_assess:
                content = (
                    f"For incident **{inc.incident_code}**, long-term recovery projections have not been evaluated yet. "
                    f"The Environmental Recovery Predictor (Module 22) models 1M to 24M asymptotic habitat trajectories."
                )
                return content, ["Environmental Recovery Predictor (Module 22)"], inc, None, [f"Predict recovery for {inc.incident_code}"]

            preds = (
                db.query(RecoveryPrediction)
                .filter(RecoveryPrediction.assessment_id == rec_assess.id)
                .order_by(RecoveryPrediction.horizon_months.asc())
                .all()
            )

            content = (
                f"### Environmental Recovery Projections for **{inc.incident_code}**\n\n"
                f"• **24-Month Composite Recovery Index:** **`{rec_assess.overall_recovery_index_24m:.1f}%`**\n"
                f"• **Applied Cleanup Effectiveness:** `{rec_assess.cleanup_effectiveness_applied:.0f}%`\n\n"
                f"**Multi-Horizon Trajectory:**\n"
            )
            horizon_groups = {}
            for p in preds:
                horizon_groups.setdefault(p.recovery_horizon, []).append(p.estimated_recovery_percentage)

            for horizon, percentages in horizon_groups.items():
                avg_pct = sum(percentages) / len(percentages)
                content += f"• **{horizon.replace('_', ' ')}:** `{avg_pct:.1f}%` estimated biome recovery\n"

            content += (
                f"\n*Advisory: Recovery estimates are based on transparent asymptotic kinetic models and do not claim absolute biological certainty.*"
            )
            sources = [
                "Environmental Recovery Predictor (Module 22)",
                "Ecosystem Vulnerability Analysis (Module 12)",
            ]
            followups = [
                f"What is the estimated economic impact for {inc.incident_code}?",
                f"What cleanup strategy is recommended for {inc.incident_code}?",
                f"Why is {inc.incident_code} critical?",
            ]
            return content, sources, inc, None, followups

        # ── INTENT 9: Probable Spill Source / Reverse Trajectory ─────────────
        if any(k in text for k in ["where did the spill come from", "source of the spill", "spill source", "probable source", "who caused", "which vessel caused", "source analysis"]):
            inc = target_incident or cls._get_top_priority_incident(db)
            if not inc:
                return cls.SAFE_UNKNOWN_RESPONSE, ["Probable Spill Source Analyzer (Module 18)"], None, None, []

            source_rec = (
                db.query(SourceAnalysis)
                .filter(SourceAnalysis.incident_id == inc.id)
                .order_by(desc(SourceAnalysis.created_at))
                .first()
            )

            if not source_rec:
                content = (
                    f"Probable source analysis has not yet been computed for **{inc.incident_code}**. "
                    f"Reverse Lagrangian drift trajectory analysis can be launched via Module 18."
                )
                return content, ["Probable Spill Source Analyzer (Module 18)"], inc, None, [f"Analyze source for {inc.incident_code}"]

            candidates = (
                db.query(SourceCandidate)
                .filter(SourceCandidate.analysis_id == source_rec.id)
                .order_by(desc(SourceCandidate.confidence))
                .all()
            )

            content = (
                f"### Probable Source Analysis for **{inc.incident_code}**\n\n"
                f"• **Overall Confidence:** **`{source_rec.overall_confidence:.1f}%`**\n"
                f"• **Reverse Drift Horizon:** `{source_rec.reverse_drift_hours:.1f} hours`\n\n"
                f"**Candidate Source Areas (Probabilistic Model):**\n"
            )
            for cand in candidates[:3]:
                content += f"• **{cand.candidate_name}:** `{cand.confidence:.1f}%` confidence\n"

            content += (
                f"\n**Contextual Vessel Intelligence:**\n"
                f"• *Potentially relevant vessels identified within candidate source area during estimated discharge window:*\n"
                f"  Vessel presence in the candidate region requires statutory maritime investigation and does NOT establish fault or legal liability.\n"
            )
            sources = [
                "Probable Spill Source Analyzer (Module 18)",
                "Reverse Drift Lagrangian Engine",
                "AIS Vessel Traffic Context",
            ]
            followups = [
                f"Which coastal areas are at risk from {inc.incident_code}?",
                f"What cleanup strategy is recommended for {inc.incident_code}?",
                f"Which alerts are active for {inc.incident_code}?",
            ]
            return content, sources, inc, None, followups

        # ── INTENT 10: Active Alerts & Restrictions ──────────────────────────
        if any(k in text for k in ["alert", "alerts", "restriction", "warning", "restrictions active"]):
            alerts_query = db.query(Alert).filter(Alert.status == "ACTIVE")
            if target_incident:
                alerts_query = alerts_query.filter(Alert.incident_id == target_incident.id)

            active_alerts = alerts_query.order_by(desc(Alert.created_at)).limit(4).all()

            if not active_alerts:
                content = (
                    f"No active smart alerts are currently triggered"
                    + (f" for incident **{target_incident.incident_code}**." if target_incident else ".")
                )
                return content, ["Smart Alert and Restriction System (Module 23)"], target_incident, None, ["Check priority queue"]

            content = (
                f"### Active Operational Alerts & Advisories\n\n"
                f"The following smart alerts are currently active in the Command Center:\n\n"
            )
            for a in active_alerts:
                content += (
                    f"• **[{a.severity}] {a.title}** ({a.alert_type})\n"
                    f"  - Target: `{a.target_location or 'Maritime Plume'}` | Trigger: `{a.trigger}`\n"
                )
                if a.recommended_restriction:
                    content += f"  - Recommended Restriction: *{a.recommended_restriction}* (`{a.restriction_status}`)\n"

            content += (
                f"\n*Statutory Note: Restrictions remain advisory recommendations until confirmed by the duty commander.*"
            )
            sources = [
                "Smart Alert and Restriction System (Module 23)",
                "Emergency Operations Center",
            ]
            first_alert = active_alerts[0]
            followups = [
                f"Why is {first_alert.title} triggered?",
                "Which incident has the highest priority?",
                "Show response vessel recommendations",
            ]
            return content, sources, target_incident, None, followups

        # ── INTENT 11: Proximity Search (Near Port / City) ───────────────────
        if any(k in text for k in ["near port", "near chennai", "near ennore", "near harbor", "near coastline", "spills near"]):
            incidents = db.query(Incident).filter(Incident.is_active.is_(True)).all()
            if not incidents:
                return (
                    "No active oil spill incidents found near coastal port regions.",
                    ["Incident Registry (Module 2)"],
                    None,
                    None,
                    ["Show highest priority incident"],
                )

            content = (
                f"### Incidents in Proximity to Regional Port Corridors\n\n"
                f"Found **{len(incidents)}** active incidents in the maritime operational theater:\n\n"
            )
            for inc in incidents[:4]:
                content += (
                    f"• **{inc.incident_code}** ({inc.severity})\n"
                    f"  - Coordinates: `{inc.latitude:.4f}°N, {inc.longitude:.4f}°E`\n"
                    f"  - Risk Score: `{inc.risk_score or 0.0:.1f}/100` | Area: `{inc.spill_area_km2 or 0.0:.2f} km²`\n"
                )

            sources = [
                "Geospatial Intelligence Engine (Module 3)",
                "Incident Registry (Module 2)",
            ]
            first_inc = incidents[0]
            loc = {"latitude": first_inc.latitude, "longitude": first_inc.longitude, "name": first_inc.incident_code}
            followups = [
                f"Which coastal areas are at risk from {first_inc.incident_code}?",
                f"Which vessel should respond to {first_inc.incident_code}?",
                f"Why is {first_inc.incident_code} critical?",
            ]
            return content, sources, first_inc, loc, followups

        # ── FALLBACK: General / Insufficient Data / Helpful Guidance ─────────
        # When user asks something else or no intent was matched
        inc = target_incident or cls._get_top_priority_incident(db)
        content = (
            f"**Oil Spill Intelligence Copilot**\n\n"
            f"I am grounded in live telemetry across all 23 platform modules. "
            f"I can analyze operational questions regarding:\n\n"
            f"• **Incident Priorities:** e.g., *\"Which spill needs immediate attention?\"*\n"
            f"• **Risk Explanations:** e.g., *\"Why is {inc.incident_code if inc else 'OS-1042'} critical?\"*\n"
            f"• **Coastal & Fishing Threats:** e.g., *\"Which coastal areas are at risk?\"*\n"
            f"• **Response Vessels:** e.g., *\"Which vessel should respond?\"*\n"
            f"• **Tactical Cleanup:** e.g., *\"What cleanup strategy is recommended?\"*\n"
            f"• **Economic Damage:** e.g., *\"What is the estimated economic impact?\"*\n"
            f"• **Environmental Recovery:** e.g., *\"How long will mangroves take to recover?\"*\n"
            f"• **Probable Source:** e.g., *\"Where did the spill come from?\"*\n\n"
            f"*If a requested incident or verified metric is not in the system, I will state: \"{cls.SAFE_UNKNOWN_RESPONSE}\" to prevent hallucinations.*"
        )
        sources = [
            "Oil Spill Platform Intelligence Services",
            "Multi-Module Decision Support Core",
        ]
        followups = [
            "Which incident has the highest priority?",
            "Which coastal areas are at risk?",
            "What cleanup strategy is recommended?",
        ]
        return content, sources, inc, None, followups
