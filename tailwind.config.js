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
        'neo': '4px 4px 0px #000',
        'neo-sm': '2px 2px 0px #000',
        'neo-lg': '6px 6px 0px #000',
        'neo-xl': '8px 8px 0px #000',
      },
      borderRadius: {
        DEFAULT: '0px',
        'none': '0px',
        'sm': '0.125rem', // Keep some small radius options if needed, but default is 0
      },
      borderWidth: {
        DEFAULT: '1px',
        '2': '2px',
        '3': '3px',
        '4': '4px',
      },
      translate: {
        'box': '4px',
      }
    },
  },
  plugins: [],
}
