import { useEffect, useState } from 'react'

export const TABS = ['overview', 'products', 'customers']
const STORAGE_KEY = 'baanbrew-tab'

/** Read the tab from the URL (#customers) first, then the last tab used in this browser, otherwise overview */
function initialTab() {
  const fromHash = window.location.hash.slice(1)
  if (TABS.includes(fromHash)) return fromHash
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (TABS.includes(saved)) return saved
  } catch {
    // storage blocked: just use the default
  }
  return TABS[0]
}

/**
 * The currently open tab, kept in sync with the URL hash so you can link straight to a tab
 * e.g. baanbrew-rong.vercel.app/#customers, and remembered for the next visit
 */
export function useTab() {
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
    try {
      localStorage.setItem(STORAGE_KEY, tab)
    } catch {
      // storage blocked: don't remember it
    }
  }, [tab])

  // The user edits the URL or presses back/forward -> follow the hash
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.slice(1)
      if (TABS.includes(h)) setTab(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return [tab, setTab]
}
