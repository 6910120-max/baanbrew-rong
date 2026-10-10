// Lab 4.1–4.2 · ลูกค้าและเมนู: RFM (+ เจาะดูรายชื่อ), Cohort, ABC · หน้าตาใช้ธีมของโปรเจกต์ ส่วนข้อมูลมาจาก src/lib/analytics/
import { useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LabelList, Cell, ReferenceLine,
} from 'recharts'
import { AnalyticsShell, Card, Pending, Insight, GREEN, MAIN, MUTED, INK, pct, thaiMonth, tooltipStyle } from './ui.jsx'
import { useAnalytics } from './useAnalytics.js'
import { SEGMENTS } from '../lib/analytics/rfm.js'
import { downloadCsv } from '../lib/exportCsv'
import { formatBaht, formatNumber } from '../lib/format'

const SEG_TH = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]))
const axisTick = { fill: 'var(--ink-3)', fontSize: 12 }
const SHOW_MEMBERS = 15 // แสดงกี่คนในการ์ดรายชื่อ (CSV มีทั้งกลุ่ม)

// ---------------- RFM · รายชื่อลูกค้าในกลุ่มที่คลิก (Lab 4.1B) ----------------
const MEMBER_COLUMNS = [
  { key: 'id', label: 'รหัสลูกค้า' },
  { key: 'R', label: 'ไม่ได้มา (วัน)' },
  { key: 'F', label: 'จำนวนบิล' },
  { key: 'M', label: 'ยอดซื้อรวม (บาท)', csv: (c) => Math.round(c.M) },
  { key: 'score', label: 'คะแนน R-F-M', csv: (c) => `${c.r}-${c.f}-${c.m}` },
]

function SegmentMembers({ segment, customers, onClose }) {
  const info = SEG_TH[segment]
  // เรียงตามยอดซื้อรวมมากไปน้อย (เท่ากันเรียงตามรหัสเพื่อให้ผลคงที่)
  const list = customers.filter((c) => c.segment === segment).sort((a, b) => b.M - a.M || a.id.localeCompare(b.id))
  return (
    <div className="mt-4 rounded-xl border border-line bg-surface-2/50 p-4" role="region" aria-label={`รายชื่อลูกค้ากลุ่ม ${info.th}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink">
            {info.th} <span className="font-normal text-ink-3">{segment}</span> · {formatNumber(list.length)} คน
          </h3>
          <p className="text-sm text-ink-3">
            แสดง {Math.min(SHOW_MEMBERS, list.length)} คนแรกที่ยอดซื้อสูงสุด · ควรทำ: {info.action}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => downloadCsv(`rfm-${segment.toLowerCase().replace(/\s+/g, '-')}.csv`, MEMBER_COLUMNS, list)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-2"
          >
            ดาวน์โหลด CSV ({formatNumber(list.length)} แถว)
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดรายชื่อ"
            className="rounded-lg px-3 py-1.5 text-sm text-ink-3 transition hover:bg-surface hover:text-ink"
          >
            ปิด ✕
          </button>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm tabular-nums">
          <thead className="text-left text-ink-3">
            <tr>
              <th className="py-1 font-medium">รหัส</th>
              <th className="text-right font-medium">ไม่ได้มา (วัน)</th>
              <th className="text-right font-medium">บิล</th>
              <th className="text-right font-medium">ยอดซื้อ</th>
              <th className="text-right font-medium">R-F-M</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, SHOW_MEMBERS).map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="py-1.5 font-medium text-ink">{c.id}</td>
                <td className="text-right text-ink-2">{formatNumber(c.R)}</td>
                <td className="text-right text-ink-2">{formatNumber(c.F)}</td>
                <td className="text-right text-ink">{formatBaht(c.M)}</td>
                <td className="text-right text-ink-2">
                  {c.r}-{c.f}-{c.m}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------- RFM ----------------
function RfmCard({ rfm, onPick, picked }) {
  if (rfm.error) {
    return (
      <Card title="RFM · กลุ่มลูกค้า">
        <Pending lab="Lab 4.1" error={rfm.error} />
      </Card>
    )
  }
  const data = rfm.segments.map((s) => ({ ...s, label: SEG_TH[s.segment].th }))
  const ch = rfm.segments.find((s) => s.segment === 'Champions')
  const risk = rfm.segments.find((s) => s.segment === 'At Risk')
  const pick = (d) => onPick?.(d.payload?.segment ?? d.segment)
  return (
    <Card
      title="RFM · กลุ่มลูกค้าสมาชิก"
      sub="สัดส่วนจำนวนลูกค้า เทียบกับสัดส่วนยอดซื้อ · คลิกแท่งหรือแถวในตารางเพื่อดูรายชื่อ"
      filename="rfm-segments"
      table={{
        columns: [
          { key: 'segment', label: 'กลุ่ม', align: 'left', format: (v) => SEG_TH[v].th, csv: (r) => `${SEG_TH[r.segment].th} (${r.segment})` },
          { key: 'customers', label: 'ลูกค้า', format: (v) => formatNumber(v) },
          { key: 'customerShare', label: '% ลูกค้า', format: (v) => pct(v, 1), csv: (r) => (r.customerShare * 100).toFixed(1) },
          { key: 'revenue', label: 'ยอดซื้อ', format: (v) => formatBaht(v), csv: (r) => Math.round(r.revenue) },
          { key: 'revenueShare', label: '% ยอดซื้อ', format: (v) => pct(v, 1), csv: (r) => (r.revenueShare * 100).toFixed(1) },
        ],
        rows: rfm.segments,
      }}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48 }} barGap={2}>
            <CartesianGrid horizontal={false} stroke="var(--line)" />
            <XAxis type="number" tickFormatter={(v) => pct(v)} domain={[0, 0.45]} tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
            <YAxis type="category" dataKey="label" width={96} tick={{ ...axisTick, fontSize: 13 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v, n) => [pct(v, 1), n]} cursor={{ fill: 'var(--surface-2)' }} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar name="% ลูกค้า" dataKey="customerShare" fill={MUTED} radius={[0, 4, 4, 0]} isAnimationActive={false} onClick={pick} style={{ cursor: 'pointer' }} />
            <Bar name="% ยอดซื้อ" dataKey="revenueShare" fill={MAIN} radius={[0, 4, 4, 0]} isAnimationActive={false} onClick={pick} style={{ cursor: 'pointer' }}>
              {data.map((d) => (
                <Cell key={d.segment} fill={picked && picked !== d.segment ? GREEN[2] : MAIN} />
              ))}
              <LabelList dataKey="revenueShare" position="right" formatter={(v) => pct(v)} style={{ fontSize: 12, fill: INK }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Insight>
        ลูกค้าชั้นยอด {formatNumber(ch.customers)} คน ({pct(ch.customerShare)} ของสมาชิก) ทำยอด {pct(ch.revenueShare)} · กลุ่มเสี่ยงหาย{' '}
        {formatNumber(risk.customers)} คน ยังถือยอด {pct(risk.revenueShare)} เป็นเป้าหมายแรกของแคมเปญดึงกลับ
      </Insight>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-ink-3">
            <tr>
              <th className="py-1 font-medium">กลุ่ม</th>
              <th className="text-right font-medium">ลูกค้า</th>
              <th className="text-right font-medium">ยอดซื้อ</th>
              <th className="pl-4 font-medium">ควรทำอะไร</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => {
              const on = picked === d.segment
              return (
                <tr
                  key={d.segment}
                  tabIndex={0}
                  aria-selected={on}
                  onClick={() => onPick?.(d.segment)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onPick?.(d.segment)
                    }
                  }}
                  className={`cursor-pointer border-t border-line transition hover:bg-surface-2 ${on ? 'bg-surface-2 ring-2 ring-inset ring-brand' : ''}`}
                >
                  <td className="py-1.5 text-ink">
                    {d.label} <span className="text-ink-3">{d.segment}</span>
                  </td>
                  <td className="text-right tabular-nums text-ink-2">{formatNumber(d.customers)}</td>
                  <td className="text-right tabular-nums text-ink-2">{formatBaht(d.revenue)}</td>
                  <td className="pl-4 text-ink-3">{SEG_TH[d.segment].action}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {picked && <SegmentMembers segment={picked} customers={rfm.customers} onClose={() => onPick(picked)} />}
    </Card>
  )
}

// ---------------- Cohort ----------------
// ระดับสี 0–4 จากสัดส่วนที่กลับมา (สเกลเดียวกันทั้งตาราง: 0–20% อ่อนสุด … 80%+ เข้มสุด)
const retentionLevel = (v) => Math.min(4, Math.floor(v * 5))

function CohortCard({ cohort }) {
  if (cohort.error) {
    return (
      <Card title="Cohort · การกลับมาซื้อซ้ำ">
        <Pending lab="Lab 4.2" error={cohort.error} />
      </Card>
    )
  }
  const MAXK = 12
  const avg1 = (() => {
    const xs = cohort.cohorts.filter((c) => c.retention.length > 2).map((c) => c.retention[1])
    return xs.reduce((a, b) => a + b, 0) / xs.length
  })()
  return (
    <Card title="Cohort · การกลับมาซื้อซ้ำ" sub="แถว = เดือนแรกที่ซื้อ · คอลัมน์ = เดือนที่เท่าไรหลังจากนั้น · ช่องลายขีด = เดือนล่าสุดที่ข้อมูลยังไม่ครบ · เอาเมาส์ชี้ช่องเพื่อดูรายละเอียด">
      <div className="overflow-x-auto">
        <div className="inline-grid gap-[2px] text-xs tabular-nums" style={{ gridTemplateColumns: `72px 44px repeat(${MAXK + 1}, 40px)` }}>
          <div className="font-medium text-ink-3">เดือนแรก</div>
          <div className="text-right font-medium text-ink-3">คน</div>
          {Array.from({ length: MAXK + 1 }, (_, k) => (
            <div key={k} className="text-center font-medium text-ink-3">
              {k}
            </div>
          ))}
          {cohort.cohorts.map((c) => (
            <CohortRow key={c.cohort} c={c} MAXK={MAXK} partial={cohort.lastMonthPartial} />
          ))}
        </div>
      </div>
      <Insight>
        โดยเฉลี่ยลูกค้าใหม่กลับมาซื้อในเดือนถัดไป {pct(avg1)} · ช่องแนวทแยงล่างขวาดูต่ำผิดปกติเพราะ {thaiMonth(cohort.lastMonth)} มีข้อมูล{' '}
        {cohort.daysInLastMonth} จาก {cohort.daysInMonth} วัน (กับดักเดียวกับกราฟ 4 ใน Lab 2.2)
      </Insight>
    </Card>
  )
}

function CohortRow({ c, MAXK, partial }) {
  const last = c.retention.length - 1
  return (
    <>
      <div className="py-1 text-ink-2">{thaiMonth(c.cohort)}</div>
      <div className="py-1 text-right text-ink-3">{c.size}</div>
      {Array.from({ length: MAXK + 1 }, (_, k) => {
        const v = c.retention[k]
        if (v === undefined) return <div key={k} />
        const isPartial = partial && k === last && k > 0
        const level = retentionLevel(v)
        const color = `var(--heat-${level})`
        return (
          <div
            key={k}
            title={`${thaiMonth(c.cohort)} เดือนที่ ${k}: ${pct(v, 1)}${isPartial ? ' (เดือนไม่ครบ)' : ''}`}
            className={`flex h-7 items-center justify-center rounded-[3px] ${level >= 3 ? 'text-white' : 'text-ink'}`}
            style={{ background: isPartial ? `repeating-linear-gradient(45deg, ${color}, ${color} 4px, var(--surface) 4px, var(--surface) 6px)` : color }}
          >
            {k === 0 ? '' : Math.round(v * 100)}
          </div>
        )
      })}
    </>
  )
}

// ---------------- ABC ----------------
function AbcCard({ abc }) {
  if (abc.error) {
    return (
      <Card title="Pareto · ABC ของเมนู">
        <Pending lab="Lab 4.2" error={abc.error} />
      </Card>
    )
  }
  const items = abc.items
  const nA = items.filter((i) => i.cls === 'A').length
  const C = items.filter((i) => i.cls === 'C')
  const fill = { A: MAIN, B: 'var(--c2)', C: 'var(--ink-3)' }
  return (
    <Card
      title="Pareto · ABC ของเมนู"
      sub="แท่ง = สัดส่วนยอดขายแต่ละเมนู · เส้น = ยอดสะสม · แกนเดียวกันเป็น % · เอาเมาส์ชี้แท่งเพื่อดูชื่อเมนู"
      filename="abc-menu"
      table={{
        columns: [
          { key: 'rank', label: 'อันดับ', align: 'left' },
          { key: 'name', label: 'เมนู', align: 'left', csv: (r) => `${r.product_id} ${r.name}` },
          { key: 'cls', label: 'กลุ่ม' },
          { key: 'revenue', label: 'ยอดขาย', format: (v) => formatBaht(v), csv: (r) => Math.round(r.revenue) },
          { key: 'share', label: '% ยอดขาย', format: (v) => pct(v, 1), csv: (r) => (r.share * 100).toFixed(1) },
          { key: 'cumShare', label: '% สะสม', format: (v) => pct(v, 1), csv: (r) => (r.cumShare * 100).toFixed(1) },
        ],
        rows: items,
      }}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={items} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="rank"
              tick={{ ...axisTick, fontSize: 11 }}
              interval={4}
              tickLine={false}
              axisLine={{ stroke: 'var(--line)' }}
              label={{ value: 'อันดับเมนู', position: 'insideBottomRight', offset: -2, fontSize: 12, fill: 'var(--ink-3)' }}
            />
            <YAxis tickFormatter={(v) => pct(v)} domain={[0, 1]} width={44} tick={axisTick} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'var(--surface-2)' }}
              labelFormatter={(r) => {
                const it = items[r - 1]
                return `#${r} ${it.name} · กลุ่ม ${it.cls}`
              }}
              formatter={(v, n) => [pct(v, 1), n]}
            />
            <ReferenceLine y={0.8} stroke={MUTED} strokeDasharray="4 4" label={{ value: '80%', position: 'right', fontSize: 11, fill: INK }} />
            <Bar name="สัดส่วนยอดขาย" dataKey="share" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {items.map((i) => (
                <Cell key={i.product_id} fill={fill[i.cls]} />
              ))}
            </Bar>
            <Line name="ยอดสะสม" dataKey="cumShare" stroke={INK} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink-2">
        {['A', 'B', 'C'].map((k) => (
          <span key={k}>
            <i className="mr-1.5 inline-block h-3 w-3 rounded-sm align-[-1px]" style={{ background: fill[k] }} />
            กลุ่ม {k} {items.filter((i) => i.cls === k).length} เมนู
          </span>
        ))}
      </div>
      <Insight>
        {nA} เมนูจาก {items.length} ทำยอด 80% · กลุ่ม C ({C.map((i) => i.name).join(', ')}) รวมกันแค่ {pct(C.reduce((s, i) => s + i.share, 0), 1)} ควรทบทวนก่อนเพิ่มเมนูใหม่
      </Insight>
    </Card>
  )
}

export default function CustomersTab({ source }) {
  const state = useAnalytics(source)
  const [picked, setPicked] = useState(null)
  return (
    <AnalyticsShell source={source} state={state}>
      {(d) => (
        <>
          <RfmCard rfm={d.rfm} picked={picked} onPick={(s) => setPicked((p) => (p === s ? null : s))} />
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <CohortCard cohort={d.cohort} />
            <AbcCard abc={d.abc} />
          </div>
        </>
      )}
    </AnalyticsShell>
  )
}
