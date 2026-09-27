import { useState } from 'react'
import { formatBaht, formatBahtCompact } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { levelOf } from '../lib/metrics'

// 5 color steps (defined in index.css as --heat-0 … --heat-4, low → high)
const levelColor = (level) => `var(--heat-${level})`

/**
 * Weekday × hour heatmap (plain HTML grid) with 5 stepped levels (quantiles: about 20% of cells per level)
 * so each level reads clearly instead of a continuous gradient that's hard to tell apart
 * Hover or tap a cell to show the value and level in the line below
 */
function Heatmap({ matrix }) {
  const { t } = useI18n()
  const days = t('weekdays')
  const levelNames = t('heatLevels')
  const [active, setActive] = useState(null)
  const { hours, cells, thresholds } = matrix

  // Value range for each level, for the legend, e.g. "< ฿33k", "฿33k–43k", "≥ ฿60k"
  const ranges = levelNames.map((_, i) => {
    if (i === 0) return `< ${formatBahtCompact(thresholds[0])}`
    if (i === thresholds.length) return `≥ ${formatBahtCompact(thresholds[i - 1])}`
    return `${formatBahtCompact(thresholds[i - 1])}–${formatBahtCompact(thresholds[i]).slice(1)}`
  })

  const activeValue = active ? cells[active.di][active.hi] : null

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
              const level = levelOf(v, thresholds)
              const isActive = active?.di === di && active?.hi === hi
              return (
                <button
                  key={h}
                  type="button"
                  aria-label={`${day} ${h}:00 ${formatBaht(v)} (${levelNames[level]})`}
                  onMouseEnter={() => setActive({ di, hi })}
                  onFocus={() => setActive({ di, hi })}
                  onClick={() => setActive({ di, hi })}
                  className={`aspect-square min-h-4 rounded-[4px] transition-transform ${
                    isActive ? 'scale-110 ring-2 ring-ink' : ''
                  }`}
                  style={{ background: levelColor(level) }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend: 5 levels with a name and value range for each */}
      <ul className="mt-4 grid grid-cols-5 gap-1.5 text-[11px]">
        {levelNames.map((name, i) => (
          <li key={name} className="min-w-0">
            <span className="block h-2.5 rounded-sm" style={{ background: levelColor(i) }} />
            <span className="mt-1 block truncate font-medium text-ink-2">{name}</span>
            <span className="block truncate tabular-nums text-ink-3">{ranges[i]}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 min-h-5 text-xs text-ink-2" aria-live="polite">
        {active ? (
          <>
            {days[active.di]} {String(hours[active.hi]).padStart(2, '0')}:00 ·{' '}
            <span className="font-semibold tabular-nums text-ink">{formatBaht(activeValue)}</span>
            <span className="text-ink-3"> · {levelNames[levelOf(activeValue, thresholds)]}</span>
          </>
        ) : (
          <span className="text-ink-3">{t('heatmapHint')}</span>
        )}
      </p>
    </div>
  )
}

export default Heatmap
