import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          turquesa: "#31B498",
          turquesaInk: "#0F5E4E",
          turquesaSoft: "#E0F5F0",
          violeta: "#C7B5F3",
          violetaInk: "#4A378E",
          violetaSoft: "#EEEDFE",
          lima: "#DBFA45",
          limaInk: "#4A5A00",
          limaSoft: "#F4FBD3",
        },
      },
    },
  },
  plugins: [],
};
export default config;
