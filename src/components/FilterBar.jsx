import { useI18n } from '../lib/i18n'
import { PRESETS } from '../lib/presets'

const fieldClass =
  'h-9 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand'

function Field({ label, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-ink-3">
      {label}
      {children}
    </label>
  )
}

/**
 * Filter bar: period (presets or custom dates) + branch + channel
 * Every KPI and chart recalculates from these filters
 */
function FilterBar({ filters, onChange, bounds, branches, channels }) {
  const { t, tv, d } = useI18n()

  return (
    <div className="no-print rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 lg:flex-1">
          <p className="mb-1 text-xs text-ink-3">{t('period')}</p>
          <div role="group" aria-label={t('period')} className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1 sm:inline-flex">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={filters.preset === p.key}
                onClick={() => onChange({ preset: p.key })}
                className={`h-7 whitespace-nowrap rounded-lg px-3 text-sm transition ${
                  filters.preset === p.key ? 'bg-brand font-semibold text-white shadow-sm' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {t(p.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[34rem]">
          <Field label={t('from')}>
            <input
              type="date"
              className={fieldClass}
              value={filters.from}
              min={bounds.min}
              max={filters.to}
              onChange={(e) => e.target.value && onChange({ preset: 'custom', from: e.target.value })}
            />
          </Field>
          <Field label={t('to')}>
            <input
              type="date"
              className={fieldClass}
              value={filters.to}
              min={filters.from}
              max={bounds.max}
              onChange={(e) => e.target.value && onChange({ preset: 'custom', to: e.target.value })}
            />
          </Field>
          <Field label={t('branch')}>
            <select className={fieldClass} value={filters.branch} onChange={(e) => onChange({ branch: e.target.value })}>
              <option value="all">{t('allBranches')}</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {tv(b)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('channel')}>
            <select className={fieldClass} value={filters.channel} onChange={(e) => onChange({ channel: e.target.value })}>
              <option value="all">{t('allChannels')}</option>
              {channels.map((c) => (
                <option key={c} value={c}>
                  {tv(c)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink-3">{t('presetNote', { date: d.shortDate(bounds.max) })}</p>
    </div>
  )
}

export default FilterBar
