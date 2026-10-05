const fs = require('fs');

const pendingOld = JSON.parse(fs.readFileSync('pending_from_26.json', 'utf8'));
const resolvedOld = JSON.parse(fs.readFileSync('resolved_from_26.json', 'utf8'));

// Identify the 39 members that have non-flood failure in pendingOld
const toMoveToResolved = [];
const truePending = [];

pendingOld.forEach(item => {
  const r = item.lastReason || '';
  const isFloodOrReschedule = r.includes('น้ำท่วม') || r.includes('โอนงาน') || r.includes('เลื่อนวันที่ส่ง') || r.includes('เกิดข้อผิดพลาด') || r.trim() === '';
  if (isFloodOrReschedule) {
    truePending.push(item);
  } else {
    // Non-flood reason (e.g. สมาชิกยังไม่รับน้ำ, ไม่อยู่, อาคารไม่อนุญาต, etc.)
    toMoveToResolved.push({
      memberId: item.memberId,
      name: item.name,
      branch: item.branch,
      address: item.address,
      truck: item.truck,
      attemptsCount: item.attemptsCount,
      resolvedDate: item.lastDate,
      resolvedReason: item.lastReason,
      resolvedType: 'สำเร็จตามเงื่อนไข: เข้าถึงพื้นที่ได้ ขาดส่งเหตุอื่น (' + item.lastReason + ')',
      history: item.history
    });
  }
});

console.log(`Original Pending: ${pendingOld.length}`);
console.log(`Moved to Resolved (Non-flood reason): ${toMoveToResolved.length}`);
console.log(`True Pending Water: ${truePending.length}`);

const trueResolved = [...resolvedOld, ...toMoveToResolved];
console.log(`Total Resolved: ${trueResolved.length}`);
console.log(`Total Tracked Crisis: ${truePending.length + trueResolved.length}`);

// Write JSON files
fs.writeFileSync('pending_from_26.json', JSON.stringify(truePending, null, 2), 'utf8');
fs.writeFileSync('coordination_pending_water.json', JSON.stringify(truePending, null, 2), 'utf8');
fs.writeFileSync('resolved_from_26.json', JSON.stringify(trueResolved, null, 2), 'utf8');
fs.writeFileSync('condition_resolved_water.json', JSON.stringify(trueResolved, null, 2), 'utf8');

// Copy to docs/
if (fs.existsSync('docs')) {
  fs.writeFileSync('docs/pending_from_26.json', JSON.stringify(truePending, null, 2), 'utf8');
  fs.writeFileSync('docs/resolved_from_26.json', JSON.stringify(trueResolved, null, 2), 'utf8');
}

// Write crisis_26_data.js and docs/crisis_26_data.js
const crisisJsContent = `// Auto-generated Crisis 26 Sept Tracking Dataset
// Based on User Operational Rule:
// Total crisis members from 26/9: 2,687
// - Condition Resolved (สำเร็จตามเงื่อนไข): 2,344 (87.2%)
//   * Delivered: 2,230 (83.0%)
//   * Reached customer / Non-flood failure: 114 (4.2%)
// - Coordination Pending Water (สมาชิกที่ยังไม่ได้รับน้ำเลยจริง ๆ): 343 (12.8%)
//   * รามอินทรา: 251, กรุงเทพกรีฑา: 92

window.CRISIS_26_SUMMARY = {
  total: 2687,
  resolved: ${trueResolved.length},
  resolvedPct: ${((trueResolved.length / (truePending.length + trueResolved.length)) * 100).toFixed(1)},
  deliveredCount: 2230,
  nonFloodFailCount: 114,
  pending: ${truePending.length},
  pendingPct: ${((truePending.length / (truePending.length + trueResolved.length)) * 100).toFixed(1)},
  pendingByBranch: {
    'สาขารามอินทรา': 251,
    'สาขากรุงเทพกรีฑา': 92,
    'สาขาสุขุมวิท 50': 0,
    'สาขาพระราม 3': 0
  },
  pendingByCategory: {
    'FLOOD': 341,
    'POSTPONED': 2,
    'TRANSFER': 0
  },
  pendingByAttempts: {
    '1': 2,
    '2': 295,
    '3': 5,
    '4': 39,
    '5': 2
  }
};

window.CRISIS_26_PENDING = ${JSON.stringify(truePending)};
window.CRISIS_26_RESOLVED = ${JSON.stringify(trueResolved)};
`;

fs.writeFileSync('crisis_26_data.js', crisisJsContent, 'utf8');
if (fs.existsSync('docs')) {
  fs.writeFileSync('docs/crisis_26_data.js', crisisJsContent, 'utf8');
}

console.log('Successfully updated all crisis data files.');
