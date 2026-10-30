/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        corporate: {
          green: "#6BBE45",
          blue: "#1E3A8A",
          dark: "#1F2937",
        },
      },
      boxShadow: {
        soft: "0 2px 12px rgba(15, 23, 42, 0.045)",
      },
    },
  },
  plugins: [],
};
