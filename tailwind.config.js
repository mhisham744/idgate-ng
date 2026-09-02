/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutral surface/ink scale — remapped to CSS vars so it flips in dark mode.
        white: 'rgb(var(--c-white) / <alpha-value>)',
        // A fixed pure-white for text/overlays that sit on colored (brand) surfaces
        // and must stay light in both themes.
        light: '#ffffff',
        slate: {
          50: 'rgb(var(--c-slate-50) / <alpha-value>)',
          100: 'rgb(var(--c-slate-100) / <alpha-value>)',
          200: 'rgb(var(--c-slate-200) / <alpha-value>)',
          300: 'rgb(var(--c-slate-300) / <alpha-value>)',
          400: 'rgb(var(--c-slate-400) / <alpha-value>)',
          500: 'rgb(var(--c-slate-500) / <alpha-value>)',
          600: 'rgb(var(--c-slate-600) / <alpha-value>)',
          700: 'rgb(var(--c-slate-700) / <alpha-value>)',
          800: 'rgb(var(--c-slate-800) / <alpha-value>)',
          900: 'rgb(var(--c-slate-900) / <alpha-value>)',
          950: 'rgb(var(--c-slate-950) / <alpha-value>)',
        },
        // IDGate brand — deep "identity" indigo. Var-remapped so brand text/tints
        // stay legible on dark surfaces (filled brand surfaces brighten slightly).
        gate: {
          50: 'rgb(var(--c-gate-50) / <alpha-value>)',
          100: 'rgb(var(--c-gate-100) / <alpha-value>)',
          200: 'rgb(var(--c-gate-200) / <alpha-value>)',
          300: 'rgb(var(--c-gate-300) / <alpha-value>)',
          400: 'rgb(var(--c-gate-400) / <alpha-value>)',
          500: 'rgb(var(--c-gate-500) / <alpha-value>)',
          600: 'rgb(var(--c-gate-600) / <alpha-value>)',
          700: 'rgb(var(--c-gate-700) / <alpha-value>)',
          800: 'rgb(var(--c-gate-800) / <alpha-value>)',
          900: 'rgb(var(--c-gate-900) / <alpha-value>)',
          950: 'rgb(var(--c-gate-950) / <alpha-value>)',
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
