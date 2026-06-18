import { useEffect, useState } from 'react'
import StarRating from './StarRating'
import PhotoPicker from './PhotoPicker'

export interface ReviewDraft {
  rating: number
  text: string
  photos: string[]
}

interface ReviewFormProps {
  /** Present = edit mode; seeds the fields from the user's existing review. */
  initial?: ReviewDraft
  onSubmit: (data: ReviewDraft) => Promise<void>
  onCancel: () => void
}

/**
 * Inline add/edit form for a point review: rating (required) + optional text +
 * up to 5 photos. Photos come from PhotoPicker as base64 data URLs and are
 * passed straight through to the API (same convention as EventForm/GaragePage).
 */
export default function ReviewForm({ initial, onSubmit, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [text, setText] = useState(initial?.text ?? '')
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Re-seed when the form is reused for a different review (add ↔ edit).
  useEffect(() => {
    setRating(initial?.rating ?? 0)
    setText(initial?.text ?? '')
    setPhotos(initial?.photos ?? [])
    setError('')
    setSaving(false)
  }, [initial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating < 1 || saving) return
    setSaving(true)
    setError('')
    try {
      await onSubmit({ rating, text: text.trim(), photos })
    } catch {
      setError('Не удалось сохранить отзыв')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 rounded-xl bg-slate-50 space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Ваша оценка</label>
        <StarRating value={rating} onChange={setRating} size={30} />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          Комментарий (необязательно)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Поделитесь впечатлением…"
          rows={3}
          maxLength={2000}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <PhotoPicker photos={photos} onChange={setPhotos} max={5} />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={rating < 1 || saving}
          className="flex-1 bg-primary text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40 transition-opacity"
        >
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-3 font-semibold text-sm active:bg-slate-200 disabled:opacity-40"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}
