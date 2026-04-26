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
    define: {
      // Fallback to production URL if .env is not present
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        env.VITE_API_BASE_URL || 'https://hidayah-backend-zgix.onrender.com'
      ),
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
