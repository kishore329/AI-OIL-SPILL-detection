"""
Dashboard API routes — /api/v1/dashboard
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummary,
    summary="Get dashboard summary",
    description="Returns aggregated incident counts, severity breakdown, and total spill area.",
)
def get_dashboard_summary(db: Session = Depends(get_db)):
    return DashboardService.get_summary(db)
