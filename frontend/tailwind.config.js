/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mines theme - Green
        mines: {
          primary: '#27ae60',
          secondary: '#2ecc71',
          accent: '#f1c40f',
          danger: '#e74c3c',
          dark: '#0f1419',
          darker: '#0a0e12',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'reveal': 'reveal 0.3s ease-out',
        'explode': 'explode 0.5s ease-out',
        'sparkle': 'sparkle 1s ease-in-out infinite',
      },
      keyframes: {
        reveal: {
          '0%': { transform: 'scale(0.8) rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotateY(0deg)', opacity: '1' },
        },
        explode: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.5' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },
        sparkle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.1)' },
        }
      }
    },
  },
  plugins: [],
}
