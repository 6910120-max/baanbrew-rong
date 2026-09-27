import { useEffect, useState } from 'react'

const STORAGE_KEY = 'baanbrew-settings'
const DEFAULTS = { lang: 'th', theme: 'green', mode: 'auto' }

export const THEMES = ['green', 'coffee', 'ocean']
export const MODES = ['light', 'dark', 'auto']

function readSaved() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

/**
 * Language / theme / mode settings, remembered in this browser (localStorage)
 * and applied to <html> as data-theme and data-mode so the CSS variables in index.css swap colors
 */
export function useSettings() {
  const [settings, setSettings] = useState(readSaved)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Private mode or storage blocked: just don't remember it
    }
    const root = document.documentElement
    root.lang = settings.lang
    root.dataset.theme = settings.theme

    // auto = follow the system setting and keep tracking when it changes
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      root.dataset.mode = settings.mode === 'auto' ? (media.matches ? 'dark' : 'light') : settings.mode
    }
    apply()
    if (settings.mode !== 'auto') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings])

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }))
  return [settings, update]
}
