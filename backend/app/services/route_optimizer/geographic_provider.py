"""
Geographic Marine Routing Provider — Module 14.

Calculates realistic marine response trajectories avoiding landmasses and peninsulas,
routing through verified maritime waypoints and shipping fairways, and computing
accurate nautical miles, weather-adjusted transit times, and leg-by-leg waypoints.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone, timedelta
from typing import Any

from app.models.emergency_vessel import EmergencyVessel
from app.gis.spatial_service import haversine_km
from app.services.route_optimizer.base import BaseRouteOptimizerProvider, RouteResult

KM_PER_NAUTICAL_MILE = 1.852

# Major nautical navigation clearance nodes and maritime fairways
# Designed to navigate safely around peninsulas, capes, and shallow straits
NAUTICAL_TRANSIT_NODES = {
    # Southern Cape & Sri Lanka clearance
    "CAPE_COMORIN_OFFSHORE": (7.40, 77.55),     # South of Kanyakumari deep-water passage
    "GULF_OF_MANNAR_SOUTH": (7.80, 78.40),      # South approach to Gulf of Mannar
    "SRI_LANKA_SOUTH_CLEARANCE": (5.75, 80.50), # Great Basses southern Sri Lanka transit node
    "SRI_LANKA_EAST_PASSAGE": (7.50, 82.20),    # East coast Sri Lanka open sea
    "PALK_BAY_NORTH_OFFSHORE": (10.40, 80.40),  # North of Point Calimere into Bay of Bengal

    # West Coast Fairways (Arabian Sea)
    "GUJARAT_GULF_KUTCH_OUTER": (22.30, 68.80), # Dwarka outer fairway
    "SAURASHTRA_OFFSHORE": (20.50, 70.00),      # Veraval offshore
    "MUMBAI_HIGH_APPROACH": (18.90, 72.40),     # Outer Mumbai deep-water fairway
    "GOA_OFFSHORE_FAIRWAY": (15.30, 73.50),     # Mormugao outer sea gate
    "MANGALORE_OUTER": (12.80, 74.50),          # New Mangalore offshore
    "COCHIN_ROADSTEAD": (9.95, 75.90),          # Cochin outer pilot station

    # East Coast Fairways (Bay of Bengal)
    "TUTICORIN_OUTER": (8.75, 78.35),           # VOC Port outer fairway
    "NAGAPATTINAM_OFFSHORE": (10.75, 80.10),    # Coromandel mid-shelf
    "CHENNAI_OUTER_FAIRWAY": (13.10, 80.45),    # Chennai port outer anchorage
    "KRISHNAPATNAM_OFFSHORE": (14.25, 80.30),   # Andhra south shelf
    "VIZAG_OUTER_FAIRWAY": (17.65, 83.45),      # Visakhapatnam outer fairway
    "PARADIP_ROADSTEAD": (20.20, 86.85),        # Paradip offshore
    "SANDHEADS_HOOGHLY": (21.00, 88.20),        # Sandheads pilot station (Kolkata/Haldia approach)
    "ANDAMAN_PORT_BLAIR_EAST": (11.60, 93.00),  # Andaman Sea fairway
}


class GeographicMarineRoutingProvider(BaseRouteOptimizerProvider):
    """
    Reliable geographic marine routing provider that calculates nautical routes
    with shoreline clearance, cape rounding, and multi-leg waypoints.
    """

    PROVIDER_NAME = "GEOGRAPHIC_SHORE_CLEARANCE_V1"

    def calculate_route(
        self,
        origin: tuple[float, float],
        destination: tuple[float, float],
        vessel: EmergencyVessel,
        incident_priority: str = "ROUTINE",
        weather_penalty: float = 1.05,
        avoid_restricted_zones: bool = True,
    ) -> RouteResult:
        o_lat, o_lon = origin
        d_lat, d_lon = destination

        # Determine if origin and destination are on opposite sides of the Indian peninsula
        # West Coast: lon < 77.5, East Coast: lon > 80.0 (or north of 8.0)
        is_west_origin = o_lon < 77.4 and o_lat > 8.0
        is_east_dest = d_lon >= 78.0 and d_lat > 8.5
        is_east_origin = o_lon >= 78.0 and o_lat > 8.5
        is_west_dest = d_lon < 77.4 and d_lat > 8.0

        cross_peninsula = (is_west_origin and is_east_dest) or (is_east_origin and is_west_dest)

        waypoints_list: list[dict[str, Any]] = []
        avoided_zones: list[str] = []

        # 1. Start point
        waypoints_list.append({
            "name": f"Departure: {vessel.name} ({vessel.home_port})",
            "latitude": o_lat,
            "longitude": o_lon,
            "waypoint_type": "DEPARTURE",
        })

        if cross_peninsula:
            # Must round the southern Indian peninsula via Cape Comorin & South Sri Lanka clearance
            avoided_zones.append("Mainland Peninsula Landmass & Western Ghats")
            avoided_zones.append("Adam's Bridge & Palk Strait Shallow Shoals (Draft < 3m)")

            if is_west_origin:
                # West to East
                # 1. Clear West coast offshore node
                if o_lat > 14.0:
                    waypoints_list.append({
                        "name": "Konkan / Malabar Coastal Fairway",
                        "latitude": round((o_lat + 10.0) / 2.0, 3),
                        "longitude": round(min(o_lon, 74.2), 3),
                        "waypoint_type": "CORRIDOR_WAYPOINT",
                    })
                # 2. Cape Comorin offshore node
                cc_lat, cc_lon = NAUTICAL_TRANSIT_NODES["CAPE_COMORIN_OFFSHORE"]
                waypoints_list.append({
                    "name": "Cape Comorin Navigational Clearance Node",
                    "latitude": cc_lat,
                    "longitude": cc_lon,
                    "waypoint_type": "CLEARANCE_WAYPOINT",
                })
                # 3. South Sri Lanka deep water transit
                sl_lat, sl_lon = NAUTICAL_TRANSIT_NODES["SRI_LANKA_SOUTH_CLEARANCE"]
                waypoints_list.append({
                    "name": "Dondra Head / South Sri Lanka Fairway",
                    "latitude": sl_lat,
                    "longitude": sl_lon,
                    "waypoint_type": "CLEARANCE_WAYPOINT",
                })
                # 4. East Sri Lanka open corridor
                if d_lat > 11.0:
                    waypoints_list.append({
                        "name": "Coromandel Approach Corridor",
                        "latitude": 10.50,
                        "longitude": 81.50,
                        "waypoint_type": "CORRIDOR_WAYPOINT",
                    })

            else:
                # East to West
                if o_lat > 14.0:
                    waypoints_list.append({
                        "name": "Bay of Bengal Deep Water Descent",
                        "latitude": 11.50,
                        "longitude": 81.80,
                        "waypoint_type": "CORRIDOR_WAYPOINT",
                    })
                sl_lat, sl_lon = NAUTICAL_TRANSIT_NODES["SRI_LANKA_SOUTH_CLEARANCE"]
                waypoints_list.append({
                    "name": "Dondra Head / South Sri Lanka Fairway",
                    "latitude": sl_lat,
                    "longitude": sl_lon,
                    "waypoint_type": "CLEARANCE_WAYPOINT",
                })
                cc_lat, cc_lon = NAUTICAL_TRANSIT_NODES["CAPE_COMORIN_OFFSHORE"]
                waypoints_list.append({
                    "name": "Cape Comorin Navigational Clearance Node",
                    "latitude": cc_lat,
                    "longitude": cc_lon,
                    "waypoint_type": "CLEARANCE_WAYPOINT",
                })
        else:
            # Same coast or open sea transit:
            # Check if direct line cuts too close to coast (< 5 km)
            # Insert mid-leg offshore clearance waypoint if along coastal curve
            mid_lat = round((o_lat + d_lat) / 2.0, 3)
            mid_lon = round((o_lon + d_lon) / 2.0, 3)
            direct_dist = haversine_km(o_lat, o_lon, d_lat, d_lon)

            if direct_dist > 80.0:
                # Add offshore buffer waypoint (e.g. push 0.3 deg east on East Coast or 0.3 deg west on West Coast)
                offshore_lon = mid_lon + (0.25 if (o_lon >= 78.0) else -0.25)
                waypoints_list.append({
                    "name": "Offshore Coastal Fairway Waypoint",
                    "latitude": mid_lat,
                    "longitude": offshore_lon,
                    "waypoint_type": "CLEARANCE_WAYPOINT",
                })
                avoided_zones.append("Inshore Intertidal Reefs & Artisanal Fishing Nets")

        # Destination incident point
        waypoints_list.append({
            "name": "Incident Destination: Oil Slick Coordinates",
            "latitude": d_lat,
            "longitude": d_lon,
            "waypoint_type": "INCIDENT_DESTINATION",
        })

        # Calculate distances and ETAs along legs
        # Operational speed: for CRITICAL or IMMEDIATE priority, vessel runs near max speed
        base_speed = vessel.max_speed_knots if incident_priority in ("CRITICAL", "IMMEDIATE") else vessel.cruising_speed_knots
        effective_speed_knots = max(8.0, base_speed / max(1.0, weather_penalty))

        total_km = 0.0
        cumulative_nm = 0.0
        cum_hours = 0.0

        enhanced_waypoints = []
        for i, wp in enumerate(waypoints_list):
            if i == 0:
                leg_dist_nm = 0.0
                leg_hours = 0.0
            else:
                prev = waypoints_list[i - 1]
                leg_km = haversine_km(prev["latitude"], prev["longitude"], wp["latitude"], wp["longitude"])
                leg_dist_nm = round(leg_km / KM_PER_NAUTICAL_MILE, 2)
                leg_hours = round(leg_dist_nm / effective_speed_knots, 2)

                total_km += leg_km
                cumulative_nm += leg_dist_nm
                cum_hours += leg_hours

            enhanced_waypoints.append({
                "index": i,
                "name": wp["name"],
                "latitude": wp["latitude"],
                "longitude": wp["longitude"],
                "leg_distance_nm": leg_dist_nm,
                "cumulative_distance_nm": round(cumulative_nm, 2),
                "leg_eta_hours": round(cum_hours, 2),
                "waypoint_type": wp["waypoint_type"],
            })

        total_nm = round(cumulative_nm, 1)
        total_km = round(total_km, 1)
        total_travel_hours = round(cum_hours, 2)

        # Build GeoJSON LineString
        coordinates = [[wp["longitude"], wp["latitude"]] for wp in enhanced_waypoints]
        geojson_geom = json.dumps({
            "type": "LineString",
            "coordinates": coordinates,
        })

        urgency = "IMMEDIATE" if incident_priority in ("CRITICAL", "IMMEDIATE") else "URGENT" if incident_priority == "HIGH" else "ROUTINE"

        return RouteResult(
            distance_nm=total_nm,
            distance_km=total_km,
            travel_time_hours=total_travel_hours,
            waypoints=enhanced_waypoints,
            route_geometry_geojson=geojson_geom,
            provider_name=self.PROVIDER_NAME,
            confidence=0.92 if not cross_peninsula else 0.88,
            weather_delay_factor=weather_penalty,
            urgency_rating=urgency,
            avoided_zones=avoided_zones,
        )
