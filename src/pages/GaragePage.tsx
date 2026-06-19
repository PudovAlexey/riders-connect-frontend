import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGarage } from '../hooks/useGarage'
import PhotoPicker from '../components/PhotoPicker'
import type { Vehicle } from '../types'
import AppHeader from '../components/AppHeader'
import BottomSheet from '../components/BottomSheet'
import MaintenanceSheet from '../components/MaintenanceSheet'
import { serviceLabel } from '../lib/serviceCatalog'

const km = (n: number) => n.toLocaleString('ru-RU')

function MotoIcon({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size * 0.625}
      className={className}
    >
      <circle cx="12" cy="30" r="8" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle cx="52" cy="30" r="8" stroke="currentColor" strokeWidth="3" fill="none" />
      <path
        d="M20 30 L28 18 L38 18 L44 30"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M28 18 L32 10 L42 10 L44 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M20 30 L14 22 L22 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

const EMPTY_FORM = { make: '', model: '', year: '', mileage: '', color: '', notes: '', photos: [] as string[] }

export default function GaragePage() {
  const navigate = useNavigate()
  const { token, promptLogin } = useAuth()
  const { vehicles, loading, addVehicle, updateMileage, deleteVehicle, refresh } = useGarage()

  const [activeIdx, setActiveIdx] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editMileageId, setEditMileageId] = useState<string | null>(null)
  const [mileageDraft, setMileageDraft] = useState('')
  const [maintenanceVehicleId, setMaintenanceVehicleId] = useState<string | null>(null)

  // Browsing the garage is public, but creating a vehicle requires login
  const openForm = () => {
    if (!token) {
      promptLogin()
      return
    }
    setShowForm(true)
  }
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const sliderRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    const el = sliderRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    setActiveIdx(idx)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.make.trim() || !form.model.trim() || !form.year) return
    const data = {
      make: form.make.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      mileage: Number(form.mileage) || 0,
      color: form.color.trim(),
      notes: form.notes.trim(),
      photos: form.photos,
    }
    setForm(EMPTY_FORM)
    setShowForm(false)
    await addVehicle(data)
    setTimeout(() => {
      if (sliderRef.current) {
        sliderRef.current.scrollTo({ left: sliderRef.current.scrollWidth, behavior: 'smooth' })
      }
    }, 50)
  }

  const handleDelete = (id: string) => {
    deleteVehicle(id)
    setConfirmDelete(null)
    setActiveIdx((prev) => Math.max(0, prev - 1))
  }

  const closeForm = () => { setShowForm(false); setForm(EMPTY_FORM) }

  const startEditMileage = (v: Vehicle) => {
    setEditMileageId(v.id)
    setMileageDraft(String(v.mileage ?? 0))
  }
  const saveMileage = async (id: string) => {
    const next = Math.max(0, Number(mileageDraft) || 0)
    setEditMileageId(null)
    await updateMileage(id, next)
  }

  const maintenanceVehicle = vehicles.find((v) => v.id === maintenanceVehicleId)

  const field = (key: keyof typeof form, label: string, opts?: { type?: string; placeholder?: string; required?: boolean }) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}{opts?.required !== false && ' *'}</label>
      <input
        type={opts?.type ?? 'text'}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={opts?.placeholder ?? ''}
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <AppHeader
        onBack={() => navigate(-1)}
        title="Гараж"
        actions={
          <button
            onClick={openForm}
            className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white active:opacity-80 transition-opacity"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        }
      />

      <div className="flex-1 flex flex-col pb-24">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : vehicles.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5">
            <div className="text-primary opacity-60">
              <MotoIcon size={80} />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">Ваш гараж пуст</p>
              <p className="text-sm text-slate-500 mt-1">Добавьте свой первый мотоцикл</p>
            </div>
            <button
              onClick={openForm}
              className="bg-primary text-white rounded-xl px-6 py-3.5 font-semibold text-sm active:opacity-80 transition-opacity flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Добавить мотоцикл
            </button>
          </div>
        ) : (
          /* Slider */
          <div className="flex flex-col flex-1">
            <div
              ref={sliderRef}
              onScroll={handleScroll}
              className="flex flex-1 overflow-x-auto"
              style={{
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {vehicles.map((v: Vehicle) => (
                <div
                  key={v.id}
                  className="min-w-full flex-shrink-0 flex flex-col items-center justify-center px-6 py-8 gap-5"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className="bg-surface rounded-3xl shadow-sm w-full max-w-xs overflow-hidden flex flex-col items-center gap-4">
                    {v.photos?.length > 0 ? (
                      <img
                        src={v.photos[0]}
                        alt={`${v.make} ${v.model}`}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="text-primary pt-8">
                        <MotoIcon size={72} />
                      </div>
                    )}

                    <div className="text-center px-6">
                      <p className="text-2xl font-bold text-slate-900">{v.make} {v.model}</p>
                      <p className="text-slate-500 text-sm mt-1">
                        {v.year}{v.color ? ` · ${v.color}` : ''}
                      </p>
                      {v.notes && (
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">{v.notes}</p>
                      )}
                    </div>

                    {/* Mileage + maintenance */}
                    <div className="w-full px-6">
                      {editMileageId === v.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            autoFocus
                            value={mileageDraft}
                            onChange={(e) => setMileageDraft(e.target.value)}
                            className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <button
                            onClick={() => saveMileage(v.id)}
                            className="bg-primary text-white rounded-lg px-3 py-2 text-xs font-semibold active:opacity-80"
                          >
                            Сохранить
                          </button>
                          <button onClick={() => setEditMileageId(null)} className="text-slate-400 text-xs px-1">
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditMileage(v)}
                          className="flex items-center justify-center gap-1.5 w-full text-slate-500 text-sm active:text-primary"
                        >
                          <span className="font-semibold text-slate-900">{km(v.mileage ?? 0)} км</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-slate-400">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                      )}

                      {/* Most urgent tracked item */}
                      {(() => {
                        const items = v.service_items ?? []
                        if (items.length === 0) return null
                        const urgent = [...items].sort((a, b) => a.remaining_km - b.remaining_km)[0]
                        const pct =
                          urgent.interval_km > 0
                            ? Math.max(0, Math.min(1, urgent.remaining_km / urgent.interval_km))
                            : 0
                        const color =
                          urgent.status === 'overdue'
                            ? 'bg-red-500'
                            : urgent.status === 'soon'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        return (
                          <div className="mt-3 text-left">
                            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                              <span className="truncate">{serviceLabel(urgent)}</span>
                              <span className="flex-shrink-0 ml-2">
                                {urgent.remaining_km >= 0
                                  ? `${km(urgent.remaining_km)} км`
                                  : `${km(-urgent.remaining_km)} км сверх`}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct * 100}%` }} />
                            </div>
                          </div>
                        )
                      })()}

                      <button
                        onClick={() => setMaintenanceVehicleId(v.id)}
                        className="mt-3 w-full border border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-semibold active:bg-slate-50 flex items-center justify-center gap-2"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.1-.4-.4-2.1 2.6-2.6z" />
                        </svg>
                        Обслуживание{(v.service_items?.length ?? 0) > 0 ? ` (${v.service_items.length})` : ''}
                      </button>
                    </div>

                    {confirmDelete === v.id ? (
                      <div className="flex gap-2 w-full px-6 pb-8">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold active:bg-red-600"
                        >
                          Удалить
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-2.5 text-sm font-semibold"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(v.id)}
                        className="flex items-center gap-1.5 text-slate-400 text-xs active:text-red-400 transition-colors mb-8"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                        Убрать
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Dots */}
            {vehicles.length > 1 && (
              <div className="flex justify-center gap-2 pb-4">
                {vehicles.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-200 ${
                      i === activeIdx
                        ? 'w-5 h-2 bg-primary'
                        : 'w-2 h-2 bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add vehicle bottom sheet */}
      <BottomSheet open={showForm} onClose={closeForm}>
        <div className="px-4 pt-1 pb-2">
          <p className="text-lg font-bold text-slate-900">Добавить мотоцикл</p>
        </div>
        <form onSubmit={handleAdd} className="px-4 pb-8 space-y-3">
          <PhotoPicker
            photos={form.photos}
            onChange={(p) => setForm((f) => ({ ...f, photos: p }))}
            max={5}
          />
          {field('make', 'Марка', { placeholder: 'Honda', required: true })}
          {field('model', 'Модель', { placeholder: 'CB650R', required: true })}
          {field('year', 'Год', { type: 'number', placeholder: '2022', required: true })}
          {field('mileage', 'Пробег (км)', { type: 'number', placeholder: '12000', required: false })}
          {field('color', 'Цвет', { placeholder: 'Красный', required: false })}
          {field('notes', 'Заметки', { placeholder: 'Заметки (необязательно)', required: false })}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!form.make.trim() || !form.model.trim() || !form.year}
              className="flex-1 bg-primary text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 transition-opacity"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-3.5 font-semibold text-sm active:bg-slate-200"
            >
              Отмена
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Per-vehicle maintenance manager */}
      {maintenanceVehicle && (
        <MaintenanceSheet
          open={!!maintenanceVehicleId}
          vehicle={maintenanceVehicle}
          onClose={() => setMaintenanceVehicleId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
