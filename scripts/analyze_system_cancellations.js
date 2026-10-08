const fs = require('fs');

const SUPABASE_URL = 'https://aggfmnyrfxmuwpjbynom.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ2ZtbnlyZnhtdXdwamJ5bm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODM2OTcsImV4cCI6MjEwNjc1OTY5N30.HnGYGAADMLfoVMpv0lfAM3a5Z3CRZwQS1UpFXdBzsBI';

async function fetchAllOrders() {
  let allOrders = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const start = page * pageSize;
    const end = start + pageSize - 1;
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/delivery_orders?select=id,member_id,customer_name,branch,truck_number,status,reason,delivery_date,is_transferred,round,note&order=delivery_date.asc,id.asc`, {
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Range-Unit': 'items',
        'Range': `${start}-${end}`
      }
    });

    if (!resp.ok) break;
    const rows = await resp.json();
    if (!rows || rows.length === 0) break;
    allOrders.push(...rows);
    if (rows.length < pageSize) break;
    page++;
  }
  return allOrders;
}

async function analyzeSystemCancellations() {
  const orders = await fetchAllOrders();
  console.log(`Total orders fetched: ${orders.length}`);

  // Find all distinct round values and notes
  const rounds = {};
  const autoCancels = [];
  
  orders.forEach(o => {
    const r = (o.round || '').trim();
    rounds[r] = (rounds[r] || 0) + 1;
    const n = (o.note || '').trim();
    if (r.includes('ยกเลิก') || n.includes('auto ปิด Job') || n.includes('ยกเลิกอัตโนมัติ') || n.includes('Job 30')) {
      autoCancels.push(o);
    }
  });

  console.log('\n--- ALL DISTINCT ROUNDS ---');
  console.log(JSON.stringify(rounds, null, 2));

  console.log(`\nTotal auto-cancel / system cancellation orders: ${autoCancels.length}`);
  
  // Group by member
  const memberMap = new Map();
  orders.forEach(o => {
    const mid = String(o.member_id || '').trim();
    if (!mid) return;
    if (!memberMap.has(mid)) memberMap.set(mid, []);
    memberMap.get(mid).push(o);
  });

  // Check how many members have a successful delivery attempt followed ONLY by a system auto-cancellation
  let resolvedOverwrittenByAutoCancel = 0;
  const affectedMembers = [];

  for (const [mid, list] of memberMap.entries()) {
    list.sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime() || a.id - b.id);

    // Find actual delivery attempts (excluding system auto-cancel records like 'ยกเลิก รอบส่ง' with auto note)
    const actualAttempts = list.filter(o => {
      const ro = (o.round || '').trim();
      const n = (o.note || '').trim();
      const isAutoCancel = ro.includes('ยกเลิก') || n.includes('auto ปิด Job') || n.includes('ยกเลิกอัตโนมัติ') || n.includes('Job 30');
      return !isAutoCancel;
    });

    if (actualAttempts.length === 0) continue;

    const latestActual = actualAttempts[actualAttempts.length - 1];
    const latestAll = list[list.length - 1];

    const rActual = (latestActual.reason || '').trim();
    const sActual = (latestActual.status || '').trim();
    const actualSuccess = rActual.includes('ลูกค้าตั้งถัง') || rActual.includes('ตั้งถัง') ||
                          rActual.includes('ลูกค้าอยู่บ้าน') || rActual.includes('พบลูกค้า') ||
                          rActual.includes('ส่งสำเร็จ') || sActual.includes('สำเร็จ') ||
                          rActual.includes('ปกติ') || sActual.includes('ปกติ') ||
                          rActual.includes('ไม่พบถังเปล่า') || rActual.includes('ไม่รับน้ำ') ||
                          rActual.includes('ถังเต็ม') || rActual.includes('ยังไม่รับน้ำ') ||
                          (sActual === '1' && !rActual.includes('น้ำท่วม') && !rActual.includes('รอน้ำลด') && !rActual.includes('ไม่สามารถเข้าส่งได้') && !rActual.includes('เลื่อนวันที่ส่ง'));

    const rAll = (latestAll.reason || '').trim();
    const sAll = (latestAll.status || '').trim();
    const allSuccess = rAll.includes('ลูกค้าตั้งถัง') || rAll.includes('ตั้งถัง') ||
                       rAll.includes('ลูกค้าอยู่บ้าน') || rAll.includes('พบลูกค้า') ||
                       rAll.includes('ส่งสำเร็จ') || sAll.includes('สำเร็จ') ||
                       rAll.includes('ปกติ') || sAll.includes('ปกติ') ||
                       rAll.includes('ไม่พบถังเปล่า') || rAll.includes('ไม่รับน้ำ') ||
                       rAll.includes('ถังเต็ม') || rAll.includes('ยังไม่รับน้ำ') ||
                       (sAll === '1' && !rAll.includes('น้ำท่วม') && !rAll.includes('รอน้ำลด') && !rAll.includes('ไม่สามารถเข้าส่งได้') && !rAll.includes('เลื่อนวันที่ส่ง'));

    if (actualSuccess && !allSuccess) {
      resolvedOverwrittenByAutoCancel++;
      affectedMembers.push({
        mid,
        name: latestActual.customer_name,
        actualAttempt: latestActual,
        systemCancelOrder: latestAll
      });
    }
  }

  console.log(`\nMembers who successfully received water on their latest actual run but were marked pending due to auto-cancel records: ${resolvedOverwrittenByAutoCancel}`);
  console.log('Sample affected members:', JSON.stringify(affectedMembers.slice(0, 10), null, 2));
}

analyzeSystemCancellations().catch(console.error);
