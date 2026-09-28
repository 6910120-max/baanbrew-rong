import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber, formatPercent } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { GENDERS } from '../lib/metrics'
import ChartTooltip from './ChartTooltip'

// Gender colors: 2 validated theme colors + neutral gray for "unspecified" (not a real category)
const GENDER_COLOR = { หญิง: 'var(--c1)', ชาย: 'var(--c2)', ไม่ระบุ: 'var(--muted-line)' }

/**
 * Members by age group × gender: horizontal stacked bars (age groups youngest to oldest)
 * Legend on top + total at the end of each bar; 2px surface-color gap between segments
 */
function AgeGenderChart({ data }) {
  const { t, tv } = useI18n()
  const total = data.reduce((s, r) => s + r.total, 0)

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {GENDERS.map((g) => (
          <span key={g} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GENDER_COLOR[g] }} />
            {tv(g)}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={data.length * 40 + 8}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barSize={22}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="ageGroup" tickFormatter={tv} tick={{ fill: 'var(--ink-2)', fontSize: 13 }} tickLine={false} axisLine={false} width={76} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={
              <ChartTooltip
                title={(p) => `${tv(p.ageGroup)} · ${t('people', { count: formatNumber(p.total) })} (${formatPercent(total ? (p.total / total) * 100 : 0)})`}
                format={(v) => t('people', { count: formatNumber(v) })}
              />
            }
          />
          {GENDERS.map((g, i) => (
            <Bar
              key={g}
              dataKey={g}
              name={tv(g)}
              stackId="gender"
              fill={GENDER_COLOR[g]}
              stroke="var(--surface)"
              strokeWidth={2}
              radius={i === GENDERS.length - 1 ? [0, 4, 4, 0] : 0}
              isAnimationActive={false}
              label={
                i === GENDERS.length - 1
                  ? ({ x, y, width, height, index }) => (
                      <text x={x + width + 6} y={y + height / 2 + 4} fontSize={12} fill="var(--ink-2)">
                        {formatNumber(data[index].total)}
                      </text>
                    )
                  : undefined
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default AgeGenderChart
