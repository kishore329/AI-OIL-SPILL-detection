import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  Sliders,
  RefreshCw,
  Send,
  Anchor,
  Fish,
  Trees,
  Users,
  Compass,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Waves,
} from "lucide-react";
import apiService from "../services/api";
import type {
  SmartAlertItem,
  AlertRuleItem,
  IncidentDetail,
} from "../types";

export default function AlertsCommandCenter() {
  const [alerts, setAlerts] = useState<SmartAlertItem[]>([]);
  const [rules, setRules] = useState<AlertRuleItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentDetail[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [activeTab, setActiveTab] = useState<"alerts" | "rules">("alerts");

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [restrictionFilter, setRestrictionFilter] = useState<string>("ALL");

  // Modal states
  const [ackModalAlert, setAckModalAlert] = useState<SmartAlertItem | null>(null);
  const [ackOperatorName, setAckOperatorName] = useState("Duty Operations Officer");
  const [ackNotes, setAckNotes] = useState("");
  const [submittingAck, setSubmittingAck] = useState(false);

  const [confirmModalAlert, setConfirmModalAlert] = useState<{
    alert: SmartAlertItem;
    confirm: boolean;
  } | null>(null);
  const [confirmOperatorName, setConfirmOperatorName] = useState("Commander Maritime Ops");
  const [confirmNotes, setConfirmNotes] = useState("");
  const [submittingConfirm, setSubmittingConfirm] = useState(false);

  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [selectedRuleToEdit, setSelectedRuleToEdit] = useState<AlertRuleItem | null>(null);
  const [ruleThreshold, setRuleThreshold] = useState<number>(0);
  const [submittingRule, setSubmittingRule] = useState(false);

  // Initial data loading
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [alertsRes, rulesRes, incsRes] = await Promise.all([
        apiService.getAlerts({ limit: 100 }),
        apiService.getAlertRules(),
        apiService.getIncidents(),
      ]);
      setAlerts(alertsRes.alerts || []);
      setRules(rulesRes || []);
      setIncidents(incsRes.items || []);
    } catch (err) {
      console.error("Failed loading alerts data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateIncident = async () => {
    if (!selectedIncidentId) return;
    setEvaluating(true);
    try {
      await apiService.generateAlerts({ incident_id: selectedIncidentId, force_recheck: true });
      await loadAllData();
    } catch (err) {
      console.error("Failed to generate alerts", err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleAcknowledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ackModalAlert) return;
    setSubmittingAck(true);
    try {
      const updated = await apiService.acknowledgeAlert(ackModalAlert.id, {
        operator_name: ackOperatorName,
        notes: ackNotes,
      });
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setAckModalAlert(null);
      setAckNotes("");
    } catch (err) {
      console.error("Acknowledge failed", err);
    } finally {
      setSubmittingAck(false);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmModalAlert) return;
    setSubmittingConfirm(true);
    try {
      const updated = await apiService.confirmRestriction(confirmModalAlert.alert.id, {
        operator_name: confirmOperatorName,
        confirmed: confirmModalAlert.confirm,
        operator_notes: confirmNotes,
      });
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setConfirmModalAlert(null);
      setConfirmNotes("");
    } catch (err) {
      console.error("Restriction update failed", err);
    } finally {
      setSubmittingConfirm(false);
    }
  };

  const handleRuleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRuleToEdit) return;
    setSubmittingRule(true);
    try {
      const updated = await apiService.updateAlertRule(selectedRuleToEdit.rule_code, {
        threshold_value: Number(ruleThreshold),
      });
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedRuleToEdit(null);
    } catch (err) {
      console.error("Rule update failed", err);
    } finally {
      setSubmittingRule(false);
    }
  };

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (severityFilter !== "ALL" && a.severity !== severityFilter) return false;
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (restrictionFilter !== "ALL" && a.restriction_status !== restrictionFilter) return false;
      if (selectedIncidentId && a.incident_id !== selectedIncidentId) return false;
      return true;
    });
  }, [alerts, severityFilter, statusFilter, restrictionFilter, selectedIncidentId]);

  // Statistics
  const activeCount = alerts.filter((a) => a.status === "ACTIVE").length;
  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL" && a.status === "ACTIVE").length;
  const pendingRestrictionsCount = alerts.filter(
    (a) => a.status === "ACTIVE" && a.restriction_status === "RECOMMENDED" && a.restriction_type
  ).length;
  const confirmedRestrictionsCount = alerts.filter((a) => a.restriction_status === "OPERATOR_CONFIRMED").length;

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "CRITICAL_SPILL_ALERT":
        return <ShieldAlert className="w-5 h-5 text-red-400" />;
      case "COASTAL_WARNING":
        return <Waves className="w-5 h-5 text-amber-400" />;
      case "FISHING_WARNING":
        return <Fish className="w-5 h-5 text-emerald-400" />;
      case "PORT_WARNING":
        return <Anchor className="w-5 h-5 text-cyan-400" />;
      case "PROTECTED_AREA_WARNING":
        return <Trees className="w-5 h-5 text-emerald-300" />;
      case "VESSEL_WARNING":
        return <Compass className="w-5 h-5 text-purple-400" />;
      case "COMMUNITY_ALERT":
        return <Users className="w-5 h-5 text-yellow-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-ocean-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Smart Alert &amp; Restriction Command Center
                <span className="badge badge-danger text-[10px] font-mono uppercase tracking-wider">
                  Module 23
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Automated multi-domain risk evaluation, recommended restriction advisories, and operator confirmation audit trail.
              </p>
            </div>
          </div>
        </div>

        {/* Incident selector & Trigger Generator */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="text-xs bg-ocean-900/90 border border-ocean-700/80 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-ocean-500"
          >
            <option value="">All Active Incidents</option>
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.incident_code} - {inc.severity} ({inc.status})
              </option>
            ))}
          </select>

          <button
            onClick={handleEvaluateIncident}
            disabled={evaluating || !selectedIncidentId}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-spill-500/20 hover:bg-spill-500/30 border border-spill-500/40 text-spill-300 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? "animate-spin" : ""}`} />
            <span>Evaluate Telemetry</span>
          </button>

          <div className="flex bg-ocean-900/80 border border-ocean-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === "alerts" ? "bg-ocean-700 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Active Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab("rules")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === "rules" ? "bg-ocean-700 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Trigger Rules ({rules.length})
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-card p-3.5 rounded-xl border border-ocean-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active System Alerts</span>
            <span className="p-1 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px]">LIVE</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{activeCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Telemetry monitored in real-time</p>
        </div>

        <div className="glass-card p-3.5 rounded-xl border border-red-900/40 bg-red-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-300 font-medium">Critical Threat Warnings</span>
            <span className="p-1 rounded bg-red-500/20 text-red-400 font-mono text-[10px]">RISK &ge; 76</span>
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1 font-mono">{criticalCount}</div>
          <p className="text-[11px] text-red-300/60 mt-0.5">Urgent containment response</p>
        </div>

        <div className="glass-card p-3.5 rounded-xl border border-amber-900/40 bg-amber-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-medium">Pending Operator Sign-Off</span>
            <span className="p-1 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px]">ADVISORY</span>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{pendingRestrictionsCount}</div>
          <p className="text-[11px] text-amber-300/60 mt-0.5">Recommended restrictions awaiting review</p>
        </div>

        <div className="glass-card p-3.5 rounded-xl border border-emerald-900/40 bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-300 font-medium">Confirmed Restrictions</span>
            <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">ENFORCED</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{confirmedRestrictionsCount}</div>
          <p className="text-[11px] text-emerald-300/60 mt-0.5">Officially enacted maritime notices</p>
        </div>
      </div>

      {/* Critical Legal Distinction Banner */}
      <div className="p-3 rounded-xl bg-ocean-950/90 border border-ocean-700/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldAlert className="w-4 h-4 text-spill-400 shrink-0" />
          <span>
            <strong>Statutory Distinction:</strong> The system strictly generates <em>Recommended Restrictions</em>. Official maritime exclusion zones, port stoppages, and fishing bans require <em>Operator Confirmation</em>.
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300">SYSTEM ALERT</span>
          &rarr;
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300">RECOMMENDED RESTRICTION</span>
          &rarr;
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">OPERATOR CONFIRMED</span>
        </div>
      </div>

      {activeTab === "alerts" ? (
        <>
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-ocean-900/60 border border-ocean-800">
            <div className="flex flex-wrap items-center gap-3">
              {/* Severity filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-ocean-950 border border-ocean-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-ocean-950 border border-ocean-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value="ALL">All Lifecycle</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              {/* Restriction Status filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Restriction:</span>
                <select
                  value={restrictionFilter}
                  onChange={(e) => setRestrictionFilter(e.target.value)}
                  className="bg-ocean-950 border border-ocean-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value="ALL">All Restriction States</option>
                  <option value="RECOMMENDED">RECOMMENDED</option>
                  <option value="OPERATOR_CONFIRMED">OPERATOR_CONFIRMED</option>
                  <option value="OPERATOR_REJECTED">OPERATOR_REJECTED</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Showing {filteredAlerts.length} of {alerts.length} alerts
            </div>
          </div>

          {/* Alert Cards List */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-ocean-400" />
              <span>Loading alert telemetry...</span>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-2xl border border-ocean-800 text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <h3 className="text-base font-semibold text-white">No Matching Alerts Found</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select an incident and click "Evaluate Telemetry" to trigger automatic rule analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredAlerts.map((alert) => {
                const isExpanded = expandedAlertId === alert.id;
                const isCritical = alert.severity === "CRITICAL";

                return (
                  <div
                    key={alert.id}
                    className={`glass-card rounded-xl border transition-all duration-200 p-4 ${
                      isCritical
                        ? "border-red-500/50 bg-red-950/15 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                        : alert.severity === "HIGH"
                        ? "border-amber-500/40 bg-amber-950/10"
                        : "border-ocean-700/70 bg-ocean-950/60"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-lg bg-ocean-900/80 border border-ocean-700">
                          {getAlertIcon(alert.alert_type)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono font-bold text-ocean-300">
                              {alert.incident_code || "INCIDENT"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                                isCritical
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : alert.severity === "HIGH"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              }`}
                            >
                              {alert.severity}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ocean-800 text-slate-300 border border-ocean-700 font-mono">
                              {alert.alert_type.replace(/_/g, " ")}
                            </span>
                            {alert.status === "ACTIVE" ? (
                              <span className="badge badge-danger text-[9px] font-mono">ACTIVE</span>
                            ) : (
                              <span className="badge badge-success text-[9px] font-mono">ACKNOWLEDGED</span>
                            )}
                          </div>
                          <h2 className="text-sm font-bold text-white mt-1">{alert.title}</h2>
                          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{alert.message}</p>
                        </div>
                      </div>

                      {/* Right side status / action buttons */}
                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-start shrink-0">
                        {alert.status === "ACTIVE" && (
                          <button
                            onClick={() => setAckModalAlert(alert)}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-ocean-800 hover:bg-ocean-700 border border-ocean-600 text-slate-200 transition"
                          >
                            Acknowledge
                          </button>
                        )}

                        {alert.recommended_restriction && alert.restriction_status === "RECOMMENDED" && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setConfirmModalAlert({ alert, confirm: true })}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirm</span>
                            </button>
                            <button
                              onClick={() => setConfirmModalAlert({ alert, confirm: false })}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-800/80 hover:bg-red-700 text-white transition flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-ocean-900 border border-ocean-800 transition"
                          title="Toggle Details & Audit Trail"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Operational Restriction Advisory Box */}
                    {alert.recommended_restriction && (
                      <div className="mt-3 p-3 rounded-lg bg-ocean-900/90 border border-ocean-700/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-spill-500/20 text-spill-300 border border-spill-500/30">
                            Advisory Restriction
                          </span>
                          <span className="text-xs text-slate-200">{alert.recommended_restriction}</span>
                        </div>

                        {/* Restriction Enforcement Status Badge */}
                        <div className="font-mono text-[11px] shrink-0">
                          {alert.restriction_status === "RECOMMENDED" && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold">
                              Pending Operator Sign-off
                            </span>
                          )}
                          {alert.restriction_status === "OPERATOR_CONFIRMED" && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Confirmed by {alert.confirmed_by || "Operator"}
                            </span>
                          )}
                          {alert.restriction_status === "OPERATOR_REJECTED" && (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-semibold flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Rejected by {alert.confirmed_by || "Operator"}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Context Strip */}
                    <div className="mt-3 pt-2.5 border-t border-ocean-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                      <div className="flex flex-wrap items-center gap-4">
                        {alert.target_location && (
                          <span className="flex items-center gap-1">
                            <span className="text-slate-500">Target Sector:</span>
                            <span className="text-slate-200 font-medium">{alert.target_location}</span>
                          </span>
                        )}
                        {alert.eta_hours !== null && alert.eta_hours !== undefined && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-spill-400" />
                            <span className="text-slate-500">Time-to-Impact:</span>
                            <span className="font-mono text-spill-300 font-bold">{alert.eta_hours.toFixed(1)}h</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Radio className="w-3 h-3 text-cyan-400" />
                          <span className="text-slate-500">Trigger Rule:</span>
                          <span className="font-mono text-cyan-300">{alert.rule_code || alert.trigger}</span>
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(alert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>

                    {/* Expanded Accordion: Delivery channels, Audit Log, Notes */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-ocean-800/80 space-y-3 animate-fade-in text-xs">
                        {/* Recipient Channels */}
                        <div>
                          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Send className="w-3 h-3 text-ocean-400" />
                            <span>Agency Routing &amp; Dispatched Channels</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {alert.recipients.map((recip) => (
                              <div
                                key={recip.id}
                                className="p-2 rounded-lg bg-ocean-900/80 border border-ocean-800 flex items-center justify-between"
                              >
                                <span className="font-semibold text-slate-200">{recip.recipient_group}</span>
                                <span className="px-1.5 py-0.5 rounded bg-ocean-800 text-[10px] font-mono text-cyan-300 border border-ocean-700">
                                  {recip.channel}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Audit Trail Events */}
                        <div>
                          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <FileCheck className="w-3 h-3 text-ocean-400" />
                            <span>Audit &amp; Interaction History</span>
                          </div>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {alert.events.map((ev) => (
                              <div
                                key={ev.id}
                                className="p-2 rounded-lg bg-ocean-950 border border-ocean-800 flex items-start justify-between text-[11px]"
                              >
                                <div>
                                  <span className="font-mono font-bold text-spill-300">{ev.event_type}</span>
                                  <span className="text-slate-400 mx-1.5">&bull;</span>
                                  <span className="text-slate-200">{ev.operator_name || "System"}</span>
                                  {ev.notes && <p className="text-slate-400 mt-0.5">{ev.notes}</p>}
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                  {new Date(ev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Operator Notes if present */}
                        {alert.operator_notes && (
                          <div className="p-2.5 rounded-lg bg-ocean-900/60 border border-ocean-800 text-slate-300">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Operator Remarks:</span>
                            <p className="mt-0.5 whitespace-pre-line text-[11px]">{alert.operator_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Alert Rules Tab */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-ocean-950/80 border border-ocean-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-ocean-400" />
                <span>Configurable Alert Trigger Rules</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Adjust threshold parameters that govern automatic escalation across Risk, Coastal landfall, Fishing grounds, and Ports.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="glass-card p-4 rounded-xl border border-ocean-800/80 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-ocean-300">{rule.rule_code}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        rule.severity === "CRITICAL"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mt-1">{rule.rule_name}</h4>
                  <div className="mt-2 p-2 rounded-lg bg-ocean-950 border border-ocean-850 font-mono text-xs text-spill-300">
                    IF {rule.condition_metric} {rule.operator} {rule.threshold_value} THEN {rule.alert_type}
                  </div>
                  {rule.recommended_action && (
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      <strong>Recommended Restriction:</strong> {rule.recommended_action}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-ocean-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Type: <span className="text-slate-300 font-mono">{rule.restriction_type || "ADVISORY"}</span>
                  </span>
                  <button
                    onClick={() => {
                      setSelectedRuleToEdit(rule);
                      setRuleThreshold(rule.threshold_value);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-ocean-800 hover:bg-ocean-700 text-slate-200 border border-ocean-700 transition"
                  >
                    Edit Threshold
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acknowledge Modal */}
      {ackModalAlert && (
        <div className="fixed inset-0 z-50 bg-ocean-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card max-w-md w-full p-5 rounded-2xl border border-ocean-700 bg-ocean-950 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ocean-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Acknowledge Operational Alert</span>
              </h3>
              <button
                onClick={() => setAckModalAlert(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Confirming receipt of <strong>{ackModalAlert.title}</strong>. This logs your operator signature in the incident audit trail.
            </p>

            <form onSubmit={handleAcknowledgeSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Operator Name / Callsign
                </label>
                <input
                  type="text"
                  required
                  value={ackOperatorName}
                  onChange={(e) => setAckOperatorName(e.target.value)}
                  className="w-full text-xs bg-ocean-900 border border-ocean-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Action Taken / Dispatch Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  placeholder="e.g., Notified MRCC, placed coastal patrol on standby..."
                  className="w-full text-xs bg-ocean-900 border border-ocean-700 rounded-lg px-3 py-2 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAckModalAlert(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAck}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-ocean-600 hover:bg-ocean-500 text-white shadow transition"
                >
                  {submittingAck ? "Signing..." : "Sign Acknowledgement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm / Reject Restriction Modal */}
      {confirmModalAlert && (
        <div className="fixed inset-0 z-50 bg-ocean-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card max-w-md w-full p-5 rounded-2xl border border-ocean-700 bg-ocean-950 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ocean-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {confirmModalAlert.confirm ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Confirm Recommended Restriction</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Reject Restriction Recommendation</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setConfirmModalAlert(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="p-3 rounded-lg bg-ocean-900 border border-ocean-800 text-xs text-slate-300">
              <p className="font-semibold text-white mb-1">Advisory Under Review:</p>
              <p className="text-slate-300">{confirmModalAlert.alert.recommended_restriction}</p>
            </div>

            <p className="text-xs text-slate-400">
              {confirmModalAlert.confirm
                ? "Formally authorizes and confirms this operational restriction for active enforcement."
                : "Formally rejects the advisory based on operational discretion or updated field telemetry."}
            </p>

            <form onSubmit={handleConfirmSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Authorizing Officer / Designation
                </label>
                <input
                  type="text"
                  required
                  value={confirmOperatorName}
                  onChange={(e) => setConfirmOperatorName(e.target.value)}
                  className="w-full text-xs bg-ocean-900 border border-ocean-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Operational Justification Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder={
                    confirmModalAlert.confirm
                      ? "e.g., Enacted 24-hour maritime advisory under SOP-14 due to high drift velocity..."
                      : "e.g., Surface wind veered away from harbor; containment barrier sufficient..."
                  }
                  className="w-full text-xs bg-ocean-900 border border-ocean-700 rounded-lg px-3 py-2 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalAlert(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingConfirm}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg text-white shadow transition ${
                    confirmModalAlert.confirm
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-red-700 hover:bg-red-600"
                  }`}
                >
                  {submittingConfirm
                    ? "Updating..."
                    : confirmModalAlert.confirm
                    ? "Enact Confirmation"
                    : "Formally Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {selectedRuleToEdit && (
        <div className="fixed inset-0 z-50 bg-ocean-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card max-w-md w-full p-5 rounded-2xl border border-ocean-700 bg-ocean-950 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ocean-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-ocean-400" />
                <span>Edit Rule Threshold: {selectedRuleToEdit.rule_code}</span>
              </h3>
              <button
                onClick={() => setSelectedRuleToEdit(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRuleUpdateSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Condition Metric
                </label>
                <input
                  type="text"
                  disabled
                  value={`${selectedRuleToEdit.condition_metric} ${selectedRuleToEdit.operator}`}
                  className="w-full text-xs bg-ocean-900 border border-ocean-800 rounded-lg px-3 py-2 text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Threshold Value
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={ruleThreshold}
                  onChange={(e) => setRuleThreshold(parseFloat(e.target.value))}
                  className="w-full text-xs bg-ocean-900 border border-ocean-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRuleToEdit(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRule}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-ocean-600 hover:bg-ocean-500 text-white shadow transition"
                >
                  {submittingRule ? "Saving..." : "Update Threshold"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
