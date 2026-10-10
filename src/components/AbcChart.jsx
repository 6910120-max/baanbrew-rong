import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBaht, formatBahtCompact, formatNumber, formatPercent } from '../lib/format'
import { ABC_A_SHARE, ABC_B_SHARE } from '../lib/analytics'
import { useI18n } from '../lib/i18n'
import { useWidth } from '../lib/useWidth'

const axisTick = { fill: 'var(--ink-3)', fontSize: 12 }
const CLASS_COLOR = { A: 'var(--c1)', B: 'var(--c2)', C: 'var(--ink-3)' }

/**
 * ABC / Pareto: bars = sales per product (high → low, colored by class), line = cumulative share of sales,
 * with the class summary (how many products make up how much of the sales) above the chart
 */
function AbcChart({ data, nameOf }) {
  const { t } = useI18n()
  const [wrapperRef, width] = useWidth()
  const labelEvery = Math.max(1, Math.ceil(data.items.length / Math.max(2, Math.floor(width / 40))))

  return (
    <div ref={wrapperRef}>
      <ul className="mb-4 grid gap-2 sm:grid-cols-3">
        {data.classes.map((c) => (
          <li key={c.cls} className="rounded-xl bg-surface-2 p-3">
            <p className="flex items-center gap-2 font-medium text-ink">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLASS_COLOR[c.cls] }} />
              {t(`abc_${c.cls}`)}
            </p>
            <p className="mt-1 text-sm tabular-nums text-ink">
              <span className="font-semibold">{t('items', { count: formatNumber(c.count) })}</span>
              <span className="text-ink-3"> · {formatPercent(c.countShare, 0)}</span>
            </p>
            <p className="text-xs tabular-nums text-ink-3">
              {t('abcSalesShare', { share: formatPercent(c.share), sales: formatBahtCompact(c.sales) })}
            </p>
          </li>
        ))}
      </ul>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data.items} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="12%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="key" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} interval={labelEvery - 1} />
          <YAxis yAxisId="sales" tickFormatter={formatBahtCompact} tick={axisTick} tickLine={false} axisLine={false} width={52} />
          <YAxis
            yAxisId="cum"
            orientation="right"
            domain={[0, 100]}
            ticks={[0, 50, ABC_A_SHARE, ABC_B_SHARE, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ReferenceLine yAxisId="cum" y={ABC_A_SHARE} stroke="var(--ink-3)" strokeDasharray="4 4" />
          <ReferenceLine yAxisId="cum" y={ABC_B_SHARE} stroke="var(--ink-3)" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return (
                <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-lg">
                  <p className="font-medium text-ink">
                    {p.key} · {nameOf(p.key)}
                  </p>
                  <p className="text-xs text-ink-3">{t(`abc_${p.cls}`)} · #{p.rank}</p>
                  <p className="tabular-nums text-ink">
                    {formatBaht(p.sales)} <span className="text-ink-3">({formatPercent(p.share)})</span>
                  </p>
                  <p className="text-xs tabular-nums text-ink-3">
                    {t('abcCumulative')} {formatPercent(p.cumulativeShare)}
                  </p>
                </div>
              )
            }}
          />
          <Bar yAxisId="sales" dataKey="sales" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.items.map((p) => (
              <Cell key={p.key} fill={CLASS_COLOR[p.cls]} />
            ))}
          </Bar>
          <Line yAxisId="cum" dataKey="cumulativeShare" stroke="var(--ink)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default AbcChart
