/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // IDGate brand — deep "identity" indigo/teal system
        gate: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd3ff',
          300: '#8eb6ff',
          400: '#598dff',
          500: '#3563f0',
          600: '#2447d6',
          700: '#1f39ad',
          800: '#203488',
          900: '#20326c',
          950: '#151f42',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Cairo', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        phone: '0 40px 80px -20px rgba(21,31,66,0.45), 0 0 0 1px rgba(255,255,255,0.05)',
        card: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px -4px rgba(16,24,40,0.10)',
        'card-hover': '0 2px 4px rgba(16,24,40,0.05), 0 12px 28px -8px rgba(16,24,40,0.16)',
      },
      keyframes: {
        'slide-up': { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'scale-in': { '0%': { transform: 'scale(0.96)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
}
