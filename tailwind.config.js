/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'primary': ['Inter', 'sans-serif'],
        'heading': ['SF Pro Display', 'Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#3b82f6', // Vibrant Electric Blue
          dark: '#2563eb',    // Deep Royal Blue
          light: '#60a5fa',   // Sky Blue
          glow: 'rgba(59, 130, 246, 0.3)', // Toned down from 0.5
        },
        accent: {
          DEFAULT: '#06b6d4', // Cyan/Neon Blue
          light: '#22d3ee',
          glow: 'rgba(6, 182, 212, 0.3)', // Toned down
        },
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617', // Rich Black/Navy
        },
        bg: {
          primary: '#020617',   // Deepest Navy/Black
          secondary: '#0f172a', // Dark Slate
          tertiary: '#1e293b',  // Lighter Slate
          glass: 'rgba(15, 23, 42, 0.9)', // More solid glass
          'glass-strong': 'rgba(2, 6, 23, 0.95)',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#cbd5e1',
          tertiary: '#94a3b8',
          muted: '#64748b',
        },
        border: {
          primary: 'rgba(148, 163, 184, 0.1)',
          secondary: 'rgba(148, 163, 184, 0.2)',
          accent: 'rgba(59, 130, 246, 0.2)',
          glass: 'rgba(255, 255, 255, 0.05)',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'glow': '0 0 15px rgba(59, 130, 246, 0.15)', // Toned down
        'glow-lg': '0 0 30px rgba(59, 130, 246, 0.1)', // Toned down
        'glow-accent': '0 0 15px rgba(6, 182, 212, 0.15)', // Toned down
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-inset': 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'elevation': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-down': 'slideDown 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', boxShadow: '0 0 15px rgba(59, 130, 246, 0.15)' },
          '50%': { opacity: '1', boxShadow: '0 0 25px rgba(59, 130, 246, 0.25)' },
        },
      },
      backdropBlur: {
        xs: '2px',
        md: '12px',
        lg: '24px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08) 0%, rgba(2, 6, 23, 0) 70%)',
      },
    },
  },
  plugins: [],
}
