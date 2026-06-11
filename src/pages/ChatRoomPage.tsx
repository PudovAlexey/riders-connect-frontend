import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { AnimatePresence } from 'motion/react'
import { ChatContainer, MessageList } from '@chatscope/chat-ui-kit-react'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import { getMessages, getChats, uploadMedia, sendMessage as sendMessageRest, editMessage } from '../api'
import { useAuth } from '../hooks/useAuth'
import type { Message, Chat } from '../types'
import { chatTitle, chatSubtitle, chatAvatarUrl, initial, senderName, senderAvatar, isMessageRead } from '../lib/chat'
import { buildWsUrl } from '../lib/config'
import { playSend } from '../lib/sounds'
import { useRecorder } from '../hooks/useRecorder'
import MessageContent from '../components/MessageContent'
import ReadTicks from '../components/ReadTicks'
import VideoNoteRecorder from '../components/VideoNoteRecorder'
import AppHeader from '../components/AppHeader'
import AddMembersSheet from '../components/AddMembersSheet'
import ChatSettingsDrawer from '../components/chat/ChatSettingsDrawer'
import ChatLayout from '../components/chat/ChatLayout'
import ChatInputBar from '../components/chat/ChatInputBar'
import { scrollChatToBottom } from '../components/chat/scroll'
import '../components/chat/chat.css'

type WsMsg = {
  type: string
  message?: Message
  message_id?: string
  chat_id?: string
  user_id?: string
  last_read_at?: string
  chat?: Chat
}
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
  const [showSettings, setShowSettings] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showVideoNote, setShowVideoNote] = useState(false)
  const [sendStates, setSendStates] = useState<Record<string, SendState>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
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

  // Tell the server we've read this chat (only while the tab is actually
  // visible). The server advances our read cursor to the newest message and
  // broadcasts a read_receipt to the other members.
  const markRead = useCallback(() => {
    if (!chatId) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage({ type: 'read', chat_id: chatId })
    }
  }, [chatId, readyState, sendJsonMessage])

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
    if (!lastJsonMessage) return

    // Another member read up to last_read_at — advance their cursor so our own
    // bubbles can flip to "read" (double tick).
    if (lastJsonMessage.type === 'read_receipt') {
      const { chat_id, user_id, last_read_at } = lastJsonMessage
      if (chat_id !== chatId || !user_id || !last_read_at) return
      setChat((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((m) =>
                m.user_id === user_id ? { ...m, last_read_at } : m,
              ),
            }
          : prev,
      )
      return
    }

    // Group settings changed (name/avatar/members) — refresh our copy.
    if (lastJsonMessage.type === 'chat_updated' && lastJsonMessage.chat) {
      if (lastJsonMessage.chat.id !== chatId) return
      setChat(lastJsonMessage.chat)
      return
    }

    // We were removed from (or left) this chat — leave the screen.
    if (lastJsonMessage.type === 'chat_removed') {
      if (lastJsonMessage.chat_id === chatId) navigate('/chat')
      return
    }

    if (lastJsonMessage.type === 'message_edited' && lastJsonMessage.message) {
      const edited = lastJsonMessage.message
      if (edited.chat_id !== chatId) return
      setMessages((prev) => prev.map((m) => (m.id === edited.id ? edited : m)))
      return
    }

    if (lastJsonMessage.type === 'message_deleted' && lastJsonMessage.message_id) {
      if (lastJsonMessage.chat_id && lastJsonMessage.chat_id !== chatId) return
      const deletedId = lastJsonMessage.message_id
      setMessages((prev) => prev.filter((m) => m.id !== deletedId))
      return
    }

    if (lastJsonMessage.type !== 'new_message' || !lastJsonMessage.message) return
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
    // An incoming message arriving while we're looking at the chat is read.
    if (msg.sender_id !== user?.id) markRead()
  }, [lastJsonMessage, chatId, user?.id, clearSendTimeout, markRead, navigate])

  // Stick to the bottom once the history finishes loading.
  useEffect(() => {
    if (loading) return
    requestAnimationFrame(() => scrollChatToBottom(MESSAGE_LIST_ID))
  }, [loading])

  // Mark the chat read once history is loaded and the socket is up, and again
  // whenever the tab returns to the foreground.
  useEffect(() => {
    if (loading) return
    markRead()
    const onVisible = () => markRead()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loading, readyState, chatId, markRead])

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

  const confirmEdit = useCallback(() => {
    const content = text.trim()
    const id = editingId
    if (!content || !chatId || !id) return
    setEditingId(null)
    setText('')
    editMessage(chatId, id, content)
      .then((res) => {
        const updated = res.data
        setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)))
      })
      .catch(() => { /* server rejects (e.g. not author) — leave message as is */ })
  }, [text, chatId, editingId])

  const send = useCallback(() => {
    if (editingId) {
      confirmEdit()
      return
    }
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
  }, [text, chatId, user, dispatchSend, editingId, confirmEdit])

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

  const renderMessage = (msg: Message, prev?: Message, next?: Message) => {
    const mine = isMe(msg)
    const type = msg.message_type || 'text'
    const isNote = type === 'video_note'
    const isMedia = type !== 'text'
    const state = msg.id ? sendStates[msg.id] : undefined

    // Read ticks on my own confirmed (non-optimistic, non-failed) messages.
    const isOptimistic = msg.id.startsWith('optimistic-')
    const showTicks = mine && !isOptimistic && !state
    const read = showTicks && isMessageRead(chat, msg, user?.id)

    // Telegram-style runs: avatar (bottom-left) on the last message of a run,
    // sender name (top) on the first — only for incoming group messages.
    const showAvatarColumn = isGroup && !mine && !!chat
    const isFirstOfRun = !prev || prev.sender_id !== msg.sender_id
    const isLastOfRun = !next || next.sender_id !== msg.sender_id

    const bubbleClass = isNote
      ? ''
      : `rounded-2xl text-sm ${isMedia ? 'p-1' : 'px-4 py-2.5'} ${
          mine ? 'bg-primary text-white rounded-tr-sm' : 'bg-slate-100 text-slate-900 rounded-tl-sm'
        }`

    return (
      <div key={msg.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
        {mine && state && renderStatus(msg.id, state)}
        {showAvatarColumn &&
          (isLastOfRun ? (
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {senderAvatar(chat, msg.sender_id) ? (
                <img src={senderAvatar(chat, msg.sender_id)} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-indigo-500 font-semibold text-[11px]">
                  {initial(senderName(chat, msg.sender_id))}
                </span>
              )}
            </div>
          ) : (
            <div className="w-7 flex-shrink-0" />
          ))}
        <div className={`flex flex-col max-w-[75%] ${mine ? 'items-end' : 'items-start'}`}>
          <div className={bubbleClass}>
            {showAvatarColumn && isFirstOfRun && (
              <p className={`text-[11px] font-semibold text-indigo-500 mb-0.5 ${isMedia && !isNote ? 'px-3 pt-2' : ''}`}>
                {senderName(chat, msg.sender_id)}
              </p>
            )}
            <MessageContent msg={msg} isMe={mine} />
            {!isNote && (
              <p className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'justify-end' : ''} ${isMedia ? 'px-3 pb-1.5' : ''} ${mine ? 'text-orange-100' : 'text-slate-400'}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {showTicks && (
                  <ReadTicks read={read} className={`w-3.5 h-3 ${read ? 'text-sky-200' : 'text-orange-100'}`} />
                )}
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
          onClick={() => chat && setShowSettings(true)}
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
    <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 bg-surface">
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
                <div className="flex flex-col gap-2 px-4 py-3">
                  {messages.map((m, i) => renderMessage(m, messages[i - 1], messages[i + 1]))}
                </div>
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

      {/* Full-screen chat settings drawer */}
      <AnimatePresence>
        {showSettings && chat && (
          <ChatSettingsDrawer
            key="chat-settings"
            chat={chat}
            messages={messages}
            currentUserId={user?.id}
            onClose={() => setShowSettings(false)}
            onChatUpdated={setChat}
            onAddMembers={() => setShowAddMembers(true)}
            onLeft={() => navigate('/chat')}
          />
        )}
      </AnimatePresence>

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
