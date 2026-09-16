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
        return <ShieldAlert className="w-5 h-5 text-[#C6283D]" />;
      case "COASTAL_WARNING":
        return <Waves className="w-5 h-5 text-[#A86A00]" />;
      case "FISHING_WARNING":
        return <Fish className="w-5 h-5 text-[#087F68]" />;
      case "PORT_WARNING":
        return <Anchor className="w-5 h-5 text-[#1268B3]" />;
      case "PROTECTED_AREA_WARNING":
        return <Trees className="w-5 h-5 text-[#087F68]" />;
      case "VESSEL_WARNING":
        return <Compass className="w-5 h-5 text-[#1268B3]" />;
      case "COMMUNITY_ALERT":
        return <Users className="w-5 h-5 text-[#A86A00]" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-[#1268B3]" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#D9E8F2] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FFF1F2] border border-[#F5B5BC] text-[#C6283D]">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17324D] tracking-tight flex items-center gap-2">
                Smart Alert &amp; Restriction Command Center
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-extrabold bg-[#FFF1F2] text-[#C6283D] border border-[#F5B5BC]">
                  Module 23
                </span>
              </h1>
              <p className="text-xs text-[#5E7183]">
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
            className="text-xs bg-white border border-[#D9E8F2] rounded-lg px-3 py-2 text-[#17324D] focus:outline-none focus:border-[#1268B3] shadow-xs"
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
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#1268B3] hover:bg-[#0F4C81] text-white disabled:opacity-50 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? "animate-spin" : ""}`} />
            <span>Evaluate Telemetry</span>
          </button>

          <div className="flex bg-white border border-[#D9E8F2] rounded-lg p-0.5 shadow-xs">
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === "alerts" ? "bg-[#1268B3] text-white shadow-xs" : "text-[#5E7183] hover:text-[#17324D]"
              }`}
            >
              Active Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab("rules")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === "rules" ? "bg-[#1268B3] text-white shadow-xs" : "text-[#5E7183] hover:text-[#17324D]"
              }`}
            >
              Trigger Rules ({rules.length})
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-[#D9E8F2] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#5E7183] font-medium">Active System Alerts</span>
            <span className="px-1.5 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] font-mono text-[10px] font-bold">LIVE</span>
          </div>
          <div className="text-2xl font-black text-[#0B3A66] mt-1 font-mono">{activeCount}</div>
          <p className="text-[11px] text-[#8A9AA8] mt-0.5">Telemetry monitored in real-time</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#F5B5BC] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#C6283D] font-medium">Critical Threat Warnings</span>
            <span className="px-1.5 py-0.5 rounded bg-[#FFF1F2] text-[#C6283D] border border-[#F5B5BC] font-mono text-[10px] font-bold">RISK &ge; 76</span>
          </div>
          <div className="text-2xl font-black text-[#C6283D] mt-1 font-mono">{criticalCount}</div>
          <p className="text-[11px] text-[#5E7183] mt-0.5">Urgent containment response</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#F3D58A] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A86A00] font-medium">Pending Operator Sign-Off</span>
            <span className="px-1.5 py-0.5 rounded bg-[#FFF8E8] text-[#A86A00] border border-[#F3D58A] font-mono text-[10px] font-bold">ADVISORY</span>
          </div>
          <div className="text-2xl font-black text-[#A86A00] mt-1 font-mono">{pendingRestrictionsCount}</div>
          <p className="text-[11px] text-[#5E7183] mt-0.5">Recommended restrictions awaiting review</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#9ADBC8] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#087F68] font-medium">Confirmed Restrictions</span>
            <span className="px-1.5 py-0.5 rounded bg-[#EAF8F4] text-[#087F68] border border-[#9ADBC8] font-mono text-[10px] font-bold">ENFORCED</span>
          </div>
          <div className="text-2xl font-black text-[#087F68] mt-1 font-mono">{confirmedRestrictionsCount}</div>
          <p className="text-[11px] text-[#5E7183] mt-0.5">Officially enacted maritime notices</p>
        </div>
      </div>

      {/* Critical Legal Distinction Banner */}
      <div className="p-3.5 rounded-xl bg-[#F3FAFE] border border-[#D9E8F2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-[#17324D]">
          <ShieldAlert className="w-4 h-4 text-[#1268B3] shrink-0" />
          <span>
            <strong>Statutory Distinction:</strong> The system strictly generates <em>Recommended Restrictions</em>. Official maritime exclusion zones, port stoppages, and fishing bans require <em>Operator Confirmation</em>.
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] shrink-0">
          <span className="px-2 py-0.5 rounded bg-[#EAF6FF] border border-[#A9D9F5] text-[#1268B3] font-semibold">SYSTEM ALERT</span>
          <span className="text-[#8A9AA8]">&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-[#FFF8E8] border border-[#F3D58A] text-[#A86A00] font-semibold">RECOMMENDED RESTRICTION</span>
          <span className="text-[#8A9AA8]">&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-[#EAF8F4] border border-[#9ADBC8] text-[#087F68] font-semibold">OPERATOR CONFIRMED</span>
        </div>
      </div>

      {activeTab === "alerts" ? (
        <>
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#D9E8F2] shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Severity filter */}
              <div className="flex items-center gap-1.5 text-xs text-[#5E7183]">
                <span className="font-medium">Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-[#F3FAFE] border border-[#D9E8F2] rounded-lg px-2.5 py-1 text-xs text-[#17324D] font-medium"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1.5 text-xs text-[#5E7183]">
                <span className="font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#F3FAFE] border border-[#D9E8F2] rounded-lg px-2.5 py-1 text-xs text-[#17324D] font-medium"
                >
                  <option value="ALL">All Lifecycle</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                </select>
              </div>

              {/* Restriction filter */}
              <div className="flex items-center gap-1.5 text-xs text-[#5E7183]">
                <span className="font-medium">Advisory Restrictions:</span>
                <select
                  value={restrictionFilter}
                  onChange={(e) => setRestrictionFilter(e.target.value)}
                  className="bg-[#F3FAFE] border border-[#D9E8F2] rounded-lg px-2.5 py-1 text-xs text-[#17324D] font-medium"
                >
                  <option value="ALL">All Restrictions</option>
                  <option value="RECOMMENDED">Pending Sign-off</option>
                  <option value="OPERATOR_CONFIRMED">Confirmed</option>
                  <option value="OPERATOR_REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            <span className="text-xs text-[#5E7183] font-mono">
              Showing {filteredAlerts.length} of {alerts.length} notifications
            </span>
          </div>

          {/* Alert Cards List */}
          {loading ? (
            <div className="p-12 text-center text-xs text-[#5E7183] flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#1268B3]" />
              <span>Loading alert intelligence feed...</span>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-[#D9E8F2] text-xs text-[#5E7183] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#087F68] mx-auto opacity-70" />
              <p className="font-medium">No alerts currently match the applied filter criteria.</p>
              <p className="text-[11px] text-[#8A9AA8]">All monitored maritime zones and coastal corridors are clear.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const isCritical = alert.severity === "CRITICAL";
                const isExpanded = expandedAlertId === alert.id;

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border transition-all duration-200 shadow-sm bg-white ${
                      isCritical
                        ? "border-[#F5B5BC] bg-[#FFFDFD] hover:shadow-md"
                        : alert.severity === "HIGH"
                        ? "border-[#F3D58A] bg-[#FFFFFE] hover:shadow-md"
                        : "border-[#D9E8F2] hover:shadow-md"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-lg bg-[#F3FAFE] border border-[#D9E8F2]">
                          {getAlertIcon(alert.alert_type)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#1268B3]">
                              {alert.incident_code || "INCIDENT"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                                isCritical
                                  ? "bg-[#FFF1F2] text-[#C6283D] border border-[#F5B5BC]"
                                  : alert.severity === "HIGH"
                                  ? "bg-[#FFF8E8] text-[#A86A00] border border-[#F3D58A]"
                                  : "bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5]"
                              }`}
                            >
                              {alert.severity}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3FAFE] text-[#17324D] border border-[#D9E8F2] font-mono">
                              {alert.alert_type.replace(/_/g, " ")}
                            </span>
                            {alert.status === "ACTIVE" ? (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded font-extrabold bg-[#FFF1F2] text-[#C6283D] border border-[#F5B5BC]">ACTIVE</span>
                            ) : (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded font-extrabold bg-[#EAF8F4] text-[#087F68] border border-[#9ADBC8]">ACKNOWLEDGED</span>
                            )}
                          </div>
                          <h2 className="text-sm font-bold text-[#17324D] mt-1">{alert.title}</h2>
                          <p className="text-xs text-[#5E7183] mt-0.5 leading-relaxed">{alert.message}</p>
                        </div>
                      </div>

                      {/* Right side status / action buttons */}
                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-start shrink-0">
                        {alert.status === "ACTIVE" && (
                          <button
                            onClick={() => setAckModalAlert(alert)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0B3A66] hover:bg-[#0F4C81] text-white shadow-xs transition cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        )}

                        {alert.recommended_restriction && alert.restriction_status === "RECOMMENDED" && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setConfirmModalAlert({ alert, confirm: true })}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#087F68] hover:bg-[#066553] text-white shadow-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirm</span>
                            </button>
                            <button
                              onClick={() => setConfirmModalAlert({ alert, confirm: false })}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#C6283D] hover:bg-[#A31F31] text-white shadow-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                          className="p-1.5 rounded-lg text-[#5E7183] hover:text-[#17324D] bg-white hover:bg-[#F3FAFE] border border-[#D9E8F2] transition cursor-pointer"
                          title="Toggle Details & Audit Trail"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Operational Restriction Advisory Box */}
                    {alert.recommended_restriction && (
                      <div className="mt-3 p-3 rounded-lg bg-[#F3FAFE] border border-[#D9E8F2] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-[#FFF8E8] text-[#A86A00] border border-[#F3D58A]">
                            Advisory Restriction
                          </span>
                          <span className="text-xs font-medium text-[#17324D]">{alert.recommended_restriction}</span>
                        </div>

                        {/* Restriction Enforcement Status Badge */}
                        <div className="font-mono text-[11px] shrink-0">
                          {alert.restriction_status === "RECOMMENDED" && (
                            <span className="px-2 py-0.5 rounded bg-[#FFF8E8] border border-[#F3D58A] text-[#A86A00] font-semibold">
                              Pending Operator Sign-off
                            </span>
                          )}
                          {alert.restriction_status === "OPERATOR_CONFIRMED" && (
                            <span className="px-2 py-0.5 rounded bg-[#EAF8F4] border border-[#9ADBC8] text-[#087F68] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Confirmed by {alert.confirmed_by || "Operator"}
                            </span>
                          )}
                          {alert.restriction_status === "OPERATOR_REJECTED" && (
                            <span className="px-2 py-0.5 rounded bg-[#FFF1F2] border border-[#F5B5BC] text-[#C6283D] font-semibold flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Rejected by {alert.confirmed_by || "Operator"}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Context Strip */}
                    <div className="mt-3 pt-2.5 border-t border-[#EAF3F8] flex flex-wrap items-center justify-between text-[11px] text-[#5E7183] gap-2">
                      <div className="flex flex-wrap items-center gap-4">
                        {alert.target_location && (
                          <span className="flex items-center gap-1">
                            <span className="text-[#8A9AA8]">Target Sector:</span>
                            <span className="text-[#17324D] font-medium">{alert.target_location}</span>
                          </span>
                        )}
                        {alert.eta_hours !== null && alert.eta_hours !== undefined && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#1268B3]" />
                            <span className="text-[#8A9AA8]">Time-to-Impact:</span>
                            <span className="font-mono text-[#0B3A66] font-bold">{alert.eta_hours.toFixed(1)}h</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Radio className="w-3 h-3 text-[#1268B3]" />
                          <span className="text-[#8A9AA8]">Trigger Rule:</span>
                          <span className="font-mono text-[#1268B3] font-medium">{alert.rule_code || alert.trigger}</span>
                        </span>
                      </div>

                      <div className="text-[10px] text-[#8A9AA8] font-mono">
                        {new Date(alert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>

                    {/* Expanded Accordion: Delivery channels, Audit Log, Notes */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[#EAF3F8] space-y-3 animate-fade-in text-xs">
                        {/* Recipient Channels */}
                        <div>
                          <div className="text-[11px] font-bold text-[#17324D] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Send className="w-3 h-3 text-[#1268B3]" />
                            <span>Agency Routing &amp; Dispatched Channels</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {alert.recipients.map((recip) => (
                              <div
                                key={recip.id}
                                className="p-2.5 rounded-lg bg-[#F8FCFF] border border-[#D9E8F2] flex items-center justify-between"
                              >
                                <span className="font-semibold text-[#17324D]">{recip.recipient_group}</span>
                                <span className="px-2 py-0.5 rounded bg-[#EAF6FF] text-[10px] font-mono text-[#1268B3] border border-[#A9D9F5] font-medium">
                                  {recip.channel}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Audit Trail Events */}
                        <div>
                          <div className="text-[11px] font-bold text-[#17324D] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <FileCheck className="w-3 h-3 text-[#1268B3]" />
                            <span>Audit &amp; Interaction History</span>
                          </div>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {alert.events.map((ev) => (
                              <div
                                key={ev.id}
                                className="p-2 rounded-lg bg-[#F8FCFF] border border-[#D9E8F2] flex items-start justify-between text-[11px]"
                              >
                                <div>
                                  <span className="font-mono font-bold text-[#1268B3]">{ev.event_type}</span>
                                  <span className="text-[#8A9AA8] mx-1.5">&bull;</span>
                                  <span className="text-[#17324D] font-medium">{ev.operator_name || "System"}</span>
                                  {ev.notes && <p className="text-[#5E7183] mt-0.5">{ev.notes}</p>}
                                </div>
                                <span className="text-[10px] text-[#8A9AA8] font-mono shrink-0">
                                  {new Date(ev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Operator Notes if present */}
                        {alert.operator_notes && (
                          <div className="p-2.5 rounded-lg bg-[#F3FAFE] border border-[#D9E8F2] text-[#17324D]">
                            <span className="text-[10px] font-bold text-[#5E7183] uppercase">Operator Remarks:</span>
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
          <div className="p-4 rounded-xl bg-white border border-[#D9E8F2] shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#17324D] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1268B3]" />
                <span>Configurable Alert Trigger Rules</span>
              </h3>
              <p className="text-xs text-[#5E7183] mt-0.5">
                Adjust threshold parameters that govern automatic escalation across Risk, Coastal landfall, Fishing grounds, and Ports.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white p-4 rounded-xl border border-[#D9E8F2] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#1268B3]">{rule.rule_code}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        rule.severity === "CRITICAL"
                          ? "bg-[#FFF1F2] text-[#C6283D] border border-[#F5B5BC]"
                          : "bg-[#FFF8E8] text-[#A86A00] border border-[#F3D58A]"
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#17324D] mt-1">{rule.rule_name}</h4>
                  <div className="mt-2 p-2 rounded-lg bg-[#F3FAFE] border border-[#D9E8F2] font-mono text-xs text-[#0B3A66]">
                    IF {rule.condition_metric} {rule.operator} {rule.threshold_value} THEN {rule.alert_type}
                  </div>
                  {rule.recommended_action && (
                    <p className="text-xs text-[#5E7183] mt-2 leading-relaxed">
                      <strong className="text-[#17324D]">Recommended Restriction:</strong> {rule.recommended_action}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#EAF3F8] flex items-center justify-between">
                  <span className="text-[11px] text-[#8A9AA8]">
                    Type: <span className="text-[#17324D] font-mono font-medium">{rule.restriction_type || "ADVISORY"}</span>
                  </span>
                  <button
                    onClick={() => {
                      setSelectedRuleToEdit(rule);
                      setRuleThreshold(rule.threshold_value);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-[#F3FAFE] hover:bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full p-5 rounded-2xl border border-[#D9E8F2] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAF3F8]">
              <h3 className="text-sm font-bold text-[#17324D] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#087F68]" />
                <span>Acknowledge Operational Alert</span>
              </h3>
              <button
                onClick={() => setAckModalAlert(null)}
                className="text-[#8A9AA8] hover:text-[#17324D] text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-[#5E7183]">
              Confirming receipt of <strong className="text-[#17324D]">{ackModalAlert.title}</strong>. This logs your operator signature in the incident audit trail.
            </p>

            <form onSubmit={handleAcknowledgeSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5E7183] mb-1">
                  Operator Name / Callsign
                </label>
                <input
                  type="text"
                  required
                  value={ackOperatorName}
                  onChange={(e) => setAckOperatorName(e.target.value)}
                  className="w-full text-xs bg-[#F8FCFF] border border-[#D9E8F2] rounded-lg px-3 py-2 text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5E7183] mb-1">
                  Action Taken / Dispatch Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  placeholder="e.g., Notified MRCC, placed coastal patrol on standby..."
                  className="w-full text-xs bg-[#F8FCFF] border border-[#D9E8F2] rounded-lg px-3 py-2 text-[#17324D] focus:outline-none focus:border-[#1268B3] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAckModalAlert(null)}
                  className="px-3 py-1.5 text-xs text-[#5E7183] hover:text-[#17324D] bg-white border border-[#D9E8F2] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAck}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#0B3A66] hover:bg-[#0F4C81] text-white shadow-xs transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full p-5 rounded-2xl border border-[#D9E8F2] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAF3F8]">
              <h3 className="text-sm font-bold text-[#17324D] flex items-center gap-2">
                {confirmModalAlert.confirm ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#087F68]" />
                    <span>Confirm Recommended Restriction</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-[#C6283D]" />
                    <span>Reject Restriction Recommendation</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setConfirmModalAlert(null)}
                className="text-[#8A9AA8] hover:text-[#17324D] text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#F3FAFE] border border-[#D9E8F2] text-xs text-[#17324D]">
              <p className="font-bold text-[#0B3A66] mb-1">Advisory Under Review:</p>
              <p className="text-[#5E7183]">{confirmModalAlert.alert.recommended_restriction}</p>
            </div>

            <p className="text-xs text-[#5E7183]">
              {confirmModalAlert.confirm
                ? "Formally authorizes and confirms this operational restriction for active enforcement."
                : "Formally rejects the advisory based on operational discretion or updated field telemetry."}
            </p>

            <form onSubmit={handleConfirmSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5E7183] mb-1">
                  Authorizing Officer / Designation
                </label>
                <input
                  type="text"
                  required
                  value={confirmOperatorName}
                  onChange={(e) => setConfirmOperatorName(e.target.value)}
                  className="w-full text-xs bg-[#F8FCFF] border border-[#D9E8F2] rounded-lg px-3 py-2 text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5E7183] mb-1">
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
                  className="w-full text-xs bg-[#F8FCFF] border border-[#D9E8F2] rounded-lg px-3 py-2 text-[#17324D] focus:outline-none focus:border-[#1268B3] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalAlert(null)}
                  className="px-3 py-1.5 text-xs text-[#5E7183] hover:text-[#17324D] bg-white border border-[#D9E8F2] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingConfirm}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg text-white shadow-xs transition cursor-pointer ${
                    confirmModalAlert.confirm
                      ? "bg-[#087F68] hover:bg-[#066553]"
                      : "bg-[#C6283D] hover:bg-[#A31F31]"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full p-5 rounded-2xl border border-[#D9E8F2] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAF3F8]">
              <h3 className="text-sm font-bold text-[#17324D] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1268B3]" />
                <span>Edit Rule Threshold: {selectedRuleToEdit.rule_code}</span>
              </h3>
              <button
                onClick={() => setSelectedRuleToEdit(null)}
                className="text-[#8A9AA8] hover:text-[#17324D] text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRuleUpdateSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5E7183] mb-1">
                  Condition Metric
                </label>
                <input
                  type="text"
                  disabled
                  value={`${selectedRuleToEdit.condition_metric} ${selectedRuleToEdit.operator}`}
                  className="w-full text-xs bg-[#F3FAFE] border border-[#D9E8F2] rounded-lg px-3 py-2 text-[#5E7183]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5E7183] mb-1">
                  Threshold Value
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={ruleThreshold}
                  onChange={(e) => setRuleThreshold(parseFloat(e.target.value))}
                  className="w-full text-xs bg-[#F8FCFF] border border-[#D9E8F2] rounded-lg px-3 py-2 text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRuleToEdit(null)}
                  className="px-3 py-1.5 text-xs text-[#5E7183] hover:text-[#17324D] bg-white border border-[#D9E8F2] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRule}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#1268B3] hover:bg-[#0F4C81] text-white shadow-xs transition cursor-pointer"
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
