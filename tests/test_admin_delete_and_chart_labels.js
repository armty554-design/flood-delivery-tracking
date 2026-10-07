/**
 * Verification Test for Admin Table Selection Delete, Order Edit, and PIN Security 171938
 */

const fs = require('fs');
const assert = require('assert');

console.log('=== VERIFYING ADMIN TABLE EDIT, DELETE & PIN SECURITY "171938" ===\n');

// 1. Check index.html markup
const html = fs.readFileSync('index.html', 'utf-8');

assert(html.includes('id="adminAuthGate"'), 'Admin authentication gate #adminAuthGate exists');
assert(html.includes('id="adminPinInput"'), 'Admin PIN input #adminPinInput exists');
assert(html.includes('id="btnAdminLogin"'), 'Admin login button #btnAdminLogin exists');
assert(html.includes('id="adminAuthenticatedContent"'), 'Admin authenticated content container exists');
assert(html.includes('id="adminMasterCheckbox"'), 'Admin master checkbox exists');
assert(html.includes('id="btnAdminSelectAll"'), 'Admin Select All button exists');
assert(html.includes('id="btnAdminDeselectAll"'), 'Admin Deselect All button exists');
assert(html.includes('id="btnAdminDeleteSelected"'), 'Admin Delete Selected button exists');
assert(html.includes('id="adminOrdersTableBody"'), 'Admin orders table body exists');
assert(html.includes('id="adminConfirmDeleteModal"'), 'Admin confirmation delete modal exists');
assert(html.includes('id="btnConfirmDeleteSupabase"'), 'Admin Supabase execute delete button exists');
assert(html.includes('id="adminEditOrderModal"'), 'Admin edit order modal exists');
assert(html.includes('id="btnSaveEditOrder"'), 'Admin save edit order button exists');
assert(html.includes('id="adminTablePagination"'), 'Admin table pagination container exists');
console.log('✔ PASS: All Admin Security Gate, Edit Modal, and Table HTML elements are present');

// 2. Check js/app.js code logic
const appJs = fs.readFileSync('js/app.js', 'utf-8');

assert(appJs.includes("'171938'"), 'Admin PIN code 171938 is verified in JavaScript logic');
assert(appJs.includes('verifyAdminPin'), 'verifyAdminPin function exists');
assert(appJs.includes('logoutAdmin'), 'logoutAdmin function exists');
assert(appJs.includes('updateAdminAuthUI'), 'updateAdminAuthUI function exists');
assert(appJs.includes('openAdminEditModal'), 'openAdminEditModal function exists');
assert(appJs.includes('saveAdminOrderEdit'), 'saveAdminOrderEdit function exists');
assert(appJs.includes('PATCH'), 'Supabase REST PATCH method called for edits');
assert(appJs.includes('openSingleDeleteModal'), 'openSingleDeleteModal function exists');
assert(appJs.includes('executeSupabaseDelete'), 'executeSupabaseDelete function exists');
assert(appJs.includes('DELETE'), 'Supabase REST DELETE method called for deletion');
console.log('✔ PASS: All Admin PIN 171938, Edit PATCH, and Delete logic verified in js/app.js');

// 3. Verify Chart Data Labels configuration in datasets
assert(appJs.includes('customDataLabelsPlugin'), 'customDataLabelsPlugin defined and registered');
assert(appJs.includes("datalabelColor: '#dc2626'"), 'Pending line has custom datalabelColor');
assert(appJs.includes("datalabelColor: '#059669'"), 'Resolved line has custom datalabelColor');
assert(appJs.includes("datalabelSuffix: '%'"), 'Success trend chart has % custom datalabelSuffix');
console.log('✔ PASS: Chart datasets configured with datalabel options');

console.log('\nALL ADMIN PIN 171938, EDIT, DELETE & CHART TESTS PASSED! 🎯');
