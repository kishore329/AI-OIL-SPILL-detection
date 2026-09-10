"""
Comprehensive Unit and Integration Tests for Module 16 — Response Resource Allocation.
Tests:
  - Resource inventory seeding and filtering
  - Available resource listing
  - Explainable allocation scoring engine
  - Incident resource recommendation ranking
  - Operator assignment workflow with status transition
  - Conflict prevention on already assigned/unavailable resources
  - Deployment status updates
  - Release & reassignment workflows with timeline audit logging
  - Manual maintenance mode transitions
"""
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.incident import Incident, IncidentStatus, IncidentSeverity
from app.models.emergency_vessel import ResponseResource
from app.models.resource_allocation import ResourceAssignment, ResourceStatusHistory
from app.models.incident_event import IncidentEvent
from app.services.resource_allocation.scoring_engine import ResourceAllocationEngine
from app.services.resource_allocation.service import ResourceAllocationService

client = TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def sample_incident(db):
    inc_code = f"TEST-RES-ALLOC-{uuid.uuid4().hex[:6].upper()}"
    incident = Incident(
        id=str(uuid.uuid4()),
        incident_code=inc_code,
        status=IncidentStatus.DETECTED,
        severity=IncidentSeverity.HIGH,
        risk_score=75.0,
        spill_area_km2=6.4,
        latitude=13.08,
        longitude=80.35,
        description="Chennai Offshore Crude Oil Discharge Test",
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@pytest.fixture
def create_resource(db):
    def _create(status="AVAILABLE", name="Test Asset"):
        resource = ResponseResource(
            id=str(uuid.uuid4()),
            name=f"{name}-{uuid.uuid4().hex[:4]}",
            resource_type="CONTAINMENT_BOOM",
            resource_category="EQUIPMENT",
            quantity=1000.0,
            unit="meters",
            status=status,
            latitude=13.08,
            longitude=80.35,
            location_name="Chennai Response Base",
            mobilization_time_hours=0.5,
            speed_knots=18.0,
        )
        db.add(resource)
        db.commit()
        db.refresh(resource)
        return resource
    return _create


def test_resource_inventory_seed_and_list(db):
    """Verifies that the resource inventory seeds correctly and returns fleet utilization statistics."""
    res = client.get("/api/v1/resources")
    assert res.status_code == 200
    data = res.json()

    assert data["total"] >= 16
    assert data["available_count"] >= 1
    assert data["fleet_utilization_pct"] >= 0.0
    assert len(data["by_category"]) >= 5
    assert len(data["resources"]) >= 16

    # Verify key Indian coastal assets are present
    names = [r["name"] for r in data["resources"]]
    assert any("Samudra Prahari" in n for n in names)
    assert any("Chennai Port Heavy Skimmer" in n for n in names)
    assert any("Chennai 1,500m Heavy Ocean" in n for n in names)
    assert any("MRCC East Coast Hazmat Strike Team" in n for n in names)


def test_get_available_resources():
    """Verifies GET /api/v1/resources/available returns only available resources."""
    res = client.get("/api/v1/resources/available")
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0
    for item in items:
        assert item["status"] == "AVAILABLE"


def test_allocation_scoring_engine_math():
    """Unit tests the explainable scoring logic of ResourceAllocationEngine."""
    # Available offshore boom at Chennai (13.084, 80.295)
    class MockResource:
        status = "AVAILABLE"
        latitude = 13.084
        longitude = 80.295
        speed_knots = 0.0
        mobilization_time_hours = 1.0
        resource_category = "CONTAINMENT_BOOM"
        capabilities_json = '["BOOM_DEPLOYMENT", "OFFSHORE_CONTAINMENT"]'

    score_res = ResourceAllocationEngine.evaluate_resource_score(
        resource=MockResource(),
        incident_latitude=13.10,
        incident_longitude=80.32,
        incident_priority=80.0,
        incident_risk=75.0,
        active_strategies=["CONTAINMENT_BOOM_DEPLOYMENT"],
    )

    assert score_res["is_eligible"] is True
    assert score_res["allocation_score"] >= 70.0  # High score expected due to capability match & proximity
    assert score_res["estimated_distance_km"] < 15.0
    assert score_res["estimated_response_time_hours"] < 2.0
    assert "Direct operational fit" in score_res["allocation_rationale"]
    assert score_res["factors"]["capability_match_score"] == 30.0

    # Ineligible resource check
    class MockUnavailableResource:
        status = "MAINTENANCE"

    unavail_res = ResourceAllocationEngine.evaluate_resource_score(
        resource=MockUnavailableResource(),
        incident_latitude=13.10,
        incident_longitude=80.32,
    )
    assert unavail_res["is_eligible"] is False
    assert unavail_res["allocation_score"] == 0.0


def test_get_incident_resources_and_recommendations(sample_incident):
    """Verifies GET /api/v1/incidents/{id}/resources returns recommendations ranked by score."""
    res = client.get(f"/api/v1/incidents/{sample_incident.id}/resources")
    assert res.status_code == 200
    data = res.json()

    assert data["incident_id"] == sample_incident.id
    assert data["incident_code"] == sample_incident.incident_code
    assert isinstance(data["recommended_resources"], list)
    assert len(data["recommended_resources"]) > 0

    # Verify ranking order (rank 1 score >= rank 2 score)
    recs = data["recommended_resources"]
    assert recs[0]["rank"] == 1
    assert recs[0]["allocation_score"] >= recs[-1]["allocation_score"]
    assert "factors" in recs[0]
    assert recs[0]["factors"]["capability_match_score"] > 0


def test_operator_assign_resource_success(db, sample_incident, create_resource):
    """Verifies operator assignment commits resource, updates status, and logs incident timeline event."""
    boom = create_resource(status="AVAILABLE", name="Boom Alpha")

    payload = {
        "resource_id": str(boom.id),
        "quantity": 1000.0,
        "assigned_by": "Commander Saravanan",
        "notes": "Deploy J-boom configuration to protect Chennai harbor approaches.",
    }

    res = client.post(f"/api/v1/incidents/{sample_incident.id}/assign-resource", json=payload)
    assert res.status_code == 201
    data = res.json()

    assert data["incident_id"] == sample_incident.id
    assert data["resource_id"] == str(boom.id)
    assert data["status"] == "ASSIGNED"
    assert data["quantity_assigned"] == 1000.0
    assert data["assigned_by"] == "Commander Saravanan"
    assert data["allocation_score"] > 0

    # Verify resource status in database transitioned to ASSIGNED
    db.expire_all()
    updated_boom = db.query(ResponseResource).filter(ResponseResource.id == boom.id).first()
    assert updated_boom.status == "ASSIGNED"

    # Verify ResourceStatusHistory record exists
    history = db.query(ResourceStatusHistory).filter(
        ResourceStatusHistory.resource_id == boom.id,
        ResourceStatusHistory.new_status == "ASSIGNED",
    ).first()
    assert history is not None
    assert history.incident_id == sample_incident.id

    # Verify IncidentEvent was created in timeline
    event = db.query(IncidentEvent).filter(
        IncidentEvent.incident_id == sample_incident.id,
        IncidentEvent.event_type == "RESOURCE_ASSIGNED",
    ).order_by(IncidentEvent.created_at.desc()).first()
    assert event is not None
    assert "Commander Saravanan" in event.description
    assert boom.name in event.description


def test_assignment_conflict_unavailable_resource(db, sample_incident, create_resource):
    """Verifies assigning an already assigned resource raises HTTP 400 conflict error."""
    assigned_res = create_resource(status="ASSIGNED", name="Boom Assigned")

    payload = {
        "resource_id": str(assigned_res.id),
        "assigned_by": "Officer Test",
    }
    res = client.post(f"/api/v1/incidents/{sample_incident.id}/assign-resource", json=payload)
    assert res.status_code == 400
    assert "cannot be assigned" in res.json()["detail"]


def test_patch_assignment_status_to_deployed(db, sample_incident, create_resource):
    """Verifies updating assignment to DEPLOYED updates both assignment and resource status and logs event."""
    avail = create_resource(status="AVAILABLE", name="Skimmer Bravo")

    assign_res = client.post(
        f"/api/v1/incidents/{sample_incident.id}/assign-resource",
        json={"resource_id": str(avail.id), "assigned_by": "Incident Lead"},
    )
    assignment_id = assign_res.json()["id"]

    # Patch to DEPLOYED
    patch_res = client.patch(
        f"/api/v1/resource-assignments/{assignment_id}",
        json={"status": "DEPLOYED", "notes": "Asset arrived on scene and deployed"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "DEPLOYED"

    # Verify resource is DEPLOYED
    db.expire_all()
    updated_avail = db.query(ResponseResource).filter(ResponseResource.id == avail.id).first()
    assert updated_avail.status == "DEPLOYED"

    # Verify DEPLOYED event logged in timeline
    dep_event = db.query(IncidentEvent).filter(
        IncidentEvent.incident_id == sample_incident.id,
        IncidentEvent.event_type == "RESOURCE_DEPLOYED",
    ).order_by(IncidentEvent.created_at.desc()).first()
    assert dep_event is not None


def test_release_resource_assignment_via_delete(db, sample_incident, create_resource):
    """Verifies releasing an assignment resets resource to AVAILABLE and logs timeline event."""
    avail = create_resource(status="AVAILABLE", name="Rel Asset")

    assign_res = client.post(
        f"/api/v1/incidents/{sample_incident.id}/assign-resource",
        json={"resource_id": str(avail.id), "assigned_by": "Incident Lead"},
    )
    assignment_id = assign_res.json()["id"]

    # Release via DELETE
    del_res = client.delete(f"/api/v1/resource-assignments/{assignment_id}")
    assert del_res.status_code == 200

    db.expire_all()
    # Verify assignment is RELEASED
    assignment = db.query(ResourceAssignment).filter(ResourceAssignment.id == assignment_id).first()
    assert assignment.status == "RELEASED"
    assert assignment.released_at is not None

    # Verify resource is returned to AVAILABLE
    updated_avail = db.query(ResponseResource).filter(ResponseResource.id == avail.id).first()
    assert updated_avail.status == "AVAILABLE"

    # Verify RELEASED event logged
    rel_event = db.query(IncidentEvent).filter(
        IncidentEvent.incident_id == sample_incident.id,
        IncidentEvent.event_type == "RESOURCE_RELEASED",
    ).order_by(IncidentEvent.created_at.desc()).first()
    assert rel_event is not None


def test_update_resource_status_maintenance(db, create_resource):
    """Verifies manual maintenance mode toggle and ensures asset is excluded from available lists."""
    avail = create_resource(status="AVAILABLE", name="Maint Asset")
    r_id = str(avail.id)

    # Transition to MAINTENANCE
    patch_res = client.patch(
        f"/api/v1/resources/{r_id}/status",
        json={"status": "MAINTENANCE", "reason": "Scheduled 500-hour engine overhaul"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "MAINTENANCE"

    # Verify not in available list
    avail_list = client.get("/api/v1/resources/available").json()
    assert not any(r["id"] == r_id for r in avail_list)

    # Return to AVAILABLE
    reset_res = client.patch(
        f"/api/v1/resources/{r_id}/status",
        json={"status": "AVAILABLE", "reason": "Overhaul completed; certified ready for service"},
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "AVAILABLE"
