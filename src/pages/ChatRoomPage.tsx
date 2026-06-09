import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { ChatContainer, MessageList } from '@chatscope/chat-ui-kit-react'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import { getMessages, getChats, uploadMedia, sendMessage as sendMessageRest } from '../api'
import { useAuth } from '../hooks/useAuth'
import type { Message, Chat } from '../types'
import { chatTitle, chatSubtitle, chatAvatarUrl, initial, senderName } from '../lib/chat'
import { buildWsUrl } from '../lib/config'
import { playSend } from '../lib/sounds'
import { useRecorder } from '../hooks/useRecorder'
import MessageContent from '../components/MessageContent'
import VideoNoteRecorder from '../components/VideoNoteRecorder'
import AppHeader from '../components/AppHeader'
import AddMembersSheet from '../components/AddMembersSheet'
import ChatLayout from '../components/chat/ChatLayout'
import ChatInputBar from '../components/chat/ChatInputBar'
import { scrollChatToBottom } from '../components/chat/scroll'
import '../components/chat/chat.css'

type WsMsg = { type: string; message?: Message }
type SendState = 'loading' | 'failed'

const MESSAGE_LIST_ID = 'chat-msg-list'
const SEND_TIMEOUT_MS = 8000

export default function ChatRoomPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [chat, setChat] = useState<Chat | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [showMembers, setShowMembers] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showVideoNote, setShowVideoNote] = useState(false)
  const [sendStates, setSendStates] = useState<Record<string, SendState>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mirror of `messages` so WS handlers / retry can read the latest list
  // without re-subscribing.
  const messagesRef = useRef<Message[]>([])
  useEffect(() => { messagesRef.current = messages }, [messages])

  // Per-optimistic-id safety timeouts (mark as failed if no WS echo arrives).
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const clearSendTimeout = useCallback((id: string) => {
    const t = timeoutsRef.current[id]
    if (t) {
      clearTimeout(t)
      delete timeoutsRef.current[id]
    }
  }, [])

  const audioRec = useRecorder('audio')

  const wsUrl = token ? buildWsUrl(`/ws?token=${token}`) : null

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket<WsMsg>(wsUrl, {
    shouldReconnect: () => true,
    share: true,
  })

  // Load history + chat metadata
  useEffect(() => {
    if (!chatId) return
    setLoading(true)
    getMessages(chatId)
      .then((r) => setMessages(r.data.slice().reverse()))
      .finally(() => setLoading(false))
    getChats()
      .then((r) => setChat(r.data.find((c) => c.id === chatId) ?? null))
      .catch(() => {})
  }, [chatId])

  // Clear any pending send timeouts when leaving the chat.
  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      Object.values(timeouts).forEach(clearTimeout)
    }
  }, [chatId])

  // Real-time incoming
  useEffect(() => {
    if (!lastJsonMessage || lastJsonMessage.type !== 'new_message' || !lastJsonMessage.message) return
    const msg = lastJsonMessage.message
    if (msg.chat_id !== chatId) return

    // Our own message echoed back over WS == the "sent" confirmation:
    // replace the matching optimistic bubble in place.
    if (msg.sender_id === user?.id) {
      const optimistic = messagesRef.current.find(
        (m) => m.id.startsWith('optimistic-') && m.content === msg.content,
      )
      if (optimistic) {
        const optId = optimistic.id
        clearSendTimeout(optId)
        setSendStates((s) => {
          const next = { ...s }
          delete next[optId]
          return next
        })
        setMessages((prev) => prev.map((m) => (m.id === optId ? msg : m)))
        return
      }
    }

    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
  }, [lastJsonMessage, chatId, user?.id, clearSendTimeout])

  // Stick to the bottom once the history finishes loading.
  useEffect(() => {
    if (loading) return
    requestAnimationFrame(() => scrollChatToBottom(MESSAGE_LIST_ID))
  }, [loading])

  // ─── Sending ───

  const dispatchSend = useCallback(
    (optimisticId: string, content: string) => {
      if (!chatId) return

      if (readyState === ReadyState.OPEN) {
        sendJsonMessage({ type: 'send_message', chat_id: chatId, content })
        clearSendTimeout(optimisticId)
        timeoutsRef.current[optimisticId] = setTimeout(() => {
          setSendStates((s) => (s[optimisticId] === 'loading' ? { ...s, [optimisticId]: 'failed' } : s))
          delete timeoutsRef.current[optimisticId]
        }, SEND_TIMEOUT_MS)
        return
      }

      // WebSocket is down — fall back to the REST endpoint, which gives us a
      // definitive success/failure to drive the optimistic state.
      sendMessageRest(chatId, content)
        .then((res) => {
          const real = res.data
          setSendStates((s) => {
            const next = { ...s }
            delete next[optimisticId]
            return next
          })
          setMessages((prev) => prev.map((m) => (m.id === optimisticId ? real : m)))
        })
        .catch(() => {
          setSendStates((s) => ({ ...s, [optimisticId]: 'failed' }))
        })
    },
    [chatId, readyState, sendJsonMessage, clearSendTimeout],
  )

  const send = useCallback(() => {
    const content = text.trim()
    if (!content || !chatId || !user) return

    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMsg: Message = {
      id: optimisticId,
      chat_id: chatId,
      sender_id: user.id,
      content,
      message_type: 'text',
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setSendStates((s) => ({ ...s, [optimisticId]: 'loading' }))
    setText('')
    playSend()
    requestAnimationFrame(() => scrollChatToBottom(MESSAGE_LIST_ID))

    dispatchSend(optimisticId, content)
  }, [text, chatId, user, dispatchSend])

  const handleRetry = useCallback(
    (id: string) => {
      const msg = messagesRef.current.find((m) => m.id === id)
      if (!msg) return
      setSendStates((s) => ({ ...s, [id]: 'loading' }))
      dispatchSend(id, msg.content)
    },
    [dispatchSend],
  )

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
    playSend()
    requestAnimationFrame(() => scrollChatToBottom(MESSAGE_LIST_ID))
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

  const renderStatus = (id: string, state: SendState) => {
    if (state === 'loading') {
      return (
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0 mb-1.5" />
      )
    }
    return (
      <button
        type="button"
        onClick={() => handleRetry(id)}
        title="Tap to retry"
        className="w-5 h-5 flex items-center justify-center text-red-500 flex-shrink-0 mb-1.5"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path d="M1 4v6h6M23 20v-6h-6" />
          <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
        </svg>
      </button>
    )
  }

  const renderMessage = (msg: Message) => {
    const mine = isMe(msg)
    const type = msg.message_type || 'text'
    const isNote = type === 'video_note'
    const isMedia = type !== 'text'
    const state = msg.id ? sendStates[msg.id] : undefined

    const bubbleClass = isNote
      ? ''
      : `rounded-2xl text-sm ${isMedia ? 'p-1' : 'px-4 py-2.5'} ${
          mine ? 'bg-primary text-white rounded-tr-sm' : 'bg-slate-100 text-slate-900 rounded-tl-sm'
        }`

    return (
      <div key={msg.id} className={`flex items-end gap-1.5 ${mine ? 'justify-end' : 'justify-start'}`}>
        {mine && state && renderStatus(msg.id, state)}
        <div className={`flex flex-col max-w-[75%] ${mine ? 'items-end' : 'items-start'}`}>
          <div className={bubbleClass}>
            {isGroup && !mine && chat && (
              <p className={`text-[11px] font-semibold text-indigo-500 mb-0.5 ${isMedia && !isNote ? 'px-3 pt-2' : ''}`}>
                {senderName(chat, msg.sender_id)}
              </p>
            )}
            <MessageContent msg={msg} isMe={mine} />
            {!isNote && (
              <p className={`text-[10px] mt-1 ${isMedia ? 'px-3 pb-1.5' : ''} ${mine ? 'text-orange-100' : 'text-slate-400'}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          {mine && state === 'failed' && (
            <span className="text-[10px] text-red-400 mt-0.5">Not delivered · tap to retry</span>
          )}
        </div>
      </div>
    )
  }

  const header = (
    <AppHeader
      border
      onBack={() => navigate('/chat')}
      title={
        <button
          onClick={() => chat && setShowMembers(true)}
          disabled={!chat}
          className="flex items-center gap-3 min-w-0 w-full text-left active:opacity-70 transition-opacity"
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
      }
    />
  )

  const footer = audioRec.recording ? (
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
    <ChatInputBar
      value={text}
      onChange={setText}
      onSubmit={send}
      uploading={uploading}
      onAttach={() => fileInputRef.current?.click()}
      onVideoNote={() => setShowVideoNote(true)}
      onToggleAudio={toggleAudio}
      onFocus={() => requestAnimationFrame(() => scrollChatToBottom(MESSAGE_LIST_ID))}
    />
  )

  return (
    <>
      <ChatLayout header={header} footer={footer}>
        <ChatContainer style={{ height: '100%', background: 'transparent' }}>
          <MessageList id={MESSAGE_LIST_ID} className="chat-scroll-container" autoScrollToBottom autoScrollToBottomOnMount>
            <MessageList.Content>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-slate-400 text-sm">No messages yet. Say hi!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-4 py-3">{messages.map(renderMessage)}</div>
              )}
            </MessageList.Content>
          </MessageList>
        </ChatContainer>
      </ChatLayout>

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
            {isGroup && (
              <div className="px-4 py-3 border-t border-slate-100">
                <button
                  onClick={() => setShowAddMembers(true)}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 font-semibold text-sm active:opacity-80"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add member
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {chat && (
        <AddMembersSheet
          open={showAddMembers}
          chat={chat}
          onClose={() => setShowAddMembers(false)}
          onAdded={(updated) => setChat(updated)}
        />
      )}
    </>
  )
}
