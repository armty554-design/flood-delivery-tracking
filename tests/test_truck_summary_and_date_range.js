/**
 * Test Suite: Truck Summary by Branch & Flexible Date Filter (Single / Range) Verification
 * Validates the new Executive Truck Summary page, truck detail modal, and flexible date filter controls.
 */

const fs = require('fs');
const assert = require('assert');

console.log('=== TEST: TRUCK SUMMARY BY BRANCH & FLEXIBLE DATE FILTER (SINGLE / RANGE) ===\n');

// 1. Verify HTML markup in index.html & docs/index.html
const htmlFiles = ['index.html', 'docs/index.html'];

htmlFiles.forEach(file => {
  console.log(`[1. Verifying HTML markup in ${file}]`);
  const content = fs.readFileSync(file, 'utf8');

  // Page Truck Summary Existence
  assert(content.includes('id="page-truck-summary"'), `Section #page-truck-summary must exist in ${file}`);
  assert(content.includes('data-target="page-truck-summary"'), `Navigation button for page-truck-summary must exist in ${file}`);
  assert(content.includes('สรุปแยกสาขา'), `Navigation text must exist in ${file}`);

  // Truck Summary KPI & Controls
  assert(content.includes('id="kpiSumTotalOrders"'), `KPI #kpiSumTotalOrders must exist in ${file}`);
  assert(content.includes('id="kpiSumActiveTrucks"'), `KPI #kpiSumActiveTrucks must exist in ${file}`);
  assert(content.includes('id="kpiSumResolvedOrders"'), `KPI #kpiSumResolvedOrders must exist in ${file}`);
  assert(content.includes('id="kpiSumResolvedRate"'), `KPI #kpiSumResolvedRate must exist in ${file}`);
  assert(content.includes('id="kpiSumFloodOrders"'), `KPI #kpiSumFloodOrders must exist in ${file}`);
  assert(content.includes('id="kpiSumTransferOrders"'), `KPI #kpiSumTransferOrders must exist in ${file}`);
  assert(content.includes('id="btnTruckSumModeSingle"'), `Date mode single button must exist in ${file}`);
  assert(content.includes('id="btnTruckSumModeRange"'), `Date mode range button must exist in ${file}`);
  assert(content.includes('id="truckSummaryDateInput"'), `Single date input must exist in ${file}`);
  assert(content.includes('id="truckSummaryStartDateInput"'), `Start date input must exist in ${file}`);
  assert(content.includes('id="truckSummaryEndDateInput"'), `End date input must exist in ${file}`);
  assert(content.includes('id="truckSummarySearchInput"'), `Truck search input must exist in ${file}`);
  assert(content.includes('id="truckSummaryBranchesContainer"'), `Branches container must exist in ${file}`);

  // Truck Detail Modal
  assert(content.includes('id="truckDetailModal"'), `Modal #truckDetailModal must exist in ${file}`);
  assert(content.includes('id="truckDetailModalTitle"'), `#truckDetailModalTitle must exist in ${file}`);
  assert(content.includes('id="truckModalTotal"'), `#truckModalTotal must exist in ${file}`);
  assert(content.includes('id="truckModalResolved"'), `#truckModalResolved must exist in ${file}`);
  assert(content.includes('id="truckModalFlood"'), `#truckModalFlood must exist in ${file}`);
  assert(content.includes('id="truckModalTransfer"'), `#truckModalTransfer must exist in ${file}`);
  assert(content.includes('id="truckModalSearchInput"'), `#truckModalSearchInput must exist in ${file}`);
  assert(content.includes('id="truckModalTableBody"'), `#truckModalTableBody must exist in ${file}`);
  assert(content.includes('goToMapWithTruck'), `goToMapWithTruck function trigger must exist in ${file}`);
  assert(content.includes('goToDetailsWithTruck'), `goToDetailsWithTruck function trigger must exist in ${file}`);
  assert(content.includes('exportTruckModalCsv'), `exportTruckModalCsv function trigger must exist in ${file}`);

  // Page 5 (Details Table) Flexible Date & Truck Filters
  assert(content.includes('id="btnTableDateSingle"'), `Page 5 single date toggle must exist in ${file}`);
  assert(content.includes('id="btnTableDateRange"'), `Page 5 date range toggle must exist in ${file}`);
  assert(content.includes('id="tableDateInput"'), `Page 5 single date input must exist in ${file}`);
  assert(content.includes('id="tableStartDateInput"'), `Page 5 start date input must exist in ${file}`);
  assert(content.includes('id="tableEndDateInput"'), `Page 5 end date input must exist in ${file}`);
  assert(content.includes('id="tableTruckInput"'), `Page 5 truck input must exist in ${file}`);

  // Page 6 (Admin) Flexible Date & Truck Filters
  assert(content.includes('id="btnAdminDateModeSingle"'), `Page 6 single date toggle must exist in ${file}`);
  assert(content.includes('id="btnAdminDateModeRange"'), `Page 6 date range toggle must exist in ${file}`);
  assert(content.includes('id="adminDateInput"'), `Page 6 single date input must exist in ${file}`);
  assert(content.includes('id="adminStartDateInput"'), `Page 6 start date input must exist in ${file}`);
  assert(content.includes('id="adminEndDateInput"'), `Page 6 end date input must exist in ${file}`);
  assert(content.includes('id="adminTruckInput"'), `Page 6 truck input must exist in ${file}`);

  // Verify balanced tags
  const openDivs = (content.match(/<div(\s|>)/gi) || []).length;
  const closeDivs = (content.match(/<\/div>/gi) || []).length;
  assert(openDivs === closeDivs, `Div tags must be balanced in ${file} (open: ${openDivs}, close: ${closeDivs})`);

  console.log(`  ✔ PASS: ${file} HTML markup & element IDs 100% verified`);
});

// 2. Verify JavaScript Implementation in js/app.js & docs/js/app.js
const jsFiles = ['js/app.js', 'docs/js/app.js'];

jsFiles.forEach(file => {
  console.log(`\n[2. Verifying JavaScript logic in ${file}]`);
  const content = fs.readFileSync(file, 'utf8');

  // Functions in Truck Summary Page
  assert(content.includes('function initTruckSummary('), `initTruckSummary must exist in ${file}`);
  assert(content.includes('function setTruckSummaryDateMode('), `setTruckSummaryDateMode must exist in ${file}`);
  assert(content.includes('function setTruckSummaryDatePreset('), `setTruckSummaryDatePreset must exist in ${file}`);
  assert(content.includes('function setTruckSummaryBranch('), `setTruckSummaryBranch must exist in ${file}`);
  assert(content.includes('function resetTruckSummaryFilters('), `resetTruckSummaryFilters must exist in ${file}`);
  assert(content.includes('function renderTruckSummaryPage('), `renderTruckSummaryPage must exist in ${file}`);

  // Functions in Truck Detail Modal
  assert(content.includes('function openTruckDetailModal('), `openTruckDetailModal must exist in ${file}`);
  assert(content.includes('function filterTruckModalMembers('), `filterTruckModalMembers must exist in ${file}`);
  assert(content.includes('function goToMapWithTruck('), `goToMapWithTruck must exist in ${file}`);
  assert(content.includes('function goToDetailsWithTruck('), `goToDetailsWithTruck must exist in ${file}`);
  assert(content.includes('function exportTruckModalCsv('), `exportTruckModalCsv must exist in ${file}`);

  // Functions in Page 5 (Details Table)
  assert(content.includes('function setTableDateMode('), `setTableDateMode must exist in ${file}`);
  assert(content.includes('function resetTableDateFilters('), `resetTableDateFilters must exist in ${file}`);

  // Functions in Page 6 (Admin)
  assert(content.includes('function setAdminDateMode('), `setAdminDateMode must exist in ${file}`);
  assert(content.includes('function setAdminDateRangePreset('), `setAdminDateRangePreset must exist in ${file}`);

  // Global window exposures
  assert(content.includes('window.openTruckDetailModal = openTruckDetailModal'), `openTruckDetailModal must be exposed to window in ${file}`);
  assert(content.includes('window.renderTruckSummaryPage = renderTruckSummaryPage'), `renderTruckSummaryPage must be exposed to window in ${file}`);
  assert(content.includes('window.setTableDateMode = setTableDateMode'), `setTableDateMode must be exposed to window in ${file}`);
  assert(content.includes('window.setAdminDateMode = setAdminDateMode'), `setAdminDateMode must be exposed to window in ${file}`);

  console.log(`  ✔ PASS: ${file} JavaScript functions & exports 100% verified`);
});

// 3. Test Data Aggregation & Truck Calculation Logic
console.log('\n[3. Testing Truck Aggregation & Grouping logic on CRISIS_DATA]');
const storeContent = fs.readFileSync('js/data_store.js', 'utf8');
const jsonMatch = storeContent.replace(/^[\s\S]*?window\.CRISIS_DATA\s*=\s*/, '').replace(/;?\s*$/, '');
const crisisData = JSON.parse(jsonMatch);

const allItems = [...(crisisData.pending || []), ...(crisisData.resolved || [])];
assert(allItems.length > 0, 'CRISIS_DATA items must be populated');

// Group by branch and truck
const branchMap = {};
allItems.forEach(item => {
  const branch = item.branch || 'ไม่ระบุสาขา';
  const truck = item.truck || 'ไม่ระบุคัน';
  if (!branchMap[branch]) branchMap[branch] = {};
  if (!branchMap[branch][truck]) {
    branchMap[branch][truck] = { pending: 0, resolved: 0, flood: 0, transfer: 0, total: 0 };
  }
  branchMap[branch][truck].total++;
  const isPending = crisisData.pending.some(p => p.memberId === item.memberId);
  if (isPending) {
    branchMap[branch][truck].pending++;
    if (item.pendingCategory === 'โอนงาน' || (item.lastReason && item.lastReason.includes('โอนงาน'))) {
      branchMap[branch][truck].transfer++;
    } else {
      branchMap[branch][truck].flood++;
    }
  } else {
    branchMap[branch][truck].resolved++;
  }
});

const branchNames = Object.keys(branchMap);
console.log(`  Branches identified: ${branchNames.join(', ')}`);
assert(branchNames.length >= 4, `At least 4 branches should be identified (found ${branchNames.length})`);

let totalTrucks = 0;
branchNames.forEach(b => {
  const trucks = Object.keys(branchMap[b]);
  totalTrucks += trucks.length;
  console.log(`    - ${b}: ${trucks.length} trucks`);
  assert(trucks.length > 0, `Branch ${b} must contain trucks`);
});

console.log(`  Total active trucks evaluated: ${totalTrucks}`);
assert(totalTrucks >= 40, `Total trucks should be at least 40 (found ${totalTrucks})`);

console.log('\n========================================================');
console.log('ALL TRUCK SUMMARY & DATE RANGE VERIFICATION TESTS PASSED! 🚚✨');
console.log('========================================================\n');
