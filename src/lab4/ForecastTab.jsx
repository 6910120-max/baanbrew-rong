// Lab 4.4–4.5 · พยากรณ์และวันผิดปกติ · หน้าตาใช้ธีมของโปรเจกต์ ส่วนคำนวณมาจาก src/lib/analytics/
// คำนวณในเบราว์เซอร์จาก analytics/daily (ยอดรายวันแยกสาขา ~2,700 แถว) จึงเปลี่ยนสาขาได้ทันทีโดยไม่อ่าน Firestore เพิ่ม
import { useMemo, useState } from 'react'
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts'
import { AnalyticsShell, Card, Pending, Insight, MAIN, GREEN, MUTED, INK, thaiDay, tooltipStyle } from './ui.jsx'
import { useAnalytics } from './useAnalytics.js'
import { toSeries } from '../lib/analytics/daily.js'
import { seasonalForecast, backtest, mape } from '../lib/analytics/forecast.js'
import { toWeekly } from '../lib/analytics/weekly.js'
import { scoreAnomalies } from '../lib/analytics/anomaly.js'
import { formatBaht, formatBahtCompact } from '../lib/format'

const BRANCHES = ['สยาม', 'สีลม', 'อารีย์', 'บางนา', 'มหาวิทยาลัย']
const HORIZON = 28
const axisTick = { fill: 'var(--ink-3)', fontSize: 12 }
const shortDay = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
const tryRun = (f) => {
  try {
    return { value: f() }
  } catch (e) {
    return { error: e.message }
  }
}

function Pill({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-lg px-2.5 py-1 text-sm transition ${on ? 'bg-grad font-medium text-white shadow' : 'border border-line text-ink-2 hover:bg-surface-2'}`}
    >
      {children}
    </button>
  )
}

function Stat({ label, value, note, muted }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="text-xs text-ink-3">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${muted ? 'text-ink-3' : 'text-ink'}`}>{value}</div>
      {note && <div className="text-xs text-ink-3">{note}</div>}
    </div>
  )
}

function ForecastCard({ daily }) {
  const [branch, setBranch] = useState(null)
  const [unit, setUnit] = useState('day') // 'day' | 'week' (Lab 4.4B)
  const result = useMemo(
    () =>
      tryRun(() => {
        const series = toSeries(daily, branch)
        const bt = backtest(series, HORIZON)
        const fc = seasonalForecast(series, HORIZON)
        const last = series[series.length - 1]
        const next7 = fc.slice(0, 7).reduce((s, f) => s + f.forecast, 0)

        // รายวัน: ยอดจริง 56 วันล่าสุด + คาดการณ์ 28 วัน พร้อมแถบช่วงคาดการณ์
        const recent = series.slice(-56)
        const dayChart = [
          ...recent.map((s) => ({ date: s.date, actual: s.revenue })),
          ...fc.map((f) => ({ date: f.date, forecast: f.forecast, band: [f.forecast * (1 - bt.band), f.forecast * (1 + bt.band)] })),
        ]
        dayChart[recent.length - 1] = { ...dayChart[recent.length - 1], forecast: last.revenue } // ต่อเส้นให้ไม่ขาด

        // รายสัปดาห์ (จ.–อา.): รวมยอดจริงและยอดคาดการณ์เป็นสัปดาห์ แล้ววัด MAPE ด้วย mape() ตัวเดิม
        const wActual = toWeekly(series.map((s) => ({ date: s.date, actual: s.revenue })), ['actual']).slice(-12)
        const wForecast = toWeekly(fc.map((f) => ({ date: f.date, forecast: f.forecast })), ['forecast'])
        const wTest = toWeekly(bt.test, ['actual', 'seasonal', 'flat'])
        const weekChart = [
          ...wActual.map((w) => ({ date: w.week, actual: w.actual })),
          ...wForecast.map((w) => ({ date: w.week, forecast: w.forecast })),
        ]
        if (wActual.length && wForecast.length) {
          const i = wActual.length - 1
          weekChart[i] = { ...weekChart[i], forecast: wActual[i].actual } // ต่อเส้น
        }
        const weekly = wTest.length
          ? {
              mapeSeasonal: mape(wTest.map((w) => w.actual), wTest.map((w) => w.seasonal)),
              mapeFlat: mape(wTest.map((w) => w.actual), wTest.map((w) => w.flat)),
              weeks: wTest.length,
            }
          : null
        return { bt, dayChart, weekChart, weekly, next7, lastDate: last.date }
      }),
    [daily, branch],
  )

  const r = result.value
  const week = unit === 'week'
  const m = week && r?.weekly ? r.weekly : r?.bt
  const name = branch ?? 'ภาพรวม'
  return (
    <Card title="พยากรณ์ยอดขาย 28 วัน" sub="ค่าเฉลี่ยวันเดียวกันของสัปดาห์ 8 สัปดาห์ล่าสุด · ย้อนทดสอบด้วยการซ่อน 28 วันสุดท้ายแล้วเทียบกับของจริง">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="เลือกสาขา">
          {[null, ...BRANCHES].map((b) => (
            <Pill key={b ?? 'all'} on={branch === b} onClick={() => setBranch(b)}>
              {b ?? 'รวม'}
            </Pill>
          ))}
        </div>
        <div className="flex gap-1" role="group" aria-label="หน่วยเวลา">
          <Pill on={!week} onClick={() => setUnit('day')}>รายวัน</Pill>
          <Pill on={week} onClick={() => setUnit('week')}>รายสัปดาห์</Pill>
        </div>
      </div>
      {result.error ? (
        <Pending lab="Lab 4.4" error={result.error} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="คาดการณ์ 7 วันข้างหน้า" value={formatBaht(r.next7)} />
            <Stat
              label={week ? `ย้อนทดสอบ ${m.weeks} สัปดาห์: คลาดเคลื่อนเฉลี่ยต่อสัปดาห์` : 'ย้อนทดสอบ 28 วัน: คลาดเคลื่อนเฉลี่ยต่อวัน'}
              value={`${m.mapeSeasonal.toFixed(1)}%`}
              note={week ? `วิธีดูวันในสัปดาห์ (รายวัน ${r.bt.mapeSeasonal.toFixed(1)}%)` : 'วิธีดูวันในสัปดาห์'}
            />
            <Stat label="ถ้าใช้ค่าเฉลี่ย 28 วันเส้นตรง" value={`${m.mapeFlat.toFixed(1)}%`} note={week ? `ตัวเปรียบเทียบ (รายวัน ${r.bt.mapeFlat.toFixed(1)}%)` : 'ตัวเปรียบเทียบ'} muted />
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={week ? r.weekChart : r.dayChart} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={36} tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
                <YAxis tickFormatter={formatBahtCompact} width={56} domain={[0, 'auto']} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(d) => (week ? `สัปดาห์ ${thaiDay(d)}` : thaiDay(d))}
                  formatter={(v, n) => [Array.isArray(v) ? `${formatBaht(v[0])} – ${formatBaht(v[1])}` : formatBaht(v), n]}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                {!week && <ReferenceLine x={r.lastDate} stroke={MUTED} strokeDasharray="3 3" label={{ value: 'ข้อมูลถึง', position: 'insideTopLeft', fontSize: 11, fill: INK }} />}
                {!week && <Area name="ช่วงคาดการณ์" dataKey="band" stroke="none" fill={GREEN[1]} isAnimationActive={false} />}
                <Line name={week ? 'ยอดจริงรายสัปดาห์' : 'ยอดจริง'} dataKey="actual" stroke={INK} strokeWidth={2} dot={week} isAnimationActive={false} />
                <Line name={week ? 'คาดการณ์รายสัปดาห์' : 'คาดการณ์'} dataKey="forecast" stroke={MAIN} strokeWidth={2} strokeDasharray="6 4" dot={week} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Insight>
            {r.bt.mapeFlat > r.bt.mapeSeasonal * 1.5
              ? `${name}: การดูวันในสัปดาห์ช่วยลดความคลาดเคลื่อนจาก ${r.bt.mapeFlat.toFixed(0)}% เหลือ ${r.bt.mapeSeasonal.toFixed(0)}% เพราะยอดวันธรรมดากับเสาร์-อาทิตย์ต่างกันมาก`
              : `${name}: สองวิธีแม่นพอ ๆ กัน (${r.bt.mapeSeasonal.toFixed(0)}% กับ ${r.bt.mapeFlat.toFixed(0)}%) ${branch ? '' : 'เพราะสาขาออฟฟิศกับห้างขายดีคนละวัน พอรวมกันรูปแบบรายสัปดาห์จึงหักล้างกัน'}`}
            {r.weekly && <> · รวมเป็นรายสัปดาห์ความคลาดเคลื่อนเหลือ {r.weekly.mapeSeasonal.toFixed(1)}% (รายวัน {r.bt.mapeSeasonal.toFixed(1)}%) เพราะความพลาดรายวันบางส่วนหักล้างกันเมื่อรวมทั้งสัปดาห์</>}{' '}
            ใช้วางแผนสต็อกและกะพนักงานรายสัปดาห์ได้ แต่ไม่ควรใช้ตัดสินยอดรายวันของสาขาเดียว
          </Insight>
        </>
      )}
    </Card>
  )
}

function AnomalyCard({ daily, holidays }) {
  const [focus, setFocus] = useState(null)
  const result = useMemo(() => tryRun(() => scoreAnomalies(daily, holidays)), [daily, holidays])
  if (result.error) {
    return (
      <Card title="วันที่ยอดขายผิดปกติ">
        <Pending lab="Lab 4.5" error={result.error} />
      </Card>
    )
  }
  const all = result.value
  const top = all.filter((a) => !a.holiday).slice(0, 15)
  const holidayHits = all.filter((a) => a.holiday).slice(0, 5)
  return (
    <Card title="วันที่ยอดขายผิดปกติ 15 อันดับ" sub="เทียบกับค่ากลางของวันเดียวกันของสัปดาห์ใน 8 สัปดาห์ก่อน · ไม่นับวันหยุดราชการ">
      {/* Lab 4.5B: เมื่อคลิกแถว (focus) ให้แสดงกราฟยอดจริงเทียบค่าปกติ ±4 สัปดาห์รอบวันนั้น */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm tabular-nums">
          <thead className="text-left text-ink-3">
            <tr>
              <th className="py-1 font-medium">#</th>
              <th className="font-medium">วันที่</th>
              <th className="font-medium">สาขา</th>
              <th className="text-right font-medium">ยอดจริง</th>
              <th className="text-right font-medium">ปกติ</th>
              <th className="pl-4 font-medium">ต่างจากปกติ</th>
            </tr>
          </thead>
          <tbody>
            {top.map((a, i) => {
              const sel = focus && focus.date === a.date && focus.branch === a.branch
              return (
                <tr
                  key={a.date + a.branch}
                  onClick={() => setFocus(sel ? null : a)}
                  className={`cursor-pointer border-t border-line transition hover:bg-surface-2 ${sel ? 'bg-surface-2 ring-2 ring-inset ring-brand' : ''}`}
                >
                  <td className="py-1.5 text-ink-3">{i + 1}</td>
                  <td className="text-ink">
                    {thaiDay(a.date)} <span className="text-ink-3">{new Date(a.date + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short' })}</span>
                  </td>
                  <td className="text-ink">{a.branch}</td>
                  <td className="text-right text-ink">{formatBaht(a.actual)}</td>
                  <td className="text-right text-ink-3">{formatBaht(a.expected)}</td>
                  <td className="pl-4">
                    {a.change < 0 ? (
                      <span className="font-medium text-down">▼ ต่ำกว่าปกติ {Math.round(-a.change * 100)}%</span>
                    ) : (
                      <span className="font-medium text-up">▲ สูงกว่าปกติ {Math.round(a.change * 100)}%</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Insight>
        อันดับต้น ๆ คือวันที่ควรโทรถามผู้จัดการสาขาว่าเกิดอะไรขึ้น · ระบบบอกได้ว่า “ผิดปกติ” แต่บอกไม่ได้ว่า “เพราะอะไร”
        {holidayHits.length > 0 && <> · วันหยุดที่ยอดเปลี่ยนมากแต่ไม่นับ เช่น {holidayHits.slice(0, 3).map((h) => `${h.holiday} (${h.branch})`).join(', ')}</>}
      </Insight>
    </Card>
  )
}

export default function ForecastTab({ source }) {
  const state = useAnalytics(source)
  return (
    <AnalyticsShell source={source} state={state}>
      {(d) =>
        d.daily.error ? (
          <Pending lab="pipeline" error={d.daily.error} />
        ) : (
          <>
            {d.meta.alerts?.length > 0 && (
              <p className="rounded-xl bg-down/10 p-3 text-sm text-down">
                🚨 ยอดวันล่าสุดผิดปกติ: {d.meta.alerts.map((a) => `${a.branch} ${formatBaht(a.actual)} (ปกติ ${formatBaht(a.expected)})`).join(', ')}
              </p>
            )}
            <ForecastCard daily={d.daily.rows} />
            <AnomalyCard daily={d.daily.rows} holidays={d.meta.holidays ?? {}} />
          </>
        )
      }
    </AnalyticsShell>
  )
}
