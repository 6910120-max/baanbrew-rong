import { useState } from 'react'
import { formatBaht } from '../lib/format'
import { useI18n } from '../lib/i18n'

/**
 * Weekday × hour heatmap (plain HTML grid): one theme hue, light → dark by sales (sequential)
 * Hover or tap a cell to show the value in the line below
 */
function Heatmap({ matrix }) {
  const { t } = useI18n()
  const days = t('weekdays')
  const [active, setActive] = useState(null)
  const { hours, cells, max } = matrix

  // Color strength: linear 6%–100% of the theme color mixed with the surface color (more sales = more intense)
  const shade = (v) => {
    const ratio = max ? v / max : 0
    return `color-mix(in oklab, var(--c1) ${Math.round(6 + ratio * 94)}%, var(--surface))`
  }

  return (
    <div>
      <div
        className="grid gap-[3px] text-[11px] text-ink-3"
        style={{ gridTemplateColumns: `2.25rem repeat(${hours.length}, minmax(0, 1fr))` }}
        onMouseLeave={() => setActive(null)}
      >
        <span />
        {hours.map((h, i) => (
          <span key={h} className="text-center tabular-nums">
            {i % 2 === 0 ? h : ''}
          </span>
        ))}
        {days.map((day, di) => (
          <div key={day} className="contents">
            <span className="flex items-center">{day}</span>
            {hours.map((h, hi) => {
              const v = cells[di][hi]
              const isActive = active?.di === di && active?.hi === hi
              return (
                <button
                  key={h}
                  type="button"
                  aria-label={`${day} ${h}:00 ${formatBaht(v)}`}
                  onMouseEnter={() => setActive({ di, hi })}
                  onFocus={() => setActive({ di, hi })}
                  onClick={() => setActive({ di, hi })}
                  className={`aspect-square min-h-4 rounded-[4px] transition-transform ${
                    isActive ? 'scale-110 ring-2 ring-ink' : ''
                  }`}
                  style={{ background: shade(v) }}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="min-h-5 text-ink-2" aria-live="polite">
          {active ? (
            <>
              {days[active.di]} {String(hours[active.hi]).padStart(2, '0')}:00 ·{' '}
              <span className="font-semibold tabular-nums text-ink">{formatBaht(cells[active.di][active.hi])}</span>
            </>
          ) : (
            <span className="text-ink-3">{t('heatmapHint')}</span>
          )}
        </p>
        <div className="flex items-center gap-1.5 text-ink-3">
          ฿0
          <span
            className="h-2 w-20 rounded-full"
            style={{ background: `linear-gradient(90deg, ${shade(0)}, ${shade(max)})` }}
          />
          {formatBaht(max)}
        </div>
      </div>
    </div>
  )
}

export default Heatmap
