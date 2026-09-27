import { formatBaht } from '../lib/format'

/**
 * Shared tooltip: title on top, then one line per series
 * (with a color swatch when there's more than one series); value defaults to formatBaht
 */
function ChartTooltip({ active, payload, title, format = formatBaht, extra }) {
  if (!active || !payload?.length) return null
  const entries = payload.filter((p) => p.value != null)
  const showNames = entries.length > 1
  const point = payload[0].payload
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="text-ink-3">{title(point)}</p>
      {entries.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2">
          {showNames && (
            <>
              <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
              <span className="text-ink-2">{entry.name}</span>
            </>
          )}
          <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">{format(entry.value)}</span>
        </p>
      ))}
      {extra && <p className="mt-0.5 text-xs text-ink-3">{extra(point)}</p>}
    </div>
  )
}

export default ChartTooltip
