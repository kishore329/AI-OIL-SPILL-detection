"""
GIS Spatial Service — PostGIS / Geospatial analysis for Oil Spill Detection & Response.
Handles proximity calculations, layer aggregation, and GeoJSON transformations.
"""
from __future__ import annotations
import math
import json
import logging
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.environmental_zone import EnvironmentalZone
from app.models.enums import ZoneType, ZoneSensitivity
from app.schemas.map import (
    MapIncidentPoint, NearbyZoneItem, NearbyZonesResponse,
    GISLayerFeature, MapLayersResponse
)

logger = logging.getLogger(__name__)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in kilometers between two points on earth."""
    R = 6371.0  # Earth's radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


# ── SIMULATION GIS LAYERS (Indian Ocean & South Asia Maritime Baseline) ────────
# Clearly marked as SIMULATION DATA for SIH evaluation

SIMULATION_PORTS = [
    {
        "id": "port-jnpt",
        "name": "Jawaharlal Nehru Port (JNPT Mumbai)",
        "latitude": 18.949,
        "longitude": 72.951,
        "feature_type": "PORT",
        "sensitivity": "HIGH",
        "description": "Premier container gateway of India handling ~50% of container traffic.",
    },
    {
        "id": "port-chennai",
        "name": "Chennai Port Trust",
        "latitude": 13.084,
        "longitude": 80.297,
        "feature_type": "PORT",
        "sensitivity": "HIGH",
        "description": "Major artificial harbour on the Coromandel Coast with petro-chemical terminals.",
    },
    {
        "id": "port-cochin",
        "name": "Cochin International Port",
        "latitude": 9.967,
        "longitude": 76.271,
        "feature_type": "PORT",
        "sensitivity": "CRITICAL",
        "description": "Strategic natural deep-water harbour located along the Arabian Sea route.",
    },
    {
        "id": "port-vizag",
        "name": "Visakhapatnam Port",
        "latitude": 17.690,
        "longitude": 83.298,
        "feature_type": "PORT",
        "sensitivity": "HIGH",
        "description": "Major eastern coast port handling crude oil, iron ore, and petrochemicals.",
    },
    {
        "id": "port-kandla",
        "name": "Deendayal Port (Kandla)",
        "latitude": 23.013,
        "longitude": 70.220,
        "feature_type": "PORT",
        "sensitivity": "CRITICAL",
        "description": "India's highest cargo volume port with massive crude oil tanker discharges.",
    },
    {
        "id": "port-paradip",
        "name": "Paradip Deep Water Port",
        "latitude": 20.264,
        "longitude": 86.671,
        "feature_type": "PORT",
        "sensitivity": "HIGH",
        "description": "Key industrial port on Odisha coast handling petroleum and minerals.",
    },
    {
        "id": "port-mormugao",
        "name": "Mormugao Port (Goa)",
        "latitude": 15.416,
        "longitude": 73.803,
        "feature_type": "PORT",
        "sensitivity": "MODERATE",
        "description": "Major west coast port at the mouth of the Zuari river.",
    },
    {
        "id": "port-tuticorin",
        "name": "V.O. Chidambaranar Port (Tuticorin)",
        "latitude": 8.754,
        "longitude": 78.196,
        "feature_type": "PORT",
        "sensitivity": "HIGH",
        "description": "Deep-water port in Tamil Nadu near Gulf of Mannar biosphere reserve.",
    },
    {
        "id": "port-blair",
        "name": "Port Blair Marine Terminal",
        "latitude": 11.666,
        "longitude": 92.730,
        "feature_type": "PORT",
        "sensitivity": "CRITICAL",
        "description": "Strategic maritime hub in the Andaman and Nicobar Islands near Malacca Strait.",
    },
    {
        "id": "port-colombo",
        "name": "Port of Colombo (Sri Lanka)",
        "latitude": 6.953,
        "longitude": 79.845,
        "feature_type": "PORT",
        "sensitivity": "HIGH",
        "description": "Major transshipment hub connecting East-West global container corridors.",
    },
]

SIMULATION_SHIPPING_LANES = [
    {
        "id": "lane-indian-ocean-trunk",
        "name": "Indian Ocean Main Trunk Line (Suez / Cape to Malacca)",
        "feature_type": "SHIPPING_LANE",
        "sensitivity": "HIGH",
        "description": "Super-tanker crude arterial route connecting Arabian Gulf to East Asia.",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [
                [60.0, 13.5], [68.0, 9.5], [76.5, 6.8], [80.5, 5.8],
                [85.0, 6.0], [92.0, 6.5], [97.5, 5.0]
            ]
        })
    },
    {
        "id": "lane-arabian-sea-tanker",
        "name": "Arabian Sea Crude Tanker Highway (Hormuz to Mumbai / Gujarat)",
        "feature_type": "SHIPPING_LANE",
        "sensitivity": "CRITICAL",
        "description": "Heavy tanker transit corridor from Persian Gulf to western Indian refineries.",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [
                [56.8, 25.5], [60.5, 22.8], [65.0, 20.2], [69.5, 19.8], [72.5, 18.9]
            ]
        })
    },
    {
        "id": "lane-bay-of-bengal",
        "name": "Bay of Bengal Coastal Shipping Corridor",
        "feature_type": "SHIPPING_LANE",
        "sensitivity": "MODERATE",
        "description": "Coastal cargo trade corridor linking Kolkata, Paradip, Vizag, and Chennai.",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [
                [88.2, 21.6], [86.8, 20.1], [83.5, 17.5], [80.4, 13.1], [79.8, 10.3]
            ]
        })
    },
    {
        "id": "lane-palk-strait",
        "name": "Palk Strait & Gulf of Mannar Transit Channel",
        "feature_type": "SHIPPING_LANE",
        "sensitivity": "CRITICAL",
        "description": "Sensitive shallow waters navigation channel between Tamil Nadu and Sri Lanka.",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [
                [79.3, 9.5], [79.8, 9.8], [80.3, 10.0]
            ]
        })
    },
    {
        "id": "lane-malacca-singapore",
        "name": "Strait of Malacca & Singapore Chokepoint Corridor",
        "feature_type": "SHIPPING_LANE",
        "sensitivity": "CRITICAL",
        "description": "Critical international maritime chokepoint connecting Indian Ocean to South China Sea.",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [
                [95.0, 5.8], [98.5, 4.2], [100.8, 2.7], [103.8, 1.25], [105.0, 1.5]
            ]
        })
    },
    {
        "id": "lane-redsea-gulfofaden",
        "name": "Red Sea & Gulf of Aden International Transit Corridor",
        "feature_type": "SHIPPING_LANE",
        "sensitivity": "CRITICAL",
        "description": "Global crude arterial corridor through Bab-el-Mandeb strait connecting Suez to Arabian Sea.",
        "geometry_geojson": json.dumps({
            "type": "LineString",
            "coordinates": [
                [33.5, 27.2], [38.2, 20.5], [43.3, 12.6], [48.5, 12.0], [54.0, 13.0], [60.0, 13.5]
            ]
        })
    },
]

# Simplified coastline coordinates along India's coastal perimeter
COASTLINE_COORDINATES = [
    [68.5, 23.7], [69.5, 23.0], [70.2, 22.8], [69.0, 22.3], [70.0, 21.0],
    [71.5, 20.8], [72.8, 21.2], [72.8, 19.0], [73.2, 17.0], [73.8, 15.5],
    [74.5, 14.2], [75.8, 11.5], [76.3, 10.0], [77.5, 8.1],  # Kanyakumari
    [78.2, 8.8],  [79.2, 9.3],  [79.9, 10.8], [80.3, 13.1], [80.2, 15.0],
    [82.5, 16.8], [83.3, 17.7], [85.0, 19.5], [86.7, 20.3], [87.5, 21.5],
    [88.5, 21.8], [89.0, 22.0]
]


class SpatialService:

    @staticmethod
    def get_nearby_zones(
        db: Session,
        incident_id: str,
        radius_km: float = 50.0,
    ) -> NearbyZonesResponse:
        """
        Finds all environmental zones (protected areas, fishing grounds, ports, beaches)
        within `radius_km` of the specified incident.
        """
        incident = db.get(Incident, incident_id)
        if not incident or not incident.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        if incident.latitude is None or incident.longitude is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incident '{incident_id}' does not have geographic coordinates.",
            )

        inc_lat = incident.latitude
        inc_lon = incident.longitude

        # Query all environmental zones
        zones_in_db = db.execute(select(EnvironmentalZone)).scalars().all()

        nearby_items: list[NearbyZoneItem] = []

        # 1. Check DB environmental zones
        for z in zones_in_db:
            z_lat = z.latitude
            z_lon = z.longitude
            if z_lat is None or z_lon is None:
                continue

            dist = haversine_km(inc_lat, inc_lon, z_lat, z_lon)
            if dist <= radius_km:
                nearby_items.append(
                    NearbyZoneItem(
                        zone_id=z.id,
                        name=z.name,
                        zone_type=z.zone_type,
                        sensitivity=z.sensitivity,
                        distance_km=dist,
                        latitude=z.latitude,
                        longitude=z.longitude,
                        geometry_geojson=z.geometry_geojson,
                        is_demo=True,
                    )
                )

        # 2. Also check simulation ports for spatial proximity
        for p in SIMULATION_PORTS:
            p_lat, p_lon = p["latitude"], p["longitude"]
            dist = haversine_km(inc_lat, inc_lon, p_lat, p_lon)
            if dist <= radius_km:
                # Check if already added
                if not any(item.name == p["name"] for item in nearby_items):
                    nearby_items.append(
                        NearbyZoneItem(
                            zone_id=p["id"],
                            name=p["name"],
                            zone_type=ZoneType.PORT,
                            sensitivity=ZoneSensitivity[p["sensitivity"]],
                            distance_km=dist,
                            latitude=p_lat,
                            longitude=p_lon,
                            geometry_geojson=None,
                            is_demo=True,
                        )
                    )

        # Sort by proximity (closest first)
        nearby_items.sort(key=lambda x: x.distance_km)

        return NearbyZonesResponse(
            incident_id=incident.id,
            incident_code=incident.incident_code,
            incident_latitude=inc_lat,
            incident_longitude=inc_lon,
            radius_km=radius_km,
            total_nearby=len(nearby_items),
            zones=nearby_items,
        )

    @staticmethod
    def get_map_layers(db: Session, active_only: bool = True) -> MapLayersResponse:
        """
        Compiles all geospatial layers required for the Leaflet interactive map:
        - Oil spill incidents with spill polygons
        - Protected areas
        - Fishing zones
        - Major ports
        - Shipping corridors
        - Coastal reference baseline
        """
        # 1. Incidents
        q = select(Incident)
        if active_only:
            q = q.where(Incident.is_active == True)  # noqa: E712
        incidents_rows = db.execute(q).scalars().all()
        incidents_points = [MapIncidentPoint.model_validate(r) for r in incidents_rows]

        # 2. Environmental Zones from DB
        zones_rows = db.execute(select(EnvironmentalZone)).scalars().all()

        protected_areas: list[GISLayerFeature] = []
        fishing_zones: list[GISLayerFeature] = []
        ports_list: list[GISLayerFeature] = []
        shipping_lanes_list: list[GISLayerFeature] = []

        for z in zones_rows:
            feature = GISLayerFeature(
                id=z.id,
                name=z.name,
                feature_type=z.zone_type.value,
                sensitivity=z.sensitivity.value,
                latitude=z.latitude,
                longitude=z.longitude,
                geometry_geojson=z.geometry_geojson,
                description=f"[SIMULATION] Environmental zone with {z.sensitivity.value} sensitivity classification.",
                is_demo=True,
            )

            if z.zone_type == ZoneType.PROTECTED_AREA:
                protected_areas.append(feature)
            elif z.zone_type == ZoneType.FISHING_ZONE:
                fishing_zones.append(feature)
            elif z.zone_type == ZoneType.PORT:
                ports_list.append(feature)
            elif z.zone_type == ZoneType.SHIPPING_LANE:
                shipping_lanes_list.append(feature)
            else:
                # Other types (BEACH, COASTAL_SETTLEMENT) grouped under protected_areas / buffer
                protected_areas.append(feature)

        # Merge simulation ports
        for p in SIMULATION_PORTS:
            if not any(x.name == p["name"] for x in ports_list):
                ports_list.append(
                    GISLayerFeature(
                        id=p["id"],
                        name=p["name"],
                        feature_type="PORT",
                        sensitivity=p["sensitivity"],
                        latitude=p["latitude"],
                        longitude=p["longitude"],
                        geometry_geojson=None,
                        description=p["description"],
                        is_demo=True,
                    )
                )

        # Merge simulation shipping lanes
        for lane in SIMULATION_SHIPPING_LANES:
            if not any(x.name == lane["name"] for x in shipping_lanes_list):
                shipping_lanes_list.append(
                    GISLayerFeature(
                        id=lane["id"],
                        name=lane["name"],
                        feature_type="SHIPPING_LANE",
                        sensitivity=lane["sensitivity"],
                        geometry_geojson=lane["geometry_geojson"],
                        description=lane["description"],
                        is_demo=True,
                    )
                )

        return MapLayersResponse(
            incidents=incidents_points,
            protected_areas=protected_areas,
            fishing_zones=fishing_zones,
            ports=ports_list,
            shipping_lanes=shipping_lanes_list,
            coastline=COASTLINE_COORDINATES,
            is_demo_data=True,
        )
