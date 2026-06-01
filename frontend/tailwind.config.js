/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       'var(--bg)',
        surface:  'var(--surface)',
        surface2: 'var(--surface2)',
        border:   'var(--border)',
        border2:  'var(--border2)',
        muted:    'var(--muted)',
        text:     'var(--text)',

        green:  'var(--sig-green)',
        red:    'var(--sig-red)',
        orange: 'var(--sig-orange)',
        purple: 'var(--sig-purple)',
        blue:   'var(--sig-blue)',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono:    ['Space Mono', 'monospace'],
        body:    ['DM Sans', 'sans-serif'],
      },
      animation: {
        'fade-up':   'fadeUp 0.5s ease forwards',
        'fade-in':   'fadeIn 0.4s ease forwards',
        'count-up':  'countUp 1s ease forwards',
      },
      keyframes: {
        fadeUp:  { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
      },
    },
  },
  plugins: [],
}
