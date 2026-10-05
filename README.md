# ระบบติดตามสถานะการจัดส่งช่วงน้ำท่วม - 4 สาขา (Flood Delivery Tracking System)

ระบบบริหารจัดการและติดตามสถานะการจัดส่งสินค้าในช่วงวิกฤติน้ำท่วมกรุงเทพฯ และปริมณฑล สำหรับศูนย์กระจายสินค้า 4 สาขาหลัก:
1. **สาขากรุงเทพกรีฑา** (ครอบคลุมคลองประเวศบุรีรมย์, ศรีนครินทร์, พัฒนาการ)
2. **สาขารามอินทรา** (ครอบคลุมรามอินทรา กม.8, บางเขน, คลองลาดพร้าว, มีนบุรี)
3. **สาขาสุขุมวิท 50** (ครอบคลุมพระโขนง, ทางรถไฟสายเก่า)
4. **สาขาพระราม 3** (ครอบคลุมนางลิ้นจี่, เจริญราษฎร์, ถนนตก, แม่น้ำเจ้าพระยา)

---

## 🌟 ฟีเจอร์หลัก (Key Features)
* **Interactive Logistics Map:** แสดงหมุดสถานะส่งสินค้ากว่า 1,960+ จุด พร้อมแยกสีตามระดับความเสี่ยง (เขียว: ส่งได้, ส้ม: เฝ้าระวัง, แดง: ส่งไม่ได้/น้ำท่วมสูง)
* **Real-time Water Gauges & Telemetry:** ข้อมูลสถานีวัดระดับน้ำคลองหลัก (ม.รทก.) เชื่อมโยงผลกระทบสายรถแบบอัตโนมัติ
* **Live In-App CCTV Surveillance:** มอนิเตอร์กล้องวงจรปิดภาพถ่ายจริง 14 จุด พร้อมโหมด Quad-Screen 4 สาขาและ Channel Selector (CH 1 - CH 14)
* **Fleet Crisis Action Log:** บันทึกและอัปเดตสถานะการประสานงานของคนขับและลูกค้าแบบ Real-time
* **Transferred Orders Matrix:** ระบบตรวจสอบและกรองรายการโอนย้ายคำสั่งซื้อ (Column K & Column F)

---

## 🗄️ โครงสร้างฐานข้อมูล Supabase (Database Schema)
ระบบรองรับการย้ายฐานข้อมูลจาก Google Sheets สู่ **Supabase (PostgreSQL)** เพื่อประสิทธิภาพสูงสุดและความสามารถในการ Realtime Sync:

* `delivery_orders`: ตารางหลักเก็บรายการจัดส่ง 1,962 รายการ (พิกัด GPS, สาขา, เบอร์รถ, เหตุผล, สถานะ)
* `action_logs`: ตารางบันทึกประวัติการเปลี่ยนสถานะและโน้ตประสานงาน
* Schema ไฟล์: [supabase_schema.sql](./supabase_schema.sql)
* ข้อมูลชุดเริ่มต้น CSV: [supabase_delivery_orders.csv](./supabase_delivery_orders.csv)

---

## 🚀 วิธีการย้ายข้อมูลเข้า Supabase (Migration)
ดูขั้นตอนแบบละเอียดได้ที่คู่มือ [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

### วิธีที่ 1: รันผ่านคำสั่ง Node.js (เร็วที่สุด)
```bash
# 1. กำหนด Environment Variables
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"

# 2. รันสคริปต์นำเข้าข้อมูล
node migrate_to_supabase.js
```

### วิธีที่ 2: นำเข้าผ่าน CSV บน Supabase Dashboard
1. สร้างตารางด้วยสคริปต์ [supabase_schema.sql](./supabase_schema.sql) ในหน้า SQL Editor
2. ไปที่ Table Editor > เลือกตาราง `delivery_orders`
3. กดปุ่ม **Insert > Import data from CSV** แล้วเลือกไฟล์ `supabase_delivery_orders.csv`

---

## 👥 ผู้พัฒนาและดูแลระบบ
* **พัฒนาโดย:** คุณวุฒิชัย (Wuttichai)
* **ฝ่ายงาน:** Logistics Operations & Fleet Crisis Management
