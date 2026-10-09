// =========================================================================
// Automated Test Suite: Branch and Status Filters Across Pages 1, 2, 5, and 6
// =========================================================================
const fs = require('fs');
const path = require('path');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

console.log('=== TEST: BRANCH & STATUS FILTERS VERIFICATION (PAGES 1, 2, 5, 6) ===\n');

// 1. Check HTML Filter Controls in index.html and docs/index.html
['index.html', 'docs/index.html'].forEach(filePath => {
  console.log(`[1. Checking HTML Elements in ${filePath}]`);
  const html = fs.readFileSync(filePath, 'utf-8');

  // Page 1: Duration & Logic
  assert(html.includes('id="durationBranchFilter"'), 'Page 1 #durationBranchFilter exists');
  assert(html.includes('id="durationStatusFilter"'), 'Page 1 #durationStatusFilter exists');
  assert(html.includes('renderPage1FilteredView()'), 'Page 1 onchange triggers renderPage1FilteredView()');
  assert(html.includes('resetPage1Filters()'), 'Page 1 reset button triggers resetPage1Filters()');

  // Page 2: Map
  assert(html.includes('id="mapBranchSelect"'), 'Page 2 #mapBranchSelect exists');
  assert(html.includes('id="mapStatusSelect"'), 'Page 2 #mapStatusSelect exists');
  assert(html.includes('id="mapTruckInput"'), 'Page 2 #mapTruckInput exists');
  assert(html.includes('applyMapFilters()'), 'Page 2 triggers applyMapFilters()');
  assert(html.includes('resetMapFilters()'), 'Page 2 triggers resetMapFilters()');
  assert(html.includes('id="mapBreakdownText"'), 'Page 2 #mapBreakdownText exists');

  // Page 5: Details
  assert(html.includes('id="tableBranchSelect"'), 'Page 5 #tableBranchSelect exists');
  assert(html.includes('id="tableStatusSelect"'), 'Page 5 #tableStatusSelect exists');
  assert(html.includes('id="tableTruckInput"'), 'Page 5 #tableTruckInput exists');

  // Page 6: Admin
  assert(html.includes('id="adminBranchSelect"'), 'Page 6 #adminBranchSelect exists');
  assert(html.includes('id="adminStatusSelect"'), 'Page 6 #adminStatusSelect exists');
  assert(html.includes('id="adminTruckInput"'), 'Page 6 #adminTruckInput exists');
});

// 2. Check JavaScript logic and exports in js/app.js and docs/js/app.js
['js/app.js', 'docs/js/app.js'].forEach(filePath => {
  console.log(`\n[2. Checking JavaScript Logic in ${filePath}]`);
  const js = fs.readFileSync(filePath, 'utf-8');

  assert(js.includes('function renderPage1FilteredView'), 'renderPage1FilteredView function defined');
  assert(js.includes('function resetPage1Filters'), 'resetPage1Filters function defined');
  assert(js.includes('function applyMapFilters'), 'applyMapFilters function defined');
  assert(js.includes('function resetMapFilters'), 'resetMapFilters function defined');
  assert(js.includes('window.renderPage1FilteredView = renderPage1FilteredView'), 'renderPage1FilteredView exported to window');
  assert(js.includes('window.resetPage1Filters = resetPage1Filters'), 'resetPage1Filters exported to window');
  assert(js.includes('window.applyMapFilters = applyMapFilters'), 'applyMapFilters exported to window');
  assert(js.includes('window.resetMapFilters = resetMapFilters'), 'resetMapFilters exported to window');
});

// 3. Functional Simulation of Filtering Logic
console.log('\n[3. Simulating Data Filter Logic]');
const dsContent = fs.readFileSync('js/data_store.js', 'utf-8');
const vm = require('vm');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(dsContent, context);

const crisisData = context.window.CRISIS_DATA;
assert(crisisData && Array.isArray(crisisData.pending), 'CRISIS_DATA.pending is valid array');
assert(crisisData && Array.isArray(crisisData.resolved), 'CRISIS_DATA.resolved is valid array');

// Simulate Page 1 Branch Filter for "สาขารามอินทรา"
const ramIntraPending = crisisData.pending.filter(p => p.branch === 'สาขารามอินทรา');
const ramIntraResolved = crisisData.resolved.filter(r => r.branch === 'สาขารามอินทรา');
assert(ramIntraPending.length === 173, `Ram Intra pending count is 173 (actual: ${ramIntraPending.length})`);
assert(ramIntraResolved.length > 0, `Ram Intra resolved count is > 0 (actual: ${ramIntraResolved.length})`);

// Simulate Page 2 Status Filter for "TRANSFER"
const transferOnlyPins = crisisData.pending.filter(p => p.pendingCategory === 'โอนงานสิ้นวัน');
assert(transferOnlyPins.length === 2, `Transfer category pins count is 2 (actual: ${transferOnlyPins.length})`);

// Simulate Page 2 Status Filter for "FLOOD"
const floodOnlyPins = crisisData.pending.filter(p => p.pendingCategory !== 'โอนงานสิ้นวัน');
assert(floodOnlyPins.length === 214, `Flood category pins count is 214 (actual: ${floodOnlyPins.length})`);

console.log(`\n========================================================`);
console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed out of ${passedTests + failedTests} tests`);
console.log(`========================================================\n`);

if (failedTests > 0) process.exit(1);
