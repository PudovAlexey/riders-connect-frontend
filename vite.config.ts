import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8080',
      '/profile': 'http://localhost:8080',
      '/geo': 'http://localhost:8080',
      '/chat': 'http://localhost:8080',
      '/media': 'http://localhost:8080',
      '/uploads': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
})
