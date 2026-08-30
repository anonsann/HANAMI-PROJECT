import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Node env access without requiring @types/node. */
const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
const nodeEnv: Record<string, string | undefined> = proc?.env ?? {};

// HMR behind reverse proxies (e.g. cloud sandboxes) needs wss + port 443; locally the
// defaults are correct, so this is driven by env vars instead of being hardcoded.
const hmr =
  nodeEnv.VITE_HMR_PROTOCOL || nodeEnv.VITE_HMR_CLIENT_PORT
    ? {
        protocol: nodeEnv.VITE_HMR_PROTOCOL || 'ws',
        clientPort: Number(nodeEnv.VITE_HMR_CLIENT_PORT || 80)
      }
    : true;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    strictPort: false,
    // Allow the sandbox preview hostnames (*.e2b.app) to reach the dev server.
    allowedHosts: ['.e2b.app', 'localhost', '.localhost'],
    hmr
  },
  preview: {
    host: true,
    allowedHosts: ['.e2b.app', 'localhost', '.localhost']
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          // Animation engines used by the vendored ReactBits components. Split
          // out so they cache independently of app code and load in parallel.
          motion: ['motion/react', 'framer-motion'],
          gsap: ['gsap'],
          ogl: ['ogl']
        }
      }
    }
  }
});
