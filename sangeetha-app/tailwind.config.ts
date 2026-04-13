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
        cream: "#F4FAFF",
        ink: "#16324F",
        brand: "#0C6FD0",
        sand: "#D7E8F8",
        accent: "#24A4F4",
      },
    },
  },
  plugins: [],
};

export default config;
