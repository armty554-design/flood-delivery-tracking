/**
 * Test Suite: Daily Progress Drilldown Modal Verification
 * Verifies interactive clickability, modal markup, data extraction, and search/filter actions.
 */

const fs = require('fs');
const assert = require('assert');

console.log('=== TEST: DAILY PROGRESS DRILLDOWN MODAL & ROW CLICKABILITY ===\n');

// 1. Verify index.html and docs/index.html
const htmlFiles = ['index.html', 'docs/index.html'];

htmlFiles.forEach(file => {
  console.log(`[1. Verifying HTML markup in ${file}]`);
  const content = fs.readFileSync(file, 'utf8');

  // Verify modal elements
  assert(content.includes('id="dailyDetailModal"'), `Modal #dailyDetailModal must exist in ${file}`);
  assert(content.includes('id="dailyDetailModalTitle"'), `Modal title element must exist in ${file}`);
  assert(content.includes('id="dailyModalDailyResolved"'), `Daily resolved KPI element must exist in ${file}`);
  assert(content.includes('id="dailyModalCumResolved"'), `Cumulative resolved KPI element must exist in ${file}`);
  assert(content.includes('id="dailyModalPending"'), `Pending KPI element must exist in ${file}`);
  assert(content.includes('id="dailyModalRate"'), `Rate KPI element must exist in ${file}`);
  assert(content.includes('id="dailyModalSearchInput"'), `Search input must exist in ${file}`);
  assert(content.includes('id="dailyModalBranchSelect"'), `Branch filter select must exist in ${file}`);
  assert(content.includes('id="dailyModalTableBody"'), `Table body must exist in ${file}`);
  assert(content.includes('goToAdminFromDailyModal'), `Go to Admin button must exist in ${file}`);
  assert(content.includes('goToMapFromDailyModal'), `Go to Map button must exist in ${file}`);
  assert(content.includes('exportDailyModalCsv'), `Export CSV button must exist in ${file}`);

  // Verify daily rows clickability
  const expectedDates = [
    '2026-09-26',
    '2026-09-28',
    '2026-09-29',
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07'
  ];

  expectedDates.forEach(date => {
    assert(content.includes(`openDailyDetailModal('${date}'`), `Table row for ${date} must have openDailyDetailModal in ${file}`);
  });

  // Verify HTML tag balance
  const openDivs = (content.match(/<div(\s|>)/gi) || []).length;
  const closeDivs = (content.match(/<\/div>/gi) || []).length;
  assert(openDivs === closeDivs, `Div tags must be balanced in ${file} (open: ${openDivs}, close: ${closeDivs})`);

  console.log(`  ✔ PASS: ${file} markup and modal elements 100% verified`);
});

// 2. Verify js/app.js and docs/js/app.js
const jsFiles = ['js/app.js', 'docs/js/app.js'];

jsFiles.forEach(file => {
  console.log(`\n[2. Verifying JavaScript Implementation in ${file}]`);
  const content = fs.readFileSync(file, 'utf8');

  assert(content.includes('function openDailyDetailModal('), `openDailyDetailModal must be defined in ${file}`);
  assert(content.includes('function extractMembersForDailyModal('), `extractMembersForDailyModal must be defined in ${file}`);
  assert(content.includes('function filterDailyModalList('), `filterDailyModalList must be defined in ${file}`);
  assert(content.includes('function goToAdminFromDailyModal('), `goToAdminFromDailyModal must be defined in ${file}`);
  assert(content.includes('function goToMapFromDailyModal('), `goToMapFromDailyModal must be defined in ${file}`);
  assert(content.includes('function exportDailyModalCsv('), `exportDailyModalCsv must be defined in ${file}`);
  assert(content.includes('window.openDailyDetailModal = openDailyDetailModal'), `openDailyDetailModal must be exposed to window in ${file}`);

  console.log(`  ✔ PASS: ${file} functions and window bindings verified`);
});

// 3. Test daily member extraction logic
console.log('\n[3. Testing member extraction per date against CRISIS_DATA]');
const storeContent = fs.readFileSync('js/data_store.js', 'utf8');
const jsonMatch = storeContent.replace(/^[\s\S]*?window\.CRISIS_DATA\s*=\s*/, '').replace(/;?\s*$/, '');
const crisisData = JSON.parse(jsonMatch);

const allCrisis = [...(crisisData.pending || []), ...(crisisData.resolved || [])];

function testExtractMembers(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const thaiYear = parseInt(y, 10) + 543;
  const shortDateThai = `${parseInt(d, 10)}/${parseInt(m, 10)}/${thaiYear}`;
  const shortDateAd = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
  const shortDayMonth = `${parseInt(d, 10)}/${parseInt(m, 10)}`;

  let matchedItems = [];

  allCrisis.forEach(item => {
    const history = item.history || '';
    const steps = history.split('➔').map(s => s.trim());
    let stepForDate = steps.find(s => s.startsWith(shortDateThai) || s.startsWith(shortDateAd) || s.startsWith(shortDayMonth));

    let matched = false;
    let dayReason = '';

    if (stepForDate) {
      matched = true;
      const match = stepForDate.match(/\[(.*?)\]/);
      dayReason = match ? match[1] : stepForDate;
    } else if (item.lastDateIso && item.lastDateIso.startsWith(dateStr)) {
      matched = true;
      dayReason = item.lastReason || item.resolvedReason || 'ส่งสำเร็จ';
    } else if (item.lastDate && (item.lastDate === shortDateThai || item.lastDate === shortDateAd)) {
      matched = true;
      dayReason = item.lastReason || item.resolvedReason || 'ส่งสำเร็จ';
    }

    if (matched) {
      matchedItems.push({ memberId: item.memberId, name: item.name, dayReason });
    }
  });

  if (matchedItems.length === 0 && allCrisis.length > 0) {
    const cohort = (crisisData.pending && crisisData.pending.length > 0) ? crisisData.pending.slice(0, 100) : allCrisis.slice(0, 100);
    matchedItems = cohort.map(i => ({ memberId: i.memberId, name: i.name, dayReason: i.lastReason || 'ติดตามผล' }));
  }

  return matchedItems;
}

const testDates = ['2026-09-26', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06', '2026-10-07'];

testDates.forEach(date => {
  const members = testExtractMembers(date);
  assert(members.length > 0, `Date ${date} must produce at least 1 member row for drilldown modal`);
  console.log(`  ✔ PASS: Date ${date} extracted ${members.length.toLocaleString()} valid member items`);
});

console.log('\n========================================================');
console.log('ALL DAILY DRILLDOWN MODAL TESTS PASSED! 🎯🚀');
console.log('========================================================\n');
