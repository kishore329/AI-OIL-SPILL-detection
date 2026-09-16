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
        return <Anchor className="w-4 h-4 text-[#1268B3]" />;
      case "CONTAINMENT_BOOM":
        return <ShieldCheck className="w-4 h-4 text-[#A86A00]" />;
      case "ABSORBENT_MATERIALS":
        return <Boxes className="w-4 h-4 text-[#087F68]" />;
      case "PERSONNEL":
        return <Users className="w-4 h-4 text-[#1268B3]" />;
      case "MONITORING_TEAM":
        return <Eye className="w-4 h-4 text-[#168DCC]" />;
      default:
        return <Truck className="w-4 h-4 text-[#1268B3]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF8F4] text-[#087F68] border border-[#9ADBC8]">
            <span className="w-2 h-2 rounded-full bg-[#087F68]"></span>
            AVAILABLE
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5]">
            <span className="w-2 h-2 rounded-full bg-[#1268B3]"></span>
            ASSIGNED
          </span>
        );
      case "DEPLOYED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF6FF] text-[#168DCC] border border-[#A9D9F5]">
            <span className="w-2 h-2 rounded-full bg-[#168DCC] animate-ping"></span>
            DEPLOYED ON-SCENE
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF8E8] text-[#A86A00] border border-[#F3D58A]">
            <Wrench className="w-3 h-3 text-[#A86A00]" />
            MAINTENANCE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3FAFE] text-[#5E7183] border border-[#D9E8F2]">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#D9E8F2] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#EAF6FF] border border-[#A9D9F5] text-[#1268B3]">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#17324D] tracking-wide flex items-center gap-2">
                Response Resource Allocation &amp; Inventory
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5]">
                  MODULE 16
                </span>
              </h1>
              <p className="text-sm text-[#5E7183] mt-0.5">
                Strategic fleet &amp; equipment management, containment assets, and human-in-the-loop dispatch coordination.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchResources}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-[#F3FAFE] text-[#1268B3] border border-[#1268B3] transition text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Inventory
          </button>
        </div>
      </div>

      {/* Human-in-the-Loop Protocol Alert */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F3FAFE] border border-[#D9E8F2] text-[#17324D] text-xs sm:text-sm">
        <ShieldCheck className="w-5 h-5 text-[#1268B3] shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-bold text-[#0B3A66]">
            Human-in-the-Loop Dispatch Policy Active:
          </span>{" "}
          Algorithmic allocation scores guide decision support. Resources are never automatically committed
          to active spills without explicit incident commander confirmation.
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-[#EAF8F4] border border-[#9ADBC8] text-[#087F68] text-sm flex items-center gap-2 animate-fade-in font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-[#FFF1F2] border border-[#F5B5BC] text-[#C6283D] text-sm flex items-center gap-2 font-medium">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Assets */}
        <div className="p-4 rounded-xl bg-white border border-[#D9E8F2] shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-[#5E7183] text-xs font-medium">
            <span>Total Tracked Assets</span>
            <Layers className="w-4 h-4 text-[#1268B3]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-[#0B3A66] font-mono">
            {totalResources}
          </div>
          <div className="mt-1 text-xs text-[#8A9AA8]">
            Across 7 emergency categories
          </div>
        </div>

        {/* Available Ready */}
        <div className="p-4 rounded-xl bg-white border border-[#9ADBC8] shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-[#087F68] text-xs font-medium">
            <span>Available / Ready</span>
            <CheckCircle2 className="w-4 h-4 text-[#087F68]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-[#087F68] font-mono">
            {availableCount}
          </div>
          <div className="mt-1 text-xs text-[#087F68]/80">
            Immediate dispatch capability
          </div>
        </div>

        {/* Assigned */}
        <div className="p-4 rounded-xl bg-white border border-[#D9E8F2] shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-[#1268B3] text-xs font-medium">
            <span>Assigned</span>
            <Anchor className="w-4 h-4 text-[#1268B3]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-[#1268B3] font-mono">
            {assignedCount}
          </div>
          <div className="mt-1 text-xs text-[#5E7183]">
            En route or preparing staging
          </div>
        </div>

        {/* Deployed */}
        <div className="p-4 rounded-xl bg-white border border-[#D9E8F2] shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-[#168DCC] text-xs font-medium">
            <span>Deployed On-Scene</span>
            <Activity className="w-4 h-4 text-[#168DCC]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-[#168DCC] font-mono">
            {deployedCount}
          </div>
          <div className="mt-1 text-xs text-[#5E7183]">
            Active spill containment
          </div>
        </div>

        {/* Fleet Utilization */}
        <div className="p-4 rounded-xl bg-white border border-[#D9E8F2] shadow-sm relative overflow-hidden col-span-2 lg:col-span-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-[#0B3A66] text-xs font-medium">
            <span>Fleet Utilization</span>
            <Sparkles className="w-4 h-4 text-[#1268B3]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-[#0B3A66] font-mono">
            {utilizationRate}%
          </div>
          <div className="mt-1 text-xs text-[#8A9AA8]">
            {assignedCount + deployedCount} active / {maintenanceCount} maint.
          </div>
        </div>
      </div>

      {/* Active Deployments Overview Banner if any */}
      {deployedOrAssignedResources.length > 0 && (
        <div className="rounded-xl bg-white border border-[#D9E8F2] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#0B3A66] uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#1268B3]" />
              Active Field Engagements ({deployedOrAssignedResources.length})
            </h2>
            <span className="text-xs text-[#1268B3] font-mono font-medium bg-[#EAF6FF] px-2 py-0.5 rounded border border-[#A9D9F5]">Live Sync</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {deployedOrAssignedResources.map((resource) => (
              <div
                key={resource.id}
                className="p-3 rounded-lg bg-[#F8FCFF] border border-[#D9E8F2] flex flex-col justify-between text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-[#17324D] text-sm">
                      {resource.name}
                    </div>
                    <div className="text-[#5E7183] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#1268B3]" />
                      {resource.location_name}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      resource.status === "DEPLOYED"
                        ? "bg-[#EAF6FF] text-[#168DCC] border border-[#A9D9F5]"
                        : "bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5]"
                    }`}
                  >
                    {resource.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#5E7183] pt-1 border-t border-[#EAF3F8]">
                  <span>
                    Stock: <strong className="text-[#17324D]">{resource.quantity} {resource.unit}</strong>
                  </span>
                  {resource.current_incident_id ? (
                    <Link
                      to={`/incidents/${resource.current_incident_id}`}
                      className="text-[#1268B3] hover:text-[#0B3A66] flex items-center gap-1 font-semibold"
                    >
                      Incident <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-[#8A9AA8]">Committed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-xl bg-white border border-[#D9E8F2] p-4 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {["ALL", "AVAILABLE", "ASSIGNED", "DEPLOYED", "MAINTENANCE"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedStatus === st
                    ? "bg-[#1268B3] text-white shadow-xs"
                    : "bg-[#F3FAFE] hover:bg-[#EAF6FF] text-[#5E7183] border border-[#D9E8F2]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-72 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8A9AA8] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resource, base, specs..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#F8FCFF] text-[#17324D] border border-[#D9E8F2] text-xs focus:outline-none focus:border-[#1268B3]"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-[#1268B3] hover:bg-[#0F4C81] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              Find
            </button>
          </form>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#EAF3F8]">
          <span className="text-xs text-[#5E7183] flex items-center gap-1 mr-2 font-medium">
            <Filter className="w-3.5 h-3.5 text-[#1268B3]" /> Category:
          </span>
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-[#1268B3] text-white shadow-xs"
                : "text-[#5E7183] hover:text-[#17324D]"
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
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] font-bold"
                  : "bg-[#F3FAFE] hover:bg-[#EAF6FF] text-[#5E7183] border border-transparent"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Inventory Table */}
      <div className="rounded-xl bg-white border border-[#D9E8F2] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#EAF3F8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#17324D]">
              Inventory Catalog
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] font-mono font-semibold">
              {resources.length} of {totalResources} items
            </span>
          </div>
          <span className="text-xs text-[#5E7183]">
            Showing all strategic Indian coastal stations
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#5E7183] flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#1268B3] animate-spin" />
            <p className="text-sm font-medium">Loading response fleet and equipment inventory...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="p-12 text-center text-[#5E7183] space-y-2">
            <SlidersHorizontal className="w-8 h-8 mx-auto text-[#8A9AA8]" />
            <p className="text-sm font-medium">No resources match the selected criteria.</p>
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setSelectedStatus("ALL");
                setSearchQuery("");
              }}
              className="text-xs text-[#1268B3] hover:underline font-semibold cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#17324D]">
              <thead className="bg-[#F3FAFE] text-[#5E7183] uppercase tracking-wider text-[11px] font-semibold border-b border-[#D9E8F2]">
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
              <tbody className="divide-y divide-[#EAF3F8]">
                {resources.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#F8FCFF] transition duration-150"
                  >
                    {/* Resource & Category */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-[#EAF6FF] border border-[#A9D9F5] mt-0.5">
                          {getCategoryIcon(item.resource_category)}
                        </div>
                        <div>
                          <div className="font-bold text-[#17324D] text-sm">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-[#5E7183]">
                            {item.resource_category.replace(/_/g, " ")}
                          </div>
                          {item.capabilities && item.capabilities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.capabilities.slice(0, 3).map((cap, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-[#F3FAFE] text-[#1268B3] border border-[#D9E8F2] font-medium"
                                >
                                  {cap.replace(/_/g, " ")}
                                </span>
                              ))}
                              {item.capabilities.length > 3 && (
                                <span className="text-[10px] text-[#8A9AA8]">
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
                      <div className="flex items-center gap-1.5 font-bold text-[#17324D]">
                        <MapPin className="w-3.5 h-3.5 text-[#1268B3] shrink-0" />
                        <span>{item.location_name || "Coast Station"}</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#5E7183] mt-0.5">
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
                      <div className="font-mono text-sm font-bold text-[#0B3A66]">
                        {item.quantity}{" "}
                        <span className="text-xs font-normal text-[#5E7183]">
                          {item.unit}
                        </span>
                      </div>
                      <div className="w-24 bg-[#EAF3F8] rounded-full h-1.5 mt-1.5 overflow-hidden border border-[#D9E8F2]">
                        <div
                          className={`h-full rounded-full ${
                            item.status === "AVAILABLE"
                              ? "bg-[#087F68] w-full"
                              : item.status === "ASSIGNED" || item.status === "DEPLOYED"
                              ? "bg-[#1268B3] w-3/4"
                              : "bg-[#C6283D] w-1/4"
                          }`}
                        />
                      </div>
                    </td>

                    {/* Response Specs */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        {item.speed_knots ? (
                          <div className="text-[#17324D]">
                            Transit: <strong className="text-[#0B3A66]">{item.speed_knots} kts</strong>
                          </div>
                        ) : null}
                        <div className="text-[#5E7183] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#A86A00]" />
                          Mob: {item.mobilization_time_hours}h
                        </div>
                        {item.cost_per_hour ? (
                          <div className="text-[#5E7183]">
                            Rate: ${item.cost_per_hour}/hr
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* Contact Lead */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-bold text-[#17324D]">
                        {item.contact_lead || "Operations Base"}
                      </div>
                      <div className="text-[11px] text-[#5E7183] line-clamp-1">
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-xs disabled:opacity-40 cursor-pointer ${
                          item.status === "MAINTENANCE"
                            ? "bg-[#087F68] hover:bg-[#066553] text-white"
                            : "bg-white hover:bg-[#F3FAFE] text-[#1268B3] border border-[#1268B3]"
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
