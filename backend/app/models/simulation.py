"""
Module 20 — What-If Oil Spill Simulator Database Models.
Defines simulation_runs, simulation_inputs, and simulation_outputs tables.
Strictly isolated from the production incidents table.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Text,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship

from app.database.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SimulationRun(Base):
    """Root record representing a hypothetical simulation execution run."""
    __tablename__ = "simulation_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False, default="Hypothetical Spill Scenario")
    status = Column(String(32), nullable=False, default="CREATED")  # CREATED, RUNNING, COMPLETED, FAILED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    inputs = relationship(
        "SimulationInput",
        back_populates="simulation",
        uselist=False,
        cascade="all, delete-orphan",
    )
    outputs = relationship(
        "SimulationOutput",
        back_populates="simulation",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<SimulationRun id={self.id} name='{self.name}' status='{self.status}'>"


class SimulationInput(Base):
    """Hypothetical environmental, spatial, and spill parameters specified by the operator."""
    __tablename__ = "simulation_inputs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    simulation_id = Column(String(36), ForeignKey("simulation_runs.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Geographic Origin
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # Spill characteristics
    spill_size = Column(Float, nullable=False)  # User input numerical amount
    spill_size_unit = Column(String(16), default="BARRELS", nullable=False)  # BARRELS, TONS, M3
    spill_size_barrels = Column(Float, nullable=False)  # Normalized to barrels
    oil_type = Column(String(32), default="LIGHT_CRUDE", nullable=False)  # LIGHT_CRUDE, HEAVY_CRUDE, DIESEL_REFINED, BUNKER_FUEL

    # Atmospheric & Oceanographic Conditions
    wind_speed_kmh = Column(Float, default=15.0, nullable=False)
    wind_direction_deg = Column(Float, default=225.0, nullable=False)  # 0-360 degrees
    current_speed_knots = Column(Float, default=1.5, nullable=False)
    current_direction_deg = Column(Float, default=45.0, nullable=False)  # 0-360 degrees

    # Simulation Parameters
    duration_hours = Column(Float, default=24.0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    simulation = relationship("SimulationRun", back_populates="inputs")

    def __repr__(self) -> str:
        return f"<SimulationInput id={self.id} sim_id={self.simulation_id} size={self.spill_size} {self.spill_size_unit}>"


class SimulationOutput(Base):
    """Calculated multi-domain consequences generated from hypothetical simulation parameters."""
    __tablename__ = "simulation_outputs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    simulation_id = Column(String(36), ForeignKey("simulation_runs.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Multi-domain Analytical Results (stored as JSON)
    predicted_movement = Column(JSON, nullable=False)   # Trajectory waypoints, drift vector, Fay spreading
    risk = Column(JSON, nullable=False)                 # Overall score (0-100), severity, sub-factors
    ecosystem_impact = Column(JSON, nullable=False)     # Vulnerable biomes, sensitivity, decay scores
    coastal_impact = Column(JSON, nullable=False)       # Landfall coordinates, time_to_shore_hours, assets
    priority = Column(JSON, nullable=False)             # Priority score, urgency tier, operational rank
    economic_estimate = Column(JSON, nullable=False)    # 4-pillar financial loss breakdown in USD
    recommendations = Column(JSON, nullable=False)      # Booms, skimmers, response tier, dispersant notes

    # Prominent decision support disclaimer
    disclaimer = Column(
        Text,
        nullable=False,
        default=(
            "PROBABILISTIC SCENARIO MODEL — DECISION SUPPORT ONLY. "
            "Predictions are mathematical estimations based on hypothetical atmospheric and "
            "hydrodynamic conditions and do not represent guaranteed real-world outcomes or production incidents."
        ),
    )

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    simulation = relationship("SimulationRun", back_populates="outputs")

    def __repr__(self) -> str:
        return f"<SimulationOutput id={self.id} sim_id={self.simulation_id}>"
