"""
Emergency Response Vessel and Route Optimization ORM models — Module 14.
Tables:
  - emergency_vessels: Response vessels with capabilities, availability, and specs.
  - vessel_positions: Real-time and historical telemetry positions.
  - response_resources: On-board response equipment (booms, skimmers, dispersants).
  - optimized_routes: Computed marine routing trajectories with waypoints.
  - response_assignments: Vessel recommendation and assignment records for incidents.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class EmergencyVessel(Base):
    """Emergency response vessel with maritime capabilities and availability status."""

    __tablename__ = "emergency_vessels"

    id = Column(String(50), primary_key=True)  # e.g. "vsl-icg-samarth"
    name = Column(String(150), nullable=False)
    vessel_type = Column(String(100), nullable=False)  # Pollution Response Vessel (PRV), Fast Patrol, Tug, OSV
    mmsi = Column(String(20), nullable=True, unique=True)
    callsign = Column(String(20), nullable=True)
    home_port = Column(String(100), nullable=False)

    # Operational status
    is_available = Column(Boolean, nullable=False, default=True, index=True)
    status = Column(String(30), nullable=False, default="AVAILABLE")  # AVAILABLE, DISPATCHED, ON_SCENE, MAINTENANCE, STANDBY

    # Capabilities and equipment specifications
    capabilities_json = Column(Text, nullable=False, default="[]")  # JSON array: ["BOOM_DEPLOYMENT", "OIL_SKIMMING", ...]
    max_speed_knots = Column(Float, nullable=False, default=20.0)
    cruising_speed_knots = Column(Float, nullable=False, default=14.0)
    skimmer_capacity_m3h = Column(Float, nullable=False, default=100.0)
    boom_meters = Column(Float, nullable=False, default=500.0)
    dispersant_liters = Column(Float, nullable=False, default=5000.0)

    # Current Coordinates & Navigation
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    heading_deg = Column(Float, nullable=True, default=0.0)

    # Incident assignment
    assigned_incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    positions = relationship("VesselPosition", back_populates="vessel", cascade="all, delete-orphan")
    resources = relationship("ResponseResource", back_populates="vessel", cascade="all, delete-orphan")
    routes = relationship("OptimizedRoute", back_populates="vessel", cascade="all, delete-orphan")
    assignments = relationship("ResponseAssignment", back_populates="vessel", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<EmergencyVessel id={self.id} name={self.name} port={self.home_port} avail={self.is_available}>"


class VesselPosition(Base):
    """Historical or real-time vessel telemetry position ping."""

    __tablename__ = "vessel_positions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    vessel_id = Column(String(50), ForeignKey("emergency_vessels.id", ondelete="CASCADE"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_knots = Column(Float, nullable=False, default=0.0)
    heading_deg = Column(Float, nullable=True, default=0.0)
    recorded_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    vessel = relationship("EmergencyVessel", back_populates="positions")


class ResponseResource(Base):
    """Equipment asset or response team deployed on an emergency vessel or at a coastal base/depot."""

    __tablename__ = "response_resources"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    vessel_id = Column(String(50), ForeignKey("emergency_vessels.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(150), nullable=True)
    resource_type = Column(String(100), nullable=False)  # CONTAINMENT_BOOM, OIL_SKIMMER, RESPONSE_VESSEL, SKIMMER_VESSEL, ABSORBENT_MATERIALS, PERSONNEL, MONITORING_TEAM, CLEANUP_EQUIPMENT
    resource_category = Column(String(50), nullable=False, default="CLEANUP_EQUIPMENT")
    quantity = Column(Float, nullable=False, default=1.0)
    unit = Column(String(30), nullable=False, default="units")  # meters, m3/h, liters, persons, units
    status = Column(String(30), nullable=False, default="AVAILABLE", index=True)  # AVAILABLE, ASSIGNED, DEPLOYED, UNAVAILABLE, MAINTENANCE

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String(100), nullable=True)

    capabilities_json = Column(Text, nullable=False, default="[]")
    mobilization_time_hours = Column(Float, nullable=False, default=1.0)
    speed_knots = Column(Float, nullable=False, default=0.0)
    contact_lead = Column(String(100), nullable=True)
    cost_per_hour = Column(Float, nullable=False, default=0.0)
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    vessel = relationship("EmergencyVessel", back_populates="resources")
    assignments = relationship("ResourceAssignment", back_populates="resource", cascade="all, delete-orphan")
    status_history = relationship("ResourceStatusHistory", back_populates="resource", cascade="all, delete-orphan")


class OptimizedRoute(Base):
    """Computed marine route with nautical waypoints from emergency vessel to oil spill incident."""

    __tablename__ = "optimized_routes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(UUID(as_uuid=False), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    vessel_id = Column(String(50), ForeignKey("emergency_vessels.id", ondelete="CASCADE"), nullable=False, index=True)

    start_latitude = Column(Float, nullable=False)
    start_longitude = Column(Float, nullable=False)
    destination_latitude = Column(Float, nullable=False)
    destination_longitude = Column(Float, nullable=False)

    estimated_distance_nm = Column(Float, nullable=False)  # Nautical miles
    estimated_distance_km = Column(Float, nullable=False)
    estimated_travel_time_hours = Column(Float, nullable=False)
    estimated_arrival_time = Column(DateTime(timezone=True), nullable=False)

    route_geometry_geojson = Column(Text, nullable=False)  # GeoJSON LineString of complete nautical track
    waypoints_json = Column(Text, nullable=False)  # JSON array of waypoint objects with leg distances & ETAs

    routing_provider = Column(String(100), nullable=False, default="GEOGRAPHIC_SHORE_CLEARANCE_V1")
    route_confidence = Column(Float, nullable=False, default=0.90)
    weather_delay_factor = Column(Float, nullable=False, default=1.0)
    urgency_rating = Column(String(30), nullable=False, default="ROUTINE")  # IMMEDIATE, URGENT, ROUTINE
    avoided_restricted_zones_json = Column(Text, nullable=True, default="[]")
    disclaimer = Column(Text, nullable=False, default="[PROTOTYPE MARITIME ROUTE] Algorithmic path with shoreline clearance. Not certified for SOLAS vessel navigation.")

    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    vessel = relationship("EmergencyVessel", back_populates="routes")
    incident = relationship("Incident", back_populates="optimized_routes")


class ResponseAssignment(Base):
    """Emergency response vessel recommendation and dispatch assignment record."""

    __tablename__ = "response_assignments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(UUID(as_uuid=False), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    vessel_id = Column(String(50), ForeignKey("emergency_vessels.id", ondelete="CASCADE"), nullable=False, index=True)
    route_id = Column(UUID(as_uuid=False), ForeignKey("optimized_routes.id", ondelete="SET NULL"), nullable=True)

    status = Column(String(30), nullable=False, default="RECOMMENDED")  # RECOMMENDED, PROPOSED, ASSIGNED, CANCELLED
    recommendation_rank = Column(Integer, nullable=False, default=1)
    suitability_score = Column(Float, nullable=False, default=85.0)  # 0 to 100
    suitability_rationale = Column(Text, nullable=True)
    assigned_by = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    vessel = relationship("EmergencyVessel", back_populates="assignments")
    incident = relationship("Incident", back_populates="response_assignments")
