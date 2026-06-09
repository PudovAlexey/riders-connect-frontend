import BottomSheet from './BottomSheet'
import type { Message } from '../types'

interface Props {
  msg: Message | null
  isMine: boolean
  onEdit: () => void
  onDeleteMe: () => void
  onDeleteAll: () => void
  onClose: () => void
}

/**
 * Action sheet shown on long-press of a message. Available actions depend on
 * ownership and message type:
 *  - own text  → Edit, Delete for me, Delete for everyone
 *  - own media → Delete for me, Delete for everyone
 *  - others'   → Delete for me
 */
export default function MessageActionsSheet({
  msg,
  isMine,
  onEdit,
  onDeleteMe,
  onDeleteAll,
  onClose,
}: Props) {
  const isText = !msg?.message_type || msg.message_type === 'text'
  const canEdit = isMine && isText

  return (
    <BottomSheet open={!!msg} onClose={onClose}>
      <div className="pb-[env(safe-area-inset-bottom)]">
        {canEdit && (
          <button
            onClick={onEdit}
            className="w-full flex items-center gap-3 px-5 py-4 text-slate-900 active:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-slate-500">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span className="text-sm font-medium">Редактировать</span>
          </button>
        )}

        <button
          onClick={onDeleteMe}
          className="w-full flex items-center gap-3 px-5 py-4 text-slate-900 active:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-slate-500">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
          </svg>
          <span className="text-sm font-medium">Удалить у себя</span>
        </button>

        {isMine && (
          <button
            onClick={onDeleteAll}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-500 active:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
            </svg>
            <span className="text-sm font-medium">Удалить у всех</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full px-5 py-4 text-slate-500 text-sm font-medium border-t border-slate-100 active:bg-slate-100"
        >
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}
