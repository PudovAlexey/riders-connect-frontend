import { useEffect, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * Generic slide-up bottom sheet: dimmed backdrop + rounded panel anchored to the
 * bottom, capped at the app's 440px width. Stays mounted so it animates both in
 * and out; tapping the backdrop closes it.
 */
export default function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  // Lock background scroll while the sheet is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <div
      className={`fixed inset-0 z-[4000] ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <div
          role="dialog"
          aria-modal="true"
          className={`w-full max-w-[440px] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
            open ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1" />
          {children}
        </div>
      </div>
    </div>
  )
}
