"""
Master Multi-Source Verification Service.
"""
from typing import Optional, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.verification import VerificationSource, VerificationRecord, VerificationEvidence
from app.services.multi_source_verification.base_provider import EvidencePayload
from app.services.multi_source_verification.providers import ALL_PROVIDERS
from app.services.multi_source_verification.verification_engine import MultiSourceVerificationEngine
from app.schemas.verification import VerificationResponse, VerificationEvidenceItem, VerificationSourceItem


class MultiSourceVerificationService:
    """
    Coordinates evidence collection, score evaluation, DB persistence,
    incident status updates, and audit trail logging.
    """
    
    DEFAULT_SOURCES = [
        {"code": "SATELLITE", "name": "AI Satellite Detection", "default_weight": 0.30, "description": "Synthetic Aperture Radar (SAR) and optical satellite anomaly processing"},
        {"code": "DRONE", "name": "Drone Surveillance Imagery", "default_weight": 0.20, "description": "UAV aerial recon footage and thermal multispectral inspection"},
        {"code": "CITIZEN_REPORT", "name": "Citizen & Eyewitness Reports", "default_weight": 0.15, "description": "Coastal resident, maritime pilot, and fishermen spotter reports"},
        {"code": "AIS_VESSEL", "name": "AIS Vessel Traffic Context", "default_weight": 0.15, "description": "AIS track trajectory overlap, vessel speed anomalies, and discharge proximity"},
        {"code": "METOCEAN_CONTEXT", "name": "Weather & Metocean Conditions", "default_weight": 0.20, "description": "INCOIS buoy telemetry, wind speed, wave damping, and surface current convergence"},
    ]

    def __init__(self):
        self.engine = MultiSourceVerificationEngine()

    def seed_sources_if_needed(self, db: Session):
        """Ensure standard verification sources exist in the database."""
        existing_count = db.query(VerificationSource).count()
        if existing_count == 0:
            for s in self.DEFAULT_SOURCES:
                source = VerificationSource(
                    code=s["code"],
                    name=s["name"],
                    default_weight=s["default_weight"],
                    description=s["description"],
                    is_active=True,
                )
                db.add(source)
            db.commit()

    def get_available_sources(self, db: Session) -> list[VerificationSourceItem]:
        self.seed_sources_if_needed(db)
        sources = db.query(VerificationSource).filter(VerificationSource.is_active == True).all()
        return [VerificationSourceItem.model_validate(s) for s in sources]

    def evaluate_incident_verification(
        self,
        db: Session,
        incident_id: str,
        custom_weights: Optional[dict[str, float]] = None,
        force_recalculate: bool = True
    ) -> VerificationResponse:
        self.seed_sources_if_needed(db)

        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident with ID '{incident_id}' not found.")

        # Check existing verification record if force_recalculate is False
        existing_record = (
            db.query(VerificationRecord)
            .filter(VerificationRecord.incident_id == incident_id)
            .first()
        )

        # Gather evidence from automated providers
        collected_evidence: list[EvidencePayload] = []
        for provider in ALL_PROVIDERS:
            try:
                payload = provider.collect_evidence(incident, db)
                collected_evidence.append(payload)
            except Exception as e:
                print(f"[VerificationService] Error collecting evidence from {provider.source_code}: {e}")

        # Preserve any existing custom submitted evidence items from DB
        if existing_record:
            existing_db_items = db.query(VerificationEvidence).filter(
                VerificationEvidence.verification_record_id == existing_record.id
            ).all()
            auto_types = {p.evidence_type for p in collected_evidence}
            for item in existing_db_items:
                if item.evidence_type not in auto_types or "MANUAL" in item.evidence_type:
                    collected_evidence.append(
                        EvidencePayload(
                            source_code=item.source_code,
                            provider_name=item.provider_name,
                            confidence=item.confidence,
                            evidence_type=item.evidence_type,
                            agrees_with_spill=item.agrees_with_spill,
                            quality_score=item.quality_score,
                            data_origin=item.data_origin,
                            evidence_metadata=item.evidence_metadata,
                            notes=item.notes,
                        )
                    )

        # Execute core verification engine
        eval_result = self.engine.evaluate(collected_evidence, custom_weights=custom_weights)

        # Upsert VerificationRecord
        if existing_record:
            rec = existing_record
            rec.overall_confidence = eval_result.overall_confidence
            rec.decision = eval_result.decision
            rec.cross_source_agreement_score = eval_result.agreement_score
            rec.contradiction_detected = eval_result.contradiction_detected
            rec.explanation = eval_result.explanation
            rec.verified_by = "Verification Engine"
            rec.verified_at = datetime.now(timezone.utc)
            rec.updated_at = datetime.now(timezone.utc)
        else:
            rec = VerificationRecord(
                incident_id=incident_id,
                overall_confidence=eval_result.overall_confidence,
                decision=eval_result.decision,
                cross_source_agreement_score=eval_result.agreement_score,
                contradiction_detected=eval_result.contradiction_detected,
                explanation=eval_result.explanation,
                verified_by="Verification Engine",
                verified_at=datetime.now(timezone.utc),
            )
            db.add(rec)
            db.flush()

        # Re-populate VerificationEvidence DB records
        db.query(VerificationEvidence).filter(
            VerificationEvidence.verification_record_id == rec.id
        ).delete()

        evidence_items_db = []
        for ev in eval_result.evaluated_evidence:
            ev_db = VerificationEvidence(
                verification_record_id=rec.id,
                source_code=ev["source_code"],
                provider_name=ev["provider_name"],
                confidence=ev["confidence"],
                weight_applied=ev["weight_applied"],
                quality_score=ev["quality_score"],
                data_origin=ev["data_origin"],
                evidence_type=ev["evidence_type"],
                agrees_with_spill=ev["agrees_with_spill"],
                evidence_metadata=ev["evidence_metadata"],
                notes=ev["notes"],
                timestamp=datetime.now(timezone.utc),
            )
            db.add(ev_db)
            evidence_items_db.append(ev_db)

        # Sync Incident lifecycle status
        if eval_result.decision == "VERIFIED" and incident.status == "DETECTED":
            incident.status = "VERIFIED"
            incident.updated_at = datetime.now(timezone.utc)
        elif eval_result.decision == "REJECTED" and incident.status == "DETECTED":
            incident.status = "REJECTED"
            incident.updated_at = datetime.now(timezone.utc)

        # Log IncidentEvent audit entry
        evt_desc = (
            f"Multi-source verification evaluated score: {round(eval_result.overall_confidence * 100, 1)}% "
            f"— Decision: {eval_result.decision}. ({len(collected_evidence)} sources cross-referenced)."
        )
        evt = IncidentEvent(
            incident_id=incident_id,
            event_type="VERIFICATION_EVALUATED",
            description=evt_desc,
            created_by="Verification Engine",
        )
        db.add(evt)
        db.commit()
        db.refresh(rec)

        return self._build_verification_response(db, incident, rec)

    def add_custom_evidence(
        self,
        db: Session,
        incident_id: str,
        evidence_data: dict[str, Any]
    ) -> VerificationResponse:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident '{incident_id}' not found.")

        rec = (
            db.query(VerificationRecord)
            .filter(VerificationRecord.incident_id == incident_id)
            .first()
        )
        if not rec:
            # Trigger initial evaluation first
            self.evaluate_incident_verification(db, incident_id)
            rec = db.query(VerificationRecord).filter(VerificationRecord.incident_id == incident_id).first()

        new_ev = VerificationEvidence(
            verification_record_id=rec.id,
            source_code=evidence_data.get("source_code", "CITIZEN_REPORT"),
            provider_name=evidence_data.get("provider_name", "External Observer"),
            confidence=max(0.0, min(1.0, float(evidence_data.get("confidence", 0.80)))),
            weight_applied=0.15,
            quality_score=max(0.0, min(1.0, float(evidence_data.get("quality_score", 1.0)))),
            data_origin=evidence_data.get("data_origin", "SIMULATED"),
            evidence_type=evidence_data.get("evidence_type", "MANUAL_SUBMISSION"),
            agrees_with_spill=bool(evidence_data.get("agrees_with_spill", True)),
            evidence_metadata=evidence_data.get("evidence_metadata") or {},
            notes=evidence_data.get("notes"),
            timestamp=datetime.now(timezone.utc),
        )
        db.add(new_ev)

        # Audit log
        evt = IncidentEvent(
            incident_id=incident_id,
            event_type="EVIDENCE_ADDED",
            description=f"New evidence added from source '{new_ev.source_code}' ({new_ev.provider_name}) with confidence {round(new_ev.confidence * 100, 1)}%.",
            created_by="Operator",
        )
        db.add(evt)
        db.commit()

        # Re-evaluate verification record
        return self.evaluate_incident_verification(db, incident_id)

    def override_verification_decision(
        self,
        db: Session,
        incident_id: str,
        new_decision: str,
        decision_notes: str,
        operator_name: str = "Incident Commander"
    ) -> VerificationResponse:
        if new_decision not in ("VERIFIED", "NEEDS_REVIEW", "REJECTED"):
            raise ValueError("Decision must be one of: VERIFIED, NEEDS_REVIEW, REJECTED")

        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident '{incident_id}' not found.")

        rec = (
            db.query(VerificationRecord)
            .filter(VerificationRecord.incident_id == incident_id)
            .first()
        )
        if not rec:
            self.evaluate_incident_verification(db, incident_id)
            rec = db.query(VerificationRecord).filter(VerificationRecord.incident_id == incident_id).first()

        old_decision = rec.decision
        rec.decision = new_decision
        rec.explanation = f"[MANUAL OVERRIDE] Decision changed from {old_decision} to {new_decision} by {operator_name}. Remarks: {decision_notes}"
        rec.verified_by = operator_name
        rec.verified_at = datetime.now(timezone.utc)
        rec.updated_at = datetime.now(timezone.utc)

        # Sync Incident lifecycle
        if new_decision == "VERIFIED" and incident.status in ("DETECTED", "NEEDS_REVIEW"):
            incident.status = "VERIFIED"
        elif new_decision == "REJECTED":
            incident.status = "REJECTED"
        incident.updated_at = datetime.now(timezone.utc)

        # Audit Log
        evt = IncidentEvent(
            incident_id=incident_id,
            event_type="VERIFICATION_OVERRIDDEN",
            description=f"Commander OVERRODE verification status to '{new_decision}'. Remarks: \"{decision_notes}\"",
            created_by=operator_name,
        )
        db.add(evt)
        db.commit()
        db.refresh(rec)

        return self._build_verification_response(db, incident, rec)

    def get_incident_verification(self, db: Session, incident_id: str) -> VerificationResponse:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident '{incident_id}' not found.")

        rec = (
            db.query(VerificationRecord)
            .filter(VerificationRecord.incident_id == incident_id)
            .first()
        )
        if not rec:
            return self.evaluate_incident_verification(db, incident_id)

        return self._build_verification_response(db, incident, rec)

    def _build_verification_response(
        self,
        db: Session,
        incident: Incident,
        rec: VerificationRecord
    ) -> VerificationResponse:
        evidence_db = (
            db.query(VerificationEvidence)
            .filter(VerificationEvidence.verification_record_id == rec.id)
            .order_by(VerificationEvidence.created_at.desc())
            .all()
        )

        evidence_items = [
            VerificationEvidenceItem(
                id=ev.id,
                source_code=ev.source_code,
                provider_name=ev.provider_name,
                confidence=ev.confidence,
                weight_applied=ev.weight_applied,
                quality_score=ev.quality_score,
                data_origin=ev.data_origin,
                evidence_type=ev.evidence_type,
                agrees_with_spill=ev.agrees_with_spill,
                evidence_metadata=ev.evidence_metadata,
                notes=ev.notes,
                timestamp=ev.timestamp.isoformat() if ev.timestamp else datetime.now(timezone.utc).isoformat(),
            )
            for ev in evidence_db
        ]

        sources = self.get_available_sources(db)
        weights_summary = {ev.source_code: ev.weight_applied for ev in evidence_db}

        return VerificationResponse(
            incident_id=incident.id,
            incident_code=incident.incident_code or incident.id[:8],
            incident_severity=incident.severity.value if hasattr(incident.severity, "value") else str(incident.severity or "UNKNOWN"),
            overall_confidence_score=round(rec.overall_confidence * 100, 1),
            decision=rec.decision,
            cross_source_agreement_pct=round(rec.cross_source_agreement_score * 100, 1),
            contradiction_detected=rec.contradiction_detected,
            decision_rationale=rec.explanation or "Multi-source evidence consensus evaluated.",
            verified_by=rec.verified_by or "Verification Engine",
            verified_at=rec.verified_at.isoformat() if rec.verified_at else datetime.now(timezone.utc).isoformat(),
            sources_evaluated_count=len(evidence_db),
            weights_summary=weights_summary,
            evidence_breakdown=evidence_items,
            available_sources=sources,
        )
