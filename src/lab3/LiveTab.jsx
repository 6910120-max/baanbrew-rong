// Lab 3.2/3.3 · Dashboard ยอดขายแบบ real-time จาก Firestore (ต้องล็อกอินด้วย Google ก่อน)
// ใช้ชุดคำนวณและ component ของ Dashboard หลักทั้งหมด ไม่เขียนสูตรใหม่
import { useEffect, useMemo, useRef, useState } from 'react'
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, db, isConfigured } from './firebase.js'
import { addDays, todayBangkok } from './time.js'
import { BRANCHES } from './saleModel.js'
import SaleForm from './SaleForm.jsx'
import LoginPanel from './LoginPanel.jsx'
import KpiCard from '../components/KpiCard'
import ChartCard from '../components/ChartCard'
import DailySalesChart from '../components/DailySalesChart'
import HourlyChart from '../components/HourlyChart'
import HBarChart from '../components/HBarChart'
import { useI18n } from '../lib/i18n'
import { formatBaht, formatNumber, formatPercent } from '../lib/format'
import { computeKpis, dailySales, prepareRows, salesByBranch, salesByHour, withMovingAverage } from '../lib/metrics'

const RANGES = [
  { id: 'today', label: 'วันนี้', days: 1 },
  { id: '7', label: '7 วัน', days: 7 },
  { id: '30', label: '30 วัน', days: 30 },
]
const HIGHLIGHT_MS = 4000

const errorText = (e) =>
  e.code === 'permission-denied'
    ? 'ไม่มีสิทธิ์อ่านข้อมูล (ถูกปฏิเสธโดย Security Rules)'
    : e.code === 'failed-precondition'
      ? 'ต้องสร้าง index ใน Firestore ก่อน (ดูลิงก์ใน console ของเบราว์เซอร์)'
      : e.code === 'unavailable'
        ? 'เชื่อมต่อ Firestore ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่'
        : `เกิดข้อผิดพลาด: ${e.message}`

const card = 'rounded-2xl border border-line bg-surface shadow-sm'

/** การ์ดโปรไฟล์ผู้ใช้: รูป (หรืออักษรแรกถ้าไม่มีรูป) + จุดสถานะออนไลน์ + ทักทายด้วยชื่อ + ปุ่มออกจากระบบ */
function UserChip({ user }) {
  const name = user.displayName ?? user.email?.split('@')[0] ?? 'ผู้ใช้'
  const initial = [...name][0]?.toUpperCase() ?? '?'
  const [confirming, setConfirming] = useState(false)

  // กด Esc เพื่อปิดหน้าต่างยืนยัน
  useEffect(() => {
    if (!confirming) return undefined
    const onKey = (e) => e.key === 'Escape' && setConfirming(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirming])

  return (
    <div className="flex items-center gap-3 rounded-full border border-line bg-surface py-1 pr-1.5 pl-1 shadow-sm">
      <span className="relative shrink-0">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="h-10 w-10 rounded-full ring-2 ring-brand/70 ring-offset-2 ring-offset-surface"
          />
        ) : (
          <span className="bg-grad grid h-10 w-10 place-items-center rounded-full text-base font-semibold text-white ring-2 ring-brand/70 ring-offset-2 ring-offset-surface">
            {initial}
          </span>
        )}
        <span title="ออนไลน์" className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-surface bg-up" />
      </span>
      <span className="hidden min-w-0 leading-tight sm:block">
        <span className="block text-[11px] text-ink-3">สวัสดี 👋</span>
        <span className="block max-w-[11rem] truncate text-sm font-semibold text-ink">{name}</span>
      </span>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title="ออกจากระบบ"
        aria-label="ออกจากระบบ"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-down"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => setConfirming(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-2xl"
          >
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-down">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </span>
            <h3 id="logout-title" className="mt-3 text-lg font-semibold text-ink">
              ออกจากระบบ?
            </h3>
            <p className="mt-1 text-sm text-ink-2">คุณกำลังจะออกจากระบบของ {name} ต้องเข้าสู่ระบบใหม่เพื่อดูและบันทึกยอดขายอีกครั้ง</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirming(false)}
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-2"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  signOut(auth)
                }}
                className="rounded-xl bg-down px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:brightness-110"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** ป้าย "สด" กะพริบ บอกว่าข้อมูลอัปเดตแบบเรียลไทม์ */
function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-up">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-up" />
      </span>
      LIVE
    </span>
  )
}

function Dashboard({ user }) {
  const { tv, d } = useI18n()
  const [rangeId, setRangeId] = useState('7')
  const [branch, setBranch] = useState('all')
  const [docs, setDocs] = useState([]) // [{ id, ...fields }]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reads, setReads] = useState(0) // จำนวนเอกสารที่อ่านไปแล้วทั้งหมด
  const [fresh, setFresh] = useState(() => new Set()) // id ที่เพิ่งเข้ามา (ไฮไลต์ชั่วคราว)
  const [products, setProducts] = useState(null)
  const timers = useRef([])

  const days = RANGES.find((r) => r.id === rangeId).days
  const end = todayBangkok()
  const start = addDays(end, -(days - 1))

  // เมนูสำหรับฟอร์มและแสดงชื่อเมนู โหลดครั้งเดียว
  useEffect(() => {
    getDocs(collection(db, 'products'))
      .then((s) => setProducts(s.docs.map((d) => d.data()).sort((a, b) => a.product_id.localeCompare(b.product_id))))
      .catch((e) => setError(errorText(e)))
  }, [])

  // ฟังยอดขายตามช่วงเวลา · ต้อง return unsubscribe เพื่อไม่ให้ listener ค้างและนับอ่านซ้ำ
  useEffect(() => {
    const store = new Map()
    let first = true
    setLoading(true)
    setError(null)
    setDocs([])

    const q = query(collection(db, 'sales'), where('date', '>=', start), where('date', '<=', end), orderBy('date'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const changes = snap.docChanges()
        const added = []
        for (const c of changes) {
          if (c.type === 'removed') store.delete(c.doc.id)
          else store.set(c.doc.id, { id: c.doc.id, ...c.doc.data() })
          if (c.type === 'added' && !first) added.push(c.doc.id)
        }
        first = false
        setReads((n) => n + changes.length)
        setDocs([...store.values()])
        setLoading(false)
        if (added.length) {
          setFresh((prev) => new Set([...prev, ...added]))
          timers.current.push(
            setTimeout(() => {
              setFresh((prev) => {
                const next = new Set(prev)
                added.forEach((id) => next.delete(id))
                return next
              })
            }, HIGHLIGHT_MS),
          )
        }
      },
      (e) => {
        setError(errorText(e))
        setLoading(false)
      },
    )
    return () => {
      unsubscribe()
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeId])

  // แปลงเอกสาร Firestore ให้เป็นแถวแบบเดียวกับ sales.csv (customer_id = null คือลูกค้าทั่วไป) แล้วใช้ชุดคำนวณเดิม
  const rows = useMemo(
    () => prepareRows(docs.map((d) => ({ ...d, customer_id: d.customer_id ?? '' }))).filter((r) => branch === 'all' || r.branch === branch),
    [docs, branch],
  )
  const kpis = useMemo(() => computeKpis(rows), [rows])
  const byBranch = useMemo(() => salesByBranch(rows), [rows])
  const byHour = useMemo(() => salesByHour(rows), [rows])
  const daily = useMemo(() => withMovingAverage(dailySales(rows, { from: start, to: end })), [rows, start, end])
  // ตารางล่าสุดใช้เอกสารดิบ (มี id และ datetime) กรองสาขาแบบเดียวกับตัวเลขด้านบน
  const recent = useMemo(
    () =>
      docs
        .filter((d) => branch === 'all' || d.branch === branch)
        .sort((a, b) => b.datetime.localeCompare(a.datetime))
        .slice(0, 8),
    [docs, branch],
  )
  const productName = useMemo(() => Object.fromEntries((products ?? []).map((p) => [p.product_id, p.product_name])), [products])
  const isToday = rangeId === 'today'

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto flex items-center gap-3">
            <h2 className="text-lg font-semibold text-ink">ยอดขายสด · Firestore</h2>
            <LiveBadge />
          </div>
          <div role="group" aria-label="ช่วงเวลา" className="flex gap-0.5 rounded-xl border border-line bg-surface p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRangeId(r.id)}
                aria-pressed={rangeId === r.id}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  rangeId === r.id ? 'bg-grad text-white shadow' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            aria-label="สาขา"
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="all">ทุกสาขา</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {tv(b)}
              </option>
            ))}
          </select>
          <UserChip user={user} />
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-down/30 p-3 text-sm text-down">
            ❌ {error}
          </p>
        )}
        {loading && !error && <div className={`${card} p-6 text-ink-2`}>กำลังโหลดข้อมูล…</div>}

        {!loading && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <KpiCard accent label="ยอดขายรวม" value={formatBaht(kpis.totalSales)} />
              <KpiCard label="จำนวนบิล" value={formatNumber(kpis.orderCount)} />
              <KpiCard label="ยอดเฉลี่ยต่อบิล" value={formatBaht(kpis.averageOrderValue, 2)} />
              <KpiCard label="ลูกค้าสมาชิก" value={formatNumber(kpis.memberCount)} />
            </div>

            <ChartCard
              title={isToday ? 'ยอดขายรายชั่วโมง (วันนี้)' : 'ยอดขายรายวัน'}
              subtitle={`ข้อมูลสดจาก Firestore · ${start} ถึง ${end}`}
            >
              {rows.length === 0 ? (
                <p className="grid h-40 place-items-center text-ink-3">ยังไม่มีข้อมูลในช่วงนี้</p>
              ) : isToday ? (
                <HourlyChart data={byHour} />
              ) : (
                <DailySalesChart data={daily} />
              )}
            </ChartCard>

            <ChartCard title="ยอดขายแยกสาขา" subtitle="เปลี่ยนตามช่วงเวลาที่เลือก">
              {byBranch.length === 0 ? (
                <p className="grid h-24 place-items-center text-ink-3">ยังไม่มีข้อมูลในช่วงนี้</p>
              ) : (
                <HBarChart
                  data={byBranch}
                  categoryKey="key"
                  formatCategory={tv}
                  tooltipExtra={(p) => `${formatPercent(p.share)} · ${formatNumber(p.orders)} บิล`}
                  rowHeight={48}
                  barSize={26}
                />
              )}
            </ChartCard>

            <section className={`${card} p-4 sm:p-5`}>
              <h2 className="font-semibold text-ink">รายการล่าสุด</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-ink-3">
                    <tr>
                      <th className="pb-1 font-normal">เวลา</th>
                      <th className="pb-1 font-normal">สาขา</th>
                      <th className="pb-1 font-normal">เมนู</th>
                      <th className="pb-1 text-right font-normal">จำนวน</th>
                      <th className="pb-1 text-right font-normal">ยอด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id} className={`border-t border-line text-ink transition-colors duration-700 ${fresh.has(r.id) ? 'bg-surface-2' : ''}`}>
                        {/* วันที่รูปแบบเดียวกับกราฟ (พ.ศ. แบบสั้น เช่น 3 ต.ค. 69) ตามด้วยเวลา ตัดจากข้อความตรง ๆ จึงไม่เลื่อนเป็น UTC */}
                        <td className="py-1.5 whitespace-nowrap tabular-nums">
                          {d.axisDate(r.datetime.slice(0, 10))} · {r.datetime.slice(11, 16)}
                        </td>
                        <td className="py-1.5">{tv(r.branch)}</td>
                        <td className="py-1.5">{productName[r.product_id] ?? r.product_id}</td>
                        <td className="py-1.5 text-right tabular-nums">{r.qty}</td>
                        <td className="py-1.5 text-right tabular-nums">{formatBaht(r.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="text-xs text-ink-3">อ่านเอกสารไปแล้ว {formatNumber(reads)} รายการ (นับรวมทุกครั้งที่ข้อมูลเปลี่ยน)</p>
          </>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        {products ? <SaleForm products={products} uid={user.uid} /> : <div className={`${card} p-6 text-ink-2`}>กำลังโหลดเมนู…</div>}
      </aside>
    </div>
  )
}

// ด่านล็อกอิน: ยังไม่ล็อกอินจะไม่ render Dashboard จึงไม่เริ่ม onSnapshot และไม่อ่าน Firestore
export default function LiveTab() {
  const [user, setUser] = useState(undefined) // undefined = กำลังตรวจสถานะ, null = ยังไม่ล็อกอิน
  useEffect(() => {
    if (!isConfigured) return undefined
    return onAuthStateChanged(auth, setUser) // คืนฟังก์ชัน unsubscribe ให้ cleanup
  }, [])

  if (user === undefined) return <div className={`${card} p-6 text-ink-2`}>กำลังตรวจสอบการเข้าสู่ระบบ…</div>
  if (user === null) return <LoginPanel />
  return <Dashboard user={user} />
}
