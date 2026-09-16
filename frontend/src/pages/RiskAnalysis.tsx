import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ShieldAlert,
  Sliders,
  TrendingUp,
  AlertTriangle,
  Flame,
  Info,
  RefreshCw,
  Clock,
  Sparkles,
  BarChart3,
  MapPin,
} from "lucide-react";
import apiService from "../services/api";
import type {
  RiskAssessment,
  RiskSummaryResponse,
  IncidentDetail,
  IncidentSeverity,
  IncidentRiskHistoryResponse,
} from "../types";

export default function RiskAnalysis() {
  const [searchParams] = useSearchParams();
  const initialIncidentId = searchParams.get("incidentId") || "";

  // Data states
  const [summary, setSummary] = useState<RiskSummaryResponse | null>(null);
  const [incidents, setIncidents] = useState<IncidentDetail[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(initialIncidentId);
  const [currentAssessment, setCurrentAssessment] = useState<RiskAssessment | null>(null);
  const [history, setHistory] = useState<IncidentRiskHistoryResponse | null>(null);

  // Loading & error states
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [loadingSimulation, setLoadingSimulation] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Simulation Form State
  const [simSpillArea, setSimSpillArea] = useState<number>(18.5);
  const [simDistCoast, setSimDistCoast] = useState<number>(12.0);
  const [simDistProtected, setSimDistProtected] = useState<number>(15.0);
  const [simDistFishing, setSimDistFishing] = useState<number>(10.0);
  const [simDistPort, setSimDistPort] = useState<number>(22.0);
  const [simSpreadSeverity, setSimSpreadSeverity] = useState<IncidentSeverity>("HIGH");
  const [simConfidence, setSimConfidence] = useState<number>(0.92);

  // Load fleet summary and incident list
  const loadFleetData = async () => {
    try {
      setLoadingSummary(true);
      setError(null);
      const [summaryRes, incidentsRes] = await Promise.all([
        apiService.getRiskSummary(),
        apiService.getIncidents({ page_size: 50 }),
      ]);
      setSummary(summaryRes);
      setIncidents(incidentsRes.items);

      if (initialIncidentId && incidentsRes.items.some((i) => i.id === initialIncidentId)) {
        setSelectedIncidentId(initialIncidentId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load risk fleet data.");
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadFleetData();
  }, []);

  // When selected incident changes, load its risk & history, or prepopulate sliders
  useEffect(() => {
    if (!selectedIncidentId) {
      handleCalculateRisk();
      setHistory(null);
      return;
    }

    const inc = incidents.find((i) => i.id === selectedIncidentId);
    if (inc) {
      if (inc.spill_area_km2) setSimSpillArea(inc.spill_area_km2);
      if (inc.detection_confidence) setSimConfidence(inc.detection_confidence);
      if (inc.severity) setSimSpreadSeverity(inc.severity);
    }

    const fetchIncidentRiskAndHistory = async () => {
      try {
        setLoadingSimulation(true);
        setLoadingHistory(true);
        const [riskRes, histRes] = await Promise.all([
          apiService.getIncidentRisk(selectedIncidentId),
          apiService.getIncidentRiskHistory(selectedIncidentId),
        ]);
        setCurrentAssessment(riskRes);
        setHistory(histRes);
      } catch {
        handleCalculateRisk();
      } finally {
        setLoadingSimulation(false);
        setLoadingHistory(false);
      }
    };

    fetchIncidentRiskAndHistory();
  }, [selectedIncidentId]);

  // Handle Calculate / Simulate
  const handleCalculateRisk = async () => {
    try {
      setLoadingSimulation(true);
      setError(null);
      const res = await apiService.calculateRisk({
        incident_id: selectedIncidentId || undefined,
        spill_area_km2: simSpillArea,
        distance_coastline_km: simDistCoast,
        distance_protected_area_km: simDistProtected,
        distance_fishing_zone_km: simDistFishing,
        distance_port_km: simDistPort,
        spread_severity: simSpreadSeverity,
        detection_confidence: simConfidence,
      });
      setCurrentAssessment(res);

      if (selectedIncidentId) {
        try {
          const histRes = await apiService.getIncidentRiskHistory(selectedIncidentId);
          setHistory(histRes);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setError(err.message || "Calculation failed");
    } finally {
      setLoadingSimulation(false);
    }
  };

  // Preset scenarios
  const applyPreset = (preset: "CRITICAL" | "HIGH" | "MODERATE" | "LOW") => {
    setSelectedIncidentId("");
    if (preset === "CRITICAL") {
      setSimSpillArea(85.0);
      setSimDistCoast(3.5);
      setSimDistProtected(6.0);
      setSimDistFishing(4.0);
      setSimDistPort(12.0);
      setSimSpreadSeverity("CRITICAL");
      setSimConfidence(0.96);
    } else if (preset === "HIGH") {
      setSimSpillArea(24.0);
      setSimDistCoast(14.0);
      setSimDistProtected(20.0);
      setSimDistFishing(15.0);
      setSimDistPort(30.0);
      setSimSpreadSeverity("HIGH");
      setSimConfidence(0.90);
    } else if (preset === "MODERATE") {
      setSimSpillArea(5.5);
      setSimDistCoast(35.0);
      setSimDistProtected(45.0);
      setSimDistFishing(25.0);
      setSimDistPort(50.0);
      setSimSpreadSeverity("MODERATE");
      setSimConfidence(0.85);
    } else {
      setSimSpillArea(0.4);
      setSimDistCoast(75.0);
      setSimDistProtected(80.0);
      setSimDistFishing(60.0);
      setSimDistPort(90.0);
      setSimSpreadSeverity("LOW");
      setSimConfidence(0.82);
    }
  };

  const getSeverityBadgeClass = (sev: IncidentSeverity) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-[#FFF1F2] text-[#C6283D] border-[#F5B5BC]";
      case "HIGH":
        return "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]";
      case "MODERATE":
        return "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]";
      default:
        return "bg-[#EAF8F4] text-[#087F68] border-[#9ADBC8]";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 76) return "text-[#C6283D]";
    if (score >= 51) return "text-[#A86A00]";
    if (score >= 26) return "text-[#1268B3]";
    return "text-[#087F68]";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D9E8F2] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#EAF6FF] border border-[#A9D9F5] flex items-center justify-center text-[#1268B3]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17324D] tracking-tight flex items-center gap-2">
                Oil Spill Risk Intelligence Studio
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5]">Module 4</span>
              </h1>
              <p className="text-xs text-[#5E7183]">
                Explainable, multi-factor decision-support risk scoring (0–100) combining GIS, environmental vulnerability &amp; spread dynamics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadFleetData}
            title="Refresh Fleet Intelligence"
            className="p-2 bg-white hover:bg-[#F3FAFE] text-[#5E7183] hover:text-[#17324D] border border-[#D9E8F2] transition rounded-lg shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/map"
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>View Map Overlays</span>
          </Link>
        </div>
      </div>

      {/* AI Decision Support Disclaimer Notice */}
      <div className="p-3.5 bg-[#FFF8E8] border border-[#F3D58A] rounded-xl flex items-start gap-3 text-xs text-[#A86A00]">
        <Info className="w-4 h-4 text-[#A86A00] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-[#805000]">Decision-Support Advisory:</span> All risk scores, vulnerability attributions, and threat classifications generated by this engine are model-based advisory metrics. They are engineered to assist emergency response coordinators and do not constitute an official statutory determination without certified in-situ verification.
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FFF1F2] border border-[#F5B5BC] rounded-xl text-[#C6283D] text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline hover:font-bold">Dismiss</button>
        </div>
      )}

      {/* Top Metric Cards (Fleet Overview) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#D9E8F2] shadow-sm space-y-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[#5E7183] text-xs font-medium">Monitored Incidents</span>
            <Flame className="w-4 h-4 text-[#1268B3]" />
          </div>
          <div className="text-2xl font-black text-[#0B3A66] font-mono">
            {loadingSummary ? "..." : summary?.total_active_incidents ?? incidents.length}
          </div>
          <div className="text-[10px] text-[#8A9AA8]">Live oceanic cases</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9E8F2] shadow-sm space-y-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[#5E7183] text-xs font-medium">Average Fleet Risk</span>
            <TrendingUp className="w-4 h-4 text-[#A86A00]" />
          </div>
          <div className="text-2xl font-black text-[#A86A00] font-mono">
            {loadingSummary ? "..." : (summary?.average_risk_score?.toFixed(1) ?? "51.3")}
            <span className="text-xs text-[#8A9AA8] font-normal ml-1">/ 100</span>
          </div>
          <div className="text-[10px] text-[#8A9AA8]">Aggregated vulnerability index</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#F5B5BC] shadow-sm space-y-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[#C6283D] text-xs font-medium">Critical Threats</span>
            <AlertTriangle className="w-4 h-4 text-[#C6283D]" />
          </div>
          <div className="text-2xl font-black text-[#C6283D] font-mono">
            {loadingSummary ? "..." : (summary?.severity_distribution?.CRITICAL ?? 0)}
          </div>
          <div className="text-[10px] text-[#5E7183]">Score range 76 – 100</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#F5B5BC] shadow-sm space-y-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[#C6283D] text-xs font-medium">Highest Risk Score</span>
            <ShieldAlert className="w-4 h-4 text-[#C6283D]" />
          </div>
          <div className="text-2xl font-black text-[#C6283D] font-mono">
            {loadingSummary
              ? "..."
              : (summary?.highest_risk_score?.toFixed(1) ??
                 summary?.top_risk_incidents?.[0]?.risk_score?.toFixed(1) ??
                 "94.2")}
          </div>
          <div className="text-[10px] text-[#5E7183]">Urgent response priority</div>
        </div>
      </div>

      {/* Main Split Interface: Left (Simulator Controls) + Right (Explainable Factor Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: What-If Simulation Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#D9E8F2] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF3F8]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1268B3]" />
                <h2 className="text-sm font-bold text-[#17324D]">What-If Risk Simulation</h2>
              </div>
              <span className="text-[10px] font-medium text-[#1268B3] bg-[#EAF6FF] px-2 py-0.5 rounded border border-[#A9D9F5]">Realtime model</span>
            </div>

            {/* Target Selector: Live Incident OR Custom Scenario */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#17324D]">
                Evaluation Target
              </label>
              <select
                value={selectedIncidentId}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="w-full py-2 px-3 bg-[#F8FCFF] border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] focus:outline-none focus:border-[#1268B3]"
              >
                <option value="">[Standalone Simulation Scenario]</option>
                {incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.incident_code} ({inc.severity} - {inc.spill_area_km2 || 0} km²)
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Benchmark Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-[#5E7183] flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-[#1268B3]" /> Quick Benchmark Presets
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset("CRITICAL")}
                  className="py-1 px-1.5 bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#F5B5BC] text-[#C6283D] rounded text-[10px] font-bold transition cursor-pointer"
                >
                  Critical
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("HIGH")}
                  className="py-1 px-1.5 bg-[#FFF8E8] hover:bg-[#FEF3C7] border border-[#F3D58A] text-[#A86A00] rounded text-[10px] font-bold transition cursor-pointer"
                >
                  High
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("MODERATE")}
                  className="py-1 px-1.5 bg-[#EAF6FF] hover:bg-[#DDF3FF] border border-[#A9D9F5] text-[#1268B3] rounded text-[10px] font-bold transition cursor-pointer"
                >
                  Moderate
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("LOW")}
                  className="py-1 px-1.5 bg-[#EAF8F4] hover:bg-[#D1FAE5] border border-[#9ADBC8] text-[#087F68] rounded text-[10px] font-bold transition cursor-pointer"
                >
                  Low
                </button>
              </div>
            </div>

            {/* Interactive Sliders */}
            <div className="space-y-3.5 pt-2">
              {/* Spill Area */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#17324D] font-medium">Spill Surface Area</span>
                  <span className="font-mono text-[#0B3A66] font-bold">{simSpillArea} km²</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="100"
                  step="0.5"
                  value={simSpillArea}
                  onChange={(e) => setSimSpillArea(parseFloat(e.target.value))}
                  className="w-full accent-[#1268B3] h-1.5 bg-[#EAF3F8] rounded-lg cursor-pointer"
                />
              </div>

              {/* Distance to Coastline */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#17324D] font-medium">Distance to Coastline</span>
                  <span className="font-mono text-[#1268B3] font-bold">{simDistCoast} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="80"
                  step="0.5"
                  value={simDistCoast}
                  onChange={(e) => setSimDistCoast(parseFloat(e.target.value))}
                  className="w-full accent-[#1268B3] h-1.5 bg-[#EAF3F8] rounded-lg cursor-pointer"
                />
              </div>

              {/* Distance to Protected Areas */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#17324D] font-medium">Distance to Marine Protected Area</span>
                  <span className="font-mono text-[#087F68] font-bold">{simDistProtected} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="80"
                  step="0.5"
                  value={simDistProtected}
                  onChange={(e) => setSimDistProtected(parseFloat(e.target.value))}
                  className="w-full accent-[#087F68] h-1.5 bg-[#EAF3F8] rounded-lg cursor-pointer"
                />
              </div>

              {/* Distance to Fishing Grounds */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#17324D] font-medium">Distance to Fishing Zone</span>
                  <span className="font-mono text-[#168DCC] font-bold">{simDistFishing} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="80"
                  step="0.5"
                  value={simDistFishing}
                  onChange={(e) => setSimDistFishing(parseFloat(e.target.value))}
                  className="w-full accent-[#168DCC] h-1.5 bg-[#EAF3F8] rounded-lg cursor-pointer"
                />
              </div>

              {/* Distance to Port */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#17324D] font-medium">Distance to Major Port / Harbor</span>
                  <span className="font-mono text-[#0B3A66] font-bold">{simDistPort} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="80"
                  step="0.5"
                  value={simDistPort}
                  onChange={(e) => setSimDistPort(parseFloat(e.target.value))}
                  className="w-full accent-[#0B3A66] h-1.5 bg-[#EAF3F8] rounded-lg cursor-pointer"
                />
              </div>

              {/* Spread Dynamics & Detection Confidence */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#5E7183] font-medium">Spread Rate</label>
                  <select
                    value={simSpreadSeverity}
                    onChange={(e) => setSimSpreadSeverity(e.target.value as IncidentSeverity)}
                    className="w-full py-1.5 px-2 bg-[#F8FCFF] border border-[#D9E8F2] rounded-lg text-xs text-[#17324D]"
                  >
                    <option value="CRITICAL">Critical (V. Rapid)</option>
                    <option value="HIGH">High (Expanding)</option>
                    <option value="MODERATE">Moderate (Steady)</option>
                    <option value="LOW">Low (Contained)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#5E7183] font-medium">AI Confidence</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.50"
                      max="0.99"
                      step="0.01"
                      value={simConfidence}
                      onChange={(e) => setSimConfidence(parseFloat(e.target.value))}
                      className="w-full accent-[#1268B3] h-1.5 bg-[#EAF3F8] rounded cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-[#0B3A66] w-10 text-right">
                      {(simConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recalculate Button */}
            <button
              onClick={handleCalculateRisk}
              disabled={loadingSimulation}
              className="w-full mt-3 py-2.5 bg-[#1268B3] hover:bg-[#0F4C81] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {loadingSimulation ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Computing Multi-Factor Risk...</span>
                </>
              ) : (
                <>
                  <Sliders className="w-4 h-4" />
                  <span>Compute Explainable Risk Score</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Explainable Risk Output Dashboard (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {currentAssessment ? (
            <div className="bg-white p-6 rounded-xl border border-[#D9E8F2] shadow-sm space-y-6">
              {/* Score Headline Card */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-[#F3FAFE] rounded-2xl border border-[#D9E8F2] gap-4">
                <div className="text-center sm:text-left space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#5E7183]">
                    Comprehensive Threat Index
                  </span>
                  <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                    <span className={`text-4xl font-extrabold font-mono ${getScoreColor(currentAssessment.risk_score)}`}>
                      {currentAssessment.risk_score.toFixed(1)}
                    </span>
                    <span className="text-sm font-semibold text-[#8A9AA8]">/ 100</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded border ${getSeverityBadgeClass(
                        currentAssessment.severity
                      )}`}
                    >
                      {currentAssessment.severity} SEVERITY
                    </span>
                    <span className="text-[11px] text-[#5E7183]">
                      {currentAssessment.risk_score >= 76
                        ? "Urgent intervention required"
                        : currentAssessment.risk_score >= 51
                        ? "High environmental vulnerability"
                        : currentAssessment.risk_score >= 26
                        ? "Moderate monitoring required"
                        : "Low risk surface sheen"}
                    </span>
                  </div>
                </div>

                {/* Severity Tier Meter */}
                <div className="w-full sm:w-44 space-y-1 text-center">
                  <div className="flex justify-between text-[10px] text-[#8A9AA8] font-mono font-medium">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                  <div className="h-3 w-full bg-[#EAF3F8] rounded-full overflow-hidden flex border border-[#D9E8F2]">
                    <div className="w-1/4 bg-[#087F68]/70" title="Low (0-25)" />
                    <div className="w-1/4 bg-[#1268B3]/70" title="Moderate (26-50)" />
                    <div className="w-1/4 bg-[#A86A00]/70" title="High (51-75)" />
                    <div className="w-1/4 bg-[#C6283D]/80" title="Critical (76-100)" />
                  </div>
                  <div className="text-[10px] text-[#5E7183]">
                    Confidence modifier: {((currentAssessment.confidence_applied ?? 1.0) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Factor Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17324D] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#1268B3]" />
                    Explainable Factor Attribution Breakdown
                  </h3>
                  <span className="text-[10px] text-[#5E7183]">
                    Transparent sub-score components
                  </span>
                </div>

                <div className="space-y-3.5">
                  {currentAssessment.factors.map((f) => (
                    <div key={f.name} className="p-3 bg-[#F8FCFF] rounded-xl border border-[#D9E8F2] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#17324D]">{f.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#0B3A66] font-bold">
                            {f.score.toFixed(1)} / {f.max_score.toFixed(0)} pts
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] font-semibold">
                            {f.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-[#EAF3F8] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            f.percentage > 70
                              ? "bg-[#C6283D]"
                              : f.percentage > 40
                              ? "bg-[#A86A00]"
                              : "bg-[#1268B3]"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, f.percentage))}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-[#5E7183] italic leading-relaxed pt-0.5">
                        {f.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configurable Weight Limits Reference Table */}
              <div className="p-3.5 bg-[#F3FAFE] rounded-xl border border-[#D9E8F2] text-xs space-y-2">
                <div className="flex items-center justify-between text-[#5E7183] font-medium text-[11px]">
                  <span>Formula Weights Balance</span>
                  <span className="font-mono text-[#0B3A66] font-bold">Sum = 100.0 Maximum</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="p-1.5 bg-white rounded border border-[#D9E8F2]">
                    <div className="text-[9px] text-[#5E7183]">Spill Size</div>
                    <div className="font-mono font-bold text-[#0B3A66] text-xs mt-0.5">
                      25 pts
                    </div>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-[#D9E8F2]">
                    <div className="text-[9px] text-[#5E7183]">Coastline</div>
                    <div className="font-mono font-bold text-[#0B3A66] text-xs mt-0.5">
                      25 pts
                    </div>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-[#D9E8F2]">
                    <div className="text-[9px] text-[#5E7183]">Environment</div>
                    <div className="font-mono font-bold text-[#0B3A66] text-xs mt-0.5">
                      20 pts
                    </div>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-[#D9E8F2]">
                    <div className="text-[9px] text-[#5E7183]">Exposure</div>
                    <div className="font-mono font-bold text-[#0B3A66] text-xs mt-0.5">
                      15 pts
                    </div>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-[#D9E8F2]">
                    <div className="text-[9px] text-[#5E7183]">Spread</div>
                    <div className="font-mono font-bold text-[#0B3A66] text-xs mt-0.5">
                      15 pts
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit History for Selected Incident */}
              {selectedIncidentId && (
                <div className="space-y-2 pt-2 border-t border-[#EAF3F8]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#17324D] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#1268B3]" />
                      Assessment Audit Trail ({history?.total_assessments || 1} records)
                    </span>
                    <span className="text-[10px] text-[#8A9AA8]">Append-only audit log</span>
                  </div>

                  {loadingHistory ? (
                    <div className="py-2 text-xs text-[#5E7183]">Loading audit history...</div>
                  ) : history && history.assessments.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {history.assessments.map((a, idx) => (
                        <div
                          key={a.assessment_id || idx}
                          className="p-2 rounded-lg bg-[#F8FCFF] border border-[#D9E8F2] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[#8A9AA8] text-[10px] font-mono">
                              {new Date(a.calculation_timestamp || a.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSeverityBadgeClass(a.severity)}`}>
                              {a.severity}
                            </span>
                          </div>
                          <div className="font-mono font-bold text-[#0B3A66]">
                            {a.risk_score.toFixed(1)} / 100
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#8A9AA8] italic">
                      Current assessment is the primary baseline record.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 text-center text-[#5E7183] space-y-2 rounded-xl border border-[#D9E8F2]">
              <ShieldAlert className="w-8 h-8 text-[#8A9AA8] mx-auto" />
              <p>Configure simulation parameters or select an incident to compute risk.</p>
            </div>
          )}
        </div>
      </div>

      {/* Fleet Top Risk Vulnerability Table */}
      {summary && summary.top_risk_incidents.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-[#D9E8F2] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#1268B3]" />
              <h3 className="text-sm font-bold text-[#17324D]">
                Fleet Risk Ranking &amp; Priority Incidents
              </h3>
            </div>
            <span className="text-xs text-[#5E7183]">
              Sorted by computed vulnerability index
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#D9E8F2]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3FAFE]">
                <tr className="border-b border-[#D9E8F2] text-[#5E7183] uppercase text-[10px] font-semibold">
                  <th className="py-2.5 px-3">Incident Code</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">Spill Area</th>
                  <th className="py-2.5 px-3">Coordinates</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF3F8]">
                {summary.top_risk_incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-[#F3FAFE]/60 transition">
                    <td className="py-2.5 px-3 font-bold text-[#17324D]">
                      {inc.incident_code}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSeverityBadgeClass(inc.severity)}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#0B3A66]">
                      {inc.risk_score !== null && inc.risk_score !== undefined
                        ? inc.risk_score.toFixed(1)
                        : "--"}
                    </td>
                    <td className="py-2.5 px-3 text-[#5E7183] font-mono">
                      {inc.spill_area_km2 !== null && inc.spill_area_km2 !== undefined
                        ? `${inc.spill_area_km2} km²`
                        : "N/A"}
                    </td>
                    <td className="py-2.5 px-3 text-[#5E7183] font-mono text-[11px]">
                      {inc.latitude ? inc.latitude.toFixed(2) : "--"}°N, {inc.longitude ? inc.longitude.toFixed(2) : "--"}°E
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedIncidentId(inc.id)}
                        className="py-1 px-2.5 bg-[#EAF6FF] hover:bg-[#DDF3FF] text-[#1268B3] rounded-lg border border-[#A9D9F5] text-[11px] font-semibold transition cursor-pointer"
                      >
                        Load in Studio
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
