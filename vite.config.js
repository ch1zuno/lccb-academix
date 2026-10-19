import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The API server binds to PORT from .env (default 4000).
const API_PORT = process.env.PORT || 4000

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
    },
  },
})
