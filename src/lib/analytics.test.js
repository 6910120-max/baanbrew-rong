import { describe, it, expect } from 'vitest'
import { abcAnalysis, cohortRetention, monthsBetween, rfmScores, rfmSegmentOf, shiftMonth } from './analytics.js'

const row = (orderId, date, customer, product = 'P001', amount = 100) => ({ orderId, date, customer, product, qty: 1, amount })

describe('RFM', () => {
  it('ทุกคู่คะแนน R/F ต้องได้กลุ่ม (ไม่มีช่องว่าง)', () => {
    for (let r = 1; r <= 5; r++) for (let f = 1; f <= 5; f++) expect(rfmSegmentOf(r, f)).toBeTruthy()
  })
  it('ซื้อล่าสุด+ซื้อบ่อย = champions, หายไปนานและซื้อน้อย = lost', () => {
    expect(rfmSegmentOf(5, 5)).toBe('champions')
    expect(rfmSegmentOf(1, 1)).toBe('lost')
    expect(rfmSegmentOf(1, 4)).toBe('atRisk')
    expect(rfmSegmentOf(5, 1)).toBe('promising')
  })
  it('ให้คะแนน 1–5 ตามอันดับ ลูกค้าที่ซื้อล่าสุดและบ่อยสุดได้ 5', () => {
    const rows = []
    for (let i = 1; i <= 10; i++) {
      // ลูกค้า i ซื้อ i บิล บิลสุดท้ายเมื่อ (10 - i) วันก่อน asOf
      for (let b = 0; b < i; b++) rows.push(row(`O${i}-${b}`, `2026-01-${String(20 - (10 - i)).padStart(2, '0')}`, `C${i}`, 'P001', 10 * i))
    }
    const { members, segments } = rfmScores(rows, '2026-01-20')
    const best = members.find((m) => m.customer === 'C10')
    const worst = members.find((m) => m.customer === 'C1')
    expect([best.r, best.f, best.m]).toEqual([5, 5, 5])
    expect([worst.r, worst.f, worst.m]).toEqual([1, 1, 1])
    expect(best.segment).toBe('champions')
    expect(worst.segment).toBe('lost')
    expect(segments.reduce((s, x) => s + x.count, 0)).toBe(10)
  })
  it('ไม่นับลูกค้าทั่วไป (customer ว่าง) และไม่ crash ถ้าไม่มีสมาชิก', () => {
    expect(rfmScores([row('O1', '2026-01-01', '')], '2026-01-02').members).toHaveLength(0)
    expect(rfmScores([], '2026-01-02').segments.every((s) => s.count === 0 && s.share === 0)).toBe(true)
  })
  it('ค่าที่เท่ากันทั้งหมดได้คะแนนเดียวกัน', () => {
    const rows = ['A', 'B', 'C', 'D', 'E'].map((c, i) => row(`O${i}`, '2026-01-10', c))
    const { members } = rfmScores(rows, '2026-01-10')
    expect(new Set(members.map((m) => m.f)).size).toBe(1)
  })
})

describe('Cohort', () => {
  it('คำนวณเดือนข้ามปีถูกต้อง', () => {
    expect(monthsBetween('2025-11', '2026-02')).toBe(3)
    expect(shiftMonth('2025-11', 3)).toBe('2026-02')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
  it('จัด cohort ตามเดือนที่ซื้อครั้งแรก และนับ retention รายเดือน', () => {
    const rows = [
      row('O1', '2026-01-05', 'A'),
      row('O2', '2026-02-10', 'A'), // A กลับมาเดือนถัดไป
      row('O3', '2026-01-20', 'B'), // B ไม่กลับมา
      row('O4', '2026-02-03', 'C'), // C เริ่มเดือน ก.พ.
      row('O5', '2026-03-03', 'C'),
      row('O6', '2026-03-04', 'B'), // B กลับมาเดือนที่ 2
    ]
    const { months, cohorts, average } = cohortRetention(rows)
    expect(months).toEqual(['2026-01', '2026-02'])
    const jan = cohorts[0]
    expect(jan.size).toBe(2)
    expect(jan.cells.map((c) => c.rate)).toEqual([100, 50, 50]) // เดือน 0,1,2
    const feb = cohorts[1]
    expect(feb.cells.map((c) => c.rate)).toEqual([100, 100]) // เดือนที่ 2 ยังมาไม่ถึง ต้องไม่มีช่อง
    expect(average[1]).toBeCloseTo((2 / 3) * 100) // เดือนที่ 1: active 1 จาก jan(2) + 1 จาก feb(1) = 2 จาก 3 คน
    expect(average[2]).toBeCloseTo(50) // เดือนที่ 2 มีแค่ cohort ม.ค.
  })
  it('ไม่มีข้อมูลสมาชิก = ว่าง', () => {
    expect(cohortRetention([row('O1', '2026-01-01', '')]).cohorts).toEqual([])
  })
})

describe('ABC', () => {
  const rows = [
    ...[['P1', 700], ['P2', 150], ['P3', 80], ['P4', 40], ['P5', 20], ['P6', 10]].map(([p, a], i) => row(`O${i}`, '2026-01-01', '', p, a)),
  ]
  it('เรียงยอดขายมาก→น้อย แล้วตัดคลาส A ≤80% B ≤95% ที่เหลือ C', () => {
    const { items, classes } = abcAnalysis(rows)
    expect(items.map((p) => p.key)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6'])
    expect(items.map((p) => p.cls)).toEqual(['A', 'A', 'B', 'B', 'C', 'C'])
    // P1 = 70% (ยังไม่ถึง 80 → P2 ยังอยู่ A) แล้ว P2 พา cum ถึง 85%
    expect(items[1].cumulativeShare).toBeCloseTo(85)
    expect(classes.map((c) => c.count)).toEqual([2, 2, 2])
    expect(classes.reduce((s, c) => s + c.share, 0)).toBeCloseTo(100)
  })
  it('สินค้าชิ้นเดียวที่ครองเกิน 80% ยังเป็น A และไม่มีข้อมูลก็ไม่ crash', () => {
    expect(abcAnalysis([row('O1', '2026-01-01', '', 'P1', 500)]).items[0].cls).toBe('A')
    expect(abcAnalysis([]).classes.every((c) => c.count === 0)).toBe(true)
  })
})
