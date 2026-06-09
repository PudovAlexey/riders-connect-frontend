import type { ReactNode } from 'react'
import { Sheet } from 'react-modal-sheet'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 'content' (default) sizes the sheet to its content; 'full' allows full height. */
  detent?: 'content' | 'full'
  /** Disable drag-to-dismiss (e.g. sheets that own their own gestures). */
  disableDrag?: boolean
  /** Show the grab handle at the top. Default true. */
  showHandle?: boolean
}

/**
 * Generic slide-up bottom sheet built on react-modal-sheet: gesture-driven
 * (drag-to-dismiss + spring open/close), capped to the app's 440px column and
 * themed via the `.react-modal-sheet-*` rules in index.css (follows light/dark
 * automatically). The public API is intentionally unchanged ({ open, onClose,
 * children }) so existing call sites keep working with no edits.
 */
export default function BottomSheet({
  open,
  onClose,
  children,
  detent = 'content',
  disableDrag = false,
  showHandle = true,
}: BottomSheetProps) {
  return (
    <Sheet isOpen={open} onClose={onClose} detent={detent} disableDrag={disableDrag} avoidKeyboard>
      <Sheet.Container role="dialog" aria-modal>
        {showHandle && <Sheet.Header />}
        <Sheet.Content>{children}</Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  )
}
