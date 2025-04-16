/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // These colors come built-in with Tailwind CSS v4
        gray: {},
        blue: {},
        green: {},
        red: {},
        yellow: {}
      }
    },
  },
  plugins: []
}