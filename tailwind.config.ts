import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50:  "var(--ciq-teal-50)",   // #E7F5EF
          100: "var(--ciq-teal-100)",  // #BDECD8
          200: "#9BDABD",              // no CSS var — hardcoded
          300: "#6CC9A1",              // no CSS var — hardcoded
          400: "var(--ciq-teal-400)",  // #1FC896
          500: "var(--ciq-teal-500)",  // #0A9E78
          600: "var(--ciq-teal-600)",  // #077D5F
          700: "var(--ciq-teal-700)",  // #055C46
          800: "#056A50",              // no CSS var — hardcoded
          900: "#034D3A",              // no CSS var — hardcoded
        },
        navy: {
          100: "var(--ciq-navy-100)",  // #e2ecf6
          200: "var(--ciq-navy-200)",  // #c5d4e8
          600: "var(--ciq-navy-600)",  // #1e3f74
          700: "var(--ciq-navy-700)",  // #152d55
          800: "var(--ciq-navy-800)",  // #0d1f3c
          900: "var(--ciq-navy-900)",  // #071020
        },
        surface: {
          DEFAULT: "#ffffff",
          page: "#fafaf9",
          section: "#f9fafb",
          muted: "#f3f4f6",
        },
        border: {
          DEFAULT: "#e5e7eb",
          subtle: "#f3f4f6",
        },
        content: {
          DEFAULT: "#111827",
          secondary: "#374151",
          tertiary: "#6b7280",
          muted: "#9ca3af",
        },
      },
    },
  },
  plugins: [],
};
export default config;
