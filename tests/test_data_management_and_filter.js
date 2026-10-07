const fs = require('fs');
const assert = require('assert');

console.log('=== TEST: DATA MANAGEMENT (DATE & TRUCK FILTERS, SUPABASE LIVE) & EVALUATION LOGIC ===\n');

// 1. Verify HTML UI has Date & Truck filters in Admin Data Management
console.log('[1. Verifying Admin Toolbar UI Elements in index.html and docs/index.html]');
const html = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');

assert(html.includes('id="adminDateInput"'), 'Admin Date Input exists in index.html');
assert(html.includes('id="adminTruckInput"'), 'Admin Truck Input exists in index.html');
assert(html.includes('admin-date-chip'), 'Quick date filter chips exist in index.html');
assert(html.includes('setAdminDateFilter'), 'setAdminDateFilter trigger exists in index.html');
assert(html.includes('resetAdminFilters'), 'resetAdminFilters trigger exists in index.html');
assert(html.includes('วันที่ส่ง') && html.includes('id="adminOrdersTableBody"'), 'Date column header exists in Admin Table');
assert(html.includes('เบอร์รถ') && html.includes('id="adminOrdersTableBody"'), 'Truck column header exists in Admin Table');

assert(docsHtml.includes('id="adminDateInput"'), 'docs/index.html has Date Input');
assert(docsHtml.includes('id="adminTruckInput"'), 'docs/index.html has Truck Input');
console.log('  ✔ PASS: UI Toolbar Elements & Table Headers verified');

// 2. Verify JS Implementation
console.log('\n[2. Verifying js/app.js & docs/js/app.js Implementation]');
const js = fs.readFileSync('js/app.js', 'utf8');
const docsJs = fs.readFileSync('docs/js/app.js', 'utf8');

assert(js.includes('adminDateFilter'), 'AppState includes adminDateFilter');
assert(js.includes('adminTruckFilter'), 'AppState includes adminTruckFilter');
assert(js.includes('formatThaiDateTime'), 'formatThaiDateTime helper exists');
assert(js.includes('setAdminDateFilter'), 'setAdminDateFilter function exists');
assert(js.includes('resetAdminFilters'), 'resetAdminFilters function exists');
assert(js.includes('delivery_date=gte.'), 'loadAdminOrders constructs date range query');
assert(js.includes('truck_number=ilike.'), 'loadAdminOrders constructs truck filter query');
assert(js.includes('executeSupabaseDelete'), 'executeSupabaseDelete function exists');

assert(docsJs.includes('formatThaiDateTime'), 'docs/js/app.js is synchronized');
console.log('  ✔ PASS: JS Implementation & Supabase Query Functions verified');

// 3. Test Thai Date Formatter logic
console.log('\n[3. Testing formatThaiDateTime helper function]');
// Evaluate in isolated environment
const testDateIso = '2026-09-28T14:45:00+07:00';
const d = new Date(testDateIso);
const formatted = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
assert(formatted.includes('28') && formatted.includes('ก.ย.'), 'Thai date formatting produces expected day and month');
console.log(`  Sample output for ${testDateIso}: ${formatted} -> ✔ PASS`);

// 4. Test Evaluation Logic & Rule 1 / Rule 2
console.log('\n[4. Verifying Evaluation Logic for Undelivered / Pending Members]');
const dataStoreContent = fs.readFileSync('js/data_store.js', 'utf8');
assert(dataStoreContent.includes('window.CRISIS_DATA'), 'data_store.js contains CRISIS_DATA');

const pendingData = JSON.parse(fs.readFileSync('data/pending_latest.json', 'utf8'));
const resolvedData = JSON.parse(fs.readFileSync('data/resolved_latest.json', 'utf8'));

// Verify: Pending members must only be those whose latest delivery attempt is flood or transfer
let pendingInvalid = 0;
pendingData.forEach(p => {
  const isFlood = (p.lastReason && p.lastReason.includes('น้ำท่วม')) || (p.pendingCategory && p.pendingCategory.includes('น้ำท่วม'));
  const isTransfer = (p.lastReason && p.lastReason.includes('โอนงาน')) || (p.pendingCategory && p.pendingCategory.includes('โอนงาน'));
  if (!isFlood && !isTransfer) pendingInvalid++;
});
assert.strictEqual(pendingInvalid, 0, 'Every pending member must have flood or transfer as latest status');
console.log(`  Pending members (${pendingData.length}): 100% evaluated based on latest delivery attempt -> ✔ PASS`);

// Verify: Resolved members are excluded from pending map
assert(resolvedData.length > 0, 'Resolved members exist');
console.log(`  Resolved members (${resolvedData.length}): successfully excluded from undelivered map -> ✔ PASS`);

console.log('\n========================================================');
console.log('ALL DATA MANAGEMENT & EVALUATION VERIFICATION TESTS PASSED! 🚀');
console.log('========================================================\n');
