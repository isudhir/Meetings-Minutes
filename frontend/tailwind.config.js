/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm neutral "ink" — the whole UI is built on this single grey ramp
        // (text, surfaces, hairlines) so nothing fights the one accent.
        ink: {
          50: '#F7F6F3',
          100: '#ECEBE6',
          200: '#DEDCD5',
          300: '#C3C0B8',
          400: '#9A968D',
          500: '#6E6B63',
          600: '#54514B',
          700: '#3C3A35',
          800: '#282723',
          900: '#1A1917',
          950: '#100F0E',
        },
        // Emerald accent — used only for functional highlights (links, focus,
        // "done" states, positive sentiment), never as decoration.
        accent: {
          50: '#EAF7F1',
          100: '#CCEBDD',
          200: '#9FD9C0',
          300: '#66C29E',
          400: '#2FA97E',
          500: '#0E9366',
          600: '#0B7A55',
          700: '#0A6146',
          800: '#0A4E3A',
          900: '#083C2E',
          950: '#04241C',
        },
        paper: '#F8F7F4',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'ui-serif', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(16 15 14 / 0.05)',
        card: '0 1px 2px 0 rgb(16 15 14 / 0.04), 0 8px 24px -16px rgb(16 15 14 / 0.14)',
        lift: '0 2px 4px 0 rgb(16 15 14 / 0.05), 0 14px 32px -14px rgb(16 15 14 / 0.18)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(260%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
