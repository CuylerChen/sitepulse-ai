import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0E8F6E",
        accent: "#0E8F6E",
        success: "#0E8F6E",
        warning: "#B45309",
        error: "#DC2626",
        page: "#F7F8FA",
        ink: "#16181D",
        muted: "#5E6772",
        navy: "#FFFFFF",
        card: "#FFFFFF",
        line: "#E3E6EB",
      },
      borderRadius: {
        card: "4px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "none",
      },
    },
  },
  plugins: [],
};

export default config;
