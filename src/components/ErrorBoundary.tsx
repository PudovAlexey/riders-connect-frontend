import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * App-wide safety net: catches any uncaught render error and shows a simple
 * "reload" screen instead of an empty white page. Without this, a single throw
 * anywhere in the tree unmounts the whole app and leaves a blank screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Keep the detail in the console for debugging; the user sees the fallback.
    console.error('Uncaught app error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center bg-slate-50">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7 text-primary">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Something went wrong</p>
          <p className="text-sm text-slate-400 mt-1">Please reload the app to continue.</p>
        </div>
        <button
          onClick={() => window.location.assign('/')}
          className="bg-primary text-white rounded-xl px-6 py-3 font-semibold text-sm active:opacity-80"
        >
          Reload
        </button>
      </div>
    )
  }
}
