// Lab 4.2 · ใช้ Claude Code เขียนฟังก์ชันที่ยังว่าง (Prompt 4.2A ใน PROMPTS_LAB4.md) จนกว่า npm test จะผ่าน · ห้ามแก้ไฟล์ test
// Lab 4.2 · Cohort retention รายเดือน
// cohort = เดือนแรกที่ลูกค้าสมาชิกซื้อ · retention[k] = สัดส่วนลูกค้าใน cohort ที่กลับมาซื้อในเดือนที่ k (k=0 คือเดือนแรก = 100%)

/** จำนวนเดือนจาก a ถึง b เช่น monthIndex("2025-11", "2026-02") = 3 */
export function monthIndex(a, b) {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma); // ข้ามปีได้ เพราะแปลงปี×12 + เดือนก่อนลบ
}

/**
 * @param rows  แถวยอดขาย (ไม่นับ customer_id ว่าง)
 * @param asOf  วันสุดท้ายของข้อมูล YYYY-MM-DD ใช้บอกว่าเดือนสุดท้ายข้อมูลไม่ครบหรือไม่
 * @returns {{ cohorts: {cohort, size, retention: number[]}[], lastMonth, lastMonthPartial, daysInLastMonth }}
 *   retention ยาวเท่าจำนวนเดือนที่สังเกตได้ของ cohort นั้น (ถึง lastMonth)
 */
export function computeCohorts(rows, asOf) {
  const lastMonth = asOf.slice(0, 7);

  // 1) เดือนที่ลูกค้าแต่ละคนมาซื้อ (Set = ซื้อกี่บิลในเดือนเดียวกันก็นับเป็นครั้งเดียว)
  const monthsByCustomer = new Map();
  for (const x of rows) {
    if (!x.customer_id) continue; // walk-in ไม่นับ
    let set = monthsByCustomer.get(x.customer_id);
    if (!set) monthsByCustomer.set(x.customer_id, (set = new Set()));
    set.add(x.date.slice(0, 7));
  }

  // 2) จัดเข้า cohort ตามเดือนแรก แล้วนับว่ากลับมาในเดือนที่ k กี่คน
  const byCohort = new Map(); // เดือนแรก -> { size, active[k] }
  for (const set of monthsByCustomer.values()) {
    const first = [...set].sort()[0]; // "YYYY-MM" เรียงตามตัวอักษรได้ถูกต้อง
    let c = byCohort.get(first);
    if (!c) byCohort.set(first, (c = { size: 0, active: [] }));
    c.size += 1;
    for (const m of set) {
      const k = monthIndex(first, m);
      c.active[k] = (c.active[k] ?? 0) + 1;
    }
  }

  // 3) retention ยาวเท่าจำนวนเดือนที่สังเกตได้ (ถึง lastMonth) · เดือนที่ไม่มีใครกลับมาคือ 0 ไม่ใช่ "ไม่มีข้อมูล"
  const cohorts = [...byCohort.keys()].sort().map((cohort) => {
    const { size, active } = byCohort.get(cohort);
    const months = monthIndex(cohort, lastMonth) + 1;
    return { cohort, size, retention: Array.from({ length: months }, (_, k) => (active[k] ?? 0) / size) };
  });

  // 4) เดือนสุดท้ายของข้อมูลครบทั้งเดือนหรือไม่ (ใช้เตือนว่าช่องล่างขวาต่ำเพราะข้อมูลยังไม่ครบ ไม่ใช่เพราะลูกค้าหาย)
  const [y, m] = lastMonth.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate(); // วันที่ 0 ของเดือนถัดไป = วันสุดท้ายของเดือนนี้
  const daysInLastMonth = Number(asOf.slice(8, 10));
  return { cohorts, lastMonth, lastMonthPartial: daysInLastMonth < daysInMonth, daysInLastMonth, daysInMonth };
}
