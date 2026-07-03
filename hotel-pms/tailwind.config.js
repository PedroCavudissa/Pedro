/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        gold: {
          50:  '#fdf9ee',
          100: '#faf0d0',
          200: '#f4de9a',
          300: '#edc75e',
          400: '#e5b030',
          500: '#d49620',
          600: '#b97518',
          700: '#935518',
          800: '#78431a',
          900: '#643818',
          950: '#391d09',
        },
        stone: {
          50:  '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
      },
      boxShadow: {
        'luxury': '0 4px 24px -2px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.08)',
        'luxury-lg': '0 12px 48px -4px rgba(0,0,0,0.18), 0 4px 16px -4px rgba(0,0,0,0.1)',
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
