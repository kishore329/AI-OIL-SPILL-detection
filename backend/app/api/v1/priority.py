"""
API endpoints for Incident Priority Engine.
Provides deterministic priority ranking for active emergency dispatch.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.priority_engine import PriorityEngine
from app.schemas.priority import (
    PriorityQueueResponse,
    PrioritySimulationRequest,
)

router = APIRouter(prefix="", tags=["Priority Engine"])


@router.get(
    "/incidents/priority",
    response_model=PriorityQueueResponse,
    summary="Get active incidents ranked by response priority",
    description="Returns active incidents deterministically ranked by urgency (#1 = highest priority).",
)
@router.get(
    "/priority/queue",
    response_model=PriorityQueueResponse,
    summary="Get priority dispatch queue (alias)",
)
def get_priority_queue(
    limit: int = Query(50, ge=1, le=1000, description="Max number of items to return"),
    include_resolved: bool = Query(False, description="Whether to include RESOLVED incidents"),
    min_priority: float = Query(0.0, ge=0.0, le=100.0, description="Filter incidents with priority score >= min_priority"),
    db: Session = Depends(get_db),
):
    return PriorityEngine.rank_incidents(
        db=db,
        limit=limit,
        include_resolved=include_resolved,
        min_priority=min_priority,
    )


@router.post(
    "/priority/rank",
    response_model=PriorityQueueResponse,
    summary="Rank simulated or custom incidents",
    description="Accepts an arbitrary array of incident records and deterministically ranks them by priority score.",
)
def rank_simulation(
    payload: PrioritySimulationRequest,
):
    return PriorityEngine.rank_simulation(payload.incidents)
