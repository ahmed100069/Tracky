/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#140d09",
          900: "#24160d",
          800: "#3a2315",
          700: "#5b3620",
          600: "#7f4b26",
          500: "#a16207",
          400: "#d97706",
          300: "#f59e0b",
          200: "#f8d290",
          100: "#fff2d8"
        },
        ink: "#f8f4ef",
        chai: "#d2b48c",
        alert: "#f97316",
        success: "#34d399"
      },
      boxShadow: {
        glow: "0 10px 40px rgba(161, 98, 7, 0.18)"
      },
      fontFamily: {
        display: ["Trebuchet MS", "Verdana", "sans-serif"],
        body: ["Segoe UI", "Tahoma", "sans-serif"]
      }
    }
  },
  plugins: []
};
