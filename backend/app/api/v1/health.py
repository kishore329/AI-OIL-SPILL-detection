"""
Health API routes — /api/v1/health
Checks API + database connectivity.
"""
from fastapi import APIRouter
from app.database.session import check_db_connection

router = APIRouter(prefix="/health", tags=["Health"])


@router.get(
    "",
    summary="API + database health check",
    description="Returns status of the API and database connection.",
)
def api_health():
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "api": "healthy",
        "database": "healthy" if db_ok else "unreachable",
    }
