import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import KpiCard from './components/KpiCard'
import DailySalesChart from './components/DailySalesChart'
import BranchSalesChart from './components/BranchSalesChart'
import { computeDashboard } from './lib/metrics'
import { formatBaht, formatNumber, formatShortDate } from './lib/format'

function Panel({ title, children }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900">
      <h2 className="mb-4 font-semibold text-stone-800 dark:text-stone-100">{title}</h2>
      {children}
    </section>
  )
}

function App() {
  const [metrics, setMetrics] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Papa.parse('/sales.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(), // trim() also strips the BOM (U+FEFF) Excel adds to the first column name
      complete: (result) => setMetrics(computeDashboard(result.data)),
      error: (err) => setError(err.message),
    })
  }, [])

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-amber-800 dark:text-amber-500">บ้านบรู Dashboard</h1>
          {metrics?.dateRange && (
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              ข้อมูลวันที่ {formatShortDate(metrics.dateRange.from)} – {formatShortDate(metrics.dateRange.to)}
            </p>
          )}
        </header>

        {error && (
          <p className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-300">
            โหลดข้อมูลไม่สำเร็จ: {error}
          </p>
        )}
        {!metrics && !error && <p className="text-stone-500">กำลังโหลดข้อมูล…</p>}

        {metrics && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <KpiCard label="ยอดขายรวม" value={formatBaht(metrics.totalSales)} />
              <KpiCard label="จำนวนบิล" value={formatNumber(metrics.orderCount)} hint="นับ order_id ไม่ซ้ำ" />
              <KpiCard label="ยอดเฉลี่ยต่อบิล" value={formatBaht(metrics.averageOrderValue, 2)} />
              <KpiCard
                label="ลูกค้าสมาชิก (ไม่ซ้ำ)"
                value={formatNumber(metrics.memberCount)}
                hint="ไม่นับลูกค้าทั่วไป"
              />
            </div>

            <Panel title="ยอดขายรายวัน">
              <DailySalesChart data={metrics.daily} />
            </Panel>

            <Panel title="ยอดขายแยกสาขา">
              <BranchSalesChart data={metrics.byBranch} />
            </Panel>
          </div>
        )}
      </div>
    </main>
  )
}

export default App
