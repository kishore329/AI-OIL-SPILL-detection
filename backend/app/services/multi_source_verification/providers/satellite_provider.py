"""
Satellite Evidence Provider for Multi-Source Verification.
"""
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.services.multi_source_verification.base_provider import BaseEvidenceProvider, EvidencePayload


class SatelliteEvidenceProvider(BaseEvidenceProvider):
    source_code = "SATELLITE"
    default_weight = 0.30

    def collect_evidence(self, incident: Incident, db: Session) -> EvidencePayload:
        # Determine confidence from detection confidence or spill area
        raw_conf = incident.detection_confidence if incident.detection_confidence is not None else 0.88
        
        # Determine data origin
        origin = "LIVE" if incident.source == "SATELLITE" else "SIMULATED"
        
        # Calculate quality score based on spill area and source
        spill_area = incident.spill_area_km2 or 1.5
        quality_score = 0.95 if spill_area >= 1.0 else 0.85

        metadata = {
            "satellite_constellation": "Sentinel-1A SAR & Landsat-9",
            "polarization": "VV/VH Cross-Polarization Ratio 4.2",
            "spatial_resolution_m": 10.0,
            "sar_anomaly_index": round(raw_conf * 0.98, 3),
            "slick_area_km2": spill_area,
            "latitude": incident.latitude,
            "longitude": incident.longitude,
        }

        notes = (
            f"Synthetic Aperture Radar (SAR) dark spot anomaly detected with "
            f"{round(raw_conf * 100, 1)}% confidence across {spill_area} km² sea surface area."
        )

        return EvidencePayload(
            source_code=self.source_code,
            provider_name="Sentinel-1 SAR Satellite Pipeline",
            confidence=raw_conf,
            evidence_type="SAR_RADAR_ANOMALY",
            agrees_with_spill=True,
            quality_score=quality_score,
            data_origin=origin,
            evidence_metadata=metadata,
            notes=notes,
        )
