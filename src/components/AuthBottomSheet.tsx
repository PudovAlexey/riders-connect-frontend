import { useEffect, useState } from 'react'
import { sendCode, verify } from '../api'
import { useAuth } from '../hooks/useAuth'
import BottomSheet from './BottomSheet'

/**
 * Login flow as a bottom sheet. Two steps — email → verification code — slide
 * horizontally like the reference AuthBottomSheet. Opened globally via
 * useAuth().promptLogin(); closes itself on successful login.
 */
export default function AuthBottomSheet() {
  const { authOpen, closeAuth, login } = useAuth()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const showCode = step === 'code'

  // Reset everything whenever the sheet is closed
  useEffect(() => {
    if (!authOpen) {
      setStep('email')
      setEmail('')
      setCode('')
      setError('')
      setLoading(false)
    }
  }, [authOpen])

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendCode(email.trim().toLowerCase())
      setStep('code')
    } catch {
      setError('Failed to send code. Check your email.')
    } finally {
      setLoading(false)
    }
  }

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await verify(email.trim().toLowerCase(), code.trim())
      login(res.data.token, res.data.user) // also closes the sheet
    } catch {
      setError('Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  const backToEmail = () => {
    setStep('email')
    setError('')
    setCode('')
  }

  return (
    <BottomSheet open={authOpen} onClose={closeAuth}>
      {/* Header */}
      <div className="flex items-center px-4 pt-2 pb-1">
        {showCode ? (
          <button
            onClick={backToEmail}
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 active:bg-slate-100 transition-colors"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}
        <div className="flex-1" />
        <button
          onClick={closeAuth}
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center px-6 pt-2 pb-4 text-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-orange-200">
          <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Riders Connect</h1>
        <p className="text-slate-500 mt-0.5 text-sm">Find riders near you</p>
      </div>

      {/* Sliding steps */}
      <div className="relative overflow-hidden">
        {/* Email step */}
        <div
          className="px-6 pb-8 transition-all duration-300 ease-out"
          style={{
            opacity: showCode ? 0 : 1,
            transform: showCode ? 'translateX(-100%)' : 'translateX(0)',
            position: showCode ? 'absolute' : 'relative',
            top: 0,
            left: 0,
            width: '100%',
            pointerEvents: showCode ? 'none' : 'auto',
          }}
        >
          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                autoFocus={!showCode}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
              />
            </div>
            {!showCode && error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-50 active:bg-primary-dark transition-colors"
            >
              {loading ? 'Sending...' : 'Continue'}
            </button>
          </form>
        </div>

        {/* Code step */}
        <div
          className="px-6 pb-8 transition-all duration-300 ease-out"
          style={{
            opacity: showCode ? 1 : 0,
            transform: showCode ? 'translateX(0)' : 'translateX(100%)',
            position: showCode ? 'relative' : 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            pointerEvents: showCode ? 'auto' : 'none',
          }}
        >
          <form onSubmit={handleCode} className="space-y-4">
            <div className="text-center mb-1">
              <p className="text-slate-600 text-sm">
                We sent a code to{' '}
                <span className="font-medium text-slate-900">{email}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base tracking-widest text-center text-xl"
              />
            </div>
            {showCode && error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-50 active:bg-primary-dark transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </div>
      </div>
    </BottomSheet>
  )
}
