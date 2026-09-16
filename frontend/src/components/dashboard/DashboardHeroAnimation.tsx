import { useState, useEffect } from "react";
import { ShieldCheck, Activity } from "lucide-react";

export default function DashboardHeroAnimation() {
  const [telemetry, setTelemetry] = useState({
    confidence: 98.4,
    swathWidth: 45.2,
    slickArea: 4.82,
  });

  // Subtle live telemetry fluctuation to give it an authentic, alive command-center feel
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry({
        confidence: +(97.8 + Math.random() * 1.8).toFixed(1),
        swathWidth: +(44.8 + Math.random() * 0.8).toFixed(1),
        slickArea: +(4.8 + (Math.random() - 0.5) * 0.1).toFixed(2),
      });
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 lg:w-1/2 pointer-events-none select-none overflow-hidden">
      {/* Photorealistic 3D Ocean Background Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-right opacity-35 md:opacity-55 lg:opacity-75 mix-blend-screen"
        style={{
          backgroundImage: "url('/dashboard_hero.jpg')",
          maskImage:
            "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 15%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,1) 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 15%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,1) 100%)",
        }}
      />

      {/* SVG Canvas for Interactive Dynamic Live Animation */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 650 320"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Radar Scanning Beam Gradient */}
          <linearGradient id="radarBeamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#35B8F2" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#00F0FF" stopOpacity="0.45" />
            <stop offset="85%" stopColor="#0B5F91" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.7" />
          </linearGradient>

          {/* Radial Slick Glow */}
          <radialGradient id="slickGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#0088CC" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#071521" stopOpacity="0" />
          </radialGradient>

          {/* Satellite Solar Panel Shimmer */}
          <linearGradient id="panelShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#124A75" />
            <stop offset="50%" stopColor="#258ECC" />
            <stop offset="100%" stopColor="#0B3050" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="neonGlowCyan" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. PULSING RADAR RINGS FROM SPILL EPICENTER */}
        <g transform="translate(360, 225)">
          {/* Ring 1 */}
          <circle
            cx="0"
            cy="0"
            r="18"
            fill="none"
            stroke="#00E5FF"
            strokeWidth="1.5"
            className="animate-sonar-ring-1"
            opacity="0.8"
          />
          {/* Ring 2 */}
          <circle
            cx="0"
            cy="0"
            r="18"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1.5"
            className="animate-sonar-ring-2"
            opacity="0.8"
          />
          {/* Ring 3 */}
          <circle
            cx="0"
            cy="0"
            r="18"
            fill="none"
            stroke="#00F0FF"
            strokeWidth="1.5"
            className="animate-sonar-ring-3"
            opacity="0.8"
          />

          {/* Epicenter Target Crosshair */}
          <ellipse
            cx="0"
            cy="0"
            rx="52"
            ry="24"
            fill="url(#slickGlow)"
            stroke="#00E5FF"
            strokeWidth="1"
            strokeDasharray="4 3"
            className="animate-crosshair-spin"
          />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#00E5FF" strokeWidth="1.5" />
          <line x1="0" y1="-7" x2="0" y2="7" stroke="#00E5FF" strokeWidth="1.5" />
        </g>

        {/* 2. REAL-TIME AI SEGMENTED OIL SLICK POLYGON WITH MARCHING-ANTS BORDER */}
        <g>
          {/* Projected Slick Surface */}
          <path
            d="M 280,225 C 295,208 330,202 360,206 C 395,210 435,200 455,215 C 475,230 460,248 430,254 C 395,260 375,248 340,252 C 305,256 270,242 280,225 Z"
            fill="#061826"
            fillOpacity="0.6"
          />

          {/* Animated Flowing Contour Boundary (Live AI Segmentation) */}
          <path
            d="M 280,225 C 295,208 330,202 360,206 C 395,210 435,200 455,215 C 475,230 460,248 430,254 C 395,260 375,248 340,252 C 305,256 270,242 280,225 Z"
            fill="none"
            stroke="#00F0FF"
            strokeWidth="2.2"
            strokeDasharray="8 5"
            filter="url(#neonGlowCyan)"
            className="animate-marching-contour"
          />

          {/* Polygon Detection Anchor Vertices */}
          <circle cx="280" cy="225" r="3" fill="#FFF" stroke="#00F0FF" strokeWidth="1.5" className="animate-ping-slow" />
          <circle cx="360" cy="206" r="3" fill="#FFF" stroke="#00F0FF" strokeWidth="1.5" />
          <circle cx="455" cy="215" r="3" fill="#FFF" stroke="#00F0FF" strokeWidth="1.5" className="animate-ping-slow" />
          <circle cx="430" cy="254" r="3" fill="#FFF" stroke="#00F0FF" strokeWidth="1.5" />
          <circle cx="340" cy="252" r="3" fill="#FFF" stroke="#00F0FF" strokeWidth="1.5" />
        </g>

        {/* 3. DYNAMIC SWEEPING RADAR BEAM CONE (PROJECTED FROM SATELLITE TO OCEAN) */}
        <g className="animate-radar-sweep-beam origin-[175px_65px]">
          {/* Volumetric Beam Polygon */}
          <polygon
            points="175,65 315,225 410,225"
            fill="url(#radarBeamGradient)"
            className="animate-beam-opacity"
          />

          {/* Radar Scan Rays */}
          <line
            x1="175"
            y1="65"
            x2="315"
            y2="225"
            stroke="#00F0FF"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.85"
            filter="url(#softGlow)"
          />
          <line
            x1="175"
            y1="65"
            x2="410"
            y2="225"
            stroke="#00F0FF"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.85"
            filter="url(#softGlow)"
          />

          {/* Radar Scan Grid Cross-Arcs */}
          <path
            d="M 220,118 Q 240,123 260,118"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.7"
          />
          <path
            d="M 265,168 Q 295,175 325,168"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity="0.7"
          />
        </g>

        {/* 4. HIGH-TECH ORBITING SAR SATELLITE (BOBBING & HOVERING) */}
        <g className="animate-satellite-float origin-[175px_65px]">
          {/* Satellite Shadow / Aura */}
          <circle cx="175" cy="65" r="22" fill="#00F0FF" opacity="0.18" filter="url(#neonGlowCyan)" />

          {/* Solar Panel Wing - Left */}
          <g transform="translate(112, 45) rotate(-18)">
            <rect
              x="0"
              y="0"
              width="44"
              height="22"
              rx="2.5"
              fill="url(#panelShimmer)"
              stroke="#67D0FF"
              strokeWidth="1"
            />
            {/* Solar Cell Grid Lines */}
            <line x1="11" y1="0" x2="11" y2="22" stroke="#4DB8E8" strokeWidth="0.5" opacity="0.7" />
            <line x1="22" y1="0" x2="22" y2="22" stroke="#4DB8E8" strokeWidth="0.5" opacity="0.7" />
            <line x1="33" y1="0" x2="33" y2="22" stroke="#4DB8E8" strokeWidth="0.5" opacity="0.7" />
            <line x1="0" y1="11" x2="44" y2="11" stroke="#4DB8E8" strokeWidth="0.5" opacity="0.7" />
          </g>

          {/* Left Wing Strut */}
          <line x1="152" y1="58" x2="166" y2="62" stroke="#A9C1D1" strokeWidth="2.5" />

          {/* Main Satellite Chassis / Core */}
          <rect
            x="166"
            y="52"
            width="20"
            height="26"
            rx="3"
            fill="#D9E8F2"
            stroke="#1268B3"
            strokeWidth="1.5"
          />
          {/* Gold Thermal Foil Accent */}
          <rect x="169" y="55" width="14" height="10" rx="1.5" fill="#F59E0B" opacity="0.85" />
          <rect x="169" y="68" width="14" height="7" rx="1.5" fill="#0F4C81" />

          {/* Right Wing Strut */}
          <line x1="186" y1="62" x2="200" y2="58" stroke="#A9C1D1" strokeWidth="2.5" />

          {/* Solar Panel Wing - Right */}
          <g transform="translate(198, 38) rotate(18)">
            <rect
              x="0"
              y="0"
              width="44"
              height="22"
              rx="2.5"
              fill="url(#panelShimmer)"
              stroke="#67D0FF"
              strokeWidth="1"
            />
            <line x1="11" y1="0" x2="11" y2="22" stroke="#4DB8E8" strokeWidth="0.5" opacity="0.7" />
            <line x1="22" y1="0" x2="22" y2="22" stroke="#4DB8E8" strokeWidth="0.5" opacity="0.7" />
            <line x1="33" y1="0" x2="33" y2="22" stroke="#4DB8E8" strokeWidth="0.5" opacity="0.7" />
            <line x1="0" y1="11" x2="44" y2="11" stroke="#4DB8E8" strokeWidth="0.5" opacity="0.7" />
          </g>

          {/* SAR Parabolic Radar Dish Emitter */}
          <path
            d="M 167,78 Q 176,86 185,78"
            fill="none"
            stroke="#00E5FF"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#neonGlowCyan)"
          />
          <circle cx="176" cy="80" r="3" fill="#00F0FF" className="animate-ping-rapid" />
        </g>

        {/* 5. PATROL / COAST GUARD VESSEL WITH LIVE RADAR PING */}
        <g className="animate-vessel-sway" transform="translate(525, 145)">
          {/* Water Wake Waves */}
          <path
            d="M -35,28 Q -15,32 5,28 Q 25,24 45,28"
            fill="none"
            stroke="#EAF6FF"
            strokeWidth="1.2"
            opacity="0.4"
            className="animate-wake"
          />

          {/* Ship Hull */}
          <path
            d="M -30,22 L 35,22 L 44,14 L -24,14 Z"
            fill="#1E3A52"
            stroke="#4DB8E8"
            strokeWidth="1"
          />
          {/* Superstructure / Cabin */}
          <rect x="-14" y="6" width="28" height="8" rx="1.5" fill="#EAF6FF" />
          <rect x="-6" y="-1" width="12" height="7" rx="1" fill="#D9E8F2" />
          {/* Mast & Mini Radar */}
          <line x1="0" y1="-1" x2="0" y2="-7" stroke="#35B8F2" strokeWidth="1.5" />
          <ellipse
            cx="0"
            cy="-7"
            rx="4"
            ry="1.5"
            fill="#00E5FF"
            className="animate-mini-radar-spin origin-[0px_-7px]"
          />
          {/* Small Navigation Beacon */}
          <circle cx="40" cy="15" r="1.5" fill="#10B981" className="animate-pulse" />
        </g>
      </svg>

      {/* 6. GLASSMORPHIC LIVE TELEMETRY HUD CHIPS */}
      <div className="absolute top-3 right-4 flex flex-col gap-1.5 items-end">
        {/* Real-time Status Badge */}
        <div className="bg-[#071521]/80 backdrop-blur-md border border-[#1B4258] text-[#EAF6FF] px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
          <span className="font-bold text-[#67D0FF]">SAR SWATH:</span>
          <span>{telemetry.swathWidth} km</span>
        </div>

        {/* AI Segmentation Confidence Badge */}
        <div className="bg-[#071521]/80 backdrop-blur-md border border-[#1B4258] text-[#EAF6FF] px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 shadow-lg">
          <ShieldCheck className="w-3 h-3 text-[#10B981]" />
          <span className="text-[#A9C1D1]">CONFIDENCE:</span>
          <span className="font-bold text-[#10B981]">{telemetry.confidence}%</span>
        </div>

        {/* Slick Perimeter Badge */}
        <div className="bg-[#071521]/80 backdrop-blur-md border border-[#1B4258] text-[#EAF6FF] px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 shadow-lg">
          <Activity className="w-3 h-3 text-[#00E5FF]" />
          <span className="text-[#A9C1D1]">AREA:</span>
          <span className="font-bold text-[#00E5FF]">{telemetry.slickArea} km²</span>
        </div>
      </div>

      {/* Embedded High-Performance CSS Animations */}
      <style>{`
        @keyframes satelliteFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(2deg);
          }
        }
        .animate-satellite-float {
          animation: satelliteFloat 6s ease-in-out infinite;
        }

        @keyframes radarSweepBeam {
          0%, 100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(4deg);
          }
        }
        .animate-radar-sweep-beam {
          animation: radarSweepBeam 5s ease-in-out infinite;
        }

        @keyframes beamOpacity {
          0%, 100% {
            opacity: 0.65;
          }
          50% {
            opacity: 0.92;
          }
        }
        .animate-beam-opacity {
          animation: beamOpacity 2.5s ease-in-out infinite;
        }

        @keyframes marchingContour {
          to {
            stroke-dashoffset: -52;
          }
        }
        .animate-marching-contour {
          animation: marchingContour 2.8s linear infinite;
        }

        @keyframes sonarRing1 {
          0% {
            r: 10;
            opacity: 0.9;
            stroke-width: 2;
          }
          100% {
            r: 65;
            opacity: 0;
            stroke-width: 0.5;
          }
        }
        .animate-sonar-ring-1 {
          animation: sonarRing1 3.6s cubic-bezier(0.1, 0.4, 0.8, 1) infinite;
        }

        @keyframes sonarRing2 {
          0% {
            r: 10;
            opacity: 0.9;
            stroke-width: 2;
          }
          100% {
            r: 65;
            opacity: 0;
            stroke-width: 0.5;
          }
        }
        .animate-sonar-ring-2 {
          animation: sonarRing2 3.6s cubic-bezier(0.1, 0.4, 0.8, 1) infinite 1.2s;
        }

        @keyframes sonarRing3 {
          0% {
            r: 10;
            opacity: 0.9;
            stroke-width: 2;
          }
          100% {
            r: 65;
            opacity: 0;
            stroke-width: 0.5;
          }
        }
        .animate-sonar-ring-3 {
          animation: sonarRing3 3.6s cubic-bezier(0.1, 0.4, 0.8, 1) infinite 2.4s;
        }

        @keyframes crosshairSpin {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 28;
          }
        }
        .animate-crosshair-spin {
          animation: crosshairSpin 6s linear infinite;
        }

        @keyframes vesselSway {
          0%, 100% {
            transform: translate(525px, 145px) rotate(0deg);
          }
          50% {
            transform: translate(525px, 143px) rotate(-1deg);
          }
        }
        .animate-vessel-sway {
          animation: vesselSway 4.5s ease-in-out infinite;
        }

        @keyframes wake {
          0%, 100% {
            opacity: 0.25;
            transform: scaleX(0.95);
          }
          50% {
            opacity: 0.6;
            transform: scaleX(1.05);
          }
        }
        .animate-wake {
          animation: wake 2.5s ease-in-out infinite;
        }

        @keyframes pingRapid {
          0% {
            r: 2;
            opacity: 1;
          }
          70%, 100% {
            r: 8;
            opacity: 0;
          }
        }
        .animate-ping-rapid {
          animation: pingRapid 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes pingSlow {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.4);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-ping-slow {
          animation: pingSlow 2s ease-in-out infinite;
        }

        @keyframes miniRadarSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-mini-radar-spin {
          animation: miniRadarSpin 2.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
