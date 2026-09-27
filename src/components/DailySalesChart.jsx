import { useId } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBahtCompact } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { useWidth } from '../lib/useWidth'
import ChartTooltip from './ChartTooltip'
import GradientDefs from './GradientDefs'

const axisTick = { fill: 'var(--ink-3)', fontSize: 12 }
const MIN_TICK_SPACING = 88 // px per label "1 เม.ย. 68" so they don't overlap

function LegendItem({ color, label, thick }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-4 rounded ${thick ? 'h-1' : 'h-0.5'}`} style={{ background: color }} />
      {label}
    </span>
  )
}

/** Daily sales (faded) + 7-day average (main line, gradient fill below) */
function DailySalesChart({ data }) {
  const { t, d } = useI18n()
  const gradId = useId()
  const [wrapperRef, width] = useWidth()
  const isNarrow = width < 480

  // Short ranges (≤ 62 days): ticks every few days; long ranges: first of each month
  let ticks
  if (data.length <= 62) {
    const step = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(width / MIN_TICK_SPACING))))
    ticks = data.filter((_, i) => i % step === 0).map((p) => p.date)
  } else {
    const monthStarts = data.filter((p) => p.date.endsWith('-01')).map((p) => p.date)
    const step = Math.ceil(monthStarts.length / Math.max(2, Math.floor(width / MIN_TICK_SPACING)))
    ticks = monthStarts.filter((_, i) => i % step === 0)
  }

  return (
    <div ref={wrapperRef}>
      <div className="mb-3 flex gap-4 text-xs text-ink-2">
        <LegendItem color="var(--muted-line)" label={t('dailySeries')} />
        <LegendItem color="var(--c1)" label={t('avgSeries')} thick />
      </div>
      <ResponsiveContainer width="100%" height={isNarrow ? 240 : 320}>
        <ComposedChart data={data} margin={{ top: 8, right: isNarrow ? 8 : 16, bottom: 0, left: 0 }}>
          <defs>
            <GradientDefs id={gradId} fromOpacity={0.35} toOpacity={0} to="var(--c1)" />
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={d.axisDate}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
            interval={0}
          />
          <YAxis tickFormatter={formatBahtCompact} tick={axisTick} tickLine={false} axisLine={false} width={isNarrow ? 48 : 56} />
          <Tooltip
            content={<ChartTooltip title={(p) => d.longDate(p.date)} />}
            cursor={{ stroke: 'var(--ink-3)', strokeDasharray: '3 3' }}
          />
          {/* Daily line: thin and faded so it reads as background context */}
          <Line
            type="linear"
            dataKey="sales"
            name={t('dailySeries')}
            stroke="var(--muted-line)"
            strokeWidth={1}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--muted-line)', stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {/* 7-day average line: the main trend, gradient fill below */}
          <Area
            type="monotone"
            dataKey="avg"
            name={t('avgSeries')}
            stroke="var(--c1)"
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 5, fill: 'var(--c1)', stroke: 'var(--surface)', strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default DailySalesChart
