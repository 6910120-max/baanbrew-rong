// Lab 4.4 · ใช้ Claude Code เขียนฟังก์ชันที่ยังว่าง (Prompt 4.4A ใน PROMPTS_LAB4.md) จนกว่า npm test จะผ่าน · ห้ามแก้ไฟล์ test
// Lab 4.4 · พยากรณ์ยอดขายแบบอธิบายได้ และวัดความแม่นด้วยการย้อนทดสอบ (backtest)
import { addDays } from "../../lab3/time.js";

const dow = (ymd) => new Date(ymd + "T00:00:00Z").getUTCDay(); // 0 = อาทิตย์

/** ค่าเฉลี่ยยอดขายวันเดียวกันของสัปดาห์ K ครั้งล่าสุด (ฤดูกาลรายสัปดาห์) */
export function seasonalForecast(series, horizon, K = 8) {
  const last = series[series.length - 1].date;
  const overall = series.reduce((a, s) => a + s.revenue, 0) / series.length; // สำรองเมื่อข้อมูลสั้นจนไม่เคยเจอวันนั้นเลย
  return Array.from({ length: horizon }, (_, i) => {
    const date = addDays(last, i + 1);
    const target = dow(date);
    // เดินย้อนจากวันล่าสุด เก็บยอดของ "วันเดียวกันของสัปดาห์" ได้สูงสุด K ครั้ง
    const same = [];
    for (let j = series.length - 1; j >= 0 && same.length < K; j--) {
      if (dow(series[j].date) === target) same.push(series[j].revenue);
    }
    const forecast = same.length ? same.reduce((a, v) => a + v, 0) / same.length : overall;
    return { date, forecast };
  });
}

/** ค่าเฉลี่ย K วันล่าสุด เส้นตรง (ตัวเปรียบเทียบที่ไม่สนวันในสัปดาห์) */
export function flatForecast(series, horizon, K = 28) {
  const recent = series.slice(-K);
  const avg = recent.reduce((a, s) => a + s.revenue, 0) / recent.length;
  const last = series[series.length - 1].date;
  return Array.from({ length: horizon }, (_, i) => ({ date: addDays(last, i + 1), forecast: avg }));
}

/** Mean Absolute Percentage Error (%) · ข้ามวันที่ยอดจริงเป็น 0 เพราะหารไม่ได้ */
export function mape(actual, forecast) {
  let sum = 0;
  let n = 0;
  actual.forEach((a, i) => {
    if (a === 0) return; // ยอดจริงเป็น 0 หารไม่ได้ ข้ามวันนั้น
    sum += Math.abs(a - forecast[i]) / a;
    n += 1;
  });
  return n ? (sum / n) * 100 : 0;
}

/**
 * ย้อนทดสอบ: ซ่อน horizon วันสุดท้าย พยากรณ์จากข้อมูลก่อนหน้า แล้วเทียบกับของจริง
 * band = ±1.28 × ส่วนเบี่ยงเบนมาตรฐานของ % ความคลาดเคลื่อน (ช่วงประมาณ 80%)
 */
export function backtest(series, horizon = 28, K = 8) {
  // ซ่อน horizon วันสุดท้ายไว้เป็นเฉลย พยากรณ์จากข้อมูลก่อนหน้าเท่านั้น (ห้ามให้วิธีพยากรณ์เห็นเฉลย)
  const train = series.slice(0, -horizon);
  const hidden = series.slice(-horizon);
  const seasonal = seasonalForecast(train, horizon, K);
  const flat = flatForecast(train, horizon);
  const test = hidden.map((h, i) => ({ date: h.date, actual: h.revenue, seasonal: seasonal[i].forecast, flat: flat[i].forecast }));
  const actual = test.map((t) => t.actual);

  // band: ±1.28 × ส่วนเบี่ยงเบนมาตรฐานของสัดส่วนความคลาดเคลื่อน (ช่วงประมาณ 80%) เก็บเป็นเศษส่วน เช่น 0.3 = ±30%
  const errs = test.filter((t) => t.actual !== 0).map((t) => (t.seasonal - t.actual) / t.actual);
  const mean = errs.reduce((a, e) => a + e, 0) / (errs.length || 1);
  const sd = Math.sqrt(errs.reduce((a, e) => a + (e - mean) ** 2, 0) / (errs.length || 1));

  return {
    mapeSeasonal: mape(actual, test.map((t) => t.seasonal)),
    mapeFlat: mape(actual, test.map((t) => t.flat)),
    band: 1.28 * sd,
    test,
  };
}
