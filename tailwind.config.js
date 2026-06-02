/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#f97316', dark: '#ea6c0a' },
      },
    },
  },
  plugins: [],
}

