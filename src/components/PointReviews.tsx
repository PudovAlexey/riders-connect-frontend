import { useEffect, useMemo, useState } from 'react'
import { getPointReviews, savePointReview, deletePointReview } from '../api'
import { useAuth } from '../hooks/useAuth'
import type { PointReview } from '../types'
import StarRating from './StarRating'
import PhotoGallery from './PhotoGallery'
import ReviewForm, { type ReviewDraft } from './ReviewForm'

interface PointReviewsProps {
  pointId: string
  /** Server aggregates from the list view — shown instantly until the fetch resolves. */
  fallbackAvg?: number
  fallbackCount?: number
  onToast?: (msg: string) => void
  /** Called when a logged-out user wants to review, so the host can close the
   *  point card before opening the auth sheet (avoids it stacking behind). */
  onRequireAuth?: () => void
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Avatar({ name, url }: { name: string; url?: string }) {
  const letter = name ? name.charAt(0).toUpperCase() : '?'
  return (
    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-indigo-500 font-semibold text-sm">{letter}</span>
      )}
    </div>
  )
}

function ReviewItem({ review }: { review: PointReview }) {
  return (
    <div className="py-3 border-t border-slate-100">
      <div className="flex items-center gap-2.5">
        <Avatar name={review.name} url={review.avatar_url} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{review.name || 'Райдер'}</p>
          <div className="flex items-center gap-2">
            <StarRating value={review.rating} size={13} />
            <span className="text-xs text-slate-400">{fmtDate(review.created_at)}</span>
          </div>
        </div>
      </div>
      {review.text && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{review.text}</p>}
      {review.photos?.length > 0 && (
        <div className="mt-2">
          <PhotoGallery photos={review.photos} />
        </div>
      )}
    </div>
  )
}

/**
 * Reviews block for the point-detail sheet: rating summary, the current user's
 * own review (with edit/delete) plus an inline add/edit form, and the list of
 * everyone else's reviews. Owns its own data, keyed by `pointId`.
 */
export default function PointReviews({ pointId, fallbackAvg, fallbackCount, onToast, onRequireAuth }: PointReviewsProps) {
  const { user, promptLogin } = useAuth()
  const [reviews, setReviews] = useState<PointReview[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFormOpen(false)
    setConfirmDelete(false)
    getPointReviews(pointId)
      .then((r) => { if (!cancelled) setReviews(r.data) })
      .catch(() => { if (!cancelled) setReviews([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pointId])

  const myReview = user ? reviews.find((r) => r.user_id === user.id) ?? null : null
  const others = useMemo(
    () => (myReview ? reviews.filter((r) => r.id !== myReview.id) : reviews),
    [reviews, myReview],
  )

  // Summary is computed from the fetched list (authoritative) once loaded; the
  // server fallbacks only fill the gap before the first fetch resolves.
  const count = loading ? (fallbackCount ?? 0) : reviews.length
  const avg = loading
    ? (fallbackAvg ?? 0)
    : reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0

  const handleSave = async (data: ReviewDraft) => {
    await savePointReview(pointId, data)
    const r = await getPointReviews(pointId)
    setReviews(r.data)
    setFormOpen(false)
    onToast?.('Отзыв сохранён')
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deletePointReview(pointId)
      const r = await getPointReviews(pointId)
      setReviews(r.data)
      setConfirmDelete(false)
      onToast?.('Отзыв удалён')
    } catch {
      onToast?.('Не удалось удалить отзыв')
    } finally {
      setBusy(false)
    }
  }

  const startAdd = () => {
    if (!user) { (onRequireAuth ?? promptLogin)(); return }
    setFormOpen(true)
  }

  return (
    <div className="mt-5 pt-4 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-slate-900">Отзывы</p>
        {count > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating value={avg} size={16} />
            <span className="text-sm font-semibold text-slate-700">{avg.toFixed(1)}</span>
            <span className="text-sm text-slate-400">({count})</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* The current user's own review + add/edit affordances */}
          {formOpen ? (
            <ReviewForm
              initial={myReview ? { rating: myReview.rating, text: myReview.text, photos: myReview.photos } : undefined}
              onSubmit={handleSave}
              onCancel={() => setFormOpen(false)}
            />
          ) : myReview ? (
            <div className="mt-3 p-3 rounded-xl bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">Ваш отзыв</p>
                <StarRating value={myReview.rating} size={14} />
              </div>
              {myReview.text && <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{myReview.text}</p>}
              {myReview.photos?.length > 0 && (
                <div className="mt-2">
                  <PhotoGallery photos={myReview.photos} />
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setFormOpen(true)}
                  className="flex-1 bg-slate-100 text-slate-700 rounded-lg py-2 text-sm font-medium active:bg-slate-200"
                >
                  Изменить
                </button>
                {confirmDelete ? (
                  <button
                    onClick={handleDelete}
                    disabled={busy}
                    className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-semibold active:bg-red-600 disabled:opacity-50"
                  >
                    {busy ? 'Удаляем…' : 'Удалить?'}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex-1 bg-slate-100 text-slate-700 rounded-lg py-2 text-sm font-medium active:bg-slate-200"
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={startAdd}
              className="w-full mt-3 bg-primary/10 text-primary rounded-xl py-2.5 text-sm font-semibold active:bg-primary/20 transition-colors"
            >
              Оставить отзыв
            </button>
          )}

          {/* Everyone else's reviews */}
          {others.length > 0 ? (
            <div className="mt-3">
              {others.map((r) => (
                <ReviewItem key={r.id} review={r} />
              ))}
            </div>
          ) : (
            !myReview && <p className="text-sm text-slate-400 mt-4 text-center">Пока нет отзывов</p>
          )}
        </>
      )}
    </div>
  )
}
