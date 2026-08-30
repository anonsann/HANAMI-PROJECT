/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens, driven by CSS rgb-channel variables in index.css.
        // Vendored ReactBits components are re-tokened onto these by
        // scripts/theme-reactbits.mjs.
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
        // VNDB.org ships no webfonts: Tahoma for body copy, Futura/Century
        // Gothic for headings. Everything falls back gracefully.
        sans: ['Tahoma', 'Verdana', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Futura', 'Century Gothic', 'Trebuchet MS', 'Segoe UI', 'Arial', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
        jp: ['Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', 'Noto Sans JP', 'sans-serif'],
        mono: ['ui-monospace', 'Cascadia Mono', 'Menlo', 'Consolas', 'monospace']
      },
      // VNDB is a flat, near-square design: clamp Tailwind's radii so the
      // rounded-3xl that ReactBits components ship with reads as a VNDB box.
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '3px',
        md: '3px',
        lg: '4px',
        xl: '4px',
        '2xl': '6px',
        '3xl': '6px',
        full: '9999px'
      },
      boxShadow: {
        glow: '0 0 12px rgb(var(--c-brand) / 0.25)',
        'glow-gold': '0 0 12px rgb(var(--c-gold) / 0.22)',
        card: '0 1px 3px rgb(0 0 0 / 0.10)',
        lift: '0 4px 14px rgb(0 0 0 / 0.16)'
      },
      backgroundImage: {
        'hero-radial':
          'linear-gradient(200deg, rgb(var(--c-brand) / 0.10) 0%, transparent 30%), linear-gradient(0deg, rgb(var(--c-panel2) / 0.7) 0%, transparent 50%)'
      },
      animation: {
        'fade-up': 'fadeUp .45s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fadeIn .35s ease both',
        shimmer: 'shimmer 1.6s linear infinite',
        'spin-slow': 'spin 6s linear infinite',
        caret: 'caret 1.1s steps(1) infinite',
        'float-y': 'floatY 7s ease-in-out infinite'
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
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
