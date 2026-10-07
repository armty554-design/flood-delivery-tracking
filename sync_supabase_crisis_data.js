/**
 * Script ซิงค์และประมวลผลข้อมูลสมาชิกที่ยังจัดส่งไม่ได้จาก Supabase Cloud
 * เกณฑ์: ดู "วันที่ส่งล่าสุด" ของแต่ละสมาชิก
 * - หากวันที่ส่งล่าสุดมีสถานะเป็น "โอนงาน" หรือ "น้ำท่วมสูง" ➔ จัดเป็น "สมาชิกที่ยังจัดส่งไม่ได้ (ยังไม่ได้รับน้ำ)"
 * - หากวันที่ส่งล่าสุดส่งสำเร็จแล้ว หรือขาดส่งเหตุอื่นที่ไม่เกี่ยวกับน้ำท่วม/โอนงาน ➔ จัดเป็น "สำเร็จตามเงื่อนไข"
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aggfmnyrfxmuwpjbynom.supabase.co';
const API_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ2ZtbnlyZnhtdXdwamJ5bm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODM2OTcsImV4cCI6MjEwNjc1OTY5N30.HnGYGAADMLfoVMpv0lfAM3a5Z3CRZwQS1UpFXdBzsBI';

// Branch coordinates fallback for missing GPS with random dispersion
const BRANCH_CENTERS = {
  'สาขารามอินทรา': [13.8400, 100.6700],
  'สาขากรุงเทพกรีฑา': [13.7485, 100.6650],
  'สาขาสุขุมวิท 50': [13.7080, 100.5980],
  'สาขาพระราม 3': [13.6850, 100.5350]
};

async function syncAndEvaluate() {
  console.log('===============================================================');
  console.log(' กำลังเริ่มต้นดึงและประมวลผลข้อมูลจาก Supabase Cloud...');
  console.log(' URL:', SUPABASE_URL);
  console.log('===============================================================');

  // 1. ดึงรายการส่งของทั้งหมดที่มีคำว่า "น้ำท่วม" หรือ is_transferred = true
  let allAffectedOrders = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/delivery_orders?or=(reason.ilike.*น้ำท่วม*,is_transferred.eq.true)&select=id,order_code,member_id,customer_name,delivery_date,round,reason,truck_number,branch,address,gps,latitude,longitude,status,is_transferred&order=id.asc`;

    const res = await fetch(url, {
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Range': `${from}-${to}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${await res.text()}`);
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) break;
    allAffectedOrders = allAffectedOrders.concat(rows);
    console.log(`  ดึงข้อมูลหน้า ${page + 1}: ${rows.length} รายการ (สะสม ${allAffectedOrders.length} รายการ)...`);
    if (rows.length < pageSize) break;
    page++;
  }

  console.log(`\nรวมรายการที่เคยพบปัญหาน้ำท่วมหรือโอนงาน: ${allAffectedOrders.length} รายการ`);

  // รวมรหัสสมาชิกที่ไม่ซ้ำ
  const distinctMemberIds = [...new Set(allAffectedOrders.map(r => r.member_id).filter(Boolean))];
  console.log(`จำนวนสมาชิกที่ได้รับผลกระทบทั้งหมด: ${distinctMemberIds.length} ราย`);

  // 2. ดึงประวัติการจัดส่งทั้งหมดของสมาชิกกลุ่มนี้ เพื่อดู "วันที่ส่งล่าสุด" ที่แท้จริง
  console.log('\nกำลังดึงประวัติการส่งทั้งหมดของสมาชิกแต่ละราย...');
  const memberHistoryMap = new Map();
  const batchSize = 100;

  for (let i = 0; i < distinctMemberIds.length; i += batchSize) {
    const chunk = distinctMemberIds.slice(i, i + batchSize);
    const inQuery = 'member_id=in.(' + chunk.map(encodeURIComponent).join(',') + ')';
    const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/delivery_orders?${inQuery}&select=id,order_code,member_id,customer_name,delivery_date,round,reason,truck_number,branch,address,gps,latitude,longitude,status,is_transferred&order=delivery_date.asc`;

    const res = await fetch(url, {
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Range': '0-1000'
      }
    });

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          if (!r.member_id) return;
          if (!memberHistoryMap.has(r.member_id)) {
            memberHistoryMap.set(r.member_id, []);
          }
          memberHistoryMap.get(r.member_id).push(r);
        });
      }
    }
  }

  console.log(`รวบรวมประวัติสมาชิกได้ครบถ้วน: ${memberHistoryMap.size} ราย`);

  // 3. วิเคราะห์สมาชิกแต่ละรายตาม "วันที่ส่งล่าสุด"
  const pendingMembers = [];
  const resolvedMembers = [];

  let idx = 0;
  memberHistoryMap.forEach((attempts, mId) => {
    idx++;
    // Helper ตรวจสอบว่าสมาชิกเคยมีรอบใดจัดส่งสำเร็จจริงหรือไม่
    const hasAnySuccessAttempt = attempts.some(att => {
      const dg = (att.delivery_group || '').trim();
      const r = (att.reason || '').trim();
      const s = (att.status || '').trim();
      const isSuccess = dg === 'เข้าส่งได้' ||
                        r.includes('ตั้งถัง') ||
                        r.includes('พบลูกค้า') ||
                        r.includes('ลูกค้าอยู่บ้าน') ||
                        r.includes('ส่งสำเร็จ') ||
                        s === 'เข้าส่งได้' ||
                        s === 'สำเร็จ';
      const isFailed = r.includes('ไม่สามารถเข้าส่งได้') || r.includes('เลื่อนวันที่ส่ง') || r.includes('น้ำท่วม') || r.includes('เกิดข้อผิดพลาด');
      return isSuccess && !isFailed;
    });

    // เรียงตาม delivery_date จากอดีตไปปัจจุบัน
    attempts.sort((a, b) => new Date(a.delivery_date || '1970-01-01') - new Date(b.delivery_date || '1970-01-01'));
    const latestAttempt = attempts[attempts.length - 1];
    const dg = (latestAttempt.delivery_group || '').trim();
    const r = (latestAttempt.reason || '').trim();
    const s = (latestAttempt.status || '').trim();
    const round = (latestAttempt.round || '').trim();
    const isTr = latestAttempt.is_transferred === true;

    // ตรวจสอบสถานะรอบล่าสุด
    // สถานะวิกฤตน้ำท่วม: ต้องมีคำว่าน้ำท่วม
    const isLatestFlood = r.includes('น้ำท่วม') || s.includes('น้ำท่วม') || s.includes('รอน้ำลด');
    // สถานะโอนงาน/ข้อผิดพลาดค้างส่ง: ต้องเป็นข้อผิดพลาดจริง ไม่ใช่การขาดส่งปกติ (เช่น ไม่รับน้ำ ไม่พบถัง)
    const isNormalReason = r.includes('ไม่รับน้ำ') || r.includes('ไม่พบถัง') || r.includes('ตั้งถัง') || r.includes('พบลูกค้า') || r.includes('อยู่บ้าน') || r.includes('ส่งสำเร็จ');
    const isLatestTransferError = !isNormalReason && (r.includes('เกิดข้อผิดพลาด') || r.includes('เลื่อนวันที่ส่ง') || dg === 'ยังส่งไม่ได้' || r.includes('โอนงาน'));

    // สมาชิกจะเป็น "ยังไม่ได้รับน้ำ (Pending)" ก็ต่อเมื่อ:
    // 1. ไม่เคยมีรอบใดจัดส่งสำเร็จเลย (hasAnySuccessAttempt = false) และ
    // 2. สถานะล่าสุดยังคงติดปัญหาน้ำท่วมสูง หรือ ติดปัญหาโอนงาน/เกิดข้อผิดพลาด
    const isPendingCrisis = !hasAnySuccessAttempt && (isLatestFlood || isLatestTransferError);
    const isDelivered = !isPendingCrisis;
    const isFlood = isPendingCrisis && isLatestFlood;
    const isTransfer = isPendingCrisis && !isLatestFlood && isLatestTransferError;

    // สร้างประวัติ history
    const historyParts = attempts.map(att => {
      const d = att.delivery_date ? new Date(att.delivery_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '-';
      const reasonText = att.reason || att.status || (att.is_transferred ? 'โอนงานสิ้นวัน' : 'ปกติ');
      return `${d} [${reasonText}]`;
    });

    // ค้นหาที่อยู่ address ที่สมบูรณ์ที่สุดจากทุก attempts
    let bestAddress = (latestAttempt.address || '').trim();
    if (!bestAddress || bestAddress === 'กรุงเทพมหานคร') {
      for (const att of attempts) {
        const addr = (att.address || '').trim();
        if (addr && addr !== 'กรุงเทพมหานคร' && addr.length > 5) {
          bestAddress = addr;
          break;
        }
      }
    }
    if (!bestAddress) bestAddress = 'กรุงเทพมหานคร';

    // ค้นหาพิกัด GPS ที่แม่นยำที่สุดจากฐานข้อมูล
    let lat = null;
    let lng = null;
    let hasExactGps = false;

    // 1. ตรวจสอบรอบล่าสุด
    if (latestAttempt.latitude && latestAttempt.longitude) {
      const pLat = parseFloat(latestAttempt.latitude);
      const pLng = parseFloat(latestAttempt.longitude);
      if (pLat > 12 && pLat < 16 && pLng > 99 && pLng < 102) {
        lat = pLat;
        lng = pLng;
        hasExactGps = true;
      }
    }
    if (!hasExactGps && latestAttempt.gps && latestAttempt.gps.includes(',')) {
      const parts = latestAttempt.gps.split(',');
      const pLat = parseFloat(parts[0]);
      const pLng = parseFloat(parts[1]);
      if (pLat > 12 && pLat < 16 && pLng > 99 && pLng < 102) {
        lat = pLat;
        lng = pLng;
        hasExactGps = true;
      }
    }

    // 2. ถ้ายังไม่มี ตรวจสอบจากประวัติการส่งรอบอื่นทั้งหมด
    if (!hasExactGps) {
      for (const att of attempts) {
        if (att.latitude && att.longitude) {
          const pLat = parseFloat(att.latitude);
          const pLng = parseFloat(att.longitude);
          if (pLat > 12 && pLat < 16 && pLng > 99 && pLng < 102) {
            lat = pLat;
            lng = pLng;
            hasExactGps = true;
            break;
          }
        }
        if (att.gps && att.gps.includes(',')) {
          const parts = att.gps.split(',');
          const pLat = parseFloat(parts[0]);
          const pLng = parseFloat(parts[1]);
          if (pLat > 12 && pLat < 16 && pLng > 99 && pLng < 102) {
            lat = pLat;
            lng = pLng;
            hasExactGps = true;
            break;
          }
        }
      }
    }

    // 3. กรณีไม่มีพิกัดในฐานข้อมูลเลย ให้ใช้จุดศูนย์กลางสาขา + การกระจายตัวเล็กน้อย
    if (!lat || !lng) {
      const bCenter = BRANCH_CENTERS[latestAttempt.branch] || [13.8400, 100.6700];
      const seed = parseInt(mId.replace(/\D/g, '').slice(-4) || `${idx}`, 10);
      const angle = (seed % 360) * (Math.PI / 180);
      const dist = 0.005 + ((seed % 15) * 0.001);
      lat = bCenter[0] + Math.sin(angle) * dist;
      lng = bCenter[1] + Math.cos(angle) * dist;
      hasExactGps = false;
    }

    // วันที่ส่งล่าสุดแบบแสดงผล
    const lastDateThai = latestAttempt.delivery_date
      ? new Date(latestAttempt.delivery_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: 'numeric' })
      : 'ล่าสุด';

    // กำหนดหมวดหมู่ตามสถานะล่าสุด
    let category = 'ส่งสำเร็จแล้ว';
    if (isFlood) {
      category = 'น้ำท่วมสูงไม่สามารถส่งได้';
    } else if (isTransfer) {
      category = 'โอนงานสิ้นวัน';
    }

    const memberObj = {
      memberId: mId,
      name: latestAttempt.customer_name || `สมาชิก #${mId}`,
      branch: latestAttempt.branch || 'สาขารามอินทรา',
      address: bestAddress,
      truck: latestAttempt.truck_number || '-',
      attemptsCount: attempts.length,
      lastDate: lastDateThai,
      lastDateIso: latestAttempt.delivery_date,
      lastReason: r || s || (isDelivered ? 'ลูกค้าตั้งถัง' : (isTransfer ? 'โอนงานสิ้นวัน' : 'น้ำท่วมสูงในพื้นที่')),
      lastStatus: s || (isDelivered ? 'ปกติ' : (isFlood ? 'รอน้ำลด' : 'โอนงาน')),
      pendingCategory: category,
      history: historyParts.join(' ➔ '),
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      gps: `${lat.toFixed(6)},${lng.toFixed(6)}`,
      hasExactGps: hasExactGps,
      status: isDelivered ? 'สำเร็จ' : (isTransfer ? 'โอนงานสิ้นวัน' : (isFlood ? 'น้ำท่วม' : 'สำเร็จ'))
    };

    if (!isDelivered && (isFlood || isTransfer)) {
      pendingMembers.push(memberObj);
    } else {
      resolvedMembers.push({
        memberId: mId,
        name: memberObj.name,
        branch: memberObj.branch,
        address: memberObj.address,
        truck: memberObj.truck,
        attemptsCount: memberObj.attemptsCount,
        resolvedDate: memberObj.lastDate,
        resolvedReason: memberObj.lastReason,
        resolvedType: isDelivered ? 'ส่งสำเร็จแล้ว (Delivered)' : `สำเร็จตามเงื่อนไข (${memberObj.lastReason})`,
        history: memberObj.history,
        lat: memberObj.lat,
        lng: memberObj.lng,
        gps: memberObj.gps,
        hasExactGps: memberObj.hasExactGps
      });
    }
  });

  // สรุปสถิติ
  console.log('\n===============================================================');
  console.log(' ผลลัพธ์การคัดแยกตาม "วันที่ส่งล่าสุด":');
  console.log(` สมาชิกที่ยังไม่ได้รับน้ำ (Pending): ${pendingMembers.length} ราย`);
  console.log(` สมาชิกที่สำเร็จตามเงื่อนไข (Resolved): ${resolvedMembers.length} ราย`);
  console.log(` รวมทั้งสิ้น: ${pendingMembers.length + resolvedMembers.length} ราย`);
  console.log('===============================================================');

  const pendingByBranch = {};
  const pendingByCat = {};
  pendingMembers.forEach(m => {
    pendingByBranch[m.branch] = (pendingByBranch[m.branch] || 0) + 1;
    pendingByCat[m.pendingCategory] = (pendingByCat[m.pendingCategory] || 0) + 1;
  });

  console.log('จำแนกตามสาขา (ยังไม่ได้รับน้ำ):', pendingByBranch);
  console.log('จำแนกตามหมวดหมู่ (ยังไม่ได้รับน้ำ):', pendingByCat);

  // 4. บันทึกไฟล์ข้อมูล
  const nowIso = new Date().toISOString();
  const crisisDataset = {
    lastUpdated: nowIso,
    ruleSummary: 'ตรวจสอบจากวันที่ส่งล่าสุดของแต่ละสมาชิก: หากสถานะล่าสุดเป็นโอนงานสิ้นวันหรือน้ำท่วมสูง จัดเป็นสมาชิกที่ยังไม่ได้รับน้ำ',
    pendingCount: pendingMembers.length,
    resolvedCount: resolvedMembers.length,
    totalCount: pendingMembers.length + resolvedMembers.length,
    pendingByBranch,
    pendingByCategory: pendingByCat,
    pending: pendingMembers,
    resolved: resolvedMembers
  };

  // บันทึก data/pending_latest.json และ data/resolved_latest.json
  fs.writeFileSync('data/pending_latest.json', JSON.stringify(pendingMembers, null, 2), 'utf8');
  fs.writeFileSync('data/resolved_latest.json', JSON.stringify(resolvedMembers, null, 2), 'utf8');
  fs.writeFileSync('data/pending_977.json', JSON.stringify(pendingMembers, null, 2), 'utf8');

  // บันทึก js/data_store.js และ docs/js/data_store.js แบบกระชับและโหลดเร็ว
  const dataStoreContent = `/**
 * Clean Executive Data Store (Live Evaluated from Supabase Cloud)
 * Rule: ดูวันที่ส่งล่าสุดของแต่ละสมาชิก หากเป็นโอนงานหรือน้ำท่วมสูง ➔ ยังไม่ได้รับน้ำ
 * Last Evaluated: ${nowIso}
 */
window.CRISIS_DATA = ${JSON.stringify(crisisDataset)};
`;

  fs.writeFileSync('js/data_store.js', dataStoreContent, 'utf8');
  if (fs.existsSync('docs/js')) {
    fs.writeFileSync('docs/js/data_store.js', dataStoreContent, 'utf8');
  }

  console.log('\n🎉 บันทึกข้อมูล js/data_store.js และ docs/js/data_store.js สำเร็จเรียบร้อย!');
}

syncAndEvaluate().catch(err => {
  console.error('\n❌ เกิดข้อผิดพลาด:', err);
  process.exit(1);
});
