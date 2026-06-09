import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { updateMe, uploadMedia } from '../api'
import AppHeader from '../components/AppHeader'

export default function ProfileEditPage() {
  const { user, updateUser, promptLogin } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const blobUrlRef = useRef<string | null>(null)

  const [nameInput, setNameInput] = useState(user?.name ?? '')
  const [usernameInput, setUsernameInput] = useState(user?.username ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Revoke any local preview blob URL on unmount
  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    },
    [],
  )

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface px-8 gap-5">
        <p className="text-slate-500 text-sm">Sign in to edit your profile</p>
        <button
          onClick={promptLogin}
          className="w-full max-w-xs bg-primary text-white rounded-xl py-3.5 font-semibold text-base active:bg-primary-dark transition-colors"
        >
          Sign in
        </button>
      </div>
    )
  }

  const initial = (nameInput || user.email || '?')[0].toUpperCase()

  const revokeBlob = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }

  const handlePickPhoto = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset the input so picking the same file again re-triggers change
    e.target.value = ''
    if (!file) return

    // Immediate local preview
    revokeBlob()
    const preview = URL.createObjectURL(file)
    blobUrlRef.current = preview
    setAvatarUrl(preview)
    setError('')
    setUploading(true)
    try {
      const res = await uploadMedia(file)
      revokeBlob()
      setAvatarUrl(res.data.url)
    } catch {
      revokeBlob()
      setAvatarUrl(user.avatar_url ?? '')
      setError('Could not upload photo')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim() || uploading) return
    const cleanUsername = usernameInput.trim().replace(/^@/, '').toLowerCase()
    if (cleanUsername && !/^[a-z0-9_]{3,32}$/.test(cleanUsername)) {
      setError('Login must be 3–32 chars: a–z, 0–9, _')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await updateMe({
        name: nameInput.trim(),
        avatar_url: avatarUrl,
        ...(cleanUsername && cleanUsername !== user.username ? { username: cleanUsername } : {}),
      })
      updateUser(res.data)
      navigate('/profile')
    } catch (err: any) {
      if (err?.response?.status === 409) setError('That login is already taken')
      else if (err?.response?.status === 400) setError('Invalid login')
      else setError('Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <AppHeader onBack={() => navigate('/profile')} title="Edit profile" />

      <form onSubmit={handleSave} className="flex-1 px-4 py-4 space-y-3 pb-24">
        {/* Avatar */}
        <div className="bg-surface rounded-2xl shadow-sm overflow-hidden px-4 py-6 flex flex-col items-center">
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-primary flex items-center justify-center shadow-md shadow-orange-100">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-4xl font-bold">{initial}</span>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-7 h-7 animate-spin">
                  <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={handlePickPhoto}
            disabled={uploading}
            className="mt-3 text-sm font-semibold text-primary disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
        </div>

        {/* Fields */}
        <div className="bg-surface rounded-2xl shadow-sm overflow-hidden px-4 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Display name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Login</label>
            <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary">
              <span className="text-slate-400 text-sm">@</span>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="login"
                autoCapitalize="none"
                autoCorrect="off"
                className="flex-1 ml-1 text-slate-900 focus:outline-none text-sm bg-transparent"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Others can add you to chats by this login</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
            <div className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 text-slate-400 text-sm truncate">
              {user.email}
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={saving || uploading || !nameInput.trim()}
          className="w-full bg-primary text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  )
}
