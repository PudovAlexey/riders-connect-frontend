import type { Chat, ChatMember, Message } from '../types'

const MEDIA_LABELS: Record<string, string> = {
  image: '📷 Photo',
  video: '🎬 Video',
  audio: '🎤 Voice message',
  video_note: '⭕ Video message',
  file: '📎 File',
}

// Short preview for a chat's last message (typed label for media).
export function messagePreview(msg?: Message): string {
  if (!msg) return ''
  if (msg.content) return msg.content
  return MEDIA_LABELS[msg.message_type || 'text'] || ''
}

// The member that is not me — for direct chats.
export function otherMember(chat: Chat, meId?: string): ChatMember | undefined {
  return chat.members.find((m) => m.user_id !== meId) ?? chat.members[0]
}

// Display title: group title, or the other participant's name/@username.
export function chatTitle(chat: Chat, meId?: string): string {
  if (chat.type === 'group') return chat.title || 'Group'
  const o = otherMember(chat, meId)
  if (!o) return 'Chat'
  return o.name || (o.username ? `@${o.username}` : o.user_id.slice(0, 8))
}

export function chatSubtitle(chat: Chat, meId?: string): string {
  if (chat.type === 'group') return `${chat.members.length} members`
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
