import { useState, useMemo } from "react";
import { Search, Flame, X } from "lucide-react";
import type { MapIncidentPoint, IncidentSeverity } from "../../types";

interface MapSearchBarProps {
  incidents: MapIncidentPoint[];
  selectedIncident: MapIncidentPoint | null;
  onSelectIncident: (incident: MapIncidentPoint) => void;
  severityFilter: IncidentSeverity | "ALL";
  onSeverityFilterChange: (sev: IncidentSeverity | "ALL") => void;
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  severityFilter,
  onSeverityFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchesSearch =
        !searchTerm ||
        inc.incident_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inc.description && inc.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSeverity = severityFilter === "ALL" || inc.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [incidents, searchTerm, severityFilter]);

  const severityOptions: (IncidentSeverity | "ALL")[] = ["ALL", "CRITICAL", "HIGH", "MODERATE", "LOW"];

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4 pointer-events-auto">
      <div className="glass-card border border-ocean-500/25 bg-ocean-950/90 backdrop-blur-md rounded-xl p-2 shadow-2xl flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search incidents by code (e.g. DEMO-INC-001) or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 250)}
              className="w-full pl-9 pr-8 py-1.5 bg-ocean-900/80 border border-ocean-700/60 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-ocean-400 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Severity Pills */}
          <div className="flex items-center gap-1">
            {severityOptions.map((sev) => (
              <button
                key={sev}
                onClick={() => onSeverityFilterChange(sev)}
                className={`text-[10px] px-2 py-1 rounded-md font-semibold uppercase tracking-wider transition ${
                  severityFilter === sev
                    ? "bg-ocean-500 text-white shadow-sm"
                    : "bg-ocean-900/60 text-slate-400 hover:bg-ocean-800 hover:text-slate-200"
                }`}
              >
                {sev === "ALL" ? "All" : sev.slice(0, 4)}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown for search results when typing */}
        {isFocused && searchTerm.trim().length > 0 && (
          <div className="bg-ocean-950 border border-ocean-700 rounded-lg max-h-48 overflow-y-auto mt-1 p-1 space-y-1 shadow-2xl">
            {filteredIncidents.length > 0 ? (
              filteredIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onMouseDown={() => {
                    onSelectIncident(inc);
                    setSearchTerm("");
                  }}
                  className={`w-full text-left p-2 rounded-md hover:bg-ocean-800 transition flex items-center justify-between text-xs ${
                    selectedIncident?.id === inc.id ? "bg-ocean-800/80 border border-ocean-600" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Flame className={`w-3.5 h-3.5 ${
                      inc.severity === "CRITICAL" ? "text-red-400" :
                      inc.severity === "HIGH" ? "text-orange-400" :
                      inc.severity === "MODERATE" ? "text-amber-400" : "text-cyan-400"
                    }`} />
                    <div>
                      <div className="font-semibold text-slate-200">{inc.incident_code}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{inc.description || "Spill anomaly detected"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-ocean-300 font-bold">{inc.risk_score?.toFixed(1)} Risk</span>
                    <div className="text-[9px] text-slate-500">{inc.spill_area_km2} km²</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching incidents found for "{searchTerm}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
