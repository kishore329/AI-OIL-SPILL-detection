"""
Module 20 — What-If Oil Spill Simulator Schemas.
Validation schemas and response models for simulation runs, inputs, outputs, and comparisons.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator


class SimulationInputCreate(BaseModel):
    """Input parameters for a hypothetical oil spill scenario."""
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Hypothetical spill latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Hypothetical spill longitude")
    spill_size: float = Field(..., gt=0.0, description="Volume/weight of spilled substance")
    spill_size_unit: str = Field("BARRELS", description="Unit: BARRELS, TONS, or M3")
    oil_type: str = Field("LIGHT_CRUDE", description="LIGHT_CRUDE, HEAVY_CRUDE, DIESEL_REFINED, BUNKER_FUEL")
    wind_speed_kmh: float = Field(15.0, ge=0.0, le=200.0, description="Wind speed in km/h")
    wind_direction_deg: float = Field(225.0, ge=0.0, le=360.0, description="Meteorological wind direction (deg FROM)")
    current_speed_knots: float = Field(1.5, ge=0.0, le=30.0, description="Surface ocean current speed in knots")
    current_direction_deg: float = Field(45.0, ge=0.0, le=360.0, description="Current heading (deg TOWARDS)")
    duration_hours: float = Field(24.0, ge=1.0, le=168.0, description="Simulation horizon in hours (1-168)")

    @field_validator("spill_size_unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        upper = v.upper()
        if upper not in ["BARRELS", "TONS", "M3"]:
            raise ValueError("spill_size_unit must be BARRELS, TONS, or M3")
        return upper

    @field_validator("oil_type")
    @classmethod
    def validate_oil_type(cls, v: str) -> str:
        upper = v.upper()
        valid = ["LIGHT_CRUDE", "HEAVY_CRUDE", "DIESEL_REFINED", "BUNKER_FUEL"]
        if upper not in valid:
            raise ValueError(f"oil_type must be one of {valid}")
        return upper


class SimulationCreateRequest(BaseModel):
    """Payload to create and run a simulation scenario."""
    name: Optional[str] = Field(None, max_length=128, description="Human-readable scenario title")
    notes: Optional[str] = Field(None, description="Operational notes / scenario context")
    inputs: SimulationInputCreate
    auto_run: bool = Field(True, description="Immediately compute simulation outputs upon creation")


class SimulationInputResponse(BaseModel):
    id: str
    simulation_id: str
    latitude: float
    longitude: float
    spill_size: float
    spill_size_unit: str
    spill_size_barrels: float
    oil_type: str
    wind_speed_kmh: float
    wind_direction_deg: float
    current_speed_knots: float
    current_direction_deg: float
    duration_hours: float
    created_at: datetime

    model_config = {"from_attributes": True}


class SimulationOutputResponse(BaseModel):
    id: str
    simulation_id: str
    predicted_movement: dict[str, Any]
    risk: dict[str, Any]
    ecosystem_impact: dict[str, Any]
    coastal_impact: dict[str, Any]
    priority: dict[str, Any]
    economic_estimate: dict[str, Any]
    recommendations: dict[str, Any]
    disclaimer: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SimulationRunResponse(BaseModel):
    id: str
    name: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    inputs: Optional[SimulationInputResponse] = None
    outputs: Optional[SimulationOutputResponse] = None

    model_config = {"from_attributes": True}


class SimulationRunListItem(BaseModel):
    id: str
    name: str
    status: str
    spill_size_barrels: Optional[float] = None
    oil_type: Optional[str] = None
    duration_hours: Optional[float] = None
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    time_to_shore_hours: Optional[float] = None
    total_economic_usd: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SimulationCompareItem(BaseModel):
    id: str
    name: str
    oil_type: str
    spill_size_barrels: float
    duration_hours: float
    risk_score: float
    risk_level: str
    time_to_shore_hours: Optional[float]
    shoreline_impacted: bool
    ecosystem_vulnerability_score: float
    total_economic_usd: float
    response_tier: str
    containment_boom_meters: float
    created_at: datetime


class SimulationCompareResponse(BaseModel):
    scenarios: list[SimulationCompareItem]
    delta_summary: dict[str, Any]
    disclaimer: str
