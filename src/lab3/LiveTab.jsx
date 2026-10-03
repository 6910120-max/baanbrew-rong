// Lab 3.2/3.3 · Dashboard ยอดขายแบบ real-time จาก Firestore (ต้องล็อกอินด้วย Google ก่อน)
// ใช้ชุดคำนวณและ component ของ Dashboard หลักทั้งหมด ไม่เขียนสูตรใหม่
import { useEffect, useMemo, useRef, useState } from 'react'
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, db, googleProvider, isConfigured } from './firebase.js'
import { addDays, todayBangkok } from './time.js'
import { BRANCHES } from './saleModel.js'
import SaleForm from './SaleForm.jsx'
import loginBg from '../assets/login-bg.webp'
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

const authErrorText = (e) =>
  e.code === 'auth/unauthorized-domain'
    ? 'โดเมนนี้ยังไม่ได้รับอนุญาต เพิ่มใน Authentication → Settings → Authorized domains'
    : e.code === 'auth/operation-not-allowed'
      ? 'ยังไม่ได้เปิดการล็อกอินด้วย Google ใน Authentication → Sign-in method'
      : e.code === 'auth/popup-blocked'
        ? 'เบราว์เซอร์บล็อกหน้าต่างล็อกอิน อนุญาต pop-up สำหรับเว็บนี้แล้วลองใหม่'
        : e.code === 'auth/popup-closed-by-user'
          ? 'ปิดหน้าต่างล็อกอินก่อนเสร็จ ลองกดอีกครั้ง'
          : `ล็อกอินไม่สำเร็จ: ${e.message}`

const card = 'rounded-2xl border border-line bg-surface shadow-sm'

function UserChip({ user }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2 py-1">
      {user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full" />}
      <span className="max-w-[10rem] truncate text-sm text-ink">{user.displayName ?? user.email}</span>
      <button type="button" onClick={() => signOut(auth)} className="rounded-lg px-2 py-1 text-xs text-ink-2 hover:bg-surface-2">
        ออกจากระบบ
      </button>
    </div>
  )
}

function Dashboard({ user }) {
  const { tv } = useI18n()
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
          <h2 className="mr-auto text-lg font-semibold text-ink">ยอดขายสด · Firestore</h2>
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
                        <td className="py-1.5 tabular-nums">{r.datetime.slice(5, 16).replace('T', ' ')}</td>
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
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    if (!isConfigured) return undefined
    return onAuthStateChanged(auth, setUser) // คืนฟังก์ชัน unsubscribe ให้ cleanup
  }, [])

  async function login() {
    setAuthError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setAuthError(authErrorText(e))
    }
  }

  if (user === undefined) return <div className={`${card} p-6 text-ink-2`}>กำลังตรวจสอบการเข้าสู่ระบบ…</div>
  if (user === null) {
    return (
      // ฉากหลังเป็นภาพมาสคอตอยู่ฝั่งขวา จึงวางการ์ดล็อกอินไว้ฝั่งซ้าย (มือถือวางไว้ด้านล่างเพื่อไม่บังหน้ามาสคอต)
      <div
        className="relative flex min-h-[540px] items-end overflow-hidden rounded-3xl border border-line shadow-sm sm:min-h-[480px] sm:items-center"
        style={{ backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: '78% center' }}
      >
        <div className="w-full p-4 sm:p-10">
          <div className="w-full max-w-sm rounded-2xl bg-white/85 p-6 text-emerald-950 shadow-xl ring-1 ring-white/70 backdrop-blur-md sm:p-7">
            <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">บ้านบรู · ยอดขายสด</p>
            <h2 className="mt-1 text-2xl leading-tight font-bold">ยินดีต้อนรับกลับมา</h2>
            <p className="mt-2 text-sm text-emerald-900/75">เข้าสู่ระบบเพื่อดูยอดขายแบบเรียลไทม์และบันทึกยอดขายของสาขา</p>
            <button
              type="button"
              onClick={login}
              className="bg-grad mt-5 flex w-full items-center justify-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 active:scale-[0.99]"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white">
                <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
                  <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
                  <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
                </svg>
              </span>
              เข้าสู่ระบบด้วย Google
            </button>
            {authError && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-2.5 text-sm text-red-700">
                ❌ {authError}
              </p>
            )}
            <p className="mt-4 text-center text-xs text-emerald-900/60">ข้อมูลยอดขายเปิดดูได้เฉพาะผู้ที่ล็อกอินเท่านั้น</p>
          </div>
        </div>
      </div>
    )
  }
  return <Dashboard user={user} />
}
