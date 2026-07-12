/* eslint-disable no-undef */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      // Same-origin API in dev: the S4 refresh cookie stays first-party.
      // WebSockets still connect directly to the backend (no cookies needed).
      proxy: {
        '/api': { target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000', changeOrigin: true },
        '/media': { target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000', changeOrigin: true },
      },
    },
    define: {
      // Fallback to production URL if .env is not present
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        env.VITE_API_BASE_URL || 'https://hidayah-backend-zgix.onrender.com'
      ),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'global': 'window',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-icons': ['lucide-react'],
            'vendor-animation': ['framer-motion'],
            'vendor-utils': ['axios'],
          }
        }
      },
      chunkSizeWarningLimit: 1000,
    }
  }
})
