"""
Module 23 — Smart Alert and Restriction System Pydantic Schemas.
Validation and serialization schemas for intelligent incident alerts,
configurable trigger rules, recipients, and operator restriction sign-off.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class AlertRecipientSchema(BaseModel):
    id: str
    recipient_group: str
    channel: str
    delivery_status: str
    dispatched_at: datetime

    model_config = {"from_attributes": True}


class AlertEventSchema(BaseModel):
    id: str
    alert_id: str
    incident_id: str
    event_type: str
    operator_name: Optional[str] = "System"
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertResponse(BaseModel):
    id: str
    incident_id: str
    incident_code: Optional[str] = None
    alert_type: str = Field(..., description="CRITICAL_SPILL_ALERT, COASTAL_WARNING, FISHING_WARNING, VESSEL_WARNING, PORT_WARNING, PROTECTED_AREA_WARNING, RESPONSE_TEAM_ALERT, COMMUNITY_ALERT")
    severity: str = Field(..., description="CRITICAL, HIGH, MEDIUM, LOW")
    title: str
    message: str
    trigger: str
    recommended_restriction: Optional[str] = None
    restriction_type: Optional[str] = None
    restriction_status: str = Field(default="RECOMMENDED", description="RECOMMENDED, OPERATOR_CONFIRMED, OPERATOR_REJECTED, NOT_APPLICABLE")
    status: str = Field(default="ACTIVE", description="ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED")
    target_location: Optional[str] = None
    target_asset_type: Optional[str] = None
    eta_hours: Optional[float] = None
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    operator_notes: Optional[str] = None
    rule_code: Optional[str] = None
    context_snapshot: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    recipients: list[AlertRecipientSchema] = Field(default_factory=list)
    events: list[AlertEventSchema] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    total: int
    active_count: int
    critical_count: int
    unconfirmed_restrictions_count: int
    alerts: list[AlertResponse]


class AlertGenerateRequest(BaseModel):
    incident_id: str
    force_recheck: bool = Field(default=False, description="If true, re-evaluates all rules even if alert exists")


class AlertAcknowledgeRequest(BaseModel):
    operator_name: str = Field(default="Duty Officer", description="Name/Callsign of the acknowledging officer")
    notes: Optional[str] = Field(default=None, description="Operational notes regarding acknowledgement")


class RestrictionConfirmRequest(BaseModel):
    operator_name: str = Field(..., description="Name/Badge ID of authorized officer confirming or rejecting restriction")
    confirmed: bool = Field(..., description="True to confirm restriction advisory; False to formally reject")
    operator_notes: Optional[str] = Field(default=None, description="Official justification or deployment operational notes")


class AlertRuleResponse(BaseModel):
    id: str
    rule_code: str
    rule_name: str
    alert_type: str
    severity: str
    condition_metric: str
    operator: str
    threshold_value: float
    template_title: str
    template_message: str
    recommended_action: Optional[str] = None
    restriction_type: Optional[str] = None
    is_active: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AlertRuleUpdate(BaseModel):
    threshold_value: Optional[float] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None
    recommended_action: Optional[str] = None
    notes: Optional[str] = None
