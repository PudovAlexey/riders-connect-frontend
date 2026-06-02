import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useWebSocket from 'react-use-websocket'
import { getMessages, getChats, uploadMedia } from '../api'
import { useAuth } from '../hooks/useAuth'
import type { Message, Chat } from '../types'
import { chatTitle, chatSubtitle, chatAvatarUrl, initial, senderName } from '../lib/chat'
import { useRecorder } from '../hooks/useRecorder'
import MessageContent from '../components/MessageContent'
import VideoNoteRecorder from '../components/VideoNoteRecorder'

type WsMsg = { type: string; message?: Message }

export default function ChatRoomPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [chat, setChat] = useState<Chat | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [showMembers, setShowMembers] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showVideoNote, setShowVideoNote] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const audioRec = useRecorder('audio')

  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const wsUrl = token ? `${proto}://${location.host}/ws?token=${token}` : null

  const { sendJsonMessage, lastJsonMessage } = useWebSocket<WsMsg>(wsUrl, {
    shouldReconnect: () => true,
    share: true,
  })

  // Load history + chat metadata
  useEffect(() => {
    if (!chatId) return
    getMessages(chatId)
      .then((r) => setMessages(r.data.slice().reverse()))
      .finally(() => setLoading(false))
    getChats()
      .then((r) => setChat(r.data.find((c) => c.id === chatId) ?? null))
      .catch(() => {})
  }, [chatId])

  // Real-time incoming
  useEffect(() => {
    if (!lastJsonMessage) return
    if (lastJsonMessage.type === 'new_message' && lastJsonMessage.message) {
      const msg = lastJsonMessage.message
      if (msg.chat_id === chatId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
    }
  }, [lastJsonMessage, chatId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !chatId) return
    sendJsonMessage({ type: 'send_message', chat_id: chatId, content: text.trim() })
    setText('')
  }

  const sendAttachment = (messageType: string, url: string, meta?: Record<string, any>) => {
    if (!chatId) return
    sendJsonMessage({
      type: 'send_message',
      chat_id: chatId,
      content: '',
      message_type: messageType,
      attachment_url: url,
      attachment_meta: meta ?? null,
    })
  }

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const res = await uploadMedia(file)
        sendAttachment(res.data.message_type, res.data.url, { name: file.name, size: file.size })
      }
    } catch { /* ignore */ }
    finally { setUploading(false) }
  }

  const toggleAudio = async () => {
    if (audioRec.recording) {
      const res = await audioRec.stop()
      if (!res) return
      setUploading(true)
      try {
        const up = await uploadMedia(new File([res.blob], `voice${res.ext}`, { type: res.mimeType }))
        sendAttachment('audio', up.data.url, { duration: res.duration })
      } catch { /* ignore */ }
      finally { setUploading(false) }
    } else {
      audioRec.start()
    }
  }

  const handleVideoNote = async (res: { blob: Blob; duration: number; mimeType: string; ext: string }) => {
    setUploading(true)
    try {
      const up = await uploadMedia(new File([res.blob], `note${res.ext}`, { type: res.mimeType }))
      sendAttachment('video_note', up.data.url, { duration: res.duration })
    } catch { /* ignore */ }
    finally { setUploading(false) }
  }

  const isMe = (msg: Message) => msg.sender_id === user?.id
  const isGroup = chat?.type === 'group'
  const title = chat ? chatTitle(chat, user?.id) : 'Conversation'
  const subtitle = chat ? chatSubtitle(chat, user?.id) : ''
  const avatar = chat ? chatAvatarUrl(chat, user?.id) : ''

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-slate-100 bg-white">
        <button
          onClick={() => navigate('/chat')}
          className="w-8 h-8 flex items-center justify-center text-slate-500 -ml-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => chat && setShowMembers(true)}
          disabled={!chat}
          className="flex items-center gap-3 min-w-0 flex-1 text-left active:opacity-70 transition-opacity"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-indigo-500 font-semibold text-sm">{initial(title)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate leading-tight">{title}</p>
            <p className="text-xs text-slate-400 truncate">
              {chat ? `${chat.members.length} ${chat.members.length === 1 ? 'member' : 'members'}` : subtitle}
            </p>
          </div>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400 text-sm">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const type = msg.message_type || 'text'
            const isNote = type === 'video_note'
            const isMedia = type !== 'text'
            const bubbleClass = isNote
              ? 'max-w-[75%]'
              : `max-w-[75%] rounded-2xl text-sm ${isMedia ? 'p-1' : 'px-4 py-2.5'} ${
                  isMe(msg)
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-slate-100 text-slate-900 rounded-tl-sm'
                }`
            return (
              <div
                key={msg.id}
                className={`flex ${isMe(msg) ? 'justify-end' : 'justify-start'}`}
              >
                <div className={bubbleClass}>
                  {isGroup && !isMe(msg) && chat && (
                    <p className={`text-[11px] font-semibold text-indigo-500 mb-0.5 ${isMedia && !isNote ? 'px-3 pt-2' : ''}`}>
                      {senderName(chat, msg.sender_id)}
                    </p>
                  )}
                  <MessageContent msg={msg} isMe={isMe(msg)} />
                  {!isNote && (
                    <p className={`text-[10px] mt-1 ${isMedia ? 'px-3 pb-1.5' : ''} ${isMe(msg) ? 'text-orange-100' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {audioRec.recording ? (
        <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 bg-white">
          <button
            onClick={audioRec.cancel}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
            </svg>
          </button>
          <div className="flex-1 flex items-center gap-2 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm tabular-nums">
              {`${Math.floor(audioRec.seconds / 60)}:${(audioRec.seconds % 60).toString().padStart(2, '0')}`}
            </span>
            <span className="text-xs text-slate-400">Recording…</span>
          </div>
          <button
            onClick={toggleAudio}
            className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 translate-x-0.5">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      ) : (
        <form
          onSubmit={send}
          className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-white"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
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
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {text.trim() ? (
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
                onClick={() => setShowVideoNote(true)}
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
                onClick={toggleAudio}
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
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {showVideoNote && (
        <VideoNoteRecorder
          onClose={() => setShowVideoNote(false)}
          onRecorded={handleVideoNote}
        />
      )}

      {/* Participants panel */}
      {showMembers && chat && (
        <div
          className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/30"
          onClick={() => setShowMembers(false)}
        >
          <div
            className="w-full max-w-[440px] bg-white rounded-t-2xl max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-900">Participants</p>
                <p className="text-xs text-slate-400">{chat.members.length} {chat.members.length === 1 ? 'member' : 'members'}</p>
              </div>
              <button
                onClick={() => setShowMembers(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chat.members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-indigo-500 font-semibold">{initial(m.name || m.username)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {m.name || `@${m.username}`}
                      {m.user_id === user?.id && <span className="text-slate-400 font-normal"> (You)</span>}
                    </p>
                    {m.username && <p className="text-slate-400 text-xs truncate">@{m.username}</p>}
                  </div>
                  {m.role === 'owner' && (
                    <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                      owner
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
