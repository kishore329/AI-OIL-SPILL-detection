"""
Enums shared across models.
Defines all status, severity, and zone type values.
"""
import enum


class IncidentStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    VERIFIED = "VERIFIED"
    PRIORITIZED = "PRIORITIZED"
    ASSIGNED = "ASSIGNED"
    RESPONSE_IN_PROGRESS = "RESPONSE_IN_PROGRESS"
    CONTAINMENT = "CONTAINMENT"
    MONITORING = "MONITORING"
    RECOVERY = "RECOVERY"
    RESOLVED = "RESOLVED"


class IncidentSeverity(str, enum.Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ZoneType(str, enum.Enum):
    FISHING_ZONE = "FISHING_ZONE"
    PROTECTED_AREA = "PROTECTED_AREA"
    PORT = "PORT"
    BEACH = "BEACH"
    SHIPPING_LANE = "SHIPPING_LANE"
    COASTAL_SETTLEMENT = "COASTAL_SETTLEMENT"


class ZoneSensitivity(str, enum.Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
