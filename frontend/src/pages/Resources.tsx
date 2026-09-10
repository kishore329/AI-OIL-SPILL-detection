import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  ShieldCheck,
  AlertTriangle,
  Anchor,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Clock,
  MapPin,
  CheckCircle2,
  Wrench,
  ExternalLink,
  Layers,
  Sparkles,
  Truck,
  Users,
  Eye,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import apiService from "../services/api";
import type {
  ResourceItem,
  ResourceListResponse,
} from "../types";

export default function Resources() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [listData, setListData] = useState<ResourceListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Maintenance action state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const res: ResourceListResponse = await apiService.getResources({
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
      });
      setResources(res.resources);
      setListData(res);
    } catch (err: any) {
      console.error("Failed to load response resources", err);
      setError(err.message || "Failed to fetch response resources inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedStatus, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources();
  };

  const handleToggleMaintenance = async (resource: ResourceItem) => {
    const newStatus = resource.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";
    const reason =
      newStatus === "MAINTENANCE"
        ? "Scheduled maintenance inspection and operational overhaul"
        : "Cleared maintenance review; returned to full operational readiness";

    try {
      setUpdatingId(resource.id);
      await apiService.updateResourceStatus(resource.id, {
        status: newStatus,
        reason,
      });
      setActionSuccess(`Status for ${resource.name} updated to ${newStatus}.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchResources();
    } catch (err: any) {
      alert(`Error updating resource status: ${err.message || "Request failed"}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Resources currently active in field
  const deployedOrAssignedResources = useMemo(() => {
    return resources.filter(
      (r) => r.status === "ASSIGNED" || r.status === "DEPLOYED"
    );
  }, [resources]);

  // Derived KPI metrics from API
  const totalResources = listData?.total || resources.length;
  const availableCount = listData?.available_count ?? 0;
  const assignedCount = listData?.assigned_count ?? 0;
  const deployedCount = listData?.deployed_count ?? 0;
  const maintenanceCount = (listData?.maintenance_count ?? 0) + (listData?.unavailable_count ?? 0);
  const utilizationRate = listData?.fleet_utilization_pct ?? 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "RESPONSE_VESSEL":
      case "SKIMMER_VESSEL":
        return <Anchor className="w-4 h-4 text-cyan-400" />;
      case "CONTAINMENT_BOOM":
        return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case "ABSORBENT_MATERIALS":
        return <Boxes className="w-4 h-4 text-emerald-400" />;
      case "PERSONNEL":
        return <Users className="w-4 h-4 text-purple-400" />;
      case "MONITORING_TEAM":
        return <Eye className="w-4 h-4 text-sky-400" />;
      default:
        return <Truck className="w-4 h-4 text-blue-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/80">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            AVAILABLE
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/70 text-blue-400 border border-blue-800/80">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            ASSIGNED
          </span>
        );
      case "DEPLOYED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/70 text-cyan-300 border border-cyan-700/80">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            DEPLOYED ON-SCENE
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-400 border border-amber-800/80">
            <Wrench className="w-3 h-3 text-amber-400" />
            MAINTENANCE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-ocean-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                Response Resource Allocation &amp; Inventory
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-ocean-800/80 text-cyan-300 border border-ocean-700">
                  MODULE 16
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Strategic fleet &amp; equipment management, containment assets, and human-in-the-loop dispatch coordination.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchResources}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-ocean-900/90 hover:bg-ocean-800 text-slate-200 border border-ocean-700/80 transition text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            Refresh Inventory
          </button>
        </div>
      </div>

      {/* Human-in-the-Loop Protocol Alert */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-ocean-900/60 border border-ocean-700/70 text-slate-300 text-xs sm:text-sm backdrop-blur-sm">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-white">
            Human-in-the-Loop Dispatch Policy Active:
          </span>{" "}
          Algorithmic allocation scores guide decision support. Resources are never automatically committed
          to active spills without explicit incident commander confirmation.
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Assets */}
        <div className="p-4 rounded-xl bg-ocean-900/50 border border-ocean-800/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Tracked Assets</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-white font-mono">
            {totalResources}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Across 7 emergency categories
          </div>
        </div>

        {/* Available Ready */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-medium">
            <span>Available / Ready</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
            {availableCount}
          </div>
          <div className="mt-1 text-xs text-emerald-400/80">
            Immediate dispatch capability
          </div>
        </div>

        {/* Assigned */}
        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/40 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-blue-300 text-xs font-medium">
            <span>Assigned</span>
            <Anchor className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-blue-400 font-mono">
            {assignedCount}
          </div>
          <div className="mt-1 text-xs text-blue-400/80">
            En route or preparing staging
          </div>
        </div>

        {/* Deployed */}
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-cyan-300 text-xs font-medium">
            <span>Deployed On-Scene</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-cyan-300 font-mono">
            {deployedCount}
          </div>
          <div className="mt-1 text-xs text-cyan-300/80">
            Active spill containment
          </div>
        </div>

        {/* Fleet Utilization */}
        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 backdrop-blur-sm relative overflow-hidden col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-purple-300 text-xs font-medium">
            <span>Fleet Utilization</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-purple-300 font-mono">
            {utilizationRate}%
          </div>
          <div className="mt-1 text-xs text-purple-400/80">
            {assignedCount + deployedCount} active / {maintenanceCount} maint.
          </div>
        </div>
      </div>

      {/* Active Deployments Overview Banner if any */}
      {deployedOrAssignedResources.length > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-ocean-950 via-ocean-900 to-ocean-950 border border-cyan-800/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Active Field Engagements ({deployedOrAssignedResources.length})
            </h2>
            <span className="text-xs text-slate-400 font-mono">Live Sync</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {deployedOrAssignedResources.map((resource) => (
              <div
                key={resource.id}
                className="p-3 rounded-lg bg-ocean-950/80 border border-ocean-700/80 flex flex-col justify-between text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white text-sm">
                      {resource.name}
                    </div>
                    <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      {resource.location_name}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      resource.status === "DEPLOYED"
                        ? "bg-cyan-950 text-cyan-300 border border-cyan-700"
                        : "bg-blue-950 text-blue-300 border border-blue-700"
                    }`}
                  >
                    {resource.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-ocean-800">
                  <span>
                    Stock: <strong className="text-white">{resource.quantity} {resource.unit}</strong>
                  </span>
                  {resource.current_incident_id ? (
                    <Link
                      to={`/incidents/${resource.current_incident_id}`}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                    >
                      Incident <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-slate-500">Committed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-xl bg-ocean-900/60 border border-ocean-800/80 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {["ALL", "AVAILABLE", "ASSIGNED", "DEPLOYED", "MAINTENANCE"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedStatus === st
                    ? "bg-cyan-500 text-ocean-950 font-bold shadow-md shadow-cyan-500/20"
                    : "bg-ocean-950/70 hover:bg-ocean-800 text-slate-300 border border-ocean-700/60"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-72 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resource, base, specs..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-ocean-950 text-slate-200 border border-ocean-700/80 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-ocean-800 hover:bg-ocean-700 text-slate-200 text-xs font-medium border border-ocean-700"
            >
              Find
            </button>
          </form>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-ocean-800/60">
          <span className="text-xs text-slate-400 flex items-center gap-1 mr-2">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              selectedCategory === "ALL"
                ? "bg-ocean-700 text-white font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Categories
          </button>
          {[
            { id: "RESPONSE_VESSEL", label: "Response Vessels" },
            { id: "SKIMMER_VESSEL", label: "Skimmer Vessels" },
            { id: "CONTAINMENT_BOOM", label: "Containment Booms" },
            { id: "ABSORBENT_MATERIALS", label: "Absorbent Materials" },
            { id: "PERSONNEL", label: "Personnel" },
            { id: "MONITORING_TEAM", label: "Monitoring Teams" },
            { id: "CLEANUP_EQUIPMENT", label: "Cleanup Equipment" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                selectedCategory === cat.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                  : "bg-ocean-950/40 hover:bg-ocean-800/50 text-slate-400 border border-transparent"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Inventory Table / Grid */}
      <div className="rounded-xl bg-ocean-900/50 border border-ocean-800/80 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-ocean-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">
              Inventory Catalog
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-ocean-800 text-slate-300 font-mono">
              {resources.length} of {totalResources} items
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Showing all strategic Indian coastal stations
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm">Loading response fleet and equipment inventory...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <SlidersHorizontal className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-sm font-medium">No resources match the selected criteria.</p>
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setSelectedStatus("ALL");
                setSearchQuery("");
              }}
              className="text-xs text-cyan-400 hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-ocean-950/90 text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-ocean-800">
                <tr>
                  <th className="py-3 px-4">Resource &amp; Category</th>
                  <th className="py-3 px-4">Base Location</th>
                  <th className="py-3 px-4">Readiness Status</th>
                  <th className="py-3 px-4">Available Quantity</th>
                  <th className="py-3 px-4">Response Specs</th>
                  <th className="py-3 px-4">Contact / Operations</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-800/60">
                {resources.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-ocean-800/40 transition duration-150"
                  >
                    {/* Resource & Category */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-ocean-950 border border-ocean-700/60 mt-0.5">
                          {getCategoryIcon(item.resource_category)}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.resource_category.replace(/_/g, " ")}
                          </div>
                          {item.capabilities && item.capabilities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.capabilities.slice(0, 3).map((cap, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-ocean-950 text-cyan-300 border border-ocean-800"
                                >
                                  {cap.replace(/_/g, " ")}
                                </span>
                              ))}
                              {item.capabilities.length > 3 && (
                                <span className="text-[10px] text-slate-500">
                                  +{item.capabilities.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{item.location_name || "Coast Station"}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {item.latitude != null ? item.latitude.toFixed(4) : "—"}°N,{" "}
                        {item.longitude != null ? item.longitude.toFixed(4) : "—"}°E
                      </div>
                    </td>

                    {/* Readiness Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Available / Total */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-sm font-bold text-white">
                        {item.quantity}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          {item.unit}
                        </span>
                      </div>
                      <div className="w-24 bg-ocean-950 rounded-full h-1.5 mt-1.5 overflow-hidden border border-ocean-800">
                        <div
                          className={`h-full rounded-full ${
                            item.status === "AVAILABLE"
                              ? "bg-emerald-400 w-full"
                              : item.status === "ASSIGNED" || item.status === "DEPLOYED"
                              ? "bg-cyan-400 w-3/4"
                              : "bg-rose-500 w-1/4"
                          }`}
                        />
                      </div>
                    </td>

                    {/* Response Specs */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        {item.speed_knots ? (
                          <div className="text-slate-300">
                            Transit: <strong className="text-white">{item.speed_knots} kts</strong>
                          </div>
                        ) : null}
                        <div className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          Mob: {item.mobilization_time_hours}h
                        </div>
                        {item.cost_per_hour ? (
                          <div className="text-slate-400">
                            Rate: ${item.cost_per_hour}/hr
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* Contact Lead */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-slate-300">
                        {item.contact_lead || "Operations Base"}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {item.description || "Active emergency response resource"}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-y-1">
                      <button
                        onClick={() => handleToggleMaintenance(item)}
                        disabled={updatingId === item.id || item.status === "DEPLOYED"}
                        title={
                          item.status === "MAINTENANCE"
                            ? "Mark resource available"
                            : "Set into maintenance review"
                        }
                        className={`px-2.5 py-1 rounded text-xs font-medium transition inline-flex items-center gap-1 disabled:opacity-40 ${
                          item.status === "MAINTENANCE"
                            ? "bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-700"
                            : "bg-ocean-950 text-slate-300 hover:bg-ocean-800 border border-ocean-700"
                        }`}
                      >
                        <Wrench className="w-3 h-3" />
                        {item.status === "MAINTENANCE" ? "Mark Ready" : "Maint."}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
