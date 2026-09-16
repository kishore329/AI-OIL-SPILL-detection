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
import DashboardHeroAnimation from "../components/dashboard/DashboardHeroAnimation";

interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  Icon: React.ElementType;
  color: string;
  accentBg: string;
}

function StatCard({ label, value, subtext, Icon, color, accentBg }: StatCardProps) {
  return (
    <div className="stat-card hover-lift cursor-default">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentBg} border border-[#D9E8F2] shadow-sm`}
        >
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="badge badge-info text-[10px]">Live</span>
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-black text-[#0B3A66] mt-2 font-mono tracking-tight">{value}</p>
        <p className="text-xs font-bold text-[#5E7183] uppercase tracking-wider mt-0.5">{label}</p>
      </div>
      <p className="text-xs text-[#8A9AA8] mt-0.5">{subtext}</p>
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
      color: "text-[#C6283D]",
      accentBg: "bg-[#FFF1F2]",
    },
    {
      label: "Critical Spills",
      value: loading ? "..." : String(summary?.critical_incidents ?? 0),
      subtext: "Urgent response priority",
      Icon: Droplets,
      color: "text-[#C6283D]",
      accentBg: "bg-[#FFF1F2]",
    },
    {
      label: "High Severity Spills",
      value: loading ? "..." : String(summary?.high_incidents ?? 0),
      subtext: "Active surveillance active",
      Icon: Globe,
      color: "text-[#A86A00]",
      accentBg: "bg-[#FFF8E8]",
    },
    {
      label: "Total Slick Area",
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
      color: "text-[#1268B3]",
      accentBg: "bg-[#EAF6FF]",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Offline / Backend Error Banner */}
      {error && (
        <div className="p-4 bg-[#FFF1F2] border border-[#F5B5BC] rounded-2xl text-[#C6283D] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#C6283D] shrink-0" />
            <div>
              <div className="font-bold text-[#C6283D] text-sm">Backend Service Offline or Disconnected</div>
              <div className="text-[11px] text-[#5E7183] mt-0.5">
                {error} Ensure FastAPI server is running on <code className="bg-white border border-[#F5B5BC] px-1.5 py-0.5 rounded text-[#C6283D] font-mono">http://localhost:8000</code>.
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

      {/* Hero banner - Maritime Command Center */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden text-white shadow-md"
        style={{
          background: "linear-gradient(135deg, #0B3A66 0%, #0F4C81 55%, #1268B3 100%)",
          border: "1px solid #0F4C81",
        }}
      >
        {/* Dynamic Live Animated Satellite, Sweeping Radar Beam & Marching Slick Contour */}
        <DashboardHeroAnimation />

        <div
          className="absolute -top-12 -right-12 w-60 h-60 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #4DB8E8, transparent)" }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4DFF91] live-dot-pulse" />
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                System Active • Smart India Hackathon
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1.5 tracking-tight">
              AI Oil Spill Intelligence &amp; Response System
            </h2>
            <p className="text-sm text-sky-100 max-w-xl leading-relaxed">
              Real-time synthetic aperture radar (SAR) detection, automated polygon segmentation,
              interactive PostGIS mapping, and spatial vulnerability analysis.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/detect-spill"
              className="px-4 py-2.5 bg-[#168DCC] hover:bg-[#1268B3] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md hover-lift transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Run Spill Detection</span>
            </Link>
            <Link
              to="/map"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition hover-lift"
            >
              <MapPin className="w-4 h-4 text-sky-300" />
              <span>Open Map</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/detect-spill"
          className="glass-card p-4.5 hover:border-[#1268B3] transition-all duration-200 group flex items-start justify-between hover-lift"
        >
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-[#0B3A66] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#1268B3]" />
              AI Spill Detection
            </span>
            <p className="text-xs text-[#5E7183] leading-relaxed">
              Upload Sentinel SAR or UAV imagery to segment slicks and extract geometries.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8A9AA8] group-hover:text-[#1268B3] group-hover:translate-x-1 transition shrink-0 mt-1" />
        </Link>

        <Link
          to="/map"
          className="glass-card p-4.5 hover:border-[#1268B3] transition-all duration-200 group flex items-start justify-between hover-lift"
        >
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-[#0B3A66] flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#1268B3]" />
              Geospatial Operations Map
            </span>
            <p className="text-xs text-[#5E7183] leading-relaxed">
              Interactive Leaflet layer controls, spill polygons, and proximity buffers.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8A9AA8] group-hover:text-[#1268B3] group-hover:translate-x-1 transition shrink-0 mt-1" />
        </Link>

        <Link
          to="/incidents"
          className="glass-card p-4.5 hover:border-[#1268B3] transition-all duration-200 group flex items-start justify-between hover-lift"
        >
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-[#0B3A66] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#1268B3]" />
              Incident Operations
            </span>
            <p className="text-xs text-[#5E7183] leading-relaxed">
              Manage active spill cases, review confidence metrics, and coordinate assets.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8A9AA8] group-hover:text-[#1268B3] group-hover:translate-x-1 transition shrink-0 mt-1" />
        </Link>
      </div>

      {/* Prominent Priority Incidents Panel */}
      <div className="glass-card p-5 space-y-4 border-l-4 border-l-[#C6283D] shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#D9E8F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF1F2] border border-[#F5B5BC] flex items-center justify-center text-[#C6283D]">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#17324D] flex items-center gap-2">
                PRIORITY INCIDENTS • OPERATIONAL DISPATCH QUEUE
                <span className="badge badge-danger text-[9px] font-mono">LIVE TOP 5</span>
              </h3>
              <p className="text-[11px] text-[#5E7183]">
                Algorithmically ranked by coastline ETA, hazard risk, spill volume, and uncontained status
              </p>
            </div>
          </div>

          <Link
            to="/priority"
            className="text-xs text-[#1268B3] hover:text-[#0F4C81] font-bold flex items-center gap-1 shrink-0 transition"
          >
            <span>Open Full Priority Studio</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingPriority ? (
          <div className="py-8 flex flex-col items-center justify-center text-[#5E7183] text-xs">
            <div className="w-5 h-5 border-2 border-[#1268B3] border-t-transparent rounded-full animate-spin mb-2" />
            <span>Calculating top dispatch priorities...</span>
          </div>
        ) : priorityItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#5E7183]">
            No active incidents currently require urgent response prioritization.
          </div>
        ) : (
          <div className="space-y-2.5">
            {priorityItems.map((item) => (
              <div
                key={item.incident_id}
                className="p-3.5 rounded-xl bg-[#F4F9FD] border border-[#D9E8F2] hover:border-[#1268B3] hover:bg-[#EAF6FF] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover-lift"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black font-mono shrink-0 border ${
                      item.rank === 1
                        ? "bg-[#FFF1F2] text-[#C6283D] border-[#F5B5BC]"
                        : item.rank === 2
                        ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]"
                        : "bg-white text-[#1268B3] border-[#D9E8F2]"
                    }`}
                  >
                    #{item.rank}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-[#17324D]">
                        {item.incident_code}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          item.severity === "CRITICAL"
                            ? "bg-[#FFF1F2] text-[#C6283D] border-[#F5B5BC]"
                            : item.severity === "HIGH"
                            ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]"
                            : "bg-[#EAF8F4] text-[#087F68] border-[#9ADBC8]"
                        }`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-[9px] font-bold text-[#C6283D] px-1.5 py-0.5 rounded bg-[#FFF1F2] border border-[#F5B5BC]">
                        {item.urgency_level}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5E7183] mt-1 line-clamp-1 leading-relaxed">
                      {item.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D9E8F2]">
                  <div className="text-left sm:text-right">
                    <div className="text-sm font-black font-mono text-[#0B3A66]">
                      {item.priority_score.toFixed(1)} <span className="text-[9px] text-[#5E7183] font-normal">pts</span>
                    </div>
                    <div className="text-[10px] text-[#5E7183] flex items-center gap-1 sm:justify-end font-medium">
                      <Clock className="w-3 h-3 text-[#1268B3]" />
                      <span>
                        {item.coastline_eta_hours !== null && item.coastline_eta_hours !== undefined
                          ? `~${item.coastline_eta_hours.toFixed(1)}h ETA`
                          : "--"}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/incidents?selected=${item.incident_id}`}
                    className="p-2 rounded-lg bg-white hover:bg-[#1268B3] text-[#1268B3] hover:text-white border border-[#D9E8F2] shadow-sm transition"
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
        <h3 className="text-xs font-bold text-[#5E7183] uppercase tracking-wider mb-3">
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
        <h3 className="text-xs font-bold text-[#5E7183] uppercase tracking-wider mb-3">
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
                        ? "bg-[#EAF8F4] text-[#087F68] border border-[#9ADBC8]"
                        : "bg-[#F3FAFE] text-[#5E7183] border border-[#D9E8F2]"
                    }`}
                >
                  {num}
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <span
                    className={`text-sm font-semibold ${
                      status === "done" ? "text-[#17324D]" : "text-[#8A9AA8]"
                    }`}
                  >
                    {name}
                  </span>
                  {status === "done" && (
                    <span className="badge badge-success text-[10px] px-2 py-0.5">Complete</span>
                  )}
                </div>
                <div className="w-24 h-2 rounded-full bg-[#EAF3F8] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      status === "done" ? "w-full bg-[#087F68]" : "w-0"
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
