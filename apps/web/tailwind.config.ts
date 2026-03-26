import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'lol-dark': '#0a0e14',
        'lol-card': '#141a24',
        'lol-gold': '#c8aa6e',
        'lol-blue': '#0ac8b9',
        'lol-text': '#e0ddd5',
        'lol-dim': '#6b7280',
        'tier-s-plus': '#ff4444',
        'tier-s': '#ff8c00',
        'tier-a': '#3b82f6',
        'tier-b': '#22c55e',
        'tier-c': '#6b7280',
      },
      fontFamily: {
        sans: [
          'Inter',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
