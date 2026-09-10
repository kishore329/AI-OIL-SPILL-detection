"""
Module 12 — Marine Ecosystem Risk Analyzer API endpoints.

Routes:
  GET  /api/v1/incidents/{incident_id}/ecosystem-risk          — Get latest analysis
  POST /api/v1/incidents/{incident_id}/ecosystem-risk/analyze  — Run fresh analysis
  GET  /api/v1/ecosystem-zones/nearby                          — Query zones near a point
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.ecosystem import (
    EcosystemRiskResponse,
    EcosystemAnalyzeRequest,
    EcosystemNearbyResponse,
)
from app.services.ecosystem_analyzer import EcosystemAnalyzer

# Two prefixes — incident-scoped and global zone query
incident_router = APIRouter(prefix="/incidents", tags=["Module 12: Ecosystem Risk"])
zone_router = APIRouter(prefix="/ecosystem-zones", tags=["Module 12: Ecosystem Risk"])


# ── Incident-scoped endpoints ─────────────────────────────────────────────────

@incident_router.get(
    "/{incident_id}/ecosystem-risk",
    response_model=EcosystemRiskResponse,
    summary="Get latest marine ecosystem risk assessment",
    description=(
        "Returns the most recent Module 12 ecosystem risk analysis for the incident, "
        "including per-zone sensitivity, exposure, and overall risk score (0–100). "
        "Run POST /ecosystem-risk/analyze first if no result exists."
    ),
)
def get_ecosystem_risk(
    incident_id: str,
    db: Session = Depends(get_db),
):
    return EcosystemAnalyzer.get_latest(db, incident_id)


@incident_router.post(
    "/{incident_id}/ecosystem-risk/analyze",
    response_model=EcosystemRiskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Run marine ecosystem risk analysis",
    description=(
        "Executes a fresh Lagrangian proximity + sensitivity analysis across all known "
        "ecosystem zones (coral reefs, mangroves, seagrass beds, protected areas, fishing zones). "
        "Stores the result and returns the full breakdown."
    ),
)
def analyze_ecosystem_risk(
    incident_id: str,
    payload: EcosystemAnalyzeRequest = EcosystemAnalyzeRequest(),
    db: Session = Depends(get_db),
):
    return EcosystemAnalyzer.analyze(db, incident_id, payload)


# ── Global zone query endpoint ─────────────────────────────────────────────────

@zone_router.get(
    "/nearby",
    response_model=EcosystemNearbyResponse,
    summary="Get ecosystem zones near a lat/lon point",
    description=(
        "Returns all known marine ecosystem zones within the specified radius from a "
        "given lat/lon coordinate. Useful for independent spatial queries without a spill incident."
    ),
)
def get_nearby_ecosystem_zones(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Query latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Query longitude"),
    radius_km: float = Query(100.0, ge=1.0, le=1000.0, description="Search radius in km"),
    db: Session = Depends(get_db),
):
    return EcosystemAnalyzer.get_nearby_zones(db, lat, lon, radius_km)
