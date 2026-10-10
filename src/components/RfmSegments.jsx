import { formatBaht, formatNumber, formatPercent } from '../lib/format'
import { useI18n } from '../lib/i18n'

/** RFM segments: headcount bar + share + description of what to do with each group */
function RfmSegments({ segments }) {
  const { t } = useI18n()
  const maxShare = Math.max(1, ...segments.map((s) => s.share))

  return (
    <ul className="space-y-3">
      {segments.map((s) => (
        <li key={s.key} className="rounded-xl bg-surface-2 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-medium text-ink">{t(`rfm_${s.key}`)}</p>
            <p className="shrink-0 text-sm tabular-nums text-ink">
              <span className="font-semibold">{t('people', { count: formatNumber(s.count) })}</span>
              <span className="text-ink-3"> · {formatPercent(s.share)}</span>
            </p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full"
              style={{ width: `${(s.share / maxShare) * 100}%`, background: 'var(--grad-bar)' }}
            />
          </div>
          <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-ink-3">
            <span>{t(`rfm_${s.key}_desc`)}</span>
            <span className="tabular-nums">
              {t('colAvgSpend')} {formatBaht(s.avgSpend)}
            </span>
          </p>
        </li>
      ))}
    </ul>
  )
}

export default RfmSegments
