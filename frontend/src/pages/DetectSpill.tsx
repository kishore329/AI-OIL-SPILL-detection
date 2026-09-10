import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  Radio,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  Crosshair,
  FileImage,
  Sliders,
} from "lucide-react";
import apiService from "../services/api";
import type { DetectionAnalyzeResponse } from "../types";

interface DemoPreset {
  id: string;
  name: string;
  category: string;
  imagePath: string;
  latitude: number;
  longitude: number;
  locationName: string;
  expectedResult: string;
  description: string;
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "sentinel_sar_slick",
    name: "Sentinel-1 SAR Slick (Palk Strait)",
    category: "Satellite SAR C-band",
    imagePath: "/demo_images/sentinel_sar_slick.png",
    latitude: 10.85,
    longitude: 79.9,
    locationName: "Palk Strait / Bay of Bengal",
    expectedResult: "Heavy Crude Slick (~67.4 km²)",
    description: "High-contrast dark patch indicating significant hydrocarbon discharge with suppressed capillary waves.",
  },
  {
    id: "drone_coastal_spill",
    name: "Coastal Drone Survey (Mumbai Harbour)",
    category: "UAV Multispectral RGB",
    imagePath: "/demo_images/drone_coastal_spill.png",
    latitude: 18.94,
    longitude: 72.84,
    locationName: "Mumbai Coastal Port Approach",
    expectedResult: "Heavy Bunker Sheen (~8.2 km²)",
    description: "Nearshore diesel and heavy fuel discharge plume near industrial vessel berths.",
  },
  {
    id: "clean_ocean_water",
    name: "Clean Open Ocean (Arabian Sea)",
    category: "Baseline Negative Control",
    imagePath: "/demo_images/clean_ocean_water.png",
    latitude: 15.0,
    longitude: 71.5,
    locationName: "Central Arabian Sea",
    expectedResult: "Negative (No Spill Detected)",
    description: "Uniform sea surface backscatter with natural ocean swell waves. Baseline test.",
  },
  {
    id: "low_confidence_sheen",
    name: "Low-Confidence Sheen (Goa Shelf)",
    category: "Borderline / False Positive Test",
    imagePath: "/demo_images/low_confidence_sheen.png",
    latitude: 15.4,
    longitude: 73.8,
    locationName: "Goa Continental Shelf",
    expectedResult: "False Positive Warning (58%)",
    description: "Low backscatter gradient. Possible calm water patch or biogenic algal bloom.",
  },
];

export default function DetectSpill() {
  const [activeTab, setActiveTab] = useState<"preset" | "upload">("preset");
  const [selectedPreset, setSelectedPreset] = useState<DemoPreset>(DEMO_PRESETS[0]);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Coordinates
  const [latitude, setLatitude] = useState<number>(DEMO_PRESETS[0].latitude);
  const [longitude, setLongitude] = useState<number>(DEMO_PRESETS[0].longitude);

  // Analysis execution state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [result, setResult] = useState<DetectionAnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Visualizer toggle (Overlay vs Original)
  const [viewMode, setViewMode] = useState<"overlay" | "original">("overlay");

  const handleSelectPreset = (preset: DemoPreset) => {
    setSelectedPreset(preset);
    setLatitude(preset.latitude);
    setLongitude(preset.longitude);
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setResult(null);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setResult(null);

      setAnalysisStep("Loading raster imagery...");
      await new Promise((r) => setTimeout(r, 200));

      setAnalysisStep("Normalizing SAR backscatter & luminance gradients...");
      await new Promise((r) => setTimeout(r, 300));

      setAnalysisStep("Executing deep segmentation inference...");

      const formData = new FormData();
      formData.append("latitude", String(latitude));
      formData.append("longitude", String(longitude));

      if (activeTab === "upload" && uploadedFile) {
        formData.append("image", uploadedFile);
      } else {
        formData.append("demo_preset", selectedPreset.id);
      }

      const response = await apiService.analyzeSpill(formData);
      setResult(response);
    } catch (err: any) {
      setError(err.message || "Failed to analyze image.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  const currentImageSrc =
    activeTab === "upload"
      ? uploadedPreview || "/demo_images/sentinel_sar_slick.png"
      : selectedPreset.imagePath;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-ocean-800/80 border border-ocean-500/30 flex items-center justify-center text-ocean-400">
              <Sparkles className="w-5 h-5 text-ocean-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                AI Oil Spill Detection &amp; Segmentation Engine
                <span className="text-[10px] px-2 py-0.5 rounded bg-ocean-800 text-ocean-300 border border-ocean-600 font-mono">
                  DEMO MODEL
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Deep-learning multi-spectral &amp; SAR analysis for rapid maritime slick identification &amp; area estimation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/map" className="btn-primary text-xs flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>Geospatial Map</span>
          </Link>
          <Link to="/incidents" className="glass-card px-3 py-2 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition">
            <Shield className="w-3.5 h-3.5 text-ocean-400" />
            <span>Incidents</span>
          </Link>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Selection & Config (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Tab Selector: Demo Presets vs Custom Upload */}
          <div className="glass-card p-1.5 flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab("preset");
                setResult(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
                activeTab === "preset"
                  ? "bg-ocean-600 text-white shadow-glow-blue"
                  : "text-slate-400 hover:text-slate-200 hover:bg-ocean-900/60"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Select Simulation Preset</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("upload");
                setResult(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
                activeTab === "upload"
                  ? "bg-ocean-600 text-white shadow-glow-blue"
                  : "text-slate-400 hover:text-slate-200 hover:bg-ocean-900/60"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Custom Image</span>
            </button>
          </div>

          {/* Mode 1: Demo Presets List */}
          {activeTab === "preset" && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-semibold text-ocean-300 uppercase tracking-wider block">
                Available SIH Simulation Datasets
              </span>
              <div className="space-y-2">
                {DEMO_PRESETS.map((preset) => {
                  const isSelected = selectedPreset.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`glass-card p-3 rounded-xl cursor-pointer transition flex items-start gap-3 relative ${
                        isSelected
                          ? "border-ocean-400 bg-ocean-800/80 shadow-glow-blue"
                          : "hover:bg-ocean-800/40 hover:border-ocean-600"
                      }`}
                    >
                      <div className="w-14 h-14 rounded-lg bg-ocean-950 overflow-hidden shrink-0 border border-ocean-700/60 relative">
                        <img
                          src={preset.imagePath}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white truncate">
                            {preset.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-ocean-900 text-ocean-300 border border-ocean-700">
                            {preset.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">
                          {preset.description}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-ocean-400" />
                            {preset.locationName}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 2: Custom Upload Dropzone */}
          {activeTab === "upload" && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="glass-card border-2 border-dashed border-ocean-500/40 hover:border-ocean-400 p-8 rounded-2xl text-center cursor-pointer transition hover:bg-ocean-900/40 space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-ocean-800/80 border border-ocean-600 flex items-center justify-center mx-auto text-ocean-300">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-100 block">
                    Choose or drop satellite / drone imagery
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Supported formats: PNG, JPG, JPEG (Max 20 MB)
                  </span>
                </div>
                {uploadedFile && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ocean-800/90 text-ocean-200 text-xs border border-ocean-600">
                    <FileImage className="w-3.5 h-3.5" />
                    <span>{uploadedFile.name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Geographic Coordinates Configuration */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-ocean-400" />
                Capture Point Coordinates
              </span>
              <span className="text-[10px] text-slate-400">Decimal Degrees</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Latitude (°N)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  className="w-full py-1.5 px-2.5 bg-ocean-900/90 border border-ocean-700/80 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-ocean-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Longitude (°E)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  className="w-full py-1.5 px-2.5 bg-ocean-900/90 border border-ocean-700/80 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-ocean-400"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full py-3 px-4 bg-gradient-to-r from-ocean-500 to-ocean-600 hover:from-ocean-400 hover:to-ocean-500 text-white font-bold rounded-xl text-sm shadow-glow-blue transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{analysisStep || "Running AI Detection Model..."}</span>
              </>
            ) : (
              <>
                <Crosshair className="w-4 h-4" />
                <span>Analyze Imagery with AI Model</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Visualizer & Detection Dossier (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Visualizer Box */}
          <div className="glass-card p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-ocean-400" />
                <span className="text-xs font-bold text-slate-200">
                  Spectral &amp; SAR Anomaly Visualizer
                </span>
              </div>

              {result && result.detected && result.mask_base64 && (
                <div className="flex items-center gap-1 bg-ocean-900/80 p-1 rounded-lg border border-ocean-700/60">
                  <button
                    onClick={() => setViewMode("overlay")}
                    className={`text-[10px] px-2.5 py-1 rounded font-semibold transition ${
                      viewMode === "overlay"
                        ? "bg-ocean-500 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    AI Mask Overlay
                  </button>
                  <button
                    onClick={() => setViewMode("original")}
                    className={`text-[10px] px-2.5 py-1 rounded font-semibold transition ${
                      viewMode === "original"
                        ? "bg-ocean-500 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Raw Image
                  </button>
                </div>
              )}
            </div>

            {/* Image Canvas with Scanning Pulse */}
            <div className="relative w-full h-80 rounded-xl overflow-hidden bg-ocean-950 border border-ocean-700/60 flex items-center justify-center">
              <img
                src={currentImageSrc}
                alt="Analyzed target"
                className="w-full h-full object-cover"
              />

              {/* Segmentation Mask Overlay if detected */}
              {result && result.detected && result.mask_base64 && viewMode === "overlay" && (
                <img
                  src={result.mask_base64}
                  alt="Segmentation mask overlay"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none mix-blend-screen"
                />
              )}

              {/* Scanning HUD line animation during inference */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-ocean-950/40 pointer-events-none flex flex-col justify-between">
                  <div className="w-full h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-bounce" />
                  <div className="p-3 text-center">
                    <span className="text-xs font-mono font-bold text-cyan-300 bg-ocean-950/80 px-3 py-1 rounded-full border border-cyan-500/40">
                      SCANNING SPECTRUM • {analysisStep}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-pulse" />
                </div>
              )}

              {/* Corner target reticles */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-ocean-400 pointer-events-none" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-ocean-400 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-ocean-400 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-ocean-400 pointer-events-none" />
            </div>
          </div>

          {/* Results Display */}
          {result ? (
            <div className="space-y-4 animate-fade-in">
              {/* Primary Detection Banner */}
              {result.detected ? (
                <div className="glass-card p-4 rounded-xl border border-red-500/40 bg-gradient-to-r from-red-950/70 to-ocean-950/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                      <Flame className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        Oil Spill Detected
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                          {result.severity || "CONFIRMED"} SEVERITY
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Surface hydrocarbon sheen identified by {result.model_name}.
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Incident Code</div>
                    <div className="text-sm font-mono font-bold text-white">
                      {result.incident_code}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-4 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 to-ocean-950/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      No Oil Spill Detected
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Water surface normal. No hydrocarbon dampening anomalies detected in analyzed area.
                    </p>
                  </div>
                </div>
              )}

              {/* False Positive Alert Banner if confidence < 70% */}
              {result.potential_false_positive && (
                <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-start gap-3 text-amber-300 animate-pulse">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-amber-200">
                      Potential false positive — additional verification recommended.
                    </div>
                    <div className="text-amber-300/90 text-[11px]">
                      Confidence score is below the 70% threshold ({((result.confidence) * 100).toFixed(1)}%). Anomaly may be caused by calm water conditions, natural biogenic seeps, or algal blooms.
                    </div>
                  </div>
                </div>
              )}

              {/* Quantitative Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-card p-3 rounded-xl text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Detection Confidence
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                    {(result.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-[9px] text-slate-500">Never 100% (Probabilistic)</div>
                </div>

                <div className="glass-card p-3 rounded-xl text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Estimated Area
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                    {result.spill_area_km2.toFixed(1)} km²
                  </div>
                  <div className="text-[9px] text-slate-500">Surface slick coverage</div>
                </div>

                <div className="glass-card p-3 rounded-xl text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Model Identifier
                  </div>
                  <div className="text-xs font-bold text-ocean-300 mt-2 truncate" title={result.model_name}>
                    {result.model_name}
                  </div>
                  <div className="text-[9px] text-slate-500">{result.is_demo_model ? "Demo Model" : "Trained Model"}</div>
                </div>

                <div className="glass-card p-3 rounded-xl text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Inference Latency
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {result.processing_time_ms.toFixed(0)} ms
                  </div>
                  <div className="text-[9px] text-slate-500">Processing speed</div>
                </div>
              </div>

              {/* Location & Metadata Details */}
              <div className="glass-card p-4 rounded-xl space-y-2 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 border-b border-ocean-800">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-ocean-400" />
                    <span>Location: <span className="font-mono text-white">{result.latitude.toFixed(4)}°N, {result.longitude.toFixed(4)}°E</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-ocean-400" />
                    <span>Timestamp: <span className="text-white">{new Date(result.timestamp).toLocaleString()}</span></span>
                  </div>
                </div>

                {/* Tier-1 Autonomous Pipeline Summary Bar */}
                {result.detected && (
                  <div className="p-3 bg-ocean-900/80 rounded-xl border border-ocean-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                        Autonomous Tier-1 Escalation Pipeline
                      </div>
                      <div className="text-slate-300 text-[11px] flex items-center gap-2 flex-wrap">
                        <span>Risk Score: <strong className="text-amber-400 font-mono">{result.risk_score ? result.risk_score.toFixed(1) : "--"}/100</strong></span>
                        <span>•</span>
                        <span>Priority Score: <strong className="text-red-400 font-mono">{result.priority_score ? result.priority_score.toFixed(1) : "--"}/100</strong></span>
                        <span>•</span>
                        <span>Urgency: <strong className="text-red-300 font-semibold">{result.urgency_level || "IMMEDIATE"}</strong></span>
                        <span>•</span>
                        <span>Shoreline ETA: <strong className="text-cyan-300 font-mono">{result.coastline_eta_hours ? `~${result.coastline_eta_hours.toFixed(1)}h` : "--"}</strong></span>
                      </div>
                    </div>

                    <Link
                      to="/priority"
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded text-[11px] font-semibold flex items-center justify-center gap-1 shrink-0 transition"
                    >
                      <span>Priority Queue</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {result.details && Object.keys(result.details).length > 0 && (
                  <div className="pt-1 text-[11px] text-slate-400 space-y-1">
                    {result.details.sensor_type && (
                      <div>Sensor Specification: <span className="text-slate-200">{result.details.sensor_type}</span></div>
                    )}
                    {result.details.anomaly_type && (
                      <div>Spectral Anomaly: <span className="text-slate-200">{result.details.anomaly_type}</span></div>
                    )}
                    {result.details.note && (
                      <div className="italic text-slate-400">{result.details.note}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {result.detected && (
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <Link
                    to={`/map?incidentId=${result.incident_id}`}
                    className="btn-primary text-xs w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <span>Inspect Spill on Geospatial Map</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  {result.incident_id && (
                    <Link
                      to={`/incidents/${result.incident_id}`}
                      className="glass-card px-4 py-2 text-xs text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition w-full sm:w-auto"
                    >
                      <Shield className="w-3.5 h-3.5 text-ocean-400" />
                      <span>Open Incident Operations</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 rounded-2xl text-center space-y-2">
              <Crosshair className="w-8 h-8 text-ocean-400/80 mx-auto" />
              <h4 className="text-sm font-bold text-slate-200">Ready for Imagery Inference</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select one of the calibrated simulation presets or upload satellite/drone imagery to execute deep oil spill segmentation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
