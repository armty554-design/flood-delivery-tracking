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

console.log(`  Pending Count: ${pendingData.length} (Expected: 977)`);
console.log(`  Resolved Count: ${resolvedData.length} (Expected: 1621)`);
console.log(`  Total Evaluated: ${pendingData.length + resolvedData.length} (Expected: 2598)`);

assert(pendingData.length === 977, `Pending count must be 977 (actual: ${pendingData.length})`);
assert(resolvedData.length === 1621, `Resolved count must be 1,621 (actual: ${resolvedData.length})`);
assert(pendingData.length + resolvedData.length === 2598, 'Total count must be 2,598');

// 3. Rule 1 Check: Every pending member MUST have their latest status as flood or transfer
console.log('\n[3. Verifying Rule 1: Latest Delivery Attempt Must Be Flood or Transfer]');
let invalidPendingCount = 0;
pendingData.forEach(p => {
  const isFlood = p.isFlood || (p.lastReason && p.lastReason.includes('น้ำท่วม')) || (p.pendingCategory && p.pendingCategory.includes('น้ำท่วม'));
  const isTransfer = p.isTransfer || (p.lastReason && p.lastReason.includes('โอนงาน')) || (p.pendingCategory && p.pendingCategory.includes('โอนงาน'));
  if (!isFlood && !isTransfer) {
    invalidPendingCount++;
    console.error(`  Invalid pending item: ${p.memberId} - ${p.name} - reason: ${p.lastReason}`);
  }
});
assert.strictEqual(invalidPendingCount, 0, 'All pending members must have flood or transfer as their latest status');
console.log('  ✔ PASS: 100% of pending members (977/977) have their latest status as flood or transfer');

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
assert.strictEqual(ramIntra, 556, 'Ram Intra count must be 556');
assert.strictEqual(krungthep, 397, 'Krungthep Kreetha count must be 397');
assert.strictEqual(sukhumvit, 24, 'Sukhumvit 50 count must be 24');
console.log('  ✔ PASS: Branch distribution verified');

// 6. Check HTML & JS Map elements
console.log('\n[6. Verifying Frontend Map Controls]');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('js/app.js', 'utf8');

assert(html.includes('977 ราย'), 'Page 2 banner shows 977 members');
assert(html.includes('ทั้งหมด (977 จุด)'), 'Map filter button shows 977 points');
assert(html.includes('รามอินทรา (556 จุด)'), 'Map filter button shows 556 points');
assert(html.includes('กรุงเทพกรีฑา (397 จุด)'), 'Map filter button shows 397 points');
assert(html.includes('สุขุมวิท 50 (24 จุด)'), 'Map filter button shows 24 points');
assert(html.includes('🔴 น้ำท่วมสูง (936 จุด)'), 'Flood filter button shows 936 points');
assert(html.includes('🟣 โอนงานสิ้นวัน (41 จุด)'), 'Transfer filter button shows 41 points');
assert(html.includes('syncLiveFromSupabase'), 'Live sync trigger exists');
assert(js.includes('syncLiveFromSupabase'), 'syncLiveFromSupabase implementation exists in app.js');

console.log('  ✔ PASS: All frontend controls verified');

console.log('\n============================================================');
console.log('ALL LATEST DELIVERY DATE VERIFICATION & MAP TESTS PASSED! 🎯');
console.log('============================================================\n');
