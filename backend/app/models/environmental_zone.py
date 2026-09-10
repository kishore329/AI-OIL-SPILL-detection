"""
EnvironmentalZone ORM model — no GeoAlchemy2 dependency.
Geometry stored as GeoJSON text.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Enum as SAEnum, Text, Float
from sqlalchemy.dialects.postgresql import UUID

from app.database.session import Base
from app.models.enums import ZoneType, ZoneSensitivity


def _uuid() -> str:
    return str(uuid.uuid4())


class EnvironmentalZone(Base):
    __tablename__ = "environmental_zones"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    name = Column(String(200), nullable=False)
    zone_type = Column(
        SAEnum(ZoneType, name="zone_type_enum", create_type=True),
        nullable=False,
        index=True,
    )
    sensitivity = Column(
        SAEnum(ZoneSensitivity, name="zone_sensitivity_enum", create_type=True),
        nullable=False,
        default=ZoneSensitivity.MODERATE,
    )

    # Centroid for quick proximity checks
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Polygon GeoJSON
    geometry_geojson = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<EnvironmentalZone {self.name} [{self.zone_type}]>"
