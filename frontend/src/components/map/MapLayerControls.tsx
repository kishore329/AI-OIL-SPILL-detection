import React from "react";
import {
  Flame,
  Shield,
  Fish,
  Anchor,
  Navigation,
  Globe,
  CheckSquare,
  Square,
  Maximize2,
  Compass,
  Leaf,
  Zap,
  Crosshair,
} from "lucide-react";

export interface LayerVisibility {
  incidents: boolean;
  spillPolygons: boolean;
  movementPrediction: boolean;
  ecosystemRisk: boolean;
  protectedAreas: boolean;
  fishingZones: boolean;
  ports: boolean;
  shippingLanes: boolean;
  vessels: boolean;
  coastline: boolean;
  coastalImpact: boolean;
  responseRouting: boolean;
  sourceAnalysis: boolean;
}

interface MapLayerControlsProps {
  visibility: LayerVisibility;
  onChange: (key: keyof LayerVisibility) => void;
  counts: {
    incidents: number;
    protectedAreas: number;
    fishingZones: number;
    ports: number;
    shippingLanes: number;
    vessels?: number;
  };
  onResetView: () => void;
}

export const MapLayerControls: React.FC<MapLayerControlsProps> = ({
  visibility,
  onChange,
  counts,
  onResetView,
}) => {
  const layers: {
    key: keyof LayerVisibility;
    label: string;
    icon: React.ReactNode;
    color: string;
    count?: number;
  }[] = [
    {
      key: "incidents",
      label: "Oil Spill Incidents",
      icon: <Flame className="w-4 h-4 text-red-400" />,
      color: "text-red-400",
      count: counts.incidents,
    },
    {
      key: "movementPrediction",
      label: "Spill Movement (+24h)",
      icon: <Compass className="w-4 h-4 text-fuchsia-400" />,
      color: "text-fuchsia-400",
    },
    {
      key: "vessels",
      label: "Vessels & AIS Tracks",
      icon: <Navigation className="w-4 h-4 text-emerald-400" />,
      color: "text-emerald-400",
      count: counts.vessels ?? 0,
    },
    {
      key: "spillPolygons",
      label: "Spill Geometry Polygons",
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      color: "text-orange-400",
      count: counts.incidents,
    },
    {
      key: "protectedAreas",
      label: "Protected Marine Areas",
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
      color: "text-emerald-400",
      count: counts.protectedAreas,
    },
    {
      key: "fishingZones",
      label: "Fishing & Trawling Zones",
      icon: <Fish className="w-4 h-4 text-cyan-400" />,
      color: "text-cyan-400",
      count: counts.fishingZones,
    },
    {
      key: "ports",
      label: "Major Commercial Ports",
      icon: <Anchor className="w-4 h-4 text-amber-400" />,
      color: "text-amber-400",
      count: counts.ports,
    },
    {
      key: "shippingLanes",
      label: "Shipping Transit Routes",
      icon: <Navigation className="w-4 h-4 text-purple-400" />,
      color: "text-purple-400",
      count: counts.shippingLanes,
    },
    {
      key: "ecosystemRisk",
      label: "Ecosystem Risk Zones",
      icon: <Leaf className="w-4 h-4 text-green-400" />,
      color: "text-green-400",
    },
    {
      key: "coastalImpact",
      label: "Coastal Impact & ETA",
      icon: <Zap className="w-4 h-4 text-cyan-400" />,
      color: "text-cyan-400",
    },
    {
      key: "responseRouting",
      label: "Vessel Response Route (M14)",
      icon: <Navigation className="w-4 h-4 text-emerald-400" />,
      color: "text-emerald-400",
    },
    {
      key: "sourceAnalysis",
      label: "Probable Source Region (M18)",
      icon: <Crosshair className="w-4 h-4 text-indigo-400" />,
      color: "text-indigo-400",
    },
    {
      key: "coastline",
      label: "Coastal Perimeter Reference",
      icon: <Globe className="w-4 h-4 text-sky-400" />,
      color: "text-sky-400",
    },
  ];

  return (
    <div className="absolute top-6 right-6 z-[1000] glass-card border border-ocean-500/20 bg-ocean-950/90 backdrop-blur-md rounded-xl p-3.5 shadow-2xl w-64">
      <div className="flex items-center justify-between pb-2 border-b border-ocean-700/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-ocean-300 flex items-center gap-1.5">
          GIS Layer Toggles
        </span>
        <button
          onClick={onResetView}
          title="Reset map view to Indian Ocean overview"
          className="text-slate-400 hover:text-ocean-300 p-1 rounded hover:bg-ocean-800 transition flex items-center gap-1 text-[10px]"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      <div className="mt-2 space-y-1">
        {layers.map(({ key, label, icon, count }) => {
          const isActive = visibility[key];
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition duration-150 ${
                isActive
                  ? "bg-ocean-800/80 text-slate-100 font-medium"
                  : "text-slate-400 hover:bg-ocean-900/60 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {isActive ? (
                  <CheckSquare className="w-3.5 h-3.5 text-ocean-400 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
                <span className="shrink-0">{icon}</span>
                <span className="truncate max-w-[130px]">{label}</span>
              </div>
              {count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? "bg-ocean-700 text-ocean-200"
                      : "bg-ocean-900 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
