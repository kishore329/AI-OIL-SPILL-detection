/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ocean-inspired brand palette
        ocean: {
          50:  "#e6f4ff",
          100: "#b3dcff",
          200: "#80c4ff",
          300: "#4dacff",
          400: "#1a94ff",
          500: "#0077e6",
          600: "#005cb3",
          700: "#004180",
          800: "#00264d",
          900: "#000b1a",
        },
        spill: {
          50:  "#fff8e6",
          100: "#ffeab3",
          200: "#ffdc80",
          300: "#ffce4d",
          400: "#ffbf1a",
          500: "#e6a600",
          600: "#b38100",
          700: "#805c00",
          800: "#4d3700",
          900: "#1a1200",
        },
        danger: {
          400: "#ff4d4d",
          500: "#e60000",
          600: "#b30000",
        },
        success: {
          400: "#4dff91",
          500: "#00cc5a",
          600: "#009942",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "ocean-gradient": "linear-gradient(135deg, #000b1a 0%, #00264d 50%, #004180 100%)",
        "spill-gradient": "linear-gradient(135deg, #e6a600 0%, #ff4d4d 100%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      boxShadow: {
        "glass": "0 8px 32px rgba(0, 119, 230, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
        "glow-blue": "0 0 20px rgba(26, 148, 255, 0.4)",
        "glow-orange": "0 0 20px rgba(255, 191, 26, 0.4)",
      },
    },
  },
  plugins: [],
}
