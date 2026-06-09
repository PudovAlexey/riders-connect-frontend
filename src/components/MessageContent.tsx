import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Message } from '../types'
import { parsePointShare } from '../lib/mapShare'
import { categoryMeta, categorySvg } from '../lib/pointCategories'

function fmtDuration(s?: number) {
  if (!s || s < 0) return ''
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface Props {
  msg: Message
  isMe: boolean
}

/** Renders a chat message body based on its message_type. */
export default function MessageContent({ msg, isMe }: Props) {
  const [unmuted, setUnmuted] = useState(false)
  const navigate = useNavigate()
  const url = msg.attachment_url || ''
  const type = msg.message_type || 'text'
  const duration = msg.attachment_meta?.duration as number | undefined

  // A shared map point arrives as a plain text message whose content is the
  // point link — render it as a tappable location card.
  const shared = type === 'text' ? parsePointShare(msg.content) : null
  if (shared) {
    return (
      <button
        type="button"
        onClick={() => navigate(shared.to)}
        className="block text-left w-[220px] max-w-full"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ background: categoryMeta(shared.category).color }}
            dangerouslySetInnerHTML={{ __html: categorySvg(shared.category, 18) }}
          />
          <div className="min-w-0">
            <p className={`font-semibold text-sm leading-tight truncate ${isMe ? 'text-white' : 'text-slate-900'}`}>
              {shared.name}
            </p>
            {shared.address && (
              <p className={`text-xs truncate ${isMe ? 'text-orange-100' : 'text-slate-500'}`}>{shared.address}</p>
            )}
          </div>
        </div>
        <div className={`mt-2 pt-2 border-t flex items-center gap-1 text-xs font-medium ${isMe ? 'border-white/25 text-white' : 'border-slate-200 text-primary'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Открыть на карте
          <span className="ml-auto">→</span>
        </div>
      </button>
    )
  }

  const caption = msg.content ? (
    <p className={`leading-relaxed mt-1.5 ${isMe ? 'text-white' : 'text-slate-900'}`}>{msg.content}</p>
  ) : null

  switch (type) {
    case 'image':
      return (
        <div>
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt="" className="rounded-xl max-w-[240px] max-h-[320px] object-cover" />
          </a>
          {caption}
        </div>
      )

    case 'video':
      return (
        <div>
          <video src={url} controls playsInline className="rounded-xl max-w-[240px] max-h-[320px]" />
          {caption}
        </div>
      )

    case 'video_note':
      return (
        <div className="flex flex-col items-center">
          <video
            src={url}
            autoPlay
            loop
            muted={!unmuted}
            playsInline
            onClick={(e) => {
              setUnmuted((v) => !v)
              const v = e.currentTarget
              v.currentTime = 0
              void v.play()
            }}
            className="w-48 h-48 rounded-full object-cover cursor-pointer bg-black"
          />
          {duration != null && (
            <span className={`text-[10px] mt-1 ${isMe ? 'text-orange-100' : 'text-slate-400'}`}>
              {fmtDuration(duration)} {unmuted ? '' : '· tap for sound'}
            </span>
          )}
        </div>
      )

    case 'audio':
      return (
        <div className="flex items-center gap-2 min-w-[180px]">
          <audio src={url} controls className="h-9 max-w-[220px]" />
          {duration != null && (
            <span className={`text-[10px] flex-shrink-0 ${isMe ? 'text-orange-100' : 'text-slate-400'}`}>
              {fmtDuration(duration)}
            </span>
          )}
        </div>
      )

    case 'file':
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2 underline ${isMe ? 'text-white' : 'text-primary'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
          {(msg.attachment_meta?.name as string) || 'File'}
        </a>
      )

    default:
      return <p className="leading-relaxed">{msg.content}</p>
  }
}
