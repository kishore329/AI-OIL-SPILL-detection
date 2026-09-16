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
      <div className="bg-white/95 backdrop-blur-md border border-[#D9E8F2] rounded-xl p-2 shadow-xl flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8A9AA8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search incidents by code (e.g. DEMO-INC-001) or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 250)}
              className="w-full pl-9 pr-8 py-1.5 bg-[#F8FCFF] border border-[#D9E8F2] rounded-lg text-xs text-[#17324D] placeholder-[#8A9AA8] focus:outline-none focus:border-[#1268B3] transition font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A9AA8] hover:text-[#17324D] cursor-pointer"
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
                className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider transition cursor-pointer ${
                  severityFilter === sev
                    ? "bg-[#1268B3] text-white shadow-xs"
                    : "bg-[#F3FAFE] text-[#5E7183] hover:bg-[#EAF6FF] hover:text-[#17324D] border border-[#D9E8F2]"
                }`}
              >
                {sev === "ALL" ? "All" : sev.slice(0, 4)}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown for search results when typing */}
        {isFocused && searchTerm.trim().length > 0 && (
          <div className="bg-white border border-[#D9E8F2] rounded-lg max-h-48 overflow-y-auto mt-1 p-1 space-y-1 shadow-2xl">
            {filteredIncidents.length > 0 ? (
              filteredIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onMouseDown={() => {
                    onSelectIncident(inc);
                    setSearchTerm("");
                  }}
                  className={`w-full text-left p-2 rounded-md hover:bg-[#F3FAFE] transition flex items-center justify-between text-xs cursor-pointer ${
                    selectedIncident?.id === inc.id ? "bg-[#EAF6FF] border border-[#A9D9F5]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Flame className={`w-3.5 h-3.5 ${
                      inc.severity === "CRITICAL" ? "text-[#C6283D]" :
                      inc.severity === "HIGH" ? "text-[#A86A00]" :
                      inc.severity === "MODERATE" ? "text-[#A86A00]" : "text-[#1268B3]"
                    }`} />
                    <div>
                      <span className="font-bold text-[#17324D]">{inc.incident_code}</span>
                      <span className="text-[#5E7183] text-[11px] ml-2">
                        {inc.latitude?.toFixed(2)}°N, {inc.longitude?.toFixed(2)}°E
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    inc.severity === "CRITICAL" ? "bg-[#FFF1F2] text-[#C6283D] border-[#F5B5BC]" :
                    inc.severity === "HIGH" ? "bg-[#FFF8E8] text-[#A86A00] border-[#F3D58A]" :
                    "bg-[#EAF6FF] text-[#1268B3] border-[#A9D9F5]"
                  }`}>
                    {inc.severity}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-[#5E7183]">
                No matching incidents found for "{searchTerm}".
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
