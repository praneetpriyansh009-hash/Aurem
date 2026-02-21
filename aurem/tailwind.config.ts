import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                display: ["Outfit", "system-ui", "sans-serif"],
            },
            colors: {
                aurem: {
                    50: "#fff7ed",
                    100: "#ffedd5",
                    200: "#fed7aa",
                    300: "#fdba74",
                    400: "#fb923c",
                    500: "#f97316",
                    600: "#ea580c",
                    700: "#c2410c",
                    800: "#9a3412",
                    900: "#7c2d12",
                    950: "#431407",
                },
                midnight: {
                    50: "#f8fafc",
                    100: "#f1f5f9",
                    200: "#e2e8f0",
                    300: "#cbd5e1",
                    400: "#94a3b8",
                    500: "#64748b",
                    600: "#475569",
                    700: "#334155",
                    800: "#1e293b",
                    850: "#162032",
                    900: "#0f172a",
                    950: "#020617",
                },
                glass: {
                    light: "rgba(255, 255, 255, 0.08)",
                    medium: "rgba(255, 255, 255, 0.12)",
                    heavy: "rgba(255, 255, 255, 0.18)",
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "aurem-gradient":
                    "linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)",
                "aurem-gradient-subtle":
                    "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(236,72,153,0.1) 50%, rgba(139,92,246,0.15) 100%)",
                "glass-gradient":
                    "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
            },
            boxShadow: {
                glass: "0 8px 32px 0 rgba(0, 0, 0, 0.12)",
                "glass-lg": "0 16px 48px 0 rgba(0, 0, 0, 0.2)",
                glow: "0 0 20px rgba(249, 115, 22, 0.3)",
                "glow-lg": "0 0 40px rgba(249, 115, 22, 0.4)",
                "inner-glow": "inset 0 1px 1px rgba(255, 255, 255, 0.1)",
            },
            borderRadius: {
                "2xl": "1rem",
                "3xl": "1.5rem",
                "4xl": "2rem",
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-out",
                "fade-up": "fadeUp 0.6s ease-out",
                "slide-in-left": "slideInLeft 0.4s ease-out",
                "slide-in-right": "slideInRight 0.4s ease-out",
                "scale-in": "scaleIn 0.3s ease-out",
                pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                shimmer: "shimmer 2s linear infinite",
                float: "float 6s ease-in-out infinite",
                glow: "glow 2s ease-in-out infinite alternate",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                fadeUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideInLeft: {
                    "0%": { opacity: "0", transform: "translateX(-20px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                slideInRight: {
                    "0%": { opacity: "0", transform: "translateX(20px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                scaleIn: {
                    "0%": { opacity: "0", transform: "scale(0.95)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                glow: {
                    "0%": { boxShadow: "0 0 5px rgba(249, 115, 22, 0.2)" },
                    "100%": { boxShadow: "0 0 20px rgba(249, 115, 22, 0.6)" },
                },
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};

export default config;
