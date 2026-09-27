import { useId } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBahtCompact, formatNumber } from '../lib/format'
import { useI18n } from '../lib/i18n'
import ChartTooltip from './ChartTooltip'
import GradientDefs from './GradientDefs'

const axisTick = { fill: 'var(--ink-3)', fontSize: 12 }

/** Sales by hour: vertical bars, with the busiest hour in the second color (labeled in the tooltip) */
function HourlyChart({ data }) {
  const { t } = useI18n()
  const gradId = useId()
  const peak = data.reduce((best, h) => (h.sales > (best?.sales ?? -1) ? h : best), null)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="16%">
        <defs>
          <GradientDefs id={gradId} />
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="hour"
          tickFormatter={(h) => `${h}`}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--line)' }}
          interval={0}
        />
        <YAxis tickFormatter={formatBahtCompact} tick={axisTick} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)' }}
          content={
            <ChartTooltip
              title={(p) => `${String(p.hour).padStart(2, '0')}:00–${String(p.hour).padStart(2, '0')}:59`}
              extra={(p) => t('bills', { count: formatNumber(p.orders) })}
            />
          }
        />
        <Bar dataKey="sales" name={t('colSales')} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((h) => (
            <Cell key={h.hour} fill={h === peak ? 'var(--c2)' : `url(#${gradId})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default HourlyChart
