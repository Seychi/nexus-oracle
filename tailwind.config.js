/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        lol: {
          bg:      '#070810',
          dark:    '#0a0c16',
          card:    '#12141e',
          card2:   '#1a1c2a',
          gold:    '#c8a84b',
          'gold-dim': '#8a7030',
          ally:    '#4d8fe0',
          enemy:   '#e04d5f',
          green:   '#4dba87',
          orange:  '#e08530',
          purple:  '#9b6de0',
          text:    '#dde0f0',
          dim:     '#6870a0',
          border:  'rgba(255,255,255,0.08)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':  'spin 1.2s linear infinite',
      },
    },
  },
  plugins: [],
};
