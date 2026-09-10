"""
Resource Allocation Service — Module 16.
Manages coastal response equipment inventory, incident assignments,
lifecycle status updates, and timeline audit logging.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.models.emergency_vessel import ResponseResource, EmergencyVessel
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.cleanup_plan import CleanupPlan
from app.models.resource_allocation import ResourceAssignment, ResourceStatusHistory
from app.schemas.resource_allocation import (
    ResourceItem,
    ResourceListResponse,
    ResourceCategoryCount,
    ResourceAssignmentItem,
    RecommendedResourceItem,
    IncidentResourcesResponse,
    ResourceAssignRequest,
    AssignmentStatusUpdateRequest,
    ResourceStatusUpdateRequest,
    AllocationFactors,
)
from app.services.resource_allocation.scoring_engine import ResourceAllocationEngine


DEFAULT_SEED_RESOURCES = [
    # ── 1. Response Vessels ──────────────────────────────────
    {
        "id": "res-vsl-prahari",
        "name": "ICGS Samudra Prahari",
        "resource_type": "POLLUTION_RESPONSE_VESSEL",
        "resource_category": "RESPONSE_VESSEL",
        "quantity": 1.0,
        "unit": "vessel",
        "status": "AVAILABLE",
        "latitude": 13.083,
        "longitude": 80.297,
        "location_name": "Chennai Coast Guard Base",
        "capabilities_json": json.dumps(["BOOM_DEPLOYMENT", "OIL_SKIMMING", "DISPERSANT_SPRAY", "COMMAND_CONTROL"]),
        "mobilization_time_hours": 0.5,
        "speed_knots": 21.0,
        "contact_lead": "Commandant R. K. Sharma",
        "cost_per_hour": 15000.0,
        "description": "95m dedicated Pollution Control Vessel equipped with dynamic positioning, sweeper arms, and 300m³/h recovery skimmer.",
    },
    {
        "id": "res-vsl-paheredar",
        "name": "ICGS Samudra Paheredar",
        "resource_type": "POLLUTION_RESPONSE_VESSEL",
        "resource_category": "RESPONSE_VESSEL",
        "quantity": 1.0,
        "unit": "vessel",
        "status": "AVAILABLE",
        "latitude": 17.686,
        "longitude": 83.218,
        "location_name": "Visakhapatnam Naval Yard",
        "capabilities_json": json.dumps(["BOOM_DEPLOYMENT", "OIL_SKIMMING", "HIGH_SEAS_RECOVERY", "FIRE_FIGHTING"]),
        "mobilization_time_hours": 0.5,
        "speed_knots": 20.5,
        "contact_lead": "Commandant A. Verma",
        "cost_per_hour": 14500.0,
        "description": "Sister vessel with side-mounted recovery sweeps, inflatable oil bladders, and high-pressure chemical spray boom arms.",
    },
    {
        "id": "res-vsl-varaha",
        "name": "ICGS Varaha (OPV-41)",
        "resource_type": "OFFSHORE_PATROL_VESSEL",
        "resource_category": "RESPONSE_VESSEL",
        "quantity": 1.0,
        "unit": "vessel",
        "status": "AVAILABLE",
        "latitude": 13.085,
        "longitude": 80.301,
        "location_name": "Chennai Port Trust",
        "capabilities_json": json.dumps(["BOOM_TOWING", "AERIAL_RECON_PLATFORM", "SURVEILLANCE"]),
        "mobilization_time_hours": 1.0,
        "speed_knots": 24.0,
        "contact_lead": "Lt. Cdr. S. Nair",
        "cost_per_hour": 9500.0,
        "description": "Offshore Patrol Vessel with helicopter deck, high-speed interception, and medium pollution mitigation kit.",
    },

    # ── 2. Skimmer Vessels ──────────────────────────────────
    {
        "id": "res-skm-chn-01",
        "name": "Chennai Port Heavy Skimmer Unit 1",
        "resource_type": "SKIMMER_BARGE",
        "resource_category": "SKIMMER_VESSEL",
        "quantity": 2.0,
        "unit": "skimmer units",
        "status": "AVAILABLE",
        "latitude": 13.090,
        "longitude": 80.292,
        "location_name": "Chennai Harbor Basin",
        "capabilities_json": json.dumps(["OIL_SKIMMING", "WEIR_SKIMMING", "OLEOPHILIC_BRUSH", "DEBRIS_HANDLING"]),
        "mobilization_time_hours": 0.75,
        "speed_knots": 12.0,
        "contact_lead": "Port Marine Engineer V. Krishnan",
        "cost_per_hour": 6000.0,
        "description": "Twin heavy-duty oleophilic brush skimmers (total throughput: 350 m³/h) for thick and emulsified oil extraction.",
    },
    {
        "id": "res-skm-enn-02",
        "name": "Ennore Marine Skimmer Catamaran",
        "resource_type": "FAST_SKIMMER_CATAMARAN",
        "resource_category": "SKIMMER_VESSEL",
        "quantity": 1.0,
        "unit": "catamaran",
        "status": "AVAILABLE",
        "latitude": 13.262,
        "longitude": 80.334,
        "location_name": "Kamarajar Port Ennore",
        "capabilities_json": json.dumps(["SHALLOW_WATER_SKIMMING", "RAPID_SHEEN_EXTRACTION"]),
        "mobilization_time_hours": 0.5,
        "speed_knots": 16.0,
        "contact_lead": "Harbor Pilot D. Murugan",
        "cost_per_hour": 4500.0,
        "description": "Shallow-draft catamaran skimmer with dynamic bow collection chamber, ideal for nearshore and port approaches.",
    },

    # ── 3. Containment Booms ──────────────────────────────────
    {
        "id": "res-boom-chn-deep",
        "name": "Chennai 1,500m Heavy Ocean Inflatable Boom",
        "resource_type": "OFFSHORE_INFLATABLE_BOOM",
        "resource_category": "CONTAINMENT_BOOM",
        "quantity": 1500.0,
        "unit": "meters",
        "status": "AVAILABLE",
        "latitude": 13.084,
        "longitude": 80.295,
        "location_name": "Coast Guard Depot Chennai",
        "capabilities_json": json.dumps(["BOOM_DEPLOYMENT", "OFFSHORE_CONTAINMENT", "J_FORMATION_TOWING"]),
        "mobilization_time_hours": 1.0,
        "speed_knots": 0.0,
        "contact_lead": "Depot Officer T. Balaji",
        "cost_per_hour": 2500.0,
        "description": "Heavy-duty offshore curtain boom with 1.8m draft/freeboard rating, suitable for open sea conditions up to wave height 2.0m.",
    },
    {
        "id": "res-boom-enn-deflect",
        "name": "Ennore Coastal Deflection & Exclusion Boom",
        "resource_type": "SHORE_SEAL_BOOM",
        "resource_category": "CONTAINMENT_BOOM",
        "quantity": 2000.0,
        "unit": "meters",
        "status": "AVAILABLE",
        "latitude": 13.255,
        "longitude": 80.328,
        "location_name": "Ennore Thermal Power Plant Depot",
        "capabilities_json": json.dumps(["SHORELINE_PROTECTION", "EXCLUSION_BOOM", "TIDAL_SEALING"]),
        "mobilization_time_hours": 0.5,
        "speed_knots": 0.0,
        "contact_lead": "Safety Manager S. Ramaswamy",
        "cost_per_hour": 1800.0,
        "description": "Shore-seal amphibious boom with triple water ballast tubes designed to protect estuary creeks, power station intakes, and beaches.",
    },
    {
        "id": "res-boom-pdp-deep",
        "name": "Paradip Deepwater Containment Unit",
        "resource_type": "OFFSHORE_CURTAIN_BOOM",
        "resource_category": "CONTAINMENT_BOOM",
        "quantity": 1200.0,
        "unit": "meters",
        "status": "AVAILABLE",
        "latitude": 20.264,
        "longitude": 86.669,
        "location_name": "Paradip Port Authority Depot",
        "capabilities_json": json.dumps(["BOOM_DEPLOYMENT", "OFFSHORE_CONTAINMENT"]),
        "mobilization_time_hours": 1.5,
        "speed_knots": 0.0,
        "contact_lead": "Harbor Master P. Das",
        "cost_per_hour": 2200.0,
        "description": "Rugged offshore containment barrier mounted on hydraulic reels for rapid deployment from tow tugs.",
    },

    # ── 4. Absorbent Materials ──────────────────────────────────
    {
        "id": "res-sorb-chn-bales",
        "name": "Chennai Hydrophobic Sorbent Boom Bales",
        "resource_type": "POLYPROPYLENE_SORBENT",
        "resource_category": "ABSORBENT_MATERIALS",
        "quantity": 100.0,
        "unit": "bales (4,000m)",
        "status": "AVAILABLE",
        "latitude": 13.082,
        "longitude": 80.290,
        "location_name": "Chennai Port Logistics Center",
        "capabilities_json": json.dumps(["ABSORBENT_MATERIALS", "SHEEN_RECOVERY", "PORT_DOCK_CLEANUP"]),
        "mobilization_time_hours": 0.25,
        "speed_knots": 0.0,
        "contact_lead": "Logistics Lead K. Anbu",
        "cost_per_hour": 800.0,
        "description": "Water-repellent oleophilic sorbent pads, rolls, and linking sorbent booms capable of absorbing 25x their weight in hydrocarbons.",
    },
    {
        "id": "res-sorb-tut-sheen",
        "name": "Tuticorin Fast Sheen Absorption Pack",
        "resource_type": "SORBENT_SWEEP_KIT",
        "resource_category": "ABSORBENT_MATERIALS",
        "quantity": 60.0,
        "unit": "kits",
        "status": "AVAILABLE",
        "latitude": 8.755,
        "longitude": 78.188,
        "location_name": "VOC Port Tuticorin",
        "capabilities_json": json.dumps(["ABSORBENT_MATERIALS", "SHALLOW_WATER"]),
        "mobilization_time_hours": 0.5,
        "speed_knots": 0.0,
        "contact_lead": "Port Officer M. Selvam",
        "cost_per_hour": 650.0,
        "description": "Continuous sorbent sweeps designed for low-viscosity fuels and diesel slicks in harbor waters.",
    },

    # ── 5. Personnel ──────────────────────────────────
    {
        "id": "res-per-strike-east",
        "name": "MRCC East Coast Hazmat Strike Team",
        "resource_type": "HAZMAT_STRIKE_FORCE",
        "resource_category": "PERSONNEL",
        "quantity": 25.0,
        "unit": "specialists",
        "status": "AVAILABLE",
        "latitude": 13.083,
        "longitude": 80.297,
        "location_name": "Coast Guard Regional HQ Chennai",
        "capabilities_json": json.dumps(["HAZMAT_CREW", "BOOM_RIGGING", "SKIMMER_OPERATION", "TOXIC_GAS_MONITORING"]),
        "mobilization_time_hours": 0.5,
        "speed_knots": 0.0,
        "contact_lead": "Team Lead Capt. G. Sundaram",
        "cost_per_hour": 3500.0,
        "description": "Certified Level-3 IMO maritime hazardous material response team trained in chemical containment and offshore recovery.",
    },
    {
        "id": "res-per-scat-chn",
        "name": "Chennai Coastal SCAT Assessment Crew",
        "resource_type": "SCAT_SURVEY_TEAM",
        "resource_category": "PERSONNEL",
        "quantity": 12.0,
        "unit": "marine scientists",
        "status": "AVAILABLE",
        "latitude": 13.045,
        "longitude": 80.278,
        "location_name": "National Institute of Ocean Technology (NIOT)",
        "capabilities_json": json.dumps(["SCAT_SURVEY", "SHORELINE_CLEANUP", "ECOLOGICAL_IMPACT_ASSESSMENT"]),
        "mobilization_time_hours": 1.0,
        "speed_knots": 0.0,
        "contact_lead": "Dr. P. Jayanthi",
        "cost_per_hour": 2200.0,
        "description": "Multi-disciplinary Shoreline Cleanup Assessment Technique (SCAT) team for mapping shoreline oiling severity.",
    },

    # ── 6. Monitoring Teams ──────────────────────────────────
    {
        "id": "res-mon-dornier-228",
        "name": "Coast Guard Dornier 228 Aerial UAV Recon Squadron",
        "resource_type": "AERIAL_MARITIME_RECON",
        "resource_category": "MONITORING_TEAM",
        "quantity": 2.0,
        "unit": "aircraft / UAVs",
        "status": "AVAILABLE",
        "latitude": 12.994,
        "longitude": 80.180,
        "location_name": "Coast Guard Air Station Meenambakkam",
        "capabilities_json": json.dumps(["MONITORING_AND_SURVEILLANCE", "FLIR_THERMAL_IMAGING", "RADAR_TRACKING", "SLICK_MAPPING"]),
        "mobilization_time_hours": 0.75,
        "speed_knots": 180.0,
        "contact_lead": "Wing Cdr. R. Iyer",
        "cost_per_hour": 25000.0,
        "description": "Long-range maritime reconnaissance aircraft fitted with SLAR (Side-Looking Airborne Radar) and FLIR thermal sensor payloads.",
    },
    {
        "id": "res-mon-sentinel-lab",
        "name": "Chennai Space Applications Satellite Unit",
        "resource_type": "SATELLITE_MONITORING_TEAM",
        "resource_category": "MONITORING_TEAM",
        "quantity": 6.0,
        "unit": "analysts",
        "status": "AVAILABLE",
        "latitude": 13.060,
        "longitude": 80.240,
        "location_name": "ISRO / INCOIS Regional Coordination Center",
        "capabilities_json": json.dumps(["MONITORING_AND_SURVEILLANCE", "SAR_RADAR_PROCESSING", "DRIFT_TELEMETRY"]),
        "mobilization_time_hours": 0.25,
        "speed_knots": 0.0,
        "contact_lead": "Senior Scientist N. Radhakrishnan",
        "cost_per_hour": 1500.0,
        "description": "24/7 dedicated satellite radar processing cell correlating Sentinel-1 SAR and RISAT imagery with forward Lagrangian drift trajectories.",
    },

    # ── 7. Cleanup Equipment ──────────────────────────────────
    {
        "id": "res-eqp-vac-trucks",
        "name": "Cuddalore Heavy Vacuum Tanker Fleet",
        "resource_type": "VACUUM_RECOVERY_TRUCK",
        "resource_category": "CLEANUP_EQUIPMENT",
        "quantity": 6.0,
        "unit": "tankers",
        "status": "AVAILABLE",
        "latitude": 11.748,
        "longitude": 79.771,
        "location_name": "Cuddalore District Civil Defense Depot",
        "capabilities_json": json.dumps(["BEACH_CLEANUP", "VACUUM_RECOVERY", "HAZMAT_TRANSPORT"]),
        "mobilization_time_hours": 1.0,
        "speed_knots": 0.0,
        "contact_lead": "Officer B. Srinivasan",
        "cost_per_hour": 5000.0,
        "description": "6 high-capacity vacuum trucks (12,000L slop capacity each) with explosion-proof pumps for nearshore trench extraction.",
    },
    {
        "id": "res-eqp-flush-enn",
        "name": "Ennore Ambient Beach Flushing System",
        "resource_type": "LOW_PRESSURE_FLUSHING",
        "resource_category": "CLEANUP_EQUIPMENT",
        "quantity": 4.0,
        "unit": "pumping skids",
        "status": "AVAILABLE",
        "latitude": 13.260,
        "longitude": 80.330,
        "location_name": "Ennore Coastal Emergency Depot",
        "capabilities_json": json.dumps(["BEACH_CLEANUP", "LOW_PRESSURE_FLUSHING", "INTERTIDAL_RESTORATION"]),
        "mobilization_time_hours": 0.75,
        "speed_knots": 0.0,
        "contact_lead": "Lead Engineer M. Rajesh",
        "cost_per_hour": 2800.0,
        "description": "Low-pressure ambient temperature seawater flushing systems designed to mobilize stranded oil without sterilizing intertidal biotas.",
    },
]


class ResourceAllocationService:
    """Core domain service for Module 16 — Response Resource Allocation."""

    @classmethod
    def seed_default_resources_if_empty(cls, db: Session) -> int:
        """Seeds initial Indian coastal response resources if database table is empty."""
        existing_count = db.query(ResponseResource).count()
        if existing_count > 0:
            return existing_count

        created_count = 0
        for item in DEFAULT_SEED_RESOURCES:
            res_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"oilspill.resource.{item['id']}"))
            res = ResponseResource(
                id=res_uuid,
                name=item["name"],
                resource_type=item["resource_type"],
                resource_category=item["resource_category"],
                quantity=item["quantity"],
                unit=item["unit"],
                status=item["status"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                location_name=item["location_name"],
                capabilities_json=item["capabilities_json"],
                mobilization_time_hours=item["mobilization_time_hours"],
                speed_knots=item["speed_knots"],
                contact_lead=item["contact_lead"],
                cost_per_hour=item["cost_per_hour"],
                description=item["description"],
            )
            db.add(res)
            created_count += 1

        db.commit()
        return created_count

    @classmethod
    def _map_resource_to_schema(cls, res: ResponseResource, current_incident_id: Optional[str] = None) -> ResourceItem:
        """Converts ORM ResponseResource to Pydantic ResourceItem."""
        caps = []
        if res.capabilities_json:
            try:
                caps = json.loads(res.capabilities_json) if isinstance(res.capabilities_json, str) else list(res.capabilities_json)
            except Exception:
                caps = []

        return ResourceItem(
            id=str(res.id),
            name=res.name or res.resource_type.replace("_", " ").title(),
            resource_type=res.resource_type,
            resource_category=res.resource_category or "CLEANUP_EQUIPMENT",
            quantity=res.quantity or 1.0,
            unit=res.unit or "units",
            status=res.status or "AVAILABLE",
            latitude=res.latitude,
            longitude=res.longitude,
            location_name=res.location_name,
            capabilities=caps,
            mobilization_time_hours=res.mobilization_time_hours or 1.0,
            speed_knots=res.speed_knots or 0.0,
            contact_lead=res.contact_lead,
            cost_per_hour=res.cost_per_hour or 0.0,
            description=res.description,
            vessel_id=res.vessel_id,
            current_incident_id=current_incident_id,
            created_at=res.created_at.isoformat() if res.created_at else datetime.now(timezone.utc).isoformat(),
            updated_at=res.updated_at.isoformat() if res.updated_at else datetime.now(timezone.utc).isoformat(),
        )

    @classmethod
    def get_all_resources(
        cls,
        db: Session,
        status_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        location_filter: Optional[str] = None,
        search_query: Optional[str] = None,
    ) -> ResourceListResponse:
        """Returns all response resources with telemetry and fleet utilization stats."""
        cls.seed_default_resources_if_empty(db)

        # Base query
        stmt = select(ResponseResource)
        if status_filter and status_filter.upper() != "ALL":
            stmt = stmt.where(ResponseResource.status == status_filter.upper())
        if category_filter and category_filter.upper() != "ALL":
            stmt = stmt.where(ResponseResource.resource_category == category_filter.upper())
        if location_filter:
            stmt = stmt.where(ResponseResource.location_name.ilike(f"%{location_filter}%"))
        if search_query:
            q = f"%{search_query}%"
            stmt = stmt.where(
                or_(
                    ResponseResource.name.ilike(q),
                    ResponseResource.resource_type.ilike(q),
                    ResponseResource.location_name.ilike(q),
                    ResponseResource.description.ilike(q),
                )
            )

        stmt = stmt.order_by(ResponseResource.resource_category.asc(), ResponseResource.name.asc())
        rows = db.execute(stmt).scalars().all()

        # Find active assignments to annotate current_incident_id
        active_assignments = db.query(ResourceAssignment).filter(
            ResourceAssignment.status.in_(["ASSIGNED", "DEPLOYED"])
        ).all()
        active_map = {str(a.resource_id): str(a.incident_id) for a in active_assignments}

        # Calculate fleet utilization statistics across full inventory
        all_resources = db.query(ResponseResource).all()
        total = len(all_resources)
        avail = sum(1 for r in all_resources if r.status == "AVAILABLE")
        assigned = sum(1 for r in all_resources if r.status == "ASSIGNED")
        deployed = sum(1 for r in all_resources if r.status == "DEPLOYED")
        maint = sum(1 for r in all_resources if r.status == "MAINTENANCE")
        unavail = sum(1 for r in all_resources if r.status == "UNAVAILABLE")

        committed = assigned + deployed
        utilization = round((committed / total * 100.0), 1) if total > 0 else 0.0

        # Category breakdown
        categories = ["RESPONSE_VESSEL", "SKIMMER_VESSEL", "CONTAINMENT_BOOM", "ABSORBENT_MATERIALS", "PERSONNEL", "MONITORING_TEAM", "CLEANUP_EQUIPMENT"]
        cat_counts = []
        for cat in categories:
            c_tot = sum(1 for r in all_resources if r.resource_category == cat)
            c_av = sum(1 for r in all_resources if r.resource_category == cat and r.status == "AVAILABLE")
            if c_tot > 0:
                cat_counts.append(ResourceCategoryCount(category=cat, count=c_tot, available=c_av))

        resource_items = [
            cls._map_resource_to_schema(r, active_map.get(str(r.id)))
            for r in rows
        ]

        return ResourceListResponse(
            total=total,
            available_count=avail,
            assigned_count=assigned,
            deployed_count=deployed,
            maintenance_count=maint,
            unavailable_count=unavail,
            fleet_utilization_pct=utilization,
            by_category=cat_counts,
            resources=resource_items,
        )

    @classmethod
    def get_available_resources(cls, db: Session) -> list[ResourceItem]:
        """Returns all response resources with status == 'AVAILABLE'."""
        cls.seed_default_resources_if_empty(db)
        resources = db.query(ResponseResource).filter(
            ResponseResource.status == "AVAILABLE"
        ).order_by(ResponseResource.name.asc()).all()
        return [cls._map_resource_to_schema(r) for r in resources]

    @classmethod
    def get_incident_resources(cls, db: Session, incident_id: str) -> IncidentResourcesResponse:
        """
        Returns full resource dossier for an incident:
          1. Current active assignments (ASSIGNED / DEPLOYED)
          2. Past assignments (RELEASED / CANCELLED)
          3. Ranked recommended available resources with explainable allocation scores
        """
        cls.seed_default_resources_if_empty(db)

        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        inc_lat = incident.latitude or 13.08
        inc_lon = incident.longitude or 80.35
        inc_priority = getattr(incident, "priority_score", 50.0) or (incident.risk_score or 50.0)
        inc_risk = incident.risk_score or 50.0

        # Retrieve active cleanup plan recommendations for strategy matching
        active_plan = db.query(CleanupPlan).filter(
            CleanupPlan.incident_id == incident_id
        ).order_by(CleanupPlan.created_at.desc()).first()

        active_strategies = []
        if active_plan and active_plan.recommendations:
            active_strategies = [r.action for r in active_plan.recommendations if r.action]

        # Fetch assignments for this incident
        assignments = db.query(ResourceAssignment).filter(
            ResourceAssignment.incident_id == incident_id
        ).order_by(ResourceAssignment.created_at.desc()).all()

        active_list = []
        past_list = []

        assigned_resource_ids = set()
        for a in assignments:
            res = db.query(ResponseResource).filter(ResponseResource.id == a.resource_id).first()
            item = ResourceAssignmentItem(
                id=str(a.id),
                incident_id=str(a.incident_id),
                resource_id=str(a.resource_id),
                resource_name=res.name if res else "Response Asset",
                resource_category=res.resource_category if res else "EQUIPMENT",
                resource_type=res.resource_type if res else "ASSET",
                quantity_assigned=a.quantity_assigned,
                unit=res.unit if res else "units",
                status=a.status,
                allocation_score=a.allocation_score,
                allocation_rationale=a.allocation_rationale,
                assigned_by=a.assigned_by,
                assigned_at=a.assigned_at.isoformat() if a.assigned_at else datetime.now(timezone.utc).isoformat(),
                deployed_at=a.deployed_at.isoformat() if a.deployed_at else None,
                released_at=a.released_at.isoformat() if a.released_at else None,
                notes=a.notes,
                created_at=a.created_at.isoformat(),
                updated_at=a.updated_at.isoformat(),
            )
            if a.status in ["ASSIGNED", "DEPLOYED"]:
                active_list.append(item)
                assigned_resource_ids.add(str(a.resource_id))
            else:
                past_list.append(item)

        # Evaluate and rank all AVAILABLE resources
        available_resources = db.query(ResponseResource).filter(
            ResponseResource.status == "AVAILABLE"
        ).all()

        recommended_items = []
        for r in available_resources:
            # Skip if already assigned to this incident
            if str(r.id) in assigned_resource_ids:
                continue

            score_data = ResourceAllocationEngine.evaluate_resource_score(
                resource=r,
                incident_latitude=inc_lat,
                incident_longitude=inc_lon,
                incident_priority=inc_priority,
                incident_risk=inc_risk,
                active_strategies=active_strategies,
            )

            recommended_items.append({
                "resource": r,
                "score_data": score_data,
            })

        # Sort recommendations by allocation_score DESC, then estimated_response_time_hours ASC
        recommended_items.sort(
            key=lambda x: (-x["score_data"]["allocation_score"], x["score_data"]["estimated_response_time_hours"])
        )

        ranked_recommendations = []
        for idx, rec in enumerate(recommended_items, start=1):
            s = rec["score_data"]
            f = s["factors"]
            ranked_recommendations.append(
                RecommendedResourceItem(
                    resource=cls._map_resource_to_schema(rec["resource"]),
                    rank=idx,
                    allocation_score=s["allocation_score"],
                    estimated_distance_km=s["estimated_distance_km"],
                    estimated_response_time_hours=s["estimated_response_time_hours"],
                    allocation_rationale=s["allocation_rationale"],
                    factors=AllocationFactors(
                        capability_match_score=f["capability_match_score"],
                        proximity_eta_score=f["proximity_eta_score"],
                        priority_score_boost=f["priority_score_boost"],
                        risk_severity_weight=f["risk_severity_weight"],
                    ),
                    is_eligible=s["is_eligible"],
                    match_priority=s["match_priority"],
                )
            )

        return IncidentResourcesResponse(
            incident_id=incident.id,
            incident_code=incident.incident_code,
            incident_priority_score=inc_priority,
            incident_risk_score=inc_risk,
            incident_severity=incident.severity.value if hasattr(incident.severity, "value") else str(incident.severity),
            total_assigned=len(active_list),
            active_assignments=active_list,
            past_assignments=past_list,
            recommended_resources=ranked_recommendations,
        )

    @classmethod
    def assign_resource(
        cls,
        db: Session,
        incident_id: str,
        payload: ResourceAssignRequest,
    ) -> ResourceAssignmentItem:
        """
        Commits an available response resource to an active incident with operator confirmation.
        Updates resource status to 'ASSIGNED', logs status history, and records IncidentEvent.
        """
        cls.seed_default_resources_if_empty(db)

        # 1. Validate Incident
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )

        # 2. Validate Resource
        resource = db.query(ResponseResource).filter(ResponseResource.id == payload.resource_id).first()
        if not resource:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resource '{payload.resource_id}' not found.",
            )

        if resource.status != "AVAILABLE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Resource '{resource.name or resource.id}' is currently {resource.status} and cannot be assigned. It must be released or marked AVAILABLE first.",
            )

        # 3. Compute Allocation Score
        inc_lat = incident.latitude or 13.08
        inc_lon = incident.longitude or 80.35
        inc_priority = getattr(incident, "priority_score", 50.0) or (incident.risk_score or 50.0)
        inc_risk = incident.risk_score or 50.0

        score_res = ResourceAllocationEngine.evaluate_resource_score(
            resource=resource,
            incident_latitude=inc_lat,
            incident_longitude=inc_lon,
            incident_priority=inc_priority,
            incident_risk=inc_risk,
        )

        qty = payload.quantity if payload.quantity and payload.quantity > 0 else (resource.quantity or 1.0)
        assigned_by = payload.assigned_by or "Incident Commander"
        notes = payload.notes

        # 4. Create ResourceAssignment
        assignment = ResourceAssignment(
            id=str(uuid.uuid4()),
            incident_id=incident.id,
            resource_id=resource.id,
            quantity_assigned=qty,
            status="ASSIGNED",
            allocation_score=score_res["allocation_score"],
            allocation_rationale=score_res["allocation_rationale"],
            assigned_by=assigned_by,
            assigned_at=datetime.now(timezone.utc),
            notes=notes,
        )
        db.add(assignment)

        # 5. Update Resource Status to ASSIGNED
        prev_status = resource.status
        resource.status = "ASSIGNED"
        resource.updated_at = datetime.now(timezone.utc)

        # 6. Log ResourceStatusHistory
        history = ResourceStatusHistory(
            id=str(uuid.uuid4()),
            resource_id=resource.id,
            previous_status=prev_status,
            new_status="ASSIGNED",
            changed_by=assigned_by,
            reason=f"Assigned to Incident {incident.incident_code} (Score: {score_res['allocation_score']}%)",
            incident_id=incident.id,
        )
        db.add(history)

        # 7. Create IncidentEvent in timeline
        event_desc = (
            f"Operator assigned response resource: '{resource.name}' ({resource.resource_category.replace('_', ' ')}) "
            f"— Quantity: {qty} {resource.unit}. Base: {resource.location_name or 'Coastal Depot'}. "
            f"Allocation Score: {score_res['allocation_score']}%. "
            f"Authorized by: {assigned_by}."
        )
        if notes:
            event_desc += f" Notes: \"{notes}\""

        event = IncidentEvent(
            id=str(uuid.uuid4()),
            incident_id=incident.id,
            event_type="RESOURCE_ASSIGNED",
            description=event_desc,
            created_by=assigned_by,
        )
        db.add(event)

        db.commit()
        db.refresh(assignment)

        return ResourceAssignmentItem(
            id=str(assignment.id),
            incident_id=str(assignment.incident_id),
            resource_id=str(assignment.resource_id),
            resource_name=resource.name or resource.resource_type,
            resource_category=resource.resource_category,
            resource_type=resource.resource_type,
            quantity_assigned=assignment.quantity_assigned,
            unit=resource.unit,
            status=assignment.status,
            allocation_score=assignment.allocation_score,
            allocation_rationale=assignment.allocation_rationale,
            assigned_by=assignment.assigned_by,
            assigned_at=assignment.assigned_at.isoformat(),
            deployed_at=assignment.deployed_at.isoformat() if assignment.deployed_at else None,
            released_at=assignment.released_at.isoformat() if assignment.released_at else None,
            notes=assignment.notes,
            created_at=assignment.created_at.isoformat(),
            updated_at=assignment.updated_at.isoformat(),
        )

    @classmethod
    def update_assignment(
        cls,
        db: Session,
        assignment_id: str,
        payload: AssignmentStatusUpdateRequest,
    ) -> ResourceAssignmentItem:
        """Updates status, quantity, or operational notes of an active assignment."""
        assignment = db.query(ResourceAssignment).filter(ResourceAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resource assignment '{assignment_id}' not found.",
            )

        resource = db.query(ResponseResource).filter(ResponseResource.id == assignment.resource_id).first()
        incident = db.query(Incident).filter(Incident.id == assignment.incident_id).first()

        target_status = payload.status.upper()
        if payload.quantity_assigned is not None and payload.quantity_assigned > 0:
            assignment.quantity_assigned = payload.quantity_assigned
        if payload.notes is not None:
            assignment.notes = payload.notes

        # Status transition handling
        if target_status == "DEPLOYED" and assignment.status != "DEPLOYED":
            assignment.status = "DEPLOYED"
            assignment.deployed_at = datetime.now(timezone.utc)
            if resource:
                prev = resource.status
                resource.status = "DEPLOYED"
                db.add(ResourceStatusHistory(
                    id=str(uuid.uuid4()),
                    resource_id=resource.id,
                    previous_status=prev,
                    new_status="DEPLOYED",
                    changed_by="Operator",
                    reason=f"Resource confirmed on-scene deployed for {incident.incident_code if incident else 'Incident'}",
                    incident_id=assignment.incident_id,
                ))
            if incident:
                db.add(IncidentEvent(
                    id=str(uuid.uuid4()),
                    incident_id=incident.id,
                    event_type="RESOURCE_DEPLOYED",
                    description=f"Resource '{resource.name if resource else assignment.resource_id}' confirmed on-scene DEPLOYED.",
                    created_by="Operator",
                ))

        elif target_status in ["RELEASED", "CANCELLED"] and assignment.status not in ["RELEASED", "CANCELLED"]:
            assignment.status = target_status
            assignment.released_at = datetime.now(timezone.utc)
            if resource:
                prev = resource.status
                resource.status = "AVAILABLE"
                db.add(ResourceStatusHistory(
                    id=str(uuid.uuid4()),
                    resource_id=resource.id,
                    previous_status=prev,
                    new_status="AVAILABLE",
                    changed_by="Operator",
                    reason=f"Released from Incident {incident.incident_code if incident else ''}; returned to service",
                    incident_id=assignment.incident_id,
                ))
            if incident:
                db.add(IncidentEvent(
                    id=str(uuid.uuid4()),
                    incident_id=incident.id,
                    event_type="RESOURCE_RELEASED",
                    description=f"Resource '{resource.name if resource else assignment.resource_id}' RELEASED from active incident operations.",
                    created_by="Operator",
                ))

        assignment.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(assignment)

        return ResourceAssignmentItem(
            id=str(assignment.id),
            incident_id=str(assignment.incident_id),
            resource_id=str(assignment.resource_id),
            resource_name=resource.name if resource else "Response Asset",
            resource_category=resource.resource_category if resource else "EQUIPMENT",
            resource_type=resource.resource_type if resource else "ASSET",
            quantity_assigned=assignment.quantity_assigned,
            unit=resource.unit if resource else "units",
            status=assignment.status,
            allocation_score=assignment.allocation_score,
            allocation_rationale=assignment.allocation_rationale,
            assigned_by=assignment.assigned_by,
            assigned_at=assignment.assigned_at.isoformat(),
            deployed_at=assignment.deployed_at.isoformat() if assignment.deployed_at else None,
            released_at=assignment.released_at.isoformat() if assignment.released_at else None,
            notes=assignment.notes,
            created_at=assignment.created_at.isoformat(),
            updated_at=assignment.updated_at.isoformat(),
        )

    @classmethod
    def release_assignment(cls, db: Session, assignment_id: str) -> dict[str, str]:
        """Releases an assigned resource, returning it to AVAILABLE status and logging an audit event."""
        payload = AssignmentStatusUpdateRequest(status="RELEASED", notes="Released by operator via release command")
        cls.update_assignment(db, assignment_id, payload)
        return {"status": "success", "message": f"Resource assignment '{assignment_id}' successfully released."}

    @classmethod
    def update_resource_status(
        cls,
        db: Session,
        resource_id: str,
        payload: ResourceStatusUpdateRequest,
    ) -> ResourceItem:
        """Manually transitions resource status (e.g. entering MAINTENANCE or returning to AVAILABLE)."""
        resource = db.query(ResponseResource).filter(ResponseResource.id == resource_id).first()
        if not resource:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resource '{resource_id}' not found.",
            )

        prev_status = resource.status
        resource.status = payload.status.upper()
        resource.updated_at = datetime.now(timezone.utc)

        db.add(ResourceStatusHistory(
            id=str(uuid.uuid4()),
            resource_id=resource.id,
            previous_status=prev_status,
            new_status=resource.status,
            changed_by=payload.changed_by or "Equipment Manager",
            reason=payload.reason or f"Status changed to {resource.status}",
        ))

        db.commit()
        db.refresh(resource)
        return cls._map_resource_to_schema(resource)
