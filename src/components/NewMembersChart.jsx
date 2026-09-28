import { useId } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { useWidth } from '../lib/useWidth'
import ChartTooltip from './ChartTooltip'
import GradientDefs from './GradientDefs'

const axisTick = { fill: 'var(--ink-3)', fontSize: 12 }

/** New members per month (from joined_date): vertical bars, one theme color, partial months faded */
function NewMembersChart({ data }) {
  const { t, d } = useI18n()
  const gradId = useId()
  const [wrapperRef, width] = useWidth()
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(width / 56))))

  return (
    <div ref={wrapperRef}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="18%">
          <defs>
            <GradientDefs id={gradId} />
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="month" tickFormatter={d.month} tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} interval={labelEvery - 1} />
          <YAxis tickFormatter={(v) => formatNumber(v)} tick={axisTick} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={
              <ChartTooltip
                title={(p) => d.monthLong(p.month)}
                format={(v) => t('people', { count: formatNumber(v) })}
                extra={(p) => (p.partial ? t('partialMonth') : '')}
              />
            }
          />
          <Bar dataKey="count" name={t('custNewMembers')} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((m) => (
              <Cell key={m.month} fill={`url(#${gradId})`} fillOpacity={m.partial ? 0.4 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default NewMembersChart
