"""
CleanupPlan and CleanupRecommendation ORM models — Module 15: Smart Cleanup Planner.
Provides strategic, operational decision-support recommendations for oil spill response
(booms, mechanical skimming, shoreline defense, sorbents, dispersant advice, monitoring).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class CleanupPlan(Base):
    """Overall cleanup response plan generated for an oil spill incident."""

    __tablename__ = "cleanup_plans"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    plan_code = Column(String(50), nullable=False, default=lambda: f"CP-{uuid.uuid4().hex[:8].upper()}")
    spill_size_tier = Column(String(50), nullable=False, default="TIER_2_MEDIUM")  # TIER_1_SMALL, TIER_2_MEDIUM, TIER_3_MAJOR
    oil_type = Column(String(100), nullable=False, default="HEAVY_CRUDE")
    overall_strategy = Column(String(250), nullable=False, default="OFFSHORE_CONTAINMENT_AND_RECOVERY")
    status = Column(String(50), nullable=False, default="GENERATED")  # GENERATED, ACTIVE, REVISED, ARCHIVED

    # Serialized environmental & operational context (wind, current, wave, coastal ETA, priority)
    environmental_context = Column(Text, nullable=False, default="{}")

    decision_support_disclaimer = Column(
        Text,
        nullable=False,
        default=(
            "[DECISION SUPPORT ONLY] Recommendations provide operational decision support for Incident Commanders "
            "and Coast Guard Response Teams. Does NOT constitute autonomous emergency command or dispatch authority."
        ),
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
    incident = relationship("Incident", back_populates="cleanup_plans")
    recommendations = relationship(
        "CleanupRecommendation",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="CleanupRecommendation.suitability_score.desc()",
    )

    def __repr__(self) -> str:
        return f"<CleanupPlan {self.plan_code} incident={self.incident_id} tier={self.spill_size_tier}>"


class CleanupRecommendation(Base):
    """Specific response action recommendation within a cleanup plan."""

    __tablename__ = "cleanup_recommendations"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    plan_id = Column(
        UUID(as_uuid=False),
        ForeignKey("cleanup_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Action category & title
    action = Column(String(100), nullable=False)  # CONTAINMENT_BOOM, MECHANICAL_SKIMMING, SHORELINE_PROTECTION, ABSORBENT_MATERIALS, DISPERSANT_APPLICATION, MONITORING_AND_SURVEILLANCE, SPECIALIZED_SHORELINE_CLEANUP
    action_title = Column(String(200), nullable=False)

    # Operational evaluation
    reason = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    suitability_score = Column(Float, nullable=False, default=75.0)  # 0.0 to 100.0

    # Resource requirements (JSON list of required vessel types, boom lengths, skimmer specs)
    required_resources = Column(Text, nullable=False, default="[]")

    # Operational limitations and warnings (JSON list of environmental limits e.g. wave height, current speed)
    limitations = Column(Text, nullable=False, default="[]")

    # Lifecycle approval status by human incident commander
    operational_status = Column(String(50), nullable=False, default="RECOMMENDED")  # RECOMMENDED, ACCEPTED, REJECTED, DEPLOYED
    decision_notes = Column(Text, nullable=True)

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

    # Relationship
    plan = relationship("CleanupPlan", back_populates="recommendations")

    def __repr__(self) -> str:
        return f"<CleanupRecommendation {self.action} score={self.suitability_score} status={self.operational_status}>"
