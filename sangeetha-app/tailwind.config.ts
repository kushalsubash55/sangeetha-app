import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F7F1E8",
        ink: "#1F2937",
        brand: "#0F766E",
        sand: "#E7D8C9",
        accent: "#F59E0B",
      },
    },
  },
  plugins: [],
};

export default config;
