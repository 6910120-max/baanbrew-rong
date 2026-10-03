// Lab 3.2C · ฟอร์มบันทึกยอดขาย (วางไว้คอลัมน์ขวาของหน้าสด)
import { useState } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.js'
import { BRANCHES, PAYMENTS, MAX_QTY, validateSaleForm, buildSale } from './saleModel.js'
import { formatBaht } from '../lib/format'

const EMPTY = { branch: '', product_id: '', qty: '1', payment_method: '', customer_id: '' }

const inputClass =
  'mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30'

function Field({ label, error, children }) {
  return (
    <label className="block text-sm font-medium text-ink-2">
      {label}
      {children}
      {error && <span className="mt-1 block text-xs font-normal text-down">{error}</span>}
    </label>
  )
}

/** products = รายการเมนูจาก Firestore · uid = ผู้ใช้ที่ล็อกอิน (ใช้เป็น created_by) */
export default function SaleForm({ products, uid }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null) // { ok, message }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const product = products.find((p) => p.product_id === form.product_id)
  const qty = Number(form.qty)
  const total = product && Number.isInteger(qty) && qty >= 1 && qty <= MAX_QTY ? qty * Number(product.price) : null

  async function submit(e) {
    e.preventDefault()
    setResult(null)
    const found = validateSaleForm(form, products)
    setErrors(found)
    if (Object.keys(found).length) return

    const { id, data } = buildSale(form, product, { uid })
    setSaving(true)
    try {
      await setDoc(doc(db, 'sales', id), { ...data, created_at: serverTimestamp() })
      setResult({ ok: true, message: `บันทึกแล้ว ${id} · ${formatBaht(data.revenue)}` })
      setForm((f) => ({ ...EMPTY, branch: f.branch })) // จำสาขาไว้ ลดการกรอกซ้ำ
    } catch (err) {
      setResult({
        ok: false,
        message: err.code === 'permission-denied' ? 'ถูกปฏิเสธโดย Security Rules' : `บันทึกไม่สำเร็จ: ${err.message}`,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <h2 className="font-semibold text-ink">บันทึกยอดขาย</h2>

      <Field label="สาขา" error={errors.branch}>
        <select className={inputClass} value={form.branch} onChange={set('branch')}>
          <option value="">เลือกสาขา</option>
          {BRANCHES.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </Field>

      <Field label="เมนู" error={errors.product_id}>
        <select className={inputClass} value={form.product_id} onChange={set('product_id')}>
          <option value="">เลือกเมนู</option>
          {products.map((p) => (
            <option key={p.product_id} value={p.product_id}>
              {p.product_name} · {formatBaht(Number(p.price))}
            </option>
          ))}
        </select>
      </Field>

      <Field label={`จำนวน (1–${MAX_QTY})`} error={errors.qty}>
        <input className={inputClass} inputMode="numeric" value={form.qty} onChange={set('qty')} />
      </Field>

      <Field label="วิธีชำระเงิน" error={errors.payment_method}>
        <select className={inputClass} value={form.payment_method} onChange={set('payment_method')}>
          <option value="">เลือกวิธีชำระเงิน</option>
          {PAYMENTS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>

      <Field label="รหัสสมาชิก (ไม่บังคับ)" error={errors.customer_id}>
        <input className={inputClass} placeholder="เช่น C01234" value={form.customer_id} onChange={set('customer_id')} />
      </Field>

      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-sm text-ink-2">ยอดรวม</span>
        <span className="text-xl font-semibold tabular-nums text-ink">{total == null ? '–' : formatBaht(total)}</span>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-grad w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'กำลังบันทึก…' : 'บันทึกยอดขาย'}
      </button>

      {result && (
        <p role="status" className={`text-sm ${result.ok ? 'text-up' : 'text-down'}`}>
          {result.ok ? '✅ ' : '❌ '}
          {result.message}
        </p>
      )}
    </form>
  )
}
