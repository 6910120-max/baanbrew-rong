// ส่วนประกอบร่วมของแท็บ Lab 4 ในธีมของเรา (สี/โหมดมืดมาจาก CSS variables ใน index.css)
import ChartCard from '../components/ChartCard'
import LoginPanel from '../lab3/LoginPanel.jsx'

export const INK = 'var(--ink)'
export const MUTED = 'var(--ink-3)'
// ไล่สีเดียว อ่อน→เข้ม ตามสีธีมที่เลือก
export const GREEN = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)', 'var(--c1)']
export const MAIN = 'var(--c1)'
export const pct = (x, d = 0) => (x * 100).toFixed(d) + '%'
export const thaiDay = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
export const thaiMonth = (ym) => new Date(ym + '-01T00:00:00').toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
export const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)', fontSize: 13 }

export function Card({ title, sub, children, table, filename, footer }) {
  return (
    <ChartCard title={title} subtitle={sub} table={table} filename={filename} footer={footer}>
      {children}
    </ChartCard>
  )
}

/** แสดงแทนส่วนที่ยังคำนวณไม่ได้ เช่น ฟังก์ชันยังเป็น "ยังไม่ได้ทำ" */
export function Pending({ lab, error }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-line p-6 text-center text-ink-3">
      <div className="font-medium text-ink-2">รอ {lab}</div>
      <div className="mt-1 text-sm">{error}</div>
    </div>
  )
}

export function Insight({ children }) {
  return <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">💡 {children}</p>
}

/** ส่วนหัวร่วม: ล็อกอิน, ความสดของข้อมูล, จำนวนเอกสารที่อ่าน */
export function AnalyticsShell({ source, state, children }) {
  const { user, data, error } = state
  if (user === undefined) return <div className="rounded-2xl border border-line bg-surface p-6 text-ink-2">กำลังตรวจสอบการเข้าสู่ระบบ…</div>
  if (!user) {
    // การ์ดล็อกอินเดียวกับแท็บ "สด · Firestore" (ล็อกอินครั้งเดียว ใช้ได้ทั้งสองแท็บ) · โหมดสาธิตซ่อนฟอร์มอีเมลเพราะไม่มี Firebase จริง
    return (
      <LoginPanel
        kicker="บ้านบรู · ผลวิเคราะห์ลูกค้า"
        footnote="ผลวิเคราะห์ลูกค้าเปิดดูได้เฉพาะผู้ที่ล็อกอินเท่านั้น (ล็อกอินเดียวกับแท็บ “สด”)"
        onGoogle={() => source.signIn()}
        emailLogin={source.mode !== 'demo'}
      />
    )
  }
  const m = data?.meta
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-3">
        <p>
          {m ? (
            <>
              ข้อมูลถึง {thaiDay(m.asOf)} · {m.rows?.toLocaleString()} รายการ ·{' '}
              {m.builtBy === 'demo' ? (
                <span className="rounded-md bg-surface-2 px-2 py-0.5 font-medium text-ink-2">โหมดสาธิต คำนวณในเบราว์เซอร์</span>
              ) : (
                <>
                  อัปเดต {m.builtAt ? new Date(m.builtAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '–'} โดย{' '}
                  {m.builtBy === 'github-actions' ? 'GitHub Actions' : 'เครื่องผู้สอน/ผู้เรียน'} · อ่าน {data.reads} เอกสาร
                </>
              )}
            </>
          ) : (
            'ผลวิเคราะห์ที่คำนวณล่วงหน้าแล้ว (pre-aggregation)'
          )}
        </p>
        <p className="flex items-center gap-2">
          <span className="text-ink-2">{user.displayName ?? user.email}</span>
          <button type="button" onClick={() => source.signOut()} className="rounded-lg px-2 py-1 hover:bg-surface-2 hover:text-ink">
            ออกจากระบบ
          </button>
        </p>
      </div>
      {error && <p className="rounded-xl bg-down/10 p-3 text-sm text-down">{error}</p>}
      {!data && !error && <div className="rounded-2xl border border-line bg-surface p-6 text-ink-2">กำลังโหลดผลวิเคราะห์…</div>}
      {data && children(data)}
    </div>
  )
}
