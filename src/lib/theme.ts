// Light/dark theme preference. Persisted in localStorage like the other
// settings flags (see sounds.ts / push.ts). The chosen theme is applied by
// toggling a `.dark` class on <html>; the slate palette and `surface` token
// (defined as CSS variables in index.css) flip under that class.

const THEME_KEY = 'theme'

export type Theme = 'light' | 'dark'

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

/** The user's stored choice, or null if they've never picked one. */
export function getStoredTheme(): Theme | null {
  const v = localStorage.getItem(THEME_KEY)
  return v === 'light' || v === 'dark' ? v : null
}

/** Theme to use on load: the stored choice, else the device preference. */
export function getInitialTheme(): Theme {
  return getStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light')
}

export function setStoredTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme)
}

/** Reflect the theme onto <html> so the CSS variables switch. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
