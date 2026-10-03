// Lab 3.2/3.3 · Dashboard ยอดขายแบบ real-time จาก Firestore (ต้องล็อกอินด้วย Google ก่อน)
// ใช้ชุดคำนวณและ component ของ Dashboard หลักทั้งหมด ไม่เขียนสูตรใหม่
import { useEffect, useMemo, useRef, useState } from 'react'
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
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
          : e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found'
            ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            : e.code === 'auth/invalid-email'
              ? 'รูปแบบอีเมลไม่ถูกต้อง'
              : e.code === 'auth/email-already-in-use'
                ? 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน'
                : e.code === 'auth/weak-password'
                  ? 'รหัสผ่านสั้นเกินไป ต้องมีอย่างน้อย 6 ตัวอักษร'
                  : e.code === 'auth/too-many-requests'
                    ? 'ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่'
                    : e.code === 'auth/network-request-failed'
                      ? 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ ตรวจแล้วลองใหม่'
                      : `ล็อกอินไม่สำเร็จ: ${e.message}`

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [busy, setBusy] = useState(false)

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

  async function submitEmail(e) {
    e.preventDefault()
    setAuthError(null)
    setBusy(true)
    try {
      const run = mode === 'signup' ? createUserWithEmailAndPassword : signInWithEmailAndPassword
      await run(auth, email.trim(), password)
    } catch (err) {
      setAuthError(authErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (user === undefined) return <div className={`${card} p-6 text-ink-2`}>กำลังตรวจสอบการเข้าสู่ระบบ…</div>
  if (user === null) {
    return (
      // ฉากหลังเป็นภาพมาสคอตอยู่ฝั่งขวา จึงวางการ์ดล็อกอินไว้ฝั่งซ้าย (มือถือวางไว้ด้านล่างเพื่อไม่บังหน้ามาสคอต)
      <div
        className="relative flex min-h-[700px] items-end overflow-hidden rounded-3xl border border-line shadow-sm sm:min-h-[580px] sm:items-center"
        style={{ backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: '78% center' }}
      >
        <div className="w-full p-4 sm:py-10 sm:pr-10 sm:pl-[4%] lg:pl-[14%]">
          <div className="w-full max-w-sm rounded-2xl bg-white/85 p-6 text-emerald-950 shadow-xl ring-1 ring-white/70 backdrop-blur-md sm:p-7">
            <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">บ้านบรู · ยอดขายสด</p>
            <h2 className="mt-1 text-2xl leading-tight font-bold">{mode === 'signup' ? 'สมัครสมาชิก' : 'ยินดีต้อนรับกลับมา'}</h2>
            <form onSubmit={submitEmail} className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-emerald-900">
                อีเมล
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none placeholder:text-emerald-900/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>
              <label className="block text-sm font-medium text-emerald-900">
                รหัสผ่าน
                <input
                  type="password"
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'อย่างน้อย 6 ตัวอักษร' : '••••••••'}
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none placeholder:text-emerald-900/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="bg-grad w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'กำลังดำเนินการ…' : mode === 'signup' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-emerald-900/50">
              <span className="h-px flex-1 bg-emerald-900/15" />
              หรือ
              <span className="h-px flex-1 bg-emerald-900/15" />
            </div>

            <button
              type="button"
              onClick={login}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50 active:scale-[0.99]"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
                <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
              </svg>
              เข้าสู่ระบบด้วย Google
            </button>
            {authError && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-2.5 text-sm text-red-700">
                ❌ {authError}
              </p>
            )}
            {/* กด "สมัครสมาชิก" แล้วการ์ดเดียวกันจะเปลี่ยนเป็นฟอร์มสมัคร (กดอีกครั้งเพื่อกลับมาเข้าสู่ระบบ) */}
            <p className="mt-4 text-center text-sm text-emerald-900/75">
              {mode === 'signup' ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signup' ? 'login' : 'signup')
                  setAuthError(null)
                }}
                className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
              >
                {mode === 'signup' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
              </button>
            </p>
            <p className="mt-4 text-center text-xs text-emerald-900/60">ข้อมูลยอดขายเปิดดูได้เฉพาะผู้ที่ล็อกอินเท่านั้น</p>
          </div>
        </div>
      </div>
    )
  }
  return <Dashboard user={user} />
}
