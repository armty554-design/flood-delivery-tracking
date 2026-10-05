const fs = require('fs');
const assert = require('assert');

console.log('\n=== TESTING TRANSFERS DEDICATED TAB FEATURES ===\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✔ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

const html = fs.readFileSync('Index.html', 'utf8');

// 1. Navigation Button & Badge
it('Navigation bar contains dedicated button for transfers tab', () => {
  assert(html.includes('id="tabBtn-transfers"'), 'Should contain tabBtn-transfers button');
  assert(html.includes("switchTab('transfers')"), 'Should call switchTab(\'transfers\')');
  assert(html.includes('id="tabBadgeTransfers"'), 'Should contain tabBadgeTransfers');
  assert(html.includes('สรุปงานโอน & เลื่อนส่ง'), 'Should contain label text');
});

// 2. Tab Section Structure
it('Index.html contains tabContent-transfers section with full controls', () => {
  assert(html.includes('id="tabContent-transfers"'), 'Should contain tabContent-transfers section');
  assert(html.includes('btnTransferViewMatrix'), 'Should contain btnTransferViewMatrix');
  assert(html.includes('btnTransferViewDetail'), 'Should contain btnTransferViewDetail');
  assert(html.includes('transferViewMatrixContainer'), 'Should contain transferViewMatrixContainer');
  assert(html.includes('transferViewDetailContainer'), 'Should contain transferViewDetailContainer');
});

// 3. Filter Controls
it('Transfers Tab contains full filter controls (branch, date, reason, operator, search)', () => {
  assert(html.includes('id="transferTabBranchFilter"'), 'Should contain transferTabBranchFilter');
  assert(html.includes('id="transferTabDateFilter"'), 'Should contain transferTabDateFilter');
  assert(html.includes('id="transferTabReasonFilter"'), 'Should contain transferTabReasonFilter');
  assert(html.includes('id="transferTabOperatorFilter"'), 'Should contain transferTabOperatorFilter');
  assert(html.includes('id="transferTabSearch"'), 'Should contain transferTabSearch');
  assert(html.includes('resetTransferFilters()'), 'Should contain resetTransferFilters button');
});

// 4. KPI Cards
it('Transfers Tab contains 4 comprehensive KPI summary cards', () => {
  assert(html.includes('id="transferKpiTotal"'), 'Should contain transferKpiTotal');
  assert(html.includes('id="transferKpiTrucks"'), 'Should contain transferKpiTrucks');
  assert(html.includes('id="transferTabKpiPostpone"'), 'Should contain transferTabKpiPostpone');
  assert(html.includes('id="transferTabKpiFlood"'), 'Should contain transferTabKpiFlood');
});

// 5. Transfer Charts
it('Transfers Tab contains dedicated date and truck charts', () => {
  assert(html.includes('id="chartTransferDates"'), 'Should contain chartTransferDates canvas');
  assert(html.includes('id="chartTransferTrucks"'), 'Should contain chartTransferTrucks canvas');
});

// 6. View 1: Matrix Table
it('Transfers Tab View 1 has Matrix Table elements', () => {
  assert(html.includes('id="transferMatrixHead"'), 'Should contain transferMatrixHead');
  assert(html.includes('id="transferMatrixBody"'), 'Should contain transferMatrixBody');
  assert(html.includes('id="transferMatrixSummaryCount"'), 'Should contain transferMatrixSummaryCount');
});

// 7. View 2: Detailed Order List Table
it('Transfers Tab View 2 has Detailed Orders List with pagination', () => {
  assert(html.includes('id="transferDetailTbody"'), 'Should contain transferDetailTbody');
  assert(html.includes('id="transferDetailPageSize"'), 'Should contain transferDetailPageSize select');
  assert(html.includes('id="transferDetailPaginationInfo"'), 'Should contain transferDetailPaginationInfo');
  assert(html.includes('id="transferDetailPaginationButtons"'), 'Should contain transferDetailPaginationButtons');
});

// 8. CSV Export Options
it('Transfers Tab provides both Matrix CSV and Detailed CSV export buttons', () => {
  assert(html.includes('exportTransferMatrixCSV()'), 'Should contain exportTransferMatrixCSV button');
  assert(html.includes('exportTransferDetailsCSV()'), 'Should contain exportTransferDetailsCSV button');
});

// 9. Tab 2 Banner Link
it('Tab 2 Analytics has a direct banner linking to Transfers tab', () => {
  assert(html.includes('analyticsTransferBannerBadge'), 'Should contain analyticsTransferBannerBadge in Tab 2');
  assert(html.includes("switchTab('transfers')"), 'Should link to switchTab(\'transfers\')');
});

// 10. Javascript Functions and Window Bindings
it('Window bindings exist for all transfers tab functions', () => {
  const bindings = [
    'window.renderTransfersTab',
    'window.setTransferView',
    'window.resetTransferFilters',
    'window.changeTransferPageSize',
    'window.goTransferPage',
    'window.exportTransferMatrixCSV',
    'window.exportTransferDetailsCSV',
    'window.viewTransferredForTruck'
  ];
  bindings.forEach(b => {
    assert(html.includes(b), `Index.html should include binding ${b}`);
  });
});

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests.\n`);
if (failed > 0) process.exit(1);
