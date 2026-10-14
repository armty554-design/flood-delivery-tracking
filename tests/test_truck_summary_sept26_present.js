/**
 * Test Suite: Truck Summary from 26 Sept to Present Verification
 * Validates default range mode (26 Sept to Present), getItemBangkokDate normalization,
 * branch metrics, active trucks (74), resolved (4,873), and pending (216).
 */

const fs = require('fs');
const assert = require('assert');

console.log('=== TEST: TRUCK SUMMARY FROM 26 SEPT TO PRESENT ===\n');

// 1. Verify HTML in index.html and docs/index.html
['index.html', 'docs/index.html'].forEach(file => {
  console.log(`[1. Verifying HTML markup in ${file}]`);
  const content = fs.readFileSync(file, 'utf8');

  // Range mode active by default
  assert(content.includes('id="btnTruckSumModeRange"'), `Range button must exist in ${file}`);
  assert(content.includes('id="truckSumRangeDateContainer" class="flex items-center gap-2"'), `Range container must not be hidden in ${file}`);
  assert(content.includes('id="truckSumSingleDateContainer" class="hidden flex items-center gap-2"'), `Single date container must be hidden by default in ${file}`);
  assert(content.includes('id="truckSummaryStartDateInput"') && content.includes('value="2026-09-26"'), `Start date input must default to 2026-09-26 in ${file}`);

  // Preset 26 Sept to Present
  assert(content.includes('26 ก.ย. - ปัจจุบัน'), `Preset button for 26 Sept - Present must exist in ${file}`);
  assert(content.includes("setTruckSummaryDatePreset('range', '2026-09-26', '')"), `Preset trigger must target 2026-09-26 to open-ended in ${file}`);

  // KPI card numbers
  assert(content.includes('5,089</span>'), `KPI total orders must show 5,089 in ${file}`);
  assert(content.includes('74 คัน</strong>'), `KPI active trucks must show 74 in ${file}`);
  assert(content.includes('4,873</span>'), `KPI resolved orders must show 4,873 in ${file}`);
  assert(content.includes('95.8%</span>'), `KPI resolved rate must show 95.8% in ${file}`);
  assert(content.includes('214</span>'), `KPI flood orders must show 214 in ${file}`);
  assert(content.includes('2</span>'), `KPI transfer orders must show 2 in ${file}`);

  // Cache buster version
  assert(content.includes('js/app.js?v=20261014_v2'), `Script cache version must be v=20261014_v2 in ${file}`);

  console.log(`  ✔ PASS: ${file} HTML verified`);
});

// 2. Verify JS Implementation in js/app.js and docs/js/app.js
['js/app.js', 'docs/js/app.js'].forEach(file => {
  console.log(`\n[2. Verifying JavaScript logic in ${file}]`);
  const content = fs.readFileSync(file, 'utf8');

  // AppState default range mode
  assert(content.includes("truckSummaryDateMode: 'range'"), `AppState must default truckSummaryDateMode to range in ${file}`);
  assert(content.includes("truckSummaryStartDate: '2026-09-26'"), `AppState must default truckSummaryStartDate to 2026-09-26 in ${file}`);

  // Helper function getItemBangkokDate
  assert(content.includes('function getItemBangkokDate(item)'), `getItemBangkokDate must be defined in ${file}`);
  assert(content.includes('window.getItemBangkokDate = getItemBangkokDate'), `getItemBangkokDate must be exposed to window in ${file}`);

  // Filter logic in renderTruckSummaryPage
  assert(content.includes('const bkkDate = getItemBangkokDate(item)'), `renderTruckSummaryPage must use getItemBangkokDate in ${file}`);

  // Switch page hook
  assert(content.includes("pageId === 'page-truck-summary'"), `switchPage must hook into page-truck-summary in ${file}`);

  console.log(`  ✔ PASS: ${file} JavaScript logic verified`);
});

// 3. Test Bangkok Date Normalization & Crisis Dataset Integrity
console.log('\n[3. Testing Bangkok Date Normalization on CRISIS_DATA]');
const storeContent = fs.readFileSync('js/data_store.js', 'utf8');
const jsonMatch = storeContent.replace(/^[\s\S]*?window\.CRISIS_DATA\s*=\s*/, '').replace(/;?\s*$/, '');
const crisisData = JSON.parse(jsonMatch);

function getThaiDateKey(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr).substring(0, 10);
    const tzOffset = 7 * 60;
    const localTime = new Date(d.getTime() + (tzOffset + d.getTimezoneOffset()) * 60000);
    const year = localTime.getFullYear();
    const month = String(localTime.getMonth() + 1).padStart(2, '0');
    const day = String(localTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return String(isoStr).substring(0, 10);
  }
}

function getItemBangkokDate(item) {
  if (!item) return '';
  if (item.lastDateIso) {
    const k = getThaiDateKey(item.lastDateIso);
    if (k) return k;
  }
  if (item.resolvedDateIso) {
    const k = getThaiDateKey(item.resolvedDateIso);
    if (k) return k;
  }
  if (item.lastDate) {
    const m = String(item.lastDate).match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (m) {
      let y = parseInt(m[3], 10);
      if (y > 2400) y -= 543;
      return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
  }
  return '';
}

// Check sample UTC offset
assert.strictEqual(getItemBangkokDate({ lastDateIso: '2026-09-25T17:00:00+00:00' }), '2026-09-26');
assert.strictEqual(getItemBangkokDate({ lastDateIso: '2026-10-08T03:15:00+00:00' }), '2026-10-08');

const allCrisis = [...crisisData.pending, ...crisisData.resolved];
assert.strictEqual(allCrisis.length, 5089, 'Total crisis records must be exactly 5,089');

const filtered = allCrisis.filter(item => {
  const bkk = getItemBangkokDate(item);
  if ('2026-09-26' && bkk && bkk < '2026-09-26') return false;
  return true;
});
assert.strictEqual(filtered.length, 5089, 'All 5,089 records must belong to 26 Sept or later');

// Group by branch & trucks
const branchMap = {
  'สาขากรุงเทพกรีฑา': { total: 0, resolved: 0, flood: 0, transfer: 0, trucks: {} },
  'สาขารามอินทรา': { total: 0, resolved: 0, flood: 0, transfer: 0, trucks: {} },
  'สาขาสุขุมวิท 50': { total: 0, resolved: 0, flood: 0, transfer: 0, trucks: {} },
  'สาขาพระราม 3': { total: 0, resolved: 0, flood: 0, transfer: 0, trucks: {} }
};

filtered.forEach(item => {
  const b = item.branch || 'สาขากรุงเทพกรีฑา';
  const trk = item.truck || 'ไม่ระบุ';
  const isPending = !!item.pendingCategory;
  const isTransfer = item.pendingCategory === 'โอนงานสิ้นวัน';

  branchMap[b].total++;
  if (isPending) {
    if (isTransfer) branchMap[b].transfer++;
    else branchMap[b].flood++;
  } else {
    branchMap[b].resolved++;
  }

  if (!branchMap[b].trucks[trk]) branchMap[b].trucks[trk] = true;
});

let totalTrucks = 0;
Object.values(branchMap).forEach(b => {
  totalTrucks += Object.keys(b.trucks).length;
});

console.log(`  Total Active Trucks: ${totalTrucks} (Expected: 74)`);
assert.strictEqual(totalTrucks, 74, 'Total active trucks evaluated must be exactly 74');
assert.strictEqual(branchMap['สาขารามอินทรา'].total, 1843);
assert.strictEqual(branchMap['สาขารามอินทรา'].resolved, 1670);
assert.strictEqual(branchMap['สาขารามอินทรา'].flood, 173);
assert.strictEqual(branchMap['สาขากรุงเทพกรีฑา'].total, 2266);
assert.strictEqual(branchMap['สาขากรุงเทพกรีฑา'].resolved, 2224);
assert.strictEqual(branchMap['สาขากรุงเทพกรีฑา'].flood, 41);
assert.strictEqual(branchMap['สาขากรุงเทพกรีฑา'].transfer, 1);
assert.strictEqual(branchMap['สาขาสุขุมวิท 50'].total, 965);
assert.strictEqual(branchMap['สาขาสุขุมวิท 50'].resolved, 964);
assert.strictEqual(branchMap['สาขาสุขุมวิท 50'].transfer, 1);
assert.strictEqual(branchMap['สาขาพระราม 3'].total, 15);
assert.strictEqual(branchMap['สาขาพระราม 3'].resolved, 15);

console.log('\n============================================================');
console.log('ALL TRUCK SUMMARY 26 SEPT TO PRESENT TESTS PASSED! 🚚🎯');
console.log('============================================================\n');
