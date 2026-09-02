/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        steel: {
          DEFAULT: "#1C1F22",
          light: "#2A2E33",
          lighter: "#3A3F45"
        },
        amber: {
          DEFAULT: "#FFB020",
          dim: "#B87F17"
        },
        hazard: "#D93025",
        safe: "#2E7D4F",
        concrete: "#8B8F94",
        chalk: "#F2F1ED"
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      backgroundImage: {
        "hazard-stripes":
          "repeating-linear-gradient(135deg, #FFB020, #FFB020 12px, #1C1F22 12px, #1C1F22 24px)"
      }
    },
  },
  plugins: [],
}
