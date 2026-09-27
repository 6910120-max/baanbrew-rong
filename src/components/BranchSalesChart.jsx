import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBaht } from '../lib/format'
import ChartTooltip from './ChartTooltip'

const axisTick = { fill: 'var(--chart-axis)', fontSize: 13 }

// Horizontal bars: branch names are easy to read and ranking runs top to bottom
function BranchSalesChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 56 + 16}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 96, bottom: 0, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="branch"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={96}
        />
        <Tooltip
          content={<ChartTooltip title={(p) => `สาขา${p.branch}`} />}
          cursor={{ fill: 'var(--chart-grid)', opacity: 0.5 }}
        />
        <Bar
          dataKey="sales"
          fill="var(--chart-1)"
          radius={[0, 4, 4, 0]}
          barSize={28}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="sales"
            position="right"
            formatter={(v) => formatBaht(v)}
            style={{ fill: 'var(--chart-label)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default BranchSalesChart
