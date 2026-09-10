"""
Rules and multi-criteria scoring engine for Smart Cleanup Planner — Module 15.
Evaluates environmental conditions, coastal proximity, ecosystem vulnerability,
and available equipment to recommend operational response options.
"""
from typing import Any


class CleanupRulesEngine:
    """Configurable multi-criteria decision-support rules engine."""

    @staticmethod
    def classify_spill_tier(spill_area_km2: float, severity: str) -> str:
        """Classify incident into NOS-DCP Response Tier."""
        if severity == "CRITICAL" or spill_area_km2 >= 5.0:
            return "TIER_3_MAJOR"
        elif severity == "HIGH" or spill_area_km2 >= 0.5:
            return "TIER_2_MEDIUM"
        return "TIER_1_SMALL"

    @staticmethod
    def determine_primary_strategy(
        coastal_distance_km: float,
        coastal_eta_hours: float | None,
        spill_area_km2: float,
        sensitive_ecosystem: str | None,
    ) -> str:
        """Determine overarching response strategy."""
        is_coastal_threat = (
            (coastal_eta_hours is not None and coastal_eta_hours <= 24.0)
            or coastal_distance_km <= 30.0
            or (sensitive_ecosystem in ["CORAL_REEF", "MANGROVE", "PROTECTED_AREA"])
        )

        if is_coastal_threat:
            return "SHORELINE_PROTECTION_AND_EXCLUSION_BOOMING"
        elif spill_area_km2 >= 1.0:
            return "OFFSHORE_CONTAINMENT_AND_MECHANICAL_SKIMMING"
        else:
            return "ACTIVE_TRACKING_AND_CONTROLLED_RECOVERY"

    @classmethod
    def evaluate_recommendations(cls, context: dict[str, Any]) -> list[dict[str, Any]]:
        """
        Evaluate all candidate cleanup response actions and return prioritized list.
        Each recommendation contains action, action_title, reason, priority,
        suitability_score (0-100), required_resources, and limitations.
        """
        spill_area = float(context.get("spill_area_km2") or 1.0)
        oil_type = str(context.get("oil_type") or "HEAVY_CRUDE").upper()
        coastal_km = float(context.get("coastal_distance_km") or 50.0)
        coastal_eta = context.get("earliest_coastal_impact_hours")
        wind_speed = float(context.get("wind_speed_ms") or 5.0)
        wave_height = float(context.get("wave_height_m") or 1.0)
        current_speed = float(context.get("current_speed_ms") or 0.5)
        sensitive_eco = context.get("most_sensitive_ecosystem")
        priority_score = float(context.get("incident_priority_score") or 50.0)
        available_vessels = int(context.get("available_response_vessels") or 0)

        recommendations: list[dict[str, Any]] = []

        # ── 1. Containment Boom Deployment ──────────────────
        boom_score = 85.0
        boom_priority = "HIGH"
        boom_reasons = []

        if oil_type in ["HEAVY_CRUDE", "BUNKER_C", "CRUDE_OIL"]:
            boom_score += 8.0
            boom_reasons.append("Heavy, persistent oil slick has high containment cohesion")
        elif oil_type in ["DIESEL", "GASOLINE", "LIGHT_FUEL"]:
            boom_score -= 15.0
            boom_reasons.append("Light refined fuel spreads into thin volatile sheen with lower boom recovery efficiency")

        if wave_height <= 1.2:
            boom_score += 5.0
            boom_reasons.append(f"Calm sea state (wave height {wave_height:.1f}m) provides optimal boom hydrodynamic stability")
        elif wave_height > 1.8:
            boom_score -= 28.0
            boom_reasons.append(f"Elevated swell ({wave_height:.1f}m) increases wave splashover risk")

        if current_speed > 0.8:
            boom_score -= 20.0
            boom_reasons.append(f"Current speed ({current_speed:.1f} m/s) approaches critical entrainment velocity")

        if coastal_eta is not None and coastal_eta <= 12.0:
            boom_priority = "CRITICAL"
            boom_score += 7.0
            boom_reasons.append(f"Urgent shoreline contact horizon (~{coastal_eta:.1f}h) requires containment barrier")

        boom_score = max(10.0, min(98.0, boom_score))

        recommendations.append({
            "action": "CONTAINMENT_BOOM_DEPLOYMENT",
            "action_title": "Heavy Offshore Containment Booming",
            "reason": "; ".join(boom_reasons) or "Deploy ocean containment booms to corral floating slick and prevent dispersion.",
            "priority": boom_priority,
            "suitability_score": round(boom_score, 1),
            "required_resources": [
                "Pollution Control Vessel (PCV) with boom reel",
                "1,500m Heavy Ocean Curtain / Inflatable Boom",
                "Workboat / Tug tender for J-configuration towing",
                "Towing bridles and sea anchors",
            ],
            "limitations": [
                "Hydrodynamic oil entrainment under boom skirt occurs at relative current velocities exceeding 0.75 knots (0.38 m/s)",
                "Wave splashover occurs when significant wave height exceeds 1.8m",
                "Requires dual-vessel coordinated towing to maintain proper apex aperture",
            ],
        })

        # ── 2. Mechanical Skimming & Recovery ───────────────
        skim_score = 82.0
        skim_priority = "HIGH"
        skim_reasons = []

        if spill_area >= 1.5:
            skim_score += 10.0
            skim_reasons.append(f"Substantial slick surface area ({spill_area:.1f} km²) warrants high-throughput mechanical recovery")

        if available_vessels >= 1:
            skim_score += 6.0
            skim_reasons.append(f"{available_vessels} emergency response vessels available in regional readiness")

        if oil_type in ["HEAVY_CRUDE", "BUNKER_C"]:
            skim_score += 7.0
            skim_reasons.append("High-viscosity crude oil matches oleophilic disc and brush skimming performance")

        if wave_height > 1.8:
            skim_score -= 25.0
            skim_reasons.append(f"Challenging wave conditions ({wave_height:.1f}m) degrade weir skimmer intake stability")

        skim_score = max(10.0, min(97.0, skim_score))

        recommendations.append({
            "action": "MECHANICAL_SKIMMING_RECOVERY",
            "action_title": "Mechanical Skimming & Offshore Recovery",
            "reason": "; ".join(skim_reasons) or "Deploy dedicated weir or brush skimmers to recover concentrated oil from apex of containment boom.",
            "priority": skim_priority,
            "suitability_score": round(skim_score, 1),
            "required_resources": [
                "Weir / Oleophilic Brush Skimmer (capacity: 300+ m³/h)",
                "Hydraulic power pack & heavy-duty discharge hoses",
                "Onboard slop storage tanks or towed floating storage bladder (Dracone)",
                "Decanting and oily water separation system",
            ],
            "limitations": [
                "Recovery efficiency drops substantially when oil-water mousse emulsification exceeds 50%",
                "Intake clogs readily if marine debris, seaweed, or plastic litter is entrained",
                "Requires adequate onboard slop capacity; operations stall when waste storage is full",
            ],
        })

        # ── 3. Shoreline Protection Barrier Booming ─────────
        shore_score = 70.0
        shore_priority = "MEDIUM"
        shore_reasons = []

        is_shore_critical = (coastal_eta is not None and coastal_eta <= 18.0) or coastal_km <= 25.0
        if is_shore_critical:
            shore_score += 24.0
            shore_priority = "CRITICAL"
            eta_txt = f"~{coastal_eta:.1f}h" if coastal_eta is not None else f"{coastal_km:.1f}km"
            shore_reasons.append(f"Spill is within immediate coastal proximity ({eta_txt}); exclusion booming required to defend shoreline")

        if sensitive_eco in ["CORAL_REEF", "MANGROVE", "PROTECTED_AREA", "FISHERIES"]:
            shore_score += 8.0
            shore_priority = "CRITICAL"
            shore_reasons.append(f"Adjacent sensitive marine habitat ({sensitive_eco}) requires strict defensive exclusion barrier")

        if not is_shore_critical and coastal_km > 60.0:
            shore_score -= 25.0
            shore_priority = "LOW"
            shore_reasons.append(f"Offshore distance ({coastal_km:.1f} km) does not currently justify nearshore barrier deployment")

        shore_score = max(10.0, min(99.0, shore_score))

        recommendations.append({
            "action": "SHORELINE_PROTECTION_BARRIER",
            "action_title": "Shoreline Defense & Protective Exclusion Booming",
            "reason": "; ".join(shore_reasons) or "Deploy shallow-water deflection and exclusion booms to deflect oil away from sensitive coastal assets.",
            "priority": shore_priority,
            "suitability_score": round(shore_score, 1),
            "required_resources": [
                "2,000m Shallow-Water / Shore-Seal Booms",
                "Shallow-draft inflatable RIB workboats (draft < 1m)",
                "Ground anchoring stakes, sand anchors, and tidal compensator sliders",
                "Coastal rapid response deployment crew (12 personnel)",
            ],
            "limitations": [
                "Tidal swings require sliding tidal compensators to prevent oil passage under grounded boom at low water",
                "Shallow breakers, coral heads, and shoals restrict large support craft",
                "High-energy surf zones (> 1.2m breaking waves) can tear ground anchors",
            ],
        })

        # ── 4. Sorbent & Absorbent Materials ────────────────
        sorbent_score = 65.0
        sorbent_priority = "MEDIUM"
        sorbent_reasons = []

        if oil_type in ["DIESEL", "GASOLINE", "LIGHT_FUEL", "LIGHT_CRUDE"]:
            sorbent_score += 22.0
            sorbent_priority = "HIGH"
            sorbent_reasons.append(f"Light/diesel fuel ({oil_type}) is highly responsive to oleophilic polypropylene sorbent absorption")

        if coastal_km <= 15.0 or (coastal_eta is not None and coastal_eta <= 12.0):
            sorbent_score += 10.0
            sorbent_reasons.append("Nearshore and harbor riprap response benefits from localized sorbent barriers")

        if spill_area > 4.0:
            sorbent_score -= 15.0
            sorbent_reasons.append(f"Extensive slick size ({spill_area:.1f} km²) makes sorbents insufficient as primary containment")

        sorbent_score = max(10.0, min(95.0, sorbent_score))

        recommendations.append({
            "action": "ABSORBENT_MATERIALS",
            "action_title": "Oleophilic Sorbent Booms & Absorbent Sweeps",
            "reason": "; ".join(sorbent_reasons) or "Deploy sorbent booms and absorbent pads for capturing thin fuel sheens and protecting port infrastructure.",
            "priority": sorbent_priority,
            "suitability_score": round(sorbent_score, 1),
            "required_resources": [
                "800m Polypropylene Hydrophobic Sorbent Booms",
                "50 Bales of High-Absorbency Sorbent Pads and Sweeps",
                "Heavy-duty containment bags & hazardous waste transfer drums",
                "Manual retrieval crew with non-sparking recovery rakes",
            ],
            "limitations": [
                "Sorbents saturate quickly in heavy crude, becoming ineffective without rapid replacement",
                "Failure to retrieve spent sorbent promptly results in secondary marine microplastic pollution",
                "Ineffective in rough seas where wave turbulence submerges lightweight pads",
            ],
        })

        # ── 5. Chemical Dispersant Application ──────────────
        disp_score = 50.0
        disp_priority = "MEDIUM"
        disp_reasons = []

        is_deep_offshore = coastal_km >= 15.0
        has_mixing_energy = 0.5 <= wave_height <= 2.5
        is_near_sensitive = sensitive_eco in ["CORAL_REEF", "MANGROVE", "PROTECTED_AREA", "FISHERIES"] or coastal_km < 15.0

        if is_near_sensitive:
            disp_score = 15.0
            disp_priority = "LOW"
            disp_reasons.append(
                f"RESTRICTED / UNFAVORABLE: Nearshore zone ({coastal_km:.1f}km) or sensitive habitat ({sensitive_eco or 'coastal zone'}). "
                "Dispersant application strongly restricted under NOS-DCP to avoid benthic and reef toxicity"
            )
        elif is_deep_offshore and oil_type in ["CRUDE_OIL", "LIGHT_CRUDE", "HEAVY_CRUDE"]:
            disp_score += 25.0
            disp_reasons.append(f"Deep offshore location ({coastal_km:.1f}km) and suitable crude oil type favor rapid chemical dispersion")
            if has_mixing_energy:
                disp_score += 10.0
                disp_reasons.append(f"Wave height ({wave_height:.1f}m) provides natural mixing energy for dispersant droplet breakup")
        else:
            disp_score -= 10.0
            disp_reasons.append("Environmental conditions marginal for dispersant effectiveness")

        disp_score = max(5.0, min(90.0, disp_score))

        recommendations.append({
            "action": "DISPERSANT_APPLICATION",
            "action_title": "Chemical Dispersant Spray Guidance",
            "reason": "; ".join(disp_reasons),
            "priority": disp_priority,
            "suitability_score": round(disp_score, 1),
            "required_resources": [
                "Coast Guard Dornier 228 maritime aircraft or Vessel spray arms",
                "Type II/III Approved Biodegradable Dispersant Concentrate (e.g., Corexit 9500 / OSR-5)",
                "Water depth sounding verification sonar (> 20m depth)",
                "Spotter aircraft with calibrated fluorometer for dispersion efficacy verification",
            ],
            "limitations": [
                "STRICTLY PROHIBITED in water depths < 20m, within 5 NM of coastline, or adjacent to coral reefs and nursery grounds",
                "Window of opportunity typically closes within 24 to 48 hours as oil weathers and viscosity exceeds 10,000 cSt",
                "Requires prior environmental clearance from Coast Guard Regional Commander & State Pollution Control Board",
            ],
        })

        # ── 6. Active Surveillance & Satellite Tracking ─────
        surv_score = 96.0
        surv_priority = "HIGH"
        surv_reasons = ["Continuous satellite radar tracking and aerial reconnaissance essential for forward movement prediction"]

        if priority_score >= 60.0:
            surv_priority = "CRITICAL"
            surv_reasons.append(f"Elevated incident priority ({priority_score:.1f}) requires real-time tactical surveillance")

        recommendations.append({
            "action": "MONITORING_AND_SURVEILLANCE",
            "action_title": "Satellite Radar & Aerial UAV Surveillance",
            "reason": "; ".join(surv_reasons),
            "priority": surv_priority,
            "suitability_score": round(surv_score, 1),
            "required_resources": [
                "Synthetic Aperture Radar (SAR) satellite pass scheduling (Sentinel-1 / RISAT)",
                "Coast Guard Maritime Patrol Aircraft / Long-Endurance Surveillance UAV",
                "Live AIS tracking integration for suspect vessel correlation",
                "Forward Lagrangian trajectory modeling updates every 3 hours",
            ],
            "limitations": [
                "Optical satellite feeds obstructed by heavy cloud cover and monsoon squall lines",
                "Nighttime aerial tracking requires calibrated thermal infrared (FLIR) or radar sensors",
                "Satellite revisit frequency introduces 6-12 hour telemetry gaps without airborne assets",
            ],
        })

        # ── 7. Specialized Shoreline Cleanup Crew ───────────
        beach_score = 45.0
        beach_priority = "LOW"
        beach_reasons = []

        if (coastal_eta is not None and coastal_eta <= 12.0) or coastal_km <= 10.0:
            beach_score = 88.0
            beach_priority = "HIGH"
            beach_reasons.append(f"Imminent shoreline oil stranding projected within {coastal_eta or '<12'}h; shore teams must pre-stage")
        elif coastal_km <= 25.0:
            beach_score = 65.0
            beach_priority = "MEDIUM"
            beach_reasons.append("Coastal proximity indicates high probability of shoreline contamination within 24 hours")
        else:
            beach_reasons.append(f"Offshore location ({coastal_km:.1f}km); shoreline response not immediately required")

        beach_score = max(10.0, min(96.0, beach_score))

        recommendations.append({
            "action": "SPECIALIZED_SHORELINE_CLEANUP",
            "action_title": "Pre-Staging Shoreline Cleanup & Beach Taskforce",
            "reason": "; ".join(beach_reasons),
            "priority": beach_priority,
            "suitability_score": round(beach_score, 1),
            "required_resources": [
                "Dedicated Shoreline Cleanup Assessment Technique (SCAT) team",
                "Low-pressure ambient flushing pumps & skimmer pit collection trenches",
                "Vacuum recovery trucks & portable vacuum systems",
                "Personal Protective Equipment (PPE) for 30 shoreline responders",
            ],
            "limitations": [
                "High-pressure hot water washing must be avoided in sensitive intertidal flats to prevent destroying micro-organisms",
                "Heavy machinery traffic on sandy beaches causes deep oil burial, compounding long-term contamination",
                "Personnel safety precautions mandatory against volatile organic compound (VOC) vapor inhalation",
            ],
        })

        # Sort recommendations by suitability score descending
        recommendations.sort(key=lambda r: r["suitability_score"], reverse=True)
        return recommendations
