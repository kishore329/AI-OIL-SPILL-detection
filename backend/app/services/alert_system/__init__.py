"""
Module 23 — Smart Alert and Restriction System Service Package.
"""
from app.services.alert_system.service import (
    seed_default_rules,
    evaluate_incident_alerts,
    get_alerts,
    get_alert_by_id,
    acknowledge_alert,
    confirm_restriction,
    get_alert_rules,
    update_alert_rule,
)

__all__ = [
    "seed_default_rules",
    "evaluate_incident_alerts",
    "get_alerts",
    "get_alert_by_id",
    "acknowledge_alert",
    "confirm_restriction",
    "get_alert_rules",
    "update_alert_rule",
]
