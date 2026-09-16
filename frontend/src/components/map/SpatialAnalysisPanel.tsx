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
        return "bg-[#FFF1F2] text-[#C6283D] border-[#F5B5BC]";
      case "HIGH":
        return "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]";
      case "MODERATE":
        return "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]";
      default:
        return "bg-[#EAF8F4] text-[#087F68] border-[#9ADBC8]";
    }
  };

  const getZoneIcon = (type: ZoneType | string) => {
    switch (type) {
      case "PROTECTED_AREA":
        return <Shield className="w-3.5 h-3.5 text-[#087F68] shrink-0" />;
      case "FISHING_ZONE":
        return <Fish className="w-3.5 h-3.5 text-[#168DCC] shrink-0" />;
      case "PORT":
        return <Anchor className="w-3.5 h-3.5 text-[#A86A00] shrink-0" />;
      case "SHIPPING_LANE":
        return <Compass className="w-3.5 h-3.5 text-[#0B3A66] shrink-0" />;
      default:
        return <Trees className="w-3.5 h-3.5 text-[#1268B3] shrink-0" />;
    }
  };

  const getSensitivityColor = (sens: ZoneSensitivity | string) => {
    switch (sens) {
      case "CRITICAL":
        return "text-[#C6283D] bg-[#FFF1F2] border-[#F5B5BC]";
      case "HIGH":
        return "text-[#A86A00] bg-[#FFF8E8] border-[#F3D58A]";
      case "MODERATE":
        return "text-[#A86A00] bg-[#FFF8E8] border-[#F3D58A]";
      default:
        return "text-[#087F68] bg-[#EAF8F4] border-[#9ADBC8]";
    }
  };

  const radiusOptions = [10, 25, 50, 100, 200];

  return (
    <div className="absolute top-6 left-6 z-[1000] bg-white/95 backdrop-blur-xl border border-[#D9E8F2] rounded-xl p-4 shadow-2xl w-96 max-w-sm max-h-[calc(100vh-140px)] flex flex-col animate-fade-in text-[#17324D]">
      {/* Header */}
      <div className="flex items-start justify-between pb-2.5 border-b border-[#EAF3F8]">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#1268B3]" />
            <h3 className="text-sm font-bold text-[#17324D]">{incident.incident_code}</h3>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSeverityBadge(incident.severity)}`}>
              {incident.severity}
            </span>
          </div>
          <p className="text-[11px] text-[#5E7183] mt-0.5 flex items-center gap-1 font-mono">
            <MapPin className="w-3 h-3 text-[#1268B3]" />
            {incident.latitude?.toFixed(3)}°N, {incident.longitude?.toFixed(3)}°E
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-[#8A9AA8] hover:text-[#17324D] p-1 rounded hover:bg-[#F3FAFE] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Incident Quick Metrics */}
      <div className="grid grid-cols-3 gap-2 py-2 border-b border-[#EAF3F8] text-center">
        <div className="bg-[#F8FCFF] p-1.5 rounded-lg border border-[#D9E8F2]">
          <div className="text-[10px] text-[#5E7183] uppercase font-semibold">Risk Score</div>
          <div className="text-sm font-black text-[#0B3A66] font-mono">
            {incident.risk_score !== null ? incident.risk_score.toFixed(1) : "N/A"}
          </div>
        </div>
        <div className="bg-[#F8FCFF] p-1.5 rounded-lg border border-[#D9E8F2]">
          <div className="text-[10px] text-[#5E7183] uppercase font-semibold">Spill Area</div>
          <div className="text-sm font-bold text-[#17324D]">
            {incident.spill_area_km2 ? `${incident.spill_area_km2} km²` : "N/A"}
          </div>
        </div>
        <div className="bg-[#F8FCFF] p-1.5 rounded-lg border border-[#D9E8F2]">
          <div className="text-[10px] text-[#5E7183] uppercase font-semibold">Status</div>
          <div className="text-[10px] font-bold text-[#087F68] truncate mt-1">
            {incident.status.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      {/* Tab Switcher: Sensitive Zones vs Suspect Ships */}
      <div className="flex border-b border-[#EAF3F8] py-1.5 gap-1">
        <button
          onClick={() => setActiveTab("vessels")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === "vessels"
              ? "bg-[#FFF1F2] text-[#C6283D] border border-[#F5B5BC] shadow-xs"
              : "text-[#5E7183] hover:text-[#17324D] hover:bg-[#F3FAFE]"
          }`}
        >
          <Navigation className="w-3.5 h-3.5 text-[#C6283D]" />
          <span>Suspect Ships</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FFF1F2] text-[#C6283D] font-mono font-black">
            {suspectData?.total_suspects ?? 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("zones")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === "zones"
              ? "bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] shadow-xs"
              : "text-[#5E7183] hover:text-[#17324D] hover:bg-[#F3FAFE]"
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-[#1268B3]" />
          <span>Marine Zones</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#EAF6FF] text-[#1268B3] font-mono font-black">
            {nearbyData?.total_nearby ?? 0}
          </span>
        </button>
      </div>

      {/* Tab 1: Suspect Ships */}
      {activeTab === "vessels" && (
        <div className="flex-1 overflow-y-auto my-2 pr-1 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#17324D]">
            <span className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-[#A86A00]" />
              AIS Passage &amp; Leak Attribution
            </span>
            <span className="text-[10px] text-[#5E7183] font-mono font-medium">
              {loadingSuspects ? "Correlating AIS..." : `${suspectData?.total_suspects ?? 0} ships`}
            </span>
          </div>

          {loadingSuspects ? (
            <div className="py-6 flex flex-col items-center justify-center text-[#5E7183] text-xs">
              <div className="w-5 h-5 border-2 border-[#C6283D] border-t-transparent rounded-full animate-spin mb-2" />
              <span>Matching AIS transponder trajectories...</span>
            </div>
          ) : suspectData && suspectData.suspects.length > 0 ? (
            suspectData.suspects.map((vessel) => {
              const isPrimary = vessel.priority_tier === "PRIMARY_SUSPECT";
              const isSelected = highlightedVesselId === vessel.id;

              return (
                <div
                  key={vessel.id}
                  className={`rounded-xl p-3 transition border ${
                    isPrimary
                      ? "bg-white border-2 border-[#F5B5BC] shadow-sm"
                      : "bg-[#F8FCFF] border border-[#D9E8F2]"
                  } ${isSelected ? "ring-2 ring-[#1268B3]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#17324D] truncate">{vessel.name}</span>
                        <span className="text-[10px] text-[#5E7183] font-mono">{vessel.flag}</span>
                      </div>
                      <div className="text-[10px] text-[#5E7183] mt-0.5 font-medium">{vessel.vessel_type}</div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                          isPrimary
                            ? "bg-[#FFF1F2] text-[#C6283D] border-[#F5B5BC]"
                            : "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]"
                        }`}
                      >
                        Rank #{vessel.suspicion_rank}
                      </span>
                      <div className="text-xs font-mono font-black text-[#C6283D] mt-1">
                        {vessel.leak_probability_score.toFixed(1)}% Leak Prob
                      </div>
                    </div>
                  </div>

                  {/* Passage details */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] bg-[#F3FAFE] p-2 rounded-lg border border-[#D9E8F2]">
                    <div>
                      <span className="text-[#5E7183]">Closest Approach: </span>
                      <span className="font-mono text-[#0B3A66] font-bold">{vessel.closest_approach_km} km</span>
                    </div>
                    <div>
                      <span className="text-[#5E7183]">Speed at Spill: </span>
                      <span className="font-mono text-[#0B3A66] font-bold">{vessel.speed_at_incident} kn</span>
                    </div>
                  </div>

                  {/* Anomaly flags */}
                  {vessel.anomaly_indicators.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {vessel.anomaly_indicators.slice(0, 2).map((anomaly, idx) => (
                        <div key={idx} className="text-[10px] text-[#C6283D] flex items-start gap-1">
                          <span className="text-[#C6283D] mt-0.5 font-bold">•</span>
                          <span className="leading-tight">{anomaly}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tactical Action Buttons */}
                  <div className="mt-2.5 pt-2 border-t border-[#EAF3F8] flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => onHighlightVessel?.(vessel.id)}
                      className="flex-1 py-1.5 px-2 bg-white hover:bg-[#F3FAFE] text-[#1268B3] border border-[#D9E8F2] rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-[#1268B3]" />
                      <span>{isSelected ? "Route Active" : "View Route"}</span>
                    </button>
                    {isPrimary && (
                      <button
                        onClick={() => onAlertVessel?.(vessel.id)}
                        className="py-1.5 px-2.5 bg-[#C6283D] hover:bg-[#A31F31] text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
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
            <div className="py-6 text-center text-[#5E7183] text-xs bg-[#F3FAFE] rounded-lg border border-[#D9E8F2]">
              <CheckCircle2 className="w-5 h-5 text-[#087F68] mx-auto mb-1.5" />
              <span>No commercial vessels detected within timeframe buffer</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sensitive Marine Zones */}
      {activeTab === "zones" && (
        <>
          {/* Spatial Proximity Filter */}
          <div className="py-2 border-b border-[#EAF3F8]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-[#1268B3] flex items-center gap-1">
                <Sliders className="w-3 h-3 text-[#1268B3]" />
                Proximity Radius:
              </span>
              <span className="font-mono text-xs font-bold text-[#1268B3] bg-[#EAF6FF] px-2 py-0.5 rounded border border-[#A9D9F5]">
                {radiusKm} km
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => onRadiusChange(r)}
                  className={`text-[11px] py-1 rounded font-bold transition cursor-pointer ${
                    radiusKm === r
                      ? "bg-[#1268B3] text-white shadow-xs"
                      : "bg-[#F3FAFE] text-[#5E7183] hover:bg-[#EAF6FF] border border-[#D9E8F2]"
                  }`}
                >
                  {r}k
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto my-2 pr-1 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#17324D]">
                Nearby Sensitive Zones
              </span>
              <span className="text-[10px] text-[#5E7183] font-mono">
                {loading ? "Querying PostGIS..." : `${nearbyData?.total_nearby ?? 0} detected`}
              </span>
            </div>

            {loading ? (
              <div className="py-6 flex flex-col items-center justify-center text-[#5E7183] text-xs">
                <div className="w-5 h-5 border-2 border-[#1268B3] border-t-transparent rounded-full animate-spin mb-2" />
                <span>Calculating geodesic proximity...</span>
              </div>
            ) : nearbyData && nearbyData.zones.length > 0 ? (
              nearbyData.zones.map((zone) => (
                <div
                  key={zone.zone_id}
                  className="bg-[#F8FCFF] border border-[#D9E8F2] rounded-lg p-2.5 hover:border-[#1268B3] transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getZoneIcon(zone.zone_type)}
                      <span className="text-xs font-bold text-[#17324D] truncate" title={zone.name}>
                        {zone.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#1268B3] shrink-0">
                      {zone.distance_km} km
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px]">
                    <span className="text-[#5E7183] capitalize">
                      {zone.zone_type.toLowerCase().replace(/_/g, " ")}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border font-bold ${getSensitivityColor(zone.sensitivity)}`}>
                      {zone.sensitivity} Sensitivity
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-[#5E7183] text-xs bg-[#F3FAFE] rounded-lg border border-[#D9E8F2]">
                <CheckCircle2 className="w-5 h-5 text-[#087F68] mx-auto mb-1.5" />
                <span>No sensitive marine zones within {radiusKm} km buffer</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer Navigation */}
      <div className="pt-2 border-t border-[#EAF3F8] flex items-center justify-between gap-2">
        <Link
          to={`/incidents?selected=${incident.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1268B3] hover:bg-[#0F4C81] text-white rounded-lg text-xs font-bold transition shadow-xs"
        >
          <span>View Incident Profile &amp; Suspect Dossier</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
