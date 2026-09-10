"""
Seed script — inserts 20 demo incidents + 8 environmental zones.
All data is SIMULATION/DEMO — not real incidents.

Usage:
    cd backend
    python -m app.database.seed
"""
from __future__ import annotations
import json
import uuid
import logging
from datetime import datetime, timezone, timedelta
import random

from sqlalchemy.orm import Session
from app.database.session import engine, Base
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.environmental_zone import EnvironmentalZone
from app.models.enums import (
    IncidentStatus, IncidentSeverity, ZoneType, ZoneSensitivity
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


def _pt(lng: float, lat: float) -> str:
    return json.dumps({"type": "Point", "coordinates": [lng, lat]})


def _rect(lng: float, lat: float, d: float = 0.05) -> str:
    """Create a simple rectangular polygon GeoJSON around a center point."""
    coords = [
        [lng - d, lat - d], [lng + d, lat - d],
        [lng + d, lat + d], [lng - d, lat + d],
        [lng - d, lat - d],
    ]
    return json.dumps({"type": "MultiPolygon", "coordinates": [[coords]]})


# ── DEMO incidents (Indian Ocean / Bay of Bengal region) ──────────────────
# Marked clearly as SIMULATION data

INCIDENTS = [
    # ── 3 CRITICAL ────────────────────────────────────────────────
    {
        "incident_code": "DEMO-INC-001",
        "severity": IncidentSeverity.CRITICAL,
        "status": IncidentStatus.RESPONSE_IN_PROGRESS,
        "risk_score": 94.2,
        "detection_confidence": 0.97,
        "spill_area_km2": 42.5,
        "latitude": 10.85, "longitude": 79.90,
        "description": "[SIMULATION] Large crude oil spill detected near Palk Strait.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=6),
    },
    {
        "incident_code": "DEMO-INC-002",
        "severity": IncidentSeverity.CRITICAL,
        "status": IncidentStatus.CONTAINMENT,
        "risk_score": 91.7,
        "detection_confidence": 0.95,
        "spill_area_km2": 38.1,
        "latitude": 18.90, "longitude": 72.65,
        "description": "[SIMULATION] Tanker collision causing major spill offshore Mumbai.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=18),
    },
    {
        "incident_code": "DEMO-INC-003",
        "severity": IncidentSeverity.CRITICAL,
        "status": IncidentStatus.ASSIGNED,
        "risk_score": 88.9,
        "detection_confidence": 0.92,
        "spill_area_km2": 29.8,
        "latitude": 13.12, "longitude": 80.40,
        "description": "[SIMULATION] Pipeline rupture detected offshore Chennai.",
        "source": "SENTINEL-2 MSI",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=3),
    },
    # ── 5 HIGH ────────────────────────────────────────────────────
    {
        "incident_code": "DEMO-INC-004",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.PRIORITIZED,
        "risk_score": 76.3,
        "detection_confidence": 0.88,
        "spill_area_km2": 15.4,
        "latitude": 21.15, "longitude": 88.25,
        "description": "[SIMULATION] Suspected fuel oil spill near Sandheads / Kolkata port maritime approach.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=12),
    },
    {
        "incident_code": "DEMO-INC-005",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.VERIFIED,
        "risk_score": 73.8,
        "detection_confidence": 0.85,
        "spill_area_km2": 11.2,
        "latitude": 9.95, "longitude": 76.10,
        "description": "[SIMULATION] Diesel spill near Kerala fishing zone.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=8),
    },
    {
        "incident_code": "DEMO-INC-006",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.RESPONSE_IN_PROGRESS,
        "risk_score": 71.0,
        "detection_confidence": 0.83,
        "spill_area_km2": 9.7,
        "latitude": 15.38, "longitude": 73.62,
        "description": "[SIMULATION] Vessel discharge detected in Goa coastal waters.",
        "source": "LANDSAT-8",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=14),
    },
    {
        "incident_code": "DEMO-INC-007",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.MONITORING,
        "risk_score": 68.5,
        "detection_confidence": 0.79,
        "spill_area_km2": 7.3,
        "latitude": 20.18, "longitude": 86.82,
        "description": "[SIMULATION] Crude oil sheen off Odisha coast.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=36),
    },
    {
        "incident_code": "DEMO-INC-008",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.VERIFIED,
        "risk_score": 65.2,
        "detection_confidence": 0.76,
        "spill_area_km2": 6.1,
        "latitude": 8.38, "longitude": 76.85,
        "description": "[SIMULATION] Spill near Thiruvananthapuram coast.",
        "source": "SENTINEL-2 MSI",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=22),
    },
    # ── 7 MODERATE ────────────────────────────────────────────────
    {
        "incident_code": "DEMO-INC-009",
        "severity": IncidentSeverity.MODERATE,
        "status": IncidentStatus.DETECTED,
        "risk_score": 52.1,
        "detection_confidence": 0.71,
        "spill_area_km2": 3.8,
        "latitude": 11.66, "longitude": 92.75,
        "description": "[SIMULATION] Suspected sheen near Andaman Islands.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=4),
    },
    {
        "incident_code": "DEMO-INC-010",
        "severity": IncidentSeverity.MODERATE,
        "status": IncidentStatus.VERIFIED,
        "risk_score": 48.7,
        "detection_confidence": 0.68,
        "spill_area_km2": 3.2,
        "latitude": 12.95, "longitude": 80.38,
        "description": "[SIMULATION] Minor spill offshore Chennai fishing harbour.",
        "source": "SENTINEL-2 MSI",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=30),
    },
    {
        "incident_code": "DEMO-INC-011",
        "severity": IncidentSeverity.MODERATE,
        "status": IncidentStatus.MONITORING,
        "risk_score": 45.4,
        "detection_confidence": 0.65,
        "spill_area_km2": 2.7,
        "latitude": 17.65, "longitude": 83.42,
        "description": "[SIMULATION] Oil sheen observed offshore Visakhapatnam.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=48),
    },
    {
        "incident_code": "DEMO-INC-012",
        "severity": IncidentSeverity.MODERATE,
        "status": IncidentStatus.DETECTED,
        "risk_score": 42.1,
        "detection_confidence": 0.62,
        "spill_area_km2": 2.1,
        "latitude": 21.02, "longitude": 72.55,
        "description": "[SIMULATION] Fuel discharge near Surat offshore waters.",
        "source": "LANDSAT-9",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=5),
    },
    {
        "incident_code": "DEMO-INC-013",
        "severity": IncidentSeverity.MODERATE,
        "status": IncidentStatus.PRIORITIZED,
        "risk_score": 38.9,
        "detection_confidence": 0.60,
        "spill_area_km2": 1.8,
        "latitude": 22.75, "longitude": 69.85,
        "description": "[SIMULATION] Minor spill in Gulf of Kutch maritime channel.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=20),
    },
    {
        "incident_code": "DEMO-INC-014",
        "severity": IncidentSeverity.MODERATE,
        "status": IncidentStatus.VERIFIED,
        "risk_score": 35.2,
        "detection_confidence": 0.57,
        "spill_area_km2": 1.4,
        "latitude": 6.92, "longitude": 79.85,
        "description": "[SIMULATION] Lubricant sheen near Sri Lanka coast.",
        "source": "SENTINEL-2 MSI",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=40),
    },
    {
        "incident_code": "DEMO-INC-015",
        "severity": IncidentSeverity.MODERATE,
        "status": IncidentStatus.MONITORING,
        "risk_score": 33.0,
        "detection_confidence": 0.55,
        "spill_area_km2": 1.1,
        "latitude": 16.50, "longitude": 82.57,
        "description": "[SIMULATION] Small spill near Andhra Pradesh coast.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=60),
    },
    # ── 5 LOW ─────────────────────────────────────────────────────
    {
        "incident_code": "DEMO-INC-016",
        "severity": IncidentSeverity.LOW,
        "status": IncidentStatus.DETECTED,
        "risk_score": 18.4,
        "detection_confidence": 0.48,
        "spill_area_km2": 0.4,
        "latitude": 11.02, "longitude": 75.81,
        "description": "[SIMULATION] Very minor sheen — possible natural seep, Calicut coast.",
        "source": "SENTINEL-2 MSI",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=10),
    },
    {
        "incident_code": "DEMO-INC-017",
        "severity": IncidentSeverity.LOW,
        "status": IncidentStatus.RESOLVED,
        "risk_score": 14.2,
        "detection_confidence": 0.45,
        "spill_area_km2": 0.3,
        "latitude": 8.08, "longitude": 77.55,
        "description": "[SIMULATION] Resolved minor spill near Kanyakumari cape.",
        "source": "LANDSAT-8",
        "detected_at": datetime.now(timezone.utc) - timedelta(days=3),
        "is_active": False,
    },
    {
        "incident_code": "DEMO-INC-018",
        "severity": IncidentSeverity.LOW,
        "status": IncidentStatus.MONITORING,
        "risk_score": 12.7,
        "detection_confidence": 0.43,
        "spill_area_km2": 0.2,
        "latitude": 17.95, "longitude": 72.95,
        "description": "[SIMULATION] Trace oil sheen near Dighi / Maharashtra coastal approach.",
        "source": "SENTINEL-2 MSI",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=72),
    },
    {
        "incident_code": "DEMO-INC-019",
        "severity": IncidentSeverity.LOW,
        "status": IncidentStatus.DETECTED,
        "risk_score": 10.1,
        "detection_confidence": 0.41,
        "spill_area_km2": 0.15,
        "latitude": 21.55, "longitude": 88.90,
        "description": "[SIMULATION] Outer Sundarbans maritime fairway runoff.",
        "source": "LANDSAT-9",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=15),
    },
    {
        "incident_code": "DEMO-INC-020",
        "severity": IncidentSeverity.LOW,
        "status": IncidentStatus.MONITORING,
        "risk_score": 8.3,
        "detection_confidence": 0.38,
        "spill_area_km2": 0.08,
        "latitude": 7.87, "longitude": 98.40,
        "description": "[SIMULATION] Very minor trace sheen near Phuket (Gulf of Thailand).",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=90),
    },
    # ── DEEP OCEAN & HIGH SEAS INCIDENTS (INTERNATIONAL WATERS) ──
    {
        "incident_code": "DEMO-INC-021",
        "severity": IncidentSeverity.CRITICAL,
        "status": IncidentStatus.RESPONSE_IN_PROGRESS,
        "risk_score": 88.5,
        "detection_confidence": 0.96,
        "spill_area_km2": 65.4,
        "latitude": -3.50, "longitude": 77.80,
        "description": "[SIMULATION] Open ocean supertanker structural failure in the equatorial Indian Ocean along Cape-to-Malacca route.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=7),
    },
    {
        "incident_code": "DEMO-INC-022",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.PRIORITIZED,
        "risk_score": 75.0,
        "detection_confidence": 0.89,
        "spill_area_km2": 48.2,
        "latitude": 15.80, "longitude": 63.50,
        "description": "[SIMULATION] Arabian Sea high-seas crude slick 600 km offshore Mumbai & Oman in international waters.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=16),
    },
    {
        "incident_code": "DEMO-INC-023",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.VERIFIED,
        "risk_score": 72.8,
        "detection_confidence": 0.86,
        "spill_area_km2": 34.7,
        "latitude": 13.40, "longitude": 87.90,
        "description": "[SIMULATION] Central Bay of Bengal deep ocean slick detected 450 km east of Chennai along shipping corridor.",
        "source": "SENTINEL-2 MSI",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=10),
    },
    {
        "incident_code": "DEMO-INC-024",
        "severity": IncidentSeverity.MODERATE,
        "status": IncidentStatus.DETECTED,
        "risk_score": 58.0,
        "detection_confidence": 0.79,
        "spill_area_km2": 28.5,
        "latitude": -8.90, "longitude": 84.20,
        "description": "[SIMULATION] High-seas ballast discharge detected south of the equator in deep southern Indian Ocean basin.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=28),
    },
    {
        "incident_code": "DEMO-INC-025",
        "severity": IncidentSeverity.MODERATE,
        "status": IncidentStatus.MONITORING,
        "risk_score": 53.4,
        "detection_confidence": 0.74,
        "spill_area_km2": 19.3,
        "latitude": -1.20, "longitude": 72.60,
        "description": "[SIMULATION] Deep oceanic anomaly detected near the Chagos oceanic trench.",
        "source": "LANDSAT-8",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=42),
    },
    # ── MIDDLE EAST, RED SEA & PERSIAN GULF ──
    {
        "incident_code": "DEMO-INC-026",
        "severity": IncidentSeverity.CRITICAL,
        "status": IncidentStatus.RESPONSE_IN_PROGRESS,
        "risk_score": 97.1,
        "detection_confidence": 0.98,
        "spill_area_km2": 78.5,
        "latitude": 25.75, "longitude": 56.90,
        "description": "[SIMULATION] Major crude oil slick from VLCC tanker collision near entrance of Strait of Hormuz.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=5),
    },
    {
        "incident_code": "DEMO-INC-027",
        "severity": IncidentSeverity.CRITICAL,
        "status": IncidentStatus.PRIORITIZED,
        "risk_score": 93.0,
        "detection_confidence": 0.94,
        "spill_area_km2": 52.0,
        "latitude": 12.60, "longitude": 44.80,
        "description": "[SIMULATION] Commercial vessel distress spill in the Gulf of Aden international transit corridor.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=9),
    },
    {
        "incident_code": "DEMO-INC-028",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.VERIFIED,
        "risk_score": 79.4,
        "detection_confidence": 0.87,
        "spill_area_km2": 33.6,
        "latitude": 19.20, "longitude": 39.50,
        "description": "[SIMULATION] Slick drifting in the central Red Sea near major international tanker channel.",
        "source": "SENTINEL-2 MSI",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=14),
    },
    # ── SOUTHEAST ASIA & MALACCA STRAIT ──
    {
        "incident_code": "DEMO-INC-029",
        "severity": IncidentSeverity.CRITICAL,
        "status": IncidentStatus.RESPONSE_IN_PROGRESS,
        "risk_score": 95.8,
        "detection_confidence": 0.96,
        "spill_area_km2": 61.2,
        "latitude": 2.60, "longitude": 101.80,
        "description": "[SIMULATION] Major crude tanker discharge in narrow Malacca shipping corridor between Sumatra and Malaysia.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=4),
    },
    {
        "incident_code": "DEMO-INC-030",
        "severity": IncidentSeverity.CRITICAL,
        "status": IncidentStatus.CONTAINMENT,
        "risk_score": 94.1,
        "detection_confidence": 0.95,
        "spill_area_km2": 45.0,
        "latitude": 1.30, "longitude": 104.35,
        "description": "[SIMULATION] Heavy bunker fuel spill near Singapore Eastern Anchorage affecting international traffic.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=11),
    },
    {
        "incident_code": "DEMO-INC-031",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.VERIFIED,
        "risk_score": 70.5,
        "detection_confidence": 0.84,
        "spill_area_km2": 24.1,
        "latitude": 9.80, "longitude": 95.50,
        "description": "[SIMULATION] Deep ocean spill 200 km west of Thailand along international tanker route.",
        "source": "LANDSAT-8",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=20),
    },
    # ── GLOBAL OCEANS (MEDITERRANEAN, GULF OF MEXICO, NORTH SEA, ATLANTIC) ──
    {
        "incident_code": "DEMO-INC-032",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.VERIFIED,
        "risk_score": 77.2,
        "detection_confidence": 0.88,
        "spill_area_km2": 39.8,
        "latitude": 34.80, "longitude": 24.50,
        "description": "[SIMULATION] International waters slick detected in central Mediterranean Sea between Crete and Libya.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=18),
    },
    {
        "incident_code": "DEMO-INC-033",
        "severity": IncidentSeverity.CRITICAL,
        "status": IncidentStatus.RESPONSE_IN_PROGRESS,
        "risk_score": 92.4,
        "detection_confidence": 0.94,
        "spill_area_km2": 63.5,
        "latitude": 27.80, "longitude": -90.20,
        "description": "[SIMULATION] Offshore deepwater drilling platform anomaly in central Gulf of Mexico.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=8),
    },
    {
        "incident_code": "DEMO-INC-034",
        "severity": IncidentSeverity.MODERATE,
        "status": IncidentStatus.MONITORING,
        "risk_score": 54.6,
        "detection_confidence": 0.77,
        "spill_area_km2": 26.4,
        "latitude": 56.90, "longitude": 3.20,
        "description": "[SIMULATION] Offshore production facility discharge in international North Sea waters.",
        "source": "SENTINEL-2 MSI",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=30),
    },
    {
        "incident_code": "DEMO-INC-035",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.PRIORITIZED,
        "risk_score": 80.1,
        "detection_confidence": 0.90,
        "spill_area_km2": 47.0,
        "latitude": 4.50, "longitude": 5.10,
        "description": "[SIMULATION] Major crude oil slick detected offshore Nigeria in the Gulf of Guinea.",
        "source": "SENTINEL-1 SAR",
        "detected_at": datetime.now(timezone.utc) - timedelta(hours=12),
    },
]

ZONES = [
    {
        "name": "Gulf of Mannar Marine National Park",
        "zone_type": ZoneType.PROTECTED_AREA,
        "sensitivity": ZoneSensitivity.CRITICAL,
        "latitude": 9.05, "longitude": 79.10,
    },
    {
        "name": "Mumbai Port Trust Zone",
        "zone_type": ZoneType.PORT,
        "sensitivity": ZoneSensitivity.HIGH,
        "latitude": 18.94, "longitude": 72.84,
    },
    {
        "name": "Kerala Fishing Zone Alpha",
        "zone_type": ZoneType.FISHING_ZONE,
        "sensitivity": ZoneSensitivity.HIGH,
        "latitude": 10.50, "longitude": 75.50,
    },
    {
        "name": "Chilika Lake Protected Wetland",
        "zone_type": ZoneType.PROTECTED_AREA,
        "sensitivity": ZoneSensitivity.CRITICAL,
        "latitude": 19.72, "longitude": 85.30,
    },
    {
        "name": "Chennai Marina Beach",
        "zone_type": ZoneType.BEACH,
        "sensitivity": ZoneSensitivity.MODERATE,
        "latitude": 13.05, "longitude": 80.28,
    },
    {
        "name": "Strait of Hormuz Shipping Lane",
        "zone_type": ZoneType.SHIPPING_LANE,
        "sensitivity": ZoneSensitivity.MODERATE,
        "latitude": 26.50, "longitude": 56.50,
    },
    {
        "name": "Sundarbans Mangrove Reserve",
        "zone_type": ZoneType.PROTECTED_AREA,
        "sensitivity": ZoneSensitivity.CRITICAL,
        "latitude": 21.94, "longitude": 89.18,
    },
    {
        "name": "Goa Coastal Settlement Zone",
        "zone_type": ZoneType.COASTAL_SETTLEMENT,
        "sensitivity": ZoneSensitivity.HIGH,
        "latitude": 15.49, "longitude": 73.82,
    },
    # ── GLOBAL OCEAN & INTERNATIONAL RESERVES ──
    {
        "name": "Chagos Marine Protected Reserve (Equatorial Ocean)",
        "zone_type": ZoneType.PROTECTED_AREA,
        "sensitivity": ZoneSensitivity.CRITICAL,
        "latitude": -5.50, "longitude": 72.00,
    },
    {
        "name": "Strait of Malacca Marine Biosphere",
        "zone_type": ZoneType.PROTECTED_AREA,
        "sensitivity": ZoneSensitivity.CRITICAL,
        "latitude": 2.50, "longitude": 101.50,
    },
    {
        "name": "Port of Singapore Bunkering Hub",
        "zone_type": ZoneType.PORT,
        "sensitivity": ZoneSensitivity.CRITICAL,
        "latitude": 1.28, "longitude": 103.85,
    },
    {
        "name": "Port of Fujairah Anchor Zone (UAE / Oman)",
        "zone_type": ZoneType.PORT,
        "sensitivity": ZoneSensitivity.HIGH,
        "latitude": 25.18, "longitude": 56.36,
    },
    {
        "name": "Gulf of Aden International Transit Corridor",
        "zone_type": ZoneType.SHIPPING_LANE,
        "sensitivity": ZoneSensitivity.HIGH,
        "latitude": 12.50, "longitude": 45.00,
    },
    {
        "name": "Mediterranean Pelagos Marine Sanctuary",
        "zone_type": ZoneType.PROTECTED_AREA,
        "sensitivity": ZoneSensitivity.CRITICAL,
        "latitude": 43.00, "longitude": 9.00,
    },
]


def seed(db: Session, clear_first: bool = False) -> None:
    """Insert demo incidents and zones. Skip already-existing codes."""
    log.info("Starting database seed (DEMO/SIMULATION data only)…")

    from sqlalchemy import select

    if clear_first:
        log.info("Clearing existing seed data…")
        for code in [i["incident_code"] for i in INCIDENTS]:
            existing = db.execute(
                select(Incident).where(Incident.incident_code == code)
            ).scalar_one_or_none()
            if existing:
                db.delete(existing)
        db.commit()

    inserted = 0
    for data in INCIDENTS:
        code = data["incident_code"]
        exists = db.execute(
            select(Incident).where(Incident.incident_code == code)
        ).scalar_one_or_none()
        if exists:
            log.info(f"  skip {code} (already exists)")
            continue

        lat, lng = data["latitude"], data["longitude"]
        incident = Incident(
            id=str(uuid.uuid4()),
            location_geojson=_pt(lng, lat),
            spill_geometry_geojson=_rect(lng, lat, d=0.04),
            **data,
        )
        db.add(incident)
        db.flush()

        # Add initial event
        event = IncidentEvent(
            id=str(uuid.uuid4()),
            incident_id=incident.id,
            event_type="INCIDENT_CREATED",
            description=f"Demo incident {code} seeded ({incident.severity} severity).",
            created_by="seed_script",
        )
        db.add(event)
        inserted += 1

    # Zones
    zone_inserted = 0
    for zdata in ZONES:
        exists = db.execute(
            select(EnvironmentalZone).where(EnvironmentalZone.name == zdata["name"])
        ).scalar_one_or_none()
        if exists:
            continue
        lat, lng = zdata["latitude"], zdata["longitude"]
        zone = EnvironmentalZone(
            id=str(uuid.uuid4()),
            geometry_geojson=_rect(lng, lat, d=0.15),
            **zdata,
        )
        db.add(zone)
        zone_inserted += 1

    db.commit()
    log.info(f"Seed complete: {inserted} incidents, {zone_inserted} zones inserted.")


if __name__ == "__main__":
    # Import models to ensure tables exist
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        seed(db)
