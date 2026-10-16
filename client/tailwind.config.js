/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cinematic: {
          950: '#07090e',
          900: '#0c0f17',
          850: '#111522',
          800: '#171c2d',
          700: '#222941',
          600: '#323c5d',
        },
        brand: {
          primary: '#6366f1',
          accent: '#8b5cf6',
          cyan: '#06b6d4',
          rose: '#f43f5e',
          amber: '#f59e0b',
          emerald: '#10b981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        floatUp: {
          '0%': { transform: 'translateY(0) scale(0.8)', opacity: '1' },
          '100%': { transform: 'translateY(-120px) scale(1.3)', opacity: '0' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' }
        }
      },
      animation: {
        'float-up': 'floatUp 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
