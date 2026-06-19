import type { Chat, ChatMember, Message } from '../types'
import { parsePointShare } from './mapShare'
import { pluralLabel } from './plural'

const MEDIA_LABELS: Record<string, string> = {
  image: '📷 Фото',
  video: '🎬 Видео',
  audio: '🎤 Голосовое сообщение',
  video_note: '⭕ Видеосообщение',
  file: '📎 Файл',
}

// Short preview for a chat's last message (typed label for media).
export function messagePreview(msg?: Message): string {
  if (!msg) return ''
  const point = parsePointShare(msg.content)
  if (point) return `📍 ${point.name}`
  if (msg.content) return msg.content
  return MEDIA_LABELS[msg.message_type || 'text'] || ''
}

// The member that is not me — for direct chats.
export function otherMember(chat: Chat, meId?: string): ChatMember | undefined {
  return chat.members.find((m) => m.user_id !== meId) ?? chat.members[0]
}

// Display title: group title, or the other participant's name/@username.
export function chatTitle(chat: Chat, meId?: string): string {
  if (chat.type === 'group') return chat.title || 'Группа'
  const o = otherMember(chat, meId)
  if (!o) return 'Чат'
  return o.name || (o.username ? `@${o.username}` : o.user_id.slice(0, 8))
}

export function chatSubtitle(chat: Chat, meId?: string): string {
  if (chat.type === 'group') return pluralLabel(chat.members.length, 'участник', 'участника', 'участников')
  const o = otherMember(chat, meId)
  return o?.username ? `@${o.username}` : ''
}

export function chatAvatarUrl(chat: Chat, meId?: string): string {
  if (chat.type === 'group') return chat.avatar_url
  return otherMember(chat, meId)?.avatar_url ?? ''
}

export function initial(text: string): string {
  const t = text.replace(/^@/, '').trim()
  return t ? t[0].toUpperCase() : '?'
}

export function senderName(chat: Chat, senderId: string): string {
  const m = chat.members.find((x) => x.user_id === senderId)
  return m?.name || (m?.username ? `@${m.username}` : senderId.slice(0, 6))
}

export function senderAvatar(chat: Chat, senderId: string): string {
  return chat.members.find((m) => m.user_id === senderId)?.avatar_url ?? ''
}

// A message I sent counts as "read" once ANY other member's read cursor has
// reached it. Used to pick single (✓) vs double (✓✓) ticks on my own bubbles.
export function isMessageRead(chat: Chat | null | undefined, msg: Message, meId?: string): boolean {
  if (!chat) return false
  const t = new Date(msg.created_at).getTime()
  return chat.members.some(
    (m) => m.user_id !== meId && m.last_read_at != null && new Date(m.last_read_at).getTime() >= t,
  )
}
