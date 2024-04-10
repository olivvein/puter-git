/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      backgroundColor: {
        dark: "#111827",
        light: "#d4d4d4",
      },
      textColor: {
        light: "#d4d4d4",
        dark: "#111827",
      },
      borderColor: {
        light: "#d4d4d4",
        dark: "#111827",
      },
      animation: {
        fade: "fadeOut 5s ease-in-out",
        appear: "fadeIn 0.5s ease-in-out",
      },
      // that is actual animation
      keyframes: (theme) => ({
        fadeOut: {
          "0%": { opacity: "100%" },
          "100%": { opacity: "0%" },
        },
        fadeIn: {
          "0%": { opacity: "0%" },
          "100%": { opacity: "100%" },
        },
      }),
    },
  },
  plugins: [],
}

