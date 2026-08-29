/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens, driven by CSS rgb-channel variables in index.css
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        panel2: 'rgb(var(--c-panel2) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        mute: 'rgb(var(--c-mute) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        brand: 'rgb(var(--c-brand) / <alpha-value>)',
        brand2: 'rgb(var(--c-brand2) / <alpha-value>)',
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
        sky: 'rgb(var(--c-sky) / <alpha-value>)',
        good: 'rgb(var(--c-good) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        bad: 'rgb(var(--c-bad) / <alpha-value>)'
      },
      fontFamily: {
        display: ['Cinzel', 'Times New Roman', 'serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        jp: ['"Shippori Mincho B1"', '"Noto Serif JP"', 'serif'],
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        glow: '0 0 24px rgb(var(--c-brand) / 0.35)',
        'glow-gold': '0 0 24px rgb(var(--c-gold) / 0.30)',
        card: '0 10px 40px -12px rgb(0 0 0 / 0.55)',
        lift: '0 18px 50px -16px rgb(0 0 0 / 0.7)'
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(1200px 640px at 70% -10%, rgb(var(--c-brand) / 0.16), transparent 60%), radial-gradient(900px 520px at 8% 8%, rgb(var(--c-sky) / 0.10), transparent 55%), radial-gradient(1000px 800px at 50% 120%, rgb(var(--c-brand2) / 0.14), transparent 62%)'
      },
      animation: {
        'fade-up': 'fadeUp .5s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fadeIn .4s ease both',
        shimmer: 'shimmer 1.6s linear infinite',
        'spin-slow': 'spin 6s linear infinite',
        caret: 'caret 1.1s steps(1) infinite',
        'float-y': 'floatY 7s ease-in-out infinite'
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' }
        },
        caret: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
        floatY: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }
    }
  },
  plugins: []
};
