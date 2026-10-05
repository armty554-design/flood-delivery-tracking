/**
 * Script สำหรับย้ายข้อมูลจาก initial_data.json เข้าสู่ Supabase อัตโนมัติผ่าน REST API
 * ไม่ต้องติดตั้งแพ็กเกจเพิ่ม (ใช้ Native Fetch ของ Node.js)
 * 
 * วิธีใช้งาน:
 * 1. ใส่ SUPABASE_URL และ SUPABASE_ANON_KEY หรือ SERVICE_ROLE_KEY ด้านล่าง
 * 2. รันคำสั่ง: node migrate_to_supabase.js
 */

const fs = require('fs');
const path = require('path');

// ==============================================================================
// ตั้งค่า SUPABASE CREDENTIALS (โปรเจกต์: water-M)
// ==============================================================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aggfmnyrfxmuwpjbynom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY_OR_ANON_KEY';

async function migrateData() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL' || SUPABASE_KEY === 'YOUR_SUPABASE_SERVICE_ROLE_KEY_OR_ANON_KEY') {
    console.error('กรุณาระบุ SUPABASE_URL และ SUPABASE_KEY ในไฟล์หรือผ่าน Environment Variables ก่อนรันครับ');
    console.log('ตัวอย่าง:');
    console.log('  $env:SUPABASE_URL="https://xyz.supabase.co"');
    console.log('  $env:SUPABASE_KEY="eyJhbGciOi..."');
    console.log('  node migrate_to_supabase.js');
    process.exit(1);
  }

  const initialData = require('./initial_data.json');
  console.log(`\n กำลังเตรียมนำเข้าข้อมูลจำนวน ${initialData.length} รายการเข้าสู่ Supabase...`);

  // แปลงโครงสร้างข้อมูลให้ตรงกับตาราง delivery_orders
  const formattedRecords = initialData.map(item => {
    let lat = null;
    let lng = null;
    if (item.gps && item.gps.includes(',')) {
      const parts = item.gps.split(',');
      lat = parseFloat(parts[0].trim()) || null;
      lng = parseFloat(parts[1].trim()) || null;
    }

    let delivDate = item.date || null;
    if (delivDate && !delivDate.includes('T') && delivDate.includes(' ')) {
      delivDate = delivDate.replace(' ', 'T') + '+07:00';
    }

    return {
      order_code: item.id || null,
      member_id: item.memberId || '',
      customer_name: item.name || '',
      delivery_date: delivDate,
      round: item.round || 'ปกติ',
      reason: item.reason || '',
      truck_number: item.truck || '',
      delivery_day: item.day || '',
      customer_type: item.customerType || 'B2C',
      branch: item.branch || '',
      address: item.address || '',
      gps: item.gps || '',
      latitude: lat,
      longitude: lng,
      district: item.district || '',
      status: item.status || 'รอน้ำลด',
      note: item.note || '',
      delivery_group: item.deliveryGroup || 'ยังส่งไม่ได้',
      is_transferred: Boolean(item.isTransferred),
      transfer_operator: item.transferOperator || '',
      transfer_date: item.transferDate || '',
      transfer_raw: item.transferRaw || ''
    };
  });

  const BATCH_SIZE = 100;
  const endpoint = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/delivery_orders`;

  let insertedCount = 0;

  for (let i = 0; i < formattedRecords.length; i += BATCH_SIZE) {
    const batch = formattedRecords.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(formattedRecords.length / BATCH_SIZE);

    process.stdout.write(`กำลังส่งข้อมูลชุดที่ ${batchNum}/${totalBatches} (${batch.length} รายการ)... `);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(batch)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`\n ล้มเหลวที่ชุดที่ ${batchNum}: Status ${response.status} - ${errorText}`);
        return;
      }

      insertedCount += batch.length;
      console.log(` สำเร็จ! (รวมนำเข้าแล้ว ${insertedCount}/${formattedRecords.length})`);
    } catch (err) {
      console.error(`\n เกิดข้อผิดพลาดทางเครือข่าย: ${err.message}`);
      return;
    }
  }

  console.log(`\n🎉 นำเข้าข้อมูลทั้งหมดเสร็จสมบูรณ์ 100%! รวมทั้งสิ้น ${insertedCount} รายการเข้าสู่ Supabase`);
}

migrateData();
