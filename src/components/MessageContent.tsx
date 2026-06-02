import { useState } from 'react'
import type { Message } from '../types'

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
  const url = msg.attachment_url || ''
  const type = msg.message_type || 'text'
  const duration = msg.attachment_meta?.duration as number | undefined

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
