/** @type {import('tailwindcss').Config} */

// The neutral `slate` ramp and `surface` resolve through CSS variables (see
// src/index.css) so they can be flipped under `.dark` — every existing
// bg/text/border-slate-* utility adapts with no per-component change.
// `white`, `black` and `primary` stay literal on purpose: they must NOT invert
// (white text on orange buttons, black scrims).
const slate = (n) => `rgb(var(--c-slate-${n}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#f97316', dark: '#ea6c0a' },
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        slate: {
          50: slate(50), 100: slate(100), 200: slate(200), 300: slate(300),
          400: slate(400), 500: slate(500), 600: slate(600), 700: slate(700),
          800: slate(800), 900: slate(900),
        },
      },
    },
  },
  plugins: [],
}

