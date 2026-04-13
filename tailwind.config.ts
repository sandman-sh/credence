import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--line)",
        primary: "var(--lilac)",
        "primary-hover": "var(--lilac-light)",
        accent: "var(--teal)",
        success: "var(--success)",
        danger: "var(--danger)",
        gold: "var(--gold)",
        muted: "var(--muted)",
        "muted-strong": "var(--muted-strong)",

        cosmic: {
          bg: "var(--background)",
          card: "var(--background-secondary)",
          elevated: "var(--background-elevated)",
          text: "var(--foreground)",
          muted: "var(--muted)",
          lilac: "var(--lilac)",
          "lilac-light": "var(--lilac-light)",
          "lilac-dark": "var(--lilac-dark)",
          teal: "var(--teal)",
          "teal-light": "var(--teal-light)",
          success: "var(--success)",
          gold: "var(--gold)",
          border: "var(--line)",
          "border-accent": "var(--line-accent)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, var(--lilac-dark), var(--lilac))",
        "teal-gradient": "linear-gradient(135deg, var(--teal-dark), var(--teal))",
        "brand-gradient": "linear-gradient(135deg, var(--lilac-light) 0%, var(--teal) 100%)",
      },
      boxShadow: {
        "glow-lilac": "0 0 32px rgba(167, 139, 250, 0.35)",
        "glow-lilac-strong": "0 0 56px rgba(167, 139, 250, 0.5)",
        "glow-teal": "0 0 32px rgba(34, 211, 238, 0.3)",
        card: "0 4px 24px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.4)",
        elevated: "0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(167,139,250,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(167,139,250,0.6)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "slide-up": "slide-up 0.4s ease forwards",
      },
    },
  },
};

export default config;
