/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15171c',
        paper: '#faf7f2',
        sand: '#f0e9dd',
        clay: '#c9603f',
        sea: '#2f6f70',
        sky: '#3d7fc1',
        moss: '#5c7a4a',
        plum: '#7a4a6e',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(21,23,28,.05), 0 8px 24px -12px rgba(21,23,28,.18)',
      },
    },
  },
  plugins: [],
};
