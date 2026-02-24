/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'IBM Plex Sans'", "'Segoe UI'", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"]
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};
