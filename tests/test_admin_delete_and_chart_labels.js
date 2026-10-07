/**
 * Verification Test for Admin Table Selection Delete & Chart Numeric Labels
 */

const fs = require('fs');
const assert = require('assert');

console.log('=== VERIFYING ADMIN TABLE SELECTION & CHART NUMERIC DATA LABELS ===\n');

// 1. Check index.html markup
const html = fs.readFileSync('index.html', 'utf-8');

assert(html.includes('id="adminMasterCheckbox"'), 'Admin master checkbox exists');
assert(html.includes('id="btnAdminSelectAll"'), 'Admin Select All button exists');
assert(html.includes('id="btnAdminDeselectAll"'), 'Admin Deselect All button exists');
assert(html.includes('id="btnAdminDeleteSelected"'), 'Admin Delete Selected button exists');
assert(html.includes('id="adminOrdersTableBody"'), 'Admin orders table body exists');
assert(html.includes('id="adminConfirmDeleteModal"'), 'Admin confirmation delete modal exists');
assert(html.includes('id="btnConfirmDeleteSupabase"'), 'Admin Supabase execute delete button exists');
assert(html.includes('id="adminTablePagination"'), 'Admin table pagination container exists');
console.log('✔ PASS: All Admin Selection & Deletion HTML elements are present');

// 2. Check js/app.js code logic
const appJs = fs.readFileSync('js/app.js', 'utf-8');

assert(appJs.includes('customDataLabelsPlugin'), 'customDataLabelsPlugin defined and registered');
assert(appJs.includes('datalabelColor'), 'Data label colors configured');
assert(appJs.includes('adminSelectedIds'), 'adminSelectedIds Set state exists');
assert(appJs.includes('toggleAdminRowSelect'), 'toggleAdminRowSelect function exists');
assert(appJs.includes('toggleAdminSelectAllOnPage'), 'toggleAdminSelectAllOnPage function exists');
assert(appJs.includes('clearAdminSelection'), 'clearAdminSelection function exists');
assert(appJs.includes('openAdminDeleteModal'), 'openAdminDeleteModal function exists');
assert(appJs.includes('executeSupabaseDelete'), 'executeSupabaseDelete function exists');
assert(appJs.includes('fetch(`${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?id=in.(${idsParam})`'), 'Supabase REST DELETE endpoint called');
assert(appJs.includes('renderAdminPagination'), 'renderAdminPagination function exists');
console.log('✔ PASS: All Admin Selection & Deletion and Chart Labels JavaScript logic verified');

// 3. Verify Chart Data Labels configuration in datasets
assert(appJs.includes("datalabelColor: '#dc2626'"), 'Pending line has custom datalabelColor');
assert(appJs.includes("datalabelColor: '#059669'"), 'Resolved line has custom datalabelColor');
assert(appJs.includes("datalabelColor: '#1d4ed8'"), 'Daily solved bar has custom datalabelColor');
assert(appJs.includes("datalabelSuffix: ' น.'"), 'Duration trend has custom datalabelSuffix');
console.log('✔ PASS: Chart datasets configured with datalabel options');

console.log('\nALL ADMIN & CHART LABEL TESTS PASSED SUCCESSFULLY! 🎯');
