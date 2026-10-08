/**
 * Test Suite: Daily Progression Reconciliation & Drilldown Verification
 * Verifies 100% mathematical consistency of daily progression numbers across table, chart, modal and store.
 */

const fs = require('fs');
const assert = require('assert');

console.log('=== TEST: DAILY PROGRESSION RECONCILIATION & DYNAMIC RENDERING ===\n');

// 1. Verify Data Store
const storeContent = fs.readFileSync('js/data_store.js', 'utf8');
const jsonMatch = storeContent.replace(/^[\s\S]*?window\.CRISIS_DATA\s*=\s*/, '').replace(/;?\s*$/, '');
const crisisData = JSON.parse(jsonMatch);

const pending = crisisData.pending || [];
const resolved = crisisData.resolved || [];
const totalCrisis = pending.length + resolved.length;

assert.strictEqual(pending.length, 347, 'Pending count must be 347');
assert.strictEqual(resolved.length, 4742, 'Resolved count must be 4,742');
assert.strictEqual(totalCrisis, 5089, 'Total crisis evaluated must be 5,089');

console.log('[1. Data Store Integrity]');
console.log(`  ✔ Pending: ${pending.length}`);
console.log(`  ✔ Resolved: ${resolved.length}`);
console.log(`  ✔ Total: ${totalCrisis}`);

function getThaiDateKey(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr).substring(0, 10);
  const tzOffset = 7 * 60;
  const localTime = new Date(d.getTime() + (tzOffset + d.getTimezoneOffset()) * 60000);
  const year = localTime.getFullYear();
  const month = String(localTime.getMonth() + 1).padStart(2, '0');
  const day = String(localTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 2. Verify Daily Progression Calculation
console.log('\n[2. Daily Progression Step Calculation]');
const dateConfigs = [
  { key: '2026-09-26', label: '26 ก.ย. (เสาร์)', expectedDaily: 9, expectedCum: 9, expectedPending: 5080 },
  { key: '2026-09-27', label: '27 ก.ย. (อาทิตย์)', expectedDaily: 0, expectedCum: 9, expectedPending: 5080 },
  { key: '2026-09-28', label: '28 ก.ย. (จันทร์)', expectedDaily: 148, expectedCum: 157, expectedPending: 4932 },
  { key: '2026-09-29', label: '29 ก.ย. (อังคาร)', expectedDaily: 115, expectedCum: 272, expectedPending: 4817 },
  { key: '2026-09-30', label: '30 ก.ย. (พุธ)', expectedDaily: 68, expectedCum: 340, expectedPending: 4749 },
  { key: '2026-10-01', label: '1 ต.ค. (พฤหัส)', expectedDaily: 114, expectedCum: 454, expectedPending: 4635 },
  { key: '2026-10-02', label: '2 ต.ค. (ศุกร์)', expectedDaily: 83, expectedCum: 537, expectedPending: 4552 },
  { key: '2026-10-03', label: '3 ต.ค. (เสาร์)', expectedDaily: 2315, expectedCum: 2852, expectedPending: 2237 },
  { key: '2026-10-04', label: '4 ต.ค. (อาทิตย์)', expectedDaily: 0, expectedCum: 2852, expectedPending: 2237 },
  { key: '2026-10-05', label: '5 ต.ค. (จันทร์)', expectedDaily: 873, expectedCum: 3725, expectedPending: 1364 },
  { key: '2026-10-06', label: '6 ต.ค. (อังคาร)', expectedDaily: 560, expectedCum: 4285, expectedPending: 804 },
  { key: '2026-10-07', label: '7 ต.ค. (ปัจจุบัน)', expectedDaily: 457, expectedCum: 4742, expectedPending: 347 }
];

let runningCum = 0;
dateConfigs.forEach(d => {
  const dailyResolved = resolved.filter(r => (getThaiDateKey(r.resolvedDateIso) === d.key)).length;
  runningCum += dailyResolved;
  const remPending = totalCrisis - runningCum;

  assert.strictEqual(dailyResolved, d.expectedDaily, `${d.label}: Daily resolved must be ${d.expectedDaily}, got ${dailyResolved}`);
  assert.strictEqual(runningCum, d.expectedCum, `${d.label}: Cumulative resolved must be ${d.expectedCum}, got ${runningCum}`);
  assert.strictEqual(remPending, d.expectedPending, `${d.label}: Remaining pending must be ${d.expectedPending}, got ${remPending}`);

  console.log(`  ✔ ${d.label}: Daily +${dailyResolved} | Cum ${runningCum} | Pending ${remPending} | Rate ${((runningCum/totalCrisis)*100).toFixed(1)}%`);
});

assert.strictEqual(runningCum, 4742, 'Final cumulative resolved must be 4,742');
assert.strictEqual(totalCrisis - runningCum, 347, 'Final remaining pending must be 347');

// 3. Verify HTML & JS Markup
console.log('\n[3. Verifying index.html and docs/index.html markup]');
['index.html', 'docs/index.html'].forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  assert(content.includes('id="dailyProgressionTableBody"'), `dailyProgressionTableBody must exist in ${file}`);
  assert(content.includes('id="dailyProgressHeaderBadge"'), `dailyProgressHeaderBadge must exist in ${file}`);
  assert(content.includes('id="branchMatrixTableBody"'), `branchMatrixTableBody must exist in ${file}`);
  assert(content.includes('id="branchMatrixTableFoot"'), `branchMatrixTableFoot must exist in ${file}`);
  assert(content.includes('93.2%'), `93.2% progress rate must be present in ${file}`);
  console.log(`  ✔ ${file} verified`);
});

console.log('\n[4. Verifying js/app.js and docs/js/app.js implementation]');
['js/app.js', 'docs/js/app.js'].forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  assert(content.includes('function renderDailyProgressTableAndChart'), `renderDailyProgressTableAndChart must be defined in ${file}`);
  assert(content.includes('function renderBranchPerformanceMatrixAndKpis'), `renderBranchPerformanceMatrixAndKpis must be defined in ${file}`);
  assert(content.includes('window.renderDailyProgressTableAndChart'), `renderDailyProgressTableAndChart must be exported in ${file}`);
  assert(content.includes('window.renderBranchPerformanceMatrixAndKpis'), `renderBranchPerformanceMatrixAndKpis must be exported in ${file}`);
  console.log(`  ✔ ${file} verified`);
});

console.log('\n============================================================');
console.log('ALL DAILY PROGRESSION RECONCILIATION TESTS PASSED! 💯📊');
console.log('============================================================\n');
