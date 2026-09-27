import { useEffect, useState } from 'react'

const STORAGE_KEY = 'baanbrew-settings'

export const THEMES = ['green', 'coffee', 'ocean']
export const MODES = ['light', 'dark']

/** First visit (nothing saved yet): start from the device's setting, after that use whatever the user picks */
function systemMode() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function readSaved() {
  const defaults = { lang: 'th', theme: 'green', mode: systemMode() }
  try {
    const saved = { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
    if (!MODES.includes(saved.mode)) saved.mode = defaults.mode // e.g. the old 'auto' value
    return saved
  } catch {
    return defaults
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
    root.dataset.mode = settings.mode
  }, [settings])

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }))
  return [settings, update]
}
