import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        tradealo: {
          bg: '#EFEFEF',
          card: '#FFFFFF',
          text: '#333333',
          'text-muted': '#64748B',
          primary: '#4F46E5',
          'primary-hover': '#4338CA',
          'primary-light': '#E0E7FF',
          border: '#E2E8F0',
          'footer-bg': '#222222',
          'footer-text': '#CCCCCC',
          whatsapp: '#25D366',
          error: '#DC2626',
          warning: '#F59E0B',
          success: '#16A34A',
        },
      },
      fontFamily: {
        heading: ['var(--font-rubik)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1440px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 3px 0 rgba(0,0,0,0.06)',
        'card-hover':
          '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.05)',
      },
      animation: {
        'pulse-soft': 'pulse 1.6s ease-in-out infinite',
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
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
      },
    },
  },
  plugins: [],
};

export default config;
