import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import { PRESETS } from './lib/presets'
import KpiCard from './components/KpiCard'
import ChartCard from './components/ChartCard'
import CsvFileButton from './components/CsvFileButton'
import DailySalesChart from './components/DailySalesChart'
import MonthlySalesChart from './components/MonthlySalesChart'
import HBarChart from './components/HBarChart'
import HourlyChart from './components/HourlyChart'
import Heatmap from './components/Heatmap'
import ShareBars from './components/ShareBars'
import MemberCompare from './components/MemberCompare'
import RfmSegments from './components/RfmSegments'
import CustomerSection from './components/CustomerSection'
import {
  addDays,
  branchNameMap,
  computeDashboard,
  customerDashboard,
  dataBounds,
  distinctValues,
  filterRows,
  percentChange,
  prepareCustomers,
  prepareRows,
  RFM_ACTIVE_DAYS,
  RFM_FREQUENT_BILLS,
} from './lib/metrics'
import { loadOptionalCsv, loadSalesFromFile, loadSalesFromUrl, MissingColumnsError, SalesFileMissingError } from './lib/loadSales'
import { formatBaht, formatNumber, formatPercent } from './lib/format'
import { I18nProvider, useI18n } from './lib/i18n'
import { useSettings } from './lib/useSettings'

/** Turn a preset into from/to dates (counting back from the last day in the data) */
function resolveRange(filters, bounds) {
  const preset = PRESETS.find((p) => p.key === filters.preset)
  if (preset?.days) {
    const from = addDays(bounds.max, -(preset.days - 1))
    return { from: from < bounds.min ? bounds.min : from, to: bounds.max }
  }
  if (filters.preset === 'custom') return { from: filters.from, to: filters.to }
  return { from: bounds.min, to: bounds.max }
}

function App() {
  const [settings, updateSettings] = useSettings()
  return (
    <I18nProvider lang={settings.lang}>
      <Dashboard settings={settings} onSettingsChange={updateSettings} />
    </I18nProvider>
  )
}

function Dashboard({ settings, onSettingsChange }) {
  const { t, d } = useI18n()
  useEffect(() => {
    document.title = t('appTitle')
  }, [t])
  // status: 'loading' | 'missing' (no file on the server) | 'error' | 'ready'
  const [state, setState] = useState({ status: 'loading' })
  const [filters, setFilters] = useState({ preset: 'all', from: '', to: '', branch: 'all', channel: 'all' })

  const showRows = (raw) => {
    const rows = prepareRows(raw)
    const bounds = dataBounds(rows)
    setState({
      status: 'ready',
      rows,
      bounds,
      branches: distinctValues(rows, 'branch'),
      channels: distinctValues(rows, 'channel'),
    })
    setFilters({ preset: 'all', from: bounds.min, to: bounds.max, branch: 'all', channel: 'all' })
  }
  const showError = (err) => {
    if (err instanceof SalesFileMissingError) setState({ status: 'missing' })
    else if (err instanceof MissingColumnsError) setState({ status: 'error', message: t('missingColumns', { columns: err.columns.join(', ') }) })
    else setState({ status: 'error', message: err.message || t('unknownError') })
  }

  useEffect(() => {
    loadSalesFromUrl('/sales.csv').then(showRows, showError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Member customers (optional): if customers.csv is missing, the customer section just doesn't show
  const [customers, setCustomers] = useState(null)
  useEffect(() => {
    Promise.all([
      loadOptionalCsv('/customers.csv', ['customer_id', 'gender', 'age_group', 'home_branch_id', 'joined_date']),
      loadOptionalCsv('/branches.csv', ['branch_id', 'branch']),
    ]).then(([rawCustomers, rawBranches]) => {
      if (rawCustomers) setCustomers(prepareCustomers(rawCustomers, branchNameMap(rawBranches)))
    })
  }, [])

  const handleFile = (file) => {
    setState({ status: 'loading' })
    loadSalesFromFile(file).then(showRows, showError)
  }

  const { status, rows, bounds } = state
  const range = status === 'ready' ? resolveRange(filters, bounds) : null

  // Recompute every metric when the filters change (53k rows takes only tens of ms)
  const dash = useMemo(() => {
    if (status !== 'ready' || !range.from || range.from > range.to) return null
    return computeDashboard(
      rows,
      { ...range, branch: filters.branch, channel: filters.channel, compare: filters.preset !== 'all' },
      bounds.min,
    )
  }, [status, rows, bounds, range?.from, range?.to, filters.branch, filters.channel, filters.preset]) // eslint-disable-line react-hooks/exhaustive-deps

  const custDash = useMemo(() => {
    if (!dash || !customers) return null
    const f = { ...range, branch: filters.branch, channel: filters.channel }
    return customerDashboard(customers, rows, filterRows(rows, f), f)
  }, [dash, customers]) // eslint-disable-line react-hooks/exhaustive-deps

  const changeFilters = (patch) =>
    setFilters((f) => {
      const next = { ...f, ...patch }
      // Switching to "custom" starts from the range currently on screen
      if (patch.preset === 'custom' && !patch.from && !patch.to) Object.assign(next, resolveRange(f, bounds))
      return next
    })

  const subtitle = range ? t('dataRange', { from: d.shortDate(range.from), to: d.shortDate(range.to) }) : null

  return (
    <div className="min-h-screen bg-page">
      <Header
        settings={settings}
        onChange={onSettingsChange}
        subtitle={subtitle}
        stats={
          dash
            ? [
                { value: formatNumber(dash.summary.branchCount), label: t('statBranches') },
                { value: formatNumber(dash.summary.rowCount), label: t('statRows') },
                { value: formatNumber(dash.summary.itemsSold), label: t('statItemsSold') },
              ]
            : []
        }
        onFile={handleFile}
        showFileButton={status === 'ready'}
      />

      <main className="relative mx-auto -mt-10 max-w-7xl px-4 pb-10 sm:-mt-12 sm:px-6">
        {status === 'loading' && (
          <div className="rounded-2xl border border-line bg-surface p-6 text-ink-2 shadow-sm">{t('loading')}</div>
        )}

        {(status === 'missing' || status === 'error') && (
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            {status === 'missing' ? (
              <>
                <h2 className="font-semibold text-ink">{t('noDataTitle')}</h2>
                <p className="mt-1 text-sm text-ink-2">{t('noDataBody')}</p>
              </>
            ) : (
              <p className="rounded-lg border border-down/30 p-3 text-sm text-down">{t('loadError', { message: state.message })}</p>
            )}
            <div className="mt-4">
              <CsvFileButton onFile={handleFile}>{t('pickFile')}</CsvFileButton>
            </div>
            <p className="mt-3 text-xs text-ink-3">{t('privacyNote')}</p>
          </section>
        )}

        {status === 'ready' && (
          <div className="space-y-4 sm:space-y-6">
            <FilterBar
              filters={{ ...filters, ...range }}
              onChange={changeFilters}
              bounds={bounds}
              branches={state.branches}
              channels={state.channels}
            />
            {dash && dash.rowCount > 0 ? (
              <>
                <DashboardBody dash={dash} />
                {custDash && <CustomerSection data={custDash} />}
              </>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-6 text-ink-2">{t('noRows')}</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function DashboardBody({ dash }) {
  const { t, tv, d } = useI18n()
  const { kpis, prevKpis, prevRange } = dash
  const delta = (key) => (prevKpis ? percentChange(kpis[key], prevKpis[key]) : null)
  const deltaNote = t('vsPrev')

  const salesCol = { key: 'sales', label: t('colSales'), format: (v) => formatBaht(v), csv: (r) => Math.round(r.sales) }
  const shareCol = { key: 'share', label: t('colShare'), format: (v) => formatPercent(v), csv: (r) => r.share.toFixed(2) }
  const ordersCol = { key: 'orders', label: t('colOrders'), format: (v) => formatNumber(v) }

  return (
    <>
      {/* KPIs: 2 columns on mobile, 4 columns on large screens */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard accent label={t('kpiSales')} value={formatBaht(kpis.totalSales)} delta={delta('totalSales')} deltaNote={deltaNote} />
        <KpiCard label={t('kpiOrders')} value={formatNumber(kpis.orderCount)} hint={t('kpiOrdersHint')} delta={delta('orderCount')} deltaNote={deltaNote} />
        <KpiCard label={t('kpiAov')} value={formatBaht(kpis.averageOrderValue, 2)} delta={delta('averageOrderValue')} deltaNote={deltaNote} />
        <KpiCard label={t('kpiMembers')} value={formatNumber(kpis.memberCount)} hint={t('kpiMembersHint')} delta={delta('memberCount')} deltaNote={deltaNote} />
      </div>
      {prevRange && (
        <p className="-mt-2 text-xs text-ink-3 sm:-mt-3">
          {t('comparingWith', { from: d.shortDate(prevRange.from), to: d.shortDate(prevRange.to) })}
        </p>
      )}

      <ChartCard
        title={t('dailyTitle')}
        subtitle={t('dailySub')}
        filename="daily-sales"
        table={{
          columns: [
            { key: 'date', label: t('colDate'), align: 'left', format: (v) => d.shortDate(v) },
            salesCol,
            { key: 'avg', label: t('colAvg7'), format: (v) => (v == null ? '–' : formatBaht(v)), csv: (r) => (r.avg == null ? '' : Math.round(r.avg)) },
          ],
          rows: dash.daily,
        }}
      >
        <DailySalesChart data={dash.daily} />
      </ChartCard>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <ChartCard
          title={t('monthlyTitle')}
          subtitle={t('monthlySub')}
          filename="monthly-sales"
          footer={
            dash.forecast
              ? t('forecastNote', { month: d.monthLong(dash.forecast.month), value: formatBaht(dash.forecast.value) })
              : t('forecastNeedMore')
          }
          table={{
            columns: [
              { key: 'month', label: t('colMonth'), align: 'left', format: (v) => d.monthLong(v) },
              salesCol,
              { key: 'partial', label: t('colNote'), format: (v) => (v ? t('partialMonth') : ''), csv: (r) => (r.partial ? t('partialMonth') : '') },
            ],
            rows: dash.monthly,
          }}
        >
          <MonthlySalesChart monthly={dash.monthly} forecast={dash.forecast} />
        </ChartCard>

        <ChartCard
          title={t('branchTitle')}
          subtitle={t('branchSub')}
          filename="sales-by-branch"
          table={{
            columns: [{ key: 'key', label: t('colBranch'), align: 'left', format: tv, csv: (r) => tv(r.key) }, salesCol, ordersCol, shareCol],
            rows: dash.byBranch,
          }}
        >
          <HBarChart
            data={dash.byBranch}
            categoryKey="key"
            formatCategory={tv}
            tooltipExtra={(p) => `${formatPercent(p.share)} · ${t('bills', { count: formatNumber(p.orders) })}`}
            rowHeight={48}
            barSize={26}
          />
        </ChartCard>

        <ChartCard
          title={t('productsTitle')}
          subtitle={t('productsSub')}
          filename="top-products"
          footer={t('productCodeNote')}
          table={{
            columns: [
              { key: 'key', label: t('colProduct'), align: 'left' },
              salesCol,
              { key: 'qty', label: t('colQty'), format: (v) => formatNumber(v) },
              shareCol,
            ],
            rows: dash.topProducts,
          }}
        >
          <HBarChart
            data={dash.topProducts}
            categoryKey="key"
            categoryWidth={52}
            rowHeight={32}
            barSize={18}
            tooltipExtra={(p) => `${formatNumber(p.qty)} ${t('colQty')} · ${formatPercent(p.share)}`}
          />
        </ChartCard>

        <ChartCard
          title={t('hourTitle')}
          subtitle={t('hourSub')}
          filename="sales-by-hour"
          table={{
            columns: [
              { key: 'hour', label: t('colHour'), align: 'left', format: (v) => `${String(v).padStart(2, '0')}:00`, csv: (r) => `${String(r.hour).padStart(2, '0')}:00` },
              salesCol,
              ordersCol,
            ],
            rows: dash.byHour,
          }}
        >
          <HourlyChart data={dash.byHour} />
        </ChartCard>

        <ChartCard
          title={t('heatmapTitle')}
          subtitle={t('heatmapSub')}
          filename="weekday-hour"
          table={{
            columns: [
              { key: 'day', label: t('colDay'), align: 'left' },
              ...dash.heatmap.hours.map((h, i) => ({
                key: `h${h}`,
                label: `${h}:00`,
                format: (_, row) => formatNumber(row.values[i]),
                csv: (row) => Math.round(row.values[i]),
              })),
            ],
            rows: t('weekdays').map((day, i) => ({ day, values: dash.heatmap.cells[i] })),
          }}
        >
          <Heatmap matrix={dash.heatmap} />
        </ChartCard>

        <ChartCard
          title={t('shareTitle')}
          subtitle={t('shareSub')}
          filename="channel-payment"
          table={{
            columns: [
              { key: 'group', label: t('colType'), align: 'left' },
              { key: 'key', label: t('colGroup'), align: 'left', format: tv, csv: (r) => tv(r.key) },
              salesCol,
              ordersCol,
              shareCol,
            ],
            rows: [
              ...dash.byChannel.map((r) => ({ ...r, group: t('channelLabel') })),
              ...dash.byPayment.map((r) => ({ ...r, group: t('paymentLabel') })),
            ],
          }}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <ShareBars title={t('channelLabel')} data={dash.byChannel} formatKey={tv} />
            <ShareBars title={t('paymentLabel')} data={dash.byPayment} formatKey={tv} />
          </div>
        </ChartCard>

        <ChartCard
          title={t('membersTitle')}
          subtitle={t('membersSub')}
          filename="members-vs-walkins"
          table={{
            columns: [
              { key: 'label', label: t('colType'), align: 'left' },
              salesCol,
              ordersCol,
              { key: 'aov', label: t('colAov'), format: (v) => formatBaht(v, 2), csv: (r) => r.aov.toFixed(2) },
              shareCol,
            ],
            rows: [
              { label: t('member'), ...dash.members.member },
              { label: t('walkIn'), ...dash.members.walkIn },
            ],
          }}
        >
          <MemberCompare data={dash.members} />
        </ChartCard>

        <ChartCard
          title={t('rfmTitle')}
          subtitle={t('rfmSub', { bills: RFM_FREQUENT_BILLS, days: RFM_ACTIVE_DAYS })}
          filename="rfm-segments"
          table={{
            columns: [
              { key: 'key', label: t('colGroup'), align: 'left', format: (v) => t(`rfm_${v}`), csv: (r) => t(`rfm_${r.key}`) },
              { key: 'count', label: t('colMembers'), format: (v) => formatNumber(v) },
              shareCol,
              salesCol,
              { key: 'avgSpend', label: t('colAvgSpend'), format: (v) => formatBaht(v), csv: (r) => Math.round(r.avgSpend) },
            ],
            rows: dash.rfm,
          }}
        >
          <RfmSegments segments={dash.rfm} />
        </ChartCard>
      </div>

      <ChartCard
        title={t('basketTitle')}
        subtitle={t('basketSub', { count: formatNumber(dash.basket.multiItemOrders) })}
        filename="bought-together"
        footer={t('productCodeNote')}
        table={{
          columns: [
            { key: 'pair', label: t('colPair'), align: 'left' },
            { key: 'count', label: t('colBills'), format: (v) => formatNumber(v) },
            shareCol,
          ],
          rows: dash.basket.pairs,
        }}
      >
        <HBarChart
          data={dash.basket.pairs}
          categoryKey="pair"
          valueKey="count"
          categoryWidth={104}
          narrowCategoryWidth={96}
          rowHeight={32}
          barSize={18}
          formatValue={(v) => t('bills', { count: formatNumber(v) })}
          formatValueShort={(v) => formatNumber(v)}
          tooltipExtra={(p) => formatPercent(p.share, 2)}
        />
      </ChartCard>
    </>
  )
}

export default App
