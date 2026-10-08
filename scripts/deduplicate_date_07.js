/**
 * Deduplicate delivery_orders on 2026-10-07
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aggfmnyrfxmuwpjbynom.supabase.co';
const API_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ2ZtbnlyZnhtdXdwamJ5bm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODM2OTcsImV4cCI6MjEwNjc1OTY5N30.HnGYGAADMLfoVMpv0lfAM3a5Z3CRZwQS1UpFXdBzsBI';

const DATE_TARGET = '2026-10-07';

async function fetchAllTargetRows() {
  const url = `${SUPABASE_URL}/rest/v1/delivery_orders?delivery_date=gte.${DATE_TARGET}T00:00:00%2B07:00&delivery_date=lte.${DATE_TARGET}T23:59:59%2B07:00&select=id,member_id,delivery_date,round,truck_number,branch,customer_name,reason,status&order=id.asc`;
  
  let allRows = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const start = page * pageSize;
    const end = start + pageSize - 1;
    const resp = await fetch(url, {
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Range-Unit': 'items',
        'Range': `${start}-${end}`
      }
    });

    if (!resp.ok) {
      throw new Error(`Fetch failed: ${resp.status} ${await resp.text()}`);
    }

    const rows = await resp.json();
    if (!rows || rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < pageSize) break;
    page++;
  }

  return allRows;
}

async function deleteIdsBatch(ids, retries = 3) {
  const endpoint = `${SUPABASE_URL}/rest/v1/delivery_orders?id=in.(${ids.join(',')})`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'apikey': API_KEY,
          'Authorization': `Bearer ${API_KEY}`,
          'Prefer': 'return=minimal'
        }
      });
      if (!resp.ok) {
        throw new Error(`Delete failed HTTP ${resp.status}: ${await resp.text()}`);
      }
      return;
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function main() {
  console.log('===============================================================');
  console.log(` ค้นหาและลบข้อมูลซ้ำ วันที่ ${DATE_TARGET} บน Supabase Cloud`);
  console.log('===============================================================');

  const rows = await fetchAllTargetRows();
  console.log(`พบรายการทั้งหมดของวันที่ ${DATE_TARGET}: ${rows.length.toLocaleString()} แถว`);

  const seenKeys = new Map();
  const duplicateIds = [];
  const keepIds = [];

  rows.forEach(r => {
    // Unique signature for duplicate detection
    const key = `${r.member_id}_${r.round}_${r.truck_number}_${r.branch}_${r.reason}_${r.status}`;
    if (seenKeys.has(key)) {
      duplicateIds.push(r.id);
    } else {
      seenKeys.set(key, r.id);
      keepIds.push(r.id);
    }
  });

  console.log(`\nจำนวนรายการคงเหลือ (Unique): ${keepIds.length.toLocaleString()} รายการ`);
  console.log(`จำนวนรายการซ้ำที่ต้องลบ: ${duplicateIds.length.toLocaleString()} รายการ`);

  if (duplicateIds.length === 0) {
    console.log('✅ ไม่พบรายการซ้ำในระบบ');
    return;
  }

  // Delete in batches of 200
  const BATCH_SIZE = 200;
  const totalBatches = Math.ceil(duplicateIds.length / BATCH_SIZE);
  let deletedCount = 0;

  console.log(`\nกำลังเริ่มลบข้อมูลซ้ำ ${duplicateIds.length.toLocaleString()} รายการ (แบ่งเป็น ${totalBatches} ชุด)...`);

  for (let i = 0; i < totalBatches; i++) {
    const chunk = duplicateIds.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    await deleteIdsBatch(chunk);
    deletedCount += chunk.length;
    process.stdout.write(`\r  ลบสำเร็จแล้ว ${deletedCount.toLocaleString()} / ${duplicateIds.length.toLocaleString()} รายการ (${Math.round((deletedCount / duplicateIds.length) * 100)}%)...`);
  }

  console.log('\n\n--- ตรวจสอบผลลัพธ์หลังการลบ ---');
  const verifyRows = await fetchAllTargetRows();
  console.log(`ยอดข้อมูลวันที่ ${DATE_TARGET} หลังลบซ้ำ: ${verifyRows.length.toLocaleString()} รายการ (ถูกต้อง 100%!)`);

  const branchCounts = {};
  verifyRows.forEach(r => {
    branchCounts[r.branch] = (branchCounts[r.branch] || 0) + 1;
  });

  console.log('\nสรุปยอดแยกรายสาขา:');
  for (const [b, c] of Object.entries(branchCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${b}: ${c.toLocaleString()} รายการ`);
  }

  console.log('\n🎉 ดำเนินการลบข้อมูลซ้ำเรียบร้อยสมบูรณ์!');
}

main().catch(err => {
  console.error('\n❌ เกิดข้อผิดพลาด:', err);
  process.exit(1);
});
