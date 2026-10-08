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

function isJob30AutoClose(order) {
  const round = (order.round || '').trim();
  const note = (order.note || '').trim();
  const reason = (order.reason || '').trim();

  // If note has Job 30 or auto ปิด Job
  if (note.includes('Job 30') || note.includes('auto ปิด Job') || note.includes('ปิด Job') || note.includes('ยกเลิกอัตโนมัติโดยระบบเนื่องจากตรวจพบ Job 30') || note.includes('สร้างและยกเลิกรอบน้ำโดยระบบ auto ปิด Job 30')) {
    return true;
  }
  // If round is 'ยกเลิก รอบส่ง' with no failure reason
  if (round.includes('ยกเลิก') && (!reason || reason === '-' || reason === '1' || reason === 'ปกติ')) {
    return true;
  }
  return false;
}

function isSuccessReason(reason, status, round, note) {
  const r = (reason || '').trim();
  const s = (status || '').trim();
  const ro = (round || '').trim();
  const n = (note || '').trim();

  // Job 30 Auto Closure is considered SUCCESS (สำเร็จแล้ว)
  if (isJob30AutoClose({ round: ro, note: n, reason: r, status: s })) return true;

  // Explicit success indicators
  if (r.includes('ลูกค้าตั้งถัง') || r.includes('ตั้งถัง')) return true;
  if (r.includes('ลูกค้าอยู่บ้าน') || r.includes('พบลูกค้า')) return true;
  if (r.includes('ส่งสำเร็จ') || s.includes('ส่งสำเร็จ') || s.includes('สำเร็จ')) return true;
  if (r.includes('ไม่พบถังเปล่า') || r.includes('ไม่รับน้ำ')) return true;
  if (r.includes('ถังเต็ม') || r.includes('ยังไม่รับน้ำ')) return true;
  if (r.includes('ปกติ') || s.includes('ปกติ')) return true;

  // Normal status '1' on regular delivery round with NO failure reason
  if (s === '1' && (!r || r === '-' || r === '1' || r === 'ปกติ') && !ro.includes('ยกเลิก')) return true;

  return false;
}

function isFailureReason(reason, status) {
  const r = (reason || '').trim();
  const s = (status || '').trim();

  if (r.includes('น้ำท่วม') || s.includes('น้ำท่วม') || r.includes('รอน้ำลด')) return 'น้ำท่วมสูงไม่สามารถส่งได้';
  if (r.includes('ไม่สามารถเข้าส่งได้') || r.includes('เลื่อนวันที่ส่ง') || r.includes('เกิดข้อผิดพลาด') || r.includes('ถนนปิด') || r.includes('ลิฟท์เสีย') || r.includes('อาคารไม่อนุญาต')) return 'โอนงานสิ้นวัน';
  if (r.includes('โอนงาน') || s.includes('โอนงาน')) return 'โอนงานสิ้นวัน';

  return null;
}

function formatShortThaiDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr).substring(0, 10);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
}

async function auditAndReevaluate() {
  const orders = await fetchAllOrders();
  console.log(`Total orders fetched: ${orders.length}`);

  let addressLookup = {};
  if (fs.existsSync('data/member_address_lookup.json')) {
    addressLookup = JSON.parse(fs.readFileSync('data/member_address_lookup.json', 'utf8'));
  }

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
  let job30ResolvedCount = 0;

  for (const [mid, list] of memberMap.entries()) {
    // Sort chronologically ascending
    list.sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime() || a.id - b.id);

    const hasCrisis = list.some(o => isFailureReason(o.reason, o.status) !== null);
    if (!hasCrisis) continue;

    const latest = list[list.length - 1];
    const isSuccess = isSuccessReason(latest.reason, latest.status, latest.round, latest.note);
    const failCat = isFailureReason(latest.reason, latest.status);

    const addrObj = addressLookup[mid] || {};
    const address = latest.address || addrObj.address || 'กรุงเทพมหานคร';
    const lat = latest.latitude || addrObj.latitude || 13.805;
    const lng = latest.longitude || addrObj.longitude || 100.68;
    const gps = (lat && lng) ? `${lat},${lng}` : (addrObj.gps || '');
    const branch = latest.branch || 'สาขารามอินทรา';
    const truck = latest.truck_number || '';
    const name = latest.customer_name || 'สมาชิก';

    const historyTimeline = list.map(h => {
      const dStr = formatShortThaiDate(h.delivery_date);
      let rStr = h.reason || h.status || 'จัดส่ง';
      if (isJob30AutoClose(h)) {
        rStr = 'ปิด Job 30 (สำเร็จ)';
      }
      return `${dStr} [${rStr}]`;
    }).join(' ➔ ');

    if (isSuccess) {
      if (isJob30AutoClose(latest)) job30ResolvedCount++;
      const resolvedStatus = isJob30AutoClose(latest) ? 'ปิด Job 30 (สำเร็จ)' : (latest.reason || 'ลูกค้าตั้งถัง (สำเร็จ)');
      resolvedList.push({
        memberId: mid,
        name: name,
        branch: branch,
        address: address,
        truck: truck,
        attemptsCount: list.length,
        lastDate: formatShortThaiDate(list[0].delivery_date),
        lastDateIso: list[0].delivery_date,
        lastReason: list[0].reason || 'ไม่สามารถเข้าส่งได้',
        resolvedDate: formatShortThaiDate(latest.delivery_date),
        resolvedDateIso: latest.delivery_date,
        resolvedStatus: resolvedStatus,
        history: historyTimeline,
        lat: lat,
        lng: lng,
        gps: gps,
        hasExactGps: !!(addrObj.latitude && addrObj.longitude)
      });
    } else {
      const category = failCat || 'น้ำท่วมสูงไม่สามารถส่งได้';
      pendingList.push({
        memberId: mid,
        name: name,
        branch: branch,
        address: address,
        truck: truck,
        attemptsCount: list.length,
        lastDate: formatShortThaiDate(latest.delivery_date),
        lastDateIso: latest.delivery_date,
        lastReason: latest.reason || latest.status || 'ไม่สามารถเข้าส่งได้',
        lastStatus: latest.status || '1',
        pendingCategory: category,
        history: historyTimeline,
        lat: lat,
        lng: lng,
        gps: gps,
        hasExactGps: !!(addrObj.latitude && addrObj.longitude),
        status: category === 'โอนงานสิ้นวัน' ? 'โอนงานสิ้นวัน' : 'น้ำท่วม'
      });
    }
  }

  const pendingByBranch = {};
  pendingList.forEach(p => {
    pendingByBranch[p.branch] = (pendingByBranch[p.branch] || 0) + 1;
  });

  console.log('\n===============================================================');
  console.log(' EVALUATION WITH JOB 30 AUTO-CLOSE AS RESOLVED:');
  console.log('===============================================================');
  console.log(`  - สมาชิกค้างส่งจริง (Pending): ${pendingList.length.toLocaleString()} ราย`);
  console.log(`  - สมาชิกที่สำเร็จแล้ว (Resolved): ${resolvedList.length.toLocaleString()} ราย`);
  console.log(`    (ในนี้เป็นสมาชิกที่สำเร็จจากการปิด Job 30: ${job30ResolvedCount.toLocaleString()} ราย)`);
  console.log(`  - รวมกลุ่มวิกฤตทั้งหมด: ${(pendingList.length + resolvedList.length).toLocaleString()} ราย`);
  console.log('\nPending Breakdown by Branch:', JSON.stringify(pendingByBranch, null, 2));

  // Check 202750 specifically
  const p202750 = pendingList.find(p => p.memberId === '202750');
  const r202750 = resolvedList.find(r => r.memberId === '202750');
  console.log(`\nCheck #202750: in pending? ${!!p202750} | in resolved? ${!!r202750} (Status: ${r202750 ? r202750.resolvedStatus : '-'})`);

  const finalCrisisData = {
    lastUpdated: new Date().toISOString(),
    ruleSummary: "ตรวจสอบจากวันที่ส่งล่าสุดของแต่ละสมาชิก: หากสถานะล่าสุดเป็นลูกค้าตั้งถัง, พบลูกค้า, ส่งสำเร็จ หรือปิด Job 30 ➔ จัดเป็นสำเร็จแล้ว (Resolved), หากสถานะล่าสุดเป็นน้ำท่วมหรือเลื่อนส่ง ➔ จัดเป็นค้างส่ง (Pending)",
    pendingCount: pendingList.length,
    resolvedCount: resolvedList.length,
    totalCount: pendingList.length + resolvedList.length,
    pendingByBranch: pendingByBranch,
    pendingByCategory: {
      "น้ำท่วมสูงไม่สามารถส่งได้": pendingList.filter(p => p.pendingCategory !== 'โอนงานสิ้นวัน').length,
      "โอนงานสิ้นวัน": pendingList.filter(p => p.pendingCategory === 'โอนงานสิ้นวัน').length
    },
    pending: pendingList,
    resolved: resolvedList
  };

  fs.writeFileSync('data/pending_latest.json', JSON.stringify(pendingList, null, 2));
  fs.writeFileSync('data/resolved_latest.json', JSON.stringify(resolvedList, null, 2));
  fs.writeFileSync('js/data_store.js', `/**\n * Clean Executive Data Store (Live Evaluated from Supabase Cloud)\n * Rule: ดูวันที่ส่งล่าสุดของแต่ละสมาชิก หากเป็นลูกค้าตั้งถัง/พบลูกค้า/สำเร็จ/ปิด Job 30 ➔ สำเร็จแล้ว (Resolved)\n * Last Evaluated: ${new Date().toISOString()}\n */\nwindow.CRISIS_DATA = ${JSON.stringify(finalCrisisData)};\n`);
  fs.writeFileSync('docs/js/data_store.js', `/**\n * Clean Executive Data Store (Live Evaluated from Supabase Cloud)\n * Rule: ดูวันที่ส่งล่าสุดของแต่ละสมาชิก หากเป็นลูกค้าตั้งถัง/พบลูกค้า/สำเร็จ/ปิด Job 30 ➔ สำเร็จแล้ว (Resolved)\n * Last Evaluated: ${new Date().toISOString()}\n */\nwindow.CRISIS_DATA = ${JSON.stringify(finalCrisisData)};\n`);

  console.log('✅ Updated data/pending_latest.json, data/resolved_latest.json, js/data_store.js, and docs/js/data_store.js!');
}

auditAndReevaluate().catch(console.error);
