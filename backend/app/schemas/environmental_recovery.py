"""
Module 22 — Environmental Recovery Predictor Pydantic Schemas.
Validation and serialization schemas for ecosystem recovery trajectories,
time-horizon predictions (1M, 3M, 6M, 12M, 24M), and kinetic parameter profiles.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class RecoveryPredictionItem(BaseModel):
    id: str
    assessment_id: str
    incident_id: str
    ecosystem_type: str = Field(..., description="MANGROVES, CORAL_REEFS, FISHERIES, MARINE_HABITATS, COASTAL_ECOSYSTEMS")
    ecosystem_title: str
    recovery_horizon: str = Field(..., description="1_MONTH, 3_MONTHS, 6_MONTHS, 12_MONTHS, 24_MONTHS")
    horizon_months: int = Field(..., description="1, 3, 6, 12, or 24")
    estimated_recovery_percentage: float = Field(..., ge=0.0, le=100.0)
    confidence: float = Field(..., ge=0.0, le=100.0)
    milestone_status: str
    assumptions: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class MilestoneItem(BaseModel):
    month: int
    label: str
    description: str
    reached: bool


class EcosystemTrajectoryDetail(BaseModel):
    ecosystem_type: str
    ecosystem_title: str
    baseline_k: float
    effective_k: float
    asymptotic_max: float
    trajectories: dict[str, float]  # e.g. {"1M": 20.0, "3M": 40.0, "6M": 60.0, "12M": 80.0, "24M": 95.0}
    milestones: list[MilestoneItem] = Field(default_factory=list)


class EnvironmentalRecoveryResponse(BaseModel):
    id: str
    incident_id: str
    overall_recovery_index_24m: float
    cleanup_effectiveness_applied: float
    ecosystem_risk_score_applied: float
    exposure_duration_hours: float
    spill_severity_tier: str
    ecosystems_evaluated_count: int
    confidence_percentage: float
    trajectories: list[EcosystemTrajectoryDetail]
    predictions: list[RecoveryPredictionItem]
    model_name: str
    disclaimer: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RecoveryFactorBase(BaseModel):
    ecosystem_type: str
    ecosystem_title: str
    baseline_recovery_rate_k: float = Field(..., gt=0.0, le=1.0)
    asymptotic_max_recovery: float = Field(..., gt=0.0, le=100.0)
    shape_exponent_gamma: float = Field(1.1, gt=0.1, le=3.0)
    ecosystem_sensitivity_weight: float = Field(1.0, ge=0.1, le=5.0)
    base_confidence: float = Field(80.0, ge=10.0, le=100.0)
    notes: Optional[str] = None


class RecoveryFactorResponse(RecoveryFactorBase):
    id: str
    incident_id: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecoveryFactorUpdate(BaseModel):
    baseline_recovery_rate_k: Optional[float] = Field(None, gt=0.0, le=1.0)
    asymptotic_max_recovery: Optional[float] = Field(None, gt=0.0, le=100.0)
    shape_exponent_gamma: Optional[float] = Field(None, gt=0.1, le=3.0)
    ecosystem_sensitivity_weight: Optional[float] = Field(None, ge=0.1, le=5.0)
    base_confidence: Optional[float] = Field(None, ge=10.0, le=100.0)
    notes: Optional[str] = None


class RecoveryCalculationRequest(BaseModel):
    cleanup_effectiveness_override: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Optional manual override for cleanup plan effectiveness (0.0 to 1.0)"
    )
    exposure_duration_override_hours: Optional[float] = Field(
        None, ge=1.0, description="Optional override for hydrocarbon exposure duration before containment"
    )
    custom_factors: Optional[dict[str, Any]] = Field(
        None, description="Optional custom kinetic parameter overrides by ecosystem type"
    )
    transition_to_recovery_stage: Optional[bool] = Field(
        False, description="Whether to automatically advance incident status to RECOVERY"
    )
    operator_notes: Optional[str] = None


class LifecycleTransitionRequest(BaseModel):
    new_status: str = Field("RECOVERY", description="Target lifecycle status (e.g. RECOVERY or MONITORING)")
    authorizing_officer: str = Field("Incident Commander", description="Officer authorizing stage transition")
    transition_notes: str = Field(..., description="Operational justification for transitioning to environmental recovery monitoring")


class LifecycleTransitionResponse(BaseModel):
    incident_id: str
    previous_status: str
    current_status: str
    event_id: str
    authorizing_officer: str
    notes: str
    transitioned_at: datetime
