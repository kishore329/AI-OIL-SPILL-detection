"""
Pydantic schemas for Dashboard summary response.
"""
from typing import Optional
from pydantic import BaseModel


class SeverityBreakdown(BaseModel):
    critical: int = 0
    high: int = 0
    moderate: int = 0
    low: int = 0


class StatusBreakdown(BaseModel):
    detected: int = 0
    verified: int = 0
    prioritized: int = 0
    assigned: int = 0
    response_in_progress: int = 0
    containment: int = 0
    monitoring: int = 0
    resolved: int = 0


class DashboardSummary(BaseModel):
    active_incidents: int
    total_incidents: int
    resolved_incidents: int

    # Severity breakdown (active only)
    critical_incidents: int
    high_incidents: int
    moderate_incidents: int
    low_incidents: int

    # Area
    total_spill_area_km2: Optional[float] = None
    average_risk_score: Optional[float] = None

    # Detailed breakdowns
    by_severity: SeverityBreakdown
    by_status: StatusBreakdown
