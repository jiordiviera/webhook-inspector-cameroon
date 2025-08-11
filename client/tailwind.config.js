/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        genuka: {
          primary: '#1f2937',
          secondary: '#374151',
          accent: '#3b82f6'
        },
        cameroon: {
          green: '#228B22',
          red: '#DC143C',
          yellow: '#FFD700'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      }
    },
  },
}