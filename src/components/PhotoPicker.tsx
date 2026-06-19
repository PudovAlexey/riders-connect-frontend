import { useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  DragOverlay,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

async function compressImage(file: File): Promise<string> {
  const img = new Image()
  const url = URL.createObjectURL(file)
  await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = url })
  const MAX = 800, Q = 0.75
  const scale = Math.min(1, MAX / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(url)
  return canvas.toDataURL('image/jpeg', Q)
}

interface SortablePhotoProps {
  id: string
  url: string
  onDelete: () => void
  isDragging: boolean
}

function SortablePhoto({ id, url, onDelete, isDragging }: SortablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 touch-none"
      {...attributes}
      {...listeners}
    >
      <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-3 h-3">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

interface PhotoPickerProps {
  photos: string[]
  onChange: (photos: string[]) => void
  max?: number
}

export default function PhotoPicker({ photos, onChange, max = 5 }: PhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const ids = photos.map((_, i) => `photo-${i}`)

  const handleDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id))
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = ids.indexOf(String(active.id))
    const newIdx = ids.indexOf(String(over.id))
    if (oldIdx !== -1 && newIdx !== -1) onChange(arrayMove(photos, oldIdx, newIdx))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setLoading(true)
    try {
      const remaining = max - photos.length
      const toProcess = files.slice(0, remaining)
      const compressed = await Promise.all(toProcess.map(compressImage))
      onChange([...photos, ...compressed])
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const activeDragUrl = activeDragId
    ? photos[ids.indexOf(activeDragId)]
    : null

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-2">Фото (до {max})</label>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
            {photos.map((url, i) => (
              <SortablePhoto
                key={ids[i]}
                id={ids[i]}
                url={url}
                isDragging={activeDragId === ids[i]}
                onDelete={() => onChange(photos.filter((_, j) => j !== i))}
              />
            ))}
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeDragUrl ? (
              <div
                className="w-20 h-20 rounded-xl overflow-hidden shadow-xl"
                style={{ transform: 'scale(1.05) rotate(2deg)' }}
              >
                <img src={activeDragUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Add slot */}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-20 h-20 flex-shrink-0 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 active:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-xs">{photos.length}/{max}</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
