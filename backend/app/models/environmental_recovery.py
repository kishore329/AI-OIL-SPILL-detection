"""
Module 22 — Environmental Recovery Predictor ORM Models.
Stores baseline recovery factors, per-incident time-horizon recovery predictions (1M, 3M, 6M, 12M, 24M),
and top-level environmental recovery assessment records across Mangroves, Coral Reefs, Fisheries,
Marine Habitats, and Coastal Ecosystems.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Boolean, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class RecoveryFactor(Base):
    """
    Configurable kinetic recovery rate parameters and sensitivity baselines for ecosystems.
    Can be a system-wide baseline template (incident_id is null, is_default=True)
    or an incident-specific custom factor override.
    """
    __tablename__ = "recovery_factors"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    ecosystem_type = Column(String(100), nullable=False)  # MANGROVES, CORAL_REEFS, FISHERIES, MARINE_HABITATS, COASTAL_ECOSYSTEMS
    ecosystem_title = Column(String(200), nullable=False)

    # Base kinetic recovery coefficient k (per month)
    baseline_recovery_rate_k = Column(Float, nullable=False, default=0.10)

    # Asymptotic maximum recovery potential percentage (e.g. 95.0% for mangroves due to residual hydrocarbon persistence)
    asymptotic_max_recovery = Column(Float, nullable=False, default=95.0)

    # S-curve shape exponent (gamma > 1 introduces an initial latency lag)
    shape_exponent_gamma = Column(Float, nullable=False, default=1.1)

    # Sensitivity weighting factor (higher sensitivity slows regeneration)
    ecosystem_sensitivity_weight = Column(Float, nullable=False, default=1.0)

    # Base estimation confidence percentage (0-100)
    base_confidence = Column(Float, nullable=False, default=80.0)

    is_default = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)

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
    incident = relationship("Incident", back_populates="recovery_factors")

    def __repr__(self) -> str:
        return f"<RecoveryFactor {self.ecosystem_type} k={self.baseline_recovery_rate_k} default={self.is_default}>"


class EnvironmentalRecoveryAssessment(Base):
    """
    Top-level recovery evaluation run for a specific incident.
    Captures synthesis of cleanup effectiveness, exposure duration, and ecosystem risk.
    """
    __tablename__ = "recovery_assessments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Composite recovery index at 24 months across all analyzed habitats
    overall_recovery_index_24m = Column(Float, nullable=False, default=0.0)

    # Key inputs captured during the evaluation
    cleanup_effectiveness_applied = Column(Float, nullable=False, default=0.60)  # 0.0 to 1.0 (from CleanupPlan or default)
    ecosystem_risk_score_applied = Column(Float, nullable=False, default=50.0)    # 0.0 to 100.0 (from EcosystemRisk or default)
    exposure_duration_hours = Column(Float, nullable=False, default=24.0)
    spill_severity_tier = Column(String(50), nullable=False, default="MODERATE")

    # Habitats evaluated count
    ecosystems_evaluated_count = Column(Integer, nullable=False, default=5)

    # Overall model confidence
    confidence_percentage = Column(Float, nullable=False, default=78.0)

    # Model attribution and statutory disclaimer
    model_name = Column(String(100), nullable=False, default="ECO_RECOVERY_ASYMPTOTIC_V1")
    disclaimer = Column(
        Text,
        nullable=False,
        default=(
            "[MODEL ESTIMATE — NOT A SCIENTIFIC GUARANTEE OF RECOVERY] "
            "Recovery projections are model-based approximations synthesizing baseline ecological regeneration rates, "
            "exposure duration, and response effectiveness. Actual ecological trajectories vary with weather anomalies, "
            "secondary contamination, and biological recruitment."
        ),
    )

    # Snapshot of full trajectory data for rapid retrieval
    trajectories_summary_json = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    incident = relationship("Incident", back_populates="recovery_assessments")
    predictions = relationship(
        "RecoveryPrediction",
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="RecoveryPrediction.horizon_months.asc()",
    )

    def __repr__(self) -> str:
        return f"<EnvironmentalRecoveryAssessment incident={self.incident_id} 24m={self.overall_recovery_index_24m:.1f}%>"


class RecoveryPrediction(Base):
    """
    Itemized recovery prediction for a specific ecosystem at a specific horizon
    (1M, 3M, 6M, 12M, 24M).
    """
    __tablename__ = "recovery_predictions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    assessment_id = Column(
        UUID(as_uuid=False),
        ForeignKey("recovery_assessments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    ecosystem_type = Column(String(100), nullable=False)  # MANGROVES, CORAL_REEFS, FISHERIES, MARINE_HABITATS, COASTAL_ECOSYSTEMS
    ecosystem_title = Column(String(200), nullable=False)

    recovery_horizon = Column(String(50), nullable=False)  # 1_MONTH, 3_MONTHS, 6_MONTHS, 12_MONTHS, 24_MONTHS
    horizon_months = Column(Integer, nullable=False)       # 1, 3, 6, 12, 24

    estimated_recovery_percentage = Column(Float, nullable=False)  # 0.0 to 100.0
    confidence = Column(Float, nullable=False, default=75.0)

    # Milestone stage label e.g., "INITIAL_STABILIZATION", "EARLY_CANOPY_GROWTH", "FUNCTIONAL_EQUILIBRIUM"
    milestone_status = Column(String(100), nullable=False, default="REGENERATION_IN_PROGRESS")

    # Transparent assumptions & calculation parameters snapshot
    assumptions = Column(JSON, nullable=False, default=dict)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    assessment = relationship("EnvironmentalRecoveryAssessment", back_populates="predictions")
    incident = relationship("Incident", back_populates="recovery_predictions")

    def __repr__(self) -> str:
        return f"<RecoveryPrediction {self.ecosystem_type} {self.horizon_months}M -> {self.estimated_recovery_percentage:.1f}%>"
