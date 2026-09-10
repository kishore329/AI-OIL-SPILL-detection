"""
Module 21 — Economic Damage Estimator Pydantic Schemas.
Validation schemas for economic assessments, sector breakdowns, and configurable assumptions.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class EconomicAssumptionBase(BaseModel):
    name: str = Field("INDIAN_OCEAN_COASTAL_BASELINE", description="Assumption profile name")
    currency: str = Field("INR", description="Base currency (INR or USD)")
    exchange_rate_usd_to_inr: float = Field(83.5, gt=0, description="USD to INR conversion rate")

    # 1. Cleanup cost parameters
    cleanup_cost_per_km2: float = Field(1500000.0, ge=0, description="Offshore cleanup cost per km² in base currency")
    shoreline_cleanup_per_km: float = Field(4500000.0, ge=0, description="Shoreline remediation cost per km in base currency")

    # 2. Fisheries impact parameters
    fisheries_daily_value_per_km2: float = Field(95000.0, ge=0, description="Daily fishery catch value per km² in base currency")
    fisheries_recovery_days_default: float = Field(30.0, ge=1.0, description="Estimated duration of fisheries disruption (days)")

    # 3. Tourism impact parameters
    tourism_daily_value_per_km: float = Field(250000.0, ge=0, description="Daily tourism loss per km beach in base currency")
    tourism_disruption_days_default: float = Field(21.0, ge=1.0, description="Estimated duration of tourism beach closure (days)")

    # 4. Coastal business exposure parameters
    business_daily_loss_per_km: float = Field(120000.0, ge=0, description="Daily coastal business loss per km in base currency")
    business_disruption_days_default: float = Field(14.0, ge=1.0, description="Estimated business disruption duration (days)")

    # 5. Critical infrastructure disruption parameters
    infrastructure_daily_loss_per_facility: float = Field(3500000.0, ge=0, description="Daily disruption loss per port/facility in base currency")
    infrastructure_disruption_days_default: float = Field(7.0, ge=1.0, description="Estimated port/facility delay duration (days)")

    # 6. Other ecological/environmental remediation parameters
    other_ecosystem_remediation_per_point: float = Field(1200000.0, ge=0, description="Environmental restoration cost per affected sensitive biome")

    notes: Optional[str] = None


class EconomicAssumptionCreate(EconomicAssumptionBase):
    incident_id: Optional[str] = None
    is_default: bool = False


class EconomicAssumptionResponse(EconomicAssumptionBase):
    id: str
    incident_id: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EconomicCategoryDetail(BaseModel):
    category: str = Field(..., description="CLEANUP, FISHERIES, TOURISM, COASTAL_BUSINESS, INFRASTRUCTURE, OTHER_MODELED")
    category_title: str
    estimated_amount: float
    formatted_amount: str
    currency: str
    calculation_formula: str
    assumptions_snapshot: Optional[dict[str, Any]] = None
    confidence: float

    model_config = {"from_attributes": True}


class EconomicAssessmentRequest(BaseModel):
    currency: str = Field("INR", description="Desired display currency: INR (₹) or USD ($)")
    custom_assumptions: Optional[dict[str, Any]] = Field(None, description="Optional overridden unit parameters")


class EconomicAssessmentResponse(BaseModel):
    id: str
    incident_id: str
    currency: str
    total_estimated_amount: float
    total_formatted: str
    confidence: float
    categories: list[EconomicCategoryDetail]
    assumptions_used: dict[str, Any]
    model_name: str
    disclaimer: str
    created_at: datetime

    model_config = {"from_attributes": True}
