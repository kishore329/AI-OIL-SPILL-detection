import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Droplets,
  Globe,
  Zap,
  MapPin,
  Sparkles,
  ArrowRight,
  Shield,
  ListOrdered,
  Clock,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import apiService from "../services/api";
import type { PriorityRankItem, DashboardSummary } from "../types";

interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  Icon: React.ElementType;
  color: string;
  glowColor: string;
}

function StatCard({ label, value, subtext, Icon, color, glowColor }: StatCardProps) {
  return (
    <div className="stat-card group hover:scale-[1.02] transition-transform duration-200 cursor-default">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}
                      transition-all duration-300 group-hover:shadow-lg`}
          style={{ boxShadow: `0 0 0 0 ${glowColor}` }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xs font-medium text-slate-500 mt-1">Live</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100 mt-2">{value}</p>
        <p className="text-xs font-medium text-slate-400">{label}</p>
      </div>
      <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [priorityItems, setPriorityItems] = useState<PriorityRankItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingPriority, setLoadingPriority] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setLoadingPriority(true);
    setError(null);

    // Fetch live dashboard summary aggregates
    apiService
      .getDashboardSummary()
      .then((res) => {
        setSummary(res);
      })
      .catch((err) => {
        setError(err.message || "Failed to connect to backend intelligence service.");
      })
      .finally(() => {
        setLoading(false);
      });

    // Fetch top 5 priority incidents
    apiService
      .getPriorityQueue({ limit: 5 })
      .then((res) => {
        setPriorityItems(res.items);
      })
      .catch(() => {
        // ignore priority error if summary error shown
      })
      .finally(() => {
        setLoadingPriority(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats: StatCardProps[] = [
    {
      label: "Active Incidents",
      value: loading ? "..." : String(summary?.active_incidents ?? 0),
      subtext: `${summary?.total_incidents ?? 0} total cases recorded`,
      Icon: AlertTriangle,
      color: "bg-danger-500/20 text-danger-400",
      glowColor: "rgba(230,0,0,0.2)",
    },
    {
      label: "Critical Spills",
      value: loading ? "..." : String(summary?.critical_incidents ?? 0),
      subtext: "Urgent response priority",
      Icon: Droplets,
      color: "bg-red-500/20 text-red-300",
      glowColor: "rgba(255,50,50,0.2)",
    },
    {
      label: "High Severity Spills",
      value: loading ? "..." : String(summary?.high_incidents ?? 0),
      subtext: "Active surveillance active",
      Icon: Globe,
      color: "bg-orange-500/20 text-orange-400",
      glowColor: "rgba(230,166,0,0.2)",
    },
    {
      label: "Total Monitored Slick Area",
      value: loading
        ? "..."
        : summary?.total_spill_area_km2 !== null && summary?.total_spill_area_km2 !== undefined
        ? `${summary.total_spill_area_km2.toFixed(1)} km²`
        : "0.0 km²",
      subtext: `Avg Risk: ${
        summary?.average_risk_score !== null && summary?.average_risk_score !== undefined
          ? `${summary.average_risk_score.toFixed(1)} / 100`
          : "--"
      }`,
      Icon: Zap,
      color: "bg-cyan-500/20 text-cyan-300",
      glowColor: "rgba(0,204,255,0.2)",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto p-2">
      {/* Offline / Backend Error Banner */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="font-bold text-red-200 text-sm">Backend Service Offline or Disconnected</div>
              <div className="text-[11px] text-red-300/80 mt-0.5">
                {error} Ensure FastAPI server is running on <code className="bg-ocean-950 px-1.5 py-0.5 rounded text-amber-300">http://localhost:8000</code>.
              </div>
            </div>
          </div>
          <button
            onClick={fetchDashboardData}
            className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Hero banner */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,65,128,0.85) 0%, rgba(0,38,77,0.95) 100%)",
          border: "1px solid rgba(26,148,255,0.25)",
        }}
      >
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #1a94ff, transparent)" }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-success-400 animate-pulse-slow shadow-[0_0_8px_rgba(77,255,145,0.6)]" />
              <span className="text-xs font-semibold text-success-400 uppercase tracking-wider">
                System Active • Smart India Hackathon
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-1">
              AI Oil Spill Intelligence &amp; Response System
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Real-time synthetic aperture radar (SAR) detection, automated polygon segmentation,
              interactive PostGIS mapping, and spatial vulnerability analysis.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/detect-spill"
              className="btn-primary text-xs flex items-center gap-2 shadow-glow-blue"
            >
              <Sparkles className="w-4 h-4" />
              <span>Run Spill Detection</span>
            </Link>
            <Link
              to="/map"
              className="glass-card px-3.5 py-2 text-xs text-slate-200 hover:text-white flex items-center gap-1.5 transition"
            >
              <MapPin className="w-4 h-4 text-ocean-400" />
              <span>Open Map</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/detect-spill"
          className="glass-card p-4 hover:border-ocean-400 hover:bg-ocean-800/50 transition duration-200 group flex items-start justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-ocean-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-ocean-400" />
              AI Spill Detection
            </span>
            <p className="text-xs text-slate-300">
              Upload Sentinel SAR or UAV imagery to segment slicks and extract geometries.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-ocean-300 group-hover:translate-x-1 transition shrink-0 mt-1" />
        </Link>

        <Link
          to="/map"
          className="glass-card p-4 hover:border-ocean-400 hover:bg-ocean-800/50 transition duration-200 group flex items-start justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-ocean-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-ocean-400" />
              Geospatial Operations Map
            </span>
            <p className="text-xs text-slate-300">
              Interactive Leaflet layer controls, spill polygons, and proximity buffers.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-ocean-300 group-hover:translate-x-1 transition shrink-0 mt-1" />
        </Link>

        <Link
          to="/incidents"
          className="glass-card p-4 hover:border-ocean-400 hover:bg-ocean-800/50 transition duration-200 group flex items-start justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-ocean-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-ocean-400" />
              Incident Operations
            </span>
            <p className="text-xs text-slate-300">
              Manage active spill cases, review confidence metrics, and coordinate assets.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-ocean-300 group-hover:translate-x-1 transition shrink-0 mt-1" />
        </Link>
      </div>

      {/* Prominent Priority Incidents Panel */}
      <div className="glass-card p-5 space-y-4 border-l-4 border-l-red-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-ocean-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                PRIORITY INCIDENTS • OPERATIONAL DISPATCH QUEUE
                <span className="badge badge-danger text-[9px] font-mono">LIVE TOP 5</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Algorithmically ranked by coastline ETA, hazard risk, spill volume, and uncontained status
              </p>
            </div>
          </div>

          <Link
            to="/priority"
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 shrink-0"
          >
            <span>Open Full Priority Studio</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingPriority ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs">
            <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin mb-2" />
            <span>Calculating top dispatch priorities...</span>
          </div>
        ) : priorityItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No active incidents currently require urgent response prioritization.
          </div>
        ) : (
          <div className="space-y-2.5">
            {priorityItems.map((item) => (
              <div
                key={item.incident_id}
                className="p-3 rounded-xl bg-ocean-900/70 border border-ocean-800 hover:border-amber-500/40 hover:bg-ocean-800 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 border ${
                      item.rank === 1
                        ? "bg-red-500/30 text-red-300 border-red-500"
                        : item.rank === 2
                        ? "bg-orange-500/30 text-orange-300 border-orange-500"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    }`}
                  >
                    #{item.rank}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">
                        {item.incident_code}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          item.severity === "CRITICAL"
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : item.severity === "HIGH"
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-[9px] font-semibold text-red-300 px-1.5 py-0.2 rounded bg-red-950/60 border border-red-800/60">
                        {item.urgency_level}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 line-clamp-1">
                      {item.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-ocean-800">
                  <div className="text-left sm:text-right">
                    <div className="text-sm font-extrabold font-mono text-amber-400">
                      {item.priority_score.toFixed(1)} <span className="text-[9px] text-slate-400 font-normal">pts</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 sm:justify-end">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>
                        {item.coastline_eta_hours !== null && item.coastline_eta_hours !== undefined
                          ? `~${item.coastline_eta_hours.toFixed(1)}h ETA`
                          : "--"}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/incidents?selected=${item.incident_id}`}
                    className="p-1.5 rounded-lg bg-ocean-800 hover:bg-ocean-700 text-slate-300 hover:text-white transition"
                    title="Open Incident Operations"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Key Stats */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Real-time Operational Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>

      {/* Module roadmap */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Implementation Roadmap &amp; Progress
        </h3>
        <div className="glass-card p-5">
          <div className="space-y-3">
            {[
              { num: 1, name: "Project Foundation & Database (PostGIS)", status: "done" },
              { num: 2, name: "Oil Spill Detection Module (ML Engine)", status: "done" },
              { num: 3, name: "GIS / Interactive Map & Spatial Analysis", status: "done" },
              { num: 4, name: "Risk Assessment & Vulnerability Engine", status: "done" },
              { num: 5, name: "Priority Queue & Response Urgency Engine", status: "done" },
              { num: 6, name: "Incident Lifecycle & Event Tracking", status: "done" },
            ].map(({ num, name, status }) => (
              <div key={num} className="flex items-center gap-4">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${
                      status === "done"
                        ? "bg-success-500/20 text-success-400 border border-success-500/40"
                        : "bg-ocean-800 text-slate-500 border border-ocean-700"
                    }`}
                >
                  {num}
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <span
                    className={`text-sm font-medium ${
                      status === "done" ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {name}
                  </span>
                  {status === "done" && (
                    <span className="badge badge-success text-[10px] px-1.5 py-0">Complete</span>
                  )}
                </div>
                <div className="w-24 h-1.5 rounded-full bg-ocean-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      status === "done" ? "w-full bg-success-500" : "w-0"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
