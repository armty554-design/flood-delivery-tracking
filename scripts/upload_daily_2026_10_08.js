/**
 * Upload daily Excel file: "ฝ่ายบริการ _ รายงานรอบส่งน้ำแยกตามหัวข้อเหตุขาดส่ง 2026-10-08.xlsx" to Supabase Cloud
 */

const fs = require('fs');
const xlsx = require('xlsx');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aggfmnyrfxmuwpjbynom.supabase.co';
const API_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ2ZtbnlyZnhtdXdwamJ5bm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODM2OTcsImV4cCI6MjEwNjc1OTY5N30.HnGYGAADMLfoVMpv0lfAM3a5Z3CRZwQS1UpFXdBzsBI';

const FILE_PATH = 'C:/Users/wuttichai/Downloads/ฝ่ายบริการ _ รายงานรอบส่งน้ำแยกตามหัวข้อเหตุขาดส่ง 2026-10-08.xlsx';
const BATCH_SIZE = 500;

// Load address lookup if available
let addressLookup = {};
if (fs.existsSync('data/member_address_lookup.json')) {
  try {
    addressLookup = JSON.parse(fs.readFileSync('data/member_address_lookup.json', 'utf8'));
    console.log(`✅ โหลดฐานข้อมูลที่อยู่และพิกัด GPS ของสมาชิกแล้ว: ${Object.keys(addressLookup).length.toLocaleString()} รายการ`);
  } catch (e) {
    console.warn('Address lookup load warning:', e);
  }
}

function formatDateToIso(val) {
  if (!val) return new Date().toISOString();
  const s = String(val).trim();
  if (s.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/)) {
    return s.replace(' ', 'T') + '+07:00';
  }
  if (s.includes('T')) {
    return s.includes('+') || s.endsWith('Z') ? s : s + '+07:00';
  }
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
    return s + 'T00:00:00+07:00';
  }
  return s;
}

async function uploadBatch(rows, retries = 3) {
  const endpoint = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/delivery_orders`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': API_KEY,
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(rows)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function main() {
  console.log('===============================================================');
  console.log(' เริ่มต้นอ่านไฟล์ประจำวัน:', FILE_PATH);
  console.log('===============================================================');

  const startRead = Date.now();
  const wb = xlsx.readFile(FILE_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
  console.log(`อ่านไฟล์เสร็จสิ้น (${Date.now() - startRead}ms) รวมทั้งสิ้น ${rawRows.length - 1} แถวข้อมูล`);

  let batch = [];
  let totalUploaded = 0;
  const totalRows = rawRows.length - 1;

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const memberId = row[0] ? String(row[0]).trim() : '';
    if (!memberId) continue;

    const customerName = row[1] ? String(row[1]).trim() : '';
    const deliveryDate = formatDateToIso(row[2]);
    const round = row[3] ? String(row[3]).trim() : '';
    const status = row[4] ? String(row[4]).trim() : '';
    const reason = row[5] ? String(row[5]).trim() : '';
    const truck = row[6] ? String(row[6]).trim() : '';
    const changeBottle = row[7] !== undefined ? String(row[7]) : '';
    const docDetails = row[8] ? String(row[8]).trim() : '';
    const moneyCollected = row[9] !== undefined ? String(row[9]) : '';
    const note = row[10] ? String(row[10]).trim() : '';
    const deliveryDay = row[11] ? String(row[11]).trim() : '';
    const customerType = row[12] ? String(row[12]).trim() : '';
    let branch = row[13] ? String(row[13]).trim() : 'สาขารามอินทรา';
    if (branch.startsWith('คลัง')) branch = branch.replace(/^คลัง/, 'สาขา');
    if (branch.startsWith('Member.')) branch = branch.replace(/^Member\./, '').replace(/^คลัง/, 'สาขา');

    const isTransferred = (note && note.includes('โอนงาน')) ||
                          (reason && reason.includes('โอนงาน')) ||
                          (round && round.includes('โอนงาน'));

    const addrObj = addressLookup[memberId] || {};

    const record = {
      member_id: memberId,
      customer_name: customerName,
      delivery_date: deliveryDate,
      round: round,
      status: status || '1',
      reason: reason,
      truck_number: truck,
      delivery_day: deliveryDay,
      customer_type: customerType,
      branch: branch,
      address: addrObj.address || '',
      gps: addrObj.gps || '',
      latitude: addrObj.latitude || null,
      longitude: addrObj.longitude || null,
      district: addrObj.district || '',
      note: note,
      delivery_group: reason && (reason.includes('ไม่สามารถเข้าส่งได้') || reason.includes('น้ำท่วม') || reason.includes('เลื่อนวันที่ส่ง')) ? 'ยังส่งไม่ได้' : 'เข้าส่งได้',
      is_transferred: isTransferred
    };

    batch.push(record);

    if (batch.length >= BATCH_SIZE) {
      await uploadBatch(batch);
      totalUploaded += batch.length;
      process.stdout.write(`\r  อัปโหลดสำเร็จแล้ว ${totalUploaded.toLocaleString()} / ${totalRows.toLocaleString()} รายการ (${((totalUploaded / totalRows) * 100).toFixed(1)}%)...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await uploadBatch(batch);
    totalUploaded += batch.length;
  }

  console.log(`\n\n🎉 นำเข้าข้อมูลไฟล์ประจำวัน 2026-10-08 สำเร็จสมบูรณ์! รวมทั้งสิ้น ${totalUploaded.toLocaleString()} รายการ เข้าสู่ Supabase Cloud`);
}

main().catch(err => {
  console.error('\n❌ เกิดข้อผิดพลาด:', err);
  process.exit(1);
});
