import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MapCanvas,
} from "../components/map/MapCanvas";
import {
  MapLayerControls,
  type LayerVisibility,
} from "../components/map/MapLayerControls";
import { MapLegend } from "../components/map/MapLegend";
import { SpatialAnalysisPanel } from "../components/map/SpatialAnalysisPanel";
import { MapSearchBar } from "../components/map/MapSearchBar";
import apiService from "../services/api";
import type {
  MapLayersResponse,
  MapIncidentPoint,
  NearbyZonesResponse,
  IncidentSeverity,
  ActiveVesselPoint,
  SuspectVesselsResponse,
  MovementPredictionResponse,
  EcosystemRiskResponse,
  CoastalImpactResponse,
  OptimizedRouteResponse,
  SourceAnalysisResponse,
} from "../types";
import { AlertTriangle, RefreshCw, Globe, CheckCircle2 } from "lucide-react";

export default function MapView() {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get("incidentId");

  const [layersData, setLayersData] = useState<MapLayersResponse | null>(null);
  const [vessels, setVessels] = useState<ActiveVesselPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIncident, setSelectedIncident] = useState<MapIncidentPoint | null>(null);
  const [nearbyData, setNearbyData] = useState<NearbyZonesResponse | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState<boolean>(false);
  const [radiusKm, setRadiusKm] = useState<number>(50);

  // Suspect Vessel Attribution
  const [suspectData, setSuspectData] = useState<SuspectVesselsResponse | null>(null);
  const [suspectLoading, setSuspectLoading] = useState<boolean>(false);
  const [highlightedVesselId, setHighlightedVesselId] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  // Module 11: Movement Prediction
  const [movementPrediction, setMovementPrediction] = useState<MovementPredictionResponse | null>(null);

  // Module 12: Ecosystem Risk
  const [ecosystemRisk, setEcosystemRisk] = useState<EcosystemRiskResponse | null>(null);
  const [coastalImpact, setCoastalImpact] = useState<CoastalImpactResponse | null>(null);

  // Module 14: Emergency Vessel Optimized Route
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRouteResponse | null>(null);

  // Module 18: Probable Spill Source Analyzer
  const [sourceAnalysis, setSourceAnalysis] = useState<SourceAnalysisResponse | null>(null);

  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | "ALL">("ALL");
  const [basemap, setBasemap] = useState<"dark" | "satellite" | "osm">("dark");

  const [mapCenter, setMapCenter] = useState<[number, number]>([10.0, 75.0]);
  const [mapZoom, setMapZoom] = useState<number>(4);

  const REGION_PRESETS = [
    { label: "Global Oceans", center: [18.0, 45.0] as [number, number], zoom: 3 },
    { label: "Deep Indian Ocean", center: [-2.0, 78.0] as [number, number], zoom: 4 },
    { label: "Arabian Sea & Gulf", center: [20.0, 60.0] as [number, number], zoom: 5 },
    { label: "Bay of Bengal & Malacca", center: [6.0, 95.0] as [number, number], zoom: 5 },
    { label: "India Coastal", center: [15.0, 78.0] as [number, number], zoom: 5 },
    { label: "Atlantic & Gulf of Mexico", center: [25.0, -85.0] as [number, number], zoom: 4 },
    { label: "Europe & North Sea", center: [48.0, 10.0] as [number, number], zoom: 4 },
  ];

  const [visibility, setVisibility] = useState<LayerVisibility>({
    incidents: true,
    vessels: true,
    spillPolygons: true,
    movementPrediction: true,
    ecosystemRisk: true,
    coastalImpact: true,
    protectedAreas: true,
    fishingZones: true,
    ports: true,
    shippingLanes: true,
    coastline: true,
    responseRouting: true,
    sourceAnalysis: true,
  });

  // Fetch all map layers & live vessel traffic
  const fetchLayers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [layers, vesselRes] = await Promise.all([
        apiService.getMapLayers(true),
        apiService.getLiveVessels().catch(() => ({ total: 0, vessels: [] })),
      ]);
      setLayersData(layers);
      setVessels(vesselRes.vessels || []);

      // If preselected incident from query param, select it
      if (preselectedId && layers.incidents.length > 0) {
        const found = layers.incidents.find((i: MapIncidentPoint) => i.id === preselectedId);
        if (found && found.latitude && found.longitude) {
          setSelectedIncident(found);
          setMapCenter([found.latitude, found.longitude]);
          setMapZoom(9);
        }
      }
    } catch (err: any) {
      console.error("Failed to load map layers:", err);
      setError(err.message || "Failed to load GIS geospatial layers.");
    } finally {
      setLoading(false);
    }
  }, [preselectedId]);

  useEffect(() => {
    fetchLayers();
  }, [fetchLayers]);

  // Fetch nearby environmental zones and suspect vessels when selected incident changes
  useEffect(() => {
    if (!selectedIncident) {
      setNearbyData(null);
      setSuspectData(null);
      setHighlightedVesselId(null);
      return;
    }

    let isMounted = true;
    const loadProximityAndSuspects = async () => {
      try {
        setNearbyLoading(true);
        setSuspectLoading(true);
        const [zonesRes, suspectsRes] = await Promise.all([
          apiService.getNearbyZones(selectedIncident.id, radiusKm),
          apiService.getSuspectVessels(selectedIncident.id).catch(() => null),
        ]);
        if (isMounted) {
          setNearbyData(zonesRes);
          setSuspectData(suspectsRes);
        }
      } catch (err) {
        console.error("Error fetching proximity/suspects:", err);
      } finally {
        if (isMounted) {
          setNearbyLoading(false);
          setSuspectLoading(false);
        }
      }
    };

    loadProximityAndSuspects();
    return () => {
      isMounted = false;
    };
  }, [selectedIncident, radiusKm]);

  // Module 11: Fetch movement prediction when incident is selected
  useEffect(() => {
    if (!selectedIncident) {
      setMovementPrediction(null);
      return;
    }
    let isMounted = true;
    apiService.getMovementPrediction(selectedIncident.id)
      .then((res) => { if (isMounted) setMovementPrediction(res); })
      .catch(() => {
        // If no prediction yet, try to auto-run one
        if (!isMounted) return;
        apiService.runMovementPrediction(selectedIncident.id, {})
          .then((res) => { if (isMounted) setMovementPrediction(res); })
          .catch(() => { if (isMounted) setMovementPrediction(null); });
      });
    return () => { isMounted = false; };
  }, [selectedIncident?.id]);

  // Module 12: Fetch ecosystem risk when incident is selected
  useEffect(() => {
    if (!selectedIncident) {
      setEcosystemRisk(null);
      return;
    }
    let isMounted = true;
    apiService.getEcosystemRisk(selectedIncident.id)
      .then((res) => { if (isMounted) setEcosystemRisk(res); })
      .catch(() => {
        // No existing analysis — auto-run one
        if (!isMounted) return;
        apiService.analyzeEcosystemRisk(selectedIncident.id, { radius_km: 500 })
          .then((res) => { if (isMounted) setEcosystemRisk(res); })
          .catch(() => { if (isMounted) setEcosystemRisk(null); });
      });
    return () => { isMounted = false; };
  }, [selectedIncident?.id]);

  // Module 13: Fetch coastal impact when incident is selected
  useEffect(() => {
    if (!selectedIncident) {
      setCoastalImpact(null);
      return;
    }
    let isMounted = true;
    apiService.getCoastalImpact(selectedIncident.id)
      .then((res) => { if (isMounted) setCoastalImpact(res); })
      .catch(() => {
        if (!isMounted) return;
        apiService.runCoastalImpactPredict(selectedIncident.id, {})
          .then((res) => { if (isMounted) setCoastalImpact(res); })
          .catch(() => { if (isMounted) setCoastalImpact(null); });
      });
    return () => { isMounted = false; };
  }, [selectedIncident?.id]);

  // Module 14: Emergency Vessel Response Route
  useEffect(() => {
    if (!selectedIncident) {
      setOptimizedRoute(null);
      return;
    }
    let isMounted = true;
    apiService.optimizeRoute(selectedIncident.id, {})
      .then((res) => { if (isMounted) setOptimizedRoute(res); })
      .catch(() => { if (isMounted) setOptimizedRoute(null); });
    return () => { isMounted = false; };
  }, [selectedIncident?.id]);

  // Module 18: Fetch probable spill source analysis when incident is selected
  useEffect(() => {
    if (!selectedIncident) {
      setSourceAnalysis(null);
      return;
    }
    let isMounted = true;
    apiService.getSourceAnalysis(selectedIncident.id)
      .then((res) => { if (isMounted) setSourceAnalysis(res); })
      .catch(() => { if (isMounted) setSourceAnalysis(null); });
    return () => { isMounted = false; };
  }, [selectedIncident?.id]);

  const handleSelectIncident = (incident: MapIncidentPoint) => {
    setSelectedIncident(incident);
    if (incident.latitude && incident.longitude) {
      setMapCenter([incident.latitude, incident.longitude]);
      setMapZoom(9);
    }
  };

  const handleResetView = () => {
    setSelectedIncident(null);
    setNearbyData(null);
    setSuspectData(null);
    setHighlightedVesselId(null);
    setMovementPrediction(null);
    setEcosystemRisk(null);
    setCoastalImpact(null);
    setOptimizedRoute(null);
    setSourceAnalysis(null);
    setMapCenter([10.0, 75.0]);
    setMapZoom(4);
  };

  const handleHighlightVessel = (vesselId: string) => {
    setHighlightedVesselId((prev) => (prev === vesselId ? null : vesselId));
    // Find vessel in active list or suspect list to center map
    const v = vessels.find((x) => x.id === vesselId);
    if (v) {
      setMapCenter([v.current_lat, v.current_lon]);
      setMapZoom(8);
    }
  };

  const handleAlertVessel = async (vesselId: string) => {
    if (!selectedIncident) return;
    try {
      await apiService.dispatchVesselAlert(vesselId, {
        incident_id: selectedIncident.id,
        alert_type: "MRCC_INTERCEPT_NOTICE",
        officer_notes: "Immediate Coast Guard interception requested for primary suspect ship passing through oil slick.",
      });
      setAlertSuccess(`🚨 Coast Guard MRCC Intercept Notice issued for ${vesselId}!`);
      setTimeout(() => setAlertSuccess(null), 5000);
    } catch (err: any) {
      console.error("Alert dispatch failed:", err);
    }
  };

  const handleLayerToggle = (key: keyof LayerVisibility) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filtered incidents based on severity
  const visibleIncidents = (layersData?.incidents || []).filter((inc) => {
    if (severityFilter === "ALL") return true;
    return inc.severity === severityFilter;
  });

  return (
    <div className="relative w-full h-[calc(100vh-70px)] overflow-hidden bg-[#020b17]">
      {/* Top Search & Filter Bar */}
      {layersData && (
        <MapSearchBar
          incidents={layersData.incidents}
          selectedIncident={selectedIncident}
          onSelectIncident={handleSelectIncident}
          severityFilter={severityFilter}
          onSeverityFilterChange={setSeverityFilter}
        />
      )}

      {/* Oceanic Region Quick Jumper */}
      <div className="absolute top-16 left-4 z-[1000] hidden md:flex items-center gap-1 p-1 rounded-xl glass-card border border-ocean-700/80 bg-ocean-950/90 shadow-xl backdrop-blur-md">
        <span className="text-[10px] uppercase font-bold text-ocean-400 px-2 select-none flex items-center gap-1">
          <Globe className="w-3 h-3 text-ocean-400" />
          Ocean Basin:
        </span>
        {REGION_PRESETS.map((r) => (
          <button
            key={r.label}
            onClick={() => {
              setMapCenter(r.center);
              setMapZoom(r.zoom);
            }}
            className="px-2 py-1 rounded-lg text-[10px] font-medium text-slate-300 hover:text-white hover:bg-ocean-800 transition cursor-pointer"
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Layer Toggles HUD (Top Right) */}
      {layersData && (
        <MapLayerControls
          visibility={visibility}
          onChange={handleLayerToggle}
          counts={{
            incidents: visibleIncidents.length,
            vessels: vessels.length,
            protectedAreas: layersData.protected_areas.length,
            fishingZones: layersData.fishing_zones.length,
            ports: layersData.ports.length,
            shippingLanes: layersData.shipping_lanes.length,
          }}
          onResetView={handleResetView}
        />
      )}

      {/* Spatial Proximity & Suspect Vessel Attribution Drawer (Top Left) */}
      <SpatialAnalysisPanel
        incident={selectedIncident}
        nearbyData={nearbyData}
        suspectData={suspectData}
        loading={nearbyLoading}
        loadingSuspects={suspectLoading}
        radiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
        onClose={() => setSelectedIncident(null)}
        highlightedVesselId={highlightedVesselId}
        onHighlightVessel={handleHighlightVessel}
        onAlertVessel={handleAlertVessel}
      />

      {/* Alert toast notification */}
      {alertSuccess && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1300] bg-emerald-950/95 border border-emerald-500/80 text-emerald-200 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{alertSuccess}</span>
        </div>
      )}

      {/* Map Legend (Bottom Right) */}
      <MapLegend />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1200] bg-ocean-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-slate-200 gap-3">
          <div className="w-10 h-10 border-4 border-ocean-400 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-semibold tracking-wide">
            Initializing GIS Geographic Intelligence Engine...
          </div>
          <div className="text-xs text-slate-400">
            Querying PostGIS spill polygons &amp; maritime zones
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1200] glass-card p-6 max-w-md text-center border border-red-500/30">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">GIS Data Error</h3>
          <p className="text-xs text-slate-300 mb-4">{error}</p>
          <button
            onClick={fetchLayers}
            className="btn-primary inline-flex items-center gap-2 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Basemap Switcher (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-[1000] glass-card p-1 rounded-xl flex items-center gap-1 border border-ocean-700/80 bg-ocean-950/90 shadow-2xl backdrop-blur-md">
        <span className="text-[10px] uppercase font-bold text-slate-400 px-2 select-none">
          Basemap:
        </span>
        <button
          onClick={() => setBasemap("dark")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
            basemap === "dark"
              ? "bg-ocean-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-ocean-900"
          }`}
        >
          Dark Tactical
        </button>
        <button
          onClick={() => setBasemap("satellite")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
            basemap === "satellite"
              ? "bg-ocean-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-ocean-900"
          }`}
        >
          Satellite Imagery
        </button>
        <button
          onClick={() => setBasemap("osm")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
            basemap === "osm"
              ? "bg-ocean-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-ocean-900"
          }`}
        >
          Street Map
        </button>
      </div>

      {/* Main Leaflet Map Canvas */}
      {layersData && (
        <MapCanvas
          incidents={visibleIncidents}
          protectedAreas={layersData.protected_areas}
          fishingZones={layersData.fishing_zones}
          ports={layersData.ports}
          shippingLanes={layersData.shipping_lanes}
          vessels={vessels}
          suspectVessels={suspectData?.suspects}
          highlightedVesselId={highlightedVesselId}
          onSelectVessel={handleHighlightVessel}
          movementPrediction={movementPrediction}
          ecosystemRisk={ecosystemRisk}
          coastalImpact={coastalImpact}
          optimizedRoute={optimizedRoute}
          sourceAnalysis={sourceAnalysis}
          coastline={layersData.coastline}
          visibility={visibility}
          selectedIncident={selectedIncident}
          onSelectIncident={handleSelectIncident}
          radiusKm={radiusKm}
          nearbyData={nearbyData}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          basemap={basemap}
        />
      )}
    </div>
  );
}
