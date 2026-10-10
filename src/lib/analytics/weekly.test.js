import { describe, it, expect } from "vitest";
import { weekStart, toWeekly } from "./weekly.js";
import { mape } from "./forecast.js";

describe("weekStart", () => {
  it("วันอาทิตย์อยู่สัปดาห์ของวันจันทร์ก่อนหน้า (สัปดาห์ จ.–อา.)", () => {
    expect(weekStart("2026-01-05")).toBe("2026-01-05"); // จันทร์
    expect(weekStart("2026-01-11")).toBe("2026-01-05"); // อาทิตย์
    expect(weekStart("2026-01-12")).toBe("2026-01-12"); // จันทร์ถัดไป
  });
  it("ข้ามเดือนและข้ามปี", () => {
    expect(weekStart("2026-01-01")).toBe("2025-12-29"); // พฤหัส
  });
});

describe("toWeekly", () => {
  // จันทร์ 5 ม.ค. → อาทิตย์ 18 ม.ค. = 2 สัปดาห์เต็ม + พุธ-พฤหัสของสัปดาห์ที่ 3 (ไม่ครบ)
  const days = Array.from({ length: 16 }, (_, i) => ({
    date: `2026-01-${String(5 + i).padStart(2, "0")}`, actual: 100, seasonal: 110,
  }));
  const w = toWeekly(days, ["actual", "seasonal"]);
  it("รวมรายสัปดาห์และทิ้งสัปดาห์ที่ไม่ครบ 7 วัน", () => {
    expect(w).toEqual([
      { week: "2026-01-05", actual: 700, seasonal: 770 },
      { week: "2026-01-12", actual: 700, seasonal: 770 },
    ]);
  });
  it("ใช้กับ mape() ได้: คลาดเคลื่อนรายสัปดาห์ = 10%", () => {
    expect(mape(w.map((x) => x.actual), w.map((x) => x.seasonal))).toBeCloseTo(10);
  });
  it("ความคลาดเคลื่อนรายวันที่หักล้างกันจะเล็กลงเมื่อรวมเป็นสัปดาห์", () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({ date: `2026-01-${String(5 + i).padStart(2, "0")}`, actual: 100, seasonal: i % 2 ? 150 : 50 }));
    const daily = mape(rows.map((r) => r.actual), rows.map((r) => r.seasonal));
    const wk = toWeekly(rows, ["actual", "seasonal"]);
    expect(daily).toBeCloseTo(50);
    expect(mape(wk.map((x) => x.actual), wk.map((x) => x.seasonal))).toBeLessThan(daily);
  });
});
