import { useEffect, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatAxisDate, formatBaht, formatLongDate } from '../lib/format'
import ChartTooltip from './ChartTooltip'

const axisTick = { fill: 'var(--chart-axis)', fontSize: 12 }
const MIN_TICK_SPACING = 88 // px per label "1 เม.ย. 68" so they don't overlap

/** Track an element's width so the number of X-axis labels fits the screen */
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

function LegendItem({ className, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-0.5 w-4 rounded ${className}`} />
      {label}
    </span>
  )
}

function DailySalesChart({ data }) {
  const [wrapperRef, width] = useWidth()
  const isNarrow = width < 480

  // Put ticks on the first of each month, skipping evenly so they fit the chart width
  const monthStarts = data.filter((d) => d.date.endsWith('-01')).map((d) => d.date)
  const maxTicks = Math.max(2, Math.floor(width / MIN_TICK_SPACING))
  const step = Math.ceil(monthStarts.length / maxTicks)
  const monthTicks = monthStarts.filter((_, i) => i % step === 0)

  return (
    <div ref={wrapperRef}>
      <div className="mb-3 flex gap-4 text-xs text-stone-600 dark:text-stone-300">
        <LegendItem className="bg-[var(--chart-muted)]" label="ยอดขายรายวัน" />
        <LegendItem className="bg-[var(--chart-1)]" label="ค่าเฉลี่ย 7 วัน" />
      </div>
      <ResponsiveContainer width="100%" height={isNarrow ? 240 : 320}>
        <LineChart data={data} margin={{ top: 8, right: isNarrow ? 8 : 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="date"
            ticks={monthTicks}
            tickFormatter={formatAxisDate}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            interval={0}
          />
          <YAxis
            tickFormatter={(v) => formatBaht(v)}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={isNarrow ? 60 : 72}
          />
          <Tooltip
            content={<ChartTooltip title={(p) => formatLongDate(p.date)} />}
            cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
          />
          {/* Daily line: thin and faded so it reads as background context */}
          <Line
            type="linear"
            dataKey="sales"
            name="ยอดขายรายวัน"
            stroke="var(--chart-muted)"
            strokeWidth={1}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--chart-muted)', stroke: 'var(--chart-surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {/* 7-day average line: the main trend */}
          <Line
            type="monotone"
            dataKey="avg"
            name="ค่าเฉลี่ย 7 วัน"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: 'var(--chart-1)', stroke: 'var(--chart-surface)', strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default DailySalesChart
