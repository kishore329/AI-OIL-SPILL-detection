import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Search,
  Filter,
  MapPin,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Shield,
  Sparkles,
  Phone,
  Check,
  Link2,
} from "lucide-react";
import apiService from "../services/api";
import type { CitizenReportItem } from "../types";

export default function CitizenReportsAdmin() {
  const [reports, setReports] = useState<CitizenReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [selectedReport, setSelectedReport] = useState<CitizenReportItem | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [linkIncidentId, setLinkIncidentId] = useState<string>("");

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getCitizenReports({
        status: statusFilter,
        category: categoryFilter,
        page: 1,
        page_size: 100,
      });
      setReports(res.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch citizen reports.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpenReview = (report: CitizenReportItem) => {
    setSelectedReport(report);
    setReviewNotes(report.review_notes || "");
    setLinkIncidentId(report.linked_incident_id || "");
    setShowReviewModal(true);
  };

  const handleUpdateStatus = async (newStatus: "SUBMITTED" | "UNDER_REVIEW" | "AI_ASSISTED_VERIFICATION" | "VERIFIED" | "REJECTED") => {
    if (!selectedReport) return;
    try {
      setActionLoading(true);
      const updated = await apiService.updateCitizenReportStatus(selectedReport.id, {
        status: newStatus,
        reviewed_by: "Operations Commander",
        review_notes: reviewNotes.trim() || undefined,
      });
      setSelectedReport(updated);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setActionSuccess(`✓ Status transitioned to ${newStatus.replace(/_/g, " ")}.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      alert(`Update failed: ${err.message || "Error"}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunAiVerify = async (autoCreateIncident = false) => {
    if (!selectedReport) return;
    try {
      setActionLoading(true);
      const updated = await apiService.verifyCitizenReport(selectedReport.id, {
        auto_create_incident: autoCreateIncident,
        link_incident_id: linkIncidentId.trim() || undefined,
        operator_name: "Operations Commander",
      });
      setSelectedReport(updated);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setActionSuccess(
        `✓ AI Verification computed (${updated.verification_confidence}%). Outcome: ${updated.status}.${
          updated.linked_incident_id ? " Incident escalated and linked." : ""
        }`
      );
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`AI verification failed: ${err.message || "Error"}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.report_code.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term) ||
      (r.location_description && r.location_description.toLowerCase().includes(term)) ||
      (r.reporter_name && r.reporter_name.toLowerCase().includes(term))
    );
  });

  const counts = {
    all: reports.length,
    submitted: reports.filter((r) => r.status === "SUBMITTED").length,
    underReview: reports.filter((r) => r.status === "UNDER_REVIEW").length,
    verified: reports.filter((r) => r.status === "VERIFIED").length,
    rejected: reports.filter((r) => r.status === "REJECTED").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "REJECTED":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "UNDER_REVIEW":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "AI_ASSISTED_VERIFICATION":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      default:
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-24">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-ocean-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-cyan-400" />
            <span>Citizen &amp; Fisherman Field Reports</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
              Module 19
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Incoming crowd-sourced field observations with AI-assisted verification and emergency incident escalation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-ocean-800 hover:bg-ocean-700 text-slate-200 border border-ocean-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/report"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Public Mobile Form</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter("ALL")}
          className={`p-3 rounded-xl border cursor-pointer transition ${
            statusFilter === "ALL" ? "bg-cyan-950/40 border-cyan-500/50" : "bg-ocean-900/60 border-ocean-800"
          }`}
        >
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Reports</span>
          <div className="text-xl font-black font-mono text-white mt-0.5">{counts.all}</div>
        </div>

        <div
          onClick={() => setStatusFilter("SUBMITTED")}
          className={`p-3 rounded-xl border cursor-pointer transition ${
            statusFilter === "SUBMITTED" ? "bg-blue-950/40 border-blue-500/50" : "bg-ocean-900/60 border-ocean-800"
          }`}
        >
          <span className="text-[10px] text-blue-300 uppercase font-semibold">New Submitted</span>
          <div className="text-xl font-black font-mono text-blue-300 mt-0.5">{counts.submitted}</div>
        </div>

        <div
          onClick={() => setStatusFilter("UNDER_REVIEW")}
          className={`p-3 rounded-xl border cursor-pointer transition ${
            statusFilter === "UNDER_REVIEW" ? "bg-amber-950/40 border-amber-500/50" : "bg-ocean-900/60 border-ocean-800"
          }`}
        >
          <span className="text-[10px] text-amber-300 uppercase font-semibold">Under Review</span>
          <div className="text-xl font-black font-mono text-amber-300 mt-0.5">{counts.underReview}</div>
        </div>

        <div
          onClick={() => setStatusFilter("VERIFIED")}
          className={`p-3 rounded-xl border cursor-pointer transition ${
            statusFilter === "VERIFIED" ? "bg-emerald-950/40 border-emerald-500/50" : "bg-ocean-900/60 border-ocean-800"
          }`}
        >
          <span className="text-[10px] text-emerald-300 uppercase font-semibold">Verified Spills</span>
          <div className="text-xl font-black font-mono text-emerald-300 mt-0.5">{counts.verified}</div>
        </div>

        <div
          onClick={() => setStatusFilter("REJECTED")}
          className={`p-3 rounded-xl border cursor-pointer transition ${
            statusFilter === "REJECTED" ? "bg-rose-950/40 border-rose-500/50" : "bg-ocean-900/60 border-ocean-800"
          }`}
        >
          <span className="text-[10px] text-rose-300 uppercase font-semibold">False Alarms</span>
          <div className="text-xl font-black font-mono text-rose-300 mt-0.5">{counts.rejected}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-ocean-900/70 p-3 rounded-xl border border-ocean-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search report code, description, location..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-ocean-950 border border-ocean-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-ocean-950 border border-ocean-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Categories</option>
            <option value="SURFACE_SHEEN">Rainbow Sheen</option>
            <option value="TAR_BALLS">Tar Balls</option>
            <option value="HEAVY_BLACK_OIL">Heavy Crude Oil</option>
            <option value="VESSEL_DISCHARGE">Vessel Discharge</option>
            <option value="SHORELINE_COATING">Shoreline Coating</option>
            <option value="OTHER">Other Marine Pollution</option>
          </select>
        </div>
      </div>

      {/* Reports Table & List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Loading citizen field reports...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-12 rounded-xl bg-ocean-900/40 border border-ocean-800 text-center text-xs text-slate-400 space-y-2">
          <p>No citizen reports matching current filter criteria.</p>
          <Link to="/report" target="_blank" className="text-cyan-400 hover:underline">
            Submit a test report via the mobile form →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ocean-800 bg-ocean-900/60 shadow-lg">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-ocean-950/80 text-slate-400 font-mono text-[10px] uppercase border-b border-ocean-800">
              <tr>
                <th className="px-3.5 py-3">Photo</th>
                <th className="px-3.5 py-3">Report Code</th>
                <th className="px-3.5 py-3">Category</th>
                <th className="px-3.5 py-3">Location &amp; Coordinates</th>
                <th className="px-3.5 py-3">Description</th>
                <th className="px-3.5 py-3">Confidence</th>
                <th className="px-3.5 py-3">Status</th>
                <th className="px-3.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-800/60 font-mono">
              {filteredReports.map((rep) => (
                <tr key={rep.id} className="hover:bg-ocean-850/60 transition">
                  {/* Photo Thumbnail */}
                  <td className="px-3.5 py-2.5">
                    {rep.photo_url ? (
                      <img
                        src={rep.photo_url}
                        alt="Evidence"
                        onClick={() => handleOpenReview(rep)}
                        className="w-10 h-10 rounded-lg object-cover border border-ocean-700 hover:border-cyan-400 transition cursor-pointer shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-ocean-950 border border-ocean-800 text-slate-600 flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                    )}
                  </td>

                  {/* Report Code & Timestamp */}
                  <td className="px-3.5 py-2.5">
                    <span className="font-bold text-cyan-300 block">{rep.report_code}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {new Date(rep.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="px-3.5 py-2.5 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-ocean-950 border border-ocean-800 text-slate-200">
                      {rep.incident_category.replace(/_/g, " ")}
                    </span>
                  </td>

                  {/* Location */}
                  <td className="px-3.5 py-2.5 font-sans text-xs">
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{rep.latitude.toFixed(4)}°N, {rep.longitude.toFixed(4)}°E</span>
                    </div>
                    {rep.location_description && (
                      <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                        {rep.location_description}
                      </span>
                    )}
                  </td>

                  {/* Description preview */}
                  <td className="px-3.5 py-2.5 font-sans text-xs max-w-xs truncate text-slate-300">
                    {rep.description}
                  </td>

                  {/* AI Verification Confidence */}
                  <td className="px-3.5 py-2.5 font-mono">
                    <span className={`text-xs font-bold ${
                      rep.verification_confidence >= 65
                        ? "text-emerald-400"
                        : rep.verification_confidence >= 45
                        ? "text-amber-400"
                        : "text-slate-400"
                    }`}>
                      {rep.verification_confidence.toFixed(0)}%
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="px-3.5 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(rep.status)}`}>
                      {rep.status.replace(/_/g, " ")}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-3.5 py-2.5 text-right font-sans">
                    <button
                      onClick={() => handleOpenReview(rep)}
                      className="px-2.5 py-1 rounded bg-ocean-800 hover:bg-ocean-700 text-cyan-300 border border-cyan-800/60 text-xs font-semibold transition cursor-pointer"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review & Triage Drawer / Modal */}
      {showReviewModal && selectedReport && (
        <div className="fixed inset-0 bg-ocean-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-ocean-900 border border-ocean-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-ocean-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">
                  Report Dossier: <span className="text-cyan-300 font-mono">{selectedReport.report_code}</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getStatusBadge(selectedReport.status)}`}>
                  {selectedReport.status}
                </span>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Preview & GPS Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Photo */}
              <div className="bg-ocean-950 p-2 rounded-xl border border-ocean-800 flex items-center justify-center">
                {selectedReport.photo_url ? (
                  <div className="relative group w-full">
                    <img
                      src={selectedReport.photo_url}
                      alt="Full Evidence"
                      className="w-full h-48 sm:h-56 object-cover rounded-lg"
                    />
                    <a
                      href={selectedReport.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 backdrop-blur-sm text-[10px] text-cyan-300 flex items-center gap-1 hover:text-white"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Full Res</span>
                    </a>
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-1">
                    <Camera className="w-8 h-8 opacity-40" />
                    <span className="text-xs">No photographic evidence attached</span>
                  </div>
                )}
              </div>

              {/* Observation & Reporter Info */}
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-ocean-950 border border-ocean-800 space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>GPS Coordinates:</span>
                    <span className="text-slate-200 font-bold">
                      {selectedReport.latitude.toFixed(5)}°N, {selectedReport.longitude.toFixed(5)}°E
                    </span>
                  </div>
                  {selectedReport.location_description && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Area / Landmark:</span>
                      <span className="text-cyan-300">{selectedReport.location_description}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Observed At:</span>
                    <span className="text-slate-200">{new Date(selectedReport.observed_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Estimated Spread:</span>
                    <span className="text-slate-200">{selectedReport.estimated_spill_size || "Not specified"}</span>
                  </div>
                </div>

                {/* Reporter Identity (Protected / Private view for Command) */}
                <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-blue-300 uppercase">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Protected Reporter Profile
                    </span>
                    <span>{selectedReport.reporter_affiliation || "CITIZEN"}</span>
                  </div>
                  <div className="text-slate-200 font-medium">
                    Name: {selectedReport.reporter_name || "Anonymous Observer"}
                  </div>
                  {selectedReport.reporter_contact && (
                    <div className="text-cyan-300 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      {selectedReport.reporter_contact}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Full Description */}
            <div className="p-3 rounded-xl bg-ocean-950 border border-ocean-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Visual Description &amp; Field Notes:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                "{selectedReport.description}"
              </p>
            </div>

            {/* AI Multi-Factor Verification Analysis */}
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>AI Multi-Factor Verification Engine</span>
                </span>
                <span className="text-sm font-extrabold font-mono text-purple-300">
                  {selectedReport.verification_confidence.toFixed(1)}% Confidence
                </span>
              </div>
              {selectedReport.ai_analysis_notes ? (
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {selectedReport.ai_analysis_notes}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Not yet evaluated by AI verification engine.
                </p>
              )}

              {selectedReport.linked_incident_id && (
                <div className="flex items-center gap-2 pt-1 font-mono text-xs text-emerald-400">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Linked Active Incident ID: {selectedReport.linked_incident_id}</span>
                  <Link to={`/incidents/${selectedReport.linked_incident_id}`} className="text-cyan-400 underline ml-auto">
                    View Incident Dossier →
                  </Link>
                </div>
              )}
            </div>

            {/* Operational Review Actions */}
            <div className="space-y-3 pt-2 border-t border-ocean-800">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Command Workflow Controls
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus("UNDER_REVIEW")}
                  className="px-3 py-2 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-600/60 text-xs font-bold transition cursor-pointer"
                >
                  Mark Under Review
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleRunAiVerify(false)}
                  className="px-3 py-2 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-600/60 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Run AI Verify
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleRunAiVerify(true)}
                  className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer shadow-md flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Verify &amp; Escalate
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus("REJECTED")}
                  className="px-3 py-2 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-600/60 text-xs font-bold transition cursor-pointer"
                >
                  Reject / False Alarm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
