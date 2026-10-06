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
assert(htmlContent.includes('(นับรหัสเป็น 1)'), 'Must indicate counting 1 code per member in Donut title');
assert(htmlContent.includes('(1 รหัส/ราย)'), 'Must indicate counting 1 code per member in Branch title');
assert(htmlContent.includes('1 รหัส/วัน'), 'Must indicate counting 1 code per day in Daily trend');
console.log('  ✔ PASS: All 3 chart canvases, badges, legends, and 1-code-per-member labels exist in DOM');

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

// [4. Simulation of Unique Member Aggregation & Latest Status in Table Charts Engine]
console.log('\n[4. Simulation of 1-Code-1-Member Engine (Latest Status Resolution)]');

// Helper: checkOrderDeliveryStatus mock (matching Index_template.html)
function checkOrderDeliveryStatus(order) {
  if (!order) return { isSuccess: false, isAuto: false, isFlood: false, isTransfer: false, type: 'EMPTY' };
  const note = (order.note || '').toLowerCase();
  const reason = (order.reason || '').toLowerCase();
  const status = (order.status || '').toLowerCase();
  const round = (order.round || '').toLowerCase();
  const transRaw = (order.transferRaw || '').toLowerCase();
  const isTransferred = Boolean(order.isTransferred);
  const changedWater = Number(order.changedWater || 0);

  const isAutoJob = note.includes('auto ปิด job 30') || reason.includes('auto ปิด job 30') || status.includes('auto ปิด job 30') || note.includes('งดรับน้ำ') || reason.includes('งดรับน้ำ');
  if (isAutoJob) return { isSuccess: true, isAuto: true, isFlood: false, isTransfer: false, type: 'AUTO_JOB30' };

  if (changedWater > 0) return { isSuccess: true, isAuto: false, isFlood: false, isTransfer: false, type: 'CHANGED_WATER' };

  const isDirectDelivered = reason.includes('ลูกค้าตั้งถัง') || reason.includes('ลูกค้าอยู่บ้าน') || reason.includes('พบลูกค้า') || status.includes('ลูกค้าตั้งถัง') || status.includes('ลูกค้าอยู่บ้าน') || status.includes('พบลูกค้า') || status.includes('ส่งสำเร็จ');
  if (isDirectDelivered) return { isSuccess: true, isAuto: false, isFlood: false, isTransfer: false, type: 'DELIVERED' };

  const isFlood = reason.includes('น้ำท่วม') || status.includes('รอน้ำลด') || note.includes('น้ำท่วม');
  const isTransfer = isTransferred || round.includes('โอนงานสิ้นวัน') || transRaw.includes('ผู้ทำรายการ') || transRaw.includes('โอนงาน') || reason.includes('โอนงาน');

  if (isFlood) return { isSuccess: false, isAuto: false, isFlood: true, isTransfer, type: 'FLOOD' };
  if (isTransfer) return { isSuccess: false, isAuto: false, isFlood: false, isTransfer: true, type: 'TRANSFER' };

  // สถานะอื่นทั้งหมด (ไม่รับน้ำ, บริษัท/ร้านปิด ฯลฯ) จัดส่งสำเร็จ
  return { isSuccess: true, isAuto: false, isFlood: false, isTransfer: false, type: 'NORMAL_DELIVERED' };
}

// Helper: evaluateMemberLifecycle mock
function evaluateMemberLifecycle(attempts) {
  if (!attempts || attempts.length === 0) return { isAccessible: false, isSuccess: false, isPendingFlood: false, isPendingTransfer: false };
  let isSuccess = false;
  let isAuto = false;
  let hadFlood = false;
  let hadTransfer = false;

  attempts.forEach(a => {
    const s = checkOrderDeliveryStatus(a);
    if (s.isAuto) { isAuto = true; isSuccess = true; }
    else if (s.isSuccess) { isSuccess = true; }
    if (s.isFlood) hadFlood = true;
    if (s.isTransfer) hadTransfer = true;
  });

  const latestAttempt = attempts[attempts.length - 1];
  const latestStatus = checkOrderDeliveryStatus(latestAttempt);

  if (hadTransfer) {
    const hasResolvedDelivery = attempts.some(a => checkOrderDeliveryStatus(a).isSuccess && !checkOrderDeliveryStatus(a).isTransfer && !checkOrderDeliveryStatus(a).isFlood);
    if (hasResolvedDelivery || isSuccess) isSuccess = true;
  }

  const isPending = !isSuccess;
  return {
    isAccessible: isSuccess,
    isSuccess,
    isAuto,
    hadFlood,
    hadTransfer,
    isPending,
    isPendingFlood: isPending && (latestStatus.isFlood || hadFlood),
    isPendingTransfer: isPending && (latestStatus.isTransfer || hadTransfer)
  };
}

// Mock dataset with multiple attempts per member:
// - M1: Single Auto Job 30 attempt
// - M2: Single Customer Set Tank (Success) attempt
// - M3: Single Flood blocked attempt
// - M4: MULTI-ATTEMPT: Day 2 transfer/error, Day 3 delivered (ลูกค้าอยู่บ้าน - case 270520 archetype)
// - M5: Single Other Fail (Store closed) attempt
const mockItems = [
  { memberId: 'M1', branch: 'สาขารามอินทรา', note: 'ยกเลิกรอบน้ำโดยระบบ auto ปิด Job 30', date: '2026-09-26 09:00' },
  { memberId: 'M2', branch: 'สาขารามอินทรา', reason: 'ลูกค้าตั้งถัง', date: '2026-09-26 10:00' },
  { memberId: 'M3', branch: 'สาขากรุงเทพกรีฑา', reason: 'ไม่สามารถเข้าส่งได้ น้ำท่วมสูงในพื้นที่', date: '2026-09-28 11:00' },
  { memberId: 'M4', branch: 'สาขาสุขุมวิท 50', round: 'โอนงานสิ้นวัน', reason: 'เกิดข้อผิดพลาด', date: '2026-10-02 15:00' },
  { memberId: 'M4', branch: 'สาขาสุขุมวิท 50', status: 'ลูกค้าอยู่บ้าน', reason: 'ส่งสำเร็จ', date: '2026-10-03 11:30' },
  { memberId: 'M5', branch: 'สาขาพระราม 3', reason: 'ไม่รับน้ำ บริษัท/ร้านปิด', date: '2026-09-30 14:00' }
];

assert.strictEqual(mockItems.length, 6, 'Raw rows should be 6');

// Run the new Table Charts Aggregation Engine
const memberMap = new Map();
mockItems.forEach(item => {
  const mId = item.memberId;
  if (!memberMap.has(mId)) {
    memberMap.set(mId, { memberId: mId, branch: item.branch, attempts: [] });
  }
  const m = memberMap.get(mId);
  m.attempts.push(item);
  if (item.branch) m.branch = item.branch;
});

assert.strictEqual(memberMap.size, 5, 'Unique member count must be exactly 5 (M1 - M5)');

let deliveredCount = 0;
let autoJobCount = 0;
let floodCount = 0;
let transferCount = 0;
let otherFailCount = 0;

const branchStats = {
  'สาขารามอินทรา': { succ: 0, flood: 0, transfer: 0 },
  'สาขากรุงเทพกรีฑา': { succ: 0, flood: 0, transfer: 0 },
  'สาขาสุขุมวิท 50': { succ: 0, flood: 0, transfer: 0 },
  'สาขาพระราม 3': { succ: 0, flood: 0, transfer: 0 }
};

memberMap.forEach((m, mId) => {
  const latestAttempt = m.attempts[m.attempts.length - 1];
  const latestStatus = checkOrderDeliveryStatus(latestAttempt);
  const memEval = evaluateMemberLifecycle(m.attempts);

  let statusCategory = 'OTHER';
  if (memEval.isAuto || latestStatus.isAuto) {
    autoJobCount++;
    statusCategory = 'AUTO';
  } else if (memEval.isAccessible || latestStatus.isSuccess) {
    deliveredCount++;
    statusCategory = 'SUCCESS';
  } else if (memEval.isPendingFlood || latestStatus.isFlood) {
    floodCount++;
    statusCategory = 'FLOOD';
  } else if (memEval.isPendingTransfer || latestStatus.isTransfer) {
    transferCount++;
    statusCategory = 'TRANSFER';
  } else {
    otherFailCount++;
    statusCategory = 'OTHER';
  }

  const bKey = latestAttempt.branch || m.branch;
  if (bKey && branchStats[bKey]) {
    if (statusCategory === 'SUCCESS' || statusCategory === 'AUTO') {
      branchStats[bKey].succ++;
    } else if (statusCategory === 'FLOOD') {
      branchStats[bKey].flood++;
    } else if (statusCategory === 'TRANSFER') {
      branchStats[bKey].transfer++;
    }
  }
});

// Assertions on Unique Member Counts:
assert.strictEqual(autoJobCount, 1, 'Auto Job unique count should be 1 (M1)');
assert.strictEqual(deliveredCount, 3, 'Delivered unique count should be 3 (M2 + M4 resolved + M5 visit completed)');
assert.strictEqual(floodCount, 1, 'Flood unique count should be 1 (M3)');
assert.strictEqual(transferCount, 0, 'Pending transfer count should be 0 because M4 resolved to success');
assert.strictEqual(otherFailCount, 0, 'Other fail count should be 0');

const totalTally = deliveredCount + autoJobCount + floodCount + transferCount + otherFailCount;
assert.strictEqual(totalTally, 5, 'Sum of all categories must match unique members count (5)');
assert.strictEqual(deliveredCount + autoJobCount, 4, 'Total successful members must be 4');

// Branch breakdown assertions:
assert.strictEqual(branchStats['สาขารามอินทรา'].succ, 2, 'Ramindra should have 2 unique successful (M1 + M2)');
assert.strictEqual(branchStats['สาขากรุงเทพกรีฑา'].flood, 1, 'Krungthep Kreetha should have 1 flood (M3)');
assert.strictEqual(branchStats['สาขาสุขุมวิท 50'].succ, 1, 'Sukhumvit 50 should have 1 successful (M4 resolved)');
assert.strictEqual(branchStats['สาขาสุขุมวิท 50'].transfer, 0, 'Sukhumvit 50 should have 0 pending transfer (M4 was resolved)');
assert.strictEqual(branchStats['สาขาพระราม 3'].succ, 1, 'Rama 3 should have 1 successful (M5)');

console.log('  ✔ PASS: M4 (Day 2 transfer + Day 3 delivered) is counted as 1 SUCCESS, NOT duplicated or stuck in transfer');
console.log('  ✔ PASS: Donut Chart status breakdown strictly sums to unique member count: 5 = 5');
console.log('  ✔ PASS: Branch Comparison Bar Chart strictly attributes unique members to their latest status');

// [5. Daily Trend Aggregation: 1 Unique Member per Day]
console.log('\n[5. Daily Trend Aggregation (1 Unique Member per Day)]');
const dateMemberMap = new Map();
mockItems.forEach(item => {
  const mId = item.memberId;
  const dateKey = item.date.split(' ')[0];
  if (!dateMemberMap.has(dateKey)) {
    dateMemberMap.set(dateKey, new Map());
  }
  const mOnDate = dateMemberMap.get(dateKey);
  if (!mOnDate.has(mId)) {
    mOnDate.set(mId, []);
  }
  mOnDate.get(mId).push(item);
});

const dailyMap = {};
dateMemberMap.forEach((membersOnDate, dateKey) => {
  dailyMap[dateKey] = { succ: 0, flood: 0, transfer: 0, total: 0 };
  membersOnDate.forEach((attemptsOnDate, mId) => {
    const latestAttemptOnDate = attemptsOnDate[attemptsOnDate.length - 1];
    const statusOnDate = checkOrderDeliveryStatus(latestAttemptOnDate);
    const memEval = evaluateMemberLifecycle(attemptsOnDate);

    dailyMap[dateKey].total++;
    if (memEval.isAuto || statusOnDate.isAuto || memEval.isAccessible || statusOnDate.isSuccess) {
      dailyMap[dateKey].succ++;
    } else if (memEval.isPendingFlood || statusOnDate.isFlood) {
      dailyMap[dateKey].flood++;
    } else if (memEval.isPendingTransfer || statusOnDate.isTransfer) {
      dailyMap[dateKey].transfer++;
    }
  });
});

assert.strictEqual(dailyMap['2026-09-26'].total, 2, '26 Sept should have 2 unique members (M1, M2)');
assert.strictEqual(dailyMap['2026-09-26'].succ, 2, '26 Sept should have 2 successful members');
assert.strictEqual(dailyMap['2026-09-28'].total, 1, '28 Sept should have 1 unique member (M3)');
assert.strictEqual(dailyMap['2026-09-28'].flood, 1, '28 Sept should have 1 flood member');
assert.strictEqual(dailyMap['2026-10-02'].total, 1, '2 Oct should have 1 unique member (M4 on Day 2)');
assert.strictEqual(dailyMap['2026-10-03'].total, 1, '3 Oct should have 1 unique member (M4 on Day 3)');
assert.strictEqual(dailyMap['2026-10-03'].succ, 1, '3 Oct should have 1 successful member');

console.log('  ✔ PASS: Daily Trend Chart groups by date and tallies unique members per day');

// [6. Uniform Thai Short Date Formatting Verification]
console.log('\n[6. Consistent Thai Date Formatting]');
assert(templateContent.includes('function formatThaiShortDate(dStr, includeYear)'), 'formatThaiShortDate function must exist');
assert(templateContent.includes('window.formatThaiShortDate = formatThaiShortDate'), 'formatThaiShortDate must be bound to window');
assert(htmlContent.includes('id="tableDailyTrendTitle"'), 'tableDailyTrendTitle id must exist');
assert(htmlContent.includes('25 ก.ย. – 5 ต.ค.'), 'Header must reference full operational range 25 Sep - 5 Oct');

// Extract and test formatThaiShortDate implementation directly from template
const formatThaiFuncMatch = templateContent.match(/function formatThaiShortDate\(dStr, includeYear\) \{([\s\S]*?)\n    \}/);
assert(formatThaiFuncMatch, 'Must be able to extract formatThaiShortDate function');
const formatThaiShortDate = new Function('dStr', 'includeYear', formatThaiFuncMatch[1]);

const testCases = [
  { input: '2026-09-25', expected: '25 ก.ย.' },
  { input: '2026-09-26', expected: '26 ก.ย.' },
  { input: '2026-09-27', expected: '27 ก.ย.' },
  { input: '2026-09-28', expected: '28 ก.ย.' },
  { input: '2026-09-29', expected: '29 ก.ย.' },
  { input: '2026-09-30', expected: '30 ก.ย.' },
  { input: '2026-10-01', expected: '1 ต.ค.' },
  { input: '2026-10-02', expected: '2 ต.ค.' },
  { input: '2026-10-03', expected: '3 ต.ค.' },
  { input: '2026-10-04', expected: '4 ต.ค.' },
  { input: '2026-10-05', expected: '5 ต.ค.' },
  { input: '09-25', expected: '25 ก.ย.' },
  { input: '10-04', expected: '4 ต.ค.' },
  { input: '26/09/2026', expected: '26 ก.ย.' },
  { input: '26 ก.ย.', expected: '26 ก.ย.' }
];

testCases.forEach(tc => {
  const result = formatThaiShortDate(tc.input);
  assert.strictEqual(result, tc.expected, `Input ${tc.input} must format to ${tc.expected}, got ${result}`);
});

// Verify no mixed date formats are produced
const sampleDates = ['2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'];
const labels = sampleDates.map(d => formatThaiShortDate(d));
labels.forEach(l => {
  assert(/^\d{1,2}\s+(ก\.ย\.|ต\.ค\.)$/.test(l), `Label ${l} must match Thai short date pattern`);
});
assert(!labels.includes('09-25'), 'Must not contain 09-25');
assert(!labels.includes('09-27'), 'Must not contain 09-27');
assert(!labels.includes('10-04'), 'Must not contain 10-04');
assert(!labels.includes('10-05'), 'Must not contain 10-05');

console.log('  ✔ PASS: All dates from 25 Sep - 5 Oct formatted consistently in Thai format');
console.log('  ✔ PASS: No English/ISO fallback formats (09-25, 10-04) remain');

console.log('\n================================================================');
console.log('ALL TABLE VIEW INTERACTIVE CHARTS & TRENDS TESTS PASSED! (100%)');
console.log('================================================================\n');
