const fs = require('fs');

const SUPABASE_URL = 'https://aggfmnyrfxmuwpjbynom.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ2ZtbnlyZnhtdXdwamJ5bm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODM2OTcsImV4cCI6MjEwNjc1OTY5N30.HnGYGAADMLfoVMpv0lfAM3a5Z3CRZwQS1UpFXdBzsBI';

// Load member address lookup
let addressLookup = {};
if (fs.existsSync('data/member_address_lookup.json')) {
  addressLookup = JSON.parse(fs.readFileSync('data/member_address_lookup.json', 'utf8'));
}

async function fetchAllOrders() {
  console.log('Fetching all delivery orders from Supabase Cloud...');
  let allOrders = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const start = page * pageSize;
    const end = start + pageSize - 1;
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/delivery_orders?select=id,member_id,customer_name,branch,truck_number,status,reason,delivery_date,is_transferred,round,note,address,gps,latitude,longitude,district&order=delivery_date.asc,id.asc`, {
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
    process.stdout.write(`\r  Fetched ${allOrders.length.toLocaleString()} rows...`);
  }
  console.log(`\nTotal orders fetched: ${allOrders.length.toLocaleString()} rows`);
  return allOrders;
}

function isSuccessReason(reason, status) {
  const r = (reason || '').trim();
  const s = (status || '').trim();

  // Explicit success indicators
  if (r.includes('ลูกค้าตั้งถัง') || r.includes('ตั้งถัง')) return true;
  if (r.includes('ลูกค้าอยู่บ้าน') || r.includes('พบลูกค้า')) return true;
  if (r.includes('ส่งสำเร็จ') || s.includes('ส่งสำเร็จ') || s.includes('สำเร็จ')) return true;
  if (r.includes('ปกติ') || s.includes('ปกติ')) return true;
  if (r.includes('ไม่พบถังเปล่า') || r.includes('ไม่รับน้ำ')) return true;
  if (r.includes('ถังเต็ม') || r.includes('ยังไม่รับน้ำ')) return true;

  // Normal status '1' with NO error reason
  if (s === '1' && (!r || r === '-' || r === '1' || r === 'ปกติ')) return true;

  return false;
}

function isFailureReason(reason, status) {
  const r = (reason || '').trim();
  const s = (status || '').trim();

  if (r.includes('น้ำท่วม') || s.includes('น้ำท่วม') || r.includes('รอน้ำลด')) return 'น้ำท่วมสูงไม่สามารถส่งได้';
  if (r.includes('ไม่สามารถเข้าส่งได้') || r.includes('เลื่อนวันที่ส่ง') || r.includes('เกิดข้อผิดพลาด')) return 'โอนงานสิ้นวัน';
  if (r.includes('โอนงาน') || s.includes('โอนงาน')) return 'โอนงานสิ้นวัน';

  return null;
}

function formatShortThaiDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr).substring(0, 10);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
}

async function main() {
  const orders = await fetchAllOrders();

  // Group by member_id
  const memberHistory = new Map();
  orders.forEach(o => {
    const memberId = String(o.member_id || '').trim();
    if (!memberId) return;
    if (!memberHistory.has(memberId)) memberHistory.set(memberId, []);
    memberHistory.get(memberId).push(o);
  });

  console.log(`Total unique members across all orders: ${memberHistory.size.toLocaleString()}`);

  const pendingList = [];
  const resolvedList = [];

  for (const [memberId, hist] of memberHistory.entries()) {
    // Check if member ever had a crisis / flood / transfer attempt
    const hasCrisisAttempt = hist.some(o => isFailureReason(o.reason, o.status) !== null);
    if (!hasCrisisAttempt) continue; // Normal member who never had crisis

    // Sort by delivery_date ascending
    hist.sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());

    const latestOrder = hist[hist.length - 1];
    const latestSuccess = isSuccessReason(latestOrder.reason, latestOrder.status);
    const latestFailCategory = isFailureReason(latestOrder.reason, latestOrder.status);

    const addrObj = addressLookup[memberId] || {};
    const address = latestOrder.address || addrObj.address || 'กรุงเทพมหานคร';
    const lat = latestOrder.latitude || addrObj.latitude || 13.805;
    const lng = latestOrder.longitude || addrObj.longitude || 100.68;
    const gps = (lat && lng) ? `${lat},${lng}` : (addrObj.gps || '');
    const branch = latestOrder.branch || 'สาขารามอินทรา';
    const truck = latestOrder.truck_number || '';
    const name = latestOrder.customer_name || 'สมาชิก';

    const historyTimeline = hist.map(h => {
      const dStr = formatShortThaiDate(h.delivery_date);
      const rStr = h.reason || h.status || 'จัดส่ง';
      return `${dStr} [${rStr}]`;
    }).join(' ➔ ');

    if (latestSuccess) {
      // RESOLVED! Member received water on their latest attempt
      resolvedList.push({
        memberId: memberId,
        name: name,
        branch: branch,
        address: address,
        truck: truck,
        attemptsCount: hist.length,
        lastDate: formatShortThaiDate(hist[0].delivery_date),
        lastDateIso: hist[0].delivery_date,
        lastReason: hist[0].reason || 'ไม่สามารถเข้าส่งได้',
        resolvedDate: formatShortThaiDate(latestOrder.delivery_date),
        resolvedDateIso: latestOrder.delivery_date,
        resolvedStatus: latestOrder.reason || 'ลูกค้าตั้งถัง (สำเร็จ)',
        history: historyTimeline,
        lat: lat,
        lng: lng,
        gps: gps,
        hasExactGps: !!(addrObj.latitude && addrObj.longitude)
      });
    } else {
      // PENDING! Latest attempt is still failure/flood
      const category = latestFailCategory || 'น้ำท่วมสูงไม่สามารถส่งได้';
      pendingList.push({
        memberId: memberId,
        name: name,
        branch: branch,
        address: address,
        truck: truck,
        attemptsCount: hist.length,
        lastDate: formatShortThaiDate(latestOrder.delivery_date),
        lastDateIso: latestOrder.delivery_date,
        lastReason: latestOrder.reason || latestOrder.status || 'ไม่สามารถเข้าส่งได้',
        lastStatus: latestOrder.status || '1',
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

  console.log('\n===============================================================');
  console.log(' CRISIS EVALUATION RESULTS:');
  console.log('===============================================================');
  console.log(`  - สมาชิกค้างส่งจริง (Pending): ${pendingList.length.toLocaleString()} ราย`);
  console.log(`  - สมาชิกที่สำเร็จแล้ว (Resolved): ${resolvedList.length.toLocaleString()} ราย`);
  console.log(`  - รวมกลุ่มวิกฤตที่ประเมินทั้งหมด: ${(pendingList.length + resolvedList.length).toLocaleString()} ราย`);

  // Check specific members
  const p252998 = pendingList.find(p => p.memberId === '252998');
  const r252998 = resolvedList.find(r => r.memberId === '252998');
  console.log(`\nCheck #252998: in pending? ${!!p252998} | in resolved? ${!!r252998} (Status: ${r252998 ? r252998.resolvedStatus : '-'})`);

  const p250489 = pendingList.find(p => p.memberId === '250489');
  const r250489 = resolvedList.find(r => r.memberId === '250489');
  console.log(`Check #250489: in pending? ${!!p250489} | in resolved? ${!!r250489} (Status: ${r250489 ? r250489.resolvedStatus : '-'})`);

  const pendingByBranch = {};
  pendingList.forEach(p => {
    pendingByBranch[p.branch] = (pendingByBranch[p.branch] || 0) + 1;
  });
  console.log('\nPending Breakdown by Branch:', JSON.stringify(pendingByBranch, null, 2));

  // Save new dataset to data/ and js/data_store.js
  const finalCrisisData = {
    lastUpdated: new Date().toISOString(),
    ruleSummary: "ตรวจสอบจากวันที่ส่งล่าสุดของแต่ละสมาชิก: หากสถานะล่าสุดเป็นลูกค้าตั้งถัง, พบลูกค้า, หรือส่งสำเร็จ ➔ จัดเป็นสำเร็จแล้ว (Resolved), หากสถานะล่าสุดเป็นน้ำท่วมหรือเลื่อนส่ง ➔ จัดเป็นค้างส่ง (Pending)",
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

  fs.writeFileSync('js/data_store.js', `/**\n * Clean Executive Data Store (Live Evaluated from Supabase Cloud)\n * Rule: ดูวันที่ส่งล่าสุดของแต่ละสมาชิก หากเป็นลูกค้าตั้งถัง/พบลูกค้า/สำเร็จ ➔ สำเร็จแล้ว (Resolved)\n * Last Evaluated: ${new Date().toISOString()}\n */\nwindow.CRISIS_DATA = ${JSON.stringify(finalCrisisData)};\n`);
  fs.writeFileSync('docs/js/data_store.js', `/**\n * Clean Executive Data Store (Live Evaluated from Supabase Cloud)\n * Rule: ดูวันที่ส่งล่าสุดของแต่ละสมาชิก หากเป็นลูกค้าตั้งถัง/พบลูกค้า/สำเร็จ ➔ สำเร็จแล้ว (Resolved)\n * Last Evaluated: ${new Date().toISOString()}\n */\nwindow.CRISIS_DATA = ${JSON.stringify(finalCrisisData)};\n`);

  console.log('\n✅ Updated data/pending_latest.json, data/resolved_latest.json, js/data_store.js and docs/js/data_store.js successfully!');
}

main().catch(console.error);
