const fs = require('fs');
const assert = require('assert');

console.log('=== TESTING CASE 270520: TRANSFER ON DAY 2 & DELIVERED ON DAY 3 ===\n');

const template = fs.readFileSync('Index_template.html', 'utf8');
const compiled = fs.readFileSync('Index.html', 'utf8');

// Extract functions
const parseDateFnMatch = template.match(/function parseDateForSort\([\s\S]*?\n    \}/);
const checkOrderFnMatch = template.match(/function checkOrderDeliveryStatus\([\s\S]*?\n    \}/);
const evalLifecycleFnMatch = template.match(/function evaluateMemberLifecycle\([\s\S]*?\n    \}/);
const getAggFnMatch = template.match(/function getMemberAggregation\([\s\S]*?\n    \}/);

assert(parseDateFnMatch, 'parseDateForSort must be defined');
assert(checkOrderFnMatch, 'checkOrderDeliveryStatus must be defined');
assert(evalLifecycleFnMatch, 'evaluateMemberLifecycle must be defined');
assert(getAggFnMatch, 'getMemberAggregation must be defined');

const fullHarnessCode = [
  parseDateFnMatch[0],
  checkOrderFnMatch[0],
  evalLifecycleFnMatch[0],
  getAggFnMatch[0]
].join('\n');

const parseDateForSort = new Function('dStr', parseDateFnMatch[0] + '\nreturn parseDateForSort(dStr);');
const checkOrderDeliveryStatus = new Function('order', fullHarnessCode + '\nreturn checkOrderDeliveryStatus(order);');
const evaluateMemberLifecycle = new Function('attempts', fullHarnessCode + '\nreturn evaluateMemberLifecycle(attempts);');
const getMemberAggregation = new Function('items', 'globalStatusMap', fullHarnessCode + '\n' +
  'if (typeof window === "undefined") global.window = {};\n' +
  'window.globalMemberStatusMap = globalStatusMap;\n' +
  'return getMemberAggregation(items);');

// [1. Test Date Sorting Helper]
console.log('[1. Testing Date Sorting]');
const t1 = parseDateForSort('29/9/2026, 13:23:00');
const t2 = parseDateForSort('2/10/2026, 0:00:00');
const t3 = parseDateForSort('3/10/2026, 0:00:00');
assert(t1 < t2, '29 Sept must be before 2 Oct');
assert(t2 < t3, '2 Oct must be before 3 Oct');
console.log('  ✔ PASS: Date parsing correctly orders 29 Sept < 2 Oct < 3 Oct');

// [2. Test Single Order Status Evaluation for 270520]
console.log('\n[2. Testing Single Order Status Evaluation]');
const day2Attempt = {
  memberId: '270520',
  name: 'ทีซีที อินเตอร์ฟู้ด จำกัด (สำนักงานใหญ่)',
  date: '2/10/2026, 0:00:00',
  round: 'โอนงานสิ้นวัน',
  isTransferred: true,
  reason: 'ไม่สามารถเข้าส่งได้ เกิดข้อผิดพลาด',
  status: 'ยังส่งไม่ได้',
  changedWater: 0,
  truck: '11308'
};

const day3Attempt = {
  memberId: '270520',
  name: 'ทีซีที อินเตอร์ฟู้ด จำกัด (สำนักงานใหญ่)',
  date: '3/10/2026, 10:15:00',
  round: 'ปกติ',
  reason: 'ลูกค้าอยู่บ้าน(พบลูกค้า)',
  status: 'เข้าส่งได้',
  changedWater: 1,
  truck: '11308'
};

const sDay2 = checkOrderDeliveryStatus(day2Attempt);
const sDay3 = checkOrderDeliveryStatus(day3Attempt);

assert.strictEqual(sDay2.isSuccess, false, 'Day 2 attempt with error should not be directly successful alone');
assert.strictEqual(sDay2.isTransfer, true, 'Day 2 attempt with error must be categorized as transfer/postponed');
assert.strictEqual(sDay3.isSuccess, true, 'Day 3 attempt with พบลูกค้า must be success');
console.log('  ✔ PASS: Day 2 is categorized as transfer/error, Day 3 is categorized as success');

// [3. Test Member Lifecycle Evaluation for 270520]
console.log('\n[3. Testing Member Lifecycle Resolution (โอนสถิติไปสำเร็จ)]');
const lifecycle = evaluateMemberLifecycle([day2Attempt, day3Attempt]);
console.log('  Lifecycle output:', {
  isAccessible: lifecycle.isAccessible,
  isSuccess: lifecycle.isSuccess,
  isPending: lifecycle.isPending,
  isPendingTransfer: lifecycle.isPendingTransfer,
  hadTransfer: lifecycle.hadTransfer,
  accessType: lifecycle.accessType
});

assert.strictEqual(lifecycle.isAccessible, true, 'Lifecycle must be accessible (สำเร็จ)');
assert.strictEqual(lifecycle.isSuccess, true, 'Lifecycle isSuccess must be true');
assert.strictEqual(lifecycle.isPending, false, 'Lifecycle isPending must be false (not pending)');
assert.strictEqual(lifecycle.isPendingTransfer, false, 'Lifecycle isPendingTransfer must be false');
assert.strictEqual(lifecycle.hadTransfer, true, 'Lifecycle hadTransfer must be true');
assert.strictEqual(lifecycle.accessType, 'TRANSFER_RESOLVED_DELIVERY', 'accessType must indicate resolved transfer');
console.log('  ✔ PASS: Lifecycle accurately resolves Day 2 transfer + Day 3 delivered to SUCCESS');

// [4. Test Statistics Aggregation (โอนสถิติไปสำเร็จของรหัสนี้)]
console.log('\n[4. Testing Statistics Aggregation]');
const allItems = [day2Attempt, day3Attempt];
const globalStatusMap = new Map();
globalStatusMap.set('270520', lifecycle);

// Overall View
const aggAll = getMemberAggregation(allItems, globalStatusMap);
assert.strictEqual(aggAll.totalMembers, 1, 'Total unique members must be 1');
assert.strictEqual(aggAll.accessibleMembers, 1, 'Must be counted in accessible members (สำเร็จ)');
assert.strictEqual(aggAll.pendingMembers, 0, 'Must NOT be counted in pending members');
assert.strictEqual(aggAll.transferMembers, 0, 'Must NOT be counted in pending transfer members');
assert.strictEqual(aggAll.resolvedTransferMembers, 1, 'Must be counted in resolved transfer members');
console.log('  ✔ PASS: Overall aggregation correctly counts 270520 as 1 unique SUCCESS member');

// Date Filter = Day 2 Only (เมื่อผู้ใช้กรองดูวันที่ 2 ต.ค.)
const aggDay2 = getMemberAggregation([day2Attempt], globalStatusMap);
assert.strictEqual(aggDay2.totalMembers, 1, 'Day 2 view: Total unique members must be 1');
assert.strictEqual(aggDay2.accessibleMembers, 1, 'Day 2 view: Must attribute 270520 to SUCCESS (โอนสถิติไปสำเร็จ)');
assert.strictEqual(aggDay2.pendingMembers, 0, 'Day 2 view: Must NOT be counted in pending members');
assert.strictEqual(aggDay2.transferMembers, 0, 'Day 2 view: Must NOT be counted in pending transfer');
assert.strictEqual(aggDay2.resolvedTransferMembers, 1, 'Day 2 view: Must be counted in resolved transfer');
console.log('  ✔ PASS: Viewing Day 2 transfers member 270520 to SUCCESS because Day 3 delivered');

// Date Filter = Day 3 Only (เมื่อผู้ใช้กรองดูวันที่ 3 ต.ค.)
const aggDay3 = getMemberAggregation([day3Attempt], globalStatusMap);
assert.strictEqual(aggDay3.totalMembers, 1, 'Day 3 view: Total unique members must be 1');
assert.strictEqual(aggDay3.accessibleMembers, 1, 'Day 3 view: Must be counted as SUCCESS');
assert.strictEqual(aggDay3.pendingMembers, 0, 'Day 3 view: Pending must be 0');
console.log('  ✔ PASS: Viewing Day 3 counts member 270520 as SUCCESS');

// [5. Verify Compiled Index.html Integrity]
console.log('\n[5. Testing Compiled Index.html Sync]');
assert(compiled.includes('parseDateForSort'), 'Index.html must contain parseDateForSort');
assert(compiled.includes('TRANSFER_RESOLVED_DELIVERY'), 'Index.html must contain TRANSFER_RESOLVED_DELIVERY');
console.log('  ✔ PASS: Index.html is compiled and in sync');

console.log('\n============================================================');
console.log('ALL CASE 270520 TRANSFER TO SUCCESS TESTS PASSED (100%)');
console.log('============================================================');
