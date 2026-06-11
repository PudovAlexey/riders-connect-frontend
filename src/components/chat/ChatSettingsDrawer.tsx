import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { updateChat, removeChatMember, uploadMedia } from '../../api'
import type { Chat, Message } from '../../types'
import { chatTitle, chatAvatarUrl, initial, otherMember } from '../../lib/chat'
import PhotoGallery from '../PhotoGallery'

interface ChatSettingsDrawerProps {
  chat: Chat
  messages: Message[]
  currentUserId?: string
  onClose: () => void
  /** Propagate a renamed / re-skinned / member-changed chat upward. */
  onChatUpdated: (chat: Chat) => void
  /** Open the existing "add members" sheet (rendered above this drawer). */
  onAddMembers: () => void
  /** The current user left the group — leave the chat screen. */
  onLeft: () => void
}

type Tab = 'photo' | 'video' | 'voice' | 'file'

const TABS: { value: Tab; label: string }[] = [
  { value: 'photo', label: 'Photos' },
  { value: 'video', label: 'Videos' },
  { value: 'voice', label: 'Voice' },
  { value: 'file', label: 'Files' },
]

function fmtDuration(sec?: number): string {
  if (sec == null) return ''
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

const CloseIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

/**
 * Full-screen chat-settings drawer that slides in from the right. Holds the
 * group name + avatar (editable for groups — any member may change them),
 * the participant list (add / remove / leave) and tabbed attachments derived
 * client-side from the loaded messages. Mounted inside an <AnimatePresence> in
 * ChatRoomPage so the slide-out plays on close.
 */
export default function ChatSettingsDrawer({
  chat,
  messages,
  currentUserId,
  onClose,
  onChatUpdated,
  onAddMembers,
  onLeft,
}: ChatSettingsDrawerProps) {
  const isGroup = chat.type === 'group'

  // ─── Name editing ───
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(chat.title)
  const [savingName, setSavingName] = useState(false)

  const saveName = async () => {
    const next = nameInput.trim()
    setEditingName(false)
    if (!next || next === chat.title) {
      setNameInput(chat.title)
      return
    }
    setSavingName(true)
    try {
      const res = await updateChat(chat.id, { title: next })
      onChatUpdated(res.data)
    } catch {
      setNameInput(chat.title)
    } finally {
      setSavingName(false)
    }
  }

  // ─── Avatar editing ───
  const fileRef = useRef<HTMLInputElement>(null)
  const blobRef = useRef<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const revokeBlob = () => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current)
      blobRef.current = null
    }
  }
  useEffect(() => revokeBlob, [])

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    revokeBlob()
    const preview = URL.createObjectURL(file)
    blobRef.current = preview
    setAvatarPreview(preview)
    setUploadingAvatar(true)
    try {
      const up = await uploadMedia(file)
      const res = await updateChat(chat.id, { avatar_url: up.data.url })
      onChatUpdated(res.data)
    } catch {
      setAvatarPreview(null)
    } finally {
      revokeBlob()
      setUploadingAvatar(false)
    }
  }

  // ─── Members ───
  const [busyMember, setBusyMember] = useState<string | null>(null)

  const removeMember = async (userId: string) => {
    setBusyMember(userId)
    try {
      await removeChatMember(chat.id, userId)
      if (userId === currentUserId) {
        onLeft()
        return
      }
      onChatUpdated({ ...chat, members: chat.members.filter((m) => m.user_id !== userId) })
    } catch {
      /* leave list as-is on failure */
    } finally {
      setBusyMember(null)
    }
  }

  // ─── Attachments (newest first, derived from loaded messages) ───
  const [tab, setTab] = useState<Tab>('photo')
  const att = [...messages].reverse().filter((m) => m.attachment_url)
  const photos = att.filter((m) => m.message_type === 'image')
  const videos = att.filter((m) => m.message_type === 'video' || m.message_type === 'video_note')
  const voice = att.filter((m) => m.message_type === 'audio')
  const files = att.filter((m) => m.message_type === 'file')

  const headerAvatar = avatarPreview ?? chatAvatarUrl(chat, currentUserId)
  const displayTitle = chatTitle(chat, currentUserId)
  const direct = otherMember(chat, currentUserId)

  return (
    <motion.div
      className="fixed inset-0 z-[3500] flex justify-center bg-black/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[440px] h-[100dvh] bg-surface flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-2 py-2 border-b border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
            aria-label="Close"
          >
            {CloseIcon}
          </button>
          <p className="font-semibold text-slate-900">Chat info</p>
        </div>

        <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
          {/* Avatar + name */}
          <div className="flex flex-col items-center pt-6 pb-4 px-4">
            <button
              type="button"
              onClick={() => isGroup && fileRef.current?.click()}
              disabled={!isGroup || uploadingAvatar}
              className="relative w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden disabled:cursor-default"
            >
              {headerAvatar ? (
                <img src={headerAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-indigo-500 font-semibold text-3xl">{initial(displayTitle)}</span>
              )}
              {uploadingAvatar && (
                <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </span>
              )}
              {isGroup && !uploadingAvatar && (
                <span className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white border-2 border-surface">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />

            <div className="mt-3 w-full flex flex-col items-center">
              {isGroup && editingName ? (
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  autoFocus
                  className="w-full max-w-[280px] text-center text-lg font-semibold text-slate-900 bg-slate-100 rounded-xl px-3 py-1.5 focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => isGroup && (setNameInput(chat.title), setEditingName(true))}
                  disabled={!isGroup}
                  className="flex items-center gap-1.5 text-lg font-semibold text-slate-900 disabled:cursor-default"
                >
                  <span className="truncate max-w-[280px]">{displayTitle}</span>
                  {isGroup && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-400">
                      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
                    </svg>
                  )}
                  {savingName && (
                    <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </button>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {isGroup
                  ? `${chat.members.length} ${chat.members.length === 1 ? 'member' : 'members'}`
                  : direct?.username
                    ? `@${direct.username}`
                    : ''}
              </p>
            </div>
          </div>

          {/* Participants */}
          <div className="border-t border-slate-100 pt-2">
            <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Participants</p>
            {chat.members.map((m) => {
              const me = m.user_id === currentUserId
              return (
                <div key={m.user_id} className="flex items-center gap-3 px-4 py-2.5">
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
                      {me && <span className="text-slate-400 font-normal"> (You)</span>}
                    </p>
                    {m.username && <p className="text-slate-400 text-xs truncate">@{m.username}</p>}
                  </div>
                  {m.role === 'owner' && (
                    <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                      owner
                    </span>
                  )}
                  {isGroup && !me && (
                    <button
                      onClick={() => removeMember(m.user_id)}
                      disabled={busyMember === m.user_id}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100 flex-shrink-0 disabled:opacity-40"
                      aria-label="Remove"
                    >
                      {busyMember === m.user_id ? (
                        <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        CloseIcon
                      )}
                    </button>
                  )}
                </div>
              )
            })}

            {isGroup && (
              <div className="px-4 py-3 flex flex-col gap-2">
                <button
                  onClick={onAddMembers}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 font-semibold text-sm active:opacity-80"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add member
                </button>
                {currentUserId && chat.members.some((m) => m.user_id === currentUserId) && (
                  <button
                    onClick={() => removeMember(currentUserId)}
                    disabled={busyMember === currentUserId}
                    className="w-full text-red-500 rounded-xl py-3 font-semibold text-sm active:bg-red-50 disabled:opacity-40"
                  >
                    Leave group
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="border-t border-slate-100 pt-3 px-4 pb-4">
            <div className="flex gap-2">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    tab === t.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              {tab === 'photo' &&
                (photos.length ? (
                  <PhotoGallery photos={photos.map((m) => m.attachment_url!)} />
                ) : (
                  <Empty label="No photos yet" />
                ))}

              {tab === 'video' &&
                (videos.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {videos.map((m) => (
                      <video
                        key={m.id}
                        src={m.attachment_url}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-28 rounded-lg object-cover bg-black"
                      />
                    ))}
                  </div>
                ) : (
                  <Empty label="No videos yet" />
                ))}

              {tab === 'voice' &&
                (voice.length ? (
                  <div className="flex flex-col gap-2">
                    {voice.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                        <audio src={m.attachment_url} controls className="h-9 flex-1 min-w-0" />
                        <div className="flex flex-col items-end flex-shrink-0">
                          {m.attachment_meta?.duration != null && (
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {fmtDuration(m.attachment_meta.duration as number)}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">{fmtDate(m.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty label="No voice messages yet" />
                ))}

              {tab === 'file' &&
                (files.length ? (
                  <div className="flex flex-col gap-2">
                    {files.map((m) => (
                      <a
                        key={m.id}
                        href={m.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 bg-slate-100 rounded-xl px-3 py-2.5 active:opacity-80"
                      >
                        <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <path d="M14 2v6h6" />
                          </svg>
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 truncate">
                            {(m.attachment_meta?.name as string) || 'File'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {[fmtSize(m.attachment_meta?.size as number), fmtDate(m.created_at)]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <Empty label="No files yet" />
                ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="text-center text-sm text-slate-400 py-10">{label}</p>
}
