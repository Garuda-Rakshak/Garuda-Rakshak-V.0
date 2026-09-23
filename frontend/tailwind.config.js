/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gcs: {
          bg: '#080C14',
          surface: '#0D131F',
          panel: '#0E1420',
          card: '#141C2B',
          cardHover: '#1A2538',
          border: '#1E293B',
          borderLight: '#334155',
          borderHover: '#10B981',
          text: '#F8FAFC',
          muted: '#94A3B8',
          subtext: '#64748B',
          green: '#10B981',
          greenLight: 'rgba(16, 185, 129, 0.15)',
          orange: '#F97316',
          orangeLight: 'rgba(249, 115, 22, 0.15)',
          blue: '#38BDF8',
          cyan: '#06B6D4',
          red: '#EF4444',
          redLight: 'rgba(239, 68, 68, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        tactical: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'gcs-soft': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.3)',
        'gcs-card': '0 4px 16px -2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'gcs-hover': '0 8px 24px -4px rgba(0, 0, 0, 0.6), 0 0 12px rgba(16, 185, 129, 0.2)',
        'gcs-glow': '0 0 20px -2px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}
