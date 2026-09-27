import { formatPercent } from '../lib/format'
import { ArrowDownIcon, ArrowUpIcon } from './Icons'

/** Change vs the previous period: arrow + color + text (so it doesn't rely on color alone) */
function Delta({ value, note }) {
  if (value == null) return null
  const up = value >= 0
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? 'text-up' : 'text-down'}`}>
        {up ? <ArrowUpIcon /> : <ArrowDownIcon />}
        {formatPercent(Math.abs(value))}
      </span>
      <span className="text-ink-3">{note}</span>
    </p>
  )
}

function KpiCard({ label, value, hint, delta, deltaNote, accent = false }) {
  return (
    <div
      className={`kpi relative overflow-hidden rounded-2xl border p-4 shadow-sm sm:p-5 ${
        accent ? 'bg-grad border-transparent text-white' : 'border-line bg-surface'
      }`}
    >
      <p className={`text-xs sm:text-sm ${accent ? 'text-white/80' : 'text-ink-2'}`}>{label}</p>
      <p className={`mt-1 text-[clamp(1.05rem,5.2vw,1.875rem)] leading-tight font-semibold tabular-nums sm:mt-2 ${accent ? 'text-white' : 'text-ink'}`}>
        {value}
      </p>
      {hint && <p className={`mt-1 text-xs ${accent ? 'text-white/70' : 'text-ink-3'}`}>{hint}</p>}
      {accent ? (
        delta != null && (
          <p className="mt-2 inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
            {delta >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {formatPercent(Math.abs(delta))}
            <span className="ml-1 font-normal text-white/80">{deltaNote}</span>
          </p>
        )
      ) : (
        <Delta value={delta} note={deltaNote} />
      )}
    </div>
  )
}

export default KpiCard
