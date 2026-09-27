# บ้านบรู Dashboard

Dashboard ยอดขายร้านบ้านบรู สร้างด้วย React + Vite, Tailwind CSS v4, Recharts และ PapaParse

- KPI: ยอดขายรวม, จำนวนบิล, ยอดเฉลี่ยต่อบิล, ลูกค้าสมาชิกไม่ซ้ำ
- กราฟยอดขายรายวัน พร้อมเส้นค่าเฉลี่ย 7 วัน
- กราฟยอดขายแยกสาขา

เว็บที่ deploy แล้ว: https://baanbrew-rong.vercel.app

## วิธีรัน

1. ติดตั้งแพ็กเกจ

   ```bash
   npm install
   ```

2. ข้อมูลตัวอย่างอยู่ที่ `public/sales.csv` (ข้อมูลฝึกจากรายวิชา) ถ้าจะใช้ไฟล์อื่น ให้แทนที่ไฟล์นี้ หรือกดปุ่ม "เปลี่ยนไฟล์ข้อมูล" บนหน้าเว็บ
   คอลัมน์ที่ต้องมี:

   ```
   order_id,datetime,branch,product_id,qty,unit_price,customer_id,payment_method,channel
   ```

3. รัน dev server แล้วเปิด http://localhost:5173

   ```bash
   npm run dev
   ```

## โครงสร้าง

- `src/lib/metrics.js`: logic คำนวณทั้งหมด (ยอดขาย, นับบิล, สมาชิก, รายวัน, ค่าเฉลี่ย 7 วัน, แยกสาขา)
- `src/lib/format.js`: จัดรูปแบบตัวเลข (฿ และจุลภาค) และวันที่ภาษาไทย
- `src/components/`: KPI card และกราฟ
