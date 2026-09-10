"""
IncidentService — all business logic for incident CRUD.
Routes call this service; no DB queries in route files.
"""
from __future__ import annotations
import math
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select, update as sa_update
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.enums import IncidentStatus, IncidentSeverity
from app.schemas.incident import IncidentCreate, IncidentUpdate, IncidentListResponse, IncidentResponse
from app.schemas.event import IncidentEventCreate, IncidentEventResponse


# ── Helpers ────────────────────────────────────────────────────────────────

def _incident_or_404(db: Session, incident_id: str) -> Incident:
    """Fetch an active incident by ID or raise 404."""
    incident = db.get(Incident, incident_id)
    if incident is None or not incident.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return incident


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance in km between two lat/lon points."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── CRUD ───────────────────────────────────────────────────────────────────

class IncidentService:

    @staticmethod
    def list_incidents(
        db: Session,
        *,
        status: Optional[IncidentStatus] = None,
        severity: Optional[IncidentSeverity] = None,
        min_risk: Optional[float] = None,
        max_risk: Optional[float] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> IncidentListResponse:
        """Return paginated, filtered list of incidents."""
        q = select(Incident).where(Incident.is_active == True)  # noqa: E712

        if status is not None:
            q = q.where(Incident.status == status)
        if severity is not None:
            q = q.where(Incident.severity == severity)
        if min_risk is not None:
            q = q.where(Incident.risk_score >= min_risk)
        if max_risk is not None:
            q = q.where(Incident.risk_score <= max_risk)

        # Count total
        count_q = select(func.count()).select_from(q.subquery())
        total = db.execute(count_q).scalar_one()

        # Sorting
        allowed_sort = {
            "created_at": Incident.created_at,
            "updated_at": Incident.updated_at,
            "risk_score": Incident.risk_score,
            "severity": Incident.severity,
            "status": Incident.status,
            "spill_area_km2": Incident.spill_area_km2,
        }
        sort_col = allowed_sort.get(sort_by, Incident.created_at)
        if sort_order.lower() == "asc":
            q = q.order_by(sort_col.asc())
        else:
            q = q.order_by(sort_col.desc())

        # Pagination
        offset = (page - 1) * page_size
        q = q.offset(offset).limit(page_size)

        rows = db.execute(q).scalars().all()
        total_pages = math.ceil(total / page_size) if page_size > 0 else 1

        return IncidentListResponse(
            items=[IncidentResponse.model_validate(r) for r in rows],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @staticmethod
    def get_incident(db: Session, incident_id: str) -> IncidentResponse:
        incident = _incident_or_404(db, incident_id)
        return IncidentResponse.model_validate(incident)

    @staticmethod
    def create_incident(db: Session, payload: IncidentCreate) -> IncidentResponse:
        # Check duplicate code
        existing = db.execute(
            select(Incident).where(Incident.incident_code == payload.incident_code)
        ).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incident code '{payload.incident_code}' already exists.",
            )

        incident = Incident(
            id=str(uuid.uuid4()),
            **payload.model_dump(exclude_none=False),
        )
        db.add(incident)

        # Auto-create a CREATED event
        event = IncidentEvent(
            id=str(uuid.uuid4()),
            incident_id=incident.id,
            event_type="INCIDENT_CREATED",
            description=f"Incident {incident.incident_code} created with severity {incident.severity}.",
            created_by="system",
        )
        db.add(event)
        db.commit()
        db.refresh(incident)
        return IncidentResponse.model_validate(incident)

    @staticmethod
    def update_incident(
        db: Session, incident_id: str, payload: IncidentUpdate
    ) -> IncidentResponse:
        incident = _incident_or_404(db, incident_id)
        old_status = incident.status

        updates = payload.model_dump(exclude_none=True)
        for field, value in updates.items():
            setattr(incident, field, value)
        incident.updated_at = datetime.now(timezone.utc)

        # Log status change event
        if "status" in updates and updates["status"] != old_status:
            event = IncidentEvent(
                id=str(uuid.uuid4()),
                incident_id=incident.id,
                event_type="STATUS_CHANGED",
                description=f"Status changed from {old_status} to {updates['status']}.",
                created_by="api",
            )
            db.add(event)

        db.commit()
        db.refresh(incident)
        return IncidentResponse.model_validate(incident)

    @staticmethod
    def delete_incident(db: Session, incident_id: str) -> dict:
        """Soft-delete (archive) an incident."""
        incident = _incident_or_404(db, incident_id)
        incident.is_active = False
        incident.updated_at = datetime.now(timezone.utc)

        event = IncidentEvent(
            id=str(uuid.uuid4()),
            incident_id=incident.id,
            event_type="INCIDENT_ARCHIVED",
            description="Incident archived via API.",
            created_by="api",
        )
        db.add(event)
        db.commit()
        return {"detail": f"Incident '{incident_id}' archived successfully."}

    # ── Events ────────────────────────────────────────────────────────────

    @staticmethod
    def list_events(db: Session, incident_id: str) -> list[IncidentEventResponse]:
        _incident_or_404(db, incident_id)
        rows = db.execute(
            select(IncidentEvent)
            .where(IncidentEvent.incident_id == incident_id)
            .order_by(IncidentEvent.created_at)
        ).scalars().all()
        return [IncidentEventResponse.model_validate(r) for r in rows]

    @staticmethod
    def create_event(
        db: Session, incident_id: str, payload: IncidentEventCreate
    ) -> IncidentEventResponse:
        _incident_or_404(db, incident_id)
        event = IncidentEvent(
            id=str(uuid.uuid4()),
            incident_id=incident_id,
            **payload.model_dump(),
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return IncidentEventResponse.model_validate(event)

    # ── Nearby (haversine approximation) ──────────────────────────────────

    @staticmethod
    def find_nearby(
        db: Session,
        lat: float,
        lon: float,
        radius_km: float = 50.0,
        limit: int = 20,
    ) -> list[IncidentResponse]:
        """Return active incidents within radius_km of (lat, lon)."""
        rows = db.execute(
            select(Incident).where(
                Incident.is_active == True,  # noqa: E712
                Incident.latitude.isnot(None),
                Incident.longitude.isnot(None),
            )
        ).scalars().all()

        nearby = [
            r for r in rows
            if _haversine_km(lat, lon, r.latitude, r.longitude) <= radius_km
        ]
        nearby.sort(
            key=lambda r: _haversine_km(lat, lon, r.latitude, r.longitude)
        )
        return [IncidentResponse.model_validate(r) for r in nearby[:limit]]
