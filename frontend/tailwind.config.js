/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Iris" — a refined indigo/violet accent used as the single brand hue
        // across light and dark themes.
        brand: {
          50: '#F5F4FF',
          100: '#ECEAFF',
          200: '#DBD6FE',
          300: '#BFB6FD',
          400: '#9C8DFA',
          500: '#7C6DF2',
          600: '#6650E0',
          700: '#5440C0',
          800: '#43359C',
          900: '#372D7D',
          950: '#241D54',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        card: '0 2px 10px -2px rgb(15 23 42 / 0.08), 0 6px 20px -6px rgb(15 23 42 / 0.08)',
        'card-hover': '0 10px 30px -8px rgb(15 23 42 / 0.16), 0 4px 10px -4px rgb(15 23 42 / 0.08)',
        glow: '0 0 0 1px rgb(124 109 242 / 0.16), 0 12px 30px -10px rgb(124 109 242 / 0.45)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        'pulse-ring': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6650E0 0%, #7C6DF2 50%, #A78BFA 100%)',
      },
    },
  },
  plugins: [],
}
