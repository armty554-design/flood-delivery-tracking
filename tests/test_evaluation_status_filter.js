const fs = require('fs');
const assert = require('assert');

console.log('=== TESTING EVALUATION STATUS FILTER (ฟิวเตอร์ สถานะประเมิน) ===\n');

const template = fs.readFileSync('Index_template.html', 'utf8');
const compiled = fs.readFileSync('Index.html', 'utf8');

// 1. Verify DOM Elements in both Template and Compiled Index.html
console.log('[1. DOM Filter Elements Verification]');
assert(template.includes('id="globalFilterStatus"'), 'Must contain globalFilterStatus in template');
assert(compiled.includes('id="globalFilterStatus"'), 'Must contain globalFilterStatus in compiled HTML');

assert(template.includes('id="filterStatus"'), 'Must contain filterStatus in table toolbar');
assert(compiled.includes('id="filterStatus"'), 'Must contain filterStatus in table toolbar in compiled HTML');

// 2. Verify Evaluation Status Options in both Dropdowns
console.log('[2. Verify Evaluation Status Options]');
const expectedOptions = [
  'ALL',
  'SUCCESS',
  'AUTO_JOB30',
  'FAIL_FLOOD',
  'FAIL_TRANSFER',
  'FAIL',
  'RESOLVED_TRANSFER'
];

expectedOptions.forEach(opt => {
  assert(template.includes(`value="${opt}"`), `Template must have option value="${opt}"`);
  assert(compiled.includes(`value="${opt}"`), `Compiled HTML must have option value="${opt}"`);
});
console.log('  ✔ PASS: All 7 key evaluation status options exist in filter dropdowns');

// 3. Verify Preset Chips for Quick Filtering
console.log('\n[3. Quick Filter Preset Chips]');
assert(template.includes("setFilterPreset('SUCCESS')"), 'Must have SUCCESS preset chip');
assert(template.includes("setFilterPreset('FAIL_FLOOD')"), 'Must have FAIL_FLOOD preset chip');
assert(template.includes("setFilterPreset('FAIL_TRANSFER')"), 'Must have FAIL_TRANSFER preset chip');
assert(template.includes("setFilterPreset('AUTO_JOB30')"), 'Must have AUTO_JOB30 preset chip');
assert(template.includes("setFilterPreset('RESOLVED_TRANSFER')"), 'Must have RESOLVED_TRANSFER preset chip');
console.log('  ✔ PASS: Quick evaluation status chips exist for 1-click filtering');

// 4. Test Filtering Logic on Distinct Delivery Archetypes
console.log('\n[4. Simulation of Evaluation Status Filtering Logic]');
const checkOrderFnMatch = template.match(/function checkOrderDeliveryStatus\([\s\S]*?\n    \}/);
const evalLifecycleFnMatch = template.match(/function evaluateMemberLifecycle\([\s\S]*?\n    \}/);
assert(checkOrderFnMatch && evalLifecycleFnMatch, 'Could not find required evaluation functions');

const evalLifecycle = new Function('attempts', checkOrderFnMatch[0] + '\n' + evalLifecycleFnMatch[0] + '\nreturn evaluateMemberLifecycle(attempts);');
const checkOrder = new Function('item', checkOrderFnMatch[0] + '\nreturn checkOrderDeliveryStatus(item);');

// Mock items
const member22911 = [
  { memberId: '22911', name: 'บจก.ไท้ ซิง อิมปอร์ต', reason: 'ไม่รับน้ำ ไม่พบถังเปล่า เพื่อเปลี่ยนน้ำ', status: 'ยังส่งไม่ได้' }
];

const memberFlood = [
  { memberId: 'FLOOD_1', name: 'ลูกค้าติดน้ำท่วม', reason: 'ไม่สามารถเข้าส่งได้ น้ำท่วมสูงในพื้นที่', status: 'ยังส่งไม่ได้' }
];

const memberTransferPending = [
  { memberId: 'TRANS_1', name: 'ลูกค้าโอนค้าง', round: 'โอนงานสิ้นวัน', isTransferred: true, reason: '', status: 'ยังส่งไม่ได้' }
];

const memberTransferResolved = [
  { memberId: 'TRANS_2', name: 'ลูกค้าโอนแล้วสำเร็จ', round: 'โอนงานสิ้นวัน', isTransferred: true, date: '2026-09-26 10:00' },
  { memberId: 'TRANS_2', name: 'ลูกค้าโอนแล้วสำเร็จ', round: 'ปกติ', reason: 'ไม่รับน้ำ (บริษัทปิด)', date: '2026-09-27 10:00' }
];

const memberAutoJob30 = [
  { memberId: 'AUTO_1', name: 'ไทยฮอนด้า', note: 'ยกเลิกรอบน้ำโดยระบบ auto ปิด Job 30' }
];

function testMatches(items, statusFilter) {
  const memEval = evalLifecycle(items);
  const itemStatus = checkOrder(items[items.length - 1]);

  if (statusFilter === 'ALL') return true;
  if (statusFilter === 'SUCCESS') return memEval.isAccessible;
  if (statusFilter === 'AUTO_JOB30') return memEval.isAuto;
  if (statusFilter === 'FAIL') return memEval.isPending;
  if (statusFilter === 'FAIL_FLOOD' || statusFilter === 'FLOOD') return memEval.isPendingFlood || itemStatus.isFlood;
  if (statusFilter === 'FAIL_TRANSFER' || statusFilter === 'PENDING_TRANSFER') return memEval.isPendingTransfer;
  if (statusFilter === 'RESOLVED_TRANSFER') return memEval.hadTransfer && memEval.isAccessible;
  if (statusFilter === 'TRANSFER') return memEval.hadTransfer || itemStatus.isTransfer;
  return false;
}

// Test Member 22911 (ไม่รับน้ำ -> สำเร็จ)
assert.strictEqual(testMatches(member22911, 'SUCCESS'), true, 'Member 22911 must match SUCCESS');
assert.strictEqual(testMatches(member22911, 'FAIL'), false, 'Member 22911 must NOT match FAIL');
assert.strictEqual(testMatches(member22911, 'FAIL_FLOOD'), false, 'Member 22911 must NOT match FAIL_FLOOD');
assert.strictEqual(testMatches(member22911, 'FAIL_TRANSFER'), false, 'Member 22911 must NOT match FAIL_TRANSFER');
console.log('  ✔ PASS: Member 22911 (ไม่รับน้ำ ไม่พบถังเปล่า) matches SUCCESS and excludes from all unsuccess filters');

// Test Flood Pending
assert.strictEqual(testMatches(memberFlood, 'FAIL_FLOOD'), true, 'memberFlood must match FAIL_FLOOD');
assert.strictEqual(testMatches(memberFlood, 'FAIL'), true, 'memberFlood must match FAIL');
assert.strictEqual(testMatches(memberFlood, 'SUCCESS'), false, 'memberFlood must NOT match SUCCESS');
console.log('  ✔ PASS: Flood blocked member matches FAIL_FLOOD & FAIL');

// Test Transfer Pending
assert.strictEqual(testMatches(memberTransferPending, 'FAIL_TRANSFER'), true, 'memberTransferPending must match FAIL_TRANSFER');
assert.strictEqual(testMatches(memberTransferPending, 'FAIL'), true, 'memberTransferPending must match FAIL');
assert.strictEqual(testMatches(memberTransferPending, 'SUCCESS'), false, 'memberTransferPending must NOT match SUCCESS');
console.log('  ✔ PASS: Transfer pending member matches FAIL_TRANSFER & FAIL');

// Test Transfer Resolved
assert.strictEqual(testMatches(memberTransferResolved, 'RESOLVED_TRANSFER'), true, 'memberTransferResolved must match RESOLVED_TRANSFER');
assert.strictEqual(testMatches(memberTransferResolved, 'SUCCESS'), true, 'memberTransferResolved must match SUCCESS');
assert.strictEqual(testMatches(memberTransferResolved, 'FAIL_TRANSFER'), false, 'memberTransferResolved must NOT match FAIL_TRANSFER');
console.log('  ✔ PASS: Resolved transfer member matches RESOLVED_TRANSFER & SUCCESS (deducted from pending transfer)');

// Test Auto Job 30
assert.strictEqual(testMatches(memberAutoJob30, 'AUTO_JOB30'), true, 'memberAutoJob30 must match AUTO_JOB30');
assert.strictEqual(testMatches(memberAutoJob30, 'SUCCESS'), true, 'memberAutoJob30 must match SUCCESS');
assert.strictEqual(testMatches(memberAutoJob30, 'FAIL'), false, 'memberAutoJob30 must NOT match FAIL');
console.log('  ✔ PASS: Auto Job 30 member matches AUTO_JOB30 & SUCCESS');

console.log('\n========================================================');
console.log('ALL EVALUATION STATUS FILTER TESTS PASSED (100% SUCCESS)');
console.log('========================================================\n');
