"""
MovementPredictionService — Coordinates drift forecasting, persistence, and audit logging.
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.movement_prediction import MovementPrediction
from app.schemas.movement import (
    MovementPredictionRequest,
    MovementPredictionResponse,
    MovementHistoryItem,
    EnvironmentalConditions,
    ForecastPoint,
)
from app.services.movement_prediction.demo_provider import DemoMovementPredictionProvider
from app.services.movement_prediction.physics_provider import LagrangianPhysicsProvider


class MovementPredictionService:
    @staticmethod
    def _to_response(
        pred: MovementPrediction,
        incident_code: str,
        origin_lat: float,
        origin_lon: float,
        origin_area: float,
    ) -> MovementPredictionResponse:
        """Converts a MovementPrediction ORM instance into Pydantic response."""
        points = []
        if pred.forecast_points_json:
            try:
                raw_pts = json.loads(pred.forecast_points_json)
                points = [ForecastPoint(**p) for p in raw_pts]
            except Exception:
                pass

        env = EnvironmentalConditions(
            wind_speed_ms=pred.wind_speed_ms or 7.0,
            wind_direction_deg=pred.wind_direction_deg or 220.0,
            current_speed_ms=pred.current_speed_ms or 0.45,
            current_direction_deg=pred.current_direction_deg or 65.0,
            water_temp_c=pred.water_temp_c or 26.5,
            wave_height_m=pred.wave_height_m or 1.2,
        )

        return MovementPredictionResponse(
            id=pred.id,
            incident_id=pred.incident_id,
            incident_code=incident_code,
            prediction_time=pred.prediction_time.isoformat() if pred.prediction_time else datetime.now(timezone.utc).isoformat(),
            forecast_horizon_hours=pred.forecast_horizon_hours,
            origin_latitude=origin_lat,
            origin_longitude=origin_lon,
            origin_area_km2=origin_area,
            environmental_conditions=env,
            forecast_points=points,
            trajectory_geojson=pred.predicted_trajectory_geojson,
            predicted_positions_geojson=pred.predicted_positions_geojson,
            uncertainty_corridor_geojson=pred.uncertainty_corridor_geojson,
            model_name=pred.model_name,
            confidence=pred.confidence,
            is_simulated=pred.is_simulated,
            disclaimer="[PROTOTYPE ESTIMATE] Deterministic Lagrangian trajectory model combining windage and ocean current advection.",
            created_at=pred.created_at.isoformat() if pred.created_at else datetime.now(timezone.utc).isoformat(),
        )

    @classmethod
    def get_latest_prediction(
        cls,
        db: Session,
        incident_id: str,
    ) -> MovementPredictionResponse:
        """Fetches the latest prediction for an incident, or computes a new one if none exists."""
        # Query incident by ID or incident_code
        incident = db.execute(
            select(Incident).where(Incident.incident_code == incident_id)
        ).scalar_one_or_none()

        if not incident:
            try:
                import uuid
                uuid.UUID(incident_id)
                incident = db.get(Incident, incident_id)
            except (ValueError, TypeError):
                incident = None

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        # Check DB for existing prediction
        latest_pred = db.execute(
            select(MovementPrediction)
            .where(MovementPrediction.incident_id == incident.id)
            .order_by(MovementPrediction.created_at.desc())
        ).scalars().first()

        if latest_pred:
            return cls._to_response(
                latest_pred,
                incident_code=incident.incident_code,
                origin_lat=incident.latitude or 18.5,
                origin_lon=incident.longitude or 72.5,
                origin_area=incident.spill_area_km2 or 10.0,
            )

        # If none exists, run initial prediction
        return cls.run_prediction(
            db=db,
            incident_id=incident.id,
            payload=MovementPredictionRequest(),
        )

    @classmethod
    def run_prediction(
        cls,
        db: Session,
        incident_id: str,
        payload: MovementPredictionRequest,
    ) -> MovementPredictionResponse:
        """Executes a new trajectory prediction, persists to DB, and logs audit event."""
        incident = db.execute(
            select(Incident).where(Incident.incident_code == incident_id)
        ).scalar_one_or_none()

        if not incident:
            try:
                import uuid
                uuid.UUID(incident_id)
                incident = db.get(Incident, incident_id)
            except (ValueError, TypeError):
                incident = None

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        origin_lat = incident.latitude or 18.5
        origin_lon = incident.longitude or 72.5
        origin_area = incident.spill_area_km2 or 10.0
        det_time = incident.detected_at or datetime.now(timezone.utc)

        # Choose provider: if custom inputs given, use physics provider directly; else use demo provider
        has_custom_inputs = any(
            x is not None for x in [
                payload.wind_speed_ms,
                payload.wind_direction_deg,
                payload.current_speed_ms,
                payload.current_direction_deg,
            ]
        )

        if has_custom_inputs:
            provider = LagrangianPhysicsProvider()
        else:
            provider = DemoMovementPredictionProvider()

        drift_result = provider.predict(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            spill_area_km2=origin_area,
            detection_time=det_time,
            wind_speed_ms=payload.wind_speed_ms,
            wind_direction_deg=payload.wind_direction_deg,
            current_speed_ms=payload.current_speed_ms,
            current_direction_deg=payload.current_direction_deg,
            forecast_horizon_hours=payload.forecast_horizon_hours or 24.0,
        )

        # Create MovementPrediction record
        pred_record = MovementPrediction(
            incident_id=incident.id,
            prediction_time=datetime.now(timezone.utc),
            forecast_horizon_hours=payload.forecast_horizon_hours or 24.0,
            origin_geometry_geojson=incident.location_geojson,
            predicted_trajectory_geojson=drift_result.trajectory_geojson,
            predicted_positions_geojson=drift_result.predicted_positions_geojson,
            uncertainty_corridor_geojson=drift_result.uncertainty_corridor_geojson,
            wind_speed_ms=drift_result.environmental_conditions.get("wind_speed_ms"),
            wind_direction_deg=drift_result.environmental_conditions.get("wind_direction_deg"),
            current_speed_ms=drift_result.environmental_conditions.get("current_speed_ms"),
            current_direction_deg=drift_result.environmental_conditions.get("current_direction_deg"),
            water_temp_c=drift_result.environmental_conditions.get("water_temp_c", 26.5),
            wave_height_m=drift_result.environmental_conditions.get("wave_height_m", 1.2),
            model_name=drift_result.model_name,
            confidence=drift_result.confidence,
            is_simulated=drift_result.is_simulated,
            forecast_points_json=json.dumps(drift_result.forecast_points),
        )
        db.add(pred_record)

        # Log audit event
        last_pt = drift_result.forecast_points[-1] if drift_result.forecast_points else None
        disp_summary = f"{last_pt['distance_km']} km {last_pt['bearing_cardinal']}" if last_pt else "24h trajectory"
        audit_event = IncidentEvent(
            incident_id=incident.id,
            event_type="MOVEMENT_PREDICTION_GENERATED",
            description=f"[Module 11] +{int(payload.forecast_horizon_hours or 24)}h movement forecast generated. Net displacement: {disp_summary} (Model: {drift_result.model_name}).",
            created_by="Autonomous Drift Engine (Module 11)",
        )
        db.add(audit_event)
        db.commit()
        db.refresh(pred_record)

        return cls._to_response(
            pred_record,
            incident_code=incident.incident_code,
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            origin_area=origin_area,
        )

    @classmethod
    def get_prediction_history(
        cls,
        db: Session,
        incident_id: str,
    ) -> list[MovementHistoryItem]:
        """Returns historical prediction runs for an incident."""
        incident = db.execute(
            select(Incident).where(Incident.incident_code == incident_id)
        ).scalar_one_or_none()

        if not incident:
            try:
                import uuid
                uuid.UUID(incident_id)
                incident = db.get(Incident, incident_id)
            except (ValueError, TypeError):
                incident = None

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        rows = db.execute(
            select(MovementPrediction)
            .where(MovementPrediction.incident_id == incident.id)
            .order_by(MovementPrediction.created_at.desc())
        ).scalars().all()

        return [
            MovementHistoryItem(
                id=r.id,
                prediction_time=r.prediction_time.isoformat() if r.prediction_time else "",
                forecast_horizon_hours=r.forecast_horizon_hours,
                model_name=r.model_name,
                confidence=r.confidence,
                wind_speed_ms=r.wind_speed_ms,
                current_speed_ms=r.current_speed_ms,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
            for r in rows
        ]
