/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./pages/**/*.{ts,tsx,js,jsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      keyframes: {
        "slide-right": {
          "0%": { transform: "translateX(-100%)" }, // Start completely off-screen to the left
          "100%": { transform: "translateX(0)" }, // End at its natural position
        },
      },
      animation: {
        "slide-right": "slide-right 0.5s ease-out forwards",
      },
      colors: {
        // light theme
        brand: {
          50: "#E8F8F3",
          100: "#D7F1E7",
          200: "#AEE6CE",
          300: "#85DBB4",
          400: "#63CFA2",
          500: "#5DBA9D",
          600: "#4EA989",
          700: "#3E8E6F",
        },
        text: {
          900: "#3D4849",
          600: "#6B7574",
          400: "#98A4A3",
        },
        pos: { 500: "#68A6E3" },
        neg: { 500: "#E88D83" },

        // dark theme
        darkbg: "#1A1D28",
        darkbrand: "#8A9BFF",
        darktext: "#D0D4E4",
        darkpos: "#78DCC0",
        darkneg: "#FFC97B",
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
      },
      boxShadow: {
        soft: "0 6px 18px rgba(15, 23, 42, 0.06)",
        elevated: "0 10px 30px rgba(20, 20, 40, 0.12)",
      },
    },
  },
  plugins: [],
};
