import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#f5f5f0',
        'ink-black': '#1a1a1a',
        'ink-green': '#2d4a3e',
        'border-gray': '#e0e0d8',
        'mid-gray': '#888880',
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'Georgia', 'serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-up': 'slide-up 0.35s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'dots-1': 'dots 1.4s ease-in-out 0s infinite',
        'dots-2': 'dots 1.4s ease-in-out 0.2s infinite',
        'dots-3': 'dots 1.4s ease-in-out 0.4s infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        dots: {
          '0%, 80%, 100%': { opacity: '0.2', transform: 'translateY(0)' },
          '40%': { opacity: '1', transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
