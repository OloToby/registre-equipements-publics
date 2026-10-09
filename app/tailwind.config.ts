import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy:  "#253970",
        "brand-blue": "#496DBE",
        gold:  "#F2B134",
        cream: "#ECE2CE",
        sky:   "#C7DDED",
        lilac: "#E3E6F5",
        ink:   "#1B2341",
        muted: "#5A6283",
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "Montserrat", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Geist Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
