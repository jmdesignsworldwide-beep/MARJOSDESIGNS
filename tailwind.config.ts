import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Theme-aware surfaces (driven by CSS vars, alpha-capable) ──
        bg: 'rgb(var(--bg) / <alpha-value>)',
        'bg-elevated': 'rgb(var(--bg-elevated) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-foreground) / <alpha-value>)',

        // ── Brand gold (the signature — constant across themes) ──
        gold: {
          deep: '#C8941E',
          DEFAULT: '#E0A82E',
          mid: '#E0A82E',
          bright: '#F4C740',
        },

        // ── Charcoal (the other brand color) ──
        charcoal: {
          DEFAULT: '#0D0D0D',
          900: '#0A0A0B',
          800: '#1A1A1A',
        },

        // ── Functional STATUS colors (signals, not brand) ──
        status: {
          process: '#3B82F6', // azul — en proceso
          ready: '#22C55E', // verde — lista / éxito
          overdue: '#EF4444', // rojo — vencida / error
          neutral: '#9CA3AF', // gris — entregada / neutral
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient':
          'linear-gradient(135deg, #C8941E 0%, #E0A82E 50%, #F4C740 100%)',
        'gold-gradient-soft':
          'linear-gradient(135deg, rgba(200,148,30,0.15) 0%, rgba(244,199,64,0.15) 100%)',
      },
      boxShadow: {
        'gold-glow': '0 0 0 1px rgba(224,168,46,0.35), 0 8px 30px -8px rgba(224,168,46,0.45)',
        'gold-glow-lg': '0 0 40px -8px rgba(244,199,64,0.5)',
        'layer-light':
          '0 1px 2px rgba(13,13,13,0.04), 0 8px 24px -12px rgba(13,13,13,0.12)',
        'layer-light-lg':
          '0 2px 4px rgba(13,13,13,0.05), 0 20px 48px -16px rgba(13,13,13,0.18)',
        'layer-dark':
          '0 1px 2px rgba(0,0,0,0.4), 0 12px 32px -12px rgba(0,0,0,0.7)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      keyframes: {
        'aurora-1': {
          '0%, 100%': { transform: 'translate(-10%, -10%) scale(1)' },
          '50%': { transform: 'translate(10%, 8%) scale(1.25)' },
        },
        'aurora-2': {
          '0%, 100%': { transform: 'translate(8%, 12%) scale(1.1)' },
          '50%': { transform: 'translate(-8%, -10%) scale(1.3)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 var(--pulse-color)' },
          '70%': { boxShadow: '0 0 0 6px transparent' },
          '100%': { boxShadow: '0 0 0 0 transparent' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'aurora-1': 'aurora-1 18s ease-in-out infinite',
        'aurora-2': 'aurora-2 24s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}

export default config
