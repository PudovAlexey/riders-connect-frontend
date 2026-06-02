import { useCallback, useRef, useState } from 'react'

export interface RecordingResult {
  blob: Blob
  duration: number
  mimeType: string
  ext: string
}

type Kind = 'audio' | 'video'

function pickMime(kind: Kind): { mimeType: string; ext: string } {
  const candidates =
    kind === 'audio'
      ? ['audio/webm', 'audio/mp4', 'audio/ogg']
      : ['video/webm', 'video/mp4']
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
      return { mimeType: m, ext: '.' + m.split('/')[1].split(';')[0] }
    }
  }
  return { mimeType: '', ext: kind === 'audio' ? '.webm' : '.webm' }
}

/**
 * Wraps getUserMedia + MediaRecorder for audio or video capture.
 * stop() resolves to the recorded blob + duration; cancel() discards.
 * For video, pass the obtained stream out via onStream so the caller can
 * show a live preview.
 */
export function useRecorder(kind: Kind, onStream?: (s: MediaStream | null) => void) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)
  const mimeRef = useRef<{ mimeType: string; ext: string }>({ mimeType: '', ext: '.webm' })

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    onStream?.(null)
    setRecording(false)
  }, [onStream])

  const start = useCallback(async () => {
    setError('')
    try {
      const constraints: MediaStreamConstraints =
        kind === 'audio' ? { audio: true } : { audio: true, video: { facingMode: 'user' } }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      onStream?.(stream)

      const mime = pickMime(kind)
      mimeRef.current = mime
      const rec = new MediaRecorder(stream, mime.mimeType ? { mimeType: mime.mimeType } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorderRef.current = rec
      rec.start()

      startedAtRef.current = Date.now()
      setSeconds(0)
      timerRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 250)
      setRecording(true)
    } catch (err: any) {
      setError(err?.name === 'NotAllowedError' ? 'Permission denied' : 'Could not start recording')
      cleanup()
    }
  }, [kind, onStream, cleanup])

  const stop = useCallback((): Promise<RecordingResult | null> => {
    const rec = recorderRef.current
    if (!rec) { cleanup(); return Promise.resolve(null) }
    const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
    return new Promise((resolve) => {
      rec.onstop = () => {
        const { mimeType, ext } = mimeRef.current
        const blob = new Blob(chunksRef.current, { type: mimeType || rec.mimeType || 'application/octet-stream' })
        cleanup()
        resolve(blob.size > 0 ? { blob, duration, mimeType: blob.type, ext } : null)
      }
      try { rec.stop() } catch { cleanup(); resolve(null) }
    })
  }, [cleanup])

  const cancel = useCallback(() => {
    const rec = recorderRef.current
    if (rec) { rec.onstop = null; try { rec.stop() } catch { /* ignore */ } }
    cleanup()
  }, [cleanup])

  return { recording, seconds, error, start, stop, cancel }
}
