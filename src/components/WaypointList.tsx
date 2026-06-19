import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RoutePoint } from '../types'

interface WaypointListProps {
  points: RoutePoint[]
  onReorder: (next: RoutePoint[]) => void
  onRename: (index: number, name: string) => void
  onRemove: (index: number) => void
}

interface RowProps {
  id: string
  index: number
  point: RoutePoint
  onRename: (index: number, name: string) => void
  onRemove: (index: number) => void
}

function SortableWaypoint({ id, index, point, onRename, onRemove }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center gap-2 bg-surface rounded-xl px-2 py-2 shadow-sm"
    >
      <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <input
          value={point.name}
          onChange={(e) => onRename(index, e.target.value)}
          placeholder={`Точка ${index + 1}`}
          className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
        />
        {point.address && <p className="text-xs text-slate-400 truncate">{point.address}</p>}
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(index)}
        aria-label="Удалить точку"
        className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100 flex-shrink-0"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      {/* Drag handle — listeners live here so the name input stays tappable. */}
      <span
        {...listeners}
        className="w-7 h-7 flex items-center justify-center text-slate-300 cursor-grab touch-none flex-shrink-0"
        aria-label="Переместить"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
        </svg>
      </span>
    </div>
  )
}

export default function WaypointList({ points, onReorder, onRename, onRemove }: WaypointListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const ids = points.map((_, i) => `wp-${i}`)

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = ids.indexOf(String(active.id))
    const newIdx = ids.indexOf(String(over.id))
    if (oldIdx !== -1 && newIdx !== -1) onReorder(arrayMove(points, oldIdx, newIdx))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {points.map((p, i) => (
            <SortableWaypoint
              key={ids[i]}
              id={ids[i]}
              index={i}
              point={p}
              onRename={onRename}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
