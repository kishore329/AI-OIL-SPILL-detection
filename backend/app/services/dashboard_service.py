"""
DashboardService — aggregates metrics for the summary endpoint.
"""
from __future__ import annotations
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.enums import IncidentStatus, IncidentSeverity
from app.schemas.dashboard import DashboardSummary, SeverityBreakdown, StatusBreakdown


class DashboardService:

    @staticmethod
    def get_summary(db: Session) -> DashboardSummary:
        # All incidents
        total = db.execute(select(func.count(Incident.id))).scalar_one()

        # Active (not archived, not resolved)
        active_q = select(Incident).where(
            Incident.is_active == True,  # noqa: E712
            Incident.status != IncidentStatus.RESOLVED,
        )
        active_rows = db.execute(active_q).scalars().all()
        active_count = len(active_rows)

        resolved = db.execute(
            select(func.count(Incident.id)).where(
                Incident.status == IncidentStatus.RESOLVED
            )
        ).scalar_one()

        # Severity breakdown (active only)
        def _sev_count(sev: IncidentSeverity) -> int:
            return sum(1 for r in active_rows if r.severity == sev)

        # Status breakdown (all active)
        all_active = db.execute(
            select(Incident).where(Incident.is_active == True)  # noqa: E712
        ).scalars().all()

        def _status_count(st: IncidentStatus) -> int:
            return sum(1 for r in all_active if r.status == st)

        # Aggregate spill area
        area_result = db.execute(
            select(func.sum(Incident.spill_area_km2)).where(
                Incident.is_active == True,  # noqa: E712
                Incident.spill_area_km2.isnot(None),
            )
        ).scalar_one()

        risk_avg = db.execute(
            select(func.avg(Incident.risk_score)).where(
                Incident.is_active == True,  # noqa: E712
                Incident.risk_score.isnot(None),
            )
        ).scalar_one()

        return DashboardSummary(
            active_incidents=active_count,
            total_incidents=total,
            resolved_incidents=resolved,
            critical_incidents=_sev_count(IncidentSeverity.CRITICAL),
            high_incidents=_sev_count(IncidentSeverity.HIGH),
            moderate_incidents=_sev_count(IncidentSeverity.MODERATE),
            low_incidents=_sev_count(IncidentSeverity.LOW),
            total_spill_area_km2=round(float(area_result), 3) if area_result else None,
            average_risk_score=round(float(risk_avg), 2) if risk_avg else None,
            by_severity=SeverityBreakdown(
                critical=_sev_count(IncidentSeverity.CRITICAL),
                high=_sev_count(IncidentSeverity.HIGH),
                moderate=_sev_count(IncidentSeverity.MODERATE),
                low=_sev_count(IncidentSeverity.LOW),
            ),
            by_status=StatusBreakdown(
                detected=_status_count(IncidentStatus.DETECTED),
                verified=_status_count(IncidentStatus.VERIFIED),
                prioritized=_status_count(IncidentStatus.PRIORITIZED),
                assigned=_status_count(IncidentStatus.ASSIGNED),
                response_in_progress=_status_count(IncidentStatus.RESPONSE_IN_PROGRESS),
                containment=_status_count(IncidentStatus.CONTAINMENT),
                monitoring=_status_count(IncidentStatus.MONITORING),
                resolved=_status_count(IncidentStatus.RESOLVED),
            ),
        )
