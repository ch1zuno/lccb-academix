import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// The API server binds to PORT from .env (default 4000).
const API_PORT = process.env.PORT || 4000

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
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
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
      '/realtime-ws': {
        target: `ws://localhost:${API_PORT}`,
        ws: true,
      },
    },
  },
})
