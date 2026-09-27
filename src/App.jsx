import { useEffect, useState } from 'react'
import KpiCard from './components/KpiCard'
import DailySalesChart from './components/DailySalesChart'
import BranchSalesChart from './components/BranchSalesChart'
import CsvFileButton from './components/CsvFileButton'
import { computeDashboard } from './lib/metrics'
import { loadSalesFromFile, loadSalesFromUrl, SalesFileMissingError } from './lib/loadSales'
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
  // status: 'loading' | 'missing' (no file on the server) | 'error' | 'ready'
  const [state, setState] = useState({ status: 'loading' })

  const showRows = (rows) => setState({ status: 'ready', metrics: computeDashboard(rows) })
  const showError = (err) =>
    setState(
      err instanceof SalesFileMissingError
        ? { status: 'missing' }
        : { status: 'error', message: err.message || 'ไม่ทราบสาเหตุ' },
    )

  useEffect(() => {
    loadSalesFromUrl('/sales.csv').then(showRows, showError)
  }, [])

  const handleFile = (file) => {
    setState({ status: 'loading' })
    loadSalesFromFile(file).then(showRows, showError)
  }

  const { status, metrics } = state

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-amber-800 dark:text-amber-500">บ้านบรู Dashboard</h1>
            {metrics?.dateRange && (
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                ข้อมูลวันที่ {formatShortDate(metrics.dateRange.from)} – {formatShortDate(metrics.dateRange.to)}
              </p>
            )}
          </div>
          {status === 'ready' && (
            <CsvFileButton onFile={handleFile} variant="subtle">
              เปลี่ยนไฟล์ข้อมูล
            </CsvFileButton>
          )}
        </header>

        {status === 'loading' && <p className="text-stone-500">กำลังโหลดข้อมูล…</p>}

        {(status === 'missing' || status === 'error') && (
          <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            {status === 'missing' ? (
              <>
                <h2 className="font-semibold text-stone-800 dark:text-stone-100">ยังไม่มีข้อมูลยอดขาย</h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  ไม่พบไฟล์ sales.csv บนเซิร์ฟเวอร์ เลือกไฟล์จากเครื่องของคุณเพื่อดู Dashboard ได้เลย
                </p>
              </>
            ) : (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                โหลดข้อมูลไม่สำเร็จ: {state.message}
              </p>
            )}
            <div className="mt-4">
              <CsvFileButton onFile={handleFile}>เลือกไฟล์ sales.csv จากเครื่อง</CsvFileButton>
            </div>
            <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
              ไฟล์จะถูกอ่านในเบราว์เซอร์นี้เท่านั้น ไม่มีการอัปโหลดไปที่ใด
            </p>
          </section>
        )}

        {status === 'ready' && (
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
