import { formatBaht } from '../lib/format'

/** Shared tooltip: title on top, then one line per series (with a color swatch when there's more than one) */
function ChartTooltip({ active, payload, title }) {
  if (!active || !payload?.length) return null
  const entries = payload.filter((p) => p.value != null)
  const showNames = entries.length > 1
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md dark:border-stone-700 dark:bg-stone-800">
      <p className="text-stone-500 dark:text-stone-400">{title(payload[0].payload)}</p>
      {entries.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2">
          {showNames && (
            <>
              <span className="h-0.5 w-3 rounded" style={{ background: entry.color }} />
              <span className="text-stone-600 dark:text-stone-300">{entry.name}</span>
            </>
          )}
          <span className="ml-auto pl-3 font-semibold tabular-nums text-stone-900 dark:text-stone-50">
            {formatBaht(entry.value)}
          </span>
        </p>
      ))}
    </div>
  )
}

export default ChartTooltip
