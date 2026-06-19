import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useWebSocket from 'react-use-websocket'
import { getChats } from '../api'
import { useAuth } from '../hooks/useAuth'
import type { Chat, Message } from '../types'
import { chatTitle, chatSubtitle, chatAvatarUrl, initial, messagePreview, isMessageRead } from '../lib/chat'
import { buildWsUrl } from '../lib/config'
import AppHeader from '../components/AppHeader'
import ReadTicks from '../components/ReadTicks'

type WsMsg = { type: string; message?: Message; chat_id?: string; user_id?: string }

export default function ChatListPage() {
  const { user, token, promptLogin } = useAuth()
  const navigate = useNavigate()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const refresh = useCallback(() => {
    getChats()
      .then((r) => setChats(r.data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    refresh()
  }, [user, refresh])

  // Live unread updates over the shared socket: bump on incoming messages,
  // reset when I read a chat (e.g. from another tab).
  const wsUrl = token ? buildWsUrl(`/ws?token=${token}`) : null
  const { lastJsonMessage } = useWebSocket<WsMsg>(wsUrl, { shouldReconnect: () => true, share: true })

  useEffect(() => {
    if (!lastJsonMessage || !user) return

    if (lastJsonMessage.type === 'new_message' && lastJsonMessage.message) {
      const m = lastJsonMessage.message
      setChats((prev) => {
        const i = prev.findIndex((c) => c.id === m.chat_id)
        if (i === -1) {
          refresh() // a chat not yet in the list (e.g. brand new) — refetch
          return prev
        }
        const mine = m.sender_id === user.id
        const updated: Chat = {
          ...prev[i],
          last_message: m,
          unread_count: (prev[i].unread_count ?? 0) + (mine ? 0 : 1),
        }
        return [updated, ...prev.filter((c) => c.id !== m.chat_id)] // jump to top
      })
      return
    }

    if (lastJsonMessage.type === 'read_receipt' && lastJsonMessage.user_id === user.id) {
      const cid = lastJsonMessage.chat_id
      setChats((prev) => prev.map((c) => (c.id === cid ? { ...c, unread_count: 0 } : c)))
    }
  }, [lastJsonMessage, user, refresh])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chats
    return chats.filter((c) => {
      const title = chatTitle(c, user?.id).toLowerCase()
      const handles = c.members.map((m) => `${m.name} @${m.username}`).join(' ').toLowerCase()
      const last = c.last_message?.content?.toLowerCase() ?? ''
      return title.includes(q) || handles.includes(q) || last.includes(q)
    })
  }, [chats, query, user?.id])

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface px-8 gap-5">
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-lg shadow-orange-200">
          <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">Присоединяйтесь</h2>
          <p className="text-slate-500 text-sm mt-1">Зарегистрируйтесь, чтобы писать другим райдерам</p>
        </div>
        <button
          onClick={promptLogin}
          className="w-full max-w-xs bg-primary text-white rounded-xl py-3.5 font-semibold text-base active:bg-primary-dark transition-colors"
        >
          Регистрация / Вход
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-surface">
      {/* Static header — only the chat list below scrolls. */}
      <div className="sticky top-0 z-30 bg-surface">
      <AppHeader
        title="Чаты"
        border
        actions={
          <>
            <button
              onClick={() => navigate('/contacts')}
              title="Контакты"
              className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path d="M17 20h5v-1a4 4 0 00-4-4h-1m-6 5H2v-1a4 4 0 014-4h4a4 4 0 014 4v1zm-3-9a3 3 0 100-6 3 3 0 000 6zm9-3a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/chat/new')}
              title="Новый чат"
              className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </>
        }
      >
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-400">
            <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск чатов…"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
      </AppHeader>
      </div>

      {/* List */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-slate-400 text-sm">{query ? 'Ничего не найдено' : 'Пока нет чатов'}</p>
            <p className="text-slate-300 text-xs">Нажмите +, чтобы начать чат или группу</p>
          </div>
        ) : (
          filtered.map((c) => {
            const title = chatTitle(c, user.id)
            const avatar = chatAvatarUrl(c, user.id)
            const lastMine = c.last_message?.sender_id === user.id
            const lastRead = lastMine && isMessageRead(c, c.last_message!, user.id)
            const unread = c.unread_count ?? 0
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/chat/${c.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
              >
                <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {avatar ? (
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                  ) : c.type === 'group' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={1.5} className="w-6 h-6">
                      <path d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H2v-1a4 4 0 014-4h4a4 4 0 014 4v1zm-3-9a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                  ) : (
                    <span className="text-indigo-500 font-semibold">{initial(title)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-slate-900 text-sm truncate ${unread > 0 ? 'font-semibold' : 'font-medium'}`}>{title}</p>
                    {c.last_message && (
                      <span className="flex items-center gap-1 flex-shrink-0 text-[10px] text-slate-400">
                        {lastMine && (
                          <ReadTicks
                            read={!!lastRead}
                            className={`w-3.5 h-3 ${lastRead ? 'text-sky-500' : 'text-slate-400'}`}
                          />
                        )}
                        {new Date(c.last_message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={`text-xs truncate ${unread > 0 ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                      {messagePreview(c.last_message) || chatSubtitle(c, user.id) || 'Пока нет сообщений'}
                    </p>
                    {unread > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-semibold flex items-center justify-center">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
