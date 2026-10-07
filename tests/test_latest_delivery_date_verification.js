const fs = require('fs');
const assert = require('assert');

console.log('=== VERIFYING LATEST DELIVERY DATE VERIFICATION & MAP INTEGRATION ===\n');

// 1. Verify data files exist
console.log('[1. Verifying Generated Data Files]');
assert(fs.existsSync('js/data_store.js'), 'js/data_store.js exists');
assert(fs.existsSync('data/pending_latest.json'), 'data/pending_latest.json exists');
assert(fs.existsSync('data/resolved_latest.json'), 'data/resolved_latest.json exists');
console.log('  ✔ PASS: All evaluated data files exist');

// 2. Load dataset
console.log('\n[2. Verifying Member Latest Status Categorization]');
const pendingData = JSON.parse(fs.readFileSync('data/pending_latest.json', 'utf8'));
const resolvedData = JSON.parse(fs.readFileSync('data/resolved_latest.json', 'utf8'));

console.log(`  Pending Count: ${pendingData.length} (Expected: 579)`);
console.log(`  Resolved Count: ${resolvedData.length} (Expected: 4,469)`);
console.log(`  Total Evaluated: ${pendingData.length + resolvedData.length} (Expected: 5,048)`);

assert(pendingData.length === 579, `Pending count must be 579 (actual: ${pendingData.length})`);
assert(resolvedData.length === 4469, `Resolved count must be 4,469 (actual: ${resolvedData.length})`);
assert(pendingData.length + resolvedData.length === 5048, 'Total count must be 5,048');

// 3. Rule 1 Check: Every pending member MUST have their latest status as flood or transfer, NEVER success/ตั้งถัง
console.log('\n[3. Verifying Rule 1: Latest Delivery Attempt Must Be Flood or Transfer (No Success/ตั้งถัง)]');
let invalidPendingCount = 0;
pendingData.forEach(p => {
  const isSuccess = p.lastReason && (p.lastReason.includes('ตั้งถัง') || p.lastReason.includes('พบลูกค้า') || p.lastReason.includes('ส่งสำเร็จ'));
  const isFlood = p.isFlood || (p.lastReason && p.lastReason.includes('น้ำท่วม')) || (p.pendingCategory && p.pendingCategory.includes('น้ำท่วม'));
  const isTransfer = p.isTransfer || (p.lastReason && p.lastReason.includes('โอนงาน')) || (p.pendingCategory && p.pendingCategory.includes('โอนงาน'));
  if (isSuccess || (!isFlood && !isTransfer)) {
    invalidPendingCount++;
    console.error(`  Invalid pending item: ${p.memberId} - ${p.name} - reason: ${p.lastReason}`);
  }
});
assert.strictEqual(invalidPendingCount, 0, 'All pending members must have flood or transfer as their latest status (0 success cases)');
console.log(`  ✔ PASS: 100% of pending members (${pendingData.length}/${pendingData.length}) have their latest status as genuine flood or transfer`);

// Check specific members
const p249081 = pendingData.find(p => p.memberId === '249081');
const r249081 = resolvedData.find(r => r.memberId === '249081');
assert(!p249081, 'Member 249081 (ธนิต บัวเขียว) MUST NOT be in pending');
assert(r249081 && r249081.resolvedReason.includes('ตั้งถัง'), 'Member 249081 MUST be in resolved (ลูกค้าตั้งถัง)');
console.log('  ✔ PASS: Member 249081 (ธนิต บัวเขียว) verified as Resolved and excluded from Map');

const p127361 = pendingData.find(p => p.memberId === '127361');
const r127361 = resolvedData.find(r => r.memberId === '127361');
assert(!p127361, 'Member 127361 (แสงดาว ไกรวาปี) MUST NOT be in pending');
assert(r127361 && r127361.resolvedReason.includes('ตั้งถัง'), 'Member 127361 MUST be in resolved (ลูกค้าตั้งถัง)');
console.log('  ✔ PASS: Member 127361 (แสงดาว ไกรวาปี) verified as Resolved and excluded from Map');

const p112538 = pendingData.find(p => p.memberId === '112538');
const r112538 = resolvedData.find(r => r.memberId === '112538');
assert(!p112538, 'Member 112538 (PRAJWAL SAWANY VASISHT) MUST NOT be in pending');
assert(r112538, 'Member 112538 (PRAJWAL SAWANY VASISHT) MUST be in resolved');
console.log('  ✔ PASS: Member 112538 (PRAJWAL SAWANY VASISHT) verified as Resolved (รอบ 2 ลูกค้าตั้งถังสำเร็จ) and excluded from Pending Map');

// 4. Rule 2 Check: Map GPS Coordinates for all pending members
console.log('\n[4. Verifying Rule 2: Map Display of Undelivered Members]');
const withGps = pendingData.filter(p => p.lat && p.lng && p.lat > 13 && p.lat < 15 && p.lng > 100 && p.lng < 102);
assert.strictEqual(withGps.length, pendingData.length, `All ${pendingData.length} pending members must have valid GPS coordinates`);
console.log(`  ✔ PASS: All ${withGps.length} undelivered members have valid Bangkok GPS coordinates for Leaflet rendering`);

// 5. Check Branch Distribution
console.log('\n[5. Verifying Branch Breakdown]');
const ramIntra = pendingData.filter(p => p.branch === 'สาขารามอินทรา').length;
const krungthep = pendingData.filter(p => p.branch === 'สาขากรุงเทพกรีฑา').length;
const sukhumvit = pendingData.filter(p => p.branch === 'สาขาสุขุมวิท 50').length;
console.log('  Branch counts:', { ramIntra, krungthep, sukhumvit });
assert.strictEqual(ramIntra, 366, 'Ram Intra count must be 366');
assert.strictEqual(krungthep, 191, 'Krungthep Kreetha count must be 191');
assert.strictEqual(sukhumvit, 22, 'Sukhumvit 50 count must be 22');
console.log('  ✔ PASS: Branch distribution verified');

// 6. Check HTML & JS Map elements
console.log('\n[6. Verifying Frontend Map Controls]');
const js = fs.readFileSync('js/app.js', 'utf8');

assert(js.includes('updateMapFilterButtonCounts'), 'updateMapFilterButtonCounts exists in app.js');
assert(js.includes('syncLiveFromSupabase'), 'syncLiveFromSupabase implementation exists in app.js');

console.log('  ✔ PASS: All frontend controls verified');

console.log('\n============================================================');
console.log('ALL LATEST DELIVERY DATE VERIFICATION & MAP TESTS PASSED! 🎯');
console.log('============================================================\n');
