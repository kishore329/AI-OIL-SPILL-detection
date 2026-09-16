/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Maritime Design Tokens
        darkBg: {
          base:      "#071521",
          secondary: "#0A1D2B",
          card:      "#0D2536",
          elevated:  "#102D40",
          hover:     "#123349",
          header:    "#081B2A",
          sidebar:   "#081B2A",
        },
        darkBorder: {
          default: "#1B4258",
          subtle:  "#15364A",
          active:  "#247AA5",
        },
        darkText: {
          primary:   "#EAF6FF",
          secondary: "#A9C1D1",
          muted:     "#718B9B",
        },
        darkBlue: {
          primary: "#168DCC",
          bright:  "#35B8F2",
          sky:     "#67D0FF",
          deep:    "#0B5F91",
        },
        // Global Maritime Design Tokens
        maritime: {
          deep:    "#0B3A66", // Deep Navy
          dark:    "#0F4C81", // Dark Blue
          primary: "#1268B3", // Primary Blue
          ocean:   "#168DCC", // Ocean Blue
          sky:     "#4DB8E8", // Sky Blue
          light:   "#DDF3FF", // Light Blue
          surface: "#F3FAFE", // Very Light Blue
          bg:      "#F4F9FD", // Background Canvas
        },
        // Ocean blue scale (aligned with Maritime Blue theme)
        ocean: {
          50:  "#F3FAFE",
          100: "#DDF3FF",
          200: "#BAE6FD",
          300: "#4DB8E8",
          400: "#168DCC",
          500: "#1268B3",
          600: "#0F4C81",
          700: "#0B3A66",
          800: "#082949",
          900: "#051A30",
          950: "#030E1C",
        },
        // Supporting neutral typography & borders
        appText: {
          main:      "#17324D",
          secondary: "#5E7183",
          muted:     "#8A9AA8",
        },
        appBorder: {
          subtle: "#D9E8F2",
          light:  "#EAF3F8",
        },
        // High contrast semantic status indicators
        status: {
          critical: {
            bg:     "#FFF1F2",
            border: "#F5B5BC",
            text:   "#C6283D",
          },
          moderate: {
            bg:     "#FFF8E8",
            border: "#F3D58A",
            text:   "#A86A00",
          },
          success: {
            bg:     "#EAF8F4",
            border: "#9ADBC8",
            text:   "#087F68",
          },
          info: {
            bg:     "#EAF6FF",
            border: "#A9D9F5",
            text:   "#1268B3",
          },
        },
        // Spill & alert accents
        spill: {
          50:  "#fff8e8",
          100: "#ffefc2",
          200: "#ffe08f",
          300: "#f3d58a",
          400: "#d99516",
          500: "#a86a00",
          600: "#8c5600",
          700: "#704400",
          800: "#543300",
          900: "#382200",
        },
        danger: {
          400: "#f5b5bc",
          500: "#c6283d",
          600: "#a51d30",
        },
        success: {
          400: "#9adbc8",
          500: "#087f68",
          600: "#066250",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "ocean-gradient": "linear-gradient(135deg, #0B3A66 0%, #0F4C81 50%, #1268B3 100%)",
        "ocean-soft": "linear-gradient(135deg, #F3FAFE 0%, #EAF6FF 100%)",
        "spill-gradient": "linear-gradient(135deg, #a86a00 0%, #c6283d 100%)",
      },
      animation: {
        "pulse-slow": "gentlePulse 2.5s ease-in-out infinite",
        "pulse-gentle": "gentlePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeInUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in": "slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        gentlePulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.08)" },
        },
      },
      boxShadow: {
        "card": "0 4px 18px rgba(11, 58, 102, 0.06)",
        "card-hover": "0 8px 24px rgba(11, 58, 102, 0.12)",
        "glass": "0 4px 18px rgba(11, 58, 102, 0.06)",
        "glow-blue": "0 0 14px rgba(18, 104, 179, 0.35)",
        "glow-green": "0 0 14px rgba(8, 127, 104, 0.35)",
      },
    },
  },
  plugins: [],
}
