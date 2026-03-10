import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0b1020",
        card: "#131a2d",
        accent: "#1ea672",
        muted: "#91a0c0",
      },
      boxShadow: {
        card: "0 10px 30px rgba(0, 0, 0, 0.25)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
