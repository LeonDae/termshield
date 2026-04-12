import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        surface: {
          DEFAULT: "var(--surface)",
          dim: "var(--surface-dim)",
          bright: "var(--surface-bright)",
          variant: "var(--surface-variant)",
          container: {
            DEFAULT: "var(--surface-container)",
            lowest: "var(--surface-container-lowest)",
            low: "var(--surface-container-low)",
            high: "var(--surface-container-high)",
            highest: "var(--surface-container-highest)",
          },
        },
        primary: {
          DEFAULT: "var(--primary)",
          container: "var(--primary-container)",
          fixed: "var(--primary-fixed)",
          "fixed-dim": "var(--primary-fixed-dim)",
        },
        "on-primary": {
          DEFAULT: "var(--on-primary)",
          container: "var(--on-primary-container)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          container: "var(--secondary-container)",
        },
        "on-secondary": {
          DEFAULT: "var(--on-secondary)",
          container: "var(--on-secondary-container)",
        },
        tertiary: {
          DEFAULT: "var(--tertiary)",
          container: "var(--tertiary-container)",
        },
        "on-surface": {
          DEFAULT: "var(--on-surface)",
          variant: "var(--on-surface-variant)",
        },
        "on-background": "var(--on-background)",
        outline: {
          DEFAULT: "var(--outline)",
          variant: "var(--outline-variant)",
        },
        error: {
          DEFAULT: "var(--error)",
          container: "var(--error-container)",
        },
        "on-error": "var(--on-error)",
        "surface-tint": "var(--surface-tint)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        glass: "0 20px 60px rgba(0, 0, 0, 0.25)",
        "glass-hover": "0 25px 70px rgba(0, 0, 0, 0.3), 0 0 40px rgba(78, 222, 163, 0.04)",
        "glow-primary": "0 0 20px rgba(78, 222, 163, 0.15), 0 0 60px rgba(78, 222, 163, 0.05)",
        "glow-strong": "0 0 30px rgba(78, 222, 163, 0.25), 0 0 80px rgba(78, 222, 163, 0.1)",
        ambient: "0 20px 40px rgba(16, 19, 32, 0.06)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "fade-in-scale": "fadeInScale 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-in-left": "slideInLeft 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-in-right": "slideInRight 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "spin-glow": "spinGlow 1s linear infinite",
        "gradient-shift": "gradientShift 15s ease-in-out infinite alternate",
      },
      backdropBlur: {
        xs: "2px",
        "2xl": "24px",
        "3xl": "40px",
      },
    },
  },
  plugins: [],
};

export default config;
