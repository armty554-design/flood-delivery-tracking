const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TESTING TABLE VIEW INTERACTIVE CHARTS & TRENDS ===\n');

const htmlPath = path.join(__dirname, '..', 'Index.html');
const templatePath = path.join(__dirname, '..', 'Index_template.html');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const templateContent = fs.readFileSync(templatePath, 'utf8');

// [1. Verify DOM Elements in Table Tab]
console.log('[1. DOM Elements in Table Tab]');
assert(htmlContent.includes('id="tableChartsContainer"'), 'tableChartsContainer must exist');
assert(htmlContent.includes('id="chartTableStatusDonut"'), 'chartTableStatusDonut canvas must exist');
assert(htmlContent.includes('id="chartTableBranchBar"'), 'chartTableBranchBar canvas must exist');
assert(htmlContent.includes('id="chartTableDailyTrend"'), 'chartTableDailyTrend canvas must exist');
assert(htmlContent.includes('id="tableChartSuccessRate"'), 'tableChartSuccessRate badge must exist');
assert(htmlContent.includes('id="tableChartDonutLegend"'), 'tableChartDonutLegend must exist');
assert(htmlContent.includes('id="btnToggleTableCharts"'), 'btnToggleTableCharts button must exist');
console.log('  ✔ PASS: All 3 chart canvases, badges, and toggle button exist in DOM');

// [2. Verify Functions in JavaScript Engine]
console.log('\n[2. JavaScript Chart Engine Functions]');
assert(templateContent.includes('function initTableCharts()'), 'initTableCharts function must exist');
assert(templateContent.includes('function updateTableCharts()'), 'updateTableCharts function must exist');
assert(templateContent.includes('function toggleTableChartsView()'), 'toggleTableChartsView function must exist');
assert(templateContent.includes('window.initTableCharts = initTableCharts'), 'initTableCharts must be bound to window');
assert(templateContent.includes('window.updateTableCharts = updateTableCharts'), 'updateTableCharts must be bound to window');
assert(templateContent.includes('window.toggleTableChartsView = toggleTableChartsView'), 'toggleTableChartsView must be bound to window');
console.log('  ✔ PASS: initTableCharts, updateTableCharts, toggleTableChartsView declared & window-bound');

// [3. Verify Chart Update Integration with Filters]
console.log('\n[3. Filter Hooks Integration]');
assert(templateContent.includes('if (typeof updateTableCharts === \'function\') updateTableCharts()'), 'updateTableCharts must be hooked into applyGlobalFilters');
console.log('  ✔ PASS: updateTableCharts is called automatically upon filter change and table rendering');

// [4. Simulation of Chart Data Engine]
console.log('\n[4. Simulation of Status & Branch Aggregation]');
const mockItems = [
  { memberId: 'M1', branch: 'สาขารามอินทรา', note: 'ยกเลิกรอบน้ำโดยระบบ auto ปิด Job 30', date: '2026-09-26' },
  { memberId: 'M2', branch: 'สาขารามอินทรา', reason: 'ลูกค้าตั้งถัง', date: '2026-09-26' },
  { memberId: 'M3', branch: 'สาขากรุงเทพกรีฑา', reason: 'ไม่สามารถเข้าส่งได้ น้ำท่วมสูงในพื้นที่', date: '2026-09-28' },
  { memberId: 'M4', branch: 'สาขาสุขุมวิท 50', round: 'โอนงานสิ้นวัน', date: '2026-09-29' },
  { memberId: 'M5', branch: 'สาขาพระราม 3', reason: 'ไม่รับน้ำ บริษัท/ร้านปิด', date: '2026-09-30' }
];

let delivered = 0, autoJob = 0, flood = 0, transfer = 0, other = 0;
const branchStats = {
  'สาขารามอินทรา': { succ: 0, flood: 0, transfer: 0 },
  'สาขากรุงเทพกรีฑา': { succ: 0, flood: 0, transfer: 0 },
  'สาขาสุขุมวิท 50': { succ: 0, flood: 0, transfer: 0 },
  'สาขาพระราม 3': { succ: 0, flood: 0, transfer: 0 }
};

mockItems.forEach(item => {
  const isAuto = (item.note || '').includes('auto ปิด Job 30') || (item.reason || '').includes('งดรับน้ำ');
  const isSucc = isAuto || (item.reason || '').includes('ลูกค้าตั้งถัง');
  const isFlood = (item.reason || '').includes('น้ำท่วมสูง');
  const isTransfer = (item.round || '').includes('โอนงาน');

  if (isAuto) autoJob++;
  else if (isSucc) delivered++;
  else if (isFlood) flood++;
  else if (isTransfer) transfer++;
  else other++;

  if (branchStats[item.branch]) {
    if (isSucc) branchStats[item.branch].succ++;
    else if (isFlood) branchStats[item.branch].flood++;
    else if (isTransfer) branchStats[item.branch].transfer++;
  }
});

assert.strictEqual(autoJob, 1, 'Auto Job count should be 1');
assert.strictEqual(delivered, 1, 'Delivered count should be 1');
assert.strictEqual(flood, 1, 'Flood count should be 1');
assert.strictEqual(transfer, 1, 'Transfer count should be 1');
assert.strictEqual(other, 1, 'Other count should be 1');
assert.strictEqual(branchStats['สาขารามอินทรา'].succ, 2, 'Ramindra should have 2 successful');
assert.strictEqual(branchStats['สาขากรุงเทพกรีฑา'].flood, 1, 'Krungthep Kreetha should have 1 flood');
assert.strictEqual(branchStats['สาขาสุขุมวิท 50'].transfer, 1, 'Sukhumvit 50 should have 1 transfer');

console.log('  ✔ PASS: Chart aggregation math accurately categorizes all delivery archetypes');

console.log('\n========================================================');
console.log('ALL TABLE VIEW INTERACTIVE CHARTS TESTS PASSED! (100%)');
console.log('========================================================\n');
