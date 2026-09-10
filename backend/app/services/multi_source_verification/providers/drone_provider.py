"""
Drone Evidence Provider for Multi-Source Verification.
"""
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.services.multi_source_verification.base_provider import BaseEvidenceProvider, EvidencePayload


class DroneEvidenceProvider(BaseEvidenceProvider):
    source_code = "DRONE"
    default_weight = 0.20

    def collect_evidence(self, incident: Incident, db: Session) -> EvidencePayload:
        # UAV surveillance footage / thermal FLIR inspection
        confidence = 0.85
        quality = 0.90
        
        metadata = {
            "uav_callsign": "CoastGuard-StrikeDrone-4",
            "altitude_m": 250,
            "sensor_type": "Dual EO/IR Thermal Multispectral FLIR",
            "thermal_differential_c": -1.8,
            "estimated_oil_film_thickness_microns": 45.0,
            "recorded_fps": 30,
        }

        notes = (
            "UAV aerial flight survey confirmed thermal surface differential and "
            "iridescent rainbow sheen boundaries."
        )

        return EvidencePayload(
            source_code=self.source_code,
            provider_name="Coast Guard Tactical UAV Recon",
            confidence=confidence,
            evidence_type="UAV_THERMAL_FOOTAGE",
            agrees_with_spill=True,
            quality_score=quality,
            data_origin="SIMULATED",
            evidence_metadata=metadata,
            notes=notes,
        )
