/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2F6',
          100: '#D0E0EC',
          500: '#1E3A8A', // Classic navy
          600: '#172554',
        }
      }
    },
  },
  plugins: [],
};

