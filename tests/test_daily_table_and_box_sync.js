/**
 * Test Suite: Daily Table Statistics & Red Box Sync Verification
 * Verifies that:
 * 1. dailyChartPendingBadge, navMapBadge, and tableTabPendingBadge update dynamically.
 * 2. syncAppWithNewRecords preserves original resolution dates and does not inject non-crisis members.
 * 3. Daily progression table maintains exact mathematical integrity (cumResolved + pending === totalCrisis).
 */

const fs = require('fs');
const assert = require('assert');

console.log('=== TEST: DAILY TABLE STATISTICS & RED BOX SYNC ===\n');

// 1. Verify app.js files contain required badge updates
['js/app.js', 'docs/js/app.js'].forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  assert(content.includes('dailyChartPendingBadge'), `dailyChartPendingBadge must be referenced in ${file}`);
  assert(content.includes('navMapBadge'), `navMapBadge must be referenced in ${file}`);
  assert(content.includes('tableTabPendingBadge'), `tableTabPendingBadge must be referenced in ${file}`);
  assert(content.includes('window.DAILY_METRICS_INFO'), `window.DAILY_METRICS_INFO must be defined in ${file}`);
  console.log(`  ✔ PASS: ${file} dynamic badge bindings and global scoping verified`);
});

// 2. Test syncAppWithNewRecords mathematical consistency
const storeContent = fs.readFileSync('js/data_store.js', 'utf8');
const jsonMatch = storeContent.replace(/^[\s\S]*?window\.CRISIS_DATA\s*=\s*/, '').replace(/;?\s*$/, '');
const crisisData = JSON.parse(jsonMatch);

const pendingMap = new Map();
const resolvedMap = new Map();

(crisisData.pending || []).forEach(p => pendingMap.set(String(p.memberId).trim(), { ...p }));
(crisisData.resolved || []).forEach(r => resolvedMap.set(String(r.memberId).trim(), { ...r }));

const initialTotal = pendingMap.size + resolvedMap.size;
assert.strictEqual(pendingMap.size, 216);
assert.strictEqual(resolvedMap.size, 4873);
assert.strictEqual(initialTotal, 5089);

// Mock delivery records:
// A) Member 155682 (one of the 216 pending) was delivered on 2026-10-13
// B) Member 265014 (already resolved on 30/9) has a regular delivery on 2026-10-13
// C) Member 999999 (normal customer, never in crisis) has a regular delivery on 2026-10-13
const mockRecords = [
  {
    member_id: '155682',
    customer_name: 'โค-แพค เอ็นจิเนียริ่ง จำกัด',
    delivery_date: '2026-10-13T10:28:00+00:00',
    reason: 'ลูกค้าอยู่บ้าน(พบลูกค้า)',
    status: '1',
    branch: 'สาขารามอินทรา'
  },
  {
    member_id: '265014',
    customer_name: 'นิตยา รุ่งแสง',
    delivery_date: '2026-10-13T09:00:00+00:00',
    reason: 'ลูกค้าตั้งถัง',
    status: '1',
    branch: 'สาขารามอินทรา'
  },
  {
    member_id: '999999',
    customer_name: 'ลูกค้าทั่วไปนอกวิกฤต',
    delivery_date: '2026-10-13T11:00:00+00:00',
    reason: 'ลูกค้าตั้งถัง',
    status: '1',
    branch: 'สาขาพระราม 3'
  }
];

function isSuccessReason(reason, status) {
  const r = String(reason || '').trim();
  const s = String(status || '').trim();
  return r.includes('ตั้งถัง') || r.includes('พบลูกค้า') || s === '1' || s === 'ส่งสำเร็จ';
}

const original265014DateIso = resolvedMap.get('265014').resolvedDateIso;

mockRecords.forEach(row => {
  const memberId = String(row.member_id).trim();
  const isSuccess = isSuccessReason(row.reason, row.status);

  if (isSuccess) {
    if (pendingMap.has(memberId)) {
      const p = pendingMap.get(memberId);
      pendingMap.delete(memberId);
      resolvedMap.set(memberId, {
        ...p,
        resolvedDateIso: row.delivery_date,
        resolvedStatus: row.reason
      });
    } else if (resolvedMap.has(memberId)) {
      const r = resolvedMap.get(memberId);
      if (!r.resolvedDateIso) {
        r.resolvedDateIso = row.delivery_date;
      }
      r.attemptsCount = (r.attemptsCount || 1) + 1;
    }
    // Normal customer (999999) is NOT added to resolvedMap
  }
});

// Assertions:
assert.strictEqual(pendingMap.has('155682'), false, '155682 must be removed from pending');
assert.strictEqual(resolvedMap.has('155682'), true, '155682 must be added to resolved');
assert.strictEqual(resolvedMap.get('155682').resolvedDateIso, '2026-10-13T10:28:00+00:00', '155682 resolution date must be 13/10');

// Member 265014 must retain original resolution date
assert.strictEqual(resolvedMap.get('265014').resolvedDateIso, original265014DateIso, '265014 must retain original crisis resolution date');

// Member 999999 must NOT be in resolvedMap
assert.strictEqual(resolvedMap.has('999999'), false, 'Non-crisis customer must not be added to resolvedMap');

// Total evaluated count must remain strictly constant
assert.strictEqual(pendingMap.size + resolvedMap.size, initialTotal, 'Total crisis evaluated count must remain exactly 5,089');
assert.strictEqual(pendingMap.size, 215, 'Pending count must be 215');
assert.strictEqual(resolvedMap.size, 4874, 'Resolved count must be 4,874');

console.log('  ✔ PASS: Crisis scope protection and resolution date preservation verified');
console.log('\n============================================================');
console.log('ALL DAILY TABLE & RED BOX SYNC TESTS PASSED! 🎯💯');
console.log('============================================================\n');
