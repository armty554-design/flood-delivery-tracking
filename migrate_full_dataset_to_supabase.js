/**
 * Script นำเข้าข้อมูลทั้ง 2 แผ่นงาน (93,000+ รายการ) เข้าสู่ Supabase
 * รองรับการย้าย:
 *   1. ตาราง members (39,807 รายการ)
 *   2. ตาราง deliveries (53,674 รายการ)
 * 
 * วิธีรัน:
 *   $env:SUPABASE_URL="https://aggfmnyrfxmuwpjbynom.supabase.co"
 *   $env:SUPABASE_KEY="YOUR_KEY"
 *   node migrate_full_dataset_to_supabase.js
 */

const fs = require('fs');
const readline = require('readline');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aggfmnyrfxmuwpjbynom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

function parseCsvLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

async function uploadBatch(tableName, rows) {
  const endpoint = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${tableName}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
}

async function uploadCsvFile(filename, tableName, rowMapper) {
  console.log(`\n======================================================`);
  console.log(`กำลังเริ่มต้นนำเข้า ${filename} เข้าตาราง ${tableName}...`);
  console.log(`======================================================`);

  const fileStream = fs.createReadStream(filename);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let batch = [];
  let isHeader = true;
  let totalUploaded = 0;
  const BATCH_SIZE = 500;

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const cols = parseCsvLine(line);
    const obj = rowMapper(cols);
    if (obj) batch.push(obj);

    if (batch.length >= BATCH_SIZE) {
      await uploadBatch(tableName, batch);
      totalUploaded += batch.length;
      process.stdout.write(`\rนำเข้าตาราง ${tableName} สำเร็จแล้ว ${totalUploaded} รายการ...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await uploadBatch(tableName, batch);
    totalUploaded += batch.length;
  }

  console.log(`\n🎉 นำเข้าตาราง ${tableName} เสร็จสมบูรณ์! รวมทั้งสิ้น ${totalUploaded} รายการ`);
}

async function main() {
  if (!SUPABASE_KEY) {
    console.error('กรุณาระบุ SUPABASE_KEY ก่อนรันครับ');
    console.log('ตัวอย่าง:');
    console.log('  $env:SUPABASE_KEY="eyJhbGciOi..."');
    console.log('  node migrate_full_dataset_to_supabase.js');
    process.exit(1);
  }

  // 1. นำเข้าตาราง members (39,807 แถว)
  await uploadCsvFile('supabase_members_39k.csv', 'members', cols => ({
    member_id: cols[0],
    name: cols[1],
    address_building: cols[2],
    address_subdistrict: cols[3],
    full_address: cols[4],
    branch: cols[5],
    truck_number: cols[6],
    gps: cols[7],
    latitude: cols[8] ? parseFloat(cols[8]) : null,
    longitude: cols[9] ? parseFloat(cols[9]) : null,
    district: cols[10],
    customer_type: cols[11]
  }));

  // 2. นำเข้าตาราง deliveries (53,674 แถว)
  await uploadCsvFile('supabase_deliveries_53k.csv', 'deliveries', cols => ({
    member_id: cols[0],
    customer_name: cols[1],
    delivery_date: cols[2],
    round: cols[3],
    status_code: cols[4],
    fail_reason: cols[5],
    delivery_group: cols[6],
    truck_number: cols[7],
    change_bottle: cols[8],
    doc_details: cols[9],
    money_collected: cols[10],
    mdfss_note: cols[11],
    weekly_round: cols[12],
    customer_type: cols[13],
    branch: cols[14]
  }));

  console.log('\n======================================================');
  console.log(' ย้ายข้อมูลทั้งหมดจาก Google Sheet เข้า Supabase ครบถ้วน 100%!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('\nเกิดข้อผิดพลาด:', err);
});
