import { useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGarage } from '../hooks/useGarage'
import PhotoPicker from '../components/PhotoPicker'
import type { Vehicle } from '../types'

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

const EMPTY_FORM = { make: '', model: '', year: '', color: '', notes: '', photos: [] as string[] }

export default function GaragePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()
  const { vehicles, loading, addVehicle, deleteVehicle } = useGarage()

  const [activeIdx, setActiveIdx] = useState(0)
  const [showForm, setShowForm] = useState(false)

  // Browsing the garage is public, but creating a vehicle requires login
  const openForm = () => {
    if (!token) {
      navigate('/auth', { state: { from: location } })
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
      {/* Top bar */}
      <div className="bg-white px-4 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-slate-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 text-slate-600">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-slate-900">My Garage</h1>
        </div>
        <button
          onClick={openForm}
          className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white active:opacity-80 transition-opacity"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

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
              <p className="text-lg font-bold text-slate-900">Your garage is empty</p>
              <p className="text-sm text-slate-500 mt-1">Add your first motorcycle</p>
            </div>
            <button
              onClick={openForm}
              className="bg-primary text-white rounded-xl px-6 py-3.5 font-semibold text-sm active:opacity-80 transition-opacity flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add motorcycle
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
                  <div className="bg-white rounded-3xl shadow-sm w-full max-w-xs overflow-hidden flex flex-col items-center gap-4">
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

                    {confirmDelete === v.id ? (
                      <div className="flex gap-2 w-full px-6 pb-8">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold active:bg-red-600"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-2.5 text-sm font-semibold"
                        >
                          Cancel
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
                        Remove
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
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
            <div className="w-full max-w-[440px] bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="px-4 pt-5 pb-2 flex-shrink-0">
                <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
                <p className="text-lg font-bold text-slate-900">Add motorcycle</p>
              </div>
              <form onSubmit={handleAdd} className="overflow-y-auto px-4 pb-8 space-y-3 flex-1">
                <PhotoPicker
                  photos={form.photos}
                  onChange={(p) => setForm((f) => ({ ...f, photos: p }))}
                  max={5}
                />
                {field('make', 'Make', { placeholder: 'Honda', required: true })}
                {field('model', 'Model', { placeholder: 'CB650R', required: true })}
                {field('year', 'Year', { type: 'number', placeholder: '2022', required: true })}
                {field('color', 'Color', { placeholder: 'Red', required: false })}
                {field('notes', 'Notes', { placeholder: 'Optional notes…', required: false })}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={!form.make.trim() || !form.model.trim() || !form.year}
                    className="flex-1 bg-primary text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 transition-opacity"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                    className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-3.5 font-semibold text-sm active:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
