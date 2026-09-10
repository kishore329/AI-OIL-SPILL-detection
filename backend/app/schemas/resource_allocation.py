"""
Pydantic schemas for Module 16 — Response Resource Allocation.
"""
from typing import Optional
from pydantic import BaseModel, Field


class ResourceItem(BaseModel):
    """Complete representation of a coastal response resource."""
    id: str
    name: str
    resource_type: str
    resource_category: str
    quantity: float
    unit: str
    status: str = Field(..., description="AVAILABLE, ASSIGNED, DEPLOYED, UNAVAILABLE, or MAINTENANCE")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    capabilities: list[str] = Field(default_factory=list)
    mobilization_time_hours: float = 1.0
    speed_knots: float = 0.0
    contact_lead: Optional[str] = None
    cost_per_hour: float = 0.0
    description: Optional[str] = None
    vessel_id: Optional[str] = None
    current_incident_id: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ResourceCategoryCount(BaseModel):
    category: str
    count: int
    available: int


class ResourceListResponse(BaseModel):
    """List of resources with operational fleet utilization telemetry."""
    total: int
    available_count: int
    assigned_count: int
    deployed_count: int
    maintenance_count: int
    unavailable_count: int
    fleet_utilization_pct: float
    by_category: list[ResourceCategoryCount] = Field(default_factory=list)
    resources: list[ResourceItem]


class ResourceAssignmentItem(BaseModel):
    """Active or historical assignment of a resource to an oil spill incident."""
    id: str
    incident_id: str
    resource_id: str
    resource_name: str
    resource_category: str
    resource_type: str
    quantity_assigned: float
    unit: str
    status: str = Field(..., description="ASSIGNED, DEPLOYED, RELEASED, or CANCELLED")
    allocation_score: float
    allocation_rationale: Optional[str] = None
    assigned_by: str
    assigned_at: str
    deployed_at: Optional[str] = None
    released_at: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class AllocationFactors(BaseModel):
    capability_match_score: float
    proximity_eta_score: float
    priority_score_boost: float
    risk_severity_weight: float


class RecommendedResourceItem(BaseModel):
    """Ranked available resource recommended for incident assignment."""
    resource: ResourceItem
    rank: int
    allocation_score: float = Field(..., ge=0.0, le=100.0)
    estimated_distance_km: float
    estimated_response_time_hours: float
    allocation_rationale: str
    factors: AllocationFactors
    is_eligible: bool = True
    match_priority: str = Field("HIGH", description="CRITICAL, HIGH, MEDIUM, or LOW")


class IncidentResourcesResponse(BaseModel):
    """Full resource allocation dossier for a specific incident."""
    incident_id: str
    incident_code: str
    incident_priority_score: Optional[float] = None
    incident_risk_score: Optional[float] = None
    incident_severity: Optional[str] = None
    total_assigned: int
    active_assignments: list[ResourceAssignmentItem] = Field(default_factory=list)
    past_assignments: list[ResourceAssignmentItem] = Field(default_factory=list)
    recommended_resources: list[RecommendedResourceItem] = Field(default_factory=list)
    decision_support_note: str = (
        "[DECISION SUPPORT ONLY] Resource recommendations are ranked by multi-criteria "
        "suitability scoring. Operator confirmation required before actual dispatch."
    )


class ResourceAssignRequest(BaseModel):
    """Payload for operator assignment of a resource to an incident."""
    resource_id: str
    quantity: Optional[float] = Field(None, description="Optional custom quantity; defaults to total available")
    assigned_by: Optional[str] = Field("Incident Commander", description="Name/title of authorizing officer")
    notes: Optional[str] = Field(None, description="Commander operational dispatch remarks")


class AssignmentStatusUpdateRequest(BaseModel):
    """Payload for updating an existing resource assignment."""
    status: str = Field(..., description="Target status: ASSIGNED, DEPLOYED, RELEASED, or CANCELLED")
    quantity_assigned: Optional[float] = None
    notes: Optional[str] = None


class ResourceStatusUpdateRequest(BaseModel):
    """Payload for manual inventory maintenance/availability toggle."""
    status: str = Field(..., description="Target status: AVAILABLE, UNAVAILABLE, or MAINTENANCE")
    reason: Optional[str] = Field(None, description="Reason for status change (e.g. periodic drydock maintenance)")
    changed_by: Optional[str] = Field("Equipment Manager", description="Authorizing operator")
