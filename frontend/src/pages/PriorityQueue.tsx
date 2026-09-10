import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ListOrdered,
  Flame,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  AlertOctagon,
  Shield,
  Activity,
  SlidersHorizontal,
  Waves,
  Eye,
} from "lucide-react";
import apiService from "../services/api";
import type { PriorityRankItem, PriorityQueueResponse, IncidentSeverity } from "../types";

export default function PriorityQueue() {
  const [queueData, setQueueData] = useState<PriorityQueueResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");
  const [includeResolved, setIncludeResolved] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<PriorityRankItem | null>(null);

  const fetchPriorityQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getPriorityQueue({
        limit: 100,
        include_resolved: includeResolved,
      });
      setQueueData(res);
      if (res.items.length > 0) {
        setSelectedItem((prev) => {
          if (prev) {
            const match = res.items.find((i) => i.incident_id === prev.incident_id);
            return match || res.items[0];
          }
          return res.items[0];
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load priority dispatch queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriorityQueue();
  }, [includeResolved]);

  const filteredItems = (queueData?.items || []).filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.incident_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = urgencyFilter === "ALL" || item.urgency_level === urgencyFilter;
    return matchesSearch && matchesUrgency;
  });

  const getSeverityBadge = (sev: IncidentSeverity) => {
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

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "IMMEDIATE":
        return "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse";
      case "HIGH":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "ELEVATED":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
    }
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return "bg-red-500/30 text-red-300 border-red-500 shadow-glow-red";
    if (rank === 2) return "bg-orange-500/30 text-orange-300 border-orange-500";
    if (rank === 3) return "bg-amber-500/30 text-amber-300 border-amber-500";
    return "bg-ocean-800/60 text-slate-300 border-ocean-700";
  };

  const immediateCount = (queueData?.items || []).filter((i) => i.urgency_level === "IMMEDIATE").length;
  const highCount = (queueData?.items || []).filter((i) => i.urgency_level === "HIGH").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Operational Priority Dispatch Queue
                <span className="badge badge-danger text-[10px] uppercase font-mono">Module 5</span>
              </h1>
              <p className="text-xs text-slate-400">
                Deterministic algorithmic ranking answering: <span className="text-slate-200 font-semibold italic">“Which incident should response teams handle first?”</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPriorityQueue}
            title="Refresh Ranking Queue"
            className="p-2 glass-card hover:bg-ocean-800 text-slate-300 hover:text-white transition rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/map"
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Tactical Map</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchPriorityQueue} className="underline hover:text-white">Retry</button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Immediate Urgency</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">
            {loading ? "..." : immediateCount}
          </div>
          <div className="text-[10px] text-slate-400">Requires instant boom / skimmer dispatch</div>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">High Priority</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-400 font-mono">
            {loading ? "..." : highCount}
          </div>
          <div className="text-[10px] text-slate-400">Score range 60.0 – 79.9</div>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">#1 Primary Target</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-extrabold text-amber-400 font-mono truncate">
            {loading ? "..." : queueData?.highest_priority_incident ?? "N/A"}
          </div>
          <div className="text-[10px] text-slate-400">Top prioritized containment case</div>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Active Queue Size</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {loading ? "..." : queueData?.queue_length ?? 0}
          </div>
          <div className="text-[10px] text-slate-400">Active non-resolved slicks</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search incident code or keywords in reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-ocean-900/90 border border-ocean-700/60 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-ocean-900/90 border border-ocean-700/60 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Urgency Levels</option>
              <option value="IMMEDIATE">Immediate (Score ≥ 80)</option>
              <option value="HIGH">High (Score 60–79)</option>
              <option value="ELEVATED">Elevated (Score 40–59)</option>
              <option value="ROUTINE">Routine (Score &lt; 40)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
            <input
              type="checkbox"
              checked={includeResolved}
              onChange={(e) => setIncludeResolved(e.target.checked)}
              className="rounded accent-amber-400"
            />
            <span>Include Resolved Cases</span>
          </label>
        </div>
      </div>

      {/* Main Split: Left (Ranked Queue List) + Right (Selected Incident Priority Dossier) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ranked Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="glass-card py-16 flex flex-col items-center justify-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-2" />
              <span>Evaluating operational response priority queue...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="glass-card p-12 text-center text-xs text-slate-400">
              No incidents match the active search or filters.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.incident_id === item.incident_id;
              return (
                <div
                  key={item.incident_id}
                  onClick={() => setSelectedItem(item)}
                  className={`glass-card p-4 cursor-pointer transition-all duration-150 relative ${
                    isSelected
                      ? "border-amber-400/80 bg-ocean-800/80 shadow-glow-amber -translate-y-0.5"
                      : "hover:border-ocean-500/50 hover:bg-ocean-800/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Rank Badge + Code + Badges */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center font-extrabold text-sm font-mono shrink-0 ${getRankMedal(
                          item.rank
                        )}`}
                      >
                        #{item.rank}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">
                            {item.incident_code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getSeverityBadge(
                              item.severity
                            )}`}
                          >
                            {item.severity}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getUrgencyBadge(
                              item.urgency_level
                            )}`}
                          >
                            {item.urgency_level}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        {/* Explainable Summary */}
                        <p className="text-xs text-slate-300 mt-1.5 line-clamp-2">
                          {item.reason}
                        </p>
                      </div>
                    </div>

                    {/* Priority & Risk Dual Scores */}
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-xl font-extrabold font-mono text-amber-400">
                          {item.priority_score.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400">/ 100</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Risk: <span className="font-mono text-slate-200 font-bold">{item.risk_score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantitative Chips Bar */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-ocean-700/50 text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Waves className="w-3.5 h-3.5 text-cyan-400" />
                        {item.spill_area_km2 ? `${item.spill_area_km2} km²` : "Area N/A"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {item.coastline_eta_hours !== null && item.coastline_eta_hours !== undefined
                          ? `ETA: ~${item.coastline_eta_hours.toFixed(1)}h`
                          : "ETA: N/A"}
                      </span>
                      <span>•</span>
                      <span>{item.distance_coastline_km ? `${item.distance_coastline_km.toFixed(1)} km to coast` : "--"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/incidents?selected=${item.incident_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-ocean-400 hover:text-white flex items-center gap-0.5 font-medium"
                      >
                        <span>Details</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Incident Priority Dossier (5 cols) */}
        <div className="lg:col-span-5">
          {selectedItem ? (
            <div className="glass-card p-5 space-y-5 sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-ocean-700/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-ocean-800 text-amber-400 border border-ocean-700">
                      RANK #{selectedItem.rank}
                    </span>
                    <h2 className="text-lg font-bold text-white">
                      {selectedItem.incident_code}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Urgency Classification:{" "}
                    <span className="font-semibold text-slate-200">{selectedItem.urgency_level} PRIORITY</span>
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-extrabold text-amber-400 font-mono">
                    {selectedItem.priority_score.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Priority Index</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to={`/incidents?selected=${selectedItem.incident_id}`}
                  className="btn-secondary text-xs flex items-center justify-center gap-1.5 py-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Operations</span>
                </Link>
                <Link
                  to={`/map?incidentId=${selectedItem.incident_id}`}
                  className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Inspect on Map</span>
                </Link>
              </div>

              {/* Why is this ranked here? (Explainability section) */}
              <div className="p-3.5 rounded-xl bg-ocean-900/90 border border-ocean-700/70 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Why is this incident ranked #{selectedItem.rank}?
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedItem.reason}
                </p>
              </div>

              {/* Priority Sub-Score Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-ocean-400" />
                    Priority Factor Breakdown
                  </span>
                  <span className="text-[10px] text-slate-400">Sum = 100.0 Max</span>
                </div>

                <div className="space-y-2.5">
                  {/* Risk component */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Risk Severity Component</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {selectedItem.factors.risk_score_component.toFixed(1)} / 35.0 pts
                      </span>
                    </div>
                    <div className="w-full bg-ocean-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-red-400 h-full rounded-full"
                        style={{ width: `${(selectedItem.factors.risk_score_component / 35.0) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Urgency & Coastline ETA */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Shoreline Impact Urgency &amp; ETA</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {selectedItem.factors.urgency_eta_component.toFixed(1)} / 25.0 pts
                      </span>
                    </div>
                    <div className="w-full bg-ocean-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full"
                        style={{ width: `${(selectedItem.factors.urgency_eta_component / 25.0) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Marine Protected & Fishing Sensitivity */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Ecological / Marine Habitat Proximity</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {selectedItem.factors.environmental_component.toFixed(1)} / 15.0 pts
                      </span>
                    </div>
                    <div className="w-full bg-ocean-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full"
                        style={{ width: `${(selectedItem.factors.environmental_component / 15.0) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Spill Size */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Spill Surface Area &amp; Volume</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {selectedItem.factors.spill_size_component.toFixed(1)} / 15.0 pts
                      </span>
                    </div>
                    <div className="w-full bg-ocean-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full rounded-full"
                        style={{ width: `${(selectedItem.factors.spill_size_component / 15.0) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Operational Status Urgency */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Operational Uncontained Status</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {selectedItem.factors.status_urgency_component.toFixed(1)} / 10.0 pts
                      </span>
                    </div>
                    <div className="w-full bg-ocean-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-purple-400 h-full rounded-full"
                        style={{ width: `${(selectedItem.factors.status_urgency_component / 10.0) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shoreline Impact & Geographic Chips */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 bg-ocean-900/60 rounded-lg border border-ocean-800">
                  <div className="text-[10px] text-slate-400">Shoreline Arrival ETA</div>
                  <div className="font-bold text-amber-400 font-mono mt-0.5">
                    {selectedItem.coastline_eta_hours !== null && selectedItem.coastline_eta_hours !== undefined
                      ? `~${selectedItem.coastline_eta_hours.toFixed(1)} hours`
                      : "Offshore / Indefinite"}
                  </div>
                </div>
                <div className="p-2.5 bg-ocean-900/60 rounded-lg border border-ocean-800">
                  <div className="text-[10px] text-slate-400">Distance to Coast</div>
                  <div className="font-bold text-cyan-400 font-mono mt-0.5">
                    {selectedItem.distance_coastline_km ? `${selectedItem.distance_coastline_km.toFixed(1)} km` : "N/A"}
                  </div>
                </div>
              </div>

              {/* Deterministic Advisory Note */}
              <div className="text-[10px] text-slate-500 pt-2 border-t border-ocean-800 flex items-center justify-between">
                <span>Deterministic Operational Dispatch Algorithm</span>
                <span>Auto-refreshes on risk update</span>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center text-slate-400 text-xs">
              Select an incident from the queue to inspect its priority scoring attribution.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
