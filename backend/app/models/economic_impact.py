"""
Module 21 — Economic Damage Estimator Database Models.
Defines economic_assumptions, economic_assessments, and economic_assessment_categories.
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
    Boolean,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class EconomicAssumption(Base):
    """
    Configurable unit baseline values and disruption durations used in
    transparent economic loss modeling. Avoids hardcoding official government decrees.
    """
    __tablename__ = "economic_assumptions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )  # None indicates system-wide default template

    name = Column(String(128), nullable=False, default="INDIAN_OCEAN_COASTAL_BASELINE")
    currency = Column(String(16), nullable=False, default="INR")  # INR or USD
    exchange_rate_usd_to_inr = Column(Float, nullable=False, default=83.5)

    # 1. Cleanup cost assumptions
    cleanup_cost_per_km2 = Column(Float, nullable=False, default=1500000.0)  # INR ~₹15 Lakh per km²
    shoreline_cleanup_per_km = Column(Float, nullable=False, default=4500000.0)  # INR ~₹45 Lakh per km

    # 2. Fisheries impact assumptions
    fisheries_daily_value_per_km2 = Column(Float, nullable=False, default=95000.0)  # INR ~₹95k/km²/day
    fisheries_recovery_days_default = Column(Float, nullable=False, default=30.0)

    # 3. Tourism impact assumptions
    tourism_daily_value_per_km = Column(Float, nullable=False, default=250000.0)  # INR ~₹2.5 Lakh/km/day
    tourism_disruption_days_default = Column(Float, nullable=False, default=21.0)

    # 4. Coastal business exposure assumptions
    business_daily_loss_per_km = Column(Float, nullable=False, default=120000.0)  # INR ~₹1.2 Lakh/km/day
    business_disruption_days_default = Column(Float, nullable=False, default=14.0)

    # 5. Critical infrastructure disruption assumptions (ports, power plants, desalination)
    infrastructure_daily_loss_per_facility = Column(Float, nullable=False, default=3500000.0)  # INR ~₹35 Lakh/facility/day
    infrastructure_disruption_days_default = Column(Float, nullable=False, default=7.0)

    # 6. Other ecological/environmental remediation assumptions
    other_ecosystem_remediation_per_point = Column(Float, nullable=False, default=1200000.0)  # INR ~₹12 Lakh/biome

    is_default = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    incident = relationship("Incident", back_populates="economic_assumptions")

    def __repr__(self) -> str:
        return f"<EconomicAssumption id={self.id} name='{self.name}' currency='{self.currency}'>"


class EconomicAssessment(Base):
    """Overall economic damage assessment run for an incident."""
    __tablename__ = "economic_assessments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    currency = Column(String(16), nullable=False, default="INR")  # INR or USD
    total_estimated_amount = Column(Float, nullable=False, default=0.0)
    total_formatted = Column(String(64), nullable=False, default="₹0.0 Cr")
    confidence = Column(Float, nullable=False, default=0.85)  # 0.0 to 1.0

    # Snapshot of parameters and inputs evaluated
    assumptions_used = Column(JSON, nullable=False)
    model_name = Column(String(64), nullable=False, default="TRANSPARENT_ECONOMIC_DAMAGE_MODEL_V1")
    disclaimer = Column(
        Text,
        nullable=False,
        default=(
            "[MODEL ESTIMATE — NOT AN OFFICIAL GOVERNMENT ECONOMIC ASSESSMENT] "
            "Estimates are mathematical scenario approximations based on configurable unit parameters "
            "and environmental indicators. They do not constitute official government claims or statutory liabilities."
        ),
    )

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    incident = relationship("Incident", back_populates="economic_assessments")
    categories = relationship(
        "EconomicAssessmentCategory",
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="EconomicAssessmentCategory.estimated_amount.desc()",
    )

    def __repr__(self) -> str:
        return f"<EconomicAssessment id={self.id} total='{self.total_formatted}'>"


class EconomicAssessmentCategory(Base):
    """Itemized breakdown record for one economic sector/category."""
    __tablename__ = "economic_assessment_categories"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    assessment_id = Column(
        UUID(as_uuid=False),
        ForeignKey("economic_assessments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Categories: CLEANUP, FISHERIES, TOURISM, COASTAL_BUSINESS, INFRASTRUCTURE, OTHER_MODELED
    category = Column(String(64), nullable=False)
    category_title = Column(String(128), nullable=False)

    estimated_amount = Column(Float, nullable=False, default=0.0)
    formatted_amount = Column(String(64), nullable=False, default="₹0.0 Cr")
    currency = Column(String(16), nullable=False, default="INR")

    # Transparent calculation explanation
    calculation_formula = Column(Text, nullable=False)
    assumptions_snapshot = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=False, default=0.85)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    assessment = relationship("EconomicAssessment", back_populates="categories")

    def __repr__(self) -> str:
        return f"<EconomicAssessmentCategory {self.category} amount='{self.formatted_amount}'>"
