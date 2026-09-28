import { formatBaht, formatNumber, formatPercent } from '../lib/format'
import { useI18n } from '../lib/i18n'
import AgeGenderChart from './AgeGenderChart'
import ChartCard from './ChartCard'
import HBarChart from './HBarChart'
import KpiCard from './KpiCard'
import NewMembersChart from './NewMembersChart'

/**
 * Member-customer section (from customers.csv joined with sales)
 * data = output of customerDashboard() in metrics.js, recalculated from the filters on the page
 * children = extra cards appended to the same grid (e.g. members vs walk-ins, RFM)
 */
function CustomerSection({ data, children }) {
  const { t, tv, d } = useI18n()
  const { kpis } = data
  const neverShare = kpis.total ? (kpis.neverBought / kpis.total) * 100 : 0
  const peopleCol = (key, label) => ({ key, label, format: (v) => formatNumber(v) })

  return (
    <section aria-labelledby="customers-heading" className="space-y-4 sm:space-y-6">
      <div>
        <h2 id="customers-heading" className="text-xl font-bold text-ink">{t('custTitle')}</h2>
        <p className="text-sm text-ink-3">{t('custSub')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label={t('custTotal')} value={formatNumber(kpis.total)} hint={t('custTotalHint')} />
        <KpiCard label={t('custBuyers')} value={formatNumber(kpis.buyersInRange)} hint={t('custBuyersHint')} />
        <KpiCard
          label={t('custNever')}
          value={formatNumber(kpis.neverBought)}
          hint={t('custNeverHint', { pct: formatPercent(neverShare) })}
        />
        <KpiCard label={t('custNew')} value={formatNumber(kpis.newInRange)} hint={t('custNewHint')} />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <ChartCard
          title={t('custNewTitle')}
          subtitle={t('custNewSub')}
          filename="new-members-by-month"
          table={{
            columns: [
              { key: 'month', label: t('colMonth'), align: 'left', format: (v) => d.monthLong(v) },
              peopleCol('count', t('colMembers')),
            ],
            rows: data.newByMonth,
          }}
        >
          <NewMembersChart data={data.newByMonth} />
        </ChartCard>

        <ChartCard
          title={t('custAgeTitle')}
          subtitle={t('custAgeSub')}
          filename="members-age-gender"
          table={{
            columns: [
              { key: 'ageGroup', label: t('colAge'), align: 'left', format: tv, csv: (r) => tv(r.ageGroup) },
              peopleCol('หญิง', tv('หญิง')),
              peopleCol('ชาย', tv('ชาย')),
              peopleCol('ไม่ระบุ', tv('ไม่ระบุ')),
              peopleCol('total', t('colTotal')),
            ],
            rows: data.ageGender,
          }}
        >
          <AgeGenderChart data={data.ageGender} />
        </ChartCard>

        <ChartCard
          title={t('custSpendTitle')}
          subtitle={t('custSpendSub')}
          filename="spend-by-age"
          table={{
            columns: [
              { key: 'ageGroup', label: t('colAge'), align: 'left', format: tv, csv: (r) => tv(r.ageGroup) },
              peopleCol('buyers', t('colBuyers')),
              { key: 'sales', label: t('colSales'), format: (v) => formatBaht(v), csv: (r) => Math.round(r.sales) },
              { key: 'perMember', label: t('colAvgSpend'), format: (v) => formatBaht(v), csv: (r) => Math.round(r.perMember) },
              { key: 'aov', label: t('colAov'), format: (v) => formatBaht(v, 2), csv: (r) => r.aov.toFixed(2) },
            ],
            rows: data.spendByAge,
          }}
        >
          <HBarChart
            data={data.spendByAge}
            categoryKey="ageGroup"
            valueKey="perMember"
            formatCategory={tv}
            categoryWidth={76}
            rowHeight={40}
            tooltipExtra={(p) => `${t('people', { count: formatNumber(p.buyers) })} · ${t('colAov')} ${formatBaht(p.aov, 2)}`}
          />
        </ChartCard>

        <ChartCard
          title={t('custHomeTitle')}
          subtitle={t('custHomeSub')}
          filename="members-by-home-branch"
          table={{
            columns: [
              { key: 'branch', label: t('colBranch'), align: 'left', format: tv, csv: (r) => tv(r.branch) },
              peopleCol('members', t('colMembers')),
              { key: 'buyerShare', label: t('colBoughtShare'), format: (v) => formatPercent(v), csv: (r) => r.buyerShare.toFixed(1) },
              { key: 'atHomeShare', label: t('colAtHomeShare'), format: (v) => formatPercent(v), csv: (r) => r.atHomeShare.toFixed(1) },
            ],
            rows: data.byHomeBranch,
          }}
        >
          <HBarChart
            data={data.byHomeBranch}
            categoryKey="branch"
            valueKey="members"
            formatCategory={tv}
            formatValue={(v) => t('people', { count: formatNumber(v) })}
            formatValueShort={(v) => formatNumber(v)}
            rowHeight={44}
            barSize={24}
            tooltipExtra={(p) => t('custHomeTip', { bought: formatPercent(p.buyerShare), home: formatPercent(p.atHomeShare) })}
          />
        </ChartCard>

        {children}
      </div>
    </section>
  )
}

export default CustomerSection
