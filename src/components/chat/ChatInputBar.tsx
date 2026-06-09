interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  uploading: boolean
  onAttach: () => void
  onVideoNote: () => void
  onToggleAudio: () => void
  onFocus?: () => void
}

/**
 * Chat composer: attach button, text field, and a context action that flips
 * between Send (when there's text) and the video-note + voice buttons (when
 * empty). Behaviour mirrors the original ChatRoomPage form.
 */
export default function ChatInputBar({
  value,
  onChange,
  onSubmit,
  uploading,
  onAttach,
  onVideoNote,
  onToggleAudio,
  onFocus,
}: ChatInputBarProps) {
  const hasText = value.trim().length > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-surface"
    >
      <button
        type="button"
        onClick={onAttach}
        disabled={uploading}
        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 flex-shrink-0 disabled:opacity-50"
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        )}
      </button>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder="Message..."
        className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
      />

      {hasText ? (
        <button
          type="submit"
          className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 translate-x-0.5">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onVideoNote}
            title="Video message"
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <circle cx="12" cy="12" r="9" />
              <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggleAudio}
            title="Voice message"
            className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </button>
        </>
      )}
    </form>
  )
}
