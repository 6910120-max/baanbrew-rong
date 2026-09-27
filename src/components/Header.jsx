import { useI18n } from '../lib/i18n'
import { MODES, THEMES } from '../lib/useSettings'
import CsvFileButton from './CsvFileButton'
import { CoffeeIcon, MoonIcon, PrintIcon, SunIcon } from './Icons'

// Swatch color for each theme (shown on the picker button)
const SWATCH = {
  green: 'linear-gradient(135deg, #047857, #10b981)',
  coffee: 'linear-gradient(135deg, #78350f, #d97706)',
  ocean: 'linear-gradient(135deg, #1e3a8a, #0891b2)',
}
const THEME_LABEL = { green: 'themeGreen', coffee: 'themeCoffee', ocean: 'themeOcean' }
const MODE_ICON = { light: SunIcon, dark: MoonIcon }
const MODE_LABEL = { light: 'modeLight', dark: 'modeDark' }

/** Frosted-glass button group on top of the gradient */
function Segmented({ label, children }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-0.5 rounded-xl bg-black/20 p-0.5">
      {children}
    </div>
  )
}

function SegButton({ active, label, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-semibold transition ${
        active ? 'bg-white text-gray-900 shadow' : 'text-white/85 hover:bg-white/15'
      } ${className}`}
    >
      {children}
    </button>
  )
}

/** Header with a gradient background: title + data range + controls (language, theme, mode, file, print) */
function Header({ settings, onChange, subtitle, stats = [], onFile, showFileButton }) {
  const { t } = useI18n()

  return (
    <header className="bg-grad relative overflow-hidden text-white">
      {/* Soft light blobs for depth on top of the gradient */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 sm:pb-20">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <CoffeeIcon />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('appTitle')}</h1>
            <p className="text-sm text-white/80">{subtitle ?? t('appSubtitle')}</p>
            {stats.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {stats.map((s) => (
                  <li key={s.label} className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs text-white ring-1 ring-white/20">
                    <span className="font-semibold tabular-nums">{s.value}</span> {s.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <Segmented label={t('language')}>
            {['th', 'en'].map((lang) => (
              <SegButton key={lang} active={settings.lang === lang} label={lang.toUpperCase()} onClick={() => onChange({ lang })}>
                {lang.toUpperCase()}
              </SegButton>
            ))}
          </Segmented>

          <Segmented label={t('colorTheme')}>
            {THEMES.map((theme) => (
              <SegButton
                key={theme}
                active={settings.theme === theme}
                label={t(THEME_LABEL[theme])}
                onClick={() => onChange({ theme })}
              >
                <span className="h-4 w-4 rounded-full ring-2 ring-white/70" style={{ background: SWATCH[theme] }} />
                <span className="sr-only">{t(THEME_LABEL[theme])}</span>
              </SegButton>
            ))}
          </Segmented>

          <Segmented label={t('mode')}>
            {MODES.map((mode) => {
              const Icon = MODE_ICON[mode]
              return (
                <SegButton key={mode} active={settings.mode === mode} label={t(MODE_LABEL[mode])} onClick={() => onChange({ mode })}>
                  <Icon />
                  <span className="sr-only">{t(MODE_LABEL[mode])}</span>
                </SegButton>
              )
            })}
          </Segmented>

          {showFileButton && (
            <CsvFileButton onFile={onFile} variant="glass" iconOnly>
              {t('changeFile')}
            </CsvFileButton>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            title={t('print')}
            className="hidden h-9 w-9 place-items-center rounded-xl bg-white/15 sm:grid text-white transition hover:bg-white/25"
          >
            <PrintIcon />
            <span className="sr-only">{t('print')}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
