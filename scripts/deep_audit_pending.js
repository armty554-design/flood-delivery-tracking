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
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/delivery_orders?select=id,member_id,customer_name,branch,truck_number,status,reason,delivery_date,is_transferred,round,note,address,district,gps,latitude,longitude&order=delivery_date.asc,id.asc`, {
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

function isSystemAutoCancel(order) {
  const round = (order.round || '').trim();
  const note = (order.note || '').trim();
  const reason = (order.reason || '').trim();

  // If round is 'ยกเลิก รอบส่ง' and reason is empty or auto-cancel note
  if (round.includes('ยกเลิก') && (!reason || reason === '-' || reason === 'ปกติ')) return true;
  if (note.includes('auto ปิด Job') || note.includes('ยกเลิกอัตโนมัติ') || note.includes('Job 30')) return true;

  return false;
}

function isSuccessAttempt(reason, status, round) {
  const r = (reason || '').trim();
  const s = (status || '').trim();
  const ro = (round || '').trim();

  if (r.includes('ลูกค้าตั้งถัง') || r.includes('ตั้งถัง')) return true;
  if (r.includes('ลูกค้าอยู่บ้าน') || r.includes('พบลูกค้า')) return true;
  if (r.includes('ส่งสำเร็จ') || s.includes('ส่งสำเร็จ') || s.includes('สำเร็จ')) return true;
  if (r.includes('ไม่พบถังเปล่า') || r.includes('ไม่รับน้ำ')) return true;
  if (r.includes('ถังเต็ม') || r.includes('ยังไม่รับน้ำ')) return true;
  if (r.includes('ปกติ') || s.includes('ปกติ')) return true;

  // Normal status '1' on actual delivery round with NO failure reason
  if (s === '1' && (!r || r === '-' || r === '1' || r === 'ปกติ') && !ro.includes('ยกเลิก')) return true;

  return false;
}

function isFailureAttempt(reason, status) {
  const r = (reason || '').trim();
  const s = (status || '').trim();

  if (r.includes('น้ำท่วม') || s.includes('น้ำท่วม') || r.includes('รอน้ำลด')) return 'น้ำท่วมสูงไม่สามารถส่งได้';
  if (r.includes('ไม่สามารถเข้าส่งได้') || r.includes('เลื่อนวันที่ส่ง') || r.includes('เกิดข้อผิดพลาด') || r.includes('ถนนปิด') || r.includes('ลิฟท์เสีย')) return 'โอนงานสิ้นวัน';
  if (r.includes('โอนงาน') || s.includes('โอนงาน')) return 'โอนงานสิ้นวัน';

  return null;
}

async function deepAuditPending() {
  const orders = await fetchAllOrders();
  console.log(`Total orders fetched: ${orders.length}`);

  // Group by member
  const memberMap = new Map();
  orders.forEach(o => {
    const mid = String(o.member_id || '').trim();
    if (!mid) return;
    if (!memberMap.has(mid)) memberMap.set(mid, []);
    memberMap.get(mid).push(o);
  });

  const pendingList = [];
  const resolvedList = [];

  for (const [mid, list] of memberMap.entries()) {
    // Sort chronologically ascending
    list.sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime() || a.id - b.id);

    // Filter to actual operational attempts (ignore system auto cancellations if there was a real attempt)
    // But keep all history for crisis check
    const hasCrisis = list.some(o => isFailureAttempt(o.reason, o.status) !== null);
    if (!hasCrisis) continue;

    // Filter out system auto-cancel records to find the true latest operational delivery attempt
    const realAttempts = list.filter(o => !isSystemAutoCancel(o));
    const effectiveAttempts = realAttempts.length > 0 ? realAttempts : list;

    const latest = effectiveAttempts[effectiveAttempts.length - 1];
    const isSuccess = isSuccessAttempt(latest.reason, latest.status, latest.round);
    const failCat = isFailureAttempt(latest.reason, latest.status);

    if (isSuccess) {
      resolvedList.push({ mid, name: latest.customer_name, latest, history: list });
    } else {
      pendingList.push({ mid, name: latest.customer_name, latest, failCat: failCat || 'น้ำท่วมสูงไม่สามารถส่งได้', history: list });
    }
  }

  console.log('\n===============================================================');
  console.log(' DEEP AUDIT RESULTS:');
  console.log('===============================================================');
  console.log(`  - Pending (True Undelivered Crisis): ${pendingList.length}`);
  console.log(`  - Resolved (True Completed / Water Delivered): ${resolvedList.length}`);
  console.log(`  - Total Crisis Members: ${pendingList.length + resolvedList.length}`);

  // Inspect Pending reasons
  const pendingReasons = {};
  pendingList.forEach(p => {
    const r = p.latest.reason || p.latest.status || '(blank)';
    pendingReasons[r] = (pendingReasons[r] || 0) + 1;
  });
  console.log('\n--- TRUE PENDING REASONS BREAKDOWN ---');
  console.log(JSON.stringify(pendingReasons, null, 2));

  // Check 117485, 154781, 224899 in the deep audit:
  console.log('\n--- VERIFY PREVIOUS PROBLEM MEMBERS ---');
  ['117485', '154781', '224899', '267016', '252998', '250489'].forEach(m => {
    const inP = pendingList.find(p => p.mid === m);
    const inR = resolvedList.find(r => r.mid === m);
    console.log(`Member #${m}: in pending? ${!!inP} | in resolved? ${!!inR} (Latest status: ${inR ? (inR.latest.reason || inR.latest.round) : (inP ? inP.latest.reason : '-')})`);
  });
}

deepAuditPending().catch(console.error);
