import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  Flame,
  Search,
  MapPin,
  Calendar,
  ArrowUpRight,
  Shield,
  RefreshCw,
  Sliders,
  Clock,
  Compass,
  Send,
  CheckCircle2,
  AlertTriangle,
  X,
  Navigation,
  Wind,
  TrendingUp,
  Leaf,
  Waves,
  Zap,
  Anchor,
  Building2,
  Umbrella,
  Fish,
  Factory,
  Sparkles,
  Check,
  Boxes,
  PackageCheck,
  ShieldCheck,
  FileCheck,
  Camera,
  Radio,
  Satellite,
  XCircle,
  Info,
  Users,
  FilePlus,
  Scale,
  Crosshair,
  RotateCcw,
  History,
  Ship,
  ShieldAlert,
  Layers,
  DollarSign,
  Sprout,
  Activity,
} from "lucide-react";
import apiService from "../services/api";
import type {
  IncidentDetail,
  IncidentSeverity,
  IncidentStatus,
  RiskAssessment,
  NearbyZoneItem,
  IncidentEvent,
  SuspectVesselsResponse,
  SuspectVessel,
  MovementPredictionResponse,
  EcosystemRiskResponse,
  CoastalImpactResponse,
  RecommendedVesselItem,
  OptimizedRouteResponse,
  NavigationalWaypoint,
  CleanupPlanResponse,
  CleanupRecommendationItem,
  IncidentResourcesResponse,
  ResourceAssignmentItem,
  RecommendedResourceItem,
  VerificationResponse,
  VerificationEvidenceItem,
  SourceAnalysisResponse,
  EconomicAssessmentResponse,
  EconomicAssumptionData,
  EnvironmentalRecoveryResponse,
  SmartAlertItem,
} from "../types";


export default function Incidents() {
  const { id: paramId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const selectedId = paramId || searchParams.get("selected");


  const [incidents, setIncidents] = useState<IncidentDetail[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [nearbyZones, setNearbyZones] = useState<NearbyZoneItem[]>([]);
  const [incidentEvents, setIncidentEvents] = useState<IncidentEvent[]>([]);
  const [suspectData, setSuspectData] = useState<SuspectVesselsResponse | null>(null);
  const [loadingRisk, setLoadingRisk] = useState<boolean>(false);
  const [loadingZones, setLoadingZones] = useState<boolean>(false);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [loadingSuspects, setLoadingSuspects] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Module 11: Movement Prediction
  const [movementPrediction, setMovementPrediction] = useState<MovementPredictionResponse | null>(null);
  const [loadingMovement, setLoadingMovement] = useState<boolean>(false);
  const [runningMovement, setRunningMovement] = useState<boolean>(false);

  // Module 12: Ecosystem Risk
  const [ecosystemRisk, setEcosystemRisk] = useState<EcosystemRiskResponse | null>(null);
  const [loadingEcosystem, setLoadingEcosystem] = useState<boolean>(false);
  const [runningEcosystem, setRunningEcosystem] = useState<boolean>(false);

  // Module 13: Coastal Impact & Time-to-Impact
  const [coastalImpact, setCoastalImpact] = useState<CoastalImpactResponse | null>(null);
  const [loadingCoastal, setLoadingCoastal] = useState<boolean>(false);
  const [runningCoastal, setRunningCoastal] = useState<boolean>(false);
  const [selectedHorizonFilter, setSelectedHorizonFilter] = useState<string | null>(null);

  // Module 14: Emergency Vessel Route Optimizer
  const [recommendedVessels, setRecommendedVessels] = useState<RecommendedVesselItem[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRouteResponse | null>(null);
  const [loadingRouting, setLoadingRouting] = useState<boolean>(false);
  const [optimizingRoute, setOptimizingRoute] = useState<boolean>(false);

  // Module 15: Smart Cleanup Planner
  const [cleanupPlan, setCleanupPlan] = useState<CleanupPlanResponse | null>(null);
  const [loadingCleanup, setLoadingCleanup] = useState<boolean>(false);
  const [generatingCleanup, setGeneratingCleanup] = useState<boolean>(false);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [cleanupPriorityFilter, setCleanupPriorityFilter] = useState<string>("ALL");

  // Module 16: Response Resource Allocation
  const [incidentResources, setIncidentResources] = useState<IncidentResourcesResponse | null>(null);
  const [loadingResources, setLoadingResources] = useState<boolean>(false);
  const [dispatchModalResource, setDispatchModalResource] = useState<RecommendedResourceItem | null>(null);
  const [dispatchQuantity, setDispatchQuantity] = useState<number>(1);
  const [dispatchOperationalUnit, setDispatchOperationalUnit] = useState<string>("Primary Strike Team");
  const [dispatchAssignmentNotes, setDispatchAssignmentNotes] = useState<string>("");
  const [dispatchingResource, setDispatchingResource] = useState<boolean>(false);
  const [resourceCategoryTab, setResourceCategoryTab] = useState<string>("ALL");
  const [releasingAssignmentId, setReleasingAssignmentId] = useState<string | null>(null);

  // Module 17: Multi-Source Incident Verification
  const [verificationData, setVerificationData] = useState<VerificationResponse | null>(null);
  const [loadingVerification, setLoadingVerification] = useState<boolean>(false);
  const [recalculatingVerification, setRecalculatingVerification] = useState<boolean>(false);
  const [showAddEvidenceModal, setShowAddEvidenceModal] = useState<boolean>(false);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);

  // Module 17 Evidence Form State
  const [evidenceSourceCode, setEvidenceSourceCode] = useState<string>("DRONE");
  const [evidenceProviderName, setEvidenceProviderName] = useState<string>("Coast Guard UAV Alpha-1");
  const [evidenceConfidence, setEvidenceConfidence] = useState<number>(85);
  const [evidenceQualityScore, setEvidenceQualityScore] = useState<number>(90);
  const [evidenceType, setEvidenceType] = useState<string>("UAV_THERMAL_SURVEILLANCE");
  const [evidenceAgreesWithSpill, setEvidenceAgreesWithSpill] = useState<boolean>(true);
  const [evidenceDataOrigin, setEvidenceDataOrigin] = useState<string>("LIVE");
  const [evidenceNotes, setEvidenceNotes] = useState<string>("");
  const [submittingEvidence, setSubmittingEvidence] = useState<boolean>(false);

  // Module 17 Override Form State
  const [overrideDecision, setOverrideDecision] = useState<string>("VERIFIED");
  const [overrideNotes, setOverrideNotes] = useState<string>("");
  const [overrideOperator, setOverrideOperator] = useState<string>("Capt. R. Sharma (Incident Commander)");
  const [submittingOverride, setSubmittingOverride] = useState<boolean>(false);

  // Module 18: Probable Spill Source Analyzer
  const [sourceAnalysisData, setSourceAnalysisData] = useState<SourceAnalysisResponse | null>(null);
  const [loadingSourceAnalysis, setLoadingSourceAnalysis] = useState<boolean>(false);
  const [recalculatingSourceAnalysis, setRecalculatingSourceAnalysis] = useState<boolean>(false);
  const [sourceLookbackHours, setSourceLookbackHours] = useState<number>(24);
  const [selectedCandidateCode, setSelectedCandidateCode] = useState<string | null>(null);

  // Module 21: Economic Damage Estimator State
  const [economicImpact, setEconomicImpact] = useState<EconomicAssessmentResponse | null>(null);
  const [loadingEconomic, setLoadingEconomic] = useState<boolean>(false);
  const [recalculatingEconomic, setRecalculatingEconomic] = useState<boolean>(false);
  const [economicCurrency, setEconomicCurrency] = useState<"INR" | "USD">("INR");
  const [showAssumptionsModal, setShowAssumptionsModal] = useState<boolean>(false);
  const [assumptionsData, setAssumptionsData] = useState<EconomicAssumptionData | null>(null);
  const [editingAssumptions, setEditingAssumptions] = useState<Partial<EconomicAssumptionData>>({});

  // Module 22: Environmental Recovery Predictor State
  const [recoveryData, setRecoveryData] = useState<EnvironmentalRecoveryResponse | null>(null);
  const [loadingRecovery, setLoadingRecovery] = useState<boolean>(false);
  const [recalculatingRecovery, setRecalculatingRecovery] = useState<boolean>(false);
  const [selectedRecoveryEcoTab, setSelectedRecoveryEcoTab] = useState<string>("ALL");
  const [showTransitionModal, setShowTransitionModal] = useState<boolean>(false);
  const [transitionOfficer, setTransitionOfficer] = useState<string>("Commander R. Sharma (MRCC Chennai)");
  const [transitionNotes, setTransitionNotes] = useState<string>(
    "Active containment and primary recovery operations completed. Advancing incident lifecycle to long-term 24-month environmental monitoring and habitat restoration protocol."
  );
  const [transitioningRecovery, setTransitioningRecovery] = useState<boolean>(false);

  // Module 23: Smart Alert and Restriction System State
  const [incidentAlerts, setIncidentAlerts] = useState<SmartAlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);
  const [evaluatingAlerts, setEvaluatingAlerts] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "ALL">("ALL");

  // Operational Actions & Dispatch State
  const [updating, setUpdating] = useState<boolean>(false);
  const [showDispatchModal, setShowDispatchModal] = useState<boolean>(false);
  const [dispatchNote, setDispatchNote] = useState<string>("Deploy containment booms and offshore skimmers from MRCC Chennai coastal station.");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleUpdateStatus = async (newStatus: IncidentStatus) => {
    if (!selectedIncident) return;
    try {
      setUpdating(true);
      const updated = await apiService.updateIncident(selectedIncident.id, { status: newStatus });
      setSelectedIncident(updated);
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setActionSuccess(`Incident status changed to ${newStatus.replace(/_/g, " ")}`);
      // Refresh audit events
      const evts = await apiService.getIncidentEvents(selectedIncident.id);
      setIncidentEvents(evts);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update incident status");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateSeverity = async (newSeverity: IncidentSeverity) => {
    if (!selectedIncident) return;
    try {
      setUpdating(true);
      const updated = await apiService.updateIncident(selectedIncident.id, { severity: newSeverity });
      setSelectedIncident(updated);
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setActionSuccess(`Severity classification updated to ${newSeverity}`);
      // Refresh audit events
      const evts = await apiService.getIncidentEvents(selectedIncident.id);
      setIncidentEvents(evts);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update severity");
    } finally {
      setUpdating(false);
    }
  };

  const handleDispatchContainment = async () => {
    if (!selectedIncident) return;
    try {
      setUpdating(true);
      await apiService.addIncidentEvent(selectedIncident.id, {
        event_type: "CONTAINMENT_TEAM_DISPATCHED",
        description: dispatchNote,
        created_by: "Emergency Commander (SIH)",
      });
      // Also advance status to RESPONSE_IN_PROGRESS if needed
      if (selectedIncident.status !== "RESPONSE_IN_PROGRESS") {
        const updated = await apiService.updateIncident(selectedIncident.id, {
          status: "RESPONSE_IN_PROGRESS" as IncidentStatus,
        });
        setSelectedIncident(updated);
        setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      }
      const evts = await apiService.getIncidentEvents(selectedIncident.id);
      setIncidentEvents(evts);
      setShowDispatchModal(false);
      setActionSuccess("Emergency containment team dispatched & logged to operational audit trail!");
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to record containment dispatch event");
    } finally {
      setUpdating(false);
    }
  };

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getIncidents({ page_size: 50 });
      setIncidents(res.items);

      if (selectedId) {
        const found = res.items.find((i) => i.id === selectedId);
        if (found) {
          setSelectedIncident(found);
        } else {
          // Fetch directly
          try {
            const single = await apiService.getIncidentById(selectedId);
            setSelectedIncident(single);
          } catch {
            // ignore
          }
        }
      } else if (res.items.length > 0 && !selectedIncident) {
        setSelectedIncident(res.items[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [selectedId]);

  useEffect(() => {
    if (!selectedIncident?.id) {
      setRiskAssessment(null);
      setNearbyZones([]);
      setIncidentEvents([]);
      return;
    }
    let isCancelled = false;

    // 1. Fetch explainable risk assessment
    const fetchRisk = async () => {
      try {
        setLoadingRisk(true);
        const res = await apiService.getIncidentRisk(selectedIncident.id);
        if (!isCancelled) setRiskAssessment(res);
      } catch {
        if (!isCancelled) setRiskAssessment(null);
      } finally {
        if (!isCancelled) setLoadingRisk(false);
      }
    };

    // 2. Fetch GIS spatial impact (nearby zones within 50 km)
    const fetchZones = async () => {
      try {
        setLoadingZones(true);
        const res = await apiService.getNearbyZones(selectedIncident.id, 50);
        if (!isCancelled) setNearbyZones(res.zones || []);
      } catch {
        if (!isCancelled) setNearbyZones([]);
      } finally {
        if (!isCancelled) setLoadingZones(false);
      }
    };

    // 3. Fetch full incident details for timeline events
    const fetchEvents = async () => {
      try {
        setLoadingEvents(true);
        const single = await apiService.getIncidentById(selectedIncident.id);
        if (!isCancelled) setIncidentEvents(single.events || []);
      } catch {
        if (!isCancelled) setIncidentEvents([]);
      } finally {
        if (!isCancelled) setLoadingEvents(false);
      }
    };

    // 4. Fetch suspect vessels & AIS trajectory analysis
    const fetchSuspects = async () => {
      try {
        setLoadingSuspects(true);
        const res = await apiService.getSuspectVessels(selectedIncident.id);
        if (!isCancelled) setSuspectData(res);
      } catch {
        if (!isCancelled) setSuspectData(null);
      } finally {
        if (!isCancelled) setLoadingSuspects(false);
      }
    };

    // 5. Fetch (or auto-run) movement prediction
    const fetchMovement = async () => {
      try {
        setLoadingMovement(true);
        const res = await apiService.getMovementPrediction(selectedIncident.id);
        if (!isCancelled) setMovementPrediction(res);
      } catch {
        // No existing prediction — auto-run one
        try {
          const res = await apiService.runMovementPrediction(selectedIncident.id, {});
          if (!isCancelled) setMovementPrediction(res);
        } catch {
          if (!isCancelled) setMovementPrediction(null);
        }
      } finally {
        if (!isCancelled) setLoadingMovement(false);
      }
    };

    // 6. Fetch (or auto-run) ecosystem risk analysis
    const fetchEcosystem = async () => {
      try {
        setLoadingEcosystem(true);
        const res = await apiService.getEcosystemRisk(selectedIncident.id);
        if (!isCancelled) setEcosystemRisk(res);
      } catch {
        // No existing analysis — auto-run one
        try {
          const res = await apiService.analyzeEcosystemRisk(selectedIncident.id, { radius_km: 500 });
          if (!isCancelled) setEcosystemRisk(res);
        } catch {
          if (!isCancelled) setEcosystemRisk(null);
        }
      } finally {
        if (!isCancelled) setLoadingEcosystem(false);
      }
    };

    // 7. Fetch (or auto-run) coastal impact and time-to-impact analysis
    const fetchCoastal = async () => {
      try {
        setLoadingCoastal(true);
        const res = await apiService.getCoastalImpact(selectedIncident.id);
        if (!isCancelled) setCoastalImpact(res);
      } catch {
        if (!isCancelled) setCoastalImpact(null);
      } finally {
        if (!isCancelled) setLoadingCoastal(false);
      }
    };

    // 8. Module 14: Fetch recommended response vessels & optimized route
    const fetchRouting = async () => {
      try {
        setLoadingRouting(true);
        const [recsRes, routeRes] = await Promise.all([
          apiService.getRecommendedVessels(selectedIncident.id).catch(() => ({ total_considered: 0, recommended_vessels: [] })),
          apiService.optimizeRoute(selectedIncident.id, {}).catch(() => null),
        ]);
        if (!isCancelled) {
          const recs = (recsRes as any).recommendations || (recsRes as any).recommended_vessels || [];
          setRecommendedVessels(recs);
          if (recs.length > 0) {
            const firstId = recs[0]?.vessel?.id || recs[0]?.vessel_id;
            if (firstId) setSelectedVesselId(firstId);
          }
          setOptimizedRoute(routeRes);
        }
      } catch {
        if (!isCancelled) {
          setRecommendedVessels([]);
          setOptimizedRoute(null);
        }
      } finally {
        if (!isCancelled) setLoadingRouting(false);
      }
    };

    // 9. Module 15: Fetch smart cleanup plan
    const fetchCleanup = async () => {
      try {
        setLoadingCleanup(true);
        const plan = await apiService.getCleanupPlan(selectedIncident.id);
        if (!isCancelled) setCleanupPlan(plan);
      } catch {
        if (!isCancelled) setCleanupPlan(null);
      } finally {
        if (!isCancelled) setLoadingCleanup(false);
      }
    };

    // 10. Module 16: Fetch assigned and recommended resources
    const fetchResources = async () => {
      try {
        setLoadingResources(true);
        const res = await apiService.getIncidentResources(selectedIncident.id);
        if (!isCancelled) setIncidentResources(res);
      } catch {
        if (!isCancelled) setIncidentResources(null);
      } finally {
        if (!isCancelled) setLoadingResources(false);
      }
    };

    // 11. Module 17: Fetch multi-source verification dossier
    const fetchVerification = async () => {
      try {
        setLoadingVerification(true);
        const ver = await apiService.getIncidentVerification(selectedIncident.id);
        if (!isCancelled) setVerificationData(ver);
      } catch {
        if (!isCancelled) setVerificationData(null);
      } finally {
        if (!isCancelled) setLoadingVerification(false);
      }
    };

    // 12. Module 18: Fetch probable spill source analysis dossier
    const fetchSourceAnalysis = async () => {
      try {
        setLoadingSourceAnalysis(true);
        const src = await apiService.getSourceAnalysis(selectedIncident.id);
        if (!isCancelled) setSourceAnalysisData(src);
      } catch {
        if (!isCancelled) setSourceAnalysisData(null);
      } finally {
        if (!isCancelled) setLoadingSourceAnalysis(false);
      }
    };

    // 13. Module 21: Fetch economic damage assessment
    const fetchEconomic = async () => {
      try {
        setLoadingEconomic(true);
        const econ = await apiService.getEconomicImpact(selectedIncident.id, economicCurrency);
        if (!isCancelled) setEconomicImpact(econ);
      } catch {
        if (!isCancelled) setEconomicImpact(null);
      } finally {
        if (!isCancelled) setLoadingEconomic(false);
      }
    };

    // 14. Module 22: Fetch environmental recovery predictions
    const fetchRecovery = async () => {
      try {
        setLoadingRecovery(true);
        const rec = await apiService.getEnvironmentalRecovery(selectedIncident.id);
        if (!isCancelled) setRecoveryData(rec);
      } catch {
        if (!isCancelled) setRecoveryData(null);
      } finally {
        if (!isCancelled) setLoadingRecovery(false);
      }
    };

    // 15. Module 23: Fetch incident smart alerts
    const fetchAlerts = async () => {
      try {
        setLoadingAlerts(true);
        const res = await apiService.getIncidentAlerts(selectedIncident.id);
        if (!isCancelled) setIncidentAlerts(res.alerts || []);
      } catch {
        if (!isCancelled) setIncidentAlerts([]);
      } finally {
        if (!isCancelled) setLoadingAlerts(false);
      }
    };

    fetchRisk();
    fetchZones();
    fetchEvents();
    fetchSuspects();
    fetchMovement();
    fetchEcosystem();
    fetchCoastal();
    fetchRouting();
    fetchCleanup();
    fetchResources();
    fetchVerification();
    fetchSourceAnalysis();
    fetchEconomic();
    fetchRecovery();
    fetchAlerts();

    return () => {
      isCancelled = true;
    };
  }, [selectedIncident?.id]);

  // Module 16 Handlers
  const handleOpenDispatchModal = (rec: RecommendedResourceItem) => {
    setDispatchModalResource(rec);
    setDispatchQuantity(1);
    setDispatchOperationalUnit("Sector Alpha Response Group");
    setDispatchAssignmentNotes(
      `Authorized dispatch for incident containment. Priority: ${rec.match_priority}. Allocation score: ${rec.allocation_score}/100. ${rec.allocation_rationale}`
    );
  };

  const handleConfirmDispatch = async () => {
    if (!selectedIncident || !dispatchModalResource) return;
    try {
      setDispatchingResource(true);
      await apiService.assignResourceToIncident(selectedIncident.id, {
        resource_id: dispatchModalResource.resource.id,
        quantity: Number(dispatchQuantity) || 1,
        assigned_by: "Operations Commander",
        notes: `${dispatchOperationalUnit ? `[${dispatchOperationalUnit}] ` : ""}${dispatchAssignmentNotes || ""}`.trim() || undefined,
      });

      setActionSuccess(`✓ [DISPATCHED] ${dispatchModalResource.resource.name} assigned to incident. Logged to audit timeline.`);
      setTimeout(() => setActionSuccess(null), 4000);

      // Refresh incident resources and event timeline
      const [newRes, newEvts] = await Promise.all([
        apiService.getIncidentResources(selectedIncident.id),
        apiService.getIncidentEvents(selectedIncident.id),
      ]);
      setIncidentResources(newRes);
      setIncidentEvents(newEvts);
      setDispatchModalResource(null);
    } catch (e: any) {
      alert(`Dispatch failed: ${e.message || "Request failed"}`);
    } finally {
      setDispatchingResource(false);
    }
  };

  const handleUpdateAssignmentStatus = async (
    assignmentId: string,
    targetStatus: "DEPLOYED" | "ASSIGNED"
  ) => {
    if (!selectedIncident) return;
    try {
      await apiService.updateResourceAssignment(assignmentId, {
        status: targetStatus,
        notes: `Operational state updated to ${targetStatus} on scene.`,
      });
      setActionSuccess(`✓ Resource status updated to ${targetStatus}.`);
      setTimeout(() => setActionSuccess(null), 4000);

      const [newRes, newEvts] = await Promise.all([
        apiService.getIncidentResources(selectedIncident.id),
        apiService.getIncidentEvents(selectedIncident.id),
      ]);
      setIncidentResources(newRes);
      setIncidentEvents(newEvts);
    } catch (e: any) {
      alert(`Status update failed: ${e.message || "Request failed"}`);
    }
  };

  const handleReleaseAssignment = async (assignmentId: string, resourceName: string) => {
    if (!selectedIncident) return;
    if (!window.confirm(`Release ${resourceName} back to available emergency pool?`)) return;
    try {
      setReleasingAssignmentId(assignmentId);
      await apiService.releaseResourceAssignment(
        assignmentId,
        "Incident commander order: response phase completed; resource demobilized."
      );
      setActionSuccess(`✓ ${resourceName} released back to available fleet inventory.`);
      setTimeout(() => setActionSuccess(null), 4000);

      const [newRes, newEvts] = await Promise.all([
        apiService.getIncidentResources(selectedIncident.id),
        apiService.getIncidentEvents(selectedIncident.id),
      ]);
      setIncidentResources(newRes);
      setIncidentEvents(newEvts);
    } catch (e: any) {
      alert(`Failed to release resource: ${e.message || "Request failed"}`);
    } finally {
      setReleasingAssignmentId(null);
    }
  };

  // Module 17: Multi-Source Verification Handlers
  const handleReevaluateVerification = async () => {
    if (!selectedIncident) return;
    try {
      setRecalculatingVerification(true);
      const res = await apiService.evaluateIncidentVerification(selectedIncident.id, { force_recalculate: true });
      setVerificationData(res);
      setActionSuccess(`✓ [CONSENSUS RECALCULATED] Verification score updated: ${res.overall_confidence_score}% (${res.decision}).`);
      if (res.decision !== selectedIncident.status && (res.decision === "VERIFIED" || res.decision === "REJECTED")) {
        setSelectedIncident((prev) => prev ? { ...prev, status: res.decision as IncidentStatus } : null);
        setIncidents((prev) => prev.map((inc) => inc.id === selectedIncident.id ? { ...inc, status: res.decision as IncidentStatus } : inc));
      }
      const evts = await apiService.getIncidentEvents(selectedIncident.id);
      setIncidentEvents(evts);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to re-evaluate multi-source verification.");
    } finally {
      setRecalculatingVerification(false);
    }
  };

  const handleOpenAddEvidenceModal = () => {
    setEvidenceSourceCode("DRONE");
    setEvidenceProviderName("Coast Guard UAV Alpha-1");
    setEvidenceConfidence(88);
    setEvidenceQualityScore(95);
    setEvidenceType("UAV_THERMAL_SURVEILLANCE");
    setEvidenceAgreesWithSpill(true);
    setEvidenceDataOrigin("LIVE");
    setEvidenceNotes("Thermal multispectral imaging confirms distinct surface sheen pattern matching satellite anomaly footprint.");
    setShowAddEvidenceModal(true);
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    try {
      setSubmittingEvidence(true);
      const res = await apiService.addIncidentEvidence(selectedIncident.id, {
        source_code: evidenceSourceCode,
        provider_name: evidenceProviderName || "Field Observer",
        confidence: Number(evidenceConfidence) / 100,
        quality_score: Number(evidenceQualityScore) / 100,
        evidence_type: evidenceType || "MANUAL_EVIDENCE_SUBMISSION",
        agrees_with_spill: evidenceAgreesWithSpill,
        data_origin: evidenceDataOrigin,
        notes: evidenceNotes,
      });
      setVerificationData(res);
      setShowAddEvidenceModal(false);
      setActionSuccess(`✓ Field evidence recorded from [${evidenceSourceCode}]. Consensus updated to ${res.overall_confidence_score}%.`);
      const evts = await apiService.getIncidentEvents(selectedIncident.id);
      setIncidentEvents(evts);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to submit field evidence.");
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const handleOpenOverrideModal = () => {
    if (!verificationData) return;
    setOverrideDecision(verificationData.decision || "VERIFIED");
    setOverrideNotes("Confirmed ground truth via high-resolution aerial inspection and maritime patrol corroboration.");
    setOverrideOperator("Capt. R. Sharma (Incident Commander)");
    setShowOverrideModal(true);
  };

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    if (!overrideNotes.trim()) {
      alert("Authorizing remarks and justification are mandatory for manual decision override.");
      return;
    }
    try {
      setSubmittingOverride(true);
      const res = await apiService.overrideVerificationDecision(selectedIncident.id, {
        decision: overrideDecision,
        decision_notes: overrideNotes.trim(),
        operator_name: overrideOperator.trim() || "Incident Commander",
      });
      setVerificationData(res);
      setShowOverrideModal(false);
      if (res.decision !== selectedIncident.status) {
        setSelectedIncident((prev) => prev ? { ...prev, status: res.decision as IncidentStatus } : null);
        setIncidents((prev) => prev.map((inc) => inc.id === selectedIncident.id ? { ...inc, status: res.decision as IncidentStatus } : inc));
      }
      setActionSuccess(`✓ [COMMAND OVERRIDE] Decision overridden to ${res.decision}. Incident status synchronized.`);
      const evts = await apiService.getIncidentEvents(selectedIncident.id);
      setIncidentEvents(evts);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to override verification decision.");
    } finally {
      setSubmittingOverride(false);
    }
  };

  // Module 18: Probable Spill Source Analyzer Handlers
  const handleRecalculateSourceAnalysis = async (lookback?: number) => {
    if (!selectedIncident) return;
    try {
      setRecalculatingSourceAnalysis(true);
      const hours = lookback ?? sourceLookbackHours;
      const res = await apiService.evaluateSourceAnalysis(selectedIncident.id, {
        lookback_hours: hours,
        force_recalculate: true,
      });
      setSourceAnalysisData(res);
      setActionSuccess(`✓ [SOURCE ANALYZED] Reverse trajectory computed (${res.overall_confidence_percentage}% confidence, ${res.candidates.length} candidate regions).`);
      const evts = await apiService.getIncidentEvents(selectedIncident.id);
      setIncidentEvents(evts);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to recalculate probable spill source analysis.");
    } finally {
      setRecalculatingSourceAnalysis(false);
    }
  };

  // Module 21: Economic Damage Estimator Handlers
  const handleRecalculateEconomic = async (overrideCurrency?: "INR" | "USD") => {
    if (!selectedIncident) return;
    try {
      setRecalculatingEconomic(true);
      const curr = overrideCurrency ?? economicCurrency;
      const res = await apiService.calculateEconomicImpact(selectedIncident.id, {
        currency: curr,
        custom_assumptions: editingAssumptions,
      });
      setEconomicImpact(res);
      setEconomicCurrency(curr);
      setShowAssumptionsModal(false);
      setActionSuccess(`✓ [ECONOMIC ESTIMATE] Total loss calculated: ${res.total_formatted} (${res.categories.length} sectors evaluated).`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to calculate economic damage impact.");
    } finally {
      setRecalculatingEconomic(false);
    }
  };

  const handleOpenAssumptionsModal = async () => {
    try {
      const prof = await apiService.getEconomicAssumptions();
      setAssumptionsData(prof);
      setEditingAssumptions({
        cleanup_cost_per_km2: prof.cleanup_cost_per_km2,
        shoreline_cleanup_per_km: prof.shoreline_cleanup_per_km,
        fisheries_daily_value_per_km2: prof.fisheries_daily_value_per_km2,
        fisheries_recovery_days_default: prof.fisheries_recovery_days_default,
        tourism_daily_value_per_km: prof.tourism_daily_value_per_km,
        tourism_disruption_days_default: prof.tourism_disruption_days_default,
        business_daily_loss_per_km: prof.business_daily_loss_per_km,
        business_disruption_days_default: prof.business_disruption_days_default,
        infrastructure_daily_loss_per_facility: prof.infrastructure_daily_loss_per_facility,
        infrastructure_disruption_days_default: prof.infrastructure_disruption_days_default,
        other_ecosystem_remediation_per_point: prof.other_ecosystem_remediation_per_point,
        exchange_rate_usd_to_inr: prof.exchange_rate_usd_to_inr,
      });
      setShowAssumptionsModal(true);
    } catch (err: any) {
      setError(err.message || "Could not load economic assumptions profile.");
    }
  };

  // Module 22: Environmental Recovery Handlers
  const handleRecalculateRecovery = async () => {
    if (!selectedIncident) return;
    try {
      setRecalculatingRecovery(true);
      const res = await apiService.calculateEnvironmentalRecovery(selectedIncident.id);
      setRecoveryData(res);
      setActionSuccess(`✓ [RECOVERY] Trajectories updated: 24M Composite Recovery at ${res.overall_recovery_index_24m}% across 5 biomes.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to recalculate environmental recovery.");
    } finally {
      setRecalculatingRecovery(false);
    }
  };

  const handleConfirmLifecycleTransition = async () => {
    if (!selectedIncident) return;
    try {
      setTransitioningRecovery(true);
      const res = await apiService.transitionIncidentToRecovery(selectedIncident.id, {
        new_status: "RECOVERY",
        authorizing_officer: transitionOfficer,
        transition_notes: transitionNotes,
      });
      setSelectedIncident((prev) => (prev ? { ...prev, status: "RECOVERY" as IncidentStatus } : prev));
      setIncidents((prev) =>
        prev.map((i) => (i.id === selectedIncident.id ? { ...i, status: "RECOVERY" as IncidentStatus } : i))
      );
      setShowTransitionModal(false);
      setActionSuccess(`✓ [LIFECYCLE TRANSITION] Incident advanced to RECOVERY stage by ${res.authorizing_officer}.`);
      // Refresh audit events
      const evts = await apiService.getIncidentEvents(selectedIncident.id);
      setIncidentEvents(evts);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to transition incident lifecycle to recovery.");
    } finally {
      setTransitioningRecovery(false);
    }
  };

  // Module 23: Smart Alert and Restriction Handlers
  const handleIncidentEvaluateAlerts = async () => {
    if (!selectedIncident) return;
    try {
      setEvaluatingAlerts(true);
      const generated = await apiService.generateAlerts({ incident_id: selectedIncident.id, force_recheck: true });
      setIncidentAlerts(generated);
      const evts = await apiService.getIncidentEvents(selectedIncident.id);
      setIncidentEvents(evts);
      setActionSuccess(`✓ [SMART ALERTS] Telemetry evaluated: ${generated.length} operational alerts synchronized.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to evaluate incident alerts.");
    } finally {
      setEvaluatingAlerts(false);
    }
  };

  const handleIncidentAcknowledgeAlert = async (alertId: string) => {
    try {
      const updated = await apiService.acknowledgeAlert(alertId, {
        operator_name: "Incident Command Officer",
        notes: "Acknowledged from incident operations dossier.",
      });
      setIncidentAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (selectedIncident) {
        const evts = await apiService.getIncidentEvents(selectedIncident.id);
        setIncidentEvents(evts);
      }
      setActionSuccess(`✓ Alert ${updated.alert_type} acknowledged.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to acknowledge alert.");
    }
  };

  const handleIncidentConfirmRestriction = async (alertId: string, confirmed: boolean) => {
    try {
      const updated = await apiService.confirmRestriction(alertId, {
        operator_name: "Commanding Director",
        confirmed,
        operator_notes: confirmed
          ? "Authorized restriction advisory from incident command dossier."
          : "Rejected advisory based on real-time operational assessment.",
      });
      setIncidentAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (selectedIncident) {
        const evts = await apiService.getIncidentEvents(selectedIncident.id);
        setIncidentEvents(evts);
      }
      setActionSuccess(`✓ Restriction advisory ${confirmed ? "CONFIRMED" : "REJECTED"} for ${updated.restriction_type || updated.alert_type}.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update restriction status.");
    }
  };

  const handleGenerateCleanupPlan = async (forceRecalculate = true) => {
    if (!selectedIncident) return;
    try {
      setGeneratingCleanup(true);
      const res = await apiService.generateCleanupPlan(selectedIncident.id, {
        force_recalculate: forceRecalculate,
      });
      setCleanupPlan(res);
      setActionSuccess(`Smart cleanup plan ${res.plan_code} generated with ${res.recommendations.length} tactical recommendations.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      setError(e.message || "Failed to generate cleanup response plan");
    } finally {
      setGeneratingCleanup(false);
    }
  };

  const handleUpdateRecommendationStatus = async (
    recId: string,
    targetStatus: "ACCEPTED" | "REJECTED"
  ) => {
    if (!selectedIncident || !cleanupPlan) return;
    try {
      const notes = actionNotes[recId] || "";
      const updatedRec = await apiService.updateRecommendationStatus(
        selectedIncident.id,
        recId,
        { status: targetStatus, decision_notes: notes }
      );

      // Update state locally
      setCleanupPlan({
        ...cleanupPlan,
        recommendations: cleanupPlan.recommendations.map((r) =>
          r.id === recId ? updatedRec : r
        ),
      });

      if (targetStatus === "ACCEPTED") {
        setActionSuccess(`✓ Recommendation approved! Action logged to Incident Event Audit Trail.`);
        // Reload events so timeline updates immediately
        apiService.getIncidentEvents(selectedIncident.id).then((evts) => setIncidentEvents(evts)).catch(() => {});
      } else {
        setActionSuccess(`Recommendation declined.`);
      }
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      setError(e.message || "Failed to update recommendation status");
    }
  };

  const handleSelectAndRecalculateRoute = async (vesselId?: string) => {
    if (!selectedIncident) return;
    const targetVesselId = vesselId || selectedVesselId || undefined;
    try {
      if (vesselId) setSelectedVesselId(vesselId);
      setOptimizingRoute(true);
      const res = await apiService.optimizeRoute(selectedIncident.id, {
        vessel_id: targetVesselId,
      });
      const vesselLabel = res.vessel?.name || res.vessel_name || "Emergency Vessel";
      const etaLabel = (res.estimated_travel_time_hours ?? res.total_estimated_hours ?? 0).toFixed(1);
      setActionSuccess(`Optimal nautical response route computed for ${vesselLabel} (~${etaLabel}h ETA)`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      setError(e.message || "Failed to calculate emergency vessel route");
    } finally {
      setOptimizingRoute(false);
    }
  };

  const handleRecalculateCoastalImpact = async () => {
    if (!selectedIncident) return;
    try {
      setRunningCoastal(true);
      const res = await apiService.runCoastalImpactPredict(selectedIncident.id, {
        force_movement_recalculate: true,
      });
      setCoastalImpact(res);
      setActionSuccess("Coastal impact and arrival horizons re-evaluated successfully.");
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      setError(e.message || "Failed to calculate coastal impact");
    } finally {
      setRunningCoastal(false);
    }
  };

  const handleAlertSuspectVessel = async (vessel: SuspectVessel) => {
    if (!selectedIncident) return;
    try {
      setUpdating(true);
      await apiService.dispatchVesselAlert(vessel.id, {
        incident_id: selectedIncident.id,
        alert_type: "MRCC_INTERCEPT_NOTICE",
        officer_notes: `Coast Guard MRCC intercept notice issued for primary suspect ${vessel.name} (${vessel.vessel_type}) with ${vessel.leak_probability_score}% leakage probability.`,
      });
      setActionSuccess(`🚨 Coast Guard MRCC Intercept Notice issued for ${vessel.name}!`);
      const evts = await apiService.getIncidentEvents(selectedIncident.id);
      setIncidentEvents(evts);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to dispatch vessel alert");
    } finally {
      setUpdating(false);
    }
  };

  const filtered = incidents.filter((inc) => {
    const matchesSearch =
      !searchTerm ||
      inc.incident_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.description && inc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSev = severityFilter === "ALL" || inc.severity === severityFilter;
    const matchesStatus = statusFilter === "ALL" || inc.status === statusFilter;
    return matchesSearch && matchesSev && matchesStatus;
  });

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-[#FFF1F2] text-[#C6283D] border-[#F5B5BC]";
      case "HIGH":
        return "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]";
      case "MODERATE":
        return "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]";
      default:
        return "bg-[#EAF6FF] text-[#1268B3] border-[#A9D9F5]";
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF6FF] border border-[#A9D9F5] flex items-center justify-center text-[#1268B3] shadow-xs">
              <Shield className="w-5 h-5 text-[#1268B3]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#17324D] tracking-tight">
                Incident Operations &amp; Intelligence
              </h1>
              <p className="text-xs text-[#5E7183] font-medium mt-0.5">
                Track, coordinate, and review verified oil spill anomalies &amp; emergency responses
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/map"
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <MapPin className="w-4 h-4" />
            <span>Open Geospatial Map</span>
          </Link>
          <button
            onClick={fetchIncidents}
            title="Refresh incidents"
            className="p-2.5 bg-white border border-[#D9E8F2] hover:border-[#1268B3] text-[#5E7183] hover:text-[#1268B3] rounded-xl shadow-xs transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-[#FFF1F2] border border-[#F5B5BC] rounded-xl text-[#C6283D] text-xs flex items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#C6283D] shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchIncidents} className="underline hover:text-[#A51D30] shrink-0 font-bold">Retry</button>
        </div>
      )}

      {/* Main Split Layout: Incidents List (Left) + Detail Profile (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Filter & Incident List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search & Filters */}
          <div className="glass-card p-3.5 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8A9AA8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search incident code or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] placeholder-[#8A9AA8] focus:outline-none focus:border-[#1268B3] transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="w-full py-1.5 px-2.5 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div className="flex-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full py-1.5 px-2.5 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DETECTED">Detected</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="PRIORITIZED">Prioritized</option>
                  <option value="RESPONSE_IN_PROGRESS">Response Active</option>
                  <option value="MONITORING">Monitoring</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Incidents Scrollable List */}
          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#5E7183] text-xs">
                <div className="w-6 h-6 border-2 border-[#1268B3] border-t-transparent rounded-full animate-spin mb-2" />
                <span>Loading active incidents...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-card p-8 text-center text-xs text-[#5E7183]">
                No incidents match the active filters.
              </div>
            ) : (
              filtered.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`glass-card p-3.5 cursor-pointer transition-all duration-150 relative ${
                      isSelected
                        ? "border-[#1268B3] bg-[#EAF6FF] shadow-sm -translate-y-0.5"
                        : "bg-white hover:border-[#1268B3] hover:bg-[#F3FAFE]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Flame
                          className={`w-4 h-4 shrink-0 ${
                            inc.severity === "CRITICAL"
                              ? "text-[#C6283D]"
                              : inc.severity === "HIGH"
                              ? "text-[#A86A00]"
                              : inc.severity === "MODERATE"
                              ? "text-[#A86A00]"
                              : "text-[#1268B3]"
                          }`}
                        />
                        <span className="font-extrabold text-xs text-[#17324D]">
                          {inc.incident_code}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getSeverityBadge(
                            inc.severity
                          )}`}
                        >
                          {inc.severity}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-black text-[#0B3A66]">
                          {inc.risk_score != null ? Number(inc.risk_score).toFixed(1) : "--"}
                        </span>
                        <span className="text-[10px] text-[#5E7183] ml-1 font-medium">Risk</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#5E7183] mt-1.5 line-clamp-2 leading-relaxed">
                      {inc.description || "Automated SAR anomaly detected."}
                    </p>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#D9E8F2] text-[10px] text-[#5E7183]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#17324D] font-bold">
                          {inc.spill_area_km2 ? `${inc.spill_area_km2} km²` : "Area N/A"}
                        </span>
                        <span>•</span>
                        <span className="capitalize text-[#087F68] font-bold">
                          {inc.status.toLowerCase().replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-[#5E7183] font-mono">
                        {inc.latitude != null ? Number(inc.latitude).toFixed(2) : "--"}°N, {inc.longitude != null ? Number(inc.longitude).toFixed(2) : "--"}°E
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Incident Detailed Dossier (7 cols) */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <div className="bg-white p-6 rounded-2xl border border-[#D9E8F2] shadow-sm space-y-6">
              {/* Dossier Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[#EAF3F8]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-[#0B3A66]">
                      {selectedIncident.incident_code}
                    </h2>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border ${getSeverityBadge(
                        selectedIncident.severity
                      )}`}
                    >
                      {selectedIncident.severity} SEVERITY
                    </span>
                    <span className="badge badge-success text-[11px]">
                      {selectedIncident.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-[#5E7183] mt-1">
                    System Record ID: <span className="font-mono text-[#17324D] font-semibold">{selectedIncident.id}</span>
                  </p>
                </div>

                <Link
                  to={`/map?incidentId=${selectedIncident.id}`}
                  className="btn-primary text-xs flex items-center gap-1.5 shrink-0"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Inspect on Map</span>
                </Link>
              </div>

              {/* Operational Action Feedback */}
              {actionSuccess && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Emergency Operations Command Controls */}
              <div className="p-3.5 rounded-xl bg-[#F8FBFE] border border-[#D9E8F2] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B3A66] uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#1268B3]" />
                    Emergency Operations Command
                  </span>
                  {updating && (
                    <span className="text-[11px] text-[#A86A00] flex items-center gap-1 animate-pulse">
                      Updating incident record...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Status update */}
                  <div>
                    <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1">
                      Change Status
                    </label>
                    <select
                      value={selectedIncident.status}
                      disabled={updating}
                      onChange={(e) => handleUpdateStatus(e.target.value as IncidentStatus)}
                      className="w-full py-1.5 px-2 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] font-medium focus:outline-none focus:border-[#1268B3] cursor-pointer shadow-xs"
                    >
                      <option value="DETECTED">Detected</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="PRIORITIZED">Prioritized</option>
                      <option value="RESPONSE_IN_PROGRESS">Response Active</option>
                      <option value="MONITORING">Monitoring</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>

                  {/* Severity update */}
                  <div>
                    <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1">
                      Classify Severity
                    </label>
                    <select
                      value={selectedIncident.severity}
                      disabled={updating}
                      onChange={(e) => handleUpdateSeverity(e.target.value as IncidentSeverity)}
                      className="w-full py-1.5 px-2 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] font-medium focus:outline-none focus:border-[#1268B3] cursor-pointer shadow-xs"
                    >
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MODERATE">Moderate</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  {/* Deploy Containment Button */}
                  <div className="flex items-end">
                    <button
                      onClick={() => setShowDispatchModal(true)}
                      disabled={updating}
                      className="w-full py-1.5 px-3 bg-[#0B3A66] hover:bg-[#0F4C81] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Deploy Response</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Key Quantitative Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-[#D9E8F2] text-center shadow-sm">
                  <div className="text-[10px] uppercase text-[#5E7183] font-semibold tracking-wider">
                    Calculated Risk
                  </div>
                  <div className="text-xl font-extrabold text-[#A86A00] font-mono mt-1">
                    {selectedIncident.risk_score != null ? Number(selectedIncident.risk_score).toFixed(1) : "N/A"}
                  </div>
                  <div className="text-[9px] text-[#8A9AA8]">Scale 0 - 100</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#D9E8F2] text-center shadow-sm">
                  <div className="text-[10px] uppercase text-[#5E7183] font-semibold tracking-wider">
                    Estimated Spill Area
                  </div>
                  <div className="text-xl font-extrabold text-[#17324D] font-mono mt-1">
                    {selectedIncident.spill_area_km2 ? `${selectedIncident.spill_area_km2}` : "N/A"}
                  </div>
                  <div className="text-[9px] text-[#8A9AA8]">Square Kilometers</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#D9E8F2] text-center shadow-sm">
                  <div className="text-[10px] uppercase text-[#5E7183] font-semibold tracking-wider">
                    AI Confidence
                  </div>
                  <div className="text-xl font-extrabold text-[#087F68] font-mono mt-1">
                    {selectedIncident.detection_confidence
                      ? `${(selectedIncident.detection_confidence * 100).toFixed(0)}%`
                      : "N/A"}
                  </div>
                  <div className="text-[9px] text-[#8A9AA8]">SAR / Optical model</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#D9E8F2] text-center shadow-sm">
                  <div className="text-[10px] uppercase text-[#5E7183] font-semibold tracking-wider">
                    Sensor Source
                  </div>
                  <div className="text-sm font-bold text-[#0B3A66] mt-2 truncate">
                    {selectedIncident.source || "SENTINEL-1 SAR"}
                  </div>
                  <div className="text-[9px] text-[#8A9AA8]">Copernicus feed</div>
                </div>
              </div>

              {/* Geographic Coordinates & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3.5 rounded-xl border border-[#D9E8F2] space-y-1.5 shadow-sm">
                  <span className="text-[11px] font-semibold text-[#0B3A66] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#1268B3]" />
                    Geographic Location
                  </span>
                  <div className="text-xs font-mono text-[#17324D]">
                    Latitude: {selectedIncident.latitude?.toFixed(4)}° N
                  </div>
                  <div className="text-xs font-mono text-[#17324D]">
                    Longitude: {selectedIncident.longitude?.toFixed(4)}° E
                  </div>
                  <div className="text-[10px] text-[#5E7183] mt-1">
                    Polygon Geometry: PostGIS MultiPolygon recorded
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#D9E8F2] space-y-1.5 shadow-sm">
                  <span className="text-[11px] font-semibold text-[#0B3A66] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#1268B3]" />
                    Detection Timeline
                  </span>
                  <div className="text-xs text-[#17324D]">
                    Recorded: {new Date(selectedIncident.created_at).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#5E7183]">
                    Active Status: {selectedIncident.is_active ? "Live Case" : "Archived"}
                  </div>
                  <div className="text-[10px] text-[#A86A00] mt-1">
                    SIH Simulation Demo Dataset
                  </div>
                </div>
              </div>

              {/* Explainable Risk Factor Breakdown */}
              <div className="bg-white p-4 rounded-xl border border-[#D9E8F2] space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#1268B3]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B3A66]">
                      Explainable Risk Attribution Breakdown
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] border border-[#D9E8F2] font-mono">
                      AI-Assisted
                    </span>
                  </div>
                  <Link
                    to={`/risk?incidentId=${selectedIncident.id}`}
                    className="text-xs text-[#1268B3] hover:text-[#0B3A66] flex items-center gap-1 font-medium"
                  >
                    <span>Full Risk Studio</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {loadingRisk ? (
                  <div className="py-6 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#1268B3] border-t-transparent rounded-full animate-spin" />
                    <span>Calculating multi-factor risk attribution...</span>
                  </div>
                ) : riskAssessment ? (
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-lg bg-[#F8FBFE] border border-[#D9E8F2] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase text-[#5E7183] font-semibold">Attributed Severity Reason</span>
                        <p className="text-xs font-semibold text-[#17324D] mt-0.5">
                          Why this incident is classified as{" "}
                          <span
                            className={
                              riskAssessment.severity === "CRITICAL"
                                ? "text-[#C6283D] font-bold"
                                : riskAssessment.severity === "HIGH"
                                ? "text-[#A86A00] font-bold"
                                : "text-[#1268B3] font-bold"
                            }
                          >
                            {riskAssessment.severity}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-[#A86A00] font-mono">
                          {riskAssessment.risk_score.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-[#5E7183] ml-1">/ 100</span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {riskAssessment.factors.map((f) => (
                        <div key={f.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#17324D] font-medium">{f.name}</span>
                            <span className="font-mono text-[#17324D]">
                              {f.score.toFixed(1)} / {f.max_score.toFixed(0)}{" "}
                              <span className="text-[10px] text-[#5E7183]">
                                ({f.percentage.toFixed(0)}%)
                              </span>
                            </span>
                          </div>
                          <div className="w-full bg-[#EAF3F8] rounded-full h-1.5 overflow-hidden border border-[#D9E8F2]">
                            <div
                              className={`h-full rounded-full ${
                                f.percentage > 70
                                  ? "bg-[#C6283D]"
                                  : f.percentage > 40
                                  ? "bg-[#A86A00]"
                                  : "bg-[#1268B3]"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, f.percentage))}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-[#5E7183] italic">{f.reason}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#D9E8F2] text-[10px] text-[#5E7183] flex items-center justify-between">
                      <span>Confidence factor applied: {((riskAssessment.confidence_applied ?? 1.0) * 100).toFixed(0)}%</span>
                      <span className="truncate max-w-[280px]" title={riskAssessment.disclaimer || riskAssessment.model_disclaimer}>
                        {riskAssessment.disclaimer || riskAssessment.model_disclaimer || "AI-assisted risk assessment model"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#5E7183] py-3 text-center">
                    No cached risk assessment available. Automatic calculation runs on incident update.
                  </div>
                )}
              </div>

              {/* Suspect Vessel Attribution & AIS Trajectory Analysis */}
              <div className="bg-white p-4.5 rounded-xl border border-[#D9E8F2] shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#C6283D]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#17324D]">
                      Suspect Vessel Attribution &amp; AIS Trajectory Analysis
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] font-mono font-bold border border-[#A9D9F5]">
                      AIS Correlated
                    </span>
                  </div>
                  <Link
                    to={`/map?incidentId=${selectedIncident.id}`}
                    className="text-xs text-[#1268B3] hover:text-[#0F4C81] flex items-center gap-1 font-bold"
                  >
                    <span>View Tracks on Map</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <p className="text-[11px] text-[#5E7183] leading-relaxed">
                  Correlates historical AIS vessel trajectories through this spill location. Ships are ranked by algorithmic probability of oil leakage based on track intersection, operational speed drops, and hazardous cargo.
                </p>

                {loadingSuspects ? (
                  <div className="py-6 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#1268B3] border-t-transparent rounded-full animate-spin" />
                    <span>Correlating transiting commercial ships with spill coordinates...</span>
                  </div>
                ) : suspectData && suspectData.suspects.length > 0 ? (
                  <div className="space-y-3">
                    {/* Primary Suspect Highlight Banner */}
                    {suspectData.primary_suspect && (
                      <div className="p-4 rounded-xl bg-[#FFF1F2] border border-[#F5B5BC] shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-black text-[#17324D]">
                                {suspectData.primary_suspect.name}
                              </span>
                              <span className="text-xs font-mono text-[#5E7183]">
                                {suspectData.primary_suspect.flag}
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#C6283D] text-white shadow-xs">
                                #1 PRIMARY SUSPECT
                              </span>
                            </div>
                            <div className="text-xs text-[#5E7183] mt-1 font-medium">
                              {suspectData.primary_suspect.vessel_type} • IMO: <span className="font-mono text-[#17324D] font-bold">{suspectData.primary_suspect.imo}</span> • MMSI: <span className="font-mono text-[#17324D] font-bold">{suspectData.primary_suspect.mmsi}</span>
                            </div>
                            <div className="text-[11px] text-[#5E7183] mt-0.5">
                              Cargo: <span className="text-[#0B3A66] font-bold">{suspectData.primary_suspect.cargo_type}</span> ({suspectData.primary_suspect.deadweight_tonnage.toLocaleString()} DWT)
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] uppercase text-[#C6283D] font-bold tracking-wider">Leakage Probability</div>
                            <div className="text-3xl font-black text-[#C6283D] font-mono tracking-tight">
                              {suspectData.primary_suspect.leak_probability_score.toFixed(1)}%
                            </div>
                            <div className="text-[9px] text-[#C6283D]/80 font-bold">Highest Priority Leak</div>
                          </div>
                        </div>

                        {/* Attribution Indicators */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-[#F5B5BC] shadow-xs">
                          <div>
                            <span className="text-[#5E7183] text-[10px] block font-medium">Closest Track Approach:</span>
                            <span className="text-[#087F68] font-mono font-bold">
                              {suspectData.primary_suspect.closest_approach_km} km (Direct Intersection)
                            </span>
                          </div>
                          <div>
                            <span className="text-[#5E7183] text-[10px] block font-medium">Speed at Incident Coordinates:</span>
                            <span className="text-[#A86A00] font-mono font-bold">
                              {suspectData.primary_suspect.speed_at_incident} knots (Severe Deceleration)
                            </span>
                          </div>
                        </div>

                        {/* Anomaly list */}
                        <div className="mt-2.5 space-y-1">
                          {suspectData.primary_suspect.anomaly_indicators.map((anom, idx) => (
                            <div key={idx} className="text-[11px] text-[#17324D] flex items-start gap-1.5 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#C6283D] shrink-0 mt-0.5" />
                              <span>{anom}</span>
                            </div>
                          ))}
                        </div>

                        {/* Tactical response button */}
                        <div className="mt-3 pt-2.5 border-t border-[#F5B5BC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-[10px] text-[#5E7183] italic flex-1">
                            {suspectData.primary_suspect.recommended_action}
                          </p>
                          <button
                            onClick={() => handleAlertSuspectVessel(suspectData.primary_suspect!)}
                            disabled={updating}
                            className="py-1.5 px-3.5 bg-[#C6283D] hover:bg-[#A51D30] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm hover-lift cursor-pointer shrink-0"
                          >
                            <Send className="w-3 h-3" />
                            <span>Issue Coast Guard Intercept Notice</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Secondary & Cleared Vessels Table */}
                    {suspectData.suspects.length > 1 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-[#5E7183] uppercase tracking-wider block">
                          Other Correlated Vessels in Transit Corridor
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {suspectData.suspects.slice(1).map((v) => (
                            <div
                              key={v.id}
                              className="p-3 rounded-xl bg-white border border-[#D9E8F2] hover:border-[#1268B3] transition flex items-start justify-between gap-2 shadow-xs"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-[#17324D]">{v.name}</span>
                                  <span className="text-[10px] text-[#5E7183] font-mono">{v.flag}</span>
                                </div>
                                <div className="text-[10px] text-[#5E7183] mt-0.5">{v.vessel_type}</div>
                                <div className="text-[10px] text-[#5E7183] mt-1">
                                  Passed at <span className="text-[#17324D] font-mono font-semibold">{v.closest_approach_km} km</span> • Speed <span className="text-[#17324D] font-mono font-semibold">{v.speed_at_incident} kn</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                  v.priority_tier === "SECONDARY_SUSPECT"
                                    ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]"
                                    : "bg-[#F3FAFE] text-[#5E7183] border-[#D9E8F2]"
                                }`}>
                                  Rank #{v.suspicion_rank}
                                </span>
                                <div className="text-xs font-mono font-black text-[#0B3A66] mt-1">
                                  {v.leak_probability_score.toFixed(1)}% Prob
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-[#F3FAFE] rounded-xl border border-[#D9E8F2] text-xs text-[#5E7183] text-center">
                    No commercial AIS trajectories intersected this location during detection timeframe.
                  </div>
                )}
              </div>

              {/* GIS Maritime Impact: Nearby Environmental Zones */}
              <div className="bg-white p-4.5 rounded-xl border border-[#D9E8F2] shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#1268B3]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#17324D]">
                      GIS Maritime Proximity &amp; Environmental Impact
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#5E7183] font-medium">50 km radius buffer</span>
                </div>

                {loadingZones ? (
                  <div className="py-4 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#1268B3] border-t-transparent rounded-full animate-spin" />
                    <span>Querying PostGIS spatial layers...</span>
                  </div>
                ) : nearbyZones.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {nearbyZones.map((zone) => (
                        <div
                          key={zone.zone_id}
                          className="p-3 rounded-xl bg-[#F3FAFE] border border-[#D9E8F2] flex items-center justify-between text-xs hover-lift transition"
                        >
                          <div>
                            <div className="font-bold text-[#17324D]">{zone.name}</div>
                            <div className="text-[10px] text-[#5E7183] flex items-center gap-1.5 mt-0.5">
                              <span className="capitalize">{zone.zone_type.toLowerCase().replace(/_/g, " ")}</span>
                              <span>•</span>
                              <span className={`font-bold ${
                                zone.sensitivity === "CRITICAL" ? "text-[#C6283D]" :
                                zone.sensitivity === "HIGH" ? "text-[#A86A00]" : "text-[#A86A00]"
                              }`}>{zone.sensitivity}</span>
                            </div>
                          </div>
                          <div className="font-mono font-black text-[#0B3A66] text-xs">
                            {zone.distance_km.toFixed(1)} km
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#F3FAFE] rounded-xl border border-[#D9E8F2] text-xs text-[#5E7183] text-center">
                    No designated marine reserves or fishing zones within 50 km radius.
                  </div>
                )}
              </div>

              {/* Module 11: Spill Movement Predictor Panel */}
              <div className="bg-white p-4.5 rounded-xl border border-[#D9E8F2] shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#1268B3]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#17324D]">
                      Oil Spill Movement Predictor
                    </h3>
                    <span className="text-[10px] bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] px-2 py-0.5 rounded font-bold font-mono">
                      MODULE 11
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!selectedIncident) return;
                      setRunningMovement(true);
                      try {
                        const res = await apiService.runMovementPrediction(selectedIncident.id, {});
                        setMovementPrediction(res);
                        setActionSuccess("Movement trajectory recalculated!");
                        setTimeout(() => setActionSuccess(null), 3000);
                      } catch (e: any) {
                        setError(e.message || "Failed to run movement prediction");
                      } finally {
                        setRunningMovement(false);
                      }
                    }}
                    disabled={runningMovement}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#1268B3] hover:bg-[#0F4C81] text-white shadow-sm transition hover-lift disabled:opacity-50 disabled:cursor-wait"
                  >
                    {runningMovement ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Wind className="w-3.5 h-3.5" />
                    )}
                    <span>{runningMovement ? "Running..." : "Re-run Forecast"}</span>
                  </button>
                </div>

                {loadingMovement ? (
                  <div className="py-6 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#1268B3] border-t-transparent rounded-full animate-spin" />
                    <span>Computing Lagrangian drift trajectory...</span>
                  </div>
                ) : movementPrediction ? (
                  <div className="space-y-3.5">
                    {/* Environmental conditions row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-[#F3FAFE] p-3 rounded-xl border border-[#D9E8F2] shadow-xs">
                        <div className="text-[10px] text-[#5E7183] uppercase font-bold tracking-wider mb-1">Wind Speed</div>
                        <div className="font-mono font-black text-base text-[#0B3A66]">
                          {movementPrediction.environmental_conditions.wind_speed_ms.toFixed(1)}
                          <span className="text-[10px] text-[#5E7183] font-normal ml-0.5 font-sans">m/s</span>
                        </div>
                      </div>
                      <div className="bg-[#F3FAFE] p-3 rounded-xl border border-[#D9E8F2] shadow-xs">
                        <div className="text-[10px] text-[#5E7183] uppercase font-bold tracking-wider mb-1">Wind Dir</div>
                        <div className="font-mono font-black text-base text-[#0B3A66]">
                          {movementPrediction.environmental_conditions.wind_direction_deg.toFixed(0)}°
                        </div>
                      </div>
                      <div className="bg-[#F3FAFE] p-3 rounded-xl border border-[#D9E8F2] shadow-xs">
                        <div className="text-[10px] text-[#5E7183] uppercase font-bold tracking-wider mb-1">Current</div>
                        <div className="font-mono font-black text-base text-[#1268B3]">
                          {movementPrediction.environmental_conditions.current_speed_ms.toFixed(2)}
                          <span className="text-[10px] text-[#5E7183] font-normal ml-0.5 font-sans">m/s</span>
                        </div>
                      </div>
                      <div className="bg-[#F3FAFE] p-3 rounded-xl border border-[#D9E8F2] shadow-xs">
                        <div className="text-[10px] text-[#5E7183] uppercase font-bold tracking-wider mb-1">Confidence</div>
                        <div className="font-mono font-black text-base text-[#087F68]">
                          {(movementPrediction.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Simulated badge */}
                    {movementPrediction.is_simulated && (
                      <div className="flex items-center gap-1.5 text-[10px] text-[#A86A00] bg-[#FFF8E8] border border-[#F3D58A] rounded-lg px-3 py-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#A86A00]" />
                        <span className="font-bold">SIMULATED DEMO DATA</span>
                        <span className="text-[#A86A00]/80">— {movementPrediction.disclaimer}</span>
                      </div>
                    )}

                    {/* Forecast Horizons Table */}
                    <div className="overflow-x-auto rounded-xl border border-[#D9E8F2] bg-white shadow-xs">
                      <table className="w-full text-xs text-[#17324D]">
                        <thead>
                          <tr className="bg-[#EAF6FF] border-b border-[#D9E8F2]">
                            <th className="text-left px-3 py-2 font-bold text-[10px] uppercase text-[#1268B3]">Horizon</th>
                            <th className="text-right px-3 py-2 font-bold text-[10px] uppercase text-[#5E7183]">Dist (km)</th>
                            <th className="text-right px-3 py-2 font-bold text-[10px] uppercase text-[#5E7183]">Direction</th>
                            <th className="text-right px-3 py-2 font-bold text-[10px] uppercase text-[#5E7183]">Lat/Lon</th>
                            <th className="text-right px-3 py-2 font-bold text-[10px] uppercase text-[#5E7183]">Est. Area</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D9E8F2]">
                          {movementPrediction.forecast_points.map((fp, i) => (
                            <tr key={fp.horizon_hours} className={`${i % 2 === 0 ? "bg-white" : "bg-[#FAFCFE]"} hover:bg-[#F0F7FC] transition`}>
                              <td className="px-3 py-2 font-bold text-[#1268B3] font-mono">
                                +{fp.horizon_hours}h
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-semibold text-[#0B3A66]">
                                {fp.distance_km.toFixed(1)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-[#17324D]">
                                {fp.bearing_cardinal} ({fp.bearing_deg.toFixed(0)}°)
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-[11px] text-[#5E7183]">
                                {fp.latitude.toFixed(3)}, {fp.longitude.toFixed(3)}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-[#0B3A66] font-mono">
                                {fp.estimated_area_km2.toFixed(2)} km²
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="text-[10px] text-[#5E7183] flex items-center gap-2">
                      <span>Model: <strong className="text-[#17324D]">{movementPrediction.model_name}</strong></span>
                      <span>&bull;</span>
                      <span>Run: <span>{new Date(movementPrediction.prediction_time).toLocaleString()}</span></span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#F3FAFE] rounded-xl border border-[#D9E8F2] text-xs text-[#5E7183] text-center">
                    No movement prediction available. Click Re-run Forecast to generate.
                  </div>
                )}
              </div>

              {/* Module 12: Marine Ecosystem Impact Panel */}
              <div className="bg-white p-4.5 rounded-xl border border-[#D9E8F2] shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-[#087F68]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#17324D]">
                      Marine Ecosystem Impact
                    </h3>
                    <span className="text-[10px] bg-[#EAF8F4] text-[#087F68] border border-[#9ADBC8] px-2 py-0.5 rounded font-bold font-mono">
                      MODULE 12
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!selectedIncident) return;
                      setRunningEcosystem(true);
                      try {
                        const res = await apiService.analyzeEcosystemRisk(selectedIncident.id, { radius_km: 500 });
                        setEcosystemRisk(res);
                        setActionSuccess("Ecosystem risk analysis refreshed!");
                        setTimeout(() => setActionSuccess(null), 3000);
                      } catch (e: any) {
                        setError(e.message || "Failed to run ecosystem analysis");
                      } finally {
                        setRunningEcosystem(false);
                      }
                    }}
                    disabled={runningEcosystem}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#1268B3] hover:bg-[#0F4C81] text-white shadow-sm transition hover-lift disabled:opacity-50 disabled:cursor-wait"
                  >
                    {runningEcosystem ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Waves className="w-3.5 h-3.5" />
                    )}
                    <span>{runningEcosystem ? "Analyzing..." : "Re-analyze"}</span>
                  </button>
                </div>

                {loadingEcosystem ? (
                  <div className="py-6 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#1268B3] border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing marine ecosystem exposure...</span>
                  </div>
                ) : ecosystemRisk ? (
                  <div className="space-y-3.5">
                    {/* Overall score + most sensitive zone */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1 bg-[#F3FAFE] p-4 rounded-xl border border-[#D9E8F2] flex flex-col items-center justify-center gap-1 shadow-xs">
                        <div className="text-[10px] text-[#5E7183] uppercase font-bold tracking-wider">Ecosystem Risk</div>
                        <div className="text-3xl font-black font-mono text-[#0B3A66]">
                          {ecosystemRisk.overall_risk_score.toFixed(0)}
                        </div>
                        <div className="text-[10px] text-[#5E7183] font-medium">/ 100 Scale</div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border mt-1 ${
                          ecosystemRisk.overall_severity === "CRITICAL" ? "bg-[#FFF1F2] text-[#C6283D] border-[#F5B5BC]" :
                          ecosystemRisk.overall_severity === "HIGH" ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]" :
                          ecosystemRisk.overall_severity === "MODERATE" ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]" :
                          "bg-[#EAF8F4] text-[#087F68] border-[#9ADBC8]"
                        }`}>
                          {ecosystemRisk.overall_severity}
                        </span>
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <div className="bg-[#F3FAFE] p-3 rounded-xl border border-[#D9E8F2] shadow-xs">
                          <div className="text-[10px] text-[#5E7183] uppercase font-bold tracking-wider mb-0.5">Most Critical Ecosystem</div>
                          <div className="text-sm font-extrabold text-[#17324D] leading-tight">
                            {ecosystemRisk.most_sensitive_zone || "None identified"}
                          </div>
                          {ecosystemRisk.most_sensitive_type && (
                            <div className="text-[11px] text-[#5E7183] mt-0.5 font-medium">{ecosystemRisk.most_sensitive_type}</div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#F3FAFE] p-2.5 rounded-xl border border-[#D9E8F2] shadow-xs">
                            <div className="text-[10px] text-[#5E7183] uppercase font-bold">Zones Analyzed</div>
                            <div className="font-mono font-black text-sm text-[#0B3A66] mt-0.5">{ecosystemRisk.zones_analyzed}</div>
                          </div>
                          <div className="bg-[#F3FAFE] p-2.5 rounded-xl border border-[#D9E8F2] shadow-xs">
                            <div className="text-[10px] text-[#5E7183] uppercase font-bold">Risk Modifier</div>
                            <div className="font-mono font-black text-sm text-[#0B3A66] mt-0.5">+{ecosystemRisk.risk_engine_modifier.toFixed(2)} pts</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Risk Engine modifier note */}
                    <div className="flex items-center gap-2 text-xs text-[#087F68] bg-[#EAF8F4] border border-[#9ADBC8] rounded-xl px-3.5 py-2 font-medium">
                      <Shield className="w-4 h-4 shrink-0 text-[#087F68]" />
                      <span>Ecosystem risk adds <strong className="font-bold text-[#087F68]">+{ecosystemRisk.risk_engine_modifier.toFixed(2)} pts</strong> to Risk Engine environmental score</span>
                    </div>

                    {/* Simulated badge */}
                    {ecosystemRisk.is_simulated && (
                      <div className="flex items-center gap-1.5 text-[10px] text-[#A86A00] bg-[#FFF8E8] border border-[#F3D58A] rounded-lg px-3 py-1.5 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#A86A00]" />
                        <span className="font-bold">SIMULATED DEMO DATA</span>
                        <span className="text-[#A86A00]/80">— Analysis based on simulation zone database</span>
                      </div>
                    )}

                    {/* Zone cards */}
                    {ecosystemRisk.zone_results.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase font-bold text-[#5E7183] tracking-wider">
                          Affected Ecosystem Zones ({ecosystemRisk.zone_results.length})
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {ecosystemRisk.zone_results
                            .slice()
                            .sort((a, b) => b.zone_risk_score - a.zone_risk_score)
                            .map((zone) => (
                            <div
                              key={zone.zone_id}
                              className="p-3.5 rounded-xl bg-white border border-[#D9E8F2] hover:border-[#1268B3] text-xs transition shadow-xs hover-lift"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="font-extrabold text-[#17324D] text-xs truncate">{zone.zone_name}</div>
                                  <div className="text-[10px] text-[#5E7183] mt-0.5 font-medium">{zone.ecosystem_category}</div>
                                  <div className="text-[11px] text-[#5E7183] mt-1 leading-relaxed line-clamp-2">{zone.explanation}</div>
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-1">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                    zone.zone_severity === "CRITICAL" ? "bg-[#FFF1F2] text-[#C6283D] border-[#F5B5BC]" :
                                    zone.zone_severity === "HIGH" ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]" :
                                    zone.zone_severity === "MODERATE" ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]" :
                                    "bg-[#EAF6FF] text-[#1268B3] border-[#A9D9F5]"
                                  }`}>
                                    {zone.zone_severity}
                                  </span>
                                  <div className="text-xs font-mono font-black text-[#0B3A66]">
                                    {zone.zone_risk_score.toFixed(0)}/100
                                  </div>
                                  <div className="text-[10px] text-[#5E7183] font-mono">{zone.distance_km.toFixed(1)} km</div>
                                  {zone.intersects && (
                                    <span className="text-[8px] bg-[#FFF1F2] text-[#C6283D] border border-[#F5B5BC] px-1.5 py-0.5 rounded font-black">
                                      OVERLAP
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Mini score bars */}
                              <div className="mt-2.5 grid grid-cols-3 gap-2 text-[10px] pt-2 border-t border-[#D9E8F2]">
                                <div>
                                  <div className="text-[#5E7183] mb-1 font-medium">Sensitivity</div>
                                  <div className="h-1.5 bg-[#EAF3F8] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#087F68] rounded-full" style={{ width: `${zone.sensitivity_score * 100}%` }} />
                                  </div>
                                  <div className="text-[#087F68] font-mono font-bold mt-0.5">{(zone.sensitivity_score * 100).toFixed(0)}%</div>
                                </div>
                                <div>
                                  <div className="text-[#5E7183] mb-1 font-medium">Exposure</div>
                                  <div className="h-1.5 bg-[#EAF3F8] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#1268B3] rounded-full" style={{ width: `${zone.exposure_score}%` }} />
                                  </div>
                                  <div className="text-[#1268B3] font-mono font-bold mt-0.5">{zone.exposure_score.toFixed(0)}%</div>
                                </div>
                                <div>
                                  <div className="text-[#5E7183] mb-1 font-medium">Proximity</div>
                                  <div className="h-1.5 bg-[#EAF3F8] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#168DCC] rounded-full" style={{ width: `${zone.proximity_score}%` }} />
                                  </div>
                                  <div className="text-[#168DCC] font-mono font-bold mt-0.5">{zone.proximity_score.toFixed(0)}%</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-[#5E7183] flex items-center gap-2">
                      <span>Model: <strong className="text-[#17324D]">{ecosystemRisk.model_name}</strong></span>
                      <span>&bull;</span>
                      <span>Run: <span>{new Date(ecosystemRisk.analyzed_at).toLocaleString()}</span></span>
                      <span>&bull;</span>
                      <span>Radius: <span>{ecosystemRisk.radius_km_used} km</span></span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#F3FAFE] rounded-xl border border-[#D9E8F2] text-xs text-[#5E7183] text-center">
                    No ecosystem risk data available. Click Re-analyze to generate.
                  </div>
                )}
              </div>

              {/* ── MODULE 13: COASTAL IMPACT PREDICTOR & TIME-TO-IMPACT ── */}
              <div className="bg-white p-4 rounded-xl border border-[#D9E8F2] space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#EAF3F8] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#EAF6FF] border border-[#A9D9F5] text-[#1268B3]">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] uppercase tracking-wider">
                          Module 13
                        </span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#17324D]">
                          Coastal Impact Predictor & Time-to-Impact
                        </h3>
                      </div>
                      <p className="text-[11px] text-[#5E7183] mt-0.5">
                        Shoreline arrival horizons, threatened beaches, ports, settlements & infrastructure
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRecalculateCoastalImpact}
                      disabled={runningCoastal}
                      className="px-2.5 py-1 text-xs rounded-lg bg-[#1268B3] hover:bg-[#0F4C81] text-white border border-[#1268B3] transition-all flex items-center gap-1.5 disabled:opacity-50 font-medium shadow-xs"
                      title="Re-run coastal trajectory intersection & arrival time calculation"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${runningCoastal ? "animate-spin" : ""}`} />
                      <span>{runningCoastal ? "Calculating..." : "Recalculate Impact"}</span>
                    </button>
                  </div>
                </div>

                {loadingCoastal ? (
                  <div className="py-6 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#1268B3] border-t-transparent rounded-full animate-spin" />
                    <span>Evaluating coastal trajectory intersection and arrival horizons...</span>
                  </div>
                ) : coastalImpact ? (
                  <div className="space-y-4">
                    {/* Urgency & Earliest Impact Hero Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-[#F3FAFE] p-3 rounded-lg border border-[#A9D9F5]">
                        <div className="text-[10px] text-[#1268B3] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Earliest Impact</span>
                        </div>
                        <div className="text-xl font-mono font-extrabold mt-1 text-[#0B3A66]">
                          {coastalImpact.earliest_impact_hours !== null && coastalImpact.earliest_impact_hours !== undefined ? (
                            <span>~{coastalImpact.earliest_impact_hours.toFixed(1)}h</span>
                          ) : (
                            <span className="text-[#8A9AA8] text-sm">None (&gt;24h)</span>
                          )}
                        </div>
                        <div className="text-[9px] text-[#5E7183] mt-0.5">Estimated arrival time</div>
                      </div>

                      <div className="bg-[#F3FAFE] p-3 rounded-lg border border-[#D9E8F2]">
                        <div className="text-[10px] text-[#5E7183] uppercase font-bold">First Contact Target</div>
                        <div className="text-xs font-bold text-[#17324D] mt-1 truncate" title={coastalImpact.earliest_impact_location || "None"}>
                          {coastalImpact.earliest_impact_location || "None within 24h"}
                        </div>
                        {coastalImpact.earliest_impact_type && (
                          <div className="text-[10px] text-[#1268B3] font-medium mt-0.5">
                            {coastalImpact.earliest_impact_type.replace(/_/g, " ")}
                          </div>
                        )}
                      </div>

                      <div className="bg-[#F3FAFE] p-3 rounded-lg border border-[#D9E8F2]">
                        <div className="text-[10px] text-[#5E7183] uppercase font-bold">Coastal Severity</div>
                        <div className="mt-1">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                            coastalImpact.overall_coastal_severity === "CRITICAL" ? "bg-[#FFF1F2] text-[#C6283D] border-[#F5B5BC]" :
                            coastalImpact.overall_coastal_severity === "HIGH" ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]" :
                            coastalImpact.overall_coastal_severity === "MODERATE" ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]" :
                            "bg-[#EAF8F4] text-[#087F68] border-[#9ADBC8]"
                          }`}>
                            {coastalImpact.overall_coastal_severity}
                          </span>
                        </div>
                        <div className="text-[9px] text-[#5E7183] mt-1">Impact classification</div>
                      </div>

                      <div className="bg-[#F3FAFE] p-3 rounded-lg border border-[#D9E8F2]">
                        <div className="text-[10px] text-[#5E7183] uppercase font-bold">Threatened Assets</div>
                        <div className="text-xl font-bold text-[#0B3A66] mt-1">
                          {coastalImpact.total_affected_locations}
                        </div>
                        <div className="text-[9px] text-[#5E7183] mt-0.5">In advection corridor</div>
                      </div>
                    </div>

                    {/* Interactive Timeline Bar: NOW → 1H → 3H → 6H → 12H → 24H */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#17324D] font-bold uppercase tracking-wider text-[10px]">
                          Chronological Arrival Timeline:
                        </span>
                        {selectedHorizonFilter && (
                          <button
                            onClick={() => setSelectedHorizonFilter(null)}
                            className="text-[10px] text-[#1268B3] hover:text-[#0B3A66] underline font-medium"
                          >
                            Clear horizon filter (show all)
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {coastalImpact.timeline_summary.map((grp) => {
                          const isSelected = selectedHorizonFilter === grp.horizon;
                          const hasTargets = grp.locations_count > 0;
                          return (
                            <button
                              key={grp.horizon}
                              onClick={() => setSelectedHorizonFilter(isSelected ? null : grp.horizon)}
                              className={`p-2 rounded-lg text-left transition-all border ${
                                isSelected
                                  ? "bg-[#1268B3] text-white border-[#0F4C81] shadow-sm"
                                  : hasTargets
                                  ? "bg-[#F3FAFE] hover:bg-[#EAF6FF] border-[#D9E8F2]"
                                  : "bg-slate-50 border-[#EAF3F8] opacity-60"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-extrabold ${isSelected ? "text-white" : "text-[#17324D]"}`}>
                                  {grp.horizon}
                                </span>
                                <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : grp.highest_severity === "CRITICAL" ? "bg-[#FFF1F2] text-[#C6283D]" :
                                    grp.highest_severity === "HIGH" ? "bg-[#FFF8E8] text-[#A86A00]" :
                                    grp.highest_severity === "MODERATE" ? "bg-[#FFF8E8] text-[#A86A00]" :
                                    "bg-slate-200 text-slate-700"
                                }`}>
                                  {grp.locations_count}
                                </span>
                              </div>
                              <div className={`text-[8px] mt-0.5 truncate ${isSelected ? "text-white/80" : "text-[#5E7183]"}`}>{grp.hours_label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Affected Coastal Locations Grid */}
                    {coastalImpact.affected_locations.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-[#17324D]">
                          {selectedHorizonFilter
                            ? `Threatened Coastal Targets in ${selectedHorizonFilter} Horizon`
                            : `Threatened Coastal Targets (${coastalImpact.affected_locations.length})`}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                          {coastalImpact.affected_locations
                            .filter((loc) => !selectedHorizonFilter || loc.impact_horizon === selectedHorizonFilter)
                            .map((loc) => {
                              const getTargetIcon = (t: string) => {
                                switch (t) {
                                  case "BEACH": return <Umbrella className="w-3.5 h-3.5 text-amber-500" />;
                                  case "PORT": return <Anchor className="w-3.5 h-3.5 text-[#1268B3]" />;
                                  case "COASTAL_SETTLEMENT": return <Building2 className="w-3.5 h-3.5 text-indigo-600" />;
                                  case "FISHING_ZONE": return <Fish className="w-3.5 h-3.5 text-cyan-600" />;
                                  case "INFRASTRUCTURE": return <Factory className="w-3.5 h-3.5 text-rose-600" />;
                                  case "PROTECTED_AREA": return <Shield className="w-3.5 h-3.5 text-emerald-600" />;
                                  default: return <Waves className="w-3.5 h-3.5 text-[#168DCC]" />;
                                }
                              };

                              return (
                                <div
                                  key={loc.id}
                                  className="p-3 bg-white hover:bg-[#F3FAFE] rounded-lg border border-[#D9E8F2] space-y-2 transition-all shadow-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2">
                                      <div className="p-1 rounded bg-[#EAF6FF] mt-0.5 border border-[#D9E8F2]">
                                        {getTargetIcon(loc.target_type)}
                                      </div>
                                      <div>
                                        <div className="font-bold text-xs text-[#17324D] leading-snug">
                                          {loc.target_location}
                                        </div>
                                        <div className="text-[10px] text-[#5E7183] mt-0.5 capitalize">
                                          {loc.target_type.replace(/_/g, " ").toLowerCase()}
                                        </div>
                                      </div>
                                    </div>

                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${
                                      loc.severity === "CRITICAL" ? "bg-[#FFF1F2] text-[#C6283D] border-[#F5B5BC]" :
                                      loc.severity === "HIGH" ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]" :
                                      loc.severity === "MODERATE" ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]" :
                                      "bg-[#EAF8F4] text-[#087F68] border-[#9ADBC8]"
                                    }`}>
                                      {loc.severity}
                                    </span>
                                  </div>

                                  {/* Estimated Impact Time & Distance */}
                                  <div className="p-1.5 rounded bg-[#F3FAFE] border border-[#D9E8F2] flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1 text-[#0B3A66] font-bold">
                                      <Zap className="w-3 h-3 text-[#1268B3]" />
                                      <span>Estimated Impact: ~{loc.estimated_hours_to_impact.toFixed(1)} hrs</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-[#5E7183] font-semibold">
                                      {loc.impact_horizon}
                                    </span>
                                  </div>

                                  {/* Metrics Bar */}
                                  <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                                    <div className="bg-[#F8FCFF] p-1.5 rounded text-center border border-[#EAF3F8]">
                                      <div className="text-[#5E7183]">Distance</div>
                                      <div className="font-bold text-[#17324D] mt-0.5">{loc.distance_km} km</div>
                                    </div>
                                    <div className="bg-[#F8FCFF] p-1.5 rounded text-center border border-[#EAF3F8]">
                                      <div className="text-[#5E7183]">Probability</div>
                                      <div className="font-bold text-[#A86A00] mt-0.5">{loc.impact_probability}%</div>
                                    </div>
                                    <div className="bg-[#F8FCFF] p-1.5 rounded text-center border border-[#EAF3F8]">
                                      <div className="text-[#5E7183]">Confidence</div>
                                      <div className="font-bold text-[#087F68] mt-0.5">{(loc.confidence * 100).toFixed(0)}%</div>
                                    </div>
                                  </div>

                                  {loc.summary_notes && (
                                    <p className="text-[10px] text-[#5E7183] leading-relaxed border-t border-[#EAF3F8] pt-1.5">
                                      {loc.summary_notes}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#F3FAFE] rounded-lg border border-[#D9E8F2] text-xs text-[#5E7183] text-center">
                        No coastal landmasses projected along forward advection corridor.
                      </div>
                    )}

                    <div className="text-[10px] text-[#8A9AA8] flex items-center justify-between flex-wrap gap-2">
                      <div>
                        Model: <span className="text-[#17324D] font-semibold">{coastalImpact.model_name}</span>
                        {" "}•{" "}
                        Run: <span className="text-[#5E7183]">{new Date(coastalImpact.analyzed_at).toLocaleString()}</span>
                      </div>
                      <div className="text-[9px] text-[#A86A00] font-medium italic">
                        {coastalImpact.disclaimer}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#F3FAFE] rounded-lg border border-[#D9E8F2] text-xs text-[#5E7183] text-center">
                    No coastal impact data available. Click Recalculate Impact to generate.
                  </div>
                )}
              </div>

              {/* ── MODULE 14: EMERGENCY VESSEL ROUTE OPTIMIZER ── */}
              <div className="bg-white p-4 rounded-xl border border-[#D9E8F2] space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#087F68]" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-2">
                        Emergency Vessel Route Optimizer
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#EAF6FF] text-[#087F68] border border-[#087F68]/30 font-mono font-bold">
                          MODULE 14
                        </span>
                      </h3>
                      <p className="text-[10px] text-[#5E7183]">
                        Rapid deployment routing, equipment matching, and arrival estimation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectAndRecalculateRoute()}
                      disabled={optimizingRoute}
                      className="px-2.5 py-1 text-xs rounded bg-white hover:bg-[#F3FAFE] text-[#087F68] border border-[#087F68]/40 font-medium transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      title="Recalculate nautical response route"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${optimizingRoute ? "animate-spin" : ""}`} />
                      <span>{optimizingRoute ? "Routing..." : "Re-optimize Route"}</span>
                    </button>
                    <Link
                      to={`/map?incidentId=${selectedIncident.id}`}
                      className="px-2.5 py-1 text-xs rounded bg-[#087F68] hover:bg-[#066552] text-white font-medium transition flex items-center gap-1 shadow-sm"
                      title="View active route on Leaflet GIS Map"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>View Route on Map</span>
                    </Link>
                  </div>
                </div>

                {/* Transparency / Maritime Advisory Notice */}
                <div className="p-2.5 rounded-lg bg-[#EAF6FF] border border-[#A9D9F5] text-[10px] text-[#17324D] flex items-start gap-2">
                  <Shield className="w-4 h-4 text-[#1268B3] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold text-[#0B3A66]">[PROTOTYPE MARITIME ROUTE — DECISION SUPPORT ONLY]</span>
                    <span className="ml-1 text-[#5E7183]">
                      Computes safe shortest-path nautical legs with coastline and southern cape clearance waypoints.
                      Travel durations reflect vessel cruising speed and sea-state weather drag factors.
                      Always verify clearance with Indian Coast Guard Maritime Rescue Coordination Centre (MRCC) prior to physical dispatch.
                    </span>
                  </div>
                </div>

                {loadingRouting ? (
                  <div className="py-8 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#087F68] border-t-transparent rounded-full animate-spin" />
                    <span>Evaluating available response fleet and calculating route...</span>
                  </div>
                ) : optimizedRoute ? (
                  <div className="space-y-3">
                    {/* Vessel Candidate Selector */}
                    {recommendedVessels.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase font-bold text-[#5E7183] mb-1.5 flex items-center justify-between">
                          <span>Available Emergency Response Vessels ({recommendedVessels.length} Evaluated)</span>
                          <span className="text-[#087F68] font-semibold">Ranked by Priority &amp; Proximity</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {recommendedVessels.map((rec: any, idx: number) => {
                            const vId = rec.vessel?.id || rec.vessel_id;
                            const vName = rec.vessel?.name || rec.vessel_name || "Emergency Vessel";
                            const vType = rec.vessel?.vessel_type || rec.vessel_type || "Response Ship";
                            const vPort = rec.vessel?.home_port || rec.home_port || "Naval Base";
                            const vDist = rec.estimated_distance_nm ?? rec.distance_nm ?? 0;
                            const vEta = rec.estimated_travel_time_hours ?? rec.estimated_hours ?? 0;
                            const vScore = rec.suitability_score ?? (rec.overall_match_score ? rec.overall_match_score * 100 : 80);
                            const isSelected = selectedVesselId === vId;

                            return (
                              <button
                                key={vId || idx}
                                onClick={() => vId && handleSelectAndRecalculateRoute(vId)}
                                disabled={optimizingRoute}
                                className={`text-left p-2.5 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                                  isSelected
                                    ? "bg-[#EAF6FF] border-[#1268B3] shadow-sm ring-1 ring-[#1268B3]/40"
                                    : "bg-white border-[#D9E8F2] hover:border-[#1268B3]/50 hover:bg-[#F4F9FD]"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F4F9FD] border border-[#D9E8F2] text-[#5E7183]">
                                    #{rec.rank || idx + 1} Candidate
                                  </span>
                                  <span className={`text-[10px] font-bold font-mono ${isSelected ? "text-[#1268B3]" : "text-[#087F68]"}`}>
                                    {Number(vScore).toFixed(0)}% Match
                                  </span>
                                </div>
                                <div className="font-bold text-xs text-[#17324D] truncate">
                                  {vName}
                                </div>
                                <div className="text-[10px] text-[#5E7183] truncate mb-1.5">
                                  {vType} • {vPort}
                                </div>
                                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#D9E8F2] font-mono">
                                  <span className="text-[#17324D]">{Number(vDist).toFixed(1)} NM</span>
                                  <span className="text-[#D97706] font-bold">~{Number(vEta).toFixed(1)} hrs ETA</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Active Route Primary Metrics Card */}
                    {(() => {
                      const vName = optimizedRoute.vessel?.name || optimizedRoute.vessel_name || "Emergency Vessel";
                      const vType = optimizedRoute.vessel?.vessel_type || optimizedRoute.vessel_type || "Pollution Control Vessel";
                      const homePort = optimizedRoute.vessel?.home_port || optimizedRoute.home_port || "Coastal Port";
                      const origLat = optimizedRoute.start_latitude ?? optimizedRoute.origin?.latitude ?? 0;
                      const origLon = optimizedRoute.start_longitude ?? optimizedRoute.origin?.longitude ?? 0;
                      const distNm = optimizedRoute.estimated_distance_nm ?? optimizedRoute.total_distance_nm ?? 0;
                      const distKm = optimizedRoute.estimated_distance_km ?? optimizedRoute.total_distance_km ?? 0;
                      const etaHours = optimizedRoute.estimated_travel_time_hours ?? optimizedRoute.total_estimated_hours ?? 0;
                      const speedKts = optimizedRoute.vessel?.cruising_speed_knots ?? optimizedRoute.transit_speed_knots ?? 18;
                      const confScore = optimizedRoute.route_confidence ?? optimizedRoute.confidence_score ?? 0.85;
                      const weatherDelay = optimizedRoute.weather_delay_factor ?? 1.05;
                      const caps = optimizedRoute.vessel?.capabilities ?? [];
                      const hasBooms = caps.includes("BOOM_DEPLOYMENT") || Boolean(optimizedRoute.equipment_match?.has_booms);
                      const hasSkimmers = caps.includes("OIL_SKIMMING") || Boolean(optimizedRoute.equipment_match?.has_skimmers);
                      const hasDispersants = caps.includes("CHEMICAL_DISPERSANT") || Boolean(optimizedRoute.equipment_match?.has_dispersants);
                      const recoveryRate = optimizedRoute.vessel?.skimmer_capacity_m3h ?? optimizedRoute.equipment_match?.oil_recovery_rate_m3h ?? 0;

                      return (
                        <div className="p-3 bg-[#F4F9FD] rounded-lg border border-[#D9E8F2] space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#D9E8F2]">
                            <div>
                              <div className="text-xs font-bold text-[#0B3A66] flex items-center gap-1.5">
                                <span className="text-sm">🚢</span>
                                <span>{vName}</span>
                                <span className="text-[9px] font-normal px-1.5 py-0.5 rounded bg-white border border-[#D9E8F2] text-[#1268B3]">
                                  {vType}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#5E7183] mt-0.5">
                                Home Station: <span className="text-[#17324D] font-medium">{homePort}</span>
                                {" "}• Origin: <span className="font-mono text-[#17324D]">{origLat.toFixed(2)}°N, {origLon.toFixed(2)}°E</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#087F68] border border-[#087F68]/30 font-semibold">
                                Nav Provider: {optimizedRoute.routing_provider}
                              </span>
                            </div>
                          </div>

                          {/* 4 Primary Route Metrics */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                            <div className="p-2 rounded bg-white border border-[#D9E8F2] shadow-xs">
                              <div className="text-[9px] uppercase tracking-wider text-[#5E7183]">Total Distance</div>
                              <div className="text-sm font-bold font-mono text-[#0B3A66] mt-0.5">
                                {Number(distNm).toFixed(1)} NM
                              </div>
                              <div className="text-[9px] text-[#8A9AA8] font-mono">({Number(distKm).toFixed(1)} km)</div>
                            </div>
                            <div className="p-2 rounded bg-white border border-[#D9E8F2] shadow-xs">
                              <div className="text-[9px] uppercase tracking-wider text-[#5E7183]">Estimated Travel Time</div>
                              <div className="text-sm font-bold font-mono text-[#D97706] mt-0.5">
                                ~{Number(etaHours).toFixed(1)} hrs
                              </div>
                              <div className="text-[9px] text-[#8A9AA8]">Weather delay: x{Number(weatherDelay).toFixed(2)}</div>
                            </div>
                            <div className="p-2 rounded bg-white border border-[#D9E8F2] shadow-xs">
                              <div className="text-[9px] uppercase tracking-wider text-[#5E7183]">Response Speed</div>
                              <div className="text-sm font-bold font-mono text-[#1268B3] mt-0.5">
                                {speedKts} kts
                              </div>
                              <div className="text-[9px] text-[#8A9AA8]">Continuous transit</div>
                            </div>
                            <div className="p-2 rounded bg-white border border-[#D9E8F2] shadow-xs">
                              <div className="text-[9px] uppercase tracking-wider text-[#5E7183]">Route Confidence</div>
                              <div className="text-sm font-bold font-mono text-[#087F68] mt-0.5">
                                {(Number(confScore) * 100).toFixed(0)}%
                              </div>
                              <div className="text-[9px] text-[#8A9AA8]">Cape avoidance verified</div>
                            </div>
                          </div>

                          {/* Equipment Capabilities Breakdown */}
                          <div className="p-2 rounded bg-white border border-[#D9E8F2] flex items-center justify-between flex-wrap gap-2 text-xs">
                            <span className="text-[10px] font-bold text-[#5E7183] uppercase tracking-wider">
                              Response Capabilities:
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                                hasBooms
                                  ? "bg-[#EAF6FF] text-[#087F68] border-[#087F68]/40"
                                  : "bg-[#F4F9FD] text-[#8A9AA8] border-[#D9E8F2]"
                              }`}>
                                {hasBooms ? "✓ Containment Booms" : "✗ No Booms"}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                                hasSkimmers
                                  ? "bg-[#EAF6FF] text-[#087F68] border-[#087F68]/40"
                                  : "bg-[#F4F9FD] text-[#8A9AA8] border-[#D9E8F2]"
                              }`}>
                                {hasSkimmers ? "✓ Heavy Skimmers" : "✗ No Skimmers"}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                                hasDispersants
                                  ? "bg-[#EAF6FF] text-[#087F68] border-[#087F68]/40"
                                  : "bg-[#F4F9FD] text-[#8A9AA8] border-[#D9E8F2]"
                              }`}>
                                {hasDispersants ? "✓ Dispersant Spray" : "✗ Dispersants"}
                              </span>
                              {recoveryRate > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] border border-[#1268B3]/40 font-mono font-semibold">
                                  Recovery: {recoveryRate} m³/h
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Navigational Waypoint Itinerary Table */}
                          {optimizedRoute.waypoints && optimizedRoute.waypoints.length > 0 && (
                            <div>
                              <div className="text-[10px] uppercase font-bold text-[#5E7183] mb-1.5 flex items-center justify-between">
                                <span>Navigational Itinerary ({optimizedRoute.waypoints.length} Waypoints)</span>
                                <span className="text-[#8A9AA8] font-normal">Nautical miles &amp; segment arrivals</span>
                              </div>
                              <div className="overflow-x-auto rounded border border-[#D9E8F2] bg-white">
                                <table className="w-full text-left text-[11px] font-mono">
                                  <thead className="bg-[#F4F9FD] text-[10px] text-[#5E7183] uppercase tracking-wider border-b border-[#D9E8F2]">
                                    <tr>
                                      <th className="py-1.5 px-2">Seq</th>
                                      <th className="py-1.5 px-2">Coordinates</th>
                                      <th className="py-1.5 px-2">Leg NM</th>
                                      <th className="py-1.5 px-2">Cumul. NM</th>
                                      <th className="py-1.5 px-2">Elapsed</th>
                                      <th className="py-1.5 px-2">Waypoint Description</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#D9E8F2] text-[#17324D]">
                                    {optimizedRoute.waypoints.map((wp: NavigationalWaypoint, i: number) => {
                                      const wpSeq = wp.sequence ?? (wp.index != null ? wp.index + 1 : i + 1);
                                      const wpLeg = wp.leg_distance_nm ?? wp.distance_nm_from_prev ?? 0;
                                      const wpCum = wp.cumulative_distance_nm ?? wp.distance_nm_cumulative ?? 0;
                                      const wpEta = wp.leg_eta_hours ?? wp.estimated_hours_cumulative ?? 0;
                                      const wpDesc = wp.name ?? wp.note ?? (wp.waypoint_type ? wp.waypoint_type.replace(/_/g, " ") : `Waypoint #${wpSeq}`);

                                      return (
                                        <tr key={`inc-wp-${wpSeq}-${wp.latitude}`} className="hover:bg-[#F3FAFE]">
                                          <td className="py-1 px-2 font-bold text-[#087F68]">
                                            #{wpSeq}
                                          </td>
                                          <td className="py-1 px-2 text-[#17324D]">
                                            {wp.latitude.toFixed(2)}°N, {wp.longitude.toFixed(2)}°E
                                          </td>
                                          <td className="py-1 px-2 text-[#5E7183]">
                                            {Number(wpLeg).toFixed(1)} NM
                                          </td>
                                          <td className="py-1 px-2 text-[#087F68] font-semibold">
                                            {Number(wpCum).toFixed(1)} NM
                                          </td>
                                          <td className="py-1 px-2 text-[#D97706] font-semibold">
                                            +{Number(wpEta).toFixed(1)}h
                                          </td>
                                          <td className="py-1 px-2 text-[#17324D] font-sans text-[10px]">
                                            {wpDesc}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-3 bg-[#F4F9FD] rounded-lg border border-[#D9E8F2] text-xs text-[#5E7183] text-center">
                    No emergency vessel route calculated. Click Re-optimize Route to generate.
                  </div>
                )}
              </div>

              {/* ── MODULE 15: SMART CLEANUP PLANNER ── */}
              <div className="bg-white p-4 rounded-xl border border-[#D9E8F2] space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1268B3]" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-2">
                        Smart Cleanup Planner &amp; Response Engine
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] font-mono font-bold">
                          MODULE 15
                        </span>
                      </h3>
                      <p className="text-[10px] text-[#5E7183]">
                        Multi-criteria heuristic response strategy scoring, equipment matching, and action authorization
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerateCleanupPlan()}
                      disabled={generatingCleanup}
                      className="px-2.5 py-1 text-xs rounded bg-white hover:bg-[#F3FAFE] text-[#1268B3] border border-[#1268B3]/40 font-medium transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      title="Re-evaluate response strategies using real-time sea-state &amp; GIS context"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generatingCleanup ? "animate-spin" : ""}`} />
                      <span>{generatingCleanup ? "Evaluating..." : "Re-evaluate Strategies"}</span>
                    </button>
                  </div>
                </div>

                {/* Transparency / Decision Support Disclaimer */}
                <div className="p-2.5 rounded-lg bg-[#EAF6FF] border border-[#A9D9F5] text-[10px] text-[#17324D] flex items-start gap-2">
                  <Shield className="w-4 h-4 text-[#1268B3] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold text-[#0B3A66]">[DECISION SUPPORT ONLY — AUTHORIZED INCIDENT COMMANDER REVIEW REQUIRED]</span>
                    <span className="ml-1 text-[#5E7183]">
                      Recommendations are generated via multi-criteria heuristic rule evaluation against sea-state thresholds, coastal proximity, ecosystem vulnerability, and tier criteria. Strategy selection must be authorized by an accredited response officer. Approving an action logs directly to the official incident audit trail.
                    </span>
                  </div>
                </div>

                {loadingCleanup ? (
                  <div className="py-8 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#1268B3] border-t-transparent rounded-full animate-spin" />
                    <span>Evaluating incident conditions and generating response strategies...</span>
                  </div>
                ) : cleanupPlan ? (
                  <div className="space-y-4">
                    {/* Strategy Overview Card */}
                    <div className="p-3 bg-[#F4F9FD] rounded-lg border border-[#D9E8F2] space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#D9E8F2]">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            (cleanupPlan.spill_size_tier || cleanupPlan.spill_tier) === "TIER_3"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : (cleanupPlan.spill_size_tier || cleanupPlan.spill_tier) === "TIER_2"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {(cleanupPlan.spill_size_tier || cleanupPlan.spill_tier || "TIER_1").replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-semibold text-[#17324D]">
                            Primary Strategy: <span className="text-[#1268B3] font-bold">{(cleanupPlan.overall_strategy || cleanupPlan.primary_strategy || "OFFSHORE_CONTAINMENT").replace(/_/g, " ")}</span>
                          </span>
                        </div>
                        <div className="text-[10px] text-[#5E7183] font-mono">
                          Plan ID: {cleanupPlan.plan_code || cleanupPlan.id.slice(0, 8)} • {new Date(cleanupPlan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Environmental / Contextual Factors */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
                        <div className="p-1.5 rounded bg-white border border-[#D9E8F2] shadow-xs">
                          <div className="text-[9px] uppercase text-[#5E7183]">Wind Speed</div>
                          <div className="font-bold font-mono text-[#17324D] mt-0.5">
                            {cleanupPlan.environmental_context?.wind_speed_ms != null
                              ? `${(cleanupPlan.environmental_context.wind_speed_ms * 1.94384).toFixed(1)} kts`
                              : "N/A"}
                          </div>
                        </div>
                        <div className="p-1.5 rounded bg-white border border-[#D9E8F2] shadow-xs">
                          <div className="text-[9px] uppercase text-[#5E7183]">Wave Height</div>
                          <div className="font-bold font-mono text-[#1268B3] mt-0.5">
                            {cleanupPlan.environmental_context?.wave_height_m != null
                              ? `${Number(cleanupPlan.environmental_context.wave_height_m).toFixed(2)} m`
                              : "N/A"}
                          </div>
                        </div>
                        <div className="p-1.5 rounded bg-white border border-[#D9E8F2] shadow-xs">
                          <div className="text-[9px] uppercase text-[#5E7183]">Ocean Current</div>
                          <div className="font-bold font-mono text-[#17324D] mt-0.5">
                            {cleanupPlan.environmental_context?.current_speed_ms != null
                              ? `${(cleanupPlan.environmental_context.current_speed_ms * 1.94384).toFixed(1)} kts`
                              : "N/A"}
                          </div>
                        </div>
                        <div className="p-1.5 rounded bg-white border border-[#D9E8F2] shadow-xs">
                          <div className="text-[9px] uppercase text-[#5E7183]">Coast Distance</div>
                          <div className="font-bold font-mono text-[#D97706] mt-0.5">
                            {cleanupPlan.environmental_context?.coastal_distance_km != null
                              ? `${Number(cleanupPlan.environmental_context.coastal_distance_km).toFixed(1)} km`
                              : "Offshore"}
                          </div>
                        </div>
                        <div className="p-1.5 rounded bg-white border border-[#D9E8F2] shadow-xs">
                          <div className="text-[9px] uppercase text-[#5E7183]">Sensitive Zone</div>
                          <div className="font-bold font-mono text-[#087F68] mt-0.5 truncate" title={cleanupPlan.environmental_context?.most_sensitive_ecosystem || "Marine Habitat"}>
                            {cleanupPlan.environmental_context?.most_sensitive_ecosystem || "Marine Habitat"}
                          </div>
                        </div>
                        <div className="p-1.5 rounded bg-white border border-[#D9E8F2] shadow-xs">
                          <div className="text-[9px] uppercase text-[#5E7183]">Priority Score</div>
                          <div className="font-bold font-mono text-rose-600 mt-0.5">
                            {cleanupPlan.environmental_context?.incident_priority_score != null
                              ? cleanupPlan.environmental_context.incident_priority_score.toFixed(1)
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Priority Filter Tabs */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-[#5E7183] tracking-wider mr-1">
                          Filter Priority:
                        </span>
                        {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((lvl) => {
                          const count = lvl === "ALL"
                            ? cleanupPlan.recommendations.length
                            : cleanupPlan.recommendations.filter((r) => r.priority === lvl).length;
                          const isActive = cleanupPriorityFilter === lvl;
                          return (
                            <button
                              key={lvl}
                              onClick={() => setCleanupPriorityFilter(lvl)}
                              className={`text-[10px] px-2 py-0.5 rounded transition cursor-pointer font-mono flex items-center gap-1 ${
                                isActive
                                  ? "bg-[#EAF6FF] text-[#1268B3] border border-[#1268B3]/50 font-bold"
                                  : "bg-white text-[#5E7183] border border-[#D9E8F2] hover:text-[#17324D] hover:bg-[#F4F9FD]"
                              }`}
                            >
                              <span>{lvl}</span>
                              <span className="text-[9px] opacity-70">({count})</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-[#5E7183] font-mono">
                        {cleanupPlan.recommendations.filter(r => (r.operational_status || r.status) === "ACCEPTED").length} Approved •{" "}
                        {cleanupPlan.recommendations.filter(r => (r.operational_status || r.status) === "RECOMMENDED").length} Pending
                      </div>
                    </div>

                    {/* Recommendations Cards Grid */}
                    <div className="space-y-3">
                      {cleanupPlan.recommendations
                        .filter((r) => cleanupPriorityFilter === "ALL" || r.priority === cleanupPriorityFilter)
                        .map((rec: CleanupRecommendationItem) => {
                          const opStatus = rec.operational_status || rec.status || "RECOMMENDED";
                          const isAccepted = opStatus === "ACCEPTED";
                          const isRejected = opStatus === "REJECTED";
                          const isPending = opStatus === "RECOMMENDED";

                          const priorityBadge =
                            rec.priority === "CRITICAL"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : rec.priority === "HIGH"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : rec.priority === "MEDIUM"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-[#F4F9FD] text-[#5E7183] border-[#D9E8F2]";

                          const hasLimitations = Boolean(
                            rec.limitations &&
                            (Array.isArray(rec.limitations) ? rec.limitations.length > 0 : String(rec.limitations).trim().length > 0)
                          );

                          return (
                            <div
                              key={rec.id}
                              className={`p-3.5 rounded-lg border transition space-y-3 ${
                                isAccepted
                                  ? "bg-[#F4FBF7] border-[#087F68]/40 shadow-xs"
                                  : isRejected
                                  ? "bg-[#FAFAFA] border-[#D9E8F2] opacity-60"
                                  : "bg-white border-[#D9E8F2] hover:border-[#1268B3]/40 shadow-xs"
                              }`}
                            >
                              {/* Header: Action Title, Priority, Suitability & Status */}
                              <div className="flex items-start justify-between flex-wrap gap-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-xs font-bold text-[#17324D] uppercase tracking-wide">
                                      {rec.action_title || rec.action}
                                    </h4>
                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${priorityBadge}`}>
                                      {rec.priority}
                                    </span>
                                    {rec.action && rec.action !== rec.action_title && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F4F9FD] text-[#5E7183] border border-[#D9E8F2] font-mono">
                                        {rec.action}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Suitability Score Meter */}
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F4F9FD] border border-[#D9E8F2]">
                                    <span className="text-[9px] text-[#5E7183] uppercase">Suitability:</span>
                                    <span className="text-xs font-bold font-mono text-[#1268B3]">
                                      {Number(rec.suitability_score).toFixed(0)}/100
                                    </span>
                                  </div>

                                  {/* Status Indicator */}
                                  {isAccepted && (
                                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-[#087F68] border border-emerald-200 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-[#087F68]" />
                                      Approved
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-50 text-[#C6283D] border border-rose-200 font-bold flex items-center gap-1">
                                      <X className="w-3 h-3 text-[#C6283D]" />
                                      Declined
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                      Pending Review
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Operational Reason */}
                              <p className="text-xs text-[#5E7183] leading-relaxed">
                                {rec.reason}
                              </p>

                              {/* Required Resources Chips */}
                              {rec.required_resources && rec.required_resources.length > 0 && (
                                <div>
                                  <div className="text-[9px] uppercase font-bold text-[#5E7183] mb-1">
                                    Required Equipment &amp; Resources:
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {rec.required_resources.map((res: string, i: number) => (
                                      <span
                                        key={i}
                                        className="text-[10px] px-2 py-0.5 rounded bg-[#F4F9FD] text-[#17324D] border border-[#D9E8F2] font-mono"
                                      >
                                        • {res}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Limitations / Environmental Warnings */}
                              {hasLimitations && (
                                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <div className="leading-snug">
                                    <span className="font-bold text-amber-800">Operational Limitations &amp; Thresholds: </span>
                                    <span>
                                      {Array.isArray(rec.limitations)
                                        ? rec.limitations.join(" • ")
                                        : String(rec.limitations)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Operator Authorization Controls */}
                              <div className="pt-2 border-t border-[#D9E8F2]">
                                {isPending ? (
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <input
                                      type="text"
                                      value={actionNotes[rec.id] || ""}
                                      onChange={(e) =>
                                        setActionNotes({ ...actionNotes, [rec.id]: e.target.value })
                                      }
                                      placeholder="Commander remarks / dispatch instructions (optional)..."
                                      className="flex-1 bg-white border border-[#D9E8F2] rounded px-2.5 py-1 text-xs text-[#17324D] placeholder-[#8A9AA8] focus:outline-none focus:border-[#1268B3]"
                                    />
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleUpdateRecommendationStatus(rec.id, "ACCEPTED")}
                                        className="px-3 py-1 text-xs rounded bg-[#087F68] hover:bg-[#066552] text-white font-medium transition flex items-center gap-1 cursor-pointer shadow-sm"
                                        title="Approve this cleanup response strategy and record to incident audit log"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Approve Strategy</span>
                                      </button>
                                      <button
                                        onClick={() => handleUpdateRecommendationStatus(rec.id, "REJECTED")}
                                        className="px-2.5 py-1 text-xs rounded bg-white hover:bg-rose-50 text-[#C6283D] border border-[#C6283D]/40 transition flex items-center gap-1 cursor-pointer"
                                        title="Decline this recommendation"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Decline</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : isAccepted ? (
                                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-[#087F68] font-mono">
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#087F68]" />
                                      <span className="font-bold">APPROVED BY COMMANDER — RECORDED IN INCIDENT EVENT TIMELINE</span>
                                    </div>
                                    {rec.decision_notes && (
                                      <span className="text-[#5E7183] font-sans italic">"{rec.decision_notes}"</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-[#5E7183] font-mono">
                                    <div className="flex items-center gap-1.5">
                                      <X className="w-3.5 h-3.5 text-[#C6283D]" />
                                      <span>Declined by Commander</span>
                                    </div>
                                    {rec.decision_notes && (
                                      <span className="text-[#8A9AA8] font-sans italic">"{rec.decision_notes}"</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#F4F9FD] rounded-lg border border-[#D9E8F2] text-xs text-[#5E7183] text-center">
                    No cleanup plan evaluated. Click Re-evaluate Strategies to generate.
                  </div>
                )}
              </div>

              {/* ── MODULE 16: RESPONSE RESOURCE ALLOCATION & DISPATCH ── */}
              <div className="bg-white p-4 rounded-xl border border-[#D9E8F2] space-y-4 shadow-sm hover:shadow-md transition-shadow relative">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EAF3F8]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#EAF6FF] border border-[#A9D9F5] text-[#1268B3]">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#17324D]">
                          Resource Allocation &amp; Tactical Dispatch
                        </h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] font-bold">
                          MODULE 16
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5E7183]">
                        Algorithmic allocation scoring, multi-tier equipment deployment, and human-in-the-loop authorization.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to="/resources"
                      className="px-2.5 py-1 text-xs rounded bg-white hover:bg-[#F4F9FD] text-[#1268B3] border border-[#1268B3]/40 transition flex items-center gap-1 font-semibold shadow-xs"
                    >
                      <span>Full Fleet Inventory</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Human-in-the-Loop Mandatory Dispatch Policy Notice */}
                <div className="p-2.5 rounded-lg bg-[#EAF6FF] border border-[#A9D9F5] flex items-start gap-2.5 text-[11px] text-[#17324D]">
                  <Shield className="w-4 h-4 text-[#1268B3] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0B3A66]">Commander Dispatch Gate: </span>
                    Resources are scored by proximity, vessel speed, capability match, and incident severity.
                    Commitments require affirmative operator confirmation.
                  </div>
                </div>

                {/* Section 1: Active Assigned Resources */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-[#087F68]" />
                      Active Incident Assignments ({incidentResources?.active_assignments?.length || 0})
                    </h4>
                    {incidentResources && incidentResources.active_assignments && incidentResources.active_assignments.length > 0 && (
                      <span className="text-[10px] text-[#087F68] font-mono font-semibold">
                        {incidentResources.active_assignments.filter((a: ResourceAssignmentItem) => a.status === "DEPLOYED").length} Deployed On-Scene
                      </span>
                    )}
                  </div>

                  {loadingResources ? (
                    <div className="p-4 bg-[#F4F9FD] rounded-lg border border-[#D9E8F2] text-xs text-[#5E7183] text-center flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#1268B3]" />
                      <span>Loading resource allocation status...</span>
                    </div>
                  ) : !incidentResources || !incidentResources.active_assignments || incidentResources.active_assignments.length === 0 ? (
                    <div className="p-3.5 bg-[#F4F9FD] rounded-lg border border-[#D9E8F2] text-xs text-[#5E7183] text-center space-y-1">
                      <p className="font-semibold text-[#17324D]">No resources currently assigned to this incident.</p>
                      <p className="text-[11px] text-[#8A9AA8]">
                        Review recommended resources below and click "Authorize Dispatch" to allocate containment assets.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {incidentResources.active_assignments.map((assignment: ResourceAssignmentItem) => (
                        <div
                          key={assignment.id}
                          className="p-3 rounded-lg bg-[#F4F9FD] border border-[#D9E8F2] flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-[#17324D] text-xs flex items-center gap-1.5">
                                <span>{assignment.resource_name}</span>
                              </div>
                              <div className="text-[10px] text-[#5E7183]">
                                {assignment.resource_category.replace(/_/g, " ")} • Assigned by {assignment.assigned_by}
                              </div>
                              {assignment.notes && (
                                <div className="text-[10px] text-[#1268B3] font-mono mt-0.5 truncate max-w-xs" title={assignment.notes}>
                                  {assignment.notes}
                                </div>
                              )}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                assignment.status === "DEPLOYED"
                                  ? "bg-emerald-50 text-[#087F68] border border-emerald-200"
                                  : "bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5]"
                              }`}
                            >
                              {assignment.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#5E7183] pt-1.5 border-t border-[#D9E8F2]">
                            <div>
                              Quantity: <strong className="text-[#17324D]">{assignment.quantity_assigned} {assignment.unit}</strong>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {assignment.status === "ASSIGNED" ? (
                                <button
                                  onClick={() => handleUpdateAssignmentStatus(assignment.id, "DEPLOYED")}
                                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1268B3] hover:bg-[#0F4C81] text-white transition cursor-pointer"
                                  title="Mark as arrived and operating on-scene"
                                >
                                  Deploy On-Scene
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateAssignmentStatus(assignment.id, "ASSIGNED")}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-[#F3FAFE] text-[#5E7183] border border-[#D9E8F2] transition cursor-pointer"
                                  title="Set back to transit / staging"
                                >
                                  Staging
                                </button>
                              )}

                              <button
                                onClick={() => handleReleaseAssignment(assignment.id, assignment.resource_name)}
                                disabled={releasingAssignmentId === assignment.id}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-rose-50 text-[#C6283D] border border-[#C6283D]/40 transition disabled:opacity-50 cursor-pointer"
                                title="Demobilize and release resource back to available pool"
                              >
                                {releasingAssignmentId === assignment.id ? "Releasing..." : "Release"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: Recommended Resources (Decision Support) */}
                <div className="space-y-3 pt-3 border-t border-[#EAF3F8]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#1268B3]" />
                        Algorithmic Resource Recommendations
                      </h4>
                      <p className="text-[10px] text-[#5E7183]">
                        Scored out of 100 based on capability suitability, transit ETA, incident risk, and priority tier.
                      </p>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-1">
                      {["ALL", "RESPONSE_VESSEL", "SKIMMER_VESSEL", "CONTAINMENT_BOOM", "ABSORBENT_MATERIALS"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setResourceCategoryTab(cat)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                            resourceCategoryTab === cat
                              ? "bg-[#1268B3] text-white font-bold"
                              : "bg-white text-[#5E7183] hover:text-[#17324D] border border-[#D9E8F2]"
                          }`}
                        >
                          {cat === "ALL" ? "All Types" : cat.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingResources ? (
                    <div className="p-6 text-center text-xs text-[#5E7183]">
                      Evaluating emergency resource compatibility...
                    </div>
                  ) : !incidentResources || incidentResources.recommended_resources.length === 0 ? (
                    <div className="p-4 bg-[#F4F9FD] rounded-lg border border-[#D9E8F2] text-xs text-[#5E7183] text-center">
                      No additional available resources in the fleet registry for this criteria.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {incidentResources.recommended_resources
                        .filter(
                          (rec: RecommendedResourceItem) =>
                            resourceCategoryTab === "ALL" ||
                            rec.resource.resource_category === resourceCategoryTab
                        )
                        .slice(0, 6)
                        .map((rec: RecommendedResourceItem) => {
                          const score = rec.allocation_score;
                          const scoreColor =
                            score >= 80
                              ? "text-[#087F68] border-[#087F68]/40 bg-[#EAFBF7]"
                              : score >= 60
                              ? "text-[#1268B3] border-[#1268B3]/40 bg-[#EAF6FF]"
                              : "text-amber-700 border-amber-300 bg-amber-50";

                          return (
                            <div
                              key={rec.resource.id}
                              className="p-3 rounded-lg bg-[#F4F9FD] border border-[#D9E8F2] hover:border-[#1268B3]/50 transition space-y-2 shadow-xs"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-start gap-2.5">
                                  <div className={`px-2 py-1 rounded border font-mono font-bold text-center shrink-0 ${scoreColor}`}>
                                    <div className="text-base leading-none">{score}</div>
                                    <div className="text-[9px] uppercase tracking-tighter opacity-80">Score</div>
                                  </div>

                                  <div>
                                    <div className="font-bold text-[#17324D] text-xs flex items-center gap-2">
                                      <span>{rec.resource.name}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-[#5E7183] border border-[#D9E8F2]">
                                        {rec.resource.resource_category.replace(/_/g, " ")}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-[#5E7183] flex items-center gap-2 mt-0.5">
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-[#1268B3]" />
                                        {rec.resource.location_name || "Coast Base"}
                                      </span>
                                      <span>•</span>
                                      <span>Dist: <strong className="text-[#17324D]">{rec.estimated_distance_km} km</strong></span>
                                      <span>•</span>
                                      <span>ETA: <strong className="text-[#17324D]">{rec.estimated_response_time_hours}h</strong> ({rec.resource.speed_knots || 0} kts)</span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleOpenDispatchModal(rec)}
                                  className="px-3 py-1.5 rounded-lg bg-[#1268B3] hover:bg-[#0F4C81] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Authorize Dispatch</span>
                                </button>
                              </div>

                              {/* Explainable Rationale */}
                              <p className="text-[11px] text-[#5E7183] leading-relaxed bg-white p-2 rounded border border-[#D9E8F2]">
                                {rec.allocation_rationale}
                              </p>

                              {/* Factors Breakdown */}
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#5E7183] pt-1 border-t border-[#D9E8F2] font-mono">
                                <div className="flex items-center gap-3">
                                  <span>Capability: <strong className="text-[#1268B3]">{rec.factors.capability_match_score}/30</strong></span>
                                  <span>Proximity: <strong className="text-[#1268B3]">{rec.factors.proximity_eta_score}/30</strong></span>
                                  <span>Priority: <strong className="text-[#1268B3]">{rec.factors.priority_score_boost}/25</strong></span>
                                  <span>Risk: <strong className="text-[#1268B3]">{rec.factors.risk_severity_weight}/15</strong></span>
                                </div>
                                <div className="text-[#17324D] font-semibold">
                                  Available: {rec.resource.quantity} {rec.resource.unit}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Operator Dispatch Confirmation Modal */}
                {dispatchModalResource && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B3A66]/40 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-lg rounded-2xl bg-white border border-[#D9E8F2] shadow-2xl p-5 space-y-4">
                      <div className="flex items-start justify-between pb-3 border-b border-[#D9E8F2]">
                        <div>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] font-semibold">
                            Human-in-the-Loop Dispatch Protocol
                          </span>
                          <h3 className="text-base font-bold text-[#17324D] mt-1">
                            Authorize Resource Deployment
                          </h3>
                        </div>
                        <button
                          onClick={() => setDispatchModalResource(null)}
                          className="p-1 rounded-lg hover:bg-[#F4F9FD] text-[#5E7183] hover:text-[#17324D] cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="p-3 rounded-lg bg-[#F4F9FD] border border-[#D9E8F2] space-y-1">
                          <div className="font-bold text-[#0B3A66] text-sm">
                            {dispatchModalResource.resource.name}
                          </div>
                          <div className="text-[#5E7183]">
                            Base: {dispatchModalResource.resource.location_name} • Distance: {dispatchModalResource.estimated_distance_km} km • ETA: {dispatchModalResource.estimated_response_time_hours}h
                          </div>
                          <div className="text-[#5E7183]">
                            Allocation Suitability: <strong className="text-[#17324D]">{dispatchModalResource.allocation_score}/100</strong> ({dispatchModalResource.match_priority})
                          </div>
                        </div>

                        <div>
                          <label className="block text-[#17324D] font-semibold mb-1">
                            Commitment Quantity ({dispatchModalResource.resource.unit})
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={dispatchModalResource.resource.quantity}
                            value={dispatchQuantity}
                            onChange={(e) => setDispatchQuantity(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-white border border-[#D9E8F2] rounded-lg px-3 py-2 text-[#17324D] text-xs focus:outline-none focus:border-[#1268B3] font-mono"
                          />
                          <span className="text-[10px] text-[#8A9AA8] mt-0.5 block">
                            Max available: {dispatchModalResource.resource.quantity} {dispatchModalResource.resource.unit}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[#17324D] font-semibold mb-1">
                            Designated Operational Taskforce / Unit
                          </label>
                          <input
                            type="text"
                            value={dispatchOperationalUnit}
                            onChange={(e) => setDispatchOperationalUnit(e.target.value)}
                            placeholder="e.g. Sector Alpha Strike Unit..."
                            className="w-full bg-white border border-[#D9E8F2] rounded-lg px-3 py-2 text-[#17324D] text-xs focus:outline-none focus:border-[#1268B3]"
                          />
                        </div>

                        <div>
                          <label className="block text-[#17324D] font-semibold mb-1">
                            Commander Dispatch Orders &amp; Tactical Remarks
                          </label>
                          <textarea
                            rows={3}
                            value={dispatchAssignmentNotes}
                            onChange={(e) => setDispatchAssignmentNotes(e.target.value)}
                            placeholder="Enter dispatch directives and tactical staging objectives..."
                            className="w-full bg-white border border-[#D9E8F2] rounded-lg px-3 py-2 text-[#17324D] text-xs focus:outline-none focus:border-[#1268B3]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9E8F2]">
                        <button
                          type="button"
                          onClick={() => setDispatchModalResource(null)}
                          className="px-4 py-2 rounded-lg bg-white hover:bg-[#F4F9FD] text-[#5E7183] border border-[#D9E8F2] text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={dispatchingResource}
                          onClick={handleConfirmDispatch}
                          className="px-4 py-2 rounded-lg bg-[#1268B3] hover:bg-[#0F4C81] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{dispatchingResource ? "Committing..." : "Confirm & Authorize Dispatch"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Module 17: Multi-Source Incident Verification & Consensus Engine */}
              <div className="bg-white p-4 rounded-xl border border-[#D9E8F2] space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAF3F8]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#EAF6FF] text-[#087F68] border border-[#087F68]/30">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-2">
                        <span>Module 17: Multi-Source Incident Verification</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#EAF6FF] text-[#087F68] font-mono border border-[#087F68]/30 font-bold">
                          Consensus Engine
                        </span>
                      </h3>
                      <p className="text-[11px] text-[#5E7183]">
                        Multi-sensor Bayesian consensus with conflict detection &amp; HITL commander verification gate
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={recalculatingVerification || loadingVerification}
                      onClick={handleReevaluateVerification}
                      className="px-2.5 py-1.5 text-xs rounded-lg bg-white hover:bg-[#F3FAFE] text-[#087F68] border border-[#087F68]/40 transition flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                      title="Re-evaluate consensus across all active evidence sources"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#087F68] ${recalculatingVerification ? "animate-spin" : ""}`} />
                      <span>{recalculatingVerification ? "Evaluating..." : "Re-evaluate"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddEvidenceModal}
                      className="px-2.5 py-1.5 text-xs rounded-lg bg-white hover:bg-[#F3FAFE] text-[#1268B3] border border-[#1268B3]/40 transition flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs"
                    >
                      <FilePlus className="w-3.5 h-3.5 text-[#1268B3]" />
                      <span>Add Evidence</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenOverrideModal}
                      className="px-2.5 py-1.5 text-xs rounded-lg bg-white hover:bg-amber-50 text-[#D97706] border border-[#D97706]/40 transition flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs"
                    >
                      <Scale className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>Commander Override</span>
                    </button>
                  </div>
                </div>

                {loadingVerification ? (
                  <div className="p-8 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#087F68]" />
                    <span>Synthesizing multi-source verification dossier...</span>
                  </div>
                ) : !verificationData ? (
                  <div className="p-4 bg-[#F4F9FD] rounded-lg border border-[#D9E8F2] text-xs text-[#5E7183] text-center space-y-2">
                    <p>No verification consensus computed yet for this incident.</p>
                    <button
                      onClick={handleReevaluateVerification}
                      className="px-3 py-1.5 bg-[#087F68] hover:bg-[#066552] text-white rounded text-xs font-semibold"
                    >
                      Run Initial Verification
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Top Consensus Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Decision Status */}
                      <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                        verificationData.decision === "VERIFIED"
                          ? "bg-[#EAFBF7] border-[#087F68]/40"
                          : verificationData.decision === "REJECTED"
                          ? "bg-rose-50 border-rose-200"
                          : "bg-amber-50 border-amber-200"
                      }`}>
                        <span className="text-[10px] text-[#5E7183] uppercase font-semibold">Verification Decision</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          {verificationData.decision === "VERIFIED" ? (
                            <ShieldCheck className="w-4 h-4 text-[#087F68] shrink-0" />
                          ) : verificationData.decision === "REJECTED" ? (
                            <XCircle className="w-4 h-4 text-[#C6283D] shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
                          )}
                          <span className={`text-sm font-extrabold tracking-wide ${
                            verificationData.decision === "VERIFIED"
                              ? "text-[#087F68]"
                              : verificationData.decision === "REJECTED"
                              ? "text-[#C6283D]"
                              : "text-[#D97706]"
                          }`}>
                            {verificationData.decision.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#8A9AA8] mt-1">
                          Signed by: {verificationData.verified_by}
                        </span>
                      </div>

                      {/* Overall Confidence Score */}
                      <div className="p-3 rounded-lg bg-[#F4F9FD] border border-[#D9E8F2] flex flex-col justify-between">
                        <span className="text-[10px] text-[#5E7183] uppercase font-semibold">Consensus Score</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className={`text-xl font-black font-mono ${
                            verificationData.overall_confidence_score >= 70
                              ? "text-[#087F68]"
                              : verificationData.overall_confidence_score >= 40
                              ? "text-[#D97706]"
                              : "text-[#C6283D]"
                          }`}>
                            {verificationData.overall_confidence_score.toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-[#8A9AA8]">weighted</span>
                        </div>
                        <div className="w-full bg-[#D9E8F2] rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              verificationData.overall_confidence_score >= 70
                                ? "bg-[#087F68]"
                                : verificationData.overall_confidence_score >= 40
                                ? "bg-[#D97706]"
                                : "bg-[#C6283D]"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, verificationData.overall_confidence_score))}%` }}
                          />
                        </div>
                      </div>

                      {/* Cross-Source Agreement */}
                      <div className="p-3 rounded-lg bg-[#F4F9FD] border border-[#D9E8F2] flex flex-col justify-between">
                        <span className="text-[10px] text-[#5E7183] uppercase font-semibold">Sensor Agreement</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-xl font-black font-mono text-[#1268B3]">
                            {verificationData.cross_source_agreement_pct.toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-[#8A9AA8]">concurrence</span>
                        </div>
                        <div className="w-full bg-[#D9E8F2] rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-[#1268B3] h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, verificationData.cross_source_agreement_pct))}%` }}
                          />
                        </div>
                      </div>

                      {/* Contradiction / Conflict Status */}
                      <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                        verificationData.contradiction_detected
                          ? "bg-rose-50 border-rose-300 text-[#C6283D]"
                          : "bg-emerald-50 border-emerald-300 text-[#087F68]"
                      }`}>
                        <span className="text-[10px] text-[#5E7183] uppercase font-semibold">Conflict Detector</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          {verificationData.contradiction_detected ? (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full bg-[#C6283D] animate-ping" />
                              <span className="text-xs font-bold text-[#C6283D]">Contradictions Flagged</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full bg-[#087F68]" />
                              <span className="text-xs font-bold text-[#087F68]">Signals Aligned</span>
                            </>
                          )}
                        </div>
                        <span className="text-[9px] text-[#8A9AA8] mt-1">
                          {verificationData.sources_evaluated_count} sources evaluated
                        </span>
                      </div>
                    </div>

                    {/* Contradiction Warning Alert */}
                    {verificationData.contradiction_detected && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-900">
                        <AlertTriangle className="w-4 h-4 text-[#C6283D] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#C6283D]">Tactical Discrepancy Notice: </span>
                          Conflicting evidence detected across sensor streams. At least one source contradicts the primary oil spill hypothesis. Field aerial or in-situ verification is strongly recommended prior to high-cost resource mobilization.
                        </div>
                      </div>
                    )}

                    {/* Rationale and Engine Explanation */}
                    <div className="p-3 rounded-lg bg-[#F4F9FD] border border-[#D9E8F2] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#5E7183] uppercase font-semibold flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-[#1268B3]" />
                          Consensus Justification &amp; Tactical Audit
                        </span>
                        <span className="text-[10px] text-[#8A9AA8] font-mono">
                          {new Date(verificationData.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC
                        </span>
                      </div>
                      <p className="text-[#17324D] leading-relaxed">
                        {verificationData.decision_rationale}
                      </p>
                    </div>

                    {/* Evaluated Evidence Feed */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-1.5">
                          <Radio className="w-4 h-4 text-[#1268B3]" />
                          Cross-Referenced Evidence Feed ({verificationData.evidence_breakdown.length})
                        </h4>
                        <span className="text-[10px] text-[#8A9AA8]">
                          Live • Simulated • Historical Telemetry
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {verificationData.evidence_breakdown.map((ev: VerificationEvidenceItem) => {
                          const getSourceIcon = (code: string) => {
                            switch (code) {
                              case "SATELLITE":
                                return <Satellite className="w-4 h-4 text-[#1268B3]" />;
                              case "DRONE":
                                return <Camera className="w-4 h-4 text-purple-600" />;
                              case "CITIZEN_REPORT":
                                return <Users className="w-4 h-4 text-amber-600" />;
                              case "AIS_VESSEL":
                                return <Anchor className="w-4 h-4 text-[#0B3A66]" />;
                              case "METOCEAN_CONTEXT":
                                return <Waves className="w-4 h-4 text-[#087F68]" />;
                              default:
                                return <FileCheck className="w-4 h-4 text-[#5E7183]" />;
                            }
                          };

                          const getDataOriginBadge = (origin: string) => {
                            switch (origin) {
                              case "LIVE":
                                return "bg-emerald-50 text-[#087F68] border-emerald-200";
                              case "HISTORICAL":
                                return "bg-purple-50 text-purple-700 border-purple-200";
                              default:
                                return "bg-blue-50 text-blue-700 border-blue-200";
                            }
                          };

                          return (
                            <div
                              key={ev.id}
                              className={`p-3 rounded-lg bg-[#F4F9FD] border flex flex-col justify-between space-y-2.5 transition-all shadow-xs ${
                                !ev.agrees_with_spill
                                  ? "border-rose-300 bg-rose-50/50"
                                  : "border-[#D9E8F2] hover:border-[#1268B3]/50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-md bg-white border border-[#D9E8F2]">
                                    {getSourceIcon(ev.source_code)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-[#17324D] text-xs flex items-center gap-1.5">
                                      <span>{ev.provider_name}</span>
                                    </div>
                                    <div className="text-[10px] text-[#5E7183] font-mono">
                                      {ev.source_code} • {ev.evidence_type}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${getDataOriginBadge(ev.data_origin)}`}>
                                    {ev.data_origin}
                                  </span>
                                  {ev.agrees_with_spill ? (
                                    <span className="text-[10px] text-[#087F68] font-semibold flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Confirms Spill
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-[#C6283D] font-semibold flex items-center gap-1">
                                      <X className="w-3 h-3" /> Contradicts (Clean)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Confidence & Weight Gauge */}
                              <div className="grid grid-cols-3 gap-2 p-2 rounded bg-white border border-[#D9E8F2] text-[10px]">
                                <div>
                                  <span className="text-[#5E7183] block">Confidence</span>
                                  <span className="font-mono font-bold text-[#17324D]">
                                    {(ev.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[#5E7183] block">Applied Weight</span>
                                  <span className="font-mono font-bold text-[#1268B3]">
                                    {(ev.weight_applied * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[#5E7183] block">Quality Multiplier</span>
                                  <span className="font-mono font-bold text-[#17324D]">
                                    {ev.quality_score ? `${(ev.quality_score * 100).toFixed(0)}%` : "1.0x"}
                                  </span>
                                </div>
                              </div>

                              {/* Notes */}
                              {ev.notes && (
                                <p className="text-[11px] text-[#5E7183] italic bg-white p-1.5 rounded border border-[#D9E8F2] leading-relaxed">
                                  "{ev.notes}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Weight Distribution Footer Strip */}
                    <div className="p-2.5 rounded-lg bg-[#F4F9FD] border border-[#D9E8F2] text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[#5E7183]">
                      <span className="text-[10px] uppercase font-semibold text-[#5E7183]">
                        Weighted Consensus Matrix:
                      </span>
                      <div className="flex flex-wrap items-center gap-3 font-mono text-[10px]">
                        <span className="text-[#1268B3]">Satellite SAR: 30%</span>
                        <span className="text-purple-600">Drone UAV: 20%</span>
                        <span className="text-[#087F68]">Metocean Buoy: 20%</span>
                        <span className="text-[#0B3A66]">AIS Transponder: 15%</span>
                        <span className="text-amber-600">Citizen Reports: 15%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Module 18: Probable Spill Source Analyzer */}
              <div className="bg-white p-4 rounded-xl border border-[#D9E8F2] space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAF3F8]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5]">
                      <Crosshair className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-2">
                        <span>Module 18: Probable Spill Source Analyzer</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] font-mono border border-[#A9D9F5]">
                          Reverse-Trajectory Engine
                        </span>
                      </h3>
                      <p className="text-[11px] text-[#5E7183]">
                        Backwards Lagrangian drift physics, candidate region ranking, metocean correlation &amp; context synthesis
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    {/* Lookback Horizon Selector */}
                    <div className="flex items-center bg-[#F3FAFE] rounded-lg p-0.5 border border-[#D9E8F2] text-[11px]">
                      <span className="px-2 text-[#5E7183] text-[10px] uppercase font-semibold flex items-center gap-1">
                        <History className="w-3 h-3 text-[#1268B3]" />
                        Lookback:
                      </span>
                      {[12, 24, 48, 72].map((hours) => (
                        <button
                          key={hours}
                          type="button"
                          onClick={() => {
                            setSourceLookbackHours(hours);
                            handleRecalculateSourceAnalysis(hours);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition cursor-pointer ${
                            sourceLookbackHours === hours
                              ? "bg-[#1268B3] text-white shadow-xs"
                              : "text-[#5E7183] hover:text-[#17324D]"
                          }`}
                        >
                          {hours}h
                        </button>
                      ))}
                    </div>

                    {/* Recalculate Button */}
                    <button
                      type="button"
                      disabled={recalculatingSourceAnalysis || loadingSourceAnalysis}
                      onClick={() => handleRecalculateSourceAnalysis()}
                      className="px-2.5 py-1.5 text-xs rounded-lg bg-[#1268B3] hover:bg-[#0F4C81] text-white border border-[#1268B3] transition flex items-center gap-1.5 font-medium cursor-pointer disabled:opacity-50 shadow-xs"
                      title="Run reverse Lagrangian drift simulation and correlated context analysis"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 text-white ${recalculatingSourceAnalysis ? "animate-spin" : ""}`} />
                      <span>{recalculatingSourceAnalysis ? "Analyzing..." : "Re-evaluate Source"}</span>
                    </button>
                  </div>
                </div>

                {loadingSourceAnalysis ? (
                  <div className="p-8 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4 animate-spin text-[#1268B3]" />
                    <span>Executing reverse Lagrangian trajectory &amp; contextual correlation analysis...</span>
                  </div>
                ) : !sourceAnalysisData ? (
                  <div className="p-4 bg-[#F3FAFE] rounded-lg border border-[#D9E8F2] text-xs text-[#5E7183] text-center space-y-2">
                    <p>No reverse-trajectory source analysis computed yet for this incident.</p>
                    <button
                      onClick={() => handleRecalculateSourceAnalysis()}
                      className="px-3 py-1.5 bg-[#1268B3] hover:bg-[#0F4C81] text-white rounded text-xs font-semibold"
                    >
                      Run Source Estimation
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Top Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                      {/* Probable Source Region */}
                      <div className="md:col-span-2 p-3 rounded-lg bg-white border-2 border-[#1268B3] flex flex-col justify-between shadow-xs">
                        <span className="text-[10px] text-[#1268B3] uppercase font-bold flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-[#1268B3]" />
                          Probable Source Region
                        </span>
                        <div className="mt-1">
                          <span className="text-sm font-extrabold text-[#0B3A66] tracking-wide block">
                            {sourceAnalysisData.probable_source_region}
                          </span>
                          <span className="text-[10px] text-[#5E7183] mt-0.5 block">
                            Discharge Point: {sourceAnalysisData.spill_lat != null ? sourceAnalysisData.spill_lat.toFixed(4) : '—'}°N, {sourceAnalysisData.spill_lng != null ? sourceAnalysisData.spill_lng.toFixed(4) : '—'}°E
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-[#5E7183] font-mono">
                          <span className="px-2 py-0.5 rounded bg-[#EAF6FF] border border-[#A9D9F5] text-[#1268B3] font-semibold">
                            {sourceAnalysisData.candidates.length} Candidate Areas Identified
                          </span>
                        </div>
                      </div>

                      {/* Source Confidence Score */}
                      <div className="p-3 rounded-lg bg-[#F3FAFE] border border-[#D9E8F2] flex flex-col justify-between">
                        <span className="text-[10px] text-[#5E7183] uppercase font-semibold">Source Confidence</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className={`text-2xl font-black font-mono ${
                            sourceAnalysisData.overall_confidence_percentage >= 70
                              ? "text-[#087F68]"
                              : sourceAnalysisData.overall_confidence_percentage >= 50
                              ? "text-[#1268B3]"
                              : "text-[#A86A00]"
                          }`}>
                            {sourceAnalysisData.overall_confidence_percentage}%
                          </span>
                          <span className="text-[10px] text-[#8A9AA8]">probabilistic</span>
                        </div>
                        <div className="w-full bg-[#D9E8F2] rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              sourceAnalysisData.overall_confidence_percentage >= 70
                                ? "bg-[#087F68]"
                                : sourceAnalysisData.overall_confidence_percentage >= 50
                                ? "bg-[#1268B3]"
                                : "bg-[#A86A00]"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, sourceAnalysisData.overall_confidence_percentage))}%` }}
                          />
                        </div>
                      </div>

                      {/* Estimated Release Window */}
                      <div className="p-3 rounded-lg bg-[#F3FAFE] border border-[#D9E8F2] flex flex-col justify-between">
                        <span className="text-[10px] text-[#5E7183] uppercase font-semibold">Discharge Window</span>
                        <div className="mt-1">
                          <span className="text-sm font-bold text-[#0B3A66] font-mono block">
                            ~{sourceAnalysisData.estimated_discharge_window_hours}h ago
                          </span>
                          <span className="text-[10px] text-[#5E7183] mt-0.5 block">
                            {new Date(sourceAnalysisData.estimated_discharge_time).toLocaleTimeString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })} UTC
                          </span>
                        </div>
                        <span className="text-[9px] text-[#8A9AA8] mt-1">
                          {sourceAnalysisData.total_evidence_evaluated} evidence points synthesized
                        </span>
                      </div>
                    </div>

                    {/* Statutory Legal & Safety Disclaimer Banner */}
                    <div className="p-3 rounded-lg bg-[#FFF8E8] border border-[#F3D58A] flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-[#A86A00] shrink-0 mt-0.5" />
                      <div className="text-[11px] text-[#A86A00] leading-relaxed">
                        <span className="font-bold text-[#805000] block mb-0.5 uppercase tracking-wide text-[10px]">
                          Statutory Investigation &amp; Compliance Notice
                        </span>
                        {sourceAnalysisData.legal_disclaimer}
                      </div>
                    </div>

                    {/* Candidate Source Areas: Regions A, B, C Ranking */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#1268B3]" />
                          <span>Candidate Source Areas (Ranked by Reverse-Drift Probability)</span>
                        </h4>
                        <span className="text-[10px] text-[#5E7183]">
                          {sourceAnalysisData.candidates.length} ranked candidate zones
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {sourceAnalysisData.candidates.map((cand) => {
                          const candObj = cand as any;
                          const regCode = cand.region_code || candObj.candidate_code || "REGION";
                          const regName = cand.region_name || candObj.name || "Source Candidate";
                          const confScore = Number(cand.confidence_percentage ?? candObj.confidence_score ?? 0);
                          const centerLat = Number(cand.center_lat ?? candObj.latitude ?? 0);
                          const centerLng = Number(cand.center_lng ?? candObj.longitude ?? 0);
                          const radiusKm = Number(cand.radius_km ?? candObj.radius_km ?? 0);
                          const areaKm2 = Number(cand.area_km2 ?? (radiusKm ? Math.PI * radiusKm * radiusKm : 0));
                          const notes = cand.summary_notes || candObj.description || "";
                          const lanes = cand.shipping_lanes_intersected || [];
                          const ports = cand.nearby_ports || [];
                          const vesselsCount = Number(cand.potential_vessels_count ?? 0);

                          const isTop = regCode === "Region A" || regCode === "REGION_A";
                          const isSelected = selectedCandidateCode === regCode;

                          return (
                            <div
                              key={cand.id}
                              onClick={() => setSelectedCandidateCode(isSelected ? null : regCode)}
                              className={`p-3.5 rounded-lg border transition cursor-pointer flex flex-col justify-between space-y-3 bg-white ${
                                isTop
                                  ? "border-2 border-[#1268B3] shadow-sm"
                                  : "border-[#D9E8F2] hover:border-[#1268B3]/60 shadow-xs"
                              } ${isSelected ? "ring-2 ring-[#1268B3]" : ""}`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black uppercase tracking-wider text-[#0B3A66] font-mono">
                                    {regCode}
                                  </span>
                                  <span className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded-full border ${
                                    confScore >= 70
                                      ? "bg-[#EAF6FF] text-[#1268B3] border-[#A9D9F5]"
                                      : confScore >= 50
                                      ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]"
                                      : "bg-[#F3FAFE] text-[#5E7183] border-[#D9E8F2]"
                                  }`}>
                                    {confScore.toFixed(0)}%
                                  </span>
                                </div>
                                <h5 className="text-xs font-bold text-[#17324D]">
                                  {regName}
                                </h5>
                                <p className="text-[11px] text-[#5E7183] leading-snug">
                                  {notes}
                                </p>
                              </div>

                              {/* Candidate Area Details */}
                              <div className="space-y-2 pt-2 border-t border-[#EAF3F8] text-[10px]">
                                <div className="grid grid-cols-2 gap-1 font-mono text-[#5E7183]">
                                  <div>
                                    <span className="text-[#8A9AA8] block">Center:</span>
                                    <span>{centerLat.toFixed(3)}°N, {centerLng.toFixed(3)}°E</span>
                                  </div>
                                  <div>
                                    <span className="text-[#8A9AA8] block">Radius / Area:</span>
                                    <span>{radiusKm} km ({areaKm2.toFixed(0)} km²)</span>
                                  </div>
                                </div>

                                {/* Context Badges */}
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {lanes.map((lane, i) => (
                                    <span
                                      key={i}
                                      className="px-1.5 py-0.5 rounded bg-[#EAF6FF] border border-[#A9D9F5] text-[#1268B3] font-mono text-[9px] flex items-center gap-1"
                                      title={`Shipping Lane: ${lane}`}
                                    >
                                      <Navigation className="w-2.5 h-2.5 text-[#1268B3]" />
                                      {lane.length > 25 ? `${lane.slice(0, 22)}...` : lane}
                                    </span>
                                  ))}
                                  {ports.map((port, i) => (
                                    <span
                                      key={i}
                                      className="px-1.5 py-0.5 rounded bg-[#FFF8E8] border border-[#F3D58A] text-[#A86A00] font-mono text-[9px] flex items-center gap-1"
                                      title={`Nearby Port / Anchorage: ${port}`}
                                    >
                                      <Anchor className="w-2.5 h-2.5 text-[#A86A00]" />
                                      {port}
                                    </span>
                                  ))}
                                  {vesselsCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#F3FAFE] border border-[#D9E8F2] text-[#0B3A66] font-mono text-[9px] flex items-center gap-1">
                                      <Ship className="w-2.5 h-2.5 text-[#1268B3]" />
                                      {vesselsCount} Relevant Vessel{vesselsCount > 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Potentially Relevant Vessels & Contextual Evidence */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-1.5">
                            <Ship className="w-3.5 h-3.5 text-[#1268B3]" />
                            <span>Potentially Relevant Vessels &amp; Context Evidence</span>
                          </h4>
                          <p className="text-[10px] text-[#5E7183]">
                            Contextual entities located within candidate source areas during estimated discharge timeframe. Strictly non-accusatory.
                          </p>
                        </div>
                        <span className="text-[10px] text-[#5E7183] font-mono">
                          {sourceAnalysisData.candidates.reduce((sum, c: any) => sum + (c.evidence?.length || c.evidence_items?.length || 0), 0)} evidence items
                        </span>
                      </div>

                      <div className="space-y-2">
                        {sourceAnalysisData.candidates.flatMap((cand: any) => {
                          const evList = cand.evidence || cand.evidence_items || [];
                          const regCode = cand.region_code || cand.candidate_code || "REGION";
                          return evList.map((ev: any) => ({ ...ev, candidateRegion: regCode }));
                        }).map((item: any) => {
                          const evType = item.evidence_type || item.evidence_category || "EVIDENCE";
                          const isVessel = evType === "AIS_VESSEL_PROXIMITY";
                          const isLane = evType === "SHIPPING_LANE_PROXIMITY" || evType === "SHIPPING_LANE_OVERLAP";
                          const isPort = evType === "PORT_ANCHORAGE_PROXIMITY";
                          const isMetocean = evType === "METOCEAN_DRIFT_VECTOR" || evType === "REVERSE_TRAJECTORY";
                          const weightNum = Number(item.confidence_weight ?? 0);

                          return (
                            <div
                              key={item.id}
                              className="p-3 rounded-lg border border-[#D9E8F2] bg-white text-xs space-y-2 shadow-xs hover:border-[#1268B3]/50 transition-colors"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-[#EAF6FF] border border-[#A9D9F5] text-[9px] font-mono text-[#1268B3] font-bold">
                                    {item.candidateRegion}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${
                                    isVessel
                                      ? "bg-[#EAF6FF] text-[#1268B3] border-[#A9D9F5]"
                                      : isLane
                                      ? "bg-[#EAF6FF] text-[#1268B3] border-[#A9D9F5]"
                                      : isPort
                                      ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]"
                                      : isMetocean
                                      ? "bg-[#EAF6FF] text-[#087F68] border-[#9ADBC8]"
                                      : "bg-[#F3FAFE] text-[#5E7183] border-[#D9E8F2]"
                                  }`}>
                                    {isVessel ? "Potentially Relevant Vessel" : evType.replace(/_/g, " ")}
                                  </span>
                                  {isVessel && (
                                    <span className="text-[10px] text-[#A86A00] font-semibold flex items-center gap-1">
                                      <ShieldAlert className="w-3 h-3 text-[#A86A00]" />
                                      Investigation Required
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[10px] text-[#5E7183] font-mono">
                                  <span>Weight: {(weightNum * 100).toFixed(0)}%</span>
                                </div>
                              </div>

                              <p className="text-[#17324D] text-xs leading-relaxed">
                                {item.description || item.relevance_wording || ""}
                              </p>

                              {/* Vessel / Entity Specific Metadata Chips */}
                              {(item.evidence_data || item.evidence_data_json) && (
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#EAF3F8] text-[10px] text-[#5E7183] font-mono">
                                  {(item.evidence_data?.vessel_name || item.vessel_name || item.evidence_data_json?.name) && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#F3FAFE] border border-[#D9E8F2] text-[#0B3A66] font-medium">
                                      Vessel: {item.evidence_data?.vessel_name || item.vessel_name || item.evidence_data_json?.name}
                                    </span>
                                  )}
                                  {(item.evidence_data?.imo || item.evidence_data_json?.mmsi || item.vessel_mmsi) && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#F3FAFE] border border-[#D9E8F2] text-[#5E7183]">
                                      ID: {item.evidence_data?.imo || item.evidence_data_json?.mmsi || item.vessel_mmsi}
                                    </span>
                                  )}
                                  {(item.evidence_data?.vessel_type || item.vessel_type || item.evidence_data_json?.vessel_type) && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#F3FAFE] border border-[#D9E8F2] text-[#5E7183]">
                                      Type: {item.evidence_data?.vessel_type || item.vessel_type || item.evidence_data_json?.vessel_type}
                                    </span>
                                  )}
                                  {(item.evidence_data?.speed_knots !== undefined || item.vessel_speed_knots !== undefined || item.evidence_data_json?.speed_knots !== undefined) && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#F3FAFE] border border-[#D9E8F2] text-[#5E7183]">
                                      Speed: {item.evidence_data?.speed_knots ?? item.vessel_speed_knots ?? item.evidence_data_json?.speed_knots} kn
                                    </span>
                                  )}
                                  {(item.evidence_data?.distance_km !== undefined || item.vessel_distance_to_candidate_km !== undefined || item.evidence_data_json?.distance_km !== undefined) && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#EAF6FF] border border-[#A9D9F5] text-[#1268B3]">
                                      Dist: {Number(item.evidence_data?.distance_km ?? item.vessel_distance_to_candidate_km ?? item.evidence_data_json?.distance_km ?? 0).toFixed(1)} km
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reverse Trajectory Progression Table */}
                    {sourceAnalysisData.reverse_trajectory && sourceAnalysisData.reverse_trajectory.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-[#1268B3]" />
                            <span>Reverse-Drift Lagrangian Trajectory Steps</span>
                          </h4>
                          <span className="text-[10px] text-[#5E7183]">
                            {sourceAnalysisData.reverse_trajectory.length} time step simulations
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-[#D9E8F2]">
                          <table className="w-full text-[11px] text-left text-[#17324D]">
                            <thead className="bg-[#F3FAFE] text-[#5E7183] text-[10px] uppercase font-mono border-b border-[#D9E8F2]">
                              <tr>
                                <th className="px-3 py-2">Time Step</th>
                                <th className="px-3 py-2">Coordinates</th>
                                <th className="px-3 py-2">Cumulative Drift</th>
                                <th className="px-3 py-2">Uncertainty Radius</th>
                                <th className="px-3 py-2">Metocean Advection</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EAF3F8] font-mono">
                              {sourceAnalysisData.reverse_trajectory.map((pt: any, idx) => {
                                const stepHours = Number(pt.step_hours_ago ?? pt.hours_prior ?? 0);
                                const ptLat = Number(pt.lat ?? pt.latitude ?? 0);
                                const ptLng = Number(pt.lng ?? pt.longitude ?? 0);
                                const ptDist = Number(pt.drift_distance_km ?? 0);
                                const ptRadius = Number(pt.confidence_radius_km ?? pt.uncertainty_radius_km ?? 0);
                                const windSpd = pt.wind_speed_knots ?? "--";
                                const windDir = pt.wind_direction_deg ?? "--";
                                const curSpd = pt.current_speed_knots ?? "--";
                                const curDir = pt.current_direction_deg ?? "--";

                                return (
                                  <tr key={idx} className={idx === 0 ? "bg-[#EAF6FF]/60" : "hover:bg-[#F3FAFE]"}>
                                    <td className="px-3 py-2 font-bold text-[#17324D]">
                                      {stepHours === 0 ? (
                                        <span className="text-[#087F68]">T-0h (Detection)</span>
                                      ) : idx === sourceAnalysisData.reverse_trajectory.length - 1 ? (
                                        <span className="text-[#1268B3]">T-{stepHours}h (Probable Origin)</span>
                                      ) : (
                                        <span>T-{stepHours}h</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {ptLat.toFixed(4)}°N, {ptLng.toFixed(4)}°E
                                    </td>
                                    <td className="px-3 py-2 text-[#1268B3] font-bold">
                                      {ptDist > 0 ? `${ptDist.toFixed(1)} km` : (pt.step_summary || "Origin Advection")}
                                    </td>
                                    <td className="px-3 py-2 text-[#5E7183]">
                                      ±{ptRadius.toFixed(1)} km
                                    </td>
                                    <td className="px-3 py-2 text-[#5E7183]">
                                      {pt.step_summary ? (
                                        <span className="truncate max-w-[260px] block" title={pt.step_summary}>{pt.step_summary}</span>
                                      ) : (
                                        `Wind: ${windSpd} kn @ ${windDir}° | Current: ${curSpd} kn @ ${curDir}°`
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Module 21: Economic Damage Estimator Card */}
              <div className="bg-white p-5 rounded-xl border border-[#D9E8F2] space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAF3F8] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#EAF6FF] border border-[#087F68]/30 text-[#087F68]">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#17324D]">
                          Economic Damage Estimator
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF6FF] text-[#087F68] border border-[#087F68]/30 font-bold uppercase">
                          Module 21
                        </span>
                      </div>
                      <p className="text-xs text-[#5E7183] mt-0.5">
                        Transparent, configurable multi-sector economic impact valuation
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Currency Toggle */}
                    <div className="flex items-center bg-[#F4F9FD] p-1 rounded-lg border border-[#D9E8F2] text-xs">
                      <button
                        type="button"
                        onClick={() => handleRecalculateEconomic("INR")}
                        disabled={recalculatingEconomic || loadingEconomic}
                        className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                          economicCurrency === "INR"
                            ? "bg-[#087F68] text-white shadow-xs"
                            : "text-[#5E7183] hover:text-[#17324D]"
                        }`}
                      >
                        ₹ INR
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRecalculateEconomic("USD")}
                        disabled={recalculatingEconomic || loadingEconomic}
                        className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                          economicCurrency === "USD"
                            ? "bg-[#087F68] text-white shadow-xs"
                            : "text-[#5E7183] hover:text-[#17324D]"
                        }`}
                      >
                        $ USD
                      </button>
                    </div>

                    {/* Configure Assumptions Button */}
                    <button
                      type="button"
                      onClick={handleOpenAssumptionsModal}
                      disabled={loadingEconomic || recalculatingEconomic}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F4F9FD] text-[#1268B3] border border-[#1268B3]/40 text-xs flex items-center gap-1.5 font-semibold transition cursor-pointer shadow-xs"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#1268B3]" />
                      <span>Assumptions</span>
                    </button>

                    {/* Re-estimate Button */}
                    <button
                      type="button"
                      onClick={() => handleRecalculateEconomic()}
                      disabled={loadingEconomic || recalculatingEconomic}
                      className="px-3 py-1.5 rounded-lg bg-[#087F68] hover:bg-[#066552] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${recalculatingEconomic ? "animate-spin" : ""}`} />
                      <span>{recalculatingEconomic ? "Estimating..." : "Recalculate"}</span>
                    </button>
                  </div>
                </div>

                {/* Statutory Disclaimer Badge */}
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span className="font-semibold tracking-wide">
                    MODEL ESTIMATE — NOT AN OFFICIAL GOVERNMENT ECONOMIC ASSESSMENT
                  </span>
                </div>

                {loadingEconomic ? (
                  <div className="py-8 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-[#087F68] border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing incident area, coastal impact, and economic valuation models...</span>
                  </div>
                ) : !economicImpact ? (
                  <div className="py-8 text-center text-xs text-[#5E7183] border border-dashed border-[#D9E8F2] rounded-lg p-6 space-y-2 bg-[#F4F9FD]">
                    <DollarSign className="w-8 h-8 text-[#8A9AA8] mx-auto" />
                    <p>No economic damage assessment computed yet for this incident.</p>
                    <button
                      type="button"
                      onClick={() => handleRecalculateEconomic()}
                      className="mt-2 px-4 py-2 bg-[#087F68] hover:bg-[#066552] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                    >
                      Compute Initial Economic Impact
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Top Summary Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-[#F4F9FD] p-3.5 rounded-xl border border-[#D9E8F2] flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-[#5E7183]">Total Modeled Impact</div>
                          <div className="text-2xl font-black text-[#087F68] mt-0.5">
                            {economicImpact.total_formatted}
                          </div>
                          <div className="text-[10px] text-[#8A9AA8] mt-0.5">
                            {economicImpact.currency} (Calculated with {economicImpact.confidence}% confidence)
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-[#D9E8F2] text-[#087F68] shadow-xs">
                          <DollarSign className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="bg-[#F4F9FD] p-3.5 rounded-xl border border-[#D9E8F2] flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-[#5E7183]">Estimation Confidence</div>
                          <div className="text-2xl font-black text-[#1268B3] mt-0.5">
                            {economicImpact.confidence}%
                          </div>
                          <div className="text-[10px] text-[#8A9AA8] mt-0.5">
                            Based on telemetry &amp; validated parameters
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-[#D9E8F2] text-[#1268B3] shadow-xs">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="bg-[#F4F9FD] p-3.5 rounded-xl border border-[#D9E8F2] flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-[#5E7183]">Sectors Analyzed</div>
                          <div className="text-2xl font-black text-[#0B3A66] mt-0.5">
                            {economicImpact.categories.length} Sectors
                          </div>
                          <div className="text-[10px] text-[#8A9AA8] mt-0.5">
                            Cleanup, Fishing, Tourism, Biz, Infra, Eco
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-[#D9E8F2] text-[#0B3A66] shadow-xs">
                          <Layers className="w-6 h-6" />
                        </div>
                      </div>
                    </div>

                    {/* Exact User Requested Format Table */}
                    <div className="bg-[#F4F9FD] rounded-xl border border-[#D9E8F2] p-4 font-mono">
                      <div className="flex items-center justify-between border-b border-[#D9E8F2] pb-2 mb-3">
                        <span className="text-xs font-bold text-[#17324D] uppercase tracking-wide">
                          Estimated Economic Impact Summary ({economicImpact.currency})
                        </span>
                        <span className="text-[11px] text-[#8A9AA8]">
                          Assumptions snapshot active
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {economicImpact.categories.map((cat) => (
                          <div
                            key={cat.category}
                            className="flex items-center justify-between py-1 px-2 rounded hover:bg-white transition"
                          >
                            <span className="text-[#17324D] flex items-center gap-2 font-sans font-medium">
                              {cat.category.toLowerCase().includes("cleanup") && <Sparkles className="w-3.5 h-3.5 text-[#1268B3]" />}
                              {cat.category.toLowerCase().includes("fish") && <Fish className="w-3.5 h-3.5 text-[#0F4C81]" />}
                              {cat.category.toLowerCase().includes("tour") && <Umbrella className="w-3.5 h-3.5 text-amber-600" />}
                              {cat.category.toLowerCase().includes("bus") && <Building2 className="w-3.5 h-3.5 text-purple-600" />}
                              {cat.category.toLowerCase().includes("infra") && <Anchor className="w-3.5 h-3.5 text-red-600" />}
                              {cat.category.toLowerCase().includes("other") && <Leaf className="w-3.5 h-3.5 text-[#087F68]" />}
                              <span>{cat.category_title}</span>
                            </span>
                            <span className="font-bold text-[#17324D] font-mono">{cat.formatted_amount}</span>
                          </div>
                        ))}
                        <div className="border-t border-[#D9E8F2] pt-2.5 mt-2 flex items-center justify-between px-2 text-sm font-bold text-[#087F68]">
                          <span>Total Estimated Loss</span>
                          <span className="text-base text-[#087F68]">{economicImpact.total_formatted}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sector Mathematical Breakdown Cards */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#1268B3]" />
                        <span>Sector Breakdown &amp; Mathematical Formulation</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {economicImpact.categories.map((cat) => (
                          <div
                            key={cat.category}
                            className="bg-[#F4F9FD] p-3.5 rounded-lg border border-[#D9E8F2] space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#17324D]">{cat.category_title}</span>
                              <span className="font-mono font-bold text-[#087F68]">
                                {cat.formatted_amount}
                              </span>
                            </div>
                            <div className="bg-white p-2 rounded border border-[#D9E8F2] font-mono text-[11px] text-[#1268B3] break-words">
                              {cat.calculation_formula}
                            </div>
                            {cat.assumptions_snapshot?.notes && (
                              <div className="text-[11px] text-[#5E7183]">
                                {cat.assumptions_snapshot.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Module 22: Environmental Recovery Predictor Panel */}
              <div className="bg-white p-5 rounded-xl border border-[#D9E8F2] space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAF3F8] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#EAF6FF] border border-[#087F68]/30 text-[#087F68]">
                      <Sprout className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#17324D]">
                          Environmental Recovery Predictor
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF6FF] text-[#087F68] border border-[#087F68]/30 font-bold uppercase">
                          Module 22
                        </span>
                      </div>
                      <p className="text-xs text-[#5E7183] mt-0.5">
                        Asymptotic multi-horizon ecological regeneration forecasting (1M, 3M, 6M, 12M, 24M)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Lifecycle Transition Button */}
                    {selectedIncident.status !== "RECOVERY" && selectedIncident.status !== "RESOLVED" && (
                      <button
                        type="button"
                        onClick={() => setShowTransitionModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F4FBF7] text-[#087F68] border border-[#087F68]/40 text-xs flex items-center gap-1.5 font-semibold transition cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#087F68]" />
                        <span>Advance to Recovery Stage</span>
                      </button>
                    )}

                    {selectedIncident.status === "RECOVERY" && (
                      <div className="px-2.5 py-1 rounded-lg bg-[#EAFBF7] border border-[#087F68]/30 text-[#087F68] text-xs font-bold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 animate-pulse text-[#087F68]" />
                        <span>Active Recovery Stage</span>
                      </div>
                    )}

                    {/* Recalculate Button */}
                    <button
                      type="button"
                      onClick={handleRecalculateRecovery}
                      disabled={loadingRecovery || recalculatingRecovery}
                      className="px-3 py-1.5 rounded-lg bg-[#087F68] hover:bg-[#066552] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${recalculatingRecovery ? "animate-spin" : ""}`} />
                      <span>{recalculatingRecovery ? "Evaluating..." : "Recalculate Trajectory"}</span>
                    </button>
                  </div>
                </div>

                {/* Statutory Disclaimer Badge */}
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span className="font-semibold tracking-wide">
                    MODEL ESTIMATE — NOT A SCIENTIFIC GUARANTEE OF RECOVERY
                  </span>
                </div>

                {loadingRecovery ? (
                  <div className="py-8 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-[#087F68] border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing baseline habitat regeneration kinetics and cleanup response factors...</span>
                  </div>
                ) : !recoveryData ? (
                  <div className="py-8 text-center text-xs text-[#5E7183] border border-dashed border-[#D9E8F2] rounded-lg p-6 space-y-2 bg-[#F4F9FD]">
                    <Sprout className="w-8 h-8 text-[#8A9AA8] mx-auto" />
                    <p>No environmental recovery projection generated yet for this incident.</p>
                    <button
                      type="button"
                      onClick={handleRecalculateRecovery}
                      className="mt-2 px-4 py-2 bg-[#087F68] hover:bg-[#066552] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                    >
                      Compute Initial Recovery Trajectories
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Telemetry Metrics Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-[#F4F9FD] p-3 rounded-xl border border-[#D9E8F2]">
                        <div className="text-[10px] uppercase font-bold text-[#5E7183]">24M Recovery Index</div>
                        <div className="text-xl font-black text-[#087F68] mt-0.5">
                          {recoveryData.overall_recovery_index_24m}%
                        </div>
                        <div className="text-[10px] text-[#8A9AA8] mt-0.5">Composite 5 biomes</div>
                      </div>

                      <div className="bg-[#F4F9FD] p-3 rounded-xl border border-[#D9E8F2]">
                        <div className="text-[10px] uppercase font-bold text-[#5E7183]">Cleanup Score (M15)</div>
                        <div className="text-xl font-black text-[#1268B3] mt-0.5">
                          {Math.round(recoveryData.cleanup_effectiveness_applied * 100)}%
                        </div>
                        <div className="text-[10px] text-[#8A9AA8] mt-0.5">Response mitigation</div>
                      </div>

                      <div className="bg-[#F4F9FD] p-3 rounded-xl border border-[#D9E8F2]">
                        <div className="text-[10px] uppercase font-bold text-[#5E7183]">Ecosystem Risk (M12)</div>
                        <div className="text-xl font-black text-[#D97706] mt-0.5">
                          {recoveryData.ecosystem_risk_score_applied.toFixed(0)}/100
                        </div>
                        <div className="text-[10px] text-[#8A9AA8] mt-0.5">Habitat vulnerability</div>
                      </div>

                      <div className="bg-[#F4F9FD] p-3 rounded-xl border border-[#D9E8F2]">
                        <div className="text-[10px] uppercase font-bold text-[#5E7183]">Spill Exposure</div>
                        <div className="text-xl font-black text-[#17324D] mt-0.5">
                          {recoveryData.exposure_duration_hours.toFixed(0)}h
                        </div>
                        <div className="text-[10px] text-[#8A9AA8] mt-0.5">{recoveryData.spill_severity_tier} severity</div>
                      </div>
                    </div>

                    {/* Ecosystem Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#D9E8F2] text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedRecoveryEcoTab("ALL")}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                          selectedRecoveryEcoTab === "ALL"
                            ? "bg-[#087F68] text-white shadow-xs"
                            : "text-[#5E7183] hover:text-[#17324D] bg-white border border-[#D9E8F2]"
                        }`}
                      >
                        All Ecosystems
                      </button>
                      {recoveryData.trajectories.map((traj) => (
                        <button
                          key={traj.ecosystem_type}
                          type="button"
                          onClick={() => setSelectedRecoveryEcoTab(traj.ecosystem_type)}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                            selectedRecoveryEcoTab === traj.ecosystem_type
                              ? "bg-[#087F68] text-white shadow-xs"
                              : "text-[#5E7183] hover:text-[#17324D] bg-white border border-[#D9E8F2]"
                          }`}
                        >
                          {traj.ecosystem_type === "MANGROVES" && <Leaf className="w-3.5 h-3.5" />}
                          {traj.ecosystem_type === "CORAL_REEFS" && <Sparkles className="w-3.5 h-3.5" />}
                          {traj.ecosystem_type === "FISHERIES" && <Fish className="w-3.5 h-3.5" />}
                          {traj.ecosystem_type === "MARINE_HABITATS" && <Waves className="w-3.5 h-3.5" />}
                          {traj.ecosystem_type === "COASTAL_ECOSYSTEMS" && <Building2 className="w-3.5 h-3.5" />}
                          <span>{traj.ecosystem_title.split("&")[0].trim()}</span>
                        </button>
                      ))}
                    </div>

                    {/* Trajectory Progress Bars Container */}
                    <div className="space-y-4">
                      {recoveryData.trajectories
                        .filter((traj) => selectedRecoveryEcoTab === "ALL" || selectedRecoveryEcoTab === traj.ecosystem_type)
                        .map((traj) => (
                          <div
                            key={traj.ecosystem_type}
                            className="bg-[#F4F9FD] p-4 rounded-xl border border-[#D9E8F2] space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#D9E8F2] pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#17324D] text-sm">
                                  {traj.ecosystem_title}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white text-[#1268B3] border border-[#D9E8F2] font-mono font-semibold">
                                  k={traj.effective_k} / mo
                                </span>
                              </div>
                              <span className="text-xs font-mono font-bold text-[#087F68]">
                                Max Ceiling: {traj.asymptotic_max}%
                              </span>
                            </div>

                            {/* Horizons Trajectory Visual Bars (1M, 3M, 6M, 12M, 24M) */}
                            <div className="space-y-2 text-xs font-mono">
                              {[
                                { horizon: "1M", label: "1 Month" },
                                { horizon: "3M", label: "3 Months" },
                                { horizon: "6M", label: "6 Months" },
                                { horizon: "12M", label: "12 Months" },
                                { horizon: "24M", label: "24 Months" },
                              ].map(({ horizon, label }) => {
                                const pct = traj.trajectories[horizon] ?? 0;
                                return (
                                  <div key={horizon} className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-[#17324D] w-24 font-bold">{label}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[#8A9AA8] text-[10px] hidden md:inline">
                                          {horizon === "1M" && "Residuals Dissipating"}
                                          {horizon === "3M" && "Initial Colonization"}
                                          {horizon === "6M" && "Biomass Resurgence"}
                                          {horizon === "12M" && "Functional Recovery"}
                                          {horizon === "24M" && "Equilibrium Resiliency"}
                                        </span>
                                        <span className={`font-black ${pct >= 80 ? "text-[#087F68]" : pct >= 50 ? "text-[#1268B3]" : "text-[#D97706]"}`}>
                                          {pct}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="w-full bg-[#D9E8F2] rounded-full h-2.5 overflow-hidden border border-[#D9E8F2]">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          pct >= 80
                                            ? "bg-gradient-to-r from-[#087F68] to-[#1268B3]"
                                            : pct >= 50
                                            ? "bg-gradient-to-r from-[#1268B3] to-[#4DB8E8]"
                                            : "bg-gradient-to-r from-[#D97706] to-[#1268B3]"
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Milestones Chips */}
                            {traj.milestones && traj.milestones.length > 0 && (
                              <div className="pt-2 border-t border-[#D9E8F2] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                                {traj.milestones.slice(0, 3).map((m, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-2 rounded-lg border flex items-center gap-2 ${
                                      m.reached
                                        ? "bg-[#EAFBF7] border-[#087F68]/30 text-[#087F68]"
                                        : "bg-white border-[#D9E8F2] text-[#8A9AA8]"
                                    }`}
                                  >
                                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${m.reached ? "text-[#087F68]" : "text-[#8A9AA8]"}`} />
                                    <span className="truncate">{m.description}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Module 23: Smart Alert & Restriction System Panel */}
              <div className="bg-white p-5 rounded-2xl border border-[#D9E8F2] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#EAF3F8] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B3A66] flex items-center gap-2">
                        <span>Smart Alerts &amp; Recommended Restrictions</span>
                        <span className="badge badge-danger text-[9px] font-mono">Module 23</span>
                      </h3>
                      <p className="text-[11px] text-[#5E7183]">
                        Multi-domain telemetry alerts (Risk &ge; 76, Fishing &le; 6h, Port &le; 12h, Landfall &le; 6h)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={handleIncidentEvaluateAlerts}
                      disabled={evaluatingAlerts}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0B3A66] hover:bg-[#0F4C81] text-white border border-[#0B3A66] transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${evaluatingAlerts ? "animate-spin text-white" : ""}`} />
                      <span>{evaluatingAlerts ? "Evaluating..." : "Evaluate Telemetry"}</span>
                    </button>
                    <Link
                      to="/alerts"
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-[#C6283D] transition flex items-center gap-1"
                    >
                      <span>Command Center &rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* Statutory Operational Distinction */}
                <div className="p-3 rounded-xl bg-[#F4F9FD] border border-[#D9E8F2] flex flex-wrap items-center justify-between text-[11px] gap-2">
                  <span className="text-[#5E7183]">
                    <strong className="text-[#0B3A66]">Enforcement Protocol:</strong> Restrictions remain advisory until confirmed by the duty commander.
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-[9px]">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">SYSTEM ALERT</span>
                    <span className="text-[#8A9AA8]">&rarr;</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">RECOMMENDED</span>
                    <span className="text-[#8A9AA8]">&rarr;</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#087F68] border border-emerald-200 font-semibold">OPERATOR CONFIRMED</span>
                  </div>
                </div>

                {loadingAlerts ? (
                  <div className="py-4 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#1268B3]" />
                    <span>Evaluating active telemetry rules...</span>
                  </div>
                ) : incidentAlerts.length > 0 ? (
                  <div className="space-y-2.5">
                    {incidentAlerts.map((alert) => {
                      const isCritical = alert.severity === "CRITICAL";

                      return (
                        <div
                          key={alert.id}
                          className={`p-3.5 rounded-xl border text-xs ${
                            isCritical
                              ? "bg-rose-50/70 border-rose-200 text-rose-950"
                              : alert.severity === "HIGH"
                              ? "bg-amber-50/70 border-amber-200 text-amber-950"
                              : "bg-[#F8FBFE] border-[#D9E8F2] text-[#17324D]"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                                    isCritical
                                      ? "bg-rose-100 text-[#C6283D] border border-rose-300"
                                      : "bg-amber-100 text-amber-800 border border-amber-300"
                                  }`}
                                >
                                  {alert.severity}
                                </span>
                                <span className="font-bold text-[#0B3A66] text-xs">{alert.title}</span>
                                <span className="text-[10px] text-[#5E7183] font-mono">({alert.alert_type})</span>
                              </div>
                              <p className="text-[#5E7183] mt-1 leading-relaxed text-[11px]">{alert.message}</p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                              {alert.status === "ACTIVE" && (
                                <button
                                  onClick={() => handleIncidentAcknowledgeAlert(alert.id)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#0B3A66] hover:bg-[#0F4C81] text-white border border-[#0B3A66] transition cursor-pointer"
                                >
                                  Acknowledge
                                </button>
                              )}
                              {alert.recommended_restriction && alert.restriction_status === "RECOMMENDED" && (
                                <>
                                  <button
                                    onClick={() => handleIncidentConfirmRestriction(alert.id, true)}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#087F68] hover:bg-[#066352] text-white transition flex items-center gap-1 shadow-xs cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Confirm</span>
                                  </button>
                                  <button
                                    onClick={() => handleIncidentConfirmRestriction(alert.id, false)}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#C6283D] hover:bg-[#A32032] text-white transition flex items-center gap-1 shadow-xs cursor-pointer"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Advisory Box if exists */}
                          {alert.recommended_restriction && (
                            <div className="mt-2.5 p-2.5 rounded-lg bg-white border border-[#D9E8F2] flex flex-wrap items-center justify-between gap-2 text-[10px]">
                              <span className="text-[#17324D]">
                                <strong className="text-[#0B3A66]">Advisory:</strong> {alert.recommended_restriction}
                              </span>
                              <span className="font-mono font-semibold">
                                {alert.restriction_status === "RECOMMENDED" && (
                                  <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Advisory Pending Confirmation
                                  </span>
                                )}
                                {alert.restriction_status === "OPERATOR_CONFIRMED" && (
                                  <span className="text-[#087F68] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    ✓ Confirmed by {alert.confirmed_by || "Operator"}
                                  </span>
                                )}
                                {alert.restriction_status === "OPERATOR_REJECTED" && (
                                  <span className="text-[#C6283D] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                    ✗ Rejected by {alert.confirmed_by || "Operator"}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-[#5E7183]">
                    No active smart alerts recorded for this incident. Click <strong>Evaluate Telemetry</strong> to run multi-domain rule evaluation.
                  </div>
                )}
              </div>

              {/* Chronological Incident Timeline & Audit Trail */}
              <div className="bg-white p-5 rounded-2xl border border-[#D9E8F2] shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#087F68]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B3A66]">
                      Chronological Incident Event Timeline
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#5E7183] font-medium">Audit trail</span>
                </div>

                {loadingEvents ? (
                  <div className="py-4 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#087F68] border-t-transparent rounded-full animate-spin" />
                    <span>Loading audit log...</span>
                  </div>
                ) : incidentEvents.length > 0 ? (
                  <div className="space-y-3 border-l-2 border-[#D9E8F2] pl-3.5 ml-1.5">
                    {incidentEvents.map((evt) => (
                      <div key={evt.id} className="relative pb-2 last:pb-0 text-xs">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#087F68] border-2 border-white shadow-xs" />
                        <div className="flex items-center gap-2 text-[10px] text-[#5E7183] font-mono">
                          <span>{new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          <span className="font-bold text-[#087F68] uppercase">{evt.event_type.replace(/_/g, " ")}</span>
                        </div>
                        <p className="text-[#17324D] text-xs mt-0.5 leading-relaxed">
                          {evt.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[#5E7183] italic text-center py-2">
                    Primary detection recorded. Awaiting operational dispatch events.
                  </div>
                )}
              </div>

              {/* Description & Intelligence Notes */}
              <div className="bg-white p-5 rounded-2xl border border-[#D9E8F2] shadow-sm">
                <h4 className="text-xs font-bold text-[#0B3A66] mb-1.5">
                  Anomaly Summary &amp; Tactical Notes
                </h4>
                <p className="text-xs text-[#5E7183] leading-relaxed">
                  {selectedIncident.description ||
                    "Synthetic aperture radar (SAR) detected anomalous dark patch indicating potential hydrocarbon discharge. Spectral characteristics consistent with medium crude oil sheen."}
                </p>
              </div>

              {/* Quick Action Navigation */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <Link
                  to={`/map?incidentId=${selectedIncident.id}`}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <span>Launch Spatial Analysis on Interactive Map</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-[#D9E8F2] text-center text-[#5E7183] shadow-sm">
              Select an incident from the list to view comprehensive intelligence dossier.
            </div>
          )}
        </div>
      </div>

      {/* Containment Team Dispatch Modal */}
      {showDispatchModal && selectedIncident && (
        <div className="fixed inset-0 bg-[#0B3A66]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-[#D9E8F2] text-[#17324D] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF3F8]">
              <div className="flex items-center gap-2 text-[#0B3A66] font-bold text-sm">
                <Send className="w-4 h-4 text-[#C6283D]" />
                <span>Deploy Containment Assets</span>
              </div>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="p-1 rounded-lg text-[#5E7183] hover:text-[#0B3A66] hover:bg-[#F4F9FD] transition cursor-pointer"
                aria-label="Close dispatch modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F4F9FD] border border-[#D9E8F2] space-y-1">
                <div className="text-[#5E7183]">Target Incident:</div>
                <div className="font-bold text-[#0B3A66] text-sm">
                  {selectedIncident.incident_code} ({selectedIncident.severity} Severity)
                </div>
                <div className="text-[#5E7183] text-[11px]">
                  Coordinates: {selectedIncident.latitude?.toFixed(4)}°N, {selectedIncident.longitude?.toFixed(4)}°E
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1">
                  Dispatch Mission Directives &amp; Asset Note
                </label>
                <textarea
                  rows={3}
                  value={dispatchNote}
                  onChange={(e) => setDispatchNote(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="font-bold">Operational Impact:</div>
                <div>
                  Advances incident status to <span className="font-semibold text-[#0B3A66]">RESPONSE ACTIVE</span> and registers a verified audit milestone in PostGIS.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAF3F8]">
              <button
                onClick={() => setShowDispatchModal(false)}
                disabled={updating}
                className="px-3 py-1.5 rounded-lg text-xs text-[#5E7183] hover:text-[#0B3A66] hover:bg-[#F4F9FD] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchContainment}
                disabled={updating}
                className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{updating ? "Deploying..." : "Confirm Tactical Dispatch"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module 17: Submit Field Evidence Modal */}
      {showAddEvidenceModal && selectedIncident && (
        <div className="fixed inset-0 bg-[#0B3A66]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-[#D9E8F2] text-[#17324D] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF3F8]">
              <div className="flex items-center gap-2 text-[#0B3A66] font-bold text-sm">
                <FilePlus className="w-4 h-4 text-[#1268B3]" />
                <span>Submit Field Evidence &amp; Telemetry</span>
              </div>
              <button
                onClick={() => setShowAddEvidenceModal(false)}
                className="p-1 rounded-lg text-[#5E7183] hover:text-[#0B3A66] hover:bg-[#F4F9FD] cursor-pointer"
                aria-label="Close evidence modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence} className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F4F9FD] border border-[#D9E8F2] space-y-1">
                <div className="text-[#5E7183]">Target Incident:</div>
                <div className="font-bold text-[#0B3A66] text-sm">
                  {selectedIncident.incident_code} ({selectedIncident.severity} Severity)
                </div>
                <div className="text-[#5E7183] text-[11px]">
                  Coordinates: {selectedIncident.latitude?.toFixed(4)}°N, {selectedIncident.longitude?.toFixed(4)}°E
                </div>
              </div>

              {/* Source Category & Provider Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1">
                    Source Category
                  </label>
                  <select
                    value={evidenceSourceCode}
                    onChange={(e) => setEvidenceSourceCode(e.target.value)}
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] focus:outline-none focus:border-[#1268B3] font-mono"
                  >
                    <option value="DRONE">DRONE (UAV Aerial / Thermal)</option>
                    <option value="CITIZEN_REPORT">CITIZEN_REPORT (Spotters &amp; Public)</option>
                    <option value="AIS_VESSEL">AIS_VESSEL (Vessel Telemetry)</option>
                    <option value="METOCEAN_CONTEXT">METOCEAN_CONTEXT (Buoy &amp; Weather)</option>
                    <option value="SATELLITE">SATELLITE (SAR / Optical)</option>
                    <option value="MANUAL">MANUAL (In-Situ Marine Patrol)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1">
                    Sensor / Provider Callsign
                  </label>
                  <input
                    type="text"
                    required
                    value={evidenceProviderName}
                    onChange={(e) => setEvidenceProviderName(e.target.value)}
                    placeholder="e.g. UAV Alpha-1 Thermal..."
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                  />
                </div>
              </div>

              {/* Evidence Type & Origin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1">
                    Evidence Classification
                  </label>
                  <input
                    type="text"
                    required
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    placeholder="e.g. UAV_THERMAL_SURVEILLANCE"
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] focus:outline-none focus:border-[#1268B3] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1">
                    Data Provenance
                  </label>
                  <select
                    value={evidenceDataOrigin}
                    onChange={(e) => setEvidenceDataOrigin(e.target.value)}
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] focus:outline-none focus:border-[#1268B3] font-mono"
                  >
                    <option value="LIVE">LIVE (Real-time telemetry / feed)</option>
                    <option value="SIMULATED">SIMULATED (Drift model / test scenario)</option>
                    <option value="HISTORICAL">HISTORICAL (Prior baseline survey)</option>
                  </select>
                </div>
              </div>

              {/* Confidence & Quality Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F4F9FD] rounded-xl border border-[#D9E8F2]">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-[#5E7183] uppercase font-semibold">
                      Confidence Score
                    </label>
                    <span className="text-xs font-mono font-bold text-[#1268B3]">
                      {evidenceConfidence}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={evidenceConfidence}
                    onChange={(e) => setEvidenceConfidence(Number(e.target.value))}
                    className="w-full accent-[#1268B3] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-[#5E7183] uppercase font-semibold">
                      Sensor Quality Multiplier
                    </label>
                    <span className="text-xs font-mono font-bold text-[#087F68]">
                      {(evidenceQualityScore / 100).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={evidenceQualityScore}
                    onChange={(e) => setEvidenceQualityScore(Number(e.target.value))}
                    className="w-full accent-[#087F68] cursor-pointer"
                  />
                </div>
              </div>

              {/* Signal Stance Toggle */}
              <div>
                <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1.5">
                  Signal Finding
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEvidenceAgreesWithSpill(true)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      evidenceAgreesWithSpill
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                        : "bg-white border-[#D9E8F2] text-[#5E7183] hover:text-[#17324D]"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 text-[#087F68]" />
                    <span>Confirms Oil Spill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceAgreesWithSpill(false)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      !evidenceAgreesWithSpill
                        ? "bg-rose-50 border-rose-500 text-rose-800 shadow-sm"
                        : "bg-white border-[#D9E8F2] text-[#5E7183] hover:text-[#17324D]"
                    }`}
                  >
                    <X className="w-3.5 h-3.5 text-[#C6283D]" />
                    <span>Contradicts (Clean Water)</span>
                  </button>
                </div>
              </div>

              {/* Tactical Observation Notes */}
              <div>
                <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1">
                  Tactical Observation Remarks &amp; Metadata Notes
                </label>
                <textarea
                  rows={3}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="Enter detailed in-situ sensor findings, spectral readings, or eyewitness testimony..."
                  className="w-full p-2.5 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAF3F8]">
                <button
                  type="button"
                  onClick={() => setShowAddEvidenceModal(false)}
                  disabled={submittingEvidence}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#5E7183] hover:text-[#0B3A66] hover:bg-[#F4F9FD] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEvidence}
                  className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 cursor-pointer"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>{submittingEvidence ? "Recording Evidence..." : "Record & Recalculate Consensus"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module 17: Commander Decision Override Modal */}
      {showOverrideModal && selectedIncident && (
        <div className="fixed inset-0 bg-[#0B3A66]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-amber-300 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF3F8]">
              <div className="flex items-center gap-2 text-[#0B3A66] font-bold text-sm">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>Authorize Decision Override</span>
              </div>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="p-1 rounded-lg text-[#5E7183] hover:text-[#0B3A66] hover:bg-[#F4F9FD] cursor-pointer"
                aria-label="Close override modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitOverride} className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F4F9FD] border border-[#D9E8F2] space-y-1">
                <div className="text-[#5E7183]">Target Incident:</div>
                <div className="font-bold text-[#0B3A66] text-sm">
                  {selectedIncident.incident_code} — Current System Status: <span className="text-[#1268B3] font-mono">{selectedIncident.status}</span>
                </div>
                <div className="text-[#5E7183] text-[11px]">
                  Consensus Engine Output: <strong className="text-[#0B3A66]">{verificationData?.overall_confidence_score}% Confidence ({verificationData?.decision})</strong>
                </div>
              </div>

              {/* Target Decision Selection */}
              <div>
                <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1.5">
                  Designated Override Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideDecision("VERIFIED")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      overrideDecision === "VERIFIED"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                        : "bg-white border-[#D9E8F2] text-[#5E7183] hover:text-[#17324D]"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#087F68]" />
                    <span>VERIFIED</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideDecision("NEEDS_REVIEW")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      overrideDecision === "NEEDS_REVIEW"
                        ? "bg-amber-50 border-amber-500 text-amber-800 shadow-sm"
                        : "bg-white border-[#D9E8F2] text-[#5E7183] hover:text-[#17324D]"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>NEEDS REVIEW</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideDecision("REJECTED")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      overrideDecision === "REJECTED"
                        ? "bg-rose-50 border-rose-500 text-rose-800 shadow-sm"
                        : "bg-white border-[#D9E8F2] text-[#5E7183] hover:text-[#17324D]"
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 text-[#C6283D]" />
                    <span>REJECTED</span>
                  </button>
                </div>
              </div>

              {/* Authorizing Commander */}
              <div>
                <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1">
                  Authorizing Commander / Officer Name
                </label>
                <input
                  type="text"
                  required
                  value={overrideOperator}
                  onChange={(e) => setOverrideOperator(e.target.value)}
                  placeholder="e.g. Commander Sarah Chen (MRCC Port Blair)"
                  className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                />
              </div>

              {/* Mandatory Rationale */}
              <div>
                <label className="text-[10px] text-[#5E7183] uppercase font-semibold block mb-1">
                  Command Rationale &amp; Authorizing Directives <span className="text-[#C6283D]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="Provide statutory justification, in-situ corroboration, or reason for diverging from automated consensus..."
                  className="w-full p-2.5 bg-white border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Audit Trail Impact:</span>
                </div>
                <div>
                  This action overrides autonomous consensus, advances the incident lifecycle status, and writes an immutable <span className="font-semibold text-[#0B3A66]">VERIFICATION_OVERRIDDEN</span> audit record in the PostGIS event log.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAF3F8]">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  disabled={submittingOverride}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#5E7183] hover:text-[#0B3A66] hover:bg-[#F4F9FD] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{submittingOverride ? "Authorizing..." : "Sign & Authorize Override"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module 21: Economic Assumptions Modal */}
      {showAssumptionsModal && (
        <div className="fixed inset-0 bg-[#0B3A66]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D9E8F2] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAF3F8] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[#087F68]">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B3A66]">Economic Model Assumptions &amp; Unit Rates</h3>
                  <p className="text-xs text-[#5E7183]">
                    Customize baseline financial parameters without altering statutory official indices
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssumptionsModal(false)}
                className="p-1 rounded-lg text-[#5E7183] hover:text-[#0B3A66] hover:bg-[#F4F9FD] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#F4F9FD] border border-[#D9E8F2] text-[#5E7183] text-[11px] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#1268B3] shrink-0" />
                <span>
                  Unit rates are parameterized in INR (₹) base values. Values convert automatically when USD is selected.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Offshore Cleanup Unit Rate */}
                <div>
                  <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                    Offshore Cleanup Rate (₹/km²)
                  </label>
                  <input
                    type="number"
                    value={editingAssumptions.cleanup_cost_per_km2 ?? 1500000}
                    onChange={(e) =>
                      setEditingAssumptions((prev) => ({
                        ...prev,
                        cleanup_cost_per_km2: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] font-mono text-xs focus:outline-none focus:border-[#1268B3]"
                  />
                  <span className="text-[10px] text-[#8A9AA8]">Skimmers, booms, dispersants</span>
                </div>

                {/* Shoreline Cleanup Unit Rate */}
                <div>
                  <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                    Shoreline Cleanup Rate (₹/km)
                  </label>
                  <input
                    type="number"
                    value={editingAssumptions.shoreline_cleanup_per_km ?? 2500000}
                    onChange={(e) =>
                      setEditingAssumptions((prev) => ({
                        ...prev,
                        shoreline_cleanup_per_km: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] font-mono text-xs focus:outline-none focus:border-[#1268B3]"
                  />
                  <span className="text-[10px] text-[#8A9AA8]">Manual scraping, wash trucks</span>
                </div>

                {/* Fisheries Daily Value */}
                <div>
                  <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                    Fisheries Daily Value (₹/km²/day)
                  </label>
                  <input
                    type="number"
                    value={editingAssumptions.fisheries_daily_value_per_km2 ?? 75000}
                    onChange={(e) =>
                      setEditingAssumptions((prev) => ({
                        ...prev,
                        fisheries_daily_value_per_km2: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] font-mono text-xs focus:outline-none focus:border-[#1268B3]"
                  />
                  <span className="text-[10px] text-[#8A9AA8]">Catch loss &amp; artisanal fisheries</span>
                </div>

                {/* Fisheries Recovery Days */}
                <div>
                  <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                    Fisheries Default Recovery Days
                  </label>
                  <input
                    type="number"
                    value={editingAssumptions.fisheries_recovery_days_default ?? 30}
                    onChange={(e) =>
                      setEditingAssumptions((prev) => ({
                        ...prev,
                        fisheries_recovery_days_default: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] font-mono text-xs focus:outline-none focus:border-[#1268B3]"
                  />
                  <span className="text-[10px] text-[#8A9AA8]">Estimated ban / toxicity duration</span>
                </div>

                {/* Tourism Daily Value */}
                <div>
                  <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                    Tourism Daily Loss (₹/km coast/day)
                  </label>
                  <input
                    type="number"
                    value={editingAssumptions.tourism_daily_value_per_km ?? 120000}
                    onChange={(e) =>
                      setEditingAssumptions((prev) => ({
                        ...prev,
                        tourism_daily_value_per_km: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] font-mono text-xs focus:outline-none focus:border-[#1268B3]"
                  />
                  <span className="text-[10px] text-[#8A9AA8]">Beach resorts, hospitality</span>
                </div>

                {/* Tourism Disruption Days */}
                <div>
                  <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                    Tourism Disruption Days
                  </label>
                  <input
                    type="number"
                    value={editingAssumptions.tourism_disruption_days_default ?? 21}
                    onChange={(e) =>
                      setEditingAssumptions((prev) => ({
                        ...prev,
                        tourism_disruption_days_default: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] font-mono text-xs focus:outline-none focus:border-[#1268B3]"
                  />
                  <span className="text-[10px] text-[#8A9AA8]">Beach closure &amp; cancellation window</span>
                </div>

                {/* Coastal Business Daily Loss */}
                <div>
                  <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                    Coastal Business Loss (₹/km coast/day)
                  </label>
                  <input
                    type="number"
                    value={editingAssumptions.business_daily_loss_per_km ?? 85000}
                    onChange={(e) =>
                      setEditingAssumptions((prev) => ({
                        ...prev,
                        business_daily_loss_per_km: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] font-mono text-xs focus:outline-none focus:border-[#1268B3]"
                  />
                  <span className="text-[10px] text-[#8A9AA8]">Local coastal supply chains</span>
                </div>

                {/* Infrastructure Daily Loss */}
                <div>
                  <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                    Infrastructure Loss (₹/facility/day)
                  </label>
                  <input
                    type="number"
                    value={editingAssumptions.infrastructure_daily_loss_per_facility ?? 450000}
                    onChange={(e) =>
                      setEditingAssumptions((prev) => ({
                        ...prev,
                        infrastructure_daily_loss_per_facility: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] font-mono text-xs focus:outline-none focus:border-[#1268B3]"
                  />
                  <span className="text-[10px] text-[#8A9AA8]">Ports, berths, water intakes</span>
                </div>

                {/* Ecosystem Remediation per Point */}
                <div>
                  <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                    Ecosystem Remediation (₹/risk pt)
                  </label>
                  <input
                    type="number"
                    value={editingAssumptions.other_ecosystem_remediation_per_point ?? 25000}
                    onChange={(e) =>
                      setEditingAssumptions((prev) => ({
                        ...prev,
                        other_ecosystem_remediation_per_point: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] font-mono text-xs focus:outline-none focus:border-[#1268B3]"
                  />
                  <span className="text-[10px] text-[#8A9AA8]">Mangrove &amp; coral restoration</span>
                </div>

                {/* Exchange Rate USD to INR */}
                <div>
                  <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                    USD / INR Exchange Rate
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingAssumptions.exchange_rate_usd_to_inr ?? 83.5}
                    onChange={(e) =>
                      setEditingAssumptions((prev) => ({
                        ...prev,
                        exchange_rate_usd_to_inr: parseFloat(e.target.value) || 1,
                      }))
                    }
                    className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] font-mono text-xs focus:outline-none focus:border-[#1268B3]"
                  />
                  <span className="text-[10px] text-[#8A9AA8]">Forex conversion baseline</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#EAF3F8]">
              <button
                type="button"
                onClick={() => {
                  if (assumptionsData) {
                    setEditingAssumptions({
                      cleanup_cost_per_km2: assumptionsData.cleanup_cost_per_km2,
                      shoreline_cleanup_per_km: assumptionsData.shoreline_cleanup_per_km,
                      fisheries_daily_value_per_km2: assumptionsData.fisheries_daily_value_per_km2,
                      fisheries_recovery_days_default: assumptionsData.fisheries_recovery_days_default,
                      tourism_daily_value_per_km: assumptionsData.tourism_daily_value_per_km,
                      tourism_disruption_days_default: assumptionsData.tourism_disruption_days_default,
                      business_daily_loss_per_km: assumptionsData.business_daily_loss_per_km,
                      business_disruption_days_default: assumptionsData.business_disruption_days_default,
                      infrastructure_daily_loss_per_facility: assumptionsData.infrastructure_daily_loss_per_facility,
                      infrastructure_disruption_days_default: assumptionsData.infrastructure_disruption_days_default,
                      other_ecosystem_remediation_per_point: assumptionsData.other_ecosystem_remediation_per_point,
                      exchange_rate_usd_to_inr: assumptionsData.exchange_rate_usd_to_inr,
                    });
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs text-[#5E7183] hover:text-[#0B3A66] hover:bg-[#F4F9FD] transition cursor-pointer"
              >
                Reset to Baselines
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssumptionsModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#5E7183] hover:text-[#0B3A66] hover:bg-[#F4F9FD] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRecalculateEconomic()}
                  disabled={recalculatingEconomic}
                  className="px-4 py-2 rounded-lg bg-[#087F68] hover:bg-[#066352] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply &amp; Recalculate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module 22: Lifecycle Transition to Recovery Modal */}
      {showTransitionModal && (
        <div className="fixed inset-0 bg-[#0B3A66]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D9E8F2] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EAF3F8] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B3A66]">Advance to Environmental Recovery Stage</h3>
                  <p className="text-xs text-[#5E7183]">Transition incident from tactical response to 24-month monitoring</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransitionModal(false)}
                className="p-1 rounded-lg text-[#5E7183] hover:text-[#0B3A66] hover:bg-[#F4F9FD] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                  Authorizing Commander / Officer
                </label>
                <input
                  type="text"
                  value={transitionOfficer}
                  onChange={(e) => setTransitionOfficer(e.target.value)}
                  className="w-full p-2 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] text-xs focus:outline-none focus:border-[#1268B3]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#0B3A66] block mb-1">
                  Transition Rationale &amp; Directives
                </label>
                <textarea
                  rows={3}
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D9E8F2] rounded-lg text-[#17324D] text-xs focus:outline-none focus:border-[#1268B3]"
                />
              </div>

              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Audit Trail Impact:</span>
                </div>
                <div>
                  Advances incident status to <span className="font-bold text-[#0B3A66]">RECOVERY</span> and records an immutable LIFECYCLE_STAGE_TRANSITION event in the incident audit trail.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAF3F8]">
              <button
                type="button"
                onClick={() => setShowTransitionModal(false)}
                disabled={transitioningRecovery}
                className="px-3 py-1.5 rounded-lg text-xs text-[#5E7183] hover:text-[#0B3A66] hover:bg-[#F4F9FD] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLifecycleTransition}
                disabled={transitioningRecovery}
                className="px-4 py-2 rounded-lg bg-[#087F68] hover:bg-[#066352] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{transitioningRecovery ? "Advancing..." : "Authorize Recovery Stage"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
