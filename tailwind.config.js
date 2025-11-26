/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Your custom theme extensions here
      colors: {
        // Add any custom colors you're using
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        // Legacy neo-brutalist (keep for backward compat)
        'neo': '4px 4px 0px #000',
        'neo-sm': '2px 2px 0px #000',
        'neo-lg': '6px 6px 0px #000',
        'neo-xl': '8px 8px 0px #000',
        // Modern soft shadows
        'soft-xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'soft-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.08)',
        'soft': '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
        'soft-md': '0 6px 16px -4px rgba(0, 0, 0, 0.1)',
        'soft-lg': '0 12px 24px -6px rgba(0, 0, 0, 0.12)',
        'soft-xl': '0 20px 40px -8px rgba(0, 0, 0, 0.15)',
        'soft-2xl': '0 32px 64px -12px rgba(0, 0, 0, 0.2)',
        // Glow effects
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.25)',
        'glow-indigo': '0 0 20px rgba(99, 102, 241, 0.25)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.25)',
        // Inner shadows
        'inner-soft': 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
        // Chat bubble shadows
        'bubble': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'bubble-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        'none': '0px',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      borderWidth: {
        DEFAULT: '1px',
        '2': '2px',
        '3': '3px',
        '4': '4px',
      },
      translate: {
        'box': '4px',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
