import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The API server binds to PORT from .env (default 4000).
const API_PORT = process.env.PORT || 4000

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/centrifuge') || id.includes('node_modules/zod')) {
            return 'realtime';
          }
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
    },
  },
})
