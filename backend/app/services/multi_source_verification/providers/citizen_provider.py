"""
Citizen Evidence Provider for Multi-Source Verification.
"""
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.services.multi_source_verification.base_provider import BaseEvidenceProvider, EvidencePayload


class CitizenEvidenceProvider(BaseEvidenceProvider):
    source_code = "CITIZEN_REPORT"
    default_weight = 0.15

    def collect_evidence(self, incident: Incident, db: Session) -> EvidencePayload:
        # Eyewitness reports from coastal residents or fishing vessels
        confidence = 0.78
        quality = 0.80

        metadata = {
            "reporter_category": "Fishermen Cooperative & Coastal Patrol",
            "eyewitness_count": 3,
            "odor_detected": "Strong Hydrocarbon / Petroleum Odor",
            "tarballs_reported": True,
            "geotagged_photo_url": "/assets/evidence/citizen_report_photo_01.jpg",
            "distance_from_shore_km": round(incident.spill_area_km2 or 2.5, 1),
        }

        notes = (
            "3 independent local fishing boat captains reported heavy black slick oiling "
            "and strong petroleum odor near coastal waters."
        )

        return EvidencePayload(
            source_code=self.source_code,
            provider_name="Coastal Community & Fishermen Reporting Network",
            confidence=confidence,
            evidence_type="CITIZEN_VISUAL_REPORT",
            agrees_with_spill=True,
            quality_score=quality,
            data_origin="SIMULATED",
            evidence_metadata=metadata,
            notes=notes,
        )
