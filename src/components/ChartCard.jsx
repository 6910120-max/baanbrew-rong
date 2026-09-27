import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { downloadCsv } from '../lib/exportCsv'
import { ChartIcon, DownloadIcon, TableIcon } from './Icons'
import DataTable from './DataTable'

function IconButton({ label, pressed, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      title={label}
      aria-label={label}
      className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
        pressed ? 'bg-brand text-white' : 'text-ink-3 hover:bg-surface-2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Chart card: title + subtitle, a chart/table toggle, and a CSV download button
 * table = { columns: [{ key, label, format?, csv?, align? }], rows }
 */
function ChartCard({ title, subtitle, table, filename, footer, className = '', children }) {
  const { t } = useI18n()
  const [view, setView] = useState('chart')

  return (
    <section className={`flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-3 sm:text-sm">{subtitle}</p>}
        </div>
        {table && (
          <div className="no-print flex shrink-0 items-center gap-0.5 rounded-xl bg-surface-2/60 p-0.5">
            <IconButton label={t('viewChart')} pressed={view === 'chart'} onClick={() => setView('chart')}>
              <ChartIcon />
            </IconButton>
            <IconButton label={t('viewTable')} pressed={view === 'table'} onClick={() => setView('table')}>
              <TableIcon />
            </IconButton>
            <IconButton
              label={t('downloadCsv')}
              onClick={() => downloadCsv(`${filename}.csv`, table.columns, table.rows)}
            >
              <DownloadIcon />
            </IconButton>
          </div>
        )}
      </header>
      <div className="min-w-0 flex-1">
        {view === 'table' && table ? <DataTable columns={table.columns} rows={table.rows} /> : children}
      </div>
      {footer && <div className="mt-3 text-xs text-ink-3">{footer}</div>}
    </section>
  )
}

export default ChartCard
