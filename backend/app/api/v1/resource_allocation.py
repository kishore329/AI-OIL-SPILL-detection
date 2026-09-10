"""
REST API endpoints for Module 16 — Response Resource Allocation.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.resource_allocation import (
    ResourceItem,
    ResourceListResponse,
    ResourceAssignmentItem,
    IncidentResourcesResponse,
    ResourceAssignRequest,
    AssignmentStatusUpdateRequest,
    ResourceStatusUpdateRequest,
)
from app.services.resource_allocation import ResourceAllocationService

router = APIRouter(tags=["Response Resource Allocation"])


@router.get(
    "/resources",
    response_model=ResourceListResponse,
    summary="List all response resources with fleet utilization",
)
def list_resources(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (AVAILABLE, ASSIGNED, DEPLOYED, etc.)"),
    category: Optional[str] = Query(None, description="Filter by category (RESPONSE_VESSEL, CONTAINMENT_BOOM, etc.)"),
    location: Optional[str] = Query(None, description="Filter by location name substring"),
    search: Optional[str] = Query(None, description="Search term for name, type, or description"),
    db: Session = Depends(get_db),
):
    """Returns all emergency response resources across Indian coastal bases with fleet utilization stats."""
    return ResourceAllocationService.get_all_resources(
        db,
        status_filter=status_filter,
        category_filter=category,
        location_filter=location,
        search_query=search,
    )


@router.get(
    "/resources/available",
    response_model=list[ResourceItem],
    summary="List available response resources",
)
def list_available_resources(
    db: Session = Depends(get_db),
):
    """Returns all response resources with status 'AVAILABLE' ready for immediate deployment."""
    return ResourceAllocationService.get_available_resources(db)


@router.patch(
    "/resources/{resource_id}/status",
    response_model=ResourceItem,
    summary="Update resource availability or maintenance status",
)
def update_resource_status(
    resource_id: str,
    payload: ResourceStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    """Updates status of a resource (e.g. marking under MAINTENANCE or returning to AVAILABLE)."""
    return ResourceAllocationService.update_resource_status(db, resource_id, payload)


@router.get(
    "/incidents/{incident_id}/resources",
    response_model=IncidentResourcesResponse,
    summary="Get incident resource allocation dossier and recommendations",
)
def get_incident_resources(
    incident_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns active allocations, past assignments, and ranked recommended resources
    scored against incident priority, coastal distance, ETA, and required cleanup strategies.
    """
    return ResourceAllocationService.get_incident_resources(db, incident_id)


@router.post(
    "/incidents/{incident_id}/assign-resource",
    response_model=ResourceAssignmentItem,
    status_code=status.HTTP_201_CREATED,
    summary="Assign available response resource to incident",
)
def assign_resource_to_incident(
    incident_id: str,
    payload: ResourceAssignRequest,
    db: Session = Depends(get_db),
):
    """
    Assigns an available response resource to an incident upon operator confirmation.
    Transitions resource status to ASSIGNED, creates a status history record,
    and logs an official RESOURCE_ASSIGNED event in the incident audit trail.
    """
    return ResourceAllocationService.assign_resource(db, incident_id, payload)


@router.patch(
    "/resource-assignments/{assignment_id}",
    response_model=ResourceAssignmentItem,
    summary="Update resource assignment status or notes",
)
def update_resource_assignment(
    assignment_id: str,
    payload: AssignmentStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Updates the operational state of an assignment (e.g., DEPLOYED, RELEASED).
    Releasing a resource automatically returns it to AVAILABLE status and creates timeline logs.
    """
    return ResourceAllocationService.update_assignment(db, assignment_id, payload)


@router.delete(
    "/resource-assignments/{assignment_id}",
    summary="Release resource assignment",
)
def release_resource_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
):
    """
    Releases a resource from an incident assignment, resets resource status to AVAILABLE,
    and records an audit event in the incident timeline.
    """
    return ResourceAllocationService.release_assignment(db, assignment_id)
