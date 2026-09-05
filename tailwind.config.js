import { COLORS } from './src/theme.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        // Below this the header keeps the logo mark but drops the wordmark.
        xs: '420px',
      },
      // Defined in src/theme.js so charts and SVG share one palette.
      colors: COLORS,
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,38,44,.05), 0 8px 24px -12px rgba(16,38,44,.20)',
      },
    },
  },
  plugins: [],
};
