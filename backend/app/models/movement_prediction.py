"""
MovementPrediction ORM model — Module 11: Oil Spill Movement Predictor.
Stores calculated drift trajectory paths, forecast milestone positions (+1h, +3h, +6h, +12h, +24h),
environmental conditions, and uncertainty confidence corridors.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class MovementPrediction(Base):
    __tablename__ = "movement_predictions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Forecast execution timestamp and total time horizon (default 24 hours)
    prediction_time = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    forecast_horizon_hours = Column(Float, nullable=False, default=24.0)

    # Geometry fields stored as GeoJSON text (PostGIS upgrade ready)
    origin_geometry_geojson = Column(Text, nullable=True)          # Point / MultiPolygon origin
    predicted_trajectory_geojson = Column(Text, nullable=True)     # LineString path
    predicted_positions_geojson = Column(Text, nullable=True)      # FeatureCollection of milestone points (+1h, +3h, +6h, +12h, +24h)
    uncertainty_corridor_geojson = Column(Text, nullable=True)     # Polygon envelope

    # Meteorological & Oceanographic Inputs
    wind_speed_ms = Column(Float, nullable=True)
    wind_direction_deg = Column(Float, nullable=True)
    current_speed_ms = Column(Float, nullable=True)
    current_direction_deg = Column(Float, nullable=True)
    water_temp_c = Column(Float, nullable=True, default=26.5)
    wave_height_m = Column(Float, nullable=True, default=1.2)

    # Model & Confidence Metadata
    model_name = Column(String(100), nullable=False, default="PROTOTYPE_LAGRANGIAN_DRIFT")
    confidence = Column(Float, nullable=False, default=0.85)
    is_simulated = Column(Boolean, nullable=False, default=True)

    # Serialized JSON array of structured hourly forecast metrics
    forecast_points_json = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    incident = relationship("Incident", back_populates="movement_predictions")

    def __repr__(self) -> str:
        return f"<MovementPrediction id={self.id} incident={self.incident_id} horizon={self.forecast_horizon_hours}h>"
