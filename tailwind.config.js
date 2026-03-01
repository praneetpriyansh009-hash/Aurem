/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Jost', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                serif: ['"Cormorant Garamond"', 'ui-serif', 'Georgia', 'serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            colors: {
                // Premium Warm Light Mode (Luminary)
                warm: {
                    500: '#9E8E7E',  // Mid warm
                    600: '#7A6B5D',  // Text secondary
                    700: '#5C4F43',  // Text primary
                    800: '#3E342C',  // Headings
                    900: '#2A231D',  // Darkest
                },
                // Premium Dark Mode
                midnight: {
                    50: '#E8E6F0',
                    100: '#C5C1D6',
                    200: '#9E98BA',
                    700: '#1A1A2E',  // Cards
                    800: '#12121F',  // Surface
                    900: '#0A0A0F',  // Deep bg
                    950: '#050508',  // Deepest
                },
                // Brand Colors (Gold-centric)
                brand: {
                    primary: '#c9a55a',    // Warm gold
                    secondary: '#e0c07a',  // Light gold
                    accent: '#a89880',     // Bark/muted gold
                    rose: '#F43F5E',       // Rose
                    emerald: '#10B981',    // Emerald
                },
                // Luminary Surfaces
                surface: {
                    DEFAULT: '#141009',
                    2: '#1c1710',
                },
                gold: {
                    DEFAULT: '#c9a55a',
                    light: '#e0c07a',
                    pale: 'rgba(201,165,90,0.12)',
                },
                cream: {
                    DEFAULT: '#f0e8d8',
                },
                // Glass colors
                glass: {
                    light: 'rgba(255, 255, 255, 0.6)',
                    dark: 'rgba(15, 15, 25, 0.6)',
                    border: 'rgba(201, 165, 90, 0.08)',
                },
                // Dynamic theme variables mapped to CSS
                theme: {
                    bg: 'rgba(var(--theme-bg), <alpha-value>)',
                    surface: 'rgba(var(--theme-surface), <alpha-value>)',
                    text: 'rgba(var(--theme-text), <alpha-value>)',
                    muted: 'rgba(var(--theme-muted), <alpha-value>)',
                    primary: 'rgba(var(--theme-primary), <alpha-value>)',
                    secondary: 'rgba(var(--theme-secondary), <alpha-value>)',
                    border: 'rgba(var(--theme-border), <alpha-value>)',
                },
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(201, 165, 90, 0.04)',
                'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
                'glow': '0 0 20px rgba(201, 165, 90, 0.15)',
                'glow-lg': '0 0 40px rgba(201, 165, 90, 0.1)',
                'depth': '0 1px 2px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.12), 0 12px 28px rgba(0,0,0,0.08)',
                'depth-lg': '0 2px 4px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15), 0 24px 48px rgba(0,0,0,0.1)',
                'float': '0 20px 60px rgba(0,0,0,0.3)',
                'inner-glow': 'inset 0 1px 0 rgba(201,165,90,0.08)',
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                'fade-in-down': 'fadeInDown 0.4s ease-out forwards',
                'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'scale-bounce': 'scaleBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                'shimmer': 'shimmer 2s infinite linear',
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'spin-slow': 'spin 8s linear infinite',
                'bounce-soft': 'bounceSoft 1s infinite',
                'wave': 'wave 1.5s ease-in-out infinite',
                'gradient-shift': 'gradientShift 4s ease infinite',
                'enter': 'enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'view-transition': 'viewTransition 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'typing-dot': 'typingDot 1.4s infinite ease-in-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInDown: {
                    '0%': { opacity: '0', transform: 'translateY(-12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                scaleBounce: {
                    '0%': { opacity: '0', transform: 'scale(0.8)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(201,165,90,0.2)' },
                    '50%': { boxShadow: '0 0 25px rgba(201,165,90,0.3)' },
                },
                bounceSoft: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-4px)' },
                },
                wave: {
                    '0%, 100%': { height: '4px' },
                    '50%': { height: '100%' },
                },
                gradientShift: {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                },
                enter: {
                    '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                viewTransition: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                typingDot: {
                    '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
                    '40%': { transform: 'scale(1)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
