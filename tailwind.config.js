/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        'brand-primary': '#007bff', // Example primary color
        'brand-secondary': '#6c757d', // Example secondary color
        'dark-bg': '#111827',      // Dark mode background
        'dark-card': '#1f2937',    // Dark mode card background
        'dark-text': '#f3f4f6',    // Dark mode primary text
        'dark-text-secondary': '#9ca3af', // Dark mode secondary text
        'light-bg': '#f9fafb',    // Light mode background
        'light-card': '#ffffff',   // Light mode card background
        'light-text': '#1f2937',   // Light mode primary text
        'light-text-secondary': '#6b7280', // Light mode secondary text
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Use Inter as the default sans-serif font
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        spinSlow: {
          'to': { transform: 'rotate(360deg)' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out',
        spinSlow: 'spinSlow 2s linear infinite'
      }
    },
  },
  plugins: [],
}