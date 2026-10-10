import { formatNumber, formatPercent } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { retentionLevels } from '../lib/analytics'

/**
 * Cohort retention: one row per first-purchase month, one column per month since then.
 * Cell color = share of the cohort that came back (5 steps, relative to the other cells); empty = month not reached yet
 */
function CohortTable({ data }) {
  const { t, d } = useI18n()
  const { cohorts, average } = data
  const levelOf = retentionLevels(cohorts)
  const columns = average.length

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-separate border-spacing-[3px] text-center text-[11px] tabular-nums sm:text-xs">
        <thead>
          <tr className="text-ink-3">
            <th className="sticky left-0 bg-surface pr-2 text-left font-medium">{t('cohortMonth')}</th>
            <th className="font-medium">{t('cohortSize')}</th>
            {Array.from({ length: columns }, (_, i) => (
              <th key={i} className="font-medium">
                {t('cohortOffset', { n: i })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.month}>
              <th className="sticky left-0 whitespace-nowrap bg-surface pr-2 text-left font-medium text-ink-2">{d.month(c.month)}</th>
              <td className="text-ink-2">{formatNumber(c.size)}</td>
              {Array.from({ length: columns }, (_, i) => {
                const cell = c.cells[i]
                if (!cell) return <td key={i} />
                const level = i === 0 ? 4 : levelOf(cell.rate)
                return (
                  <td
                    key={i}
                    title={`${d.monthLong(c.month)} +${i}: ${formatNumber(cell.active)}/${formatNumber(c.size)}`}
                    className={`rounded-[4px] px-1 py-1.5 ${level >= 3 ? 'text-white' : 'text-ink'}`}
                    style={{ background: `var(--heat-${level})` }}
                  >
                    {formatPercent(cell.rate, 0)}
                  </td>
                )
              })}
            </tr>
          ))}
          <tr className="font-semibold text-ink">
            <th className="sticky left-0 bg-surface pr-2 pt-1 text-left">{t('cohortAverage')}</th>
            <td />
            {average.map((rate, i) => (
              <td key={i} className="pt-1">
                {rate == null ? '' : formatPercent(rate, 0)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default CohortTable
