import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        croilet: {
          DEFAULT: "#0b3b5a", // dark blue primary
          green: "#0b3b5a", // dark blue (formerly 'green')
          accent: "#39FF14", // neon green (formerly 'accent')
          panel: "#12305B", // cookie popup / panel navy
          darkpanel: "#0E283D", // darker card background
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
