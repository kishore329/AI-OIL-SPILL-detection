"""
Evidence providers package for Module 17 — Multi-Source Verification.
"""
from app.services.multi_source_verification.providers.satellite_provider import SatelliteEvidenceProvider
from app.services.multi_source_verification.providers.drone_provider import DroneEvidenceProvider
from app.services.multi_source_verification.providers.citizen_provider import CitizenEvidenceProvider
from app.services.multi_source_verification.providers.ais_provider import AISEvidenceProvider
from app.services.multi_source_verification.providers.metocean_provider import MetoceanEvidenceProvider

ALL_PROVIDERS = [
    SatelliteEvidenceProvider(),
    DroneEvidenceProvider(),
    CitizenEvidenceProvider(),
    AISEvidenceProvider(),
    MetoceanEvidenceProvider(),
]

__all__ = [
    "SatelliteEvidenceProvider",
    "DroneEvidenceProvider",
    "CitizenEvidenceProvider",
    "AISEvidenceProvider",
    "MetoceanEvidenceProvider",
    "ALL_PROVIDERS",
]
