const fs = require('fs');
const assert = require('assert');

console.log('=== TESTING SATURDAY 26 WATER & SATURDAY 3 FLOOD RULE ===\n');

const compiled = fs.readFileSync('Index.html', 'utf8');

// 1. Verify function extraction
const checkOrderFnMatch = compiled.match(/function checkOrderDeliveryStatus\([\s\S]*?\n    \}/);
const evalLifecycleFnMatch = compiled.match(/function evaluateMemberLifecycle\([\s\S]*?\n    \}/);
assert(checkOrderFnMatch && evalLifecycleFnMatch, 'Could not find functions in compiled HTML');

const checkOrder = new Function('item', checkOrderFnMatch[0] + '\nreturn checkOrderDeliveryStatus(item);');
const evalLifecycle = new Function('attempts', checkOrderFnMatch[0] + '\n' + evalLifecycleFnMatch[0] + '\nreturn evaluateMemberLifecycle(attempts);');

// Scenario: Member A received water on Saturday 26 Sept, but was flood on Saturday 3 Oct
const memberA = [
  {
    memberId: 'MEMBER_A',
    name: 'ลูกค้าเสาร์ 26 รับน้ำแล้ว แต่เสาร์ 3 น้ำท่วม',
    date: '2026-09-26 10:00:00',
    reason: 'ลูกค้าอยู่บ้าน (พบลูกค้า)',
    status: 'จัดส่งสำเร็จแล้ว',
    changedWater: 1,
    branch: 'สาขารามอินทรา',
    truck: '13101'
  },
  {
    memberId: 'MEMBER_A',
    name: 'ลูกค้าเสาร์ 26 รับน้ำแล้ว แต่เสาร์ 3 น้ำท่วม',
    date: '2026-10-03 11:30:00',
    reason: 'ไม่สามารถเข้าส่งได้ น้ำท่วมสูงในพื้นที่',
    status: 'รอน้ำลด',
    changedWater: 0,
    branch: 'สาขารามอินทรา',
    truck: '13101'
  }
];

// Scenario: Member B never received water (blocked by flood on both 26 Sept and 3 Oct)
const memberB = [
  {
    memberId: 'MEMBER_B',
    name: 'ลูกค้าติดน้ำท่วมตลอด ยังไม่เคยได้รับน้ำเลย',
    date: '2026-09-26 10:00:00',
    reason: 'ไม่สามารถเข้าส่งได้ น้ำท่วมสูงในพื้นที่',
    status: 'รอน้ำลด',
    changedWater: 0,
    branch: 'สาขารามอินทรา',
    truck: '13102'
  },
  {
    memberId: 'MEMBER_B',
    name: 'ลูกค้าติดน้ำท่วมตลอด ยังไม่เคยได้รับน้ำเลย',
    date: '2026-10-03 11:30:00',
    reason: 'ไม่สามารถเข้าส่งได้ น้ำท่วมสูงในพื้นที่',
    status: 'รอน้ำลด',
    changedWater: 0,
    branch: 'สาขารามอินทรา',
    truck: '13102'
  }
];

// 1. Test Lifecycle Evaluation
console.log('[1. Testing Member Lifecycle Evaluation]');
const evalA = evalLifecycle(memberA);
console.log('  Member A Lifecycle:', { isAccessible: evalA.isAccessible, isPending: evalA.isPending, isPendingFlood: evalA.isPendingFlood });
assert.strictEqual(evalA.isAccessible, true, 'Member A must be accessible because they received water on 26 Sept');
assert.strictEqual(evalA.isPending, false, 'Member A must NOT be pending');
assert.strictEqual(evalA.isPendingFlood, false, 'Member A must NOT be pending flood');

const evalB = evalLifecycle(memberB);
console.log('  Member B Lifecycle:', { isAccessible: evalB.isAccessible, isPending: evalB.isPending, isPendingFlood: evalB.isPendingFlood });
assert.strictEqual(evalB.isAccessible, false, 'Member B must NOT be accessible because they never received water');
assert.strictEqual(evalB.isPending, true, 'Member B must be pending');
assert.strictEqual(evalB.isPendingFlood, true, 'Member B must be pending flood');
console.log('  ✔ PASS: Lifecycle evaluation correctly identifies water received vs true pending flood');

// 2. Test Filtering Logic (Cut out rule)
console.log('\n[2. Testing Filtering Logic (Cut Out from Pending/Fail Filters)]');

function testFilterMatch(item, memStatus, statusVal) {
  const itemStatus = checkOrder(item);
  if (statusVal === 'ALL') return true;
  if (statusVal === 'SUCCESS') return memStatus.isAccessible;
  if (statusVal === 'AUTO_JOB30') return memStatus.isAuto;
  if (statusVal === 'FAIL') {
    if (memStatus.isAccessible || !memStatus.isPending) return false;
    return true;
  }
  if (statusVal === 'FAIL_FLOOD' || statusVal === 'FLOOD') {
    if (memStatus.isAccessible || (!memStatus.isPendingFlood && !itemStatus.isFlood)) return false;
    return true;
  }
  if (statusVal === 'FAIL_TRANSFER' || statusVal === 'PENDING_TRANSFER') {
    if (memStatus.isAccessible || !memStatus.isPendingTransfer) return false;
    return true;
  }
  return false;
}

// Check Member A's failed attempt on 3 Oct
const itemA_Oct3 = memberA[1];
assert.strictEqual(testFilterMatch(itemA_Oct3, evalA, 'FAIL_FLOOD'), false, 'Member A attempt on 3 Oct MUST be cut out from FAIL_FLOOD');
assert.strictEqual(testFilterMatch(itemA_Oct3, evalA, 'FAIL'), false, 'Member A attempt on 3 Oct MUST be cut out from FAIL');
assert.strictEqual(testFilterMatch(itemA_Oct3, evalA, 'SUCCESS'), true, 'Member A attempt on 3 Oct MUST be counted in SUCCESS');
console.log('  ✔ PASS: Member A is cut out completely from FAIL_FLOOD & FAIL, and included in SUCCESS');

// Check Member B's failed attempt on 3 Oct
const itemB_Oct3 = memberB[1];
assert.strictEqual(testFilterMatch(itemB_Oct3, evalB, 'FAIL_FLOOD'), true, 'Member B attempt on 3 Oct MUST be in FAIL_FLOOD');
assert.strictEqual(testFilterMatch(itemB_Oct3, evalB, 'FAIL'), true, 'Member B attempt on 3 Oct MUST be in FAIL');
assert.strictEqual(testFilterMatch(itemB_Oct3, evalB, 'SUCCESS'), false, 'Member B attempt on 3 Oct MUST NOT be in SUCCESS');
console.log('  ✔ PASS: Member B (never received water) remains in FAIL_FLOOD & FAIL');

// 3. Test Member Aggregation when filtering by date = 3 Oct
console.log('\n[3. Testing Member Aggregation when Date is Filtered to 3 Oct]');
const globalStatusMap = new Map();
globalStatusMap.set('MEMBER_A', evalA);
globalStatusMap.set('MEMBER_B', evalB);

// Simulate items on 3 Oct only
const itemsOnOct3 = [memberA[1], memberB[1]];

const memberMapOct3 = new Map();
itemsOnOct3.forEach(item => {
  const mId = item.memberId;
  if (!memberMapOct3.has(mId)) {
    memberMapOct3.set(mId, { memberId: mId, attempts: [] });
  }
  memberMapOct3.get(mId).attempts.push(item);
});

let totalCount = memberMapOct3.size;
let accessibleCount = 0;
let pendingCount = 0;
let floodCount = 0;

memberMapOct3.forEach((m, mId) => {
  const evalRes = globalStatusMap.get(mId) || evalLifecycle(m.attempts);
  if (evalRes.isAccessible) {
    accessibleCount++;
  } else {
    pendingCount++;
    if (evalRes.isPendingFlood) floodCount++;
  }
});

console.log('  Oct 3 Stats:', { totalCount, accessibleCount, pendingCount, floodCount });
assert.strictEqual(totalCount, 2, 'Total members on Oct 3 must be 2');
assert.strictEqual(accessibleCount, 1, 'Only Member A received water (counted as 1)');
assert.strictEqual(pendingCount, 1, 'Only Member B is pending (not received water)');
assert.strictEqual(floodCount, 1, 'Only Member B is flood pending');
console.log('  ✔ PASS: Member Aggregation accurately reports 1 member received water and 1 member truly pending flood on Oct 3');

console.log('\n============================================================');
console.log('ALL SATURDAY 26 WATER & SATURDAY 3 FLOOD TESTS PASSED (100%)');
console.log('============================================================\n');
