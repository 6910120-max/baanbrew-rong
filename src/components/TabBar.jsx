import { useRef } from 'react'
import { useI18n } from '../lib/i18n'
import { TABS } from '../lib/useTab'

const ICONS = {
  overview: (
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  ),
  products: (
    <>
      <path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
      <path d="M6 2v2M10 2v2M14 2v2" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-4-6.3" />
    </>
  ),
}

/**
 * Tab bar (sticks to the top while scrolling): overview / products & time / customers
 * Uses role="tablist" so screen readers and the keyboard know these are tabs
 */
function TabBar({ tab, onChange: setTab }) {
  const { t } = useI18n()
  const anchorRef = useRef(null) // marks where the tab bar normally sits (before it sticks)

  // Switch tab: if the page is scrolled past the tab bar, jump back to the top of the new tab's content
  const onChange = (key) => {
    setTab(key)
    const top = anchorRef.current.getBoundingClientRect().top + window.scrollY
    if (window.scrollY > top) window.scrollTo({ top })
  }

  const onKeyDown = (e) => {
    const i = TABS.indexOf(tab)
    if (e.key === 'ArrowRight') onChange(TABS[(i + 1) % TABS.length])
    if (e.key === 'ArrowLeft') onChange(TABS[(i - 1 + TABS.length) % TABS.length])
  }

  return (
    <>
      <div ref={anchorRef} aria-hidden className="mb-0" />
      <div className="no-print sticky top-0 z-20 -mx-4 bg-page/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div
          role="tablist"
          aria-label={t('tabsLabel')}
          onKeyDown={onKeyDown}
          className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-surface p-1 shadow-sm sm:inline-grid sm:w-auto"
        >
          {TABS.map((key) => {
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-${key}`}
                aria-selected={active}
                aria-controls={`panel-${key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange(key)}
                className={`flex h-10 items-center justify-center gap-2 rounded-xl px-2 text-sm font-medium transition sm:px-5 ${
                  active ? 'bg-grad text-white shadow' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="hidden shrink-0 sm:block">
                  {ICONS[key]}
                </svg>
                {/* Short label on phones, full label on wider screens */}
                <span className="truncate sm:hidden">{t(`tab_${key}_short`)}</span>
                <span className="hidden truncate sm:inline">{t(`tab_${key}`)}</span>
              </button>
            )
          })}
        </div>
      </div>
      </>
  )
}

export default TabBar
