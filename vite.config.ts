import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = 'http://localhost:8080'

// Several backend prefixes (/chat, /profile, /auth, /contacts, /garage) collide with
// client-side SPA routes. On a full page reload the browser requests the document for that
// path; without this guard Vite's proxy forwards it to the backend, which answers 401 — so
// the user sees a raw "unauthorized" response instead of the app. Bypassing navigation
// requests (Accept: text/html) lets Vite serve index.html and the client router handle the
// route, while XHR/fetch API calls (Accept: application/json) are still proxied.
const apiProxy: ProxyOptions = {
  target: API_TARGET,
  changeOrigin: true,
  bypass: (req) =>
    req.headers.accept?.includes('text/html') ? '/index.html' : undefined,
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': apiProxy,
      '/profile': apiProxy,
      '/geo': apiProxy,
      '/points': apiProxy,
      '/chat': apiProxy,
      '/contacts': apiProxy,
      '/garage': apiProxy,
      '/events': apiProxy,
      '/media': apiProxy,
      '/uploads': apiProxy,
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
})
