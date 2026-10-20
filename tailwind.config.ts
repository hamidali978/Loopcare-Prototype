import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#f0f9f2", 100: "#dcf1e0", 200: "#bae3c4", 400: "#4cbb74", 500: "#2f9e55", 600: "#1f8a45", 700: "#176f38", 800: "#14582f", 900: "#0f4426" },
        paper: "#f5f8f5",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "'Times New Roman'", "serif"],
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "'Segoe UI'", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
