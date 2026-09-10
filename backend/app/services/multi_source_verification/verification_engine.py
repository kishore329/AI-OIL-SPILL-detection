"""
Core Weighted Scoring and Evidence Consensus Engine for Module 17.
"""
from typing import Optional
from app.services.multi_source_verification.base_provider import EvidencePayload


class VerificationEvaluationResult:
    """Calculated metrics and decision output from the verification engine."""
    def __init__(
        self,
        overall_confidence: float,  # 0.0 to 1.0
        decision: str,  # VERIFIED, NEEDS_REVIEW, REJECTED
        agreement_score: float,  # 0.0 to 1.0
        contradiction_detected: bool,
        explanation: str,
        weights_summary: dict[str, float],
        evaluated_evidence: list[dict],
    ):
        self.overall_confidence = overall_confidence
        self.decision = decision
        self.agreement_score = agreement_score
        self.contradiction_detected = contradiction_detected
        self.explanation = explanation
        self.weights_summary = weights_summary
        self.evaluated_evidence = evaluated_evidence


class MultiSourceVerificationEngine:
    """
    Synthesizes evidence from multiple independent sources using configurable
    weighted scoring, quality adjustment multipliers, and contradiction detection.
    """
    
    DEFAULT_WEIGHTS = {
        "SATELLITE": 0.30,
        "DRONE": 0.20,
        "CITIZEN_REPORT": 0.15,
        "AIS_VESSEL": 0.15,
        "METOCEAN_CONTEXT": 0.20,
    }

    def evaluate(
        self,
        evidence_items: list[EvidencePayload],
        custom_weights: Optional[dict[str, float]] = None
    ) -> VerificationEvaluationResult:
        if not evidence_items:
            return VerificationEvaluationResult(
                overall_confidence=0.0,
                decision="NEEDS_REVIEW",
                agreement_score=0.0,
                contradiction_detected=False,
                explanation="No multi-source evidence submitted for evaluation. Manual review required.",
                weights_summary={},
                evaluated_evidence=[],
            )

        # 1. Resolve & normalize weights for present sources
        base_weights = {**self.DEFAULT_WEIGHTS, **(custom_weights or {})}
        present_sources = {item.source_code for item in evidence_items}
        
        sum_present_weights = sum(base_weights.get(src, 0.20) for src in present_sources)
        if sum_present_weights <= 0:
            sum_present_weights = 1.0
            
        normalized_weights = {
            src: (base_weights.get(src, 0.20) / sum_present_weights)
            for src in present_sources
        }

        # 2. Evaluate evidence items
        weighted_confidence_sum = 0.0
        total_weight_applied = 0.0
        agree_count = 0
        disagree_count = 0
        contradiction_detected = False
        evaluated_list = []

        for item in evidence_items:
            w = normalized_weights.get(item.source_code, 0.20)
            
            # Quality-adjusted effective confidence
            effective_conf = item.confidence * item.quality_score
            
            if item.agrees_with_spill:
                score_contrib = effective_conf * w
                agree_count += 1
            else:
                # Contradictory evidence reduces overall confidence
                score_contrib = -0.5 * effective_conf * w
                disagree_count += 1
                if effective_conf >= 0.60:
                    contradiction_detected = True

            weighted_confidence_sum += score_contrib
            total_weight_applied += w

            evaluated_list.append({
                "source_code": item.source_code,
                "provider_name": item.provider_name,
                "confidence": round(item.confidence, 4),
                "quality_score": round(item.quality_score, 2),
                "weight_applied": round(w, 4),
                "data_origin": item.data_origin,
                "evidence_type": item.evidence_type,
                "agrees_with_spill": item.agrees_with_spill,
                "evidence_metadata": item.evidence_metadata,
                "notes": item.notes,
            })

        # 3. Overall confidence score (0.0 to 1.0)
        overall_confidence = max(0.0, min(1.0, weighted_confidence_sum))
        
        # 4. Cross-source agreement score
        total_items = len(evidence_items)
        agreement_score = round(agree_count / total_items, 3) if total_items > 0 else 0.0

        if disagree_count > 0 and agree_count > 0:
            contradiction_detected = True

        # 5. Apply Decision Threshold Rules
        # Safeguard: Do not auto-verify from a single source or if contradiction exists
        if total_items < 2 and overall_confidence < 0.90:
            decision = "NEEDS_REVIEW"
            rationale_prefix = "Single-source detection requires operator review."
        elif contradiction_detected:
            decision = "NEEDS_REVIEW"
            rationale_prefix = f"Contradictory evidence detected ({agree_count} confirming vs {disagree_count} conflicting)."
        elif overall_confidence >= 0.75 and agreement_score >= 0.70:
            decision = "VERIFIED"
            rationale_prefix = "High multi-source consensus confirmed."
        elif overall_confidence < 0.45:
            decision = "REJECTED"
            rationale_prefix = "Insufficient evidence confidence to confirm incident."
        else:
            decision = "NEEDS_REVIEW"
            rationale_prefix = "Moderate evidence confidence; manual verification requested."

        explanation = (
            f"[{decision}] {rationale_prefix} Weighted verification score: "
            f"{round(overall_confidence * 100, 1)}%. Evaluated {total_items} evidence provider(s) "
            f"({agree_count} confirming, {disagree_count} conflicting)."
        )

        return VerificationEvaluationResult(
            overall_confidence=round(overall_confidence, 4),
            decision=decision,
            agreement_score=agreement_score,
            contradiction_detected=contradiction_detected,
            explanation=explanation,
            weights_summary={src: round(w, 4) for src, w in normalized_weights.items()},
            evaluated_evidence=evaluated_list,
        )
