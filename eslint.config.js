import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // `src/reactbits/**` is vendored verbatim from DavidHDev/react-bits by
  // `npm run reactbits:sync` + `npm run reactbits:theme`; upstream style is not ours to police.
  { ignores: ['dist', 'coverage', 'node_modules', 'src/reactbits/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        TextDecoder: 'readonly',
        setTimeout: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      globals: { window: 'readonly', document: 'readonly', navigator: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly', fetch: 'readonly', AbortController: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', RequestInit: 'readonly', Response: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly', IntersectionObserver: 'readonly', HTMLInputElement: 'readonly', HTMLElement: 'readonly', console: 'readonly', crypto: 'readonly', location: 'readonly', FormData: 'readonly', btoa: 'readonly' }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  }
);
