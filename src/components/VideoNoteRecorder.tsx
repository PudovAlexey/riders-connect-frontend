import { useEffect, useRef, useState } from 'react'
import { useRecorder, type RecordingResult } from '../hooks/useRecorder'

const MAX_SECONDS = 60

interface Props {
  onClose: () => void
  onRecorded: (result: RecordingResult) => void
}

/** Telegram-style round video note recorder. */
export default function VideoNoteRecorder({ onClose, onRecorded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [busy, setBusy] = useState(false)

  const attachStream = (s: MediaStream | null) => {
    if (videoRef.current) {
      videoRef.current.srcObject = s
      if (s) void videoRef.current.play().catch(() => {})
    }
  }

  const { recording, seconds, error, start, stop, cancel } = useRecorder('video', attachStream)

  // Start as soon as the modal mounts.
  useEffect(() => {
    start()
    return () => cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-stop at the limit.
  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) handleSend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording])

  const handleSend = async () => {
    if (busy) return
    setBusy(true)
    const res = await stop()
    if (res) onRecorded(res)
    onClose()
  }

  const handleCancel = () => {
    cancel()
    onClose()
  }

  const fmt = (s: number) => `0:${Math.min(s, MAX_SECONDS).toString().padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-[3000] bg-black/80 flex flex-col items-center justify-center gap-6 px-6">
      <div className="relative w-64 h-64">
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-64 h-64 rounded-full object-cover bg-black -scale-x-100"
        />
        {recording && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-medium tabular-nums">{fmt(seconds)}</span>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-white/80 text-sm">{error}</p>
      ) : (
        <p className="text-white/60 text-xs">Recording a video message · max {MAX_SECONDS}s</p>
      )}

      <div className="flex items-center gap-8">
        <button
          onClick={handleCancel}
          className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center text-white active:bg-white/25"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={handleSend}
          disabled={busy || !recording}
          className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white shadow-lg disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 translate-x-0.5">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
