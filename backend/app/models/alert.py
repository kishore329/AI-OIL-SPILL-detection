"""
Module 23 — Smart Alert and Restriction System ORM Models.
Stores intelligent alerts, configurable trigger rules, notification recipients,
and alert audit events across Risk, Priority, Movement, Coastal Impact, and Ecosystem domains.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Alert(Base):
    """
    Intelligent system alert generated for an oil spill incident.
    Demarcates SYSTEM ALERT vs RECOMMENDED RESTRICTION vs OPERATOR CONFIRMED ACTION.
    """
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 8 Standard Alert Types
    # CRITICAL_SPILL_ALERT, COASTAL_WARNING, FISHING_WARNING, VESSEL_WARNING,
    # PORT_WARNING, PROTECTED_AREA_WARNING, RESPONSE_TEAM_ALERT, COMMUNITY_ALERT
    alert_type = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW

    title = Column(String(250), nullable=False)
    message = Column(Text, nullable=False)
    trigger = Column(String(200), nullable=False)  # e.g., "RISK_EXCEEDED_76", "FISHING_IMPACT_UNDER_6H"

    # Restriction recommendation details (Distinct from legally binding actions)
    recommended_restriction = Column(Text, nullable=True)  # e.g., "Review temporary 5nm fishing restriction"
    restriction_type = Column(String(100), nullable=True)   # FISHING_RESTRICTION, PORT_TRAFFIC_SUSPENSION, BEACH_CLOSURE, VESSEL_EXCLUSION
    # Status of restriction: RECOMMENDED, OPERATOR_CONFIRMED, OPERATOR_REJECTED, NOT_APPLICABLE
    restriction_status = Column(String(50), nullable=False, default="RECOMMENDED")

    # Overall alert status: ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED
    status = Column(String(50), nullable=False, default="ACTIVE", index=True)

    # Contextual spatial / temporal targets
    target_location = Column(String(200), nullable=True)
    target_asset_type = Column(String(50), nullable=True)  # FISHING_ZONE, PORT, BEACH, PROTECTED_AREA, MARINE_SANCTUARY
    eta_hours = Column(Float, nullable=True)

    # Operator interaction tracking
    acknowledged_by = Column(String(100), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    confirmed_by = Column(String(100), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    operator_notes = Column(Text, nullable=True)

    # Rule reference
    rule_code = Column(String(100), nullable=True)

    # Metadata & contextual snapshot
    context_snapshot = Column(JSON, nullable=False, default=dict)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    incident = relationship("Incident", back_populates="alerts")
    recipients = relationship(
        "AlertRecipient",
        back_populates="alert",
        cascade="all, delete-orphan",
    )
    events = relationship(
        "AlertEvent",
        back_populates="alert",
        cascade="all, delete-orphan",
        order_by="AlertEvent.created_at.asc()",
    )

    def __repr__(self) -> str:
        return f"<Alert {self.alert_type} [{self.severity}/{self.status}] incident={self.incident_id}>"


class AlertRule(Base):
    """
    Configurable evaluation rules that trigger alerts based on telemetry metrics.
    """
    __tablename__ = "alert_rules"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    rule_code = Column(String(100), unique=True, nullable=False, index=True)
    rule_name = Column(String(200), nullable=False)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False, default="HIGH")

    # Evaluation condition: metric (e.g. risk_score, fishing_eta_hours), operator (>=, <=), threshold_value
    condition_metric = Column(String(100), nullable=False)
    operator = Column(String(20), nullable=False, default=">=")  # >=, <=, ==, <, >
    threshold_value = Column(Float, nullable=False)

    template_title = Column(String(250), nullable=False)
    template_message = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=True)
    restriction_type = Column(String(100), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
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

    def __repr__(self) -> str:
        return f"<AlertRule {self.rule_code} {self.condition_metric} {self.operator} {self.threshold_value}>"


class AlertRecipient(Base):
    """
    Routing log detailing which agencies, authorities, or channels received the alert.
    """
    __tablename__ = "alert_recipients"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    alert_id = Column(
        UUID(as_uuid=False),
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # e.g., COAST_GUARD_MRCC, STATE_FISHERIES_DEPT, PORT_TRAFFIC_MANAGEMENT, LOCAL_COASTAL_ADMIN
    recipient_group = Column(String(100), nullable=False)
    channel = Column(String(50), nullable=False, default="IN_APP_POPUP")  # IN_APP_POPUP, NAVTEX_BROADCAST, VHF_RADIO, SMS_GATEWAY
    delivery_status = Column(String(50), nullable=False, default="DELIVERED")  # PENDING, DELIVERED, FAILED
    dispatched_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    alert = relationship("Alert", back_populates="recipients")

    def __repr__(self) -> str:
        return f"<AlertRecipient {self.recipient_group} via {self.channel}>"


class AlertEvent(Base):
    """
    Audit log tracking lifecycle transitions, acknowledgments, and operator confirmed actions for an alert.
    """
    __tablename__ = "alert_events"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    alert_id = Column(
        UUID(as_uuid=False),
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    incident_id = Column(
        UUID(as_uuid=False),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # e.g., TRIGGERED, ACKNOWLEDGED, RESTRICTION_CONFIRMED, RESTRICTION_REJECTED, RESOLVED, DISMISSED
    event_type = Column(String(100), nullable=False)
    operator_name = Column(String(100), nullable=True, default="System")
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    alert = relationship("Alert", back_populates="events")

    def __repr__(self) -> str:
        return f"<AlertEvent {self.event_type} alert={self.alert_id} by {self.operator_name}>"
