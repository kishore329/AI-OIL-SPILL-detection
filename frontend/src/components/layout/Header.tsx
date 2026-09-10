import { useState, useRef, useEffect } from "react";
import {
  Bell,
  Settings,
  Wifi,
  WifiOff,
  Loader2,
  Menu,
  X,
  Cpu,
  Database,
  Sliders,
  Bot,
} from "lucide-react";
import { useHealth } from "../../hooks/useHealth";
import { useLocation, Link } from "react-router-dom";
import apiService from "../../services/api";
import type { SmartAlertItem } from "../../types";

const ROUTE_TITLES: Record<string, string> = {
  "/":             "Operational Dashboard",
  "/incidents":    "Incident Operations & Dossier",
  "/detect":       "AI Spill Detection",
  "/detect-spill": "AI Spill Detection",
  "/priority":     "Priority Dispatch Queue",
  "/map":          "Geospatial Intelligence Map",
  "/risk":         "Risk Studio & Explainability",
  "/resources":    "Resource Allocation Hub",
  "/reports":      "Citizen Reports Intelligence",
  "/simulator":    "What-If Oil Spill Simulator",
  "/alerts":       "Smart Alert & Restriction Command Center",
  "/assistant":    "Oil Spill AI Assistant",
};

interface HeaderProps {
  onToggleMobileNav?: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "info" | "success" | "warning";
  read: boolean;
}

export function Header({ onToggleMobileNav }: HeaderProps) {
  const healthStatus = useHealth();
  const location = useLocation();
  const pageTitle = ROUTE_TITLES[location.pathname] ?? "Oil Spill Intelligence";

  // State for modals & popovers
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live Smart Alerts state
  const [liveAlerts, setLiveAlerts] = useState<SmartAlertItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveAlerts = async () => {
      try {
        const res = await apiService.getAlerts({ status: "ACTIVE", limit: 6 });
        if (isMounted && res.alerts) {
          setLiveAlerts(res.alerts);
        }
      } catch (err) {
        // Silently ignore if offline
      }
    };
    fetchLiveAlerts();
    const interval = setInterval(fetchLiveAlerts, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleInlineAcknowledge = async (alertId: string) => {
    try {
      await apiService.acknowledgeAlert(alertId, { operator_name: "Duty Officer (Header Quick-Ack)" });
      setLiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (e) {
      console.error("Failed to acknowledge alert", e);
    }
  };

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n1",
      title: "Tier-1 Autonomous Pipeline Active",
      message: "AI Detection, GIS Spatial Analysis, and Priority Dispatch Queue fully synchronized.",
      time: "Just now",
      type: "success",
      read: false,
    },
    {
      id: "n2",
      title: "DeepLabV3+ SAR Model Loaded",
      message: "Sentinel-1 & drone raster inference ready with PostGIS polygon generation.",
      time: "5m ago",
      type: "info",
      read: false,
    },
    {
      id: "n3",
      title: "PostGIS Spatial Engine Connected",
      message: "Indexed marine reserves, fishing zones, ports, and shipping corridors.",
      time: "12m ago",
      type: "info",
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length + liveAlerts.length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const statusConfig = {
    loading:   { Icon: Loader2,  color: "text-slate-400", label: "Connecting...", spin: true },
    healthy:   { Icon: Wifi,     color: "text-success-400", label: "API Online",  spin: false },
    unhealthy: { Icon: WifiOff,  color: "text-danger-400",  label: "API Offline", spin: false },
  } as const;

  const { Icon, color, label, spin } = statusConfig[healthStatus];

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between
                   px-4 sm:px-6 py-3.5 border-b border-ocean-800/50
                   bg-ocean-900/80 backdrop-blur-xl"
        role="banner"
      >
        {/* Left: Mobile hamburger + Page title */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu button */}
          <button
            onClick={onToggleMobileNav}
            className="p-2 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-ocean-800 md:hidden transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <span>{pageTitle}</span>
              <span className="hidden lg:inline badge badge-info text-[9px] font-mono uppercase tracking-wider">
                SIH 2024
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              AI-Powered Maritime Oil Spill Surveillance &amp; Response
            </p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* API health indicator badge */}
          <div
            id="health-indicator"
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 sm:px-3 py-1.5
                        rounded-full border transition-all duration-300 ${
              healthStatus === "healthy"
                ? "border-success-500/30 bg-success-500/10 text-success-400"
                : healthStatus === "unhealthy"
                ? "border-danger-500/30 bg-danger-500/10 text-danger-400"
                : "border-slate-600/30 bg-slate-600/10 text-slate-400"
            }`}
            title={`Backend Status: ${label}`}
            aria-label={`API status: ${label}`}
          >
            <Icon className={`w-3.5 h-3.5 ${spin ? "animate-spin" : ""} ${color}`} />
            <span className="text-[11px] font-semibold hidden md:inline">{label}</span>
          </div>

          {/* AI Assistant Copilot quick button */}
          <Link
            to="/assistant"
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-ocean-400 hover:text-white hover:bg-ocean-800
                       transition-all duration-200 cursor-pointer"
            title="Open Oil Spill AI Copilot"
            aria-label="Open Oil Spill AI Copilot"
          >
            <Bot className="w-4 h-4 text-ocean-300" />
          </Link>

          {/* Notifications button & popover */}
          <div className="relative" ref={notifRef}>
            <button
              id="notifications-btn"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center
                         text-slate-400 hover:text-slate-100 hover:bg-ocean-800
                         transition-all duration-200 cursor-pointer"
              aria-label={`Notifications (${unreadCount} unread)`}
              aria-expanded={showNotifications}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full bg-spill-400
                             shadow-[0_0_6px_rgba(255,191,26,0.8)]"
                  aria-hidden="true"
                />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl glass-card border border-ocean-700/80 bg-ocean-950/95 shadow-2xl p-4 z-50 animate-fade-in space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-ocean-800">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-ocean-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      System Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="badge badge-warning text-[9px] px-1.5 py-0.2">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-ocean-400 hover:text-ocean-300 font-semibold transition"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {/* Live Smart Alerts Section */}
                  {liveAlerts.length > 0 && (
                    <div className="space-y-1.5 pb-2 border-b border-ocean-800/80">
                      <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Active Spill Alerts ({liveAlerts.length})</span>
                        <span className="font-mono text-[9px] text-slate-500">M23 System</span>
                      </div>
                      {liveAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-2 rounded-xl border text-xs ${
                            alert.severity === "CRITICAL"
                              ? "bg-red-950/40 border-red-500/40 text-red-200"
                              : "bg-amber-950/30 border-amber-500/40 text-amber-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs flex items-center gap-1 text-white">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              {alert.title}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-ocean-900 border border-ocean-700">
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-snug">{alert.message}</p>
                          {alert.recommended_restriction && (
                            <p className="text-[10px] text-spill-300 mt-1 font-mono">
                              &bull; Advisory: {alert.recommended_restriction}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center justify-between pt-1 border-t border-ocean-800/50 text-[10px]">
                            <span className="text-slate-400 font-mono">
                              ETA: {alert.eta_hours !== null && alert.eta_hours !== undefined ? `${alert.eta_hours.toFixed(1)}h` : "Immediate"}
                            </span>
                            <button
                              onClick={() => handleInlineAcknowledge(alert.id)}
                              className="px-2 py-0.5 rounded bg-ocean-800 hover:bg-ocean-700 text-slate-200 font-semibold border border-ocean-600 transition"
                            >
                              Quick Ack
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* System Event Logs */}
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-2 rounded-xl border text-xs transition ${
                        notif.read
                          ? "bg-ocean-900/40 border-ocean-800/60 text-slate-400"
                          : "bg-ocean-900/90 border-ocean-700 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-spill-400 shrink-0" />
                          )}
                          {notif.title}
                        </span>
                        <span className="text-[9px] text-slate-500">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-ocean-800/80 flex items-center justify-between text-[10px]">
                  <Link
                    to="/alerts"
                    onClick={() => setShowNotifications(false)}
                    className="text-ocean-400 hover:text-ocean-300 font-semibold flex items-center gap-1 transition"
                  >
                    <span>Open Alerts Command Center &rarr;</span>
                  </Link>
                  <span className="text-emerald-400 font-mono">Active Channel</span>
                </div>
              </div>
            )}
          </div>

          {/* System Settings & Diagnostics button */}
          <button
            id="settings-btn"
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-slate-400 hover:text-slate-100 hover:bg-ocean-800
                       transition-all duration-200 cursor-pointer"
            aria-label="Open system settings and diagnostics"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User avatar & popover */}
          <div className="relative" ref={profileRef}>
            <button
              id="user-avatar"
              onClick={() => setShowProfile((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-ocean-gradient flex items-center justify-center
                         text-xs font-bold text-white shadow-glow-blue cursor-pointer border border-ocean-400/40"
              aria-label="User profile: Emergency Operations Commander"
              aria-expanded={showProfile}
            >
              SIH
            </button>

            {/* Profile popover */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-card border border-ocean-700/80 bg-ocean-950/95 shadow-2xl p-4 z-50 animate-fade-in space-y-3 text-xs">
                <div className="flex items-center gap-3 pb-3 border-b border-ocean-800">
                  <div className="w-9 h-9 rounded-full bg-ocean-gradient flex items-center justify-center font-bold text-white shadow-glow-blue shrink-0">
                    SIH
                  </div>
                  <div>
                    <div className="font-bold text-white">Emergency Officer</div>
                    <div className="text-[10px] text-slate-400">Maritime Operations EOC</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Station:</span>
                    <span className="font-mono text-slate-200">MRCC Chennai Sector</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Access Level:</span>
                    <span className="badge badge-success text-[9px]">Tier-1 Lead</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Operation:</span>
                    <span className="text-amber-400 font-semibold">SIH 2024 Demo</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-ocean-800 flex justify-end">
                  <button
                    onClick={() => setShowProfile(false)}
                    className="text-[10px] text-slate-400 hover:text-white transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* System Settings & Diagnostics Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-ocean-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card border border-ocean-700 bg-ocean-950/95 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-ocean-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-ocean-800 border border-ocean-700 flex items-center justify-center text-ocean-300">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">System Diagnostics &amp; Engine Config</h3>
                  <p className="text-[10px] text-slate-400">AI Oil Spill Intelligence System • v0.1.0</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-ocean-800 transition"
                aria-label="Close settings modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Diagnostics Cards */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-ocean-900/80 border border-ocean-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-ocean-400" />
                    AI Detection Engine
                  </span>
                  <span className="badge badge-success text-[10px]">DeepLabV3+ Active</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                  <div>Model: <span className="font-mono text-slate-200">SAR UNet / ResNet50</span></div>
                  <div>Inference: <span className="font-mono text-emerald-400">~120 ms</span></div>
                  <div>Confidence Gate: <span className="font-mono text-amber-400">&gt; 70%</span></div>
                  <div>Output: <span className="font-mono text-slate-200">GeoJSON Polygon</span></div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-ocean-900/80 border border-ocean-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    Spatial Database &amp; GIS
                  </span>
                  <span className="badge badge-success text-[10px]">PostGIS Connected</span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1">
                  <div>Host: <span className="font-mono text-slate-200">localhost:5432 / oilspill_db</span></div>
                  <div>Proximity Buffer: <span className="font-mono text-slate-200">50 km maritime search radius</span></div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-ocean-900/80 border border-ocean-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Transparent Risk Model Weights
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Normalized 0-100</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="p-1.5 rounded bg-ocean-950 border border-ocean-800/80">
                    <div className="text-slate-400">Coast Proximity</div>
                    <div className="font-bold text-amber-300 font-mono mt-0.5">30%</div>
                  </div>
                  <div className="p-1.5 rounded bg-ocean-950 border border-ocean-800/80">
                    <div className="text-slate-400">Spill Volume</div>
                    <div className="font-bold text-amber-300 font-mono mt-0.5">25%</div>
                  </div>
                  <div className="p-1.5 rounded bg-ocean-950 border border-ocean-800/80">
                    <div className="text-slate-400">Protected Areas</div>
                    <div className="font-bold text-amber-300 font-mono mt-0.5">20%</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-ocean-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Smart India Hackathon 2024</span>
              <button
                onClick={() => setShowSettings(false)}
                className="btn-primary text-xs py-1.5 px-4"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
