// Lab 4.4B · รวมยอดรายวันเป็นรายสัปดาห์ (จันทร์–อาทิตย์) เพื่อเทียบความแม่นรายวันกับรายสัปดาห์
// ใช้คู่กับ mape() ใน forecast.js ไม่เขียนสูตรความคลาดเคลื่อนใหม่
import { addDays } from "../../lab3/time.js";

const dow = (ymd) => new Date(ymd + "T00:00:00Z").getUTCDay(); // 0 = อาทิตย์

/** วันจันทร์ของสัปดาห์ที่วันนั้นอยู่ เช่น วันอาทิตย์ 2026-01-11 → 2026-01-05 */
export function weekStart(ymd) {
  return addDays(ymd, -((dow(ymd) + 6) % 7));
}

/**
 * รวมแถวรายวันเป็นรายสัปดาห์ · นับเฉพาะสัปดาห์ที่มีครบ 7 วัน (สัปดาห์ที่ถูกตัดครึ่งจะต่ำกว่าจริง ทำให้เปรียบเทียบไม่ได้)
 * @param rows   [{ date, ...ฟิลด์ตัวเลข }]
 * @param fields ชื่อฟิลด์ที่จะรวม เช่น ["actual", "seasonal", "flat"]
 * @returns [{ week (วันจันทร์), ...ผลรวมของแต่ละฟิลด์ }] เรียงตามสัปดาห์
 */
export function toWeekly(rows, fields) {
  const weeks = new Map();
  for (const r of rows) {
    const key = weekStart(r.date);
    let w = weeks.get(key);
    if (!w) weeks.set(key, (w = { week: key, days: 0, ...Object.fromEntries(fields.map((f) => [f, 0])) }));
    w.days += 1;
    for (const f of fields) w[f] += r[f] ?? 0;
  }
  return [...weeks.values()]
    .filter((w) => w.days === 7)
    .sort((a, b) => a.week.localeCompare(b.week))
    .map(({ days: _days, ...rest }) => rest);
}
