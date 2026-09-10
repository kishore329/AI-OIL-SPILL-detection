import React, { useState } from "react";
import { ChevronDown, ChevronUp, Layers, AlertCircle } from "lucide-react";

export const MapLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="absolute bottom-6 right-6 z-[1000] glass-card border border-ocean-500/20 bg-ocean-950/90 backdrop-blur-md rounded-xl p-3.5 shadow-2xl max-w-xs transition-all">
      <div
        className="flex items-center justify-between cursor-pointer select-none pb-1.5 border-b border-ocean-700/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ocean-300">
          <Layers className="w-3.5 h-3.5 text-ocean-400" />
          Map Legend
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
          aria-label={isExpanded ? "Collapse map legend" : "Expand map legend"}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2.5 space-y-3 text-xs">
          {/* Spill Severity */}
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
              Spill Severity (Pulsing Pins)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                <span className="text-slate-200">Critical (&gt;80)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                <span className="text-slate-200">High (60-80)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                <span className="text-slate-200">Moderate (40-60)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span className="text-slate-200">Low (&lt;40)</span>
              </div>
            </div>
          </div>

          {/* Environmental Layers */}
          <div className="pt-2 border-t border-ocean-800/60">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
              Geographic &amp; Marine Layers
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-4 h-2.5 rounded bg-emerald-500/40 border border-emerald-400" />
                <span className="text-slate-300">Protected Marine Reserve</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-2.5 rounded bg-cyan-500/30 border border-cyan-400 border-dashed" />
                <span className="text-slate-300">Fishing / Trawling Zone</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400/90 flex items-center justify-center text-[8px] font-bold text-black">⚓</span>
                <span className="text-slate-300">Commercial Cargo Port</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-purple-400 border-t-2 border-dashed border-purple-400" />
                <span className="text-slate-300">Tanker Shipping Corridor</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-sky-400/80 shadow-[0_0_5px_#38bdf8]" />
                <span className="text-slate-300">Subcontinent Coastline</span>
              </div>
            </div>
          </div>

          {/* Seed Data tag */}
          <div className="pt-1.5 flex items-center gap-1.5 text-[10px] text-amber-400/90 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>SIH Simulation GIS Dataset Loaded</span>
          </div>
        </div>
      )}
    </div>
  );
};
