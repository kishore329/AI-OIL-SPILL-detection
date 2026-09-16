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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D9E8F2] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#EAF6FF] border border-[#A9D9F5] flex items-center justify-center text-[#1268B3]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17324D] tracking-tight flex items-center gap-2">
                AI Oil Spill Detection &amp; Segmentation Engine
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] font-mono font-bold">
                  DEMO MODEL
                </span>
              </h1>
              <p className="text-xs text-[#5E7183]">
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
          <Link to="/incidents" className="btn-secondary text-xs flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#1268B3]" />
            <span>Incidents</span>
          </Link>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Selection & Config (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Tab Selector: Demo Presets vs Custom Upload */}
          <div className="bg-white p-1.5 rounded-xl border border-[#D9E8F2] shadow-xs flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab("preset");
                setResult(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "preset"
                  ? "bg-[#1268B3] text-white shadow-xs"
                  : "text-[#5E7183] hover:text-[#17324D] hover:bg-[#F3FAFE]"
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
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "upload"
                  ? "bg-[#1268B3] text-white shadow-xs"
                  : "text-[#5E7183] hover:text-[#17324D] hover:bg-[#F3FAFE]"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Custom Image</span>
            </button>
          </div>

          {/* Mode 1: Demo Presets List */}
          {activeTab === "preset" && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-[#1268B3] uppercase tracking-wider block">
                Available SIH Simulation Datasets
              </span>
              <div className="space-y-2">
                {DEMO_PRESETS.map((preset) => {
                  const isSelected = selectedPreset.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3 rounded-xl cursor-pointer transition flex items-start gap-3 relative border bg-white ${
                        isSelected
                          ? "border-2 border-[#1268B3] bg-[#F3FAFE] shadow-md"
                          : "border-[#D9E8F2] hover:bg-[#F8FCFF] shadow-xs"
                      }`}
                    >
                      <div className="w-14 h-14 rounded-lg bg-slate-900 overflow-hidden shrink-0 border border-[#D9E8F2] relative">
                        <img
                          src={preset.imagePath}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-[#17324D] truncate">
                            {preset.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#EAF6FF] text-[#1268B3] border border-[#A9D9F5] font-semibold">
                            {preset.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5E7183] line-clamp-2 mt-0.5 leading-snug">
                          {preset.description}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-[#8A9AA8] mt-1.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#1268B3]" />
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
                className="bg-white border-2 border-dashed border-[#A9D9F5] hover:border-[#1268B3] p-8 rounded-2xl text-center cursor-pointer transition hover:bg-[#F8FCFF] space-y-3 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#EAF6FF] border border-[#A9D9F5] flex items-center justify-center mx-auto text-[#1268B3]">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[#17324D] block">
                    Choose or drop satellite / drone imagery
                  </span>
                  <span className="text-xs text-[#5E7183] mt-1 block">
                    Supported formats: PNG, JPG, JPEG (Max 20 MB)
                  </span>
                </div>
                {uploadedFile && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF6FF] text-[#1268B3] text-xs border border-[#A9D9F5] font-medium">
                    <FileImage className="w-3.5 h-3.5" />
                    <span>{uploadedFile.name}</span>
                    <span className="text-[10px] text-[#5E7183]">
                      ({(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Geographic Coordinates Configuration */}
          <div className="bg-white p-4 rounded-xl border border-[#D9E8F2] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#17324D] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#1268B3]" />
                Capture Point Coordinates
              </span>
              <span className="text-[10px] text-[#8A9AA8]">Decimal Degrees</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#5E7183] uppercase font-bold block mb-1">
                  Latitude (°N)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  className="w-full py-1.5 px-2.5 bg-[#F8FCFF] border border-[#D9E8F2] rounded-lg text-xs font-mono text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#5E7183] uppercase font-bold block mb-1">
                  Longitude (°E)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  className="w-full py-1.5 px-2.5 bg-[#F8FCFF] border border-[#D9E8F2] rounded-lg text-xs font-mono text-[#17324D] focus:outline-none focus:border-[#1268B3]"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full py-3 px-4 bg-[#1268B3] hover:bg-[#0F4C81] text-white font-bold rounded-xl text-sm shadow-xs transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            <div className="p-3 bg-[#FFF1F2] border border-[#F5B5BC] rounded-xl text-xs text-[#C6283D] flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Visualizer & Detection Dossier (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Visualizer Box */}
          <div className="bg-white p-4 rounded-2xl border border-[#D9E8F2] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#1268B3]" />
                <span className="text-xs font-bold text-[#17324D]">
                  Spectral &amp; SAR Anomaly Visualizer
                </span>
              </div>

              {result && result.detected && result.mask_base64 && (
                <div className="flex items-center gap-1 bg-[#F3FAFE] p-1 rounded-lg border border-[#D9E8F2]">
                  <button
                    onClick={() => setViewMode("overlay")}
                    className={`text-[10px] px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
                      viewMode === "overlay"
                        ? "bg-[#1268B3] text-white shadow-xs"
                        : "text-[#5E7183] hover:text-[#17324D]"
                    }`}
                  >
                    AI Mask Overlay
                  </button>
                  <button
                    onClick={() => setViewMode("original")}
                    className={`text-[10px] px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
                      viewMode === "original"
                        ? "bg-[#1268B3] text-white shadow-xs"
                        : "text-[#5E7183] hover:text-[#17324D]"
                    }`}
                  >
                    Raw Image
                  </button>
                </div>
              )}
            </div>

            {/* Image Canvas with Scanning Pulse */}
            <div className="relative w-full h-80 rounded-xl overflow-hidden bg-slate-950 border border-[#D9E8F2] flex items-center justify-center">
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
                <div className="absolute inset-0 bg-slate-950/40 pointer-events-none flex flex-col justify-between">
                  <div className="w-full h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-bounce" />
                  <div className="p-3 text-center">
                    <span className="text-xs font-mono font-bold text-cyan-300 bg-slate-950/80 px-3 py-1 rounded-full border border-cyan-500/40">
                      SCANNING SPECTRUM • {analysisStep}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-pulse" />
                </div>
              )}

              {/* Corner target reticles */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />
            </div>
          </div>

          {/* Results Display */}
          {result ? (
            <div className="space-y-4 animate-fade-in">
              {/* Primary Detection Banner */}
              {result.detected ? (
                <div className="bg-white p-4 rounded-xl border border-[#F5B5BC] shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] border border-[#F5B5BC] flex items-center justify-center text-[#C6283D] shrink-0">
                      <Flame className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#17324D] flex items-center gap-2">
                        Oil Spill Detected
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF1F2] text-[#C6283D] border border-[#F5B5BC]">
                          {result.severity || "CONFIRMED"} SEVERITY
                        </span>
                      </h3>
                      <p className="text-xs text-[#5E7183] mt-0.5">
                        Surface hydrocarbon sheen identified by {result.model_name}.
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-[#8A9AA8]">Incident Code</div>
                    <div className="text-sm font-mono font-bold text-[#0B3A66]">
                      {result.incident_code}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-[#9ADBC8] shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF8F4] border border-[#9ADBC8] flex items-center justify-center text-[#087F68] shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#17324D]">
                      No Oil Spill Detected
                    </h3>
                    <p className="text-xs text-[#5E7183] mt-0.5">
                      Water surface normal. No hydrocarbon dampening anomalies detected in analyzed area.
                    </p>
                  </div>
                </div>
              )}

              {/* False Positive Alert Banner if confidence < 70% */}
              {result.potential_false_positive && (
                <div className="p-3.5 bg-[#FFF8E8] border border-[#F3D58A] rounded-xl flex items-start gap-3 text-[#A86A00]">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-[#A86A00] mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-[#805000]">
                      Potential false positive — additional verification recommended.
                    </div>
                    <div className="text-[#A86A00] text-[11px]">
                      Confidence score is below the 70% threshold ({((result.confidence) * 100).toFixed(1)}%). Anomaly may be caused by calm water conditions, natural biogenic seeps, or algal blooms.
                    </div>
                  </div>
                </div>
              )}

              {/* Quantitative Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-[#D9E8F2] shadow-xs text-center">
                  <div className="text-[10px] text-[#5E7183] uppercase font-bold">
                    Detection Confidence
                  </div>
                  <div className="text-xl font-black font-mono text-[#0B3A66] mt-1">
                    {(result.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-[9px] text-[#8A9AA8]">Never 100% (Probabilistic)</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#D9E8F2] shadow-xs text-center">
                  <div className="text-[10px] text-[#5E7183] uppercase font-bold">
                    Estimated Area
                  </div>
                  <div className="text-xl font-black font-mono text-[#0B3A66] mt-1">
                    {result.spill_area_km2.toFixed(1)} km²
                  </div>
                  <div className="text-[9px] text-[#8A9AA8]">Surface slick coverage</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#D9E8F2] shadow-xs text-center">
                  <div className="text-[10px] text-[#5E7183] uppercase font-bold">
                    Model Identifier
                  </div>
                  <div className="text-xs font-bold text-[#1268B3] mt-2 truncate" title={result.model_name}>
                    {result.model_name}
                  </div>
                  <div className="text-[9px] text-[#8A9AA8]">{result.is_demo_model ? "Demo Model" : "Trained Model"}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#D9E8F2] shadow-xs text-center">
                  <div className="text-[10px] text-[#5E7183] uppercase font-bold">
                    Inference Latency
                  </div>
                  <div className="text-xl font-black font-mono text-[#087F68] mt-1">
                    {result.processing_time_ms.toFixed(0)} ms
                  </div>
                  <div className="text-[9px] text-[#8A9AA8]">Processing speed</div>
                </div>
              </div>

              {/* Location & Metadata Details */}
              <div className="bg-white p-4 rounded-xl border border-[#D9E8F2] shadow-xs space-y-2 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 border-b border-[#EAF3F8]">
                  <div className="flex items-center gap-2 text-[#5E7183]">
                    <MapPin className="w-3.5 h-3.5 text-[#1268B3]" />
                    <span>Location: <span className="font-mono text-[#17324D] font-bold">{result.latitude.toFixed(4)}°N, {result.longitude.toFixed(4)}°E</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-[#5E7183]">
                    <Clock className="w-3.5 h-3.5 text-[#1268B3]" />
                    <span>Timestamp: <span className="text-[#17324D] font-bold">{new Date(result.timestamp).toLocaleString()}</span></span>
                  </div>
                </div>

                {/* Tier-1 Autonomous Pipeline Summary Bar */}
                {result.detected && (
                  <div className="p-3 bg-[#F3FAFE] rounded-xl border border-[#D9E8F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-[#1268B3]">
                        Autonomous Tier-1 Escalation Pipeline
                      </div>
                      <div className="text-[#17324D] text-[11px] flex items-center gap-2 flex-wrap">
                        <span>Risk Score: <strong className="text-[#0B3A66] font-mono">{result.risk_score ? result.risk_score.toFixed(1) : "--"}/100</strong></span>
                        <span>•</span>
                        <span>Priority Score: <strong className="text-[#C6283D] font-mono">{result.priority_score ? result.priority_score.toFixed(1) : "--"}/100</strong></span>
                        <span>•</span>
                        <span>Urgency: <strong className="text-[#C6283D] font-semibold">{result.urgency_level || "IMMEDIATE"}</strong></span>
                        <span>•</span>
                        <span>Shoreline ETA: <strong className="text-[#1268B3] font-mono">{result.coastline_eta_hours ? `~${result.coastline_eta_hours.toFixed(1)}h` : "--"}</strong></span>
                      </div>
                    </div>

                    <Link
                      to="/priority"
                      className="px-3 py-1.5 bg-[#1268B3] hover:bg-[#0F4C81] text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 shrink-0 transition shadow-xs"
                    >
                      <span>Priority Queue</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {result.details && Object.keys(result.details).length > 0 && (
                  <div className="pt-1 text-[11px] text-[#5E7183] space-y-1">
                    {result.details.sensor_type && (
                      <div>Sensor Specification: <span className="text-[#17324D] font-medium">{result.details.sensor_type}</span></div>
                    )}
                    {result.details.anomaly_type && (
                      <div>Spectral Anomaly: <span className="text-[#17324D] font-medium">{result.details.anomaly_type}</span></div>
                    )}
                    {result.details.note && (
                      <div className="italic text-[#8A9AA8]">{result.details.note}</div>
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
                      className="btn-secondary text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto"
                    >
                      <Shield className="w-3.5 h-3.5 text-[#1268B3]" />
                      <span>Open Incident Operations</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl text-center space-y-2 border border-[#D9E8F2] shadow-sm">
              <Crosshair className="w-8 h-8 text-[#1268B3] mx-auto opacity-70" />
              <h4 className="text-sm font-bold text-[#17324D]">Ready for Imagery Inference</h4>
              <p className="text-xs text-[#5E7183] max-w-sm mx-auto">
                Select one of the calibrated simulation presets or upload satellite/drone imagery to execute deep oil spill segmentation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
