import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  MapPin,
  Send,
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
  Compass,
  Shield,
  Sparkles,
  Lock,
  Fish,
  Waves,
  Eye,
  ArrowLeft,
  Phone,
} from "lucide-react";
import apiService from "../services/api";
import type { CitizenReportItem } from "../types";

const CATEGORIES = [
  { id: "SURFACE_SHEEN", label: "Rainbow Sheen", desc: "Thin colorful film on water surface", icon: Waves },
  { id: "TAR_BALLS", label: "Tar Balls", desc: "Sticky dark pellets or clumps washing ashore", icon: AlertTriangle },
  { id: "HEAVY_BLACK_OIL", label: "Heavy Crude Oil", desc: "Thick viscous black oil layer", icon: Compass },
  { id: "VESSEL_DISCHARGE", label: "Ship Discharge", desc: "Visible discharge trail from vessel", icon: Fish },
  { id: "SHORELINE_COATING", label: "Shoreline Coating", desc: "Rocks, sand, or mangroves coated in oil", icon: Shield },
  { id: "OTHER", label: "Other Pollution", desc: "Unusual odor, dead marine life, or other slick", icon: Sparkles },
];

const SIZES = ["< 50 meters", "50 - 200 meters", "200 - 1000 meters", "> 1 kilometer"];
const AFFILIATIONS = ["Local Fisherman", "Citizen / Resident", "Port / Marina Worker", "Tourist / Visitor"];

export default function CitizenReport() {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [latitude, setLatitude] = useState<string>("13.0827");
  const [longitude, setLongitude] = useState<string>("80.2707");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [locationDescription, setLocationDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("SURFACE_SHEEN");
  const [estimatedSize, setEstimatedSize] = useState<string>("50 - 200 meters");
  const [description, setDescription] = useState<string>("");

  const [reporterName, setReporterName] = useState<string>("");
  const [reporterContact, setReporterContact] = useState<string>("");
  const [reporterAffiliation, setReporterAffiliation] = useState<string>("Local Fisherman");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<CitizenReportItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // HTML5 Geolocation API
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser or device.");
      return;
    }
    setGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGettingLocation(false);
      },
      (err) => {
        setGettingLocation(false);
        setLocationError(`Location access error (${err.code}): ${err.message}. You can manually enter coordinates.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a valid image file (JPEG, PNG, or WEBP).");
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Maximum size is 10 MB.");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 5) {
      setSubmitError("Please provide a brief description of what you observed (at least 5 characters).");
      return;
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90 || isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setSubmitError("Please enter valid GPS coordinates (Latitude: -90 to 90, Longitude: -180 to 180).");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const formData = new FormData();
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      formData.append("description", description.trim());
      formData.append("incident_category", category);
      if (locationDescription.trim()) formData.append("location_description", locationDescription.trim());
      if (estimatedSize) formData.append("estimated_spill_size", estimatedSize);
      if (reporterName.trim()) formData.append("reporter_name", reporterName.trim());
      if (reporterContact.trim()) formData.append("reporter_contact", reporterContact.trim());
      if (reporterAffiliation) formData.append("reporter_affiliation", reporterAffiliation);
      if (photoFile) formData.append("photo", photoFile);

      const result = await apiService.submitCitizenReport(formData);
      setSubmittedReport(result);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit report. Please check your network connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedReport(null);
    setDescription("");
    handleRemovePhoto();
    setSubmitError(null);
  };

  return (
    <div className="min-h-screen bg-ocean-950 text-slate-100 flex flex-col items-center p-3 sm:p-6 pb-24">
      {/* Top Header Navigation */}
      <div className="w-full max-w-xl flex items-center justify-between py-2 mb-4 border-b border-ocean-800">
        <Link to="/" className="flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300">
          <ArrowLeft className="w-4 h-4" />
          <span>Coast Command</span>
        </Link>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Coast Guard Public Portal
        </span>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-xl space-y-6">
        {/* Title & Marine Context Banner */}
        <div className="bg-gradient-to-r from-ocean-900 via-ocean-850 to-indigo-950 p-4 sm:p-5 rounded-2xl border border-ocean-700/80 shadow-xl space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Report a Suspected Oil Spill
              </h1>
              <p className="text-xs text-slate-300">
                Direct emergency intelligence link for fishermen, coastal citizens &amp; mariners
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 text-[11px] text-cyan-300/90 font-mono border-t border-ocean-800/80">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-400" />
              MRCC Toll-Free: 1554
            </span>
            <span>•</span>
            <span>24/7 AI-Assisted Dispatch</span>
          </div>
        </div>

        {/* Successful Submission View */}
        {submittedReport ? (
          <div className="bg-ocean-900/90 p-6 rounded-2xl border border-emerald-500/50 shadow-2xl space-y-5 animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Report Submitted Successfully</h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Thank you for protecting our coastal waters and marine ecosystem. Coast Guard command has received your field observation.
              </p>
            </div>

            {/* Tracking Reference Card */}
            <div className="p-4 rounded-xl bg-ocean-950 border border-ocean-800 text-left space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-ocean-800/80 pb-2">
                <span className="text-slate-400">Report Reference:</span>
                <span className="font-extrabold text-cyan-300 text-sm">{submittedReport.report_code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                  {submittedReport.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">GPS Location:</span>
                <span className="text-slate-200">{submittedReport.latitude.toFixed(4)}°N, {submittedReport.longitude.toFixed(4)}°E</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="text-slate-200">{submittedReport.incident_category.replace(/_/g, " ")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Submitted At:</span>
                <span className="text-slate-200">{new Date(submittedReport.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
              </div>
            </div>

            {/* Workflow Progression Stepper */}
            <div className="space-y-2 text-left pt-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Verification &amp; Response Pipeline
              </span>
              <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9px]">
                <div className="p-2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  1. SUBMITTED
                </div>
                <div className="p-2 rounded bg-ocean-950 text-slate-400 border border-ocean-800">
                  2. REVIEW
                </div>
                <div className="p-2 rounded bg-ocean-950 text-slate-400 border border-ocean-800">
                  3. AI VERIFY
                </div>
                <div className="p-2 rounded bg-ocean-950 text-slate-400 border border-ocean-800">
                  4. DISPATCH
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition cursor-pointer"
              >
                Submit Another Report
              </button>
              <Link
                to="/"
                className="w-full py-2.5 rounded-xl bg-ocean-800 hover:bg-ocean-700 text-slate-200 font-semibold text-xs transition text-center flex items-center justify-center gap-1"
              >
                Return to Command Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* Main Submission Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* 1. Photo Upload / Mobile Camera */}
            <div className="bg-ocean-900/80 p-4 rounded-2xl border border-ocean-700/60 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>1. Photo Evidence (Recommended)</span>
                </label>
                <span className="text-[10px] text-slate-400">JPG, PNG, WEBP (Max 10MB)</span>
              </div>

              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-ocean-700 group max-h-64 bg-ocean-950 flex items-center justify-center">
                  <img src={photoPreview} alt="Evidence preview" className="w-full h-auto max-h-64 object-cover" />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white transition shadow-lg cursor-pointer"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-slate-200">
                    {photoFile?.name} ({(photoFile?.size! / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-ocean-700 hover:border-cyan-500/80 rounded-xl bg-ocean-950/40 hover:bg-ocean-900/40 transition cursor-pointer text-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-cyan-300 block">Tap to Take Photo or Upload Image</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Use your mobile camera to capture visual sheen</span>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            {/* 2. GPS Location & Coordinate Picker */}
            <div className="bg-ocean-900/80 p-4 rounded-2xl border border-ocean-700/60 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>2. Incident Location (GPS)</span>
                </label>
                {gpsAccuracy !== null && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    GPS Accuracy: ±{gpsAccuracy}m
                  </span>
                )}
              </div>

              {locationError && (
                <p className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                  {locationError}
                </p>
              )}

              <button
                type="button"
                disabled={gettingLocation}
                onClick={handleGetCurrentLocation}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Compass className={`w-4 h-4 ${gettingLocation ? "animate-spin" : ""}`} />
                <span>{gettingLocation ? "Acquiring GPS Satellite Signal..." : "Use Current GPS Location"}</span>
              </button>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Latitude (°N)</span>
                  <input
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-ocean-950 border border-ocean-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. 13.0827"
                    required
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Longitude (°E)</span>
                  <input
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-ocean-950 border border-ocean-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. 80.2707"
                    required
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Landmark / Port / Coastal Area (Optional)</span>
                <input
                  type="text"
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-ocean-950 border border-ocean-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. Marina Beach, 2 km offshore near lighthouse"
                />
              </div>
            </div>

            {/* 3. Category & Approximate Spread */}
            <div className="bg-ocean-900/80 p-4 rounded-2xl border border-ocean-700/60 space-y-3 shadow-md">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>3. Observation Category</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-purple-600/30 border-purple-400 text-white shadow-sm"
                          : "bg-ocean-950/60 border-ocean-800 text-slate-400 hover:text-slate-200 hover:border-ocean-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-purple-300" : "text-slate-400"}`} />
                        <span className="text-xs font-bold leading-tight">{cat.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 line-clamp-2 leading-snug">{cat.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <span className="text-[10px] text-slate-400 block mb-1">Approximate Visible Spread</span>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setEstimatedSize(sz)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        estimatedSize === sz
                          ? "bg-cyan-600 text-white border-cyan-400"
                          : "bg-ocean-950 border-ocean-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Description */}
            <div className="bg-ocean-900/80 p-4 rounded-2xl border border-ocean-700/60 space-y-2 shadow-md">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>4. Spill Description (Mandatory)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-ocean-950 border border-ocean-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 leading-relaxed"
                placeholder="Describe what you see: color (black/brown/rainbow), smell of fuel or diesel, movement towards shore, nearby boats or ships..."
                required
              />
            </div>

            {/* 5. Optional Reporter Information & Privacy Notice */}
            <div className="bg-ocean-900/80 p-4 rounded-2xl border border-ocean-700/60 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>5. Reporter Identity (Optional &amp; Protected)</span>
                </label>
                <span className="text-[10px] text-slate-400">Strictly Confidential</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Your Name</span>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-ocean-950 border border-ocean-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. S. Kumar"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Phone Number or Email</span>
                  <input
                    type="text"
                    value={reporterContact}
                    onChange={(e) => setReporterContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-ocean-950 border border-ocean-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. +91 98401 23456"
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Role / Association</span>
                <div className="flex flex-wrap gap-2">
                  {AFFILIATIONS.map((aff) => (
                    <button
                      key={aff}
                      type="button"
                      onClick={() => setReporterAffiliation(aff)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                        reporterAffiliation === aff
                          ? "bg-indigo-600 text-white border-indigo-400"
                          : "bg-ocean-950 border-ocean-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {aff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Guarantee Note */}
              <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/30 flex items-start gap-2 text-[10px] text-blue-200/90 leading-relaxed">
                <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Privacy Guarantee: Your contact details are stored securely and never published publicly. Responders may only contact you for critical clarification during active containment operations.
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-xl cursor-pointer disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${submitting ? "animate-spin" : ""}`} />
              <span>{submitting ? "Transmitting Field Report to Coast Guard..." : "Submit Official Oil Spill Report"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
