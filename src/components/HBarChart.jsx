import { useId } from 'react'
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBaht, formatBahtCompact } from '../lib/format'
import { useWidth } from '../lib/useWidth'
import ChartTooltip from './ChartTooltip'
import GradientDefs from './GradientDefs'

const axisTick = { fill: 'var(--ink-2)', fontSize: 13 }

/**
 * Horizontal bar chart (for rankings: branches, products, product pairs)
 * Value labeled at the end of each bar; labels use a short format on narrow screens
 */
function HBarChart({
  data,
  categoryKey,
  valueKey = 'sales',
  formatCategory = (v) => v,
  formatValue = formatBaht,
  formatValueShort = formatBahtCompact,
  tooltipTitle,
  tooltipExtra,
  categoryWidth = 96,
  narrowCategoryWidth = Math.min(categoryWidth, 84),
  barSize = 22,
  rowHeight = 40,
}) {
  const gradId = useId()
  const [wrapperRef, width] = useWidth()
  const isNarrow = width < 420
  const label = isNarrow ? formatValueShort : formatValue

  return (
    <div ref={wrapperRef}>
      <ResponsiveContainer width="100%" height={data.length * rowHeight + 8}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: isNarrow ? 52 : 88, bottom: 0, left: 0 }}
        >
          <defs>
            <GradientDefs id={gradId} direction="x" />
          </defs>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey={categoryKey}
            tickFormatter={formatCategory}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={isNarrow ? narrowCategoryWidth : categoryWidth}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={
              <ChartTooltip
                title={tooltipTitle ?? ((p) => formatCategory(p[categoryKey]))}
                format={formatValue}
                extra={tooltipExtra}
              />
            }
          />
          <Bar dataKey={valueKey} fill={`url(#${gradId})`} radius={[0, 4, 4, 0]} barSize={barSize} isAnimationActive={false}>
            <LabelList
              dataKey={valueKey}
              position="right"
              formatter={label}
              style={{ fill: 'var(--ink-2)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HBarChart
