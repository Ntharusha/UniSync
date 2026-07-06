/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'vau-maroon': '#8B1A3B',
        'vau-gold': '#D4A017',
        primary: {
          DEFAULT: '#8B1A3B',
          light: '#A8294E',
          dark: '#6B1230',
        },
        gold: {
          DEFAULT: '#D4A017',
          light: '#E8B520',
        },
      },
      fontFamily: {
        sans: ['System'],
        bold: ['System'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
};
