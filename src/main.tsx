import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { lockViewport } from './lib/lockViewport'
import { syncPush } from './lib/push'

lockViewport()

// Register the push service worker, then re-arm an already-opted-in user's
// subscription with the backend (no-op if push isn't enabled or supported).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => syncPush())
    .catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
