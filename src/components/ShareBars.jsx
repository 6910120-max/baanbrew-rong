import { formatBaht, formatPercent } from '../lib/format'

/** Share bars (plain HTML): name · bar · % on the right, with baht amount underneath */
function ShareBars({ title, data, formatKey = (k) => k }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-ink-2">{title}</h3>
      <ul className="space-y-2.5">
        {data.map((d) => (
          <li key={d.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink">{formatKey(d.key)}</span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">{formatPercent(d.share)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full" style={{ width: `${d.share}%`, background: 'var(--grad-bar)' }} />
            </div>
            <p className="mt-0.5 text-right text-xs tabular-nums text-ink-3">{formatBaht(d.sales)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ShareBars
