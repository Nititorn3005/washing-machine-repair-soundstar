# แผนการพัฒนา — ระบบบริหารจัดการงานซ่อมเครื่องซักผ้า
บริษัท หาดใหญ่ซาวด์สตาร์ จำกัด (สำนักงานใหญ่)

ระบบนี้แบ่งการส่งมอบเป็นขั้น เพื่อให้ทีมเห็นและทดลองหน้าจอจริงได้ก่อน จากนั้นจึงเชื่อมฐานข้อมูลกลาง Supabase ทีละส่วน

## Milestone 1 — หน้าจอผลิตภัณฑ์ ✅ (เสร็จแล้ว)
- โครงหน้าเว็บภาษาไทย ธีมแดงองค์กร ฟอนต์ Sarabun หัวเว็บและส่วนท้ายแสดงข้อมูลบริษัท
- เมนู: ใบงานซ่อม · สต๊อกอะไหล่ · รายงาน · ตั้งค่า (มือถือใช้แถบเมนูด้านล่าง)
- ใบงาน: รายการ + ค้นหา + กรองสถานะ, สร้าง/แก้ไข, หน้ารายละเอียด, เบิก/ยกเลิกอะไหล่, คำนวณยอด, ประวัติ, พิมพ์ A4 (ใบรับงาน / ใบงานซ่อม / สรุปค่าซ่อม)
- สต๊อก: รายการอะไหล่, เพิ่ม/แก้ไข, รับเข้า/เบิกออก/ปรับยอด, ยกเลิกรายการที่บันทึกผิด, รายการที่ต้องเติมพร้อมจำนวนแนะนำ, ประวัติสต๊อก
- รายงาน: สรุปจำนวนงาน, แยกตามช่าง, ค่าใช้จ่ายแยกตามใบงาน, ประวัติการเบิก, อะไหล่ใกล้หมด, กรองวันที่/สถานะ/ช่าง, พิมพ์ได้
- ตั้งค่า: ข้อมูลบริษัทชุดเดียว, รายชื่อช่าง
- ข้อมูลในขั้นนี้เป็นข้อมูลสาธิตใน `src/data/fixtures.ts` (มีแถบแจ้งบนทุกหน้า)

## Milestone 2 — โครงสร้างฐานข้อมูล Supabase
- ตรวจโปรเจกต์ Supabase ที่มีอยู่ก่อน: ถ้ามีตารางเดิม ให้ส่งออกข้อมูลสำรอง (`pg_dump`) แล้วเขียน migration แบบเพิ่มเติม (`create table if not exists`, `alter table add column if not exists`) ห้าม drop/ลบข้อมูลเดิม
- ไฟล์ SQL ใน `supabase/migrations/`:
  - `company_settings` (แถวเดียว, ค่าเริ่มต้นตามข้อมูลบริษัททางการ)
  - `technicians`
  - `jobs` (job_no unique, status เป็น enum 8 ค่า, labor_cost, other_cost เป็น numeric(12,2))
  - `parts` (code unique, qty_on_hand, cost_price, sell_price, min_qty, location ฯลฯ, check qty_on_hand >= 0)
  - `job_parts` (FK → jobs, FK → parts, qty, unit_cost/unit_price เก็บ snapshot ณ วันที่เบิก, cancelled_at)
  - `stock_movements` (FK → parts, FK → job_parts nullable, type, signed qty, voided_by FK self, request_id unique)
  - `job_history` (บันทึกเหตุการณ์ของใบงาน)
- เลขที่ใบงานออกโดยฐานข้อมูล: sequence รายเดือน รูปแบบ `JOB-ปปปป-ดด-NNNN`
- เปิด RLS ทุกตาราง และไม่สร้าง policy ให้ `anon` (บุคคลทั่วไปอ่าน/เขียนตรงไม่ได้)

## Milestone 3 — RPC ธุรกรรมสต๊อก (ป้องกันตัดซ้ำ)
- ฟังก์ชัน Postgres (`security definer`) ทำงานในธุรกรรมเดียว + `select … for update` ล็อกแถวอะไหล่:
  - `create_job(payload, request_id)`
  - `issue_job_part(job_id, part_id, qty, note, request_id)` → สร้าง job_parts + stock_movements + ตัดสต๊อก
  - `cancel_job_part(job_part_id, request_id)` → คืนสต๊อกครั้งเดียว (ตรวจ `cancelled_at is null`)
  - `update_job_part_qty(job_part_id, new_qty, request_id)` → ปรับส่วนต่างเท่านั้น
  - `record_stock_movement(part_id, type, qty, note, request_id)` / `void_stock_movement(movement_id, request_id)`
- `request_id` (UUID สร้างฝั่งหน้าเว็บต่อการกด 1 ครั้ง) เป็น unique → กดซ้ำ/เน็ตกระตุกไม่บันทึกซ้ำ
- การเปิด/รีเฟรชใบงานเป็นการอ่านอย่างเดียว ไม่มีผลต่อสต๊อก

## Milestone 4 — API ฝั่งเซิร์ฟเวอร์ (Netlify Functions)
- หน้าเว็บเรียก `/api/*` เท่านั้น; ฟังก์ชันฝั่งเซิร์ฟเวอร์ถือ `SUPABASE_SERVICE_ROLE_KEY` (ไม่ส่งไปหน้าเว็บเด็ดขาด)
- ตรวจข้อมูลเข้า (zod), จำกัดฟิลด์ที่แก้ไขได้, จำกัดอัตราการเรียก, บันทึก log
- แทนที่ `src/lib/store.tsx` ด้วยการเรียก API (ชื่อ action เดิม) และลบ `src/data/fixtures.ts`
- ซิงก์ข้อมูลทุกอุปกรณ์: โหลดใหม่เมื่อกลับมาที่แท็บ + รีเฟรชอัตโนมัติเป็นระยะ (หรือ Supabase Realtime ผ่านช่องทางที่ปลอดภัย)

## Milestone 5 — การจำกัดการเข้าถึง (ไม่มีหน้าเข้าสู่ระบบ)
ข้อกำหนดคือไม่มีหน้าเข้าสู่ระบบ ดังนั้นผู้ที่มี URL จะใช้งานได้ ทางเลือกลดความเสี่ยง (ให้เจ้าของเลือก):
- เปิด Password Protection ของ Netlify ทั้งเว็บ (ใส่ครั้งเดียวต่อเบราว์เซอร์ ไม่ใช่หน้าเข้าสู่ระบบของแอป)
- หรือ “รหัสอุปกรณ์” ร่วมที่ตั้งครั้งแรกบนแต่ละเครื่องแล้วจำไว้ ฟังก์ชันตรวจทุกคำขอ
- ฐานข้อมูลไม่เปิดตรงต่อสาธารณะในทุกกรณี (RLS + service key ฝั่งเซิร์ฟเวอร์เท่านั้น)

## Milestone 6 — การส่งมอบและคู่มือ
- คู่มือตั้งค่าตัวแปรสภาพแวดล้อม: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Netlify → Project configuration → Environment variables)
- ขั้นตอนเชื่อม GitHub กับ Netlify และ Deploy
- สำรอง/กู้คืน: Supabase daily backup, `pg_dump`/`psql`, ส่งออก CSV จากหน้าตั้งค่า
- วิธีตรวจสอบว่าบันทึกจริง: ดูตารางใน Supabase Table Editor, เปิดสองอุปกรณ์พร้อมกัน
- รายการทดสอบก่อนใช้งาน (ข้อ 9 ของความต้องการ) ทำเป็นทั้งชุดทดสอบอัตโนมัติของ RPC และเช็กลิสต์ทดสอบด้วยมือบน iPhone Safari / Chrome / แท็บเล็ต / คอมพิวเตอร์
