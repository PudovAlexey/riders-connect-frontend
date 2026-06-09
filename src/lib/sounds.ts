// Notification sounds, synthesized with the Web Audio API so we don't ship any
// binary audio files. Two distinct tones: a short blip on send, a softer
// two-note chime on receive. Respects a localStorage mute flag.

const MUTE_KEY = 'soundsMuted'

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as any).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  // Browsers start the context "suspended" until a user gesture; resume best-effort.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// Resume the audio context on the first user interaction so receive sounds can
// play even before the user has clicked anything in the app.
if (typeof window !== 'undefined') {
  const unlock = () => {
    getCtx()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

export function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1'
}

export function setMuted(muted: boolean): void {
  if (muted) localStorage.setItem(MUTE_KEY, '1')
  else localStorage.removeItem(MUTE_KEY)
}

// Play a single tone with a quick attack/decay envelope.
function tone(freq: number, startAt: number, duration: number, peak = 0.18): void {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  const t0 = c.currentTime + startAt
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(gain).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

/** Short high blip when the user sends a message. */
export function playSend(): void {
  if (isMuted()) return
  tone(880, 0, 0.1)
}

/** Softer two-note chime when a message is received. */
export function playReceive(): void {
  if (isMuted()) return
  tone(660, 0, 0.12)
  tone(990, 0.1, 0.16)
}
