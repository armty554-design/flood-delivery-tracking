# คู่มือขั้นตอนการย้ายฐานข้อมูลเข้า Supabase และนำโค้ดขึ้น GitHub แบบจับมือทำ

คู่มือนี้จัดทำขึ้นสำหรับโปรเจกต์ **ระบบติดตามสถานะการจัดส่งช่วงน้ำท่วม 4 สาขา** เพื่อย้ายข้อมูลจาก Google Spreadsheet (`1MzG8dBJNeYPRkUbaUg0C8stQIYz8bYChFxk_oHJiXgo`) ไปยัง **Supabase (PostgreSQL)** และจัดเก็บซอร์สโค้ดขึ้นสู่ **GitHub**

---

## 📑 สารบัญ
1. [ขั้นตอนที่ 1: การสมัครและสร้างโปรเจกต์บน Supabase](#1-การสมัครและสร้างโปรเจกต์บน-supabase)
2. [ขั้นตอนที่ 2: การสร้างโครงสร้างตาราง (SQL Schema) บน Supabase](#2-การสร้างโครงสร้างตาราง-sql-schema-บน-supabase)
3. [ขั้นตอนที่ 3: การนำเข้าข้อมูล (Data Migration) เข้าสู่ Supabase](#3-การนำเข้าข้อมูล-data-migration-เข้าสู่-supabase)
4. [ขั้นตอนที่ 4: การสร้าง Repository และ Push โค้ดขึ้น GitHub](#4-การสร้าง-repository-และ-push-โค้ดขึ้น-github)
5. [ขั้นตอนที่ 5: การเชื่อมต่อ Web App กับ Supabase](#5-การเชื่อมต่อ-web-app-กับ-supabase)

---

## 1. การสมัครและสร้างโปรเจกต์บน Supabase

1. เข้าไปที่เว็บไซต์: **[https://supabase.com](https://supabase.com)**
2. คลิกปุ่ม **Start your project** หรือ **Sign in** (สามารถล็อกอินด้วยบัญชี GitHub ได้ทันที)
3. เมื่อเข้าสู่หน้า Dashboard ให้คลิกปุ่ม **New Project**
4. กรอกข้อมูลสร้างโปรเจกต์:
   * **Name:** ตั้งชื่อ เช่น `flood-delivery-system`
   * **Database Password:** ตั้งรหัสผ่านฐานข้อมูล (แนะนำให้จดบันทึกไว้)
   * **Region:** เลือก **Singapore (ap-southeast-1)** (เป็นเซิร์ฟเวอร์ที่ใกล้ประเทศไทยที่สุด โหลดไวที่สุด)
5. คลิกปุ่ม **Create new project** แล้วรอระบบจัดสรรพื้นที่ประมาณ 1-2 นาที

---

## 2. การสร้างโครงสร้างตาราง (SQL Schema) บน Supabase

1. ในหน้าโปรเจกต์ Supabase เมนูด้านซ้าย ให้คลิกที่ไอคอน **SQL Editor** (รูป `>_`)
2. คลิกปุ่ม **New query**
3. คัดลอกโค้ดทั้งหมดจากไฟล์ `supabase_schema.sql` ในโปรเจกต์นี้ มาวางลงในช่องพิมพ์โค้ด
4. คลิกปุ่ม **Run** (หรือกดปุ่ม `Ctrl + Enter`) สีเขียวที่มุมล่างขวา
5. เมื่อรันสำเร็จ ระบบจะสร้าง:
   * ตาราง `delivery_orders` พร้อม Index ทุกจุดสำคัญ
   * ตาราง `action_logs` สำหรับเก็บประวัติการติดตาม
   * ฟังก์ชัน Trigger อัปเดตเวลา `updated_at` อัตโนมัติ
   * เปิดระบบ Row Level Security (RLS) เพื่อความปลอดภัย
   * เปิดระบบ **Supabase Realtime** ให้รองรับการ Sync อัตโนมัติ

---

## 3. การนำเข้าข้อมูล (Data Migration) เข้าสู่ Supabase

คุณสามารถเลือกได้ 2 วิธีตามความสะดวก:

### ทางเลือก A: นำเข้าผ่านคำสั่งอัตโนมัติ (เร็วและสะดวกที่สุด ✨)
เราได้เตรียมสคริปต์ `migrate_to_supabase.js` ไว้ให้แล้ว:
1. ไปที่เมนู **Project Settings** (ไอคอนฟันเฟืองล่างซ้าย) > **API**
2. คัดลอกค่า:
   * **Project URL** (เช่น `https://abcdefghijkl.supabase.co`)
   * **anon public** หรือ **service_role secret**
3. เปิด PowerShell ในโฟลเดอร์โปรเจกต์นี้ แล้วรันคำสั่ง:
   ```powershell
   $env:SUPABASE_URL = "https://your-project-id.supabase.co"
   $env:SUPABASE_KEY = "your-service-role-or-anon-key"
   node migrate_to_supabase.js
   ```
4. ระบบจะอัปโหลดข้อมูลทั้ง 1,962 รายการเข้าสู่ตาราง `delivery_orders` ให้อัตโนมัติ 100%!

---

### ทางเลือก B: นำเข้าผ่านการอัปโหลด CSV บนหน้าเว็บ Supabase
1. เราได้สร้างไฟล์ **`supabase_delivery_orders.csv`** ไว้ให้ในโฟลเดอร์โปรเจกต์นี้เรียบร้อยแล้ว
2. ในหน้า Supabase Dashboard เมนูด้านซ้าย ให้คลิกที่ **Table Editor** (ไอคอนตาราง)
3. เลือกตาราง **delivery_orders**
4. คลิกปุ่ม **Insert** ที่แถบด้านบน > เลือก **Import data from CSV**
5. เลือกไฟล์ `supabase_delivery_orders.csv` จากเครื่องของคุณ
6. ตรวจสอบการจับคู่คอลัมน์ แล้วกด **Import data** ข้อมูลทั้งหมด 1,962 แถวจะถูกบันทึกลงตารางทันที

---

## 4. การสร้าง Repository และ Push โค้ดขึ้น GitHub

### ขั้นตอนที่ 4.1: สร้าง Repository บน GitHub
1. เข้าไปที่ **[https://github.com](https://github.com)** แล้วเข้าสู่ระบบ
2. คลิกปุ่ม **+** ที่มุมขวาบน > เลือก **New repository**
3. ตั้งชื่อ Repository เช่น: `flood-delivery-tracking`
4. เลือกระดับความปลอดภัย:
   * **Public** (สาธารณะ) หรือ **Private** (เห็นเฉพาะคุณ)
5. **ไม่ต้อง** ติ๊กช่อง Add a README file (เพราะในโปรเจกต์มีแล้ว)
6. คลิกปุ่ม **Create repository**
7. คัดลอกลิงก์ Repository URL ที่ได้ เช่น `https://github.com/wuttichai/flood-delivery-tracking.git`

---

### ขั้นตอนที่ 4.2: รันคำสั่ง Git ในเครื่องเพื่อส่งโค้ดขึ้น GitHub
*(Git ได้ถูกติดตั้งลงในเครื่องของท่านเรียบร้อยแล้ว)*

เปิด PowerShell หรือ Terminal ในโฟลเดอร์โปรเจกต์ แล้วพิมพ์คำสั่งตามลำดับดังนี้:

```powershell
# 1. ตรวจสอบสถานะไฟล์
git status

# 2. เพิ่มไฟล์ทั้งหมดเข้าสู่การเตรียมบันทึก
git add .

# 3. บันทึก Commit ชุดแรก
git commit -m "feat: initial commit for flood delivery tracking system with supabase schema"

# 4. เปลี่ยนชื่อ Branch หลักเป็น main
git branch -M main

# 5. เชื่อมต่อ Local เข้ากับ GitHub Repository ของคุณ (นำลิงก์จาก GitHub มาใส่แทนที่)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# 6. Push โค้ดทั้งหมดขึ้น GitHub
git push -u origin main
```
*(เมื่อกดรันคำสั่ง push ระบบอาจมีหน้าต่างให้ล็อกอินยืนยันตัวตนกับ GitHub ให้กดยืนยัน Authorize)*

---

## 5. การเชื่อมต่อ Web App กับ Supabase

ในไฟล์ `supabase_client_example.js` ได้เตรียมตัวอย่างโค้ดสำหรับนำไปปรับใช้ในหน้าบ้าน (Frontend) ไว้แล้ว:
* **การ Query ข้อมูล:** รวดเร็ว ไม่ติดโควตา Google Sheet
* **การ Realtime Update:** เมื่อผู้ใช้คนหนึ่งกดเปลี่ยนสถานะใน Action Modal หน้าจอของผู้ใช้คนอื่นๆ จะอัปเดตสถานะทันทีโดยไม่ต้องกดรีเฟรชหน้าเว็บ!
