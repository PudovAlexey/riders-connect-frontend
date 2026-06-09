// Web Push (VAPID) subscription management for the React app. The service
// worker (public/sw.js) shows the notifications; here we register it, ask for
// permission, subscribe via the Push API, and sync the subscription with the
// backend. The VAPID public key is fetched at runtime from the backend.

import { getPushPublicKey, savePushSubscription, deletePushSubscription } from '../api'

const ENABLED_KEY = 'pushEnabled'

export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export interface PushState {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  enabled: boolean
}

export function getPushState(): PushState {
  if (!isPushSupported()) return { supported: false, permission: 'unsupported', enabled: false }
  return {
    supported: true,
    permission: Notification.permission,
    enabled: localStorage.getItem(ENABLED_KEY) === '1',
  }
}

// Convert a base64url VAPID key into the Uint8Array the Push API expects.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // ready resolves once the SW registered in main.tsx is active.
  return navigator.serviceWorker.ready
}

/**
 * Register the service worker, request permission, subscribe, and send the
 * subscription to the backend. Returns the resulting permission state.
 */
export async function enablePush(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    localStorage.removeItem(ENABLED_KEY)
    return permission
  }

  const reg = await getRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    const { data } = await getPushPublicKey()
    if (!data.public_key) throw new Error('push not configured on server')
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.public_key),
    })
  }
  await savePushSubscription(sub.toJSON())
  localStorage.setItem(ENABLED_KEY, '1')
  return 'granted'
}

/** Unsubscribe locally and remove the subscription from the backend. */
export async function disablePush(): Promise<void> {
  localStorage.removeItem(ENABLED_KEY)
  if (!isPushSupported()) return
  try {
    const reg = await getRegistration()
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await deletePushSubscription(sub.endpoint).catch(() => {})
      await sub.unsubscribe().catch(() => {})
    }
  } catch {
    /* ignore */
  }
}

/**
 * Re-arm the backend for an already-opted-in user (e.g. after a fresh login on
 * a device that still has a browser subscription). Idempotent; safe to call on
 * every app start.
 */
export async function syncPush(): Promise<void> {
  if (!isPushSupported()) return
  if (localStorage.getItem(ENABLED_KEY) !== '1') return
  if (Notification.permission !== 'granted') return
  try {
    const reg = await getRegistration()
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const { data } = await getPushPublicKey()
      if (!data.public_key) return
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.public_key),
      })
    }
    await savePushSubscription(sub.toJSON())
  } catch {
    /* best-effort */
  }
}
