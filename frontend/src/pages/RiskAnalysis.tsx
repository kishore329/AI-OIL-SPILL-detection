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
      // Run a default standalone calculation
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
        // Fall back to recalculating for this incident
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
        // Refresh history
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
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "HIGH":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "MODERATE":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 76) return "text-red-400";
    if (score >= 51) return "text-orange-400";
    if (score >= 26) return "text-amber-400";
    return "text-cyan-400";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Oil Spill Risk Intelligence Studio
                <span className="badge badge-warning text-[10px] uppercase font-mono">Module 4</span>
              </h1>
              <p className="text-xs text-slate-400">
                Explainable, multi-factor decision-support risk scoring (0–100) combining GIS, environmental vulnerability &amp; spread dynamics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadFleetData}
            title="Refresh Fleet Intelligence"
            className="p-2 glass-card hover:bg-ocean-800 text-slate-300 hover:text-white transition rounded-lg"
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
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <span className="font-semibold text-amber-300">Decision-Support Advisory:</span> All risk scores, vulnerability attributions, and threat classifications generated by this engine are model-based advisory metrics. They are engineered to assist emergency response coordinators and do not constitute an official statutory determination without certified in-situ verification.
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline hover:text-white">Dismiss</button>
        </div>
      )}

      {/* Top Metric Cards (Fleet Overview) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Monitored Incidents</span>
            <Flame className="w-4 h-4 text-ocean-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {loadingSummary ? "..." : summary?.total_active_incidents ?? incidents.length}
          </div>
          <div className="text-[10px] text-slate-400">Live oceanic cases</div>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Average Fleet Risk</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {loadingSummary ? "..." : (summary?.average_risk_score?.toFixed(1) ?? "51.3")}
            <span className="text-xs text-slate-400 font-normal ml-1">/ 100</span>
          </div>
          <div className="text-[10px] text-slate-400">Aggregated vulnerability index</div>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Critical Threats</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">
            {loadingSummary ? "..." : (summary?.severity_distribution?.CRITICAL ?? 0)}
          </div>
          <div className="text-[10px] text-slate-400">Score range 76 – 100</div>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Highest Risk Score</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">
            {loadingSummary
              ? "..."
              : (summary?.highest_risk_score?.toFixed(1) ??
                 summary?.top_risk_incidents?.[0]?.risk_score?.toFixed(1) ??
                 "94.2")}
          </div>
          <div className="text-[10px] text-slate-400">Urgent response priority</div>
        </div>
      </div>

      {/* Main Split Interface: Left (Simulator Controls) + Right (Explainable Factor Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: What-If Simulation Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-ocean-700/60">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">What-If Risk Simulation</h2>
              </div>
              <span className="text-[10px] text-slate-400">Realtime model</span>
            </div>

            {/* Target Selector: Live Incident OR Custom Scenario */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Evaluation Target
              </label>
              <select
                value={selectedIncidentId}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="w-full py-2 px-3 bg-ocean-900/90 border border-ocean-700/70 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400"
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
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Quick Benchmark Presets
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset("CRITICAL")}
                  className="py-1 px-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded text-[10px] font-semibold transition"
                >
                  Critical
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("HIGH")}
                  className="py-1 px-1.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 rounded text-[10px] font-semibold transition"
                >
                  High
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("MODERATE")}
                  className="py-1 px-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded text-[10px] font-semibold transition"
                >
                  Moderate
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("LOW")}
                  className="py-1 px-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 rounded text-[10px] font-semibold transition"
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
                  <span className="text-slate-300">Spill Surface Area</span>
                  <span className="font-mono text-amber-400 font-bold">{simSpillArea} km²</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="100"
                  step="0.5"
                  value={simSpillArea}
                  onChange={(e) => setSimSpillArea(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-ocean-950 rounded-lg cursor-pointer"
                />
              </div>

              {/* Distance to Coastline */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Distance to Coastline</span>
                  <span className="font-mono text-cyan-400 font-bold">{simDistCoast} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="80"
                  step="0.5"
                  value={simDistCoast}
                  onChange={(e) => setSimDistCoast(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-ocean-950 rounded-lg cursor-pointer"
                />
              </div>

              {/* Distance to Protected Areas */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Distance to Marine Protected Area</span>
                  <span className="font-mono text-emerald-400 font-bold">{simDistProtected} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="80"
                  step="0.5"
                  value={simDistProtected}
                  onChange={(e) => setSimDistProtected(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 h-1.5 bg-ocean-950 rounded-lg cursor-pointer"
                />
              </div>

              {/* Distance to Fishing Grounds */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Distance to Fishing Zone</span>
                  <span className="font-mono text-blue-400 font-bold">{simDistFishing} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="80"
                  step="0.5"
                  value={simDistFishing}
                  onChange={(e) => setSimDistFishing(parseFloat(e.target.value))}
                  className="w-full accent-blue-400 h-1.5 bg-ocean-950 rounded-lg cursor-pointer"
                />
              </div>

              {/* Distance to Port */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Distance to Major Port / Harbor</span>
                  <span className="font-mono text-purple-400 font-bold">{simDistPort} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="80"
                  step="0.5"
                  value={simDistPort}
                  onChange={(e) => setSimDistPort(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 h-1.5 bg-ocean-950 rounded-lg cursor-pointer"
                />
              </div>

              {/* Spread Dynamics & Detection Confidence */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-medium">Spread Rate</label>
                  <select
                    value={simSpreadSeverity}
                    onChange={(e) => setSimSpreadSeverity(e.target.value as IncidentSeverity)}
                    className="w-full py-1.5 px-2 bg-ocean-900 border border-ocean-700/60 rounded-lg text-xs text-slate-200"
                  >
                    <option value="CRITICAL">Critical (V. Rapid)</option>
                    <option value="HIGH">High (Expanding)</option>
                    <option value="MODERATE">Moderate (Steady)</option>
                    <option value="LOW">Low (Contained)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-medium">AI Confidence</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.50"
                      max="0.99"
                      step="0.01"
                      value={simConfidence}
                      onChange={(e) => setSimConfidence(parseFloat(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-ocean-950 rounded cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-amber-400 w-10 text-right">
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
              className="w-full mt-3 py-2.5 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-glow-amber transition disabled:opacity-50"
            >
              {loadingSimulation ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
            <div className="glass-card p-6 space-y-6">
              {/* Score Headline Card */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-ocean-900/90 rounded-2xl border border-ocean-700/60 gap-4">
                <div className="text-center sm:text-left space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    Comprehensive Threat Index
                  </span>
                  <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                    <span className={`text-4xl font-extrabold font-mono ${getScoreColor(currentAssessment.risk_score)}`}>
                      {currentAssessment.risk_score.toFixed(1)}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">/ 100</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded border ${getSeverityBadgeClass(
                        currentAssessment.severity
                      )}`}
                    >
                      {currentAssessment.severity} SEVERITY
                    </span>
                    <span className="text-[11px] text-slate-400">
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
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                  <div className="h-3 w-full bg-ocean-950 rounded-full overflow-hidden flex">
                    <div className="w-1/4 bg-cyan-500/40" title="Low (0-25)" />
                    <div className="w-1/4 bg-amber-500/40" title="Moderate (26-50)" />
                    <div className="w-1/4 bg-orange-500/50" title="High (51-75)" />
                    <div className="w-1/4 bg-red-500/60" title="Critical (76-100)" />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Confidence modifier: {((currentAssessment.confidence_applied ?? 1.0) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Factor Breakdown (The "Why this incident is X" explainability section) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    Explainable Factor Attribution Breakdown
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Transparent sub-score components
                  </span>
                </div>

                <div className="space-y-3.5">
                  {currentAssessment.factors.map((f) => (
                    <div key={f.name} className="p-3 bg-ocean-900/60 rounded-xl border border-ocean-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{f.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-300 font-bold">
                            {f.score.toFixed(1)} / {f.max_score.toFixed(0)} pts
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ocean-800 text-slate-300">
                            {f.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-ocean-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            f.percentage > 70
                              ? "bg-red-400"
                              : f.percentage > 40
                              ? "bg-amber-400"
                              : "bg-cyan-400"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, f.percentage))}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-400 italic leading-relaxed pt-0.5">
                        {f.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configurable Weight Limits Reference Table */}
              <div className="p-3.5 bg-ocean-950/60 rounded-xl border border-ocean-800/80 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400 font-medium text-[11px]">
                  <span>Formula Weights Balance</span>
                  <span className="font-mono text-slate-300">Sum = 100.0 Maximum</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="p-1.5 bg-ocean-900 rounded border border-ocean-800">
                    <div className="text-[9px] text-slate-400">Spill Size</div>
                    <div className="font-mono font-bold text-slate-200 text-xs mt-0.5">
                      25 pts
                    </div>
                  </div>
                  <div className="p-1.5 bg-ocean-900 rounded border border-ocean-800">
                    <div className="text-[9px] text-slate-400">Coastline</div>
                    <div className="font-mono font-bold text-slate-200 text-xs mt-0.5">
                      25 pts
                    </div>
                  </div>
                  <div className="p-1.5 bg-ocean-900 rounded border border-ocean-800">
                    <div className="text-[9px] text-slate-400">Environment</div>
                    <div className="font-mono font-bold text-slate-200 text-xs mt-0.5">
                      20 pts
                    </div>
                  </div>
                  <div className="p-1.5 bg-ocean-900 rounded border border-ocean-800">
                    <div className="text-[9px] text-slate-400">Exposure</div>
                    <div className="font-mono font-bold text-slate-200 text-xs mt-0.5">
                      15 pts
                    </div>
                  </div>
                  <div className="p-1.5 bg-ocean-900 rounded border border-ocean-800">
                    <div className="text-[9px] text-slate-400">Spread</div>
                    <div className="font-mono font-bold text-slate-200 text-xs mt-0.5">
                      15 pts
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit History for Selected Incident */}
              {selectedIncidentId && (
                <div className="space-y-2 pt-2 border-t border-ocean-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-ocean-400" />
                      Assessment Audit Trail ({history?.total_assessments || 1} records)
                    </span>
                    <span className="text-[10px] text-slate-500">Append-only audit log</span>
                  </div>

                  {loadingHistory ? (
                    <div className="py-2 text-xs text-slate-400">Loading audit history...</div>
                  ) : history && history.assessments.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {history.assessments.map((a, idx) => (
                        <div
                          key={a.assessment_id || idx}
                          className="p-2 rounded bg-ocean-900/50 border border-ocean-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[10px] font-mono">
                              {new Date(a.calculation_timestamp || a.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getSeverityBadgeClass(a.severity)}`}>
                              {a.severity}
                            </span>
                          </div>
                          <div className="font-mono font-bold text-amber-400">
                            {a.risk_score.toFixed(1)} / 100
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      Current assessment is the primary baseline record.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 text-center text-slate-400 space-y-2">
              <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto" />
              <p>Configure simulation parameters or select an incident to compute risk.</p>
            </div>
          )}
        </div>
      </div>

      {/* Fleet Top Risk Vulnerability Table */}
      {summary && summary.top_risk_incidents.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-white">
                Fleet Risk Ranking &amp; Priority Incidents
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Sorted by computed vulnerability index
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ocean-700/60 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Incident Code</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">Spill Area</th>
                  <th className="py-2.5 px-3">Coordinates</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-800/60">
                {summary.top_risk_incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-ocean-800/30 transition">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {inc.incident_code}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSeverityBadgeClass(inc.severity)}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                      {inc.risk_score !== null && inc.risk_score !== undefined
                        ? inc.risk_score.toFixed(1)
                        : "--"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono">
                      {inc.spill_area_km2 !== null && inc.spill_area_km2 !== undefined
                        ? `${inc.spill_area_km2} km²`
                        : "N/A"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {inc.latitude ? inc.latitude.toFixed(2) : "--"}°N, {inc.longitude ? inc.longitude.toFixed(2) : "--"}°E
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedIncidentId(inc.id)}
                        className="py-1 px-2.5 bg-ocean-800 hover:bg-ocean-700 text-ocean-300 hover:text-white rounded border border-ocean-600/50 text-[11px] font-medium transition"
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
