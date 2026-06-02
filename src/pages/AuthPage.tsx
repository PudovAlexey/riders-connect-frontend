import { useState } from 'react'
import { sendCode, verify } from '../api'
import { useAuth } from '../hooks/useAuth'

type Step = 'email' | 'code'

export default function AuthPage() {
  const { login } = useAuth()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      login(res.data.token, res.data.user)
    } catch {
      setError('Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
            <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Riders Connect</h1>
          <p className="text-slate-500 mt-1 text-sm">Find riders near you</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmail} className="w-full max-w-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-50 active:bg-primary-dark transition-colors"
            >
              {loading ? 'Sending...' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCode} className="w-full max-w-sm space-y-4">
            <div className="text-center mb-2">
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
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-50 active:bg-primary-dark transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); setCode('') }}
              className="w-full text-slate-500 text-sm py-2"
            >
              ← Change email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
