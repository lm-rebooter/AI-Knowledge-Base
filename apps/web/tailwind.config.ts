import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f8ff",
          500: "#2575fc",
          700: "#1447b2"
        }
      }
    }
  },
  plugins: []
};

export default config;
