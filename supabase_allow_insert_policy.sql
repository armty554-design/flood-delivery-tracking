-- ==============================================================================
-- SUPABASE POLICY: ALLOW PUBLIC INSERT ON DELIVERY_ORDERS
-- อนุญาตให้อัปโหลดและนำเข้าข้อมูลรอบการจัดส่งผ่าน Public API / Web Dashboard
-- ==============================================================================

-- 1. อนุญาต INSERT เข้าตาราง delivery_orders สำหรับ anon role (Public Key)
DROP POLICY IF EXISTS "Allow public insert on delivery_orders" ON public.delivery_orders;
CREATE POLICY "Allow public insert on delivery_orders" 
    ON public.delivery_orders 
    FOR INSERT 
    WITH CHECK (true);

-- 2. อนุญาต UPSERT / UPDATE เข้าตาราง delivery_orders (ถ้ายังไม่มี)
DROP POLICY IF EXISTS "Allow public update on delivery_orders" ON public.delivery_orders;
CREATE POLICY "Allow public update on delivery_orders" 
    ON public.delivery_orders 
    FOR UPDATE 
    USING (true);

-- 3. ยืนยันว่าตาราง action_logs อนุญาต INSERT สำหรับประวัติการนำเข้า
DROP POLICY IF EXISTS "Allow public insert on action_logs" ON public.action_logs;
CREATE POLICY "Allow public insert on action_logs" 
    ON public.action_logs 
    FOR INSERT 
    WITH CHECK (true);

-- สรุป: คัดลอกคำสั่ง SQL ด้านบนไปวางใน Supabase Dashboard > SQL Editor แล้วกด RUN เพื่อเปิดใช้งานการอัปโหลดข้อมูลได้ทันที
