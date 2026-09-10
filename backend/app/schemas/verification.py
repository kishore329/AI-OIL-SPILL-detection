"""
Pydantic schemas for Module 17 — Multi-Source Verification.
"""
from typing import Optional, Any
from pydantic import BaseModel, Field


class VerificationSourceItem(BaseModel):
    id: str
    code: str
    name: str
    default_weight: float
    description: Optional[str] = None
    is_active: bool = True

    model_config = {"from_attributes": True}


class VerificationEvidenceItem(BaseModel):
    id: str
    source_code: str = Field(..., description="SATELLITE, DRONE, CITIZEN_REPORT, AIS_VESSEL, or METOCEAN_CONTEXT")
    provider_name: str
    confidence: float = Field(..., ge=0.0, le=1.0, description="Source confidence from 0.0 to 1.0")
    weight_applied: float = Field(..., description="Calculated weight percentage applied")
    quality_score: float = Field(1.0, ge=0.0, le=1.0, description="Quality/reliability multiplier")
    data_origin: str = Field("SIMULATED", description="LIVE, HISTORICAL, or SIMULATED")
    evidence_type: str
    agrees_with_spill: bool = True
    evidence_metadata: Optional[dict[str, Any]] = None
    notes: Optional[str] = None
    timestamp: str

    model_config = {"from_attributes": True}


class VerificationRecordSchema(BaseModel):
    id: str
    incident_id: str
    overall_confidence: float = Field(..., description="Final overall weighted verification score (0.0 to 1.0 or 0-100%)")
    decision: str = Field(..., description="VERIFIED, NEEDS_REVIEW, or REJECTED")
    cross_source_agreement_score: float = Field(..., description="0.0 to 1.0 indicator of consensus")
    contradiction_detected: bool = False
    explanation: Optional[str] = None
    verified_by: str
    verified_at: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class VerificationResponse(BaseModel):
    """Full verification dossier returned to the client."""
    incident_id: str
    incident_code: str
    incident_severity: Optional[str] = None
    overall_confidence_score: float = Field(..., ge=0.0, le=100.0, description="Verification percentage score (0-100%)")
    decision: str = Field(..., description="VERIFIED, NEEDS_REVIEW, or REJECTED")
    cross_source_agreement_pct: float = Field(..., description="Agreement percentage across sources")
    contradiction_detected: bool = False
    decision_rationale: str
    verified_by: str
    verified_at: str
    sources_evaluated_count: int
    weights_summary: dict[str, float] = Field(default_factory=dict)
    evidence_breakdown: list[VerificationEvidenceItem] = Field(default_factory=list)
    available_sources: list[VerificationSourceItem] = Field(default_factory=list)
    model_disclaimer: str = Field(
        "[MULTI-SOURCE CONSENSUS] Verification score synthesizes satellite SAR anomaly, "
        "eyewitness reports, drone flights, AIS track proximity, and metocean current convergence."
    )


class VerificationEvaluateRequest(BaseModel):
    """Payload to trigger multi-source verification re-evaluation."""
    force_recalculate: bool = True
    custom_weights: Optional[dict[str, float]] = Field(
        None,
        description="Optional custom source weights map (e.g. {'SATELLITE': 0.30, 'DRONE': 0.20, 'CITIZEN_REPORT': 0.15, 'AIS_VESSEL': 0.15, 'METOCEAN_CONTEXT': 0.20})"
    )


class VerificationEvidenceAddRequest(BaseModel):
    """Payload for submitting a new evidence item to an incident."""
    source_code: str = Field(..., description="SATELLITE, DRONE, CITIZEN_REPORT, AIS_VESSEL, or METOCEAN_CONTEXT")
    provider_name: str = Field("External Evidence Provider", description="Name/callsign of sensor or observer")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0 (e.g., 0.85)")
    quality_score: Optional[float] = Field(1.0, ge=0.0, le=1.0)
    data_origin: Optional[str] = Field("SIMULATED", description="LIVE, HISTORICAL, or SIMULATED")
    evidence_type: str = Field("MANUAL_EVIDENCE_SUBMISSION", description="e.g. UAV_THERMAL_FRAME, CITIZEN_VISUAL_REPORT")
    agrees_with_spill: bool = Field(True, description="True if evidence confirms spill, False if contradicts")
    evidence_metadata: Optional[dict[str, Any]] = None
    notes: Optional[str] = None


class VerificationOverrideRequest(BaseModel):
    """Payload for authorized operator manual verification decision override."""
    decision: str = Field(..., description="VERIFIED, NEEDS_REVIEW, or REJECTED")
    decision_notes: str = Field(..., description="Commander rationale for overriding automated evidence decision")
    operator_name: str = Field("Incident Commander", description="Name/rank of authorizing operator")
