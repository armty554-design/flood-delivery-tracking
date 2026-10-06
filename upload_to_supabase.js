/**
 * CLI Uploader Tool: อัปโหลดข้อมูลรายการจัดส่งเข้าสู่ Supabase Cloud
 * การใช้งาน:
 *   node upload_to_supabase.js <ไฟล์.csv> [--key=SUPABASE_KEY] [--table=delivery_orders]
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aggfmnyrfxmuwpjbynom.supabase.co';
const DEFAULT_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ2ZtbnlyZnhtdXdwamJ5bm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODM2OTcsImV4cCI6MjEwNjc1OTY5N30.HnGYGAADMLfoVMpv0lfAM3a5Z3CRZwQS1UpFXdBzsBI';

// Parse CLI Arguments
const args = process.argv.slice(2);
let filePath = '';
let customKey = '';
let targetTable = 'delivery_orders';

args.forEach(arg => {
  if (arg.startsWith('--key=')) customKey = arg.replace('--key=', '');
  else if (arg.startsWith('--table=')) targetTable = arg.replace('--table=', '');
  else if (!filePath && !arg.startsWith('--')) filePath = arg;
});

const API_KEY = customKey || DEFAULT_KEY;

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

function parseThaiDate(dateStr) {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{1,2}):(\d{1,2}))?/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    const year = m[3];
    const hour = (m[4] || '00').padStart(2, '0');
    const min = (m[5] || '00').padStart(2, '0');
    const sec = (m[6] || '00').padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${min}:${sec}+07:00`;
  }
  if (s.includes('-')) {
    return s.replace(' ', 'T') + (s.includes('+') ? '' : '+07:00');
  }
  return null;
}

async function uploadBatch(rows) {
  const endpoint = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${targetTable}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
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

async function run() {
  if (!filePath) {
    console.log('================================================================');
    console.log(' SUPABASE BATCH DATA UPLOADER (CLI)');
    console.log('================================================================');
    console.log(' วิธีการใช้งาน:');
    console.log('   node upload_to_supabase.js <ไฟล์.csv> [--key=API_KEY] [--table=delivery_orders]');
    console.log('\n ตัวอย่าง:');
    console.log('   node upload_to_supabase.js sample_orders.csv');
    console.log('   node upload_to_supabase.js new_batch.csv --key=YOUR_SERVICE_KEY');
    process.exit(0);
  }

  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`ไม่พบไฟล์: ${fullPath}`);
    process.exit(1);
  }

  console.log('================================================================');
  console.log(` กำลังเตรียมอัปโหลดข้อมูลจาก: ${path.basename(fullPath)}`);
  console.log(` ไปยัง Supabase ตาราง: ${targetTable}`);
  console.log(` Endpoint: ${SUPABASE_URL}`);
  console.log('================================================================\n');

  // Optional: โหลดฐานข้อมูลสมาชิกเพื่อจับคู่ GPS & ที่อยู่ถ้ามี
  const memberMap = new Map();
  const membersFile = path.join(__dirname, 'supabase_members_39k.csv');
  if (fs.existsSync(membersFile)) {
    process.stdout.write('กำลังโหลดฐานข้อมูลสมาชิกอ้างอิง... ');
    const fileStreamMembers = fs.createReadStream(membersFile);
    const rlMembers = readline.createInterface({ input: fileStreamMembers, crlfDelay: Infinity });
    let isHeaderM = true;
    for await (const line of rlMembers) {
      if (!line.trim()) continue;
      if (isHeaderM) { isHeaderM = false; continue; }
      const cols = parseCsvLine(line);
      const mId = (cols[0] || '').trim();
      if (mId) {
        memberMap.set(mId, {
          name: cols[1],
          address: cols[4],
          branch: cols[5],
          truck: cols[6],
          gps: cols[7],
          lat: cols[8] ? parseFloat(cols[8]) : null,
          lng: cols[9] ? parseFloat(cols[9]) : null,
          district: cols[10],
          custType: cols[11]
        });
      }
    }
    console.log(`[โหลดสำเร็จ: ${memberMap.size} สมาชิก]`);
  }

  const fileStream = fs.createReadStream(fullPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isHeader = true;
  let headers = [];
  let headerIndexMap = {};
  const BATCH_SIZE = 100;
  let batch = [];
  let totalUploaded = 0;
  let orderIndex = 0;
  const startTime = Date.now();

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (isHeader) {
      isHeader = false;
      headers = parseCsvLine(line).map(h => h.trim().toLowerCase());
      headers.forEach((h, idx) => { headerIndexMap[h] = idx; });
      continue;
    }

    orderIndex++;
    const cols = parseCsvLine(line);

    // Dynamic field extraction
    const getVal = (possibleKeys, def = '') => {
      for (const k of possibleKeys) {
        if (headerIndexMap[k] !== undefined && cols[headerIndexMap[k]] !== undefined) {
          const val = cols[headerIndexMap[k]].trim();
          if (val) return val;
        }
      }
      return def;
    };

    const memberId = getVal(['member_id', 'memberid', 'รหัสสมาชิก', 'รหัส'], cols[0] || '').trim();
    const mem = memberMap.get(memberId) || {};

    const branch = getVal(['branch', 'สาขา', 'คลัง'], mem.branch || 'สาขารามอินทรา');
    const truck = getVal(['truck_number', 'truck', 'เบอร์รถ', 'สายส่ง'], mem.truck || '');
    const reason = getVal(['fail_reason', 'reason', 'เหตุผล', 'สถานะจัดส่ง'], '');
    const status = getVal(['status', 'สถานะ'], reason.includes('น้ำท่วม') ? 'รอน้ำลด' : 'ปกติ');
    const note = getVal(['note', 'notes', 'mdfss_note', 'หมายเหตุ'], '');
    const round = getVal(['round', 'รอบ', 'รอบส่ง'], 'ปกติ');
    const customerName = getVal(['customer_name', 'name', 'ชื่อลูกค้า', 'ชื่อ'], mem.name || '');

    const record = {
      member_id: memberId,
      customer_name: customerName,
      delivery_date: parseThaiDate(getVal(['delivery_date', 'date', 'วันที่'], new Date().toISOString())),
      round: round,
      reason: reason,
      truck_number: truck,
      delivery_day: getVal(['delivery_day', 'day', 'รอบวัน'], 'ปกติ'),
      customer_type: getVal(['customer_type', 'custtype', 'กลุ่มลูกค้า'], mem.custType || 'B2C'),
      branch: branch.startsWith('คลัง') ? branch.replace(/^คลัง/, 'สาขา') : branch,
      address: getVal(['address', 'ที่อยู่'], mem.address || ''),
      gps: getVal(['gps', 'พิกัด'], mem.gps || ''),
      latitude: mem.lat || null,
      longitude: mem.lng || null,
      district: getVal(['district', 'เขต'], mem.district || ''),
      status: status,
      note: note,
      delivery_group: getVal(['delivery_group', 'group', 'กลุ่มการส่ง'], 'ปกติ'),
      is_transferred: Boolean(note.includes('โอนงาน') || round.includes('โอนงาน')),
      transfer_operator: getVal(['transfer_operator', 'ผู้ทำรายการ'], ''),
      transfer_date: getVal(['transfer_date', 'วันที่โอน'], ''),
      transfer_raw: getVal(['transfer_raw'], '')
    };

    batch.push(record);

    if (batch.length >= BATCH_SIZE) {
      try {
        await uploadBatch(batch);
        totalUploaded += batch.length;
        process.stdout.write(`\rกำลังอัปโหลด... สำเร็จแล้ว ${totalUploaded.toLocaleString()} รายการ`);
      } catch (err) {
        console.error(`\nเกิดข้อผิดพลาดในชุดข้อมูลที่ ${totalUploaded + 1} - ${totalUploaded + batch.length}:`, err.message);
        throw err;
      }
      batch = [];
    }
  }

  if (batch.length > 0) {
    await uploadBatch(batch);
    totalUploaded += batch.length;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n🎉 อัปโหลดข้อมูลสำเร็จเรียบร้อยทั้งหมด ${totalUploaded.toLocaleString()} รายการเข้าสู่ Supabase (${elapsed} วินาที)!`);
}

run().catch(err => {
  console.error('\nอัปโหลดไม่สำเร็จ:', err.message);
  if (err.message.includes('row-level security') || err.message.includes('401')) {
    console.log('\n💡 ข้อแนะนำ: ตาราง Supabase มี RLS (Row Level Security)');
    console.log('1. กรุณาเปิด Supabase Dashboard > SQL Editor');
    console.log('2. รันสคริปต์ในไฟล์ supabase_allow_insert_policy.sql:');
    console.log('   CREATE POLICY "Allow public insert on delivery_orders" ON public.delivery_orders FOR INSERT WITH CHECK (true);');
    console.log('3. หรือรันคำสั่งโดยระบุ Service Role Key: node upload_to_supabase.js <ไฟล์> --key=YOUR_SERVICE_KEY');
  }
});
