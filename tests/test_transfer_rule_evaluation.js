const fs = require('fs');
const assert = require('assert');

console.log('=== TESTING END-OF-DAY TRANSFER STATUS EVALUATION RULE ===\n');

const template = fs.readFileSync('Index_template.html', 'utf8');
const compiled = fs.readFileSync('Index.html', 'utf8');

// Extract checkOrderDeliveryStatus, evaluateMemberLifecycle, getMemberAggregation
const checkOrderFnMatch = template.match(/function checkOrderDeliveryStatus\([\s\S]*?\n    \}/);
const evalLifecycleFnMatch = template.match(/function evaluateMemberLifecycle\([\s\S]*?\n    \}/);
const getAggFnMatch = template.match(/function getMemberAggregation\([\s\S]*?\n    \}/);

assert(checkOrderFnMatch && evalLifecycleFnMatch && getAggFnMatch, 'Could not extract required functions');

const evalLifecycle = new Function('attempts', checkOrderFnMatch[0] + '\n' + evalLifecycleFnMatch[0] + '\nreturn evaluateMemberLifecycle(attempts);');
const getMemberAggregation = new Function('items', checkOrderFnMatch[0] + '\n' + evalLifecycleFnMatch[0] + '\n' + getAggFnMatch[0] + '\nreturn getMemberAggregation(items);');

// Scenario 1: Member with 1 transfer attempt only -> Pending Transfer
const res1 = evalLifecycle([
  { memberId: 'M1', date: '2026-09-26 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, reason: 'เกิดข้อผิดพลาด เลื่อนวันที่ส่ง', status: 'ยังส่งไม่ได้' }
]);
assert.strictEqual(res1.isSuccess, false, 'Scenario 1: Single transfer attempt should remain not success');
assert.strictEqual(res1.isPendingTransfer, true, 'Scenario 1: Single transfer attempt should be pending transfer');
assert.strictEqual(res1.hadTransfer, true, 'Scenario 1: hadTransfer must be true');
assert.strictEqual(res1.totalTransferRounds, 1, 'Scenario 1: totalTransferRounds must be 1');
console.log('  ✔ PASS Scenario 1: Member with 1 transfer attempt remains pending transfer');

// Scenario 2: Member with 2 transfer attempts only -> Pending Transfer, 2 rounds
const res2 = evalLifecycle([
  { memberId: 'M2', date: '2026-09-26 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, reason: '', status: 'ยังส่งไม่ได้' },
  { memberId: 'M2', date: '2026-09-27 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, reason: '', status: 'ยังส่งไม่ได้' }
]);
assert.strictEqual(res2.isSuccess, false, 'Scenario 2: Double transfer attempts should remain not success');
assert.strictEqual(res2.isPendingTransfer, true, 'Scenario 2: Double transfer should be pending transfer');
assert.strictEqual(res2.totalTransferRounds, 2, 'Scenario 2: totalTransferRounds must be 2');
console.log('  ✔ PASS Scenario 2: Member with 2 transfer attempts remains pending transfer (2 rounds)');

// Scenario 3: Member with transfer + flood attempt only -> Neither resolved, not success
const res3 = evalLifecycle([
  { memberId: 'M3', date: '2026-09-26 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, reason: '', status: 'ยังส่งไม่ได้' },
  { memberId: 'M3', date: '2026-09-27 10:00', round: 'ปกติ', isTransferred: false, reason: 'น้ำท่วมสูงไม่สามารถเข้าส่งได้', status: 'ยังส่งไม่ได้' }
]);
assert.strictEqual(res3.isSuccess, false, 'Scenario 3: Transfer + Flood attempts should remain not success');
console.log('  ✔ PASS Scenario 3: Transfer + Flood without delivery attempt remains not success');

// Scenario 4: Member with transfer + added delivery attempt (e.g. ไม่รับน้ำ / ปกติ) -> SUCCESS!
const res4 = evalLifecycle([
  { memberId: 'M4', date: '2026-09-26 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, reason: 'เกิดข้อผิดพลาด เลื่อนวันที่ส่ง', status: 'ยังส่งไม่ได้' },
  { memberId: 'M4', date: '2026-09-27 10:00', round: 'ปกติ', isTransferred: false, reason: 'ไม่รับน้ำ (บริษัทปิด)', status: 'ยังส่งไม่ได้' }
]);
assert.strictEqual(res4.isSuccess, true, 'Scenario 4: Transfer + added delivery attempt must resolve to success');
assert.strictEqual(res4.isAccessible, true, 'Scenario 4: isAccessible must be true');
assert.strictEqual(res4.accessType, 'TRANSFER_RESOLVED_DELIVERY', 'Scenario 4: accessType must be TRANSFER_RESOLVED_DELIVERY');
assert.strictEqual(res4.isPendingTransfer, false, 'Scenario 4: isPendingTransfer must be false');
console.log('  ✔ PASS Scenario 4: Member with transfer + added non-transfer non-flood delivery resolves to SUCCESS');

// Scenario 5: Member with delivery attempt first + transfer attempt second -> SUCCESS!
const res5 = evalLifecycle([
  { memberId: 'M5', date: '2026-09-26 10:00', round: 'ปกติ', isTransferred: false, reason: 'เกิดข้อผิดพลาด เลื่อนวันที่ส่ง', status: 'ยังส่งไม่ได้' },
  { memberId: 'M5', date: '2026-09-27 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, reason: '', status: 'ยังส่งไม่ได้' }
]);
assert.strictEqual(res5.isSuccess, true, 'Scenario 5: Delivery attempt + transfer attempt must resolve to success');
assert.strictEqual(res5.accessType, 'TRANSFER_RESOLVED_DELIVERY', 'Scenario 5: accessType must be TRANSFER_RESOLVED_DELIVERY');
console.log('  ✔ PASS Scenario 5: Delivery attempt + transfer attempt resolves to SUCCESS regardless of date order');

// Scenario 6: Member with 2 transfers + 1 successful delivered attempt -> SUCCESS!
const res6 = evalLifecycle([
  { memberId: 'M6', date: '2026-09-26 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, status: 'ยังส่งไม่ได้' },
  { memberId: 'M6', date: '2026-09-27 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, status: 'ยังส่งไม่ได้' },
  { memberId: 'M6', date: '2026-09-28 10:00', round: 'ปกติ', isTransferred: false, status: 'ลูกค้าตั้งถัง' }
]);
assert.strictEqual(res6.isSuccess, true, 'Scenario 6: 2 transfers + 1 delivery must resolve to success');
assert.strictEqual(res6.totalTransferRounds, 2, 'Scenario 6: totalTransferRounds must be 2');
console.log('  ✔ PASS Scenario 6: 2 transfers + 1 delivered attempt resolves to SUCCESS with 2 rounds tracked');

// Scenario 7: Test full aggregation with getMemberAggregation
const aggTest = getMemberAggregation([
  // M1: 1 transfer (pending)
  { memberId: 'M1', date: '2026-09-26 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, status: 'ยังส่งไม่ได้' },
  // M4: 1 transfer + 1 delivery (resolved success)
  { memberId: 'M4', date: '2026-09-26 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, status: 'ยังส่งไม่ได้' },
  { memberId: 'M4', date: '2026-09-27 10:00', round: 'ปกติ', isTransferred: false, reason: 'ไม่รับน้ำ', status: 'ยังส่งไม่ได้' },
  // M_NORM: 1 normal delivery (success)
  { memberId: 'M_NORM', date: '2026-09-26 10:00', round: 'ปกติ', isTransferred: false, status: 'ส่งสำเร็จแล้ว' }
]);

assert.strictEqual(aggTest.totalMembers, 3, 'Total members should be 3 unique codes');
assert.strictEqual(aggTest.accessibleMembers, 2, 'Accessible members should be 2 (M4 resolved + M_NORM)');
assert.strictEqual(aggTest.pendingMembers, 1, 'Pending members should be 1 (M1 pending)');
assert.strictEqual(aggTest.transferMembers, 1, 'Transfer members should be 1 (M1; M4 resolved is deducted)');
assert.strictEqual(aggTest.resolvedTransferMembers, 1, 'Resolved transfer members should be 1 (M4)');
assert.strictEqual(aggTest.totalTransferHistoryMembers, 2, 'Total transfer history should be 2 (M1 and M4)');

console.log('  ✔ PASS Scenario 7: getMemberAggregation correctly counts resolved transfer as accessible and deducts from transfer count');

console.log('\n========================================================');
console.log('ALL TRANSFER EVALUATION RULE TESTS PASSED (100% SUCCESS)');
console.log('========================================================\n');
