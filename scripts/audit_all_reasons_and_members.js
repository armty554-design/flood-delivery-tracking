const fs = require('fs');

const SUPABASE_URL = 'https://aggfmnyrfxmuwpjbynom.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ2ZtbnlyZnhtdXdwamJ5bm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODM2OTcsImV4cCI6MjEwNjc1OTY5N30.HnGYGAADMLfoVMpv0lfAM3a5Z3CRZwQS1UpFXdBzsBI';

async function fetchAllOrders() {
  console.log('Fetching all 65,705+ orders from Supabase...');
  let allOrders = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const start = page * pageSize;
    const end = start + pageSize - 1;
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/delivery_orders?select=id,member_id,customer_name,branch,truck_number,status,reason,delivery_date,is_transferred,round,note,address,district,gps,latitude,longitude&order=id.asc`, {
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Range-Unit': 'items',
        'Range': `${start}-${end}`
      }
    });

    if (!resp.ok) throw new Error(`Fetch error: ${resp.status}`);
    const rows = await resp.json();
    if (!rows || rows.length === 0) break;
    allOrders.push(...rows);
    if (rows.length < pageSize) break;
    page++;
    if (page % 5 === 0) {
      process.stdout.write(`\r  Fetched ${allOrders.length.toLocaleString()} rows...`);
    }
  }
  console.log(`\nTotal orders fetched: ${allOrders.length.toLocaleString()} rows`);
  return allOrders;
}

async function audit() {
  const orders = await fetchAllOrders();

  // 1. Analyze distinct reason and status
  const reasonCounts = {};
  const statusCounts = {};
  const roundCounts = {};

  orders.forEach(o => {
    const r = (o.reason || '(blank)').trim();
    const s = (o.status || '(blank)').trim();
    const ro = (o.round || '(blank)').trim();
    reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
    roundCounts[ro] = (roundCounts[ro] || 0) + 1;
  });

  console.log('\n===============================================================');
  console.log(' 1. DISTINCT REASONS (COUNT):');
  console.log('===============================================================');
  console.log(JSON.stringify(reasonCounts, null, 2));

  console.log('\n===============================================================');
  console.log(' 2. DISTINCT STATUSES (COUNT):');
  console.log('===============================================================');
  console.log(JSON.stringify(statusCounts, null, 2));

  console.log('\n===============================================================');
  console.log(' 3. DISTINCT ROUNDS (COUNT):');
  console.log('===============================================================');
  console.log(JSON.stringify(roundCounts, null, 2));

  // 2. Group by member_id
  const memberMap = new Map();
  orders.forEach(o => {
    const mid = String(o.member_id || '').trim();
    if (!mid) return;
    if (!memberMap.has(mid)) memberMap.set(mid, []);
    memberMap.get(mid).push(o);
  });

  console.log(`\nTotal Unique Members: ${memberMap.size.toLocaleString()}`);

  // Check how sorting affects latest order
  // For each member, let's see how many have multiple orders, and what the latest order is
  let pendingMembers = [];
  let resolvedMembers = [];
  let ambiguousMembers = [];

  for (const [mid, list] of memberMap.entries()) {
    // Sort orders: primary by delivery_date, secondary by id asc
    list.sort((a, b) => {
      const ta = new Date(a.delivery_date || 0).getTime();
      const tb = new Date(b.delivery_date || 0).getTime();
      if (ta !== tb) return ta - tb;
      return (a.id || 0) - (b.id || 0);
    });

    const hasCrisis = list.some(o => {
      const r = (o.reason || '').trim();
      const s = (o.status || '').trim();
      return r.includes('น้ำท่วม') || s.includes('น้ำท่วม') || r.includes('รอน้ำลด') ||
             r.includes('ไม่สามารถเข้าส่งได้') || r.includes('เลื่อนวันที่ส่ง') || r.includes('เกิดข้อผิดพลาด') ||
             r.includes('โอนงาน') || s.includes('โอนงาน') || o.is_transferred;
    });

    if (!hasCrisis) continue;

    const latest = list[list.length - 1];
    const r = (latest.reason || '').trim();
    const s = (latest.status || '').trim();
    const ro = (latest.round || '').trim();
    const n = (latest.note || '').trim();

    // Check if latest attempt is success
    const isSuccess = r.includes('ลูกค้าตั้งถัง') || r.includes('ตั้งถัง') ||
                      r.includes('ลูกค้าอยู่บ้าน') || r.includes('พบลูกค้า') ||
                      r.includes('ส่งสำเร็จ') || s.includes('ส่งสำเร็จ') || s.includes('สำเร็จ') ||
                      r.includes('ปกติ') || s.includes('ปกติ') ||
                      r.includes('ไม่พบถังเปล่า') || r.includes('ไม่รับน้ำ') ||
                      r.includes('ถังเต็ม') || r.includes('ยังไม่รับน้ำ') ||
                      (s === '1' && !r.includes('น้ำท่วม') && !r.includes('รอน้ำลด') && !r.includes('ไม่สามารถเข้าส่งได้') && !r.includes('เลื่อนวันที่ส่ง') && !r.includes('เกิดข้อผิดพลาด'));

    if (isSuccess) {
      resolvedMembers.push({ mid, name: latest.customer_name, latestDate: latest.delivery_date, reason: r, status: s, round: ro, note: n, count: list.length });
    } else {
      pendingMembers.push({ mid, name: latest.customer_name, latestDate: latest.delivery_date, reason: r, status: s, round: ro, note: n, count: list.length });
    }
  }

  console.log(`\nEvaluated Crisis Members: ${pendingMembers.length + resolvedMembers.length}`);
  console.log(`  - Pending: ${pendingMembers.length}`);
  console.log(`  - Resolved: ${resolvedMembers.length}`);

  // Let's inspect pending members in detail: what reasons do they have?
  const pendingReasons = {};
  pendingMembers.forEach(p => {
    const k = `${p.reason} [status: ${p.status}, round: ${p.round}]`;
    pendingReasons[k] = (pendingReasons[k] || 0) + 1;
  });
  console.log('\n--- PENDING MEMBERS REASON BREAKDOWN ---');
  console.log(JSON.stringify(pendingReasons, null, 2));

  // Let's check if any pending member has an order with a reason we might have missed
  console.log('\n--- SAMPLE PENDING MEMBERS (FIRST 20) ---');
  pendingMembers.slice(0, 20).forEach((p, i) => {
    console.log(`[${i+1}] #${p.mid} - ${p.name} | Date: ${p.latestDate} | Round: ${p.round} | Status: ${p.status} | Reason: ${p.reason} | Note: ${p.note}`);
  });
}

audit().catch(console.error);
