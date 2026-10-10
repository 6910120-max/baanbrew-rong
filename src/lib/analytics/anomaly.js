// Lab 4.5 · ใช้ Claude Code เขียนฟังก์ชันที่ยังว่าง (Prompt 4.5A ใน PROMPTS_LAB4.md) จนกว่า npm test จะผ่าน · ห้ามแก้ไฟล์ test
// Lab 4.5 · หาวันที่ยอดขายผิดปกติ
// เทียบกับ "ค่ากลางของวันเดียวกันของสัปดาห์ใน 8 สัปดาห์ก่อน" ไม่ใช่ค่าเฉลี่ย 28 วัน
// เพราะสาขาออฟฟิศกับห้างขายวันธรรมดาและเสาร์-อาทิตย์ต่างกันมาก
import { addDays } from "../../lab3/time.js";

export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

/**
 * คะแนนความผิดปกติ = ln((จริง + SMOOTH) / (คาดหวัง + SMOOTH))
 * SMOOTH กันไม่ให้วันยอดน้อย ๆ (เช่น 50 บาท เทียบ 100 บาท) ดูผิดปกติเกินจริง
 * @param daily    [{ date, branch, revenue }] จาก dailyByBranch()
 * @param holidays { "YYYY-MM-DD": "ชื่อวันหยุด" } วันหยุดจะไม่ถูกจัดอันดับ แต่ติดป้ายไว้
 * @returns ทุกวันที่คำนวณได้ เรียงจากผิดปกติมากไปน้อย:
 *   { date, branch, actual, expected, change (สัดส่วน เช่น -0.9 = ต่ำกว่าปกติ 90%), score, holiday }
 */
export function scoreAnomalies(daily, holidays = {}, { weeks = 8, minWeeks = 4, smooth = 1000 } = {}) {
  // ยอดของแต่ละสาขา/วัน ไว้ค้นหาวันเดียวกันของสัปดาห์ก่อน ๆ
  const revenueOf = new Map(daily.map((d) => [`${d.branch}|${d.date}`, d.revenue]));

  const scored = [];
  for (const d of daily) {
    // วันเดียวกันของสัปดาห์ย้อนหลังสูงสุด `weeks` ครั้ง (วันที่ไม่มีข้อมูลข้าม ไม่นับเป็น 0)
    const past = [];
    for (let w = 1; w <= weeks; w++) {
      const v = revenueOf.get(`${d.branch}|${addDays(d.date, -7 * w)}`);
      if (v !== undefined) past.push(v);
    }
    if (past.length < minWeeks) continue; // ประวัติสั้นเกินไป ไม่ให้คะแนน

    const expected = median(past); // ค่ากลางทนต่อค่าสุดโต่ง วันไฟดับในอดีตจึงไม่ดึงค่าปกติเพี้ยน
    scored.push({
      date: d.date,
      branch: d.branch,
      actual: d.revenue,
      expected,
      change: expected > 0 ? d.revenue / expected - 1 : 0, // -0.9 = ต่ำกว่าปกติ 90%
      score: Math.log((d.revenue + smooth) / (expected + smooth)),
      holiday: holidays[d.date] ?? null, // วันหยุดติดป้ายไว้ แต่ topAnomalies จะไม่นำไปจัดอันดับ
    });
  }
  // ผิดปกติมากสุดก่อน (ทั้งสูงและต่ำ) · เท่ากันเรียงตามวันที่และสาขาเพื่อให้ผลคงที่
  return scored.sort((a, b) => Math.abs(b.score) - Math.abs(a.score) || a.date.localeCompare(b.date) || a.branch.localeCompare(b.branch));
}

/** อันดับวันผิดปกติที่ควรตรวจสอบ (ไม่รวมวันหยุด) */
export function topAnomalies(daily, holidays = {}, n = 15, opts) {
  return scoreAnomalies(daily, holidays, opts).filter((a) => !a.holiday).slice(0, n);
}
