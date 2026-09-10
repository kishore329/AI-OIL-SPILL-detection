// ─────────────────────────────────────────────
// Global TypeScript type definitions
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthResponse {
  status: "healthy" | "unhealthy";
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  badge?: string;
  badgeType?: "danger" | "warning" | "success";
}

// ── Dashboard Aggregates ──────────────────────

export interface SeverityBreakdown {
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

export interface StatusBreakdown {
  detected: number;
  verified: number;
  prioritized: number;
  assigned: number;
  response_in_progress: number;
  containment: number;
  monitoring: number;
  resolved: number;
}

export interface DashboardSummary {
  active_incidents: number;
  total_incidents: number;
  resolved_incidents: number;
  critical_incidents: number;
  high_incidents: number;
  moderate_incidents: number;
  low_incidents: number;
  total_spill_area_km2?: number | null;
  average_risk_score?: number | null;
  by_severity: SeverityBreakdown;
  by_status: StatusBreakdown;
}

// ── Incidents & GIS enums ─────────────────────

export type IncidentSeverity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

export type IncidentStatus =
  | "DETECTED"
  | "VERIFIED"
  | "PRIORITIZED"
  | "ASSIGNED"
  | "RESPONSE_IN_PROGRESS"
  | "CONTAINMENT"
  | "MONITORING"
  | "RECOVERY"
  | "RESOLVED";

export type ZoneType =
  | "FISHING_ZONE"
  | "PROTECTED_AREA"
  | "PORT"
  | "BEACH"
  | "SHIPPING_LANE"
  | "COASTAL_SETTLEMENT";

export type ZoneSensitivity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  event_type: string;
  description: string;
  created_by?: string;
  created_at: string;
}

export interface IncidentDetail {
  id: string;
  incident_code: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  risk_score: number | null;
  detection_confidence: number | null;
  spill_area_km2: number | null;
  latitude: number | null;
  longitude: number | null;
  location_geojson?: string | null;
  spill_geometry_geojson?: string | null;
  description?: string | null;
  source?: string | null;
  is_active: boolean;
  detected_at?: string | null;
  created_at: string;
  updated_at: string;
  events?: IncidentEvent[];
}

export interface IncidentListResponse {
  items: IncidentDetail[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Map & GIS Types ───────────────────────────

export interface MapIncidentPoint {
  id: string;
  incident_code: string;
  latitude: number | null;
  longitude: number | null;
  location_geojson?: string | null;
  spill_geometry_geojson?: string | null;
  risk_score: number | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  spill_area_km2: number | null;
  detection_confidence?: number | null;
  description?: string | null;
  source?: string | null;
}

export interface NearbyZoneItem {
  zone_id: string;
  name: string;
  zone_type: ZoneType;
  sensitivity: ZoneSensitivity;
  distance_km: number;
  latitude?: number | null;
  longitude?: number | null;
  geometry_geojson?: string | null;
  is_demo: boolean;
}

export interface NearbyZonesResponse {
  incident_id: string;
  incident_code: string;
  incident_latitude: number;
  incident_longitude: number;
  radius_km: number;
  total_nearby: number;
  zones: NearbyZoneItem[];
}

export interface GISLayerFeature {
  id: string;
  name: string;
  feature_type: string;
  sub_type?: string | null;
  sensitivity?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geometry_geojson?: string | null;
  description?: string | null;
  is_demo: boolean;
}

export interface MapLayersResponse {
  incidents: MapIncidentPoint[];
  protected_areas: GISLayerFeature[];
  fishing_zones: GISLayerFeature[];
  ports: GISLayerFeature[];
  shipping_lanes: GISLayerFeature[];
  coastline?: number[][];
  is_demo_data: boolean;
}

export interface DetectionAnalyzeResponse {
  detected: boolean;
  confidence: number;
  spill_area_km2: number;
  geometry_geojson?: string | null;
  mask_base64?: string | null;
  model_name: string;
  processing_time_ms: number;
  potential_false_positive: boolean;
  is_demo_model: boolean;
  latitude: number;
  longitude: number;
  timestamp: string;
  incident_id?: string | null;
  incident_code?: string | null;
  severity?: string | null;
  risk_score?: number | null;
  priority_score?: number | null;
  urgency_level?: string | null;
  coastline_eta_hours?: number | null;
  nearby_zones_count?: number | null;
  detection_id: string;
  details?: Record<string, any>;
}

// ── Risk Engine Types ─────────────────────────

export interface RiskFactor {
  name: string;
  score: number;
  max_score: number;
  percentage: number;
  reason: string;
}

export interface RiskRawSubscores {
  spill_size: number;
  coastal_proximity: number;
  environmental: number;
  spread: number;
  human_exposure: number;
}

export interface RiskWeightsUsed {
  spill_size_max: number;
  coastal_proximity_max: number;
  environmental_max: number;
  human_exposure_max: number;
  spread_max: number;
}

export interface RiskAssessment {
  assessment_id: string;
  incident_id?: string | null;
  incident_code?: string | null;
  risk_score: number;
  severity: IncidentSeverity;
  model_disclaimer?: string;
  disclaimer?: string;
  spill_size_score?: number;
  coastal_proximity_score?: number;
  environmental_score?: number;
  human_exposure_score?: number;
  spread_score?: number;
  factors: RiskFactor[];
  distances?: Record<string, number | null>;
  confidence_applied?: number;
  calculation_timestamp?: string;
  timestamp?: string;
}

export interface RiskCalculateRequest {
  incident_id?: string | null;
  spill_area_km2?: number | null;
  distance_coastline_km?: number | null;
  spread_severity?: IncidentSeverity | null;
  detection_confidence?: number | null;
  distance_fishing_zone_km?: number | null;
  distance_protected_area_km?: number | null;
  distance_port_km?: number | null;
  distance_shipping_lane_km?: number | null;
  human_exposure_score?: number | null;
  environmental_score?: number | null;
  notes?: string | null;
}

export interface IncidentRiskHistoryResponse {
  incident_id: string;
  total_assessments: number;
  assessments: RiskAssessment[];
}

export interface TopRiskIncident {
  id: string;
  incident_code: string;
  severity: IncidentSeverity;
  risk_score: number;
  spill_area_km2: number;
  latitude: number;
  longitude: number;
}

export interface RiskSummaryResponse {
  total_active_incidents: number;
  average_risk_score: number;
  severity_distribution: Record<IncidentSeverity, number>;
  highest_risk_score: number;
  top_risk_incidents: TopRiskIncident[];
  last_updated: string;
}

// ── Priority Engine Types ─────────────────────

export type UrgencyLevel = "IMMEDIATE" | "HIGH" | "ELEVATED" | "ROUTINE";

export interface PriorityFactorsSummary {
  risk_score_component: number;
  urgency_eta_component: number;
  environmental_component: number;
  spill_size_component: number;
  status_urgency_component: number;
}

export interface PriorityRankItem {
  rank: number;
  incident_id: string;
  incident_code: string;
  priority_score: number;
  risk_score: number;
  severity: IncidentSeverity;
  status: IncidentStatus;
  spill_area_km2?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_coastline_km?: number | null;
  coastline_eta_hours?: number | null;
  urgency_level: UrgencyLevel | string;
  reason: string;
  factors: PriorityFactorsSummary;
  detected_at?: string | null;
}

export interface PriorityQueueResponse {
  total_active: number;
  queue_length: number;
  highest_priority_incident?: string | null;
  items: PriorityRankItem[];
  model_disclaimer: string;
  generated_at: string;
}

// ── Vessel Tracking & Suspect Attribution (AIS) ──

export interface AISWaypoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed_knots: number;
  course_deg: number;
}

export interface SuspectVessel {
  id: string;
  name: string;
  vessel_type: string;
  mmsi: string;
  imo: string;
  flag: string;
  callsign: string;
  destination: string;
  cargo_type: string;
  deadweight_tonnage: number;
  current_lat: number;
  current_lon: number;
  heading_deg: number;
  current_speed_knots: number;
  trajectory: AISWaypoint[];
  leak_probability_score: number;
  suspicion_rank: number;
  priority_tier: "PRIMARY_SUSPECT" | "SECONDARY_SUSPECT" | "CLEARED" | string;
  closest_approach_km: number;
  closest_approach_time: string;
  speed_at_incident: number;
  anomaly_indicators: string[];
  recommended_action: string;
}

export interface SuspectVesselsResponse {
  incident_id: string;
  incident_code: string;
  incident_latitude: number;
  incident_longitude: number;
  spill_area_km2?: number | null;
  detection_time?: string | null;
  total_suspects: number;
  primary_suspect?: SuspectVessel | null;
  suspects: SuspectVessel[];
}

export interface ActiveVesselPoint {
  id: string;
  name: string;
  vessel_type: string;
  mmsi: string;
  flag: string;
  current_lat: number;
  current_lon: number;
  heading_deg: number;
  speed_knots: number;
  destination: string;
  is_suspect: boolean;
  associated_incident_code?: string | null;
  leak_probability?: number | null;
  trajectory: number[][];
}

export interface ActiveVesselsResponse {
  total: number;
  vessels: ActiveVesselPoint[];
}

// ── Module 11: Movement Predictor Types ────────

export interface ForecastPoint {
  horizon_hours: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  bearing_deg: number;
  bearing_cardinal: string;
  estimated_area_km2: number;
  arrival_time: string;
}

export interface EnvironmentalConditions {
  wind_speed_ms: number;
  wind_direction_deg: number;
  current_speed_ms: number;
  current_direction_deg: number;
  water_temp_c: number;
  wave_height_m: number;
}

export interface MovementPredictionRequest {
  wind_speed_ms?: number;
  wind_direction_deg?: number;
  current_speed_ms?: number;
  current_direction_deg?: number;
  forecast_horizon_hours?: number;
}

export interface MovementPredictionResponse {
  id: string;
  incident_id: string;
  incident_code: string;
  prediction_time: string;
  forecast_horizon_hours: number;
  origin_latitude: number;
  origin_longitude: number;
  origin_area_km2: number;
  environmental_conditions: EnvironmentalConditions;
  forecast_points: ForecastPoint[];
  trajectory_geojson?: string | null;
  predicted_positions_geojson?: string | null;
  uncertainty_corridor_geojson?: string | null;
  model_name: string;
  confidence: number;
  is_simulated: boolean;
  disclaimer: string;
  created_at: string;
}

export interface MovementHistoryItem {
  id: string;
  prediction_time: string;
  forecast_horizon_hours: number;
  model_name: string;
  confidence: number;
  wind_speed_ms?: number | null;
  current_speed_ms?: number | null;
  created_at: string;
}

// ── Module 12: Marine Ecosystem Risk Analyzer ────

export interface EcosystemZoneRisk {
  zone_id: string;
  zone_name: string;
  zone_type: string;
  ecosystem_category: string;
  distance_km: number;
  affected_area_km2?: number | null;
  intersects: boolean;
  sensitivity_score: number;
  exposure_score: number;
  proximity_score: number;
  zone_risk_score: number;
  zone_severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  explanation: string;
}

export interface EcosystemRiskResponse {
  id: string;
  incident_id: string;
  incident_code: string;
  overall_risk_score: number;
  overall_severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  most_sensitive_zone?: string | null;
  most_sensitive_type?: string | null;
  zone_results: EcosystemZoneRisk[];
  risk_engine_modifier: number;
  zones_analyzed: number;
  radius_km_used: number;
  used_movement_prediction: boolean;
  is_simulated: boolean;
  model_name: string;
  disclaimer: string;
  analyzed_at: string;
}

export interface EcosystemAnalyzeRequest {
  radius_km?: number;
  use_movement_prediction?: boolean;
}

// ── Module 13: Coastal Impact Predictor & Time-to-Impact ────

export interface CoastalImpactItem {
  id: string;
  incident_id: string;
  target_location: string;
  target_type: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  estimated_hours_to_impact: number;
  predicted_impact_time: string;
  impact_horizon: "NOW" | "1H" | "3H" | "6H" | "12H" | "24H" | ">24H";
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  confidence: number;
  impact_probability: number;
  prediction_source: string;
  spatial_relation: string;
  summary_notes?: string | null;
  is_simulated: boolean;
}

export interface TimelineHorizonGroup {
  horizon: "NOW" | "1H" | "3H" | "6H" | "12H" | "24H" | ">24H";
  hours_label: string;
  locations_count: number;
  highest_severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  locations: CoastalImpactItem[];
}

export interface CoastalImpactResponse {
  incident_id: string;
  incident_code: string;
  total_affected_locations: number;
  earliest_impact_hours?: number | null;
  earliest_impact_location?: string | null;
  earliest_impact_type?: string | null;
  overall_coastal_severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  timeline_summary: TimelineHorizonGroup[];
  affected_locations: CoastalImpactItem[];
  impact_zones_geojson?: string | null;
  model_name: string;
  confidence_score: number;
  is_simulated: boolean;
  disclaimer: string;
  analyzed_at: string;
}

export interface TimeToImpactResponse {
  incident_id: string;
  incident_code: string;
  earliest_impact_hours?: number | null;
  earliest_impact_target?: string | null;
  earliest_impact_type?: string | null;
  urgency_level: "IMMEDIATE" | "CRITICAL" | "HIGH" | "ELEVATED" | "MONITORING";
  shoreline_contact_confirmed: boolean;
  total_threatened_assets: number;
  timeline_counts: Record<string, number>;
  alert_summary: string;
  disclaimer: string;
}

export interface CoastalImpactPredictRequest {
  force_movement_recalculate?: boolean;
  search_buffer_km?: number;
  wind_speed_ms?: number;
  wind_direction_deg?: number;
  current_speed_ms?: number;
  current_direction_deg?: number;
}

// ── Module 14: Emergency Vessel Route Optimizer ────

export interface EmergencyVesselItem {
  id: string;
  name: string;
  vessel_type: string;
  mmsi?: string | null;
  callsign?: string | null;
  home_port: string;
  is_available: boolean;
  status: string;
  capabilities: string[];
  max_speed_knots: number;
  cruising_speed_knots: number;
  skimmer_capacity_m3h: number;
  boom_meters: number;
  dispersant_liters: number;
  latitude: number;
  longitude: number;
  heading_deg?: number | null;
  assigned_incident_id?: string | null;
}

export interface AvailableVesselsResponse {
  total: number;
  available_count: number;
  vessels: EmergencyVesselItem[];
}

export interface NavigationalWaypoint {
  index: number;
  name: string;
  latitude: number;
  longitude: number;
  leg_distance_nm: number;
  cumulative_distance_nm: number;
  leg_eta_hours: number;
  waypoint_type: string;
  sequence?: number;
  distance_nm_from_prev?: number;
  distance_nm_cumulative?: number;
  estimated_hours_from_prev?: number;
  estimated_hours_cumulative?: number;
  note?: string | null;
}

export interface OptimizedRouteResponse {
  id: string;
  incident_id: string;
  incident_code: string;
  vessel: EmergencyVesselItem;
  start_latitude: number;
  start_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  estimated_distance_nm: number;
  estimated_distance_km: number;
  estimated_travel_time_hours: number;
  estimated_arrival_time: string;
  route_geometry_geojson: string;
  waypoints: NavigationalWaypoint[];
  routing_provider: string;
  route_confidence: number;
  weather_delay_factor: number;
  urgency_rating: string;
  avoided_restricted_zones?: string[];
  disclaimer: string;
  created_at: string;
  // Aliases for convenience
  route_id?: string;
  vessel_id?: string;
  vessel_name?: string;
  vessel_type?: string;
  home_port?: string;
  origin?: { latitude: number; longitude: number; name?: string };
  destination?: { latitude: number; longitude: number; name?: string };
  transit_speed_knots?: number;
  total_distance_nm?: number;
  total_distance_km?: number;
  total_estimated_hours?: number;
  confidence_score?: number;
  equipment_match?: {
    has_booms: boolean;
    has_skimmers: boolean;
    has_dispersants: boolean;
    oil_recovery_rate_m3h: number;
  };
}

export interface RecommendedVesselItem {
  vessel: EmergencyVesselItem;
  rank: number;
  suitability_score: number;
  estimated_distance_nm: number;
  estimated_travel_time_hours: number;
  suitability_rationale: string;
  equipment_match: string[];
  response_priority: string;
  // Aliases
  vessel_id?: string;
  vessel_name?: string;
  vessel_type?: string;
  home_port?: string;
  distance_nm?: number;
  estimated_hours?: number;
  overall_match_score?: number;
}

export interface RecommendedVesselsResponse {
  incident_id: string;
  incident_code: string;
  incident_severity: string;
  incident_priority_score: number;
  total_vessels_evaluated: number;
  recommendations: RecommendedVesselItem[];
  decision_support_note?: string;
}

export interface RouteOptimizeRequest {
  vessel_id?: string;
  avoid_restricted_zones?: boolean;
  weather_penalty?: number;
}

// ── Module 15: Smart Cleanup Planner ──────────────

export interface CleanupRecommendationItem {
  id: string;
  action: string;
  action_title: string;
  reason: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  suitability_score: number;
  required_resources: string[];
  limitations: string[] | string;
  operational_status: "RECOMMENDED" | "ACCEPTED" | "REJECTED" | "DEPLOYED" | string;
  status?: "RECOMMENDED" | "ACCEPTED" | "REJECTED" | "DEPLOYED" | string;
  action_type?: string;
  decision_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentalContext {
  wind_speed_ms?: number | null;
  wind_speed_kts?: number | null;
  wind_direction_deg?: number | null;
  current_speed_ms?: number | null;
  ocean_current_speed_kts?: number | null;
  current_direction_deg?: number | null;
  wave_height_m?: number | null;
  coastal_distance_km?: number | null;
  distance_to_coast_km?: number | null;
  earliest_coastal_impact_hours?: number | null;
  most_sensitive_ecosystem?: string | null;
  sensitive_zones_count?: number | null;
  spill_area_km2?: number | null;
  incident_priority_score?: number | null;
  priority_score?: number | null;
  available_response_vessels?: number;
}

export interface CleanupPlanResponse {
  id: string;
  incident_id: string;
  incident_code: string;
  plan_code: string;
  spill_size_tier: string;
  spill_tier?: string;
  oil_type: string;
  overall_strategy: string;
  primary_strategy?: string;
  status: string;
  environmental_context: EnvironmentalContext;
  recommendations: CleanupRecommendationItem[];
  decision_support_disclaimer: string;
  created_at: string;
  updated_at: string;
}

export interface CleanupPlanGenerateRequest {
  oil_type?: string;
  strategy_focus?: string;
  force_recalculate?: boolean;
}

export interface RecommendationStatusUpdateRequest {
  status: "ACCEPTED" | "REJECTED";
  decision_notes?: string;
}

// ── Module 16: Response Resource Allocation ────────

export interface ResourceItem {
  id: string;
  name: string;
  resource_type: string;
  resource_category: string;
  quantity: number;
  unit: string;
  status: "AVAILABLE" | "ASSIGNED" | "DEPLOYED" | "UNAVAILABLE" | "MAINTENANCE" | string;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  capabilities: string[];
  mobilization_time_hours: number;
  speed_knots: number;
  contact_lead?: string | null;
  cost_per_hour: number;
  description?: string | null;
  vessel_id?: string | null;
  current_incident_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceCategoryCount {
  category: string;
  count: number;
  available: number;
}

export interface ResourceListResponse {
  total: number;
  available_count: number;
  assigned_count: number;
  deployed_count: number;
  maintenance_count: number;
  unavailable_count: number;
  fleet_utilization_pct: number;
  by_category: { category: string; count: number; available: number }[];
  resources: ResourceItem[];
}

export interface ResourceAssignmentItem {
  id: string;
  incident_id: string;
  resource_id: string;
  resource_name: string;
  resource_category: string;
  resource_type: string;
  quantity_assigned: number;
  unit: string;
  status: "ASSIGNED" | "DEPLOYED" | "RELEASED" | "CANCELLED" | string;
  allocation_score: number;
  allocation_rationale?: string | null;
  assigned_by: string;
  assigned_at: string;
  deployed_at?: string | null;
  released_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AllocationFactors {
  capability_match_score: number;
  proximity_eta_score: number;
  priority_score_boost: number;
  risk_severity_weight: number;
}

export interface RecommendedResourceItem {
  resource: ResourceItem;
  rank: number;
  allocation_score: number;
  estimated_distance_km: number;
  estimated_response_time_hours: number;
  allocation_rationale: string;
  factors: AllocationFactors;
  is_eligible: boolean;
  match_priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
}

export interface IncidentResourcesResponse {
  incident_id: string;
  incident_code: string;
  incident_priority_score?: number | null;
  incident_risk_score?: number | null;
  incident_severity?: string | null;
  total_assigned: number;
  active_assignments: ResourceAssignmentItem[];
  past_assignments: ResourceAssignmentItem[];
  recommended_resources: RecommendedResourceItem[];
  decision_support_note?: string;
}

export interface ResourceAssignRequest {
  resource_id: string;
  quantity?: number;
  assigned_by?: string;
  notes?: string;
}

export interface AssignmentStatusUpdateRequest {
  status: "ASSIGNED" | "DEPLOYED" | "RELEASED" | "CANCELLED" | string;
  quantity_assigned?: number;
  notes?: string;
}

export interface ResourceStatusUpdateRequest {
  status: "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE" | string;
  reason?: string;
  changed_by?: string;
}

// ── Module 17: Multi-Source Incident Verification ─────

export interface VerificationEvidenceItem {
  id: string;
  source_code: "SATELLITE" | "DRONE" | "CITIZEN_REPORT" | "AIS_VESSEL" | "METOCEAN_CONTEXT" | "MANUAL" | string;
  provider_name: string;
  confidence: number;
  weight_applied: number;
  quality_score: number;
  data_origin: "LIVE" | "HISTORICAL" | "SIMULATED" | string;
  evidence_type: string;
  agrees_with_spill: boolean;
  evidence_metadata?: Record<string, any> | null;
  notes?: string | null;
  timestamp: string;
}

export interface VerificationSourceItem {
  id: string;
  code: string;
  name: string;
  default_weight: number;
  description?: string | null;
  is_active: boolean;
}

export interface VerificationResponse {
  incident_id: string;
  incident_code: string;
  incident_severity?: string;
  overall_confidence_score: number;
  decision: "VERIFIED" | "NEEDS_REVIEW" | "REJECTED" | string;
  cross_source_agreement_pct: number;
  contradiction_detected: boolean;
  decision_rationale: string;
  verified_by: string;
  verified_at: string;
  sources_evaluated_count: number;
  weights_summary: Record<string, number>;
  evidence_breakdown: VerificationEvidenceItem[];
  available_sources: VerificationSourceItem[];
  model_disclaimer?: string;
}

export interface VerificationEvaluateRequest {
  force_recalculate?: boolean;
  custom_weights?: Record<string, number>;
}

export interface VerificationEvidenceAddRequest {
  source_code: string;
  provider_name?: string;
  confidence: number;
  quality_score?: number;
  data_origin?: string;
  evidence_type?: string;
  agrees_with_spill?: boolean;
  evidence_metadata?: Record<string, any>;
  notes?: string;
}

export interface VerificationOverrideRequest {
  decision: "VERIFIED" | "NEEDS_REVIEW" | "REJECTED" | string;
  decision_notes: string;
  operator_name?: string;
}

// ── Module 18: Probable Spill Source Analyzer ──────────

export interface SourceEvidenceItem {
  id: string;
  evidence_type: string;
  description: string;
  confidence_weight: number;
  evidence_data?: Record<string, any> | null;
  created_at: string;
}

export interface SourceCandidateItem {
  id: string;
  region_code: string;
  region_name: string;
  confidence_percentage: number;
  area_km2: number;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  estimated_drift_hours: number;
  supporting_evidence_count: number;
  summary_notes?: string | null;
  potential_vessels_count: number;
  shipping_lanes_intersected: string[];
  nearby_ports: string[];
  evidence: SourceEvidenceItem[];
}

export interface ReverseTrajectoryPoint {
  step_hours_ago: number;
  timestamp: string;
  lat: number;
  lng: number;
  drift_distance_km: number;
  confidence_radius_km: number;
  wind_speed_knots: number;
  wind_direction_deg: number;
  current_speed_knots: number;
  current_direction_deg: number;
}

export interface SourceAnalysisResponse {
  id: string;
  incident_id: string;
  incident_code: string;
  overall_confidence_percentage: number;
  probable_source_region: string;
  estimated_discharge_window_hours: number;
  estimated_discharge_time: string;
  spill_lat: number;
  spill_lng: number;
  status: string;
  legal_disclaimer: string;
  created_at: string;
  updated_at: string;
  reverse_trajectory: ReverseTrajectoryPoint[];
  candidates: SourceCandidateItem[];
  total_evidence_evaluated: number;
}

export interface SourceAnalysisRequest {
  lookback_hours?: number;
  include_vessels?: boolean;
  include_shipping_routes?: boolean;
  include_ports?: boolean;
  include_historical_incidents?: boolean;
  force_recalculate?: boolean;
}

// ── Module 19: Citizen / Fisherman Reporting ──────────

export interface CitizenReportItem {
  id: string;
  report_code: string;
  latitude: number;
  longitude: number;
  location_description?: string | null;
  photo_url?: string | null;
  photo_filename?: string | null;
  photo_content_type?: string | null;
  photo_file_size_bytes?: number | null;
  description: string;
  incident_category: "SURFACE_SHEEN" | "TAR_BALLS" | "HEAVY_BLACK_OIL" | "VESSEL_DISCHARGE" | "SHORELINE_COATING" | "OTHER" | string;
  estimated_spill_size?: string | null;
  observed_at: string;
  reporter_name?: string | null;
  reporter_contact?: string | null;
  reporter_affiliation?: string | null;
  status: "SUBMITTED" | "UNDER_REVIEW" | "AI_ASSISTED_VERIFICATION" | "VERIFIED" | "REJECTED" | string;
  verification_confidence: number;
  ai_analysis_notes?: string | null;
  linked_incident_id?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CitizenReportCreatePayload {
  latitude: number;
  longitude: number;
  description: string;
  incident_category?: string;
  location_description?: string;
  estimated_spill_size?: string;
  reporter_name?: string;
  reporter_contact?: string;
  reporter_affiliation?: string;
}

export interface CitizenReportStatusUpdatePayload {
  status: "SUBMITTED" | "UNDER_REVIEW" | "AI_ASSISTED_VERIFICATION" | "VERIFIED" | "REJECTED" | string;
  reviewed_by?: string;
  review_notes?: string;
}

export interface CitizenReportVerifyPayload {
  auto_create_incident?: boolean;
  link_incident_id?: string;
  operator_name?: string;
}

export interface CitizenReportListResponse {
  items: CitizenReportItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Module 20: What-If Oil Spill Simulator ──
export type OilType = "LIGHT_CRUDE" | "HEAVY_CRUDE" | "DIESEL_REFINED" | "BUNKER_FUEL";
export type SpillSizeUnit = "BARRELS" | "TONS" | "M3";
export type SimulationStatus = "CREATED" | "RUNNING" | "COMPLETED" | "FAILED";

export interface SimulationWaypoint {
  step: number;
  hour: number;
  latitude: number;
  longitude: number;
  slick_area_km2: number;
  uncertainty_radius_km: number;
  drift_speed_kmh: number;
  distance_from_origin_km: number;
}

export interface SimulationMovementOutput {
  drift_speed_kmh: number;
  drift_speed_knots: number;
  drift_heading_deg: number;
  total_drift_distance_km: number;
  initial_area_km2: number;
  final_area_km2: number;
  evaporated_percentage: number;
  waypoints: SimulationWaypoint[];
}

export interface SimulationRiskOutput {
  score: number;
  level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  factors: {
    spill_volume_score: number;
    coastal_proximity_score: number;
    ecosystem_sensitivity_score: number;
    persistence_hazard_score: number;
    spread_expansion_score: number;
  };
  explanation: string;
}

export interface SimulationEcosystemZone {
  name: string;
  type: string;
  weight: number;
  distance_km: number;
  impact_score: number;
  vulnerability_tier: string;
}

export interface SimulationEcosystemOutput {
  vulnerability_score: number;
  vulnerable_biomes_count: number;
  zones: SimulationEcosystemZone[];
  most_vulnerable_zone?: SimulationEcosystemZone | null;
  ecological_summary: string;
}

export interface SimulationThreatenedAsset {
  name: string;
  type: string;
  distance_km: number;
  sensitivity: string;
  risk_notes: string;
}

export interface SimulationCoastalOutput {
  shoreline_impacted: boolean;
  time_to_shore_hours?: number | null;
  closest_distance_to_coast_km: number;
  landfall_coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  threatened_assets_count: number;
  threatened_assets: SimulationThreatenedAsset[];
  shoreline_threat_summary: string;
}

export interface SimulationPriorityOutput {
  priority_score: number;
  urgency_tier: "IMMEDIATE" | "HIGH" | "ELEVATED" | "ROUTINE";
  recommended_dispatch_action: string;
}

export interface SimulationEconomicOutput {
  total_expected_usd: number;
  low_estimate_usd: number;
  high_estimate_usd: number;
  currency: string;
  pillars: {
    commercial_fisheries_usd: number;
    port_shipping_delays_usd: number;
    shoreline_cleanup_remediation_usd: number;
    containment_operational_opex_usd: number;
  };
  impacted_shoreline_length_km: number;
  economic_notes: string;
}

export interface SimulationTacticalAction {
  priority: number;
  title: string;
  detail: string;
}

export interface SimulationRecommendationsOutput {
  response_tier: "TIER_1_SMALL" | "TIER_2_MEDIUM" | "TIER_3_MAJOR";
  overall_strategy: string;
  containment_boom_meters: number;
  daily_skimmer_capacity_m3: number;
  dispersant_suitable: boolean;
  dispersant_guidance: string;
  tactical_actions: SimulationTacticalAction[];
}

export interface SimulationInputData {
  id: string;
  simulation_id: string;
  latitude: number;
  longitude: number;
  spill_size: number;
  spill_size_unit: SpillSizeUnit;
  spill_size_barrels: number;
  oil_type: OilType;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  current_speed_knots: number;
  current_direction_deg: number;
  duration_hours: number;
  created_at: string;
}

export interface SimulationOutputData {
  id: string;
  simulation_id: string;
  predicted_movement: SimulationMovementOutput;
  risk: SimulationRiskOutput;
  ecosystem_impact: SimulationEcosystemOutput;
  coastal_impact: SimulationCoastalOutput;
  priority: SimulationPriorityOutput;
  economic_estimate: SimulationEconomicOutput;
  recommendations: SimulationRecommendationsOutput;
  disclaimer: string;
  created_at: string;
}

export interface SimulationRunItem {
  id: string;
  name: string;
  status: SimulationStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  inputs?: SimulationInputData | null;
  outputs?: SimulationOutputData | null;
}

export interface SimulationRunListItem {
  id: string;
  name: string;
  status: SimulationStatus;
  spill_size_barrels?: number | null;
  oil_type?: OilType | null;
  duration_hours?: number | null;
  risk_score?: number | null;
  risk_level?: string | null;
  time_to_shore_hours?: number | null;
  total_economic_usd?: number | null;
  created_at: string;
}

export interface SimulationCreatePayload {
  name?: string;
  notes?: string;
  inputs: {
    latitude: number;
    longitude: number;
    spill_size: number;
    spill_size_unit?: SpillSizeUnit;
    oil_type?: OilType;
    wind_speed_kmh?: number;
    wind_direction_deg?: number;
    current_speed_knots?: number;
    current_direction_deg?: number;
    duration_hours?: number;
  };
  auto_run?: boolean;
}

export interface SimulationCompareItem {
  id: string;
  name: string;
  oil_type: OilType;
  spill_size_barrels: number;
  duration_hours: number;
  risk_score: number;
  risk_level: string;
  time_to_shore_hours?: number | null;
  shoreline_impacted: boolean;
  ecosystem_vulnerability_score: number;
  total_economic_usd: number;
  response_tier: string;
  containment_boom_meters: number;
  created_at: string;
}

export interface SimulationCompareResponse {
  scenarios: SimulationCompareItem[];
  delta_summary: Record<string, any>;
  disclaimer: string;
}

// ── Module 21: Economic Damage Estimator ──
export interface EconomicCategoryDetail {
  category: "CLEANUP" | "FISHERIES" | "TOURISM" | "COASTAL_BUSINESS" | "INFRASTRUCTURE" | "OTHER_MODELED" | string;
  category_title: string;
  estimated_amount: number;
  formatted_amount: string;
  currency: "INR" | "USD" | string;
  calculation_formula: string;
  assumptions_snapshot?: Record<string, any> | null;
  confidence: number;
}

export interface EconomicAssessmentResponse {
  id: string;
  incident_id: string;
  currency: "INR" | "USD" | string;
  total_estimated_amount: number;
  total_formatted: string;
  confidence: number;
  categories: EconomicCategoryDetail[];
  assumptions_used: Record<string, any>;
  model_name: string;
  disclaimer: string;
  created_at: string;
}

export interface EconomicAssumptionData {
  id?: string;
  incident_id?: string | null;
  name: string;
  currency: string;
  exchange_rate_usd_to_inr: number;
  cleanup_cost_per_km2: number;
  shoreline_cleanup_per_km: number;
  fisheries_daily_value_per_km2: number;
  fisheries_recovery_days_default: number;
  tourism_daily_value_per_km: number;
  tourism_disruption_days_default: number;
  business_daily_loss_per_km: number;
  business_disruption_days_default: number;
  infrastructure_daily_loss_per_facility: number;
  infrastructure_disruption_days_default: number;
  other_ecosystem_remediation_per_point: number;
  is_default?: boolean;
  notes?: string | null;
}

export interface EconomicAssessmentRequest {
  currency?: "INR" | "USD" | string;
  custom_assumptions?: Partial<EconomicAssumptionData> | null;
}

// ── Module 22: Environmental Recovery Predictor ──
export type RecoveryHorizon = "1_MONTH" | "3_MONTHS" | "6_MONTHS" | "12_MONTHS" | "24_MONTHS";
export type EcosystemTargetType =
  | "MANGROVES"
  | "CORAL_REEFS"
  | "FISHERIES"
  | "MARINE_HABITATS"
  | "COASTAL_ECOSYSTEMS";

export interface RecoveryPredictionItem {
  id: string;
  assessment_id: string;
  incident_id: string;
  ecosystem_type: EcosystemTargetType | string;
  ecosystem_title: string;
  recovery_horizon: RecoveryHorizon | string;
  horizon_months: number;
  estimated_recovery_percentage: number;
  confidence: number;
  milestone_status: string;
  assumptions: Record<string, any>;
  created_at: string;
}

export interface MilestoneItem {
  month: number;
  label: string;
  description: string;
  reached: boolean;
}

export interface EcosystemTrajectoryDetail {
  ecosystem_type: EcosystemTargetType | string;
  ecosystem_title: string;
  baseline_k: number;
  effective_k: number;
  asymptotic_max: number;
  trajectories: Record<string, number>; // e.g. { "1M": 20.0, "3M": 40.0, "6M": 60.0, "12M": 80.0, "24M": 95.0 }
  milestones: MilestoneItem[];
}

export interface EnvironmentalRecoveryResponse {
  id: string;
  incident_id: string;
  overall_recovery_index_24m: number;
  cleanup_effectiveness_applied: number;
  ecosystem_risk_score_applied: number;
  exposure_duration_hours: number;
  spill_severity_tier: string;
  ecosystems_evaluated_count: number;
  confidence_percentage: number;
  trajectories: EcosystemTrajectoryDetail[];
  predictions: RecoveryPredictionItem[];
  model_name: string;
  disclaimer: string;
  created_at: string;
}

export interface RecoveryCalculationRequest {
  cleanup_effectiveness_override?: number | null;
  exposure_duration_override_hours?: number | null;
  custom_factors?: Record<string, any> | null;
  transition_to_recovery_stage?: boolean;
  operator_notes?: string | null;
}

export interface LifecycleTransitionRequest {
  new_status?: string;
  authorizing_officer: string;
  transition_notes: string;
}

export interface LifecycleTransitionResponse {
  incident_id: string;
  previous_status: string;
  current_status: string;
  event_id: string;
  authorizing_officer: string;
  notes: string;
  transitioned_at: string;
}

export interface RecoveryFactorResponse {
  id: string;
  incident_id?: string | null;
  ecosystem_type: string;
  ecosystem_title: string;
  baseline_recovery_rate_k: number;
  asymptotic_max_recovery: number;
  shape_exponent_gamma: number;
  ecosystem_sensitivity_weight: number;
  base_confidence: number;
  is_default: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ── Module 23: Smart Alert and Restriction System ────

export type SmartAlertType =
  | "CRITICAL_SPILL_ALERT"
  | "COASTAL_WARNING"
  | "FISHING_WARNING"
  | "VESSEL_WARNING"
  | "PORT_WARNING"
  | "PROTECTED_AREA_WARNING"
  | "RESPONSE_TEAM_ALERT"
  | "COMMUNITY_ALERT";

export type AlertSeverityType = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type RestrictionStatusType =
  | "RECOMMENDED"
  | "OPERATOR_CONFIRMED"
  | "OPERATOR_REJECTED"
  | "NOT_APPLICABLE";

export type AlertLifecycleStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";

export interface AlertRecipientItem {
  id: string;
  recipient_group: string;
  channel: string;
  delivery_status: string;
  dispatched_at: string;
}

export interface AlertEventItem {
  id: string;
  alert_id: string;
  incident_id: string;
  event_type: string;
  operator_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface SmartAlertItem {
  id: string;
  incident_id: string;
  incident_code?: string | null;
  alert_type: SmartAlertType;
  severity: AlertSeverityType;
  title: string;
  message: string;
  trigger: string;
  recommended_restriction?: string | null;
  restriction_type?: string | null;
  restriction_status: RestrictionStatusType;
  status: AlertLifecycleStatus;
  target_location?: string | null;
  target_asset_type?: string | null;
  eta_hours?: number | null;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  operator_notes?: string | null;
  rule_code?: string | null;
  context_snapshot: Record<string, any>;
  created_at: string;
  updated_at: string;
  recipients: AlertRecipientItem[];
  events: AlertEventItem[];
}

export interface AlertListResponse {
  total: number;
  active_count: number;
  critical_count: number;
  unconfirmed_restrictions_count: number;
  alerts: SmartAlertItem[];
}

export interface AlertGenerateRequest {
  incident_id: string;
  force_recheck?: boolean;
}

export interface AlertAcknowledgeRequest {
  operator_name: string;
  notes?: string | null;
}

export interface RestrictionConfirmRequest {
  operator_name: string;
  confirmed: boolean;
  operator_notes?: string | null;
}

export interface AlertRuleItem {
  id: string;
  rule_code: string;
  rule_name: string;
  alert_type: SmartAlertType;
  severity: AlertSeverityType;
  condition_metric: string;
  operator: string;
  threshold_value: number;
  template_title: string;
  template_message: string;
  recommended_action?: string | null;
  restriction_type?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertRuleUpdateRequest {
  threshold_value?: number;
  severity?: string;
  is_active?: boolean;
  recommended_action?: string;
  notes?: string;
}

// ── Module 24: Oil Spill AI Assistant ────

export interface AssistantLocationRef {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface AssistantMessageItem {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources: string[];
  referenced_incident_id?: string | null;
  referenced_incident_code?: string | null;
  referenced_location?: AssistantLocationRef | null;
  created_at: string;
}

export interface AssistantChatRequest {
  message: string;
  conversation_id?: string | null;
  incident_id?: string | null;
}

export interface AssistantChatResponse {
  conversation_id: string;
  message: AssistantMessageItem;
  suggested_followups: string[];
}

export interface AssistantConversationItem {
  id: string;
  title: string;
  incident_id?: string | null;
  created_at: string;
  updated_at: string;
  messages: AssistantMessageItem[];
}

export interface AssistantConversationListItem {
  id: string;
  title: string;
  incident_id?: string | null;
  message_count: number;
  updated_at: string;
}
