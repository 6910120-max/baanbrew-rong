import { useMemo } from 'react'
import ChartCard from './ChartCard'
import RfmSegments from './RfmSegments'
import CohortTable from './CohortTable'
import AbcChart from './AbcChart'
import { formatBaht, formatNumber, formatPercent } from '../lib/format'
import { useI18n } from '../lib/i18n'

/** Analytics tab: RFM scoring, cohort retention and ABC analysis (data computed in App from the current filters) */
function AnalyticsTab({ analytics, products }) {
  const { t, d } = useI18n()
  const { rfm, cohort, abc } = analytics
  const names = useMemo(() => new Map(products.map((p) => [p.product_id?.trim(), p.product_name?.trim()])), [products])
  const nameOf = (key) => names.get(key) ?? key

  return (
    <>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <ChartCard
          title={t('rfm5Title')}
          subtitle={t('rfm5Sub')}
          filename="rfm-scores"
          footer={t('rfm5Footer')}
          table={{
            columns: [
              { key: 'key', label: t('colGroup'), align: 'left', format: (v) => t(`rfm5_${v}`), csv: (r) => t(`rfm5_${r.key}`) },
              { key: 'count', label: t('colMembers'), format: (v) => formatNumber(v) },
              { key: 'share', label: t('colShare'), format: (v) => formatPercent(v), csv: (r) => r.share.toFixed(2) },
              { key: 'sales', label: t('colSales'), format: (v) => formatBaht(v), csv: (r) => Math.round(r.sales) },
              { key: 'avgSpend', label: t('colAvgSpend'), format: (v) => formatBaht(v), csv: (r) => Math.round(r.avgSpend) },
              { key: 'avgRecency', label: 'R (days)', format: (v) => formatNumber(v, 0), csv: (r) => Math.round(r.avgRecency) },
              { key: 'avgFrequency', label: 'F (bills)', format: (v) => formatNumber(v, 1), csv: (r) => r.avgFrequency.toFixed(1) },
            ],
            rows: rfm.segments,
          }}
        >
          {rfm.members.length ? <RfmSegments segments={rfm.segments} prefix="rfm5" /> : <p className="text-sm text-ink-3">{t('cohortNone')}</p>}
        </ChartCard>

        <ChartCard
          title={t('abcTitle')}
          subtitle={t('abcSub')}
          filename="abc-products"
          footer={`${t('abcFooter')} · ${t('abcNote')}`}
          table={{
            columns: [
              { key: 'rank', label: t('colRank'), align: 'left' },
              { key: 'key', label: t('colProduct'), align: 'left' },
              { key: 'name', label: t('colName'), align: 'left' },
              { key: 'cls', label: t('colClass') },
              { key: 'sales', label: t('colSales'), format: (v) => formatBaht(v), csv: (r) => Math.round(r.sales) },
              { key: 'share', label: t('colShare'), format: (v) => formatPercent(v), csv: (r) => r.share.toFixed(2) },
              { key: 'cumulativeShare', label: t('colCumulative'), format: (v) => formatPercent(v), csv: (r) => r.cumulativeShare.toFixed(2) },
            ],
            rows: abc.items.map((p) => ({ ...p, name: nameOf(p.key) })),
          }}
        >
          <AbcChart data={abc} nameOf={nameOf} />
        </ChartCard>
      </div>

      <ChartCard
        title={t('cohortTitle')}
        subtitle={t('cohortSub')}
        filename="cohort-retention"
        footer={t('cohortFooter')}
        table={{
          columns: [
            { key: 'month', label: t('cohortMonth'), align: 'left', format: (v) => d.monthLong(v) },
            { key: 'size', label: t('cohortSize'), format: (v) => formatNumber(v) },
            ...Array.from({ length: cohort.average.length }, (_, i) => ({
              key: `m${i}`,
              label: t('cohortOffset', { n: i }),
              format: (_v, row) => (row.cells[i] ? formatPercent(row.cells[i].rate, 0) : ''),
              csv: (row) => (row.cells[i] ? row.cells[i].rate.toFixed(1) : ''),
            })),
          ],
          rows: cohort.cohorts,
        }}
      >
        {cohort.cohorts.length ? <CohortTable data={cohort} /> : <p className="text-sm text-ink-3">{t('cohortNone')}</p>}
      </ChartCard>
    </>
  )
}

export default AnalyticsTab
