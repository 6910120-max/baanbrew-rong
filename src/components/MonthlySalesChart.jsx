import { useId } from 'react'
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBaht, formatBahtCompact } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { useWidth } from '../lib/useWidth'
import ChartTooltip from './ChartTooltip'
import GradientDefs from './GradientDefs'

const axisTick = { fill: 'var(--ink-3)', fontSize: 12 }

/**
 * Monthly sales as bars (partial months shown faded)
 * + a dashed line from the last full month to the forecast
 */
function MonthlySalesChart({ monthly, forecast }) {
  const { t, d } = useI18n()
  const gradId = useId()
  const [wrapperRef, width] = useWidth()

  // Add a forecast column: if the forecast month already exists (a partial month), use that row
  const data = monthly.map((m) => ({ ...m }))
  if (forecast) {
    const base = data.find((m) => m.month === forecast.basedOn)
    if (base) base.trend = base.sales
    let target = data.find((m) => m.month === forecast.month)
    if (!target) data.push((target = { month: forecast.month, sales: null, partial: false }))
    target.trend = forecast.value
    target.forecast = forecast.value
  }

  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(width / 56))))

  return (
    <div ref={wrapperRef}>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="18%">
          <defs>
            <GradientDefs id={gradId} />
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="month"
            tickFormatter={d.month}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
            interval={labelEvery - 1}
          />
          <YAxis tickFormatter={formatBahtCompact} tick={axisTick} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={
              <ChartTooltip
                title={(p) => d.monthLong(p.month)}
                extra={(p) =>
                  [p.partial && t('partialMonth'), p.forecast != null && `${t('forecast')}: ${formatBaht(p.forecast)}`]
                    .filter(Boolean)
                    .join(' · ')
                }
              />
            }
          />
          <Bar dataKey="sales" name={t('colSales')} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((m) => (
              <Cell key={m.month} fill={`url(#${gradId})`} fillOpacity={m.partial ? 0.4 : 1} />
            ))}
          </Bar>
          <Line
            dataKey="trend"
            name={t('forecast')}
            stroke="var(--c2)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 4, fill: 'var(--c2)', stroke: 'var(--surface)', strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
            legendType="none"
            tooltipType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MonthlySalesChart
