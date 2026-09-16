import React, { useState } from "react";
import { ChevronDown, ChevronUp, Layers, AlertCircle } from "lucide-react";

export const MapLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="absolute bottom-6 right-6 z-[1000] bg-white/95 backdrop-blur-md border border-[#D9E8F2] rounded-xl p-3.5 shadow-xl max-w-xs transition-all text-[#17324D]">
      <div
        className="flex items-center justify-between cursor-pointer select-none pb-1.5 border-b border-[#EAF3F8]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B3A66]">
          <Layers className="w-3.5 h-3.5 text-[#1268B3]" />
          Map Legend
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-[#5E7183] hover:text-[#17324D] p-0.5 rounded cursor-pointer"
          aria-label={isExpanded ? "Collapse map legend" : "Expand map legend"}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2.5 space-y-3 text-xs">
          {/* Spill Severity */}
          <div>
            <span className="text-[11px] font-bold text-[#5E7183] uppercase tracking-wider block mb-1.5">
              Spill Severity (Pulsing Pins)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#C6283D] shadow-sm animate-pulse" />
                <span className="text-[#17324D] font-medium">Critical (&gt;80)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#A86A00] shadow-sm" />
                <span className="text-[#17324D] font-medium">High (60-80)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#D97706] shadow-sm" />
                <span className="text-[#17324D] font-medium">Moderate (40-60)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#1268B3] shadow-sm" />
                <span className="text-[#17324D] font-medium">Low (&lt;40)</span>
              </div>
            </div>
          </div>

          {/* Environmental Layers */}
          <div className="pt-2 border-t border-[#EAF3F8]">
            <span className="text-[11px] font-bold text-[#5E7183] uppercase tracking-wider block mb-1.5">
              Geographic &amp; Marine Layers
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-4 h-2.5 rounded bg-[#087F68]/30 border border-[#087F68]" />
                <span className="text-[#17324D]">Protected Marine Reserve</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-2.5 rounded bg-[#168DCC]/30 border border-[#168DCC] border-dashed" />
                <span className="text-[#17324D]">Fishing / Trawling Zone</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#A86A00]/20 flex items-center justify-center text-[9px] font-bold text-[#A86A00] border border-[#F3D58A]">⚓</span>
                <span className="text-[#17324D]">Commercial Cargo Port</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-[#0B3A66] border-t-2 border-dashed border-[#0B3A66]" />
                <span className="text-[#17324D]">Tanker Shipping Corridor</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-[#1268B3] rounded-full" />
                <span className="text-[#17324D]">Subcontinent Coastline</span>
              </div>
            </div>
          </div>

          {/* Seed Data tag */}
          <div className="pt-1.5 flex items-center gap-1.5 text-[10px] text-[#0B3A66] bg-[#F3FAFE] px-2.5 py-1.5 rounded-lg border border-[#D9E8F2] font-semibold">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#1268B3]" />
            <span>SIH Simulation GIS Dataset Loaded</span>
          </div>
        </div>
      )}
    </div>
  );
};
