import { useEffect, useState } from 'react'

interface PhotoGalleryProps {
  photos: string[]
}

/**
 * Thumbnail grid that opens a tapped photo in a full-screen lightbox.
 * Tap a thumbnail to view it large; tap the backdrop / ✕ to close; ‹ › cycle
 * through multiple photos.
 */
export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [index, setIndex] = useState<number | null>(null)
  const open = index !== null

  // Lock body scroll and wire up keyboard while the lightbox is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndex(null)
      else if (e.key === 'ArrowRight') setIndex((i) => (i === null ? i : (i + 1) % photos.length))
      else if (e.key === 'ArrowLeft') setIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length))
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, photos.length])

  if (!photos.length) return null

  const go = (delta: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length))
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className="block w-full h-20 rounded-lg overflow-hidden active:opacity-80"
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setIndex(null)}
        >
          <button
            type="button"
            onClick={() => setIndex(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white"
            aria-label="Закрыть"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <img
            src={photos[index]}
            alt=""
            className="max-h-[88vh] max-w-[92vw] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
          />

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={go(-1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white text-2xl leading-none"
                aria-label="Назад"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={go(1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white text-2xl leading-none"
                aria-label="Вперёд"
              >
                ›
              </button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                {index + 1} / {photos.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
