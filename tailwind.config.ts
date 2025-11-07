import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Colores premium para agentes
        agent: {
          cleo: {
            primary: "#FF6B6B",
            secondary: "#FF8E8E",
            accent: "#FFE5E5",
            gradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)",
          },
          toby: {
            primary: "#4ECDC4",
            secondary: "#7DDED6",
            accent: "#E8F8F7",
            gradient: "linear-gradient(135deg, #4ECDC4 0%, #7DDED6 100%)",
          },
          ami: {
            primary: "#45B7D1",
            secondary: "#6FC8E2",
            accent: "#E3F4F8",
            gradient: "linear-gradient(135deg, #45B7D1 0%, #6FC8E2 100%)",
          },
          peter: {
            primary: "#96CEB4",
            secondary: "#B8D8C2",
            accent: "#F0F8F2",
            gradient: "linear-gradient(135deg, #96CEB4 0%, #B8D8C2 100%)",
          },
        },
        // Gradientes premium
        gradient: {
          "agent-cleo": "linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)",
          "agent-toby": "linear-gradient(135deg, #4ECDC4 0%, #7DDED6 100%)",
          "agent-ami": "linear-gradient(135deg, #45B7D1 0%, #6FC8E2 100%)",
          "agent-peter": "linear-gradient(135deg, #96CEB4 0%, #B8D8C2 100%)",
          "glass-light": "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
          "glass-dark": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
          "premium-bg": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-in-right": {
          "0%": {
            opacity: "0",
            transform: "translateX(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "scale-in": {
          "0%": {
            opacity: "0",
            transform: "scale(0.95)",
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)",
          },
        },
        "glow": {
          "0%, 100%": {
            boxShadow: "0 0 5px rgba(255, 255, 255, 0.2)",
          },
          "50%": {
            boxShadow: "0 0 20px rgba(255, 255, 255, 0.4)",
          },
        },
        "pulse-agent": {
          "0%, 100%": {
            transform: "scale(1)",
            opacity: "1",
          },
          "50%": {
            transform: "scale(1.05)",
            opacity: "0.8",
          },
        },
        "gradient-x": {
          "0%, 100%": {
            backgroundPosition: "0% 50%",
          },
          "50%": {
            backgroundPosition: "100% 50%",
          },
        },
        "shimmer": {
          "0%": {
            backgroundPosition: "-200% center",
          },
          "100%": {
            backgroundPosition: "200% center",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "glow": "glow 2s ease-in-out infinite",
        "pulse-agent": "pulse-agent 2s ease-in-out infinite",
        "gradient-x": "gradient-x 3s ease infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glass": "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
        "glass-sm": "0 4px 16px 0 rgba(31, 38, 135, 0.2)",
        "agent-cleo": "0 4px 20px rgba(255, 107, 107, 0.3)",
        "agent-toby": "0 4px 20px rgba(78, 205, 196, 0.3)",
        "agent-ami": "0 4px 20px rgba(69, 183, 209, 0.3)",
        "agent-peter": "0 4px 20px rgba(150, 206, 180, 0.3)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
