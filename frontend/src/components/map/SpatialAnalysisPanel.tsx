import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Shield,
  Fish,
  Anchor,
  Compass,
  ExternalLink,
  MapPin,
  Radio,
  Sliders,
  CheckCircle2,
  Trees,
  Navigation,
  AlertTriangle,
  Send,
  Eye,
} from "lucide-react";
import type {
  MapIncidentPoint,
  NearbyZonesResponse,
  ZoneType,
  ZoneSensitivity,
  SuspectVesselsResponse,
} from "../../types";

interface SpatialAnalysisPanelProps {
  incident: MapIncidentPoint | null;
  nearbyData: NearbyZonesResponse | null;
  suspectData?: SuspectVesselsResponse | null;
  loading: boolean;
  loadingSuspects?: boolean;
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  onClose: () => void;
  highlightedVesselId?: string | null;
  onHighlightVessel?: (vesselId: string) => void;
  onAlertVessel?: (vesselId: string) => void;
}

export const SpatialAnalysisPanel: React.FC<SpatialAnalysisPanelProps> = ({
  incident,
  nearbyData,
  suspectData,
  loading,
  loadingSuspects = false,
  radiusKm,
  onRadiusChange,
  onClose,
  highlightedVesselId,
  onHighlightVessel,
  onAlertVessel,
}) => {
  const [activeTab, setActiveTab] = useState<"zones" | "vessels">("vessels");

  if (!incident) return null;

  const getSeverityBadge = (sev: string) => {
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

  const getZoneIcon = (type: ZoneType | string) => {
    switch (type) {
      case "PROTECTED_AREA":
        return <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case "FISHING_ZONE":
        return <Fish className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case "PORT":
        return <Anchor className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case "SHIPPING_LANE":
        return <Compass className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      default:
        return <Trees className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
  };

  const getSensitivityColor = (sens: ZoneSensitivity | string) => {
    switch (sens) {
      case "CRITICAL":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "HIGH":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "MODERATE":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    }
  };

  const radiusOptions = [10, 25, 50, 100, 200];

  return (
    <div className="absolute top-6 left-6 z-[1000] glass-card border border-ocean-500/30 bg-ocean-950/95 backdrop-blur-xl rounded-xl p-4 shadow-2xl w-96 max-w-sm max-h-[calc(100vh-140px)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between pb-2.5 border-b border-ocean-800">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-ocean-400 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-100">{incident.incident_code}</h3>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSeverityBadge(incident.severity)}`}>
              {incident.severity}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-ocean-400" />
            {incident.latitude?.toFixed(3)}°N, {incident.longitude?.toFixed(3)}°E
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-ocean-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Incident Quick Metrics */}
      <div className="grid grid-cols-3 gap-2 py-2 border-b border-ocean-800 text-center">
        <div className="bg-ocean-900/60 p-1.5 rounded-lg border border-ocean-800/80">
          <div className="text-[10px] text-slate-400 uppercase">Risk Score</div>
          <div className="text-sm font-bold text-amber-400 font-mono">
            {incident.risk_score !== null ? incident.risk_score.toFixed(1) : "N/A"}
          </div>
        </div>
        <div className="bg-ocean-900/60 p-1.5 rounded-lg border border-ocean-800/80">
          <div className="text-[10px] text-slate-400 uppercase">Spill Area</div>
          <div className="text-sm font-bold text-slate-200">
            {incident.spill_area_km2 ? `${incident.spill_area_km2} km²` : "N/A"}
          </div>
        </div>
        <div className="bg-ocean-900/60 p-1.5 rounded-lg border border-ocean-800/80">
          <div className="text-[10px] text-slate-400 uppercase">Status</div>
          <div className="text-[10px] font-bold text-emerald-400 truncate mt-1">
            {incident.status.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      {/* Tab Switcher: Sensitive Zones vs Suspect Ships */}
      <div className="flex border-b border-ocean-800 py-1.5 gap-1">
        <button
          onClick={() => setActiveTab("vessels")}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            activeTab === "vessels"
              ? "bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-ocean-900"
          }`}
        >
          <Navigation className="w-3.5 h-3.5 text-red-400" />
          <span>Suspect Ships</span>
          <span className="text-[10px] px-1 py-0.2 rounded-full bg-red-500/30 text-red-300 font-mono">
            {suspectData?.total_suspects ?? 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("zones")}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            activeTab === "zones"
              ? "bg-ocean-600/30 text-cyan-300 border border-ocean-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-ocean-900"
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>Marine Zones</span>
          <span className="text-[10px] px-1 py-0.2 rounded-full bg-ocean-800 text-slate-300 font-mono">
            {nearbyData?.total_nearby ?? 0}
          </span>
        </button>
      </div>

      {/* Tab 1: Suspect Ships (Leak Attribution Priority) */}
      {activeTab === "vessels" && (
        <div className="flex-1 overflow-y-auto my-2 pr-1 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              AIS Passage & Leak Attribution
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {loadingSuspects ? "Correlating AIS..." : `${suspectData?.total_suspects ?? 0} ships`}
            </span>
          </div>

          {loadingSuspects ? (
            <div className="py-6 flex flex-col items-center justify-center text-slate-400 text-xs">
              <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin mb-2" />
              <span>Matching AIS transponder trajectories...</span>
            </div>
          ) : suspectData && suspectData.suspects.length > 0 ? (
            suspectData.suspects.map((vessel) => {
              const isPrimary = vessel.priority_tier === "PRIMARY_SUSPECT";
              const isSelected = highlightedVesselId === vessel.id;

              return (
                <div
                  key={vessel.id}
                  className={`rounded-lg p-2.5 transition border ${
                    isPrimary
                      ? "bg-red-950/40 border-red-500/50 shadow-md shadow-red-950/50"
                      : "bg-ocean-900/70 border-ocean-700/60"
                  } ${isSelected ? "ring-2 ring-sky-400" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{vessel.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{vessel.flag}</span>
                      </div>
                      <div className="text-[10px] text-slate-300 mt-0.5">{vessel.vessel_type}</div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                          isPrimary
                            ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        Rank #{vessel.suspicion_rank}
                      </span>
                      <div className="text-xs font-mono font-black text-amber-300 mt-1">
                        {vessel.leak_probability_score.toFixed(1)}% Leak Prob
                      </div>
                    </div>
                  </div>

                  {/* Passage details */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] bg-ocean-950/60 p-1.5 rounded border border-ocean-800">
                    <div>
                      <span className="text-slate-400">Closest Approach: </span>
                      <span className="font-mono text-cyan-300 font-bold">{vessel.closest_approach_km} km</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Speed at Spill: </span>
                      <span className="font-mono text-amber-300 font-bold">{vessel.speed_at_incident} kn</span>
                    </div>
                  </div>

                  {/* Anomaly flags */}
                  {vessel.anomaly_indicators.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {vessel.anomaly_indicators.slice(0, 2).map((anomaly, idx) => (
                        <div key={idx} className="text-[10px] text-red-300 flex items-start gap-1">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span className="leading-tight">{anomaly}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tactical Action Buttons */}
                  <div className="mt-2.5 pt-2 border-t border-ocean-800 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => onHighlightVessel?.(vessel.id)}
                      className="flex-1 py-1 px-2 bg-ocean-800 hover:bg-ocean-700 text-slate-200 rounded text-[10px] font-semibold transition flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3 text-sky-400" />
                      <span>{isSelected ? "Route Active" : "View Route"}</span>
                    </button>
                    {isPrimary && (
                      <button
                        onClick={() => onAlertVessel?.(vessel.id)}
                        className="py-1 px-2.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold transition flex items-center gap-1 shadow-sm shadow-red-600/50"
                      >
                        <Send className="w-2.5 h-2.5" />
                        <span>MRCC Alert</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs bg-ocean-900/40 rounded-lg border border-ocean-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              <span>No commercial vessels detected within timeframe buffer</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sensitive Marine Zones */}
      {activeTab === "zones" && (
        <>
          {/* Spatial Proximity Filter */}
          <div className="py-2 border-b border-ocean-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-ocean-300 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-ocean-400" />
                Proximity Radius:
              </span>
              <span className="font-mono text-xs font-bold text-ocean-300 bg-ocean-800/80 px-2 py-0.5 rounded">
                {radiusKm} km
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => onRadiusChange(r)}
                  className={`text-[11px] py-1 rounded font-medium transition ${
                    radiusKm === r
                      ? "bg-ocean-500 text-white font-bold shadow-sm shadow-ocean-500/50"
                      : "bg-ocean-900 text-slate-400 hover:bg-ocean-800 hover:text-slate-200"
                  }`}
                >
                  {r}k
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto my-2 pr-1 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Nearby Sensitive Zones
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {loading ? "Querying PostGIS..." : `${nearbyData?.total_nearby ?? 0} detected`}
              </span>
            </div>

            {loading ? (
              <div className="py-6 flex flex-col items-center justify-center text-slate-400 text-xs">
                <div className="w-5 h-5 border-2 border-ocean-400 border-t-transparent rounded-full animate-spin mb-2" />
                <span>Calculating geodesic proximity...</span>
              </div>
            ) : nearbyData && nearbyData.zones.length > 0 ? (
              nearbyData.zones.map((zone) => (
                <div
                  key={zone.zone_id}
                  className="bg-ocean-900/70 border border-ocean-700/60 rounded-lg p-2 hover:border-ocean-500 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getZoneIcon(zone.zone_type)}
                      <span className="text-xs font-medium text-slate-200 truncate" title={zone.name}>
                        {zone.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-ocean-300 shrink-0">
                      {zone.distance_km} km
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px]">
                    <span className="text-slate-400 capitalize">
                      {zone.zone_type.toLowerCase().replace(/_/g, " ")}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded border font-semibold ${getSensitivityColor(zone.sensitivity)}`}>
                      {zone.sensitivity} Sensitivity
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs bg-ocean-900/40 rounded-lg border border-ocean-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                <span>No sensitive marine zones within {radiusKm} km buffer</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer Navigation */}
      <div className="pt-2 border-t border-ocean-800 flex items-center justify-between gap-2">
        <Link
          to={`/incidents?selected=${incident.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-ocean-600 hover:bg-ocean-500 text-white rounded-lg text-xs font-semibold transition"
        >
          <span>View Incident Profile & Suspect Dossier</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

