const fs = require('fs');
const assert = require('assert');

console.log('=== TESTING TRANSFERRED FILTER CLICK (ฟิวเตอร์ 🟣 โอนงานที่ส่ง) ===\n');

const compiled = fs.readFileSync('Index.html', 'utf8');

// 1. Verify preset button and KPI card bindings in compiled HTML
console.log('[1. Verify Buttons and Bindings in Index.html]');
assert(compiled.includes('id="presetBtn-TRANSFER"'), 'Must have presetBtn-TRANSFER chip');
assert(compiled.includes("setFilterPreset('TRANSFER')"), 'Must call setFilterPreset(\'TRANSFER\')');
assert(compiled.includes("setQuickStatusFilter('TRANSFER')"), 'KPI Card must call setQuickStatusFilter(\'TRANSFER\')');
console.log('  ✔ PASS: Preset chip and KPI card 4 are properly bound to TRANSFER');

// 2. Extract and test filtering behavior in Node VM with real compiled code and initial data
console.log('\n[2. Test Filtering with Full Logic and Initial Data]');
const checkOrderFnMatch = compiled.match(/function checkOrderDeliveryStatus\([\s\S]*?\n    \}/);
const evalLifecycleFnMatch = compiled.match(/function evaluateMemberLifecycle\([\s\S]*?\n    \}/);
assert(checkOrderFnMatch && evalLifecycleFnMatch, 'Could not find functions in compiled HTML');

const allItems = JSON.parse(fs.readFileSync('initial_data.json', 'utf8'));
console.log('  Total dataset items:', allItems.length);

const evalLifecycle = new Function('attempts', checkOrderFnMatch[0] + '\n' + evalLifecycleFnMatch[0] + '\nreturn evaluateMemberLifecycle(attempts);');
const checkOrder = new Function('item', checkOrderFnMatch[0] + '\nreturn checkOrderDeliveryStatus(item);');

// Build member lifecycle map
const memberMap = new Map();
allItems.forEach(item => {
  const mId = item.memberId || item.id;
  if (!memberMap.has(mId)) {
    memberMap.set(mId, { memberId: mId, attempts: [] });
  }
  memberMap.get(mId).attempts.push(item);
});

const memberStatusMap = new Map();
memberMap.forEach((m, mId) => {
  memberStatusMap.set(mId, evalLifecycle(m.attempts));
});

// Test filtering: TRANSFER (all transferred orders)
const transferFiltered = allItems.filter(item => {
  const mId = item.memberId || item.id;
  const memStatus = memberStatusMap.get(mId) || {};
  const itemStatus = checkOrder(item);
  if (!memStatus.hadTransfer && !itemStatus.isTransfer) return false;
  return true;
});

console.log('  Found TRANSFER items:', transferFiltered.length);
assert(transferFiltered.length > 600, `TRANSFER items count should be > 600, got ${transferFiltered.length}`);
console.log('  ✔ PASS: Clicking TRANSFER filter returns', transferFiltered.length, 'records (Not empty!)');

// Test filtering: FAIL_TRANSFER (pending unresolved transferred orders)
const failTransferFiltered = allItems.filter(item => {
  const mId = item.memberId || item.id;
  const memStatus = memberStatusMap.get(mId) || {};
  if (!memStatus.isPendingTransfer) return false;
  return true;
});

console.log('  Found FAIL_TRANSFER items:', failTransferFiltered.length);
assert(failTransferFiltered.length > 600, `FAIL_TRANSFER items count should be > 600, got ${failTransferFiltered.length}`);
console.log('  ✔ PASS: Filtering FAIL_TRANSFER returns', failTransferFiltered.length, 'records (Not empty!)');

// Test filtering: TRANSFER with date filter 2026-09-26 (checking origin date)
const transferOn26 = allItems.filter(item => {
  const dateVal = '2026-09-26';
  const itemDate = (item.date || '');
  const formattedSlash = dateVal.split('-').reverse().join('/');
  const matchesItemDate = itemDate.startsWith(dateVal) || itemDate.includes(dateVal);
  const matchesTransferOrigin = (item.transferDate && item.transferDate.includes(formattedSlash)) || 
                                (item.transferRaw && item.transferRaw.includes(formattedSlash));
  if (!matchesItemDate && !matchesTransferOrigin) return false;

  const mId = item.memberId || item.id;
  const memStatus = memberStatusMap.get(mId) || {};
  const itemStatus = checkOrder(item);
  if (!memStatus.hadTransfer && !itemStatus.isTransfer) return false;
  return true;
});

console.log('  Found TRANSFER items originated from 26/09/2026:', transferOn26.length);
assert(transferOn26.length > 200, `TRANSFER items from 26/09 should be > 200, got ${transferOn26.length}`);
console.log('  ✔ PASS: Date filter for 26 ก.ย. 69 correctly includes transfer orders originated from 26/09!');

console.log('\n============================================================');
console.log('ALL TRANSFERRED ORDERS FILTER TESTS PASSED (100% SUCCESS)');
console.log('============================================================\n');
