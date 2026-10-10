import { describe, it, expect } from 'vitest'
import { prepareRows } from './metrics.js'

// prepareRows keeps our own field names (orderId, amount, customer…) and also gives the names src/lib/analytics/ expects
describe('prepareRows · ฟิลด์สำหรับ src/lib/analytics', () => {
  const [member, walkIn] = prepareRows([
    { order_id: 'O1', datetime: '2026-02-14T10:20:30+07:00', branch: 'สยาม', product_id: 'P001', qty: '2', unit_price: '55', customer_id: 'C001', payment_method: 'เงินสด', channel: 'หน้าร้าน' },
    { order_id: 'O2', datetime: '2026-02-14T11:00:00+07:00', branch: 'สยาม', product_id: 'P002', qty: '1', unit_price: '65', customer_id: '', payment_method: 'เงินสด', channel: 'หน้าร้าน' },
  ])
  it('ชื่อฟิลด์แบบอาจารย์ตรงกับของเดิม', () => {
    expect(member).toMatchObject({ order_id: 'O1', product_id: 'P001', customer_id: 'C001', revenue: 110, date: '2026-02-14' })
    expect(member.datetime).toBe('2026-02-14T10:20:30+07:00')
    expect(member.revenue).toBe(member.amount)
  })
  it('ลูกค้า walk-in = customer_id ว่าง (ไม่นับเป็นสมาชิก)', () => {
    expect(walkIn.customer_id).toBe('')
    expect(walkIn.customer).toBe('')
  })
  it('ฟิลด์เดิมที่หน้าเว็บใช้ยังอยู่ครบ', () => {
    expect(member).toMatchObject({ orderId: 'O1', product: 'P001', customer: 'C001', amount: 110, hour: 10 })
  })
})
