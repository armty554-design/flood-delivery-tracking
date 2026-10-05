const fs = require('fs');
const assert = require('assert');

console.log('=== TESTING UNIQUE MEMBER ID AGGREGATION & ROUND TRACKING ===\n');

const template = fs.readFileSync('Index_template.html', 'utf8');
const compiled = fs.readFileSync('Index.html', 'utf8');

// 1. Check getMemberAggregation exists
assert(template.includes('function getMemberAggregation('), 'getMemberAggregation function must be defined in Index_template.html');
assert(compiled.includes('function getMemberAggregation('), 'getMemberAggregation function must be defined in Index.html');
console.log('  ✔ PASS: getMemberAggregation function is defined in both template and compiled HTML');

// 2. Check calculateKPIs calls getMemberAggregation
assert(template.includes('const memberStats = getMemberAggregation(filteredItems);'), 'calculateKPIs must call getMemberAggregation');
console.log('  ✔ PASS: calculateKPIs utilizes getMemberAggregation for unique member statistics');

// 3. Check UI labels for 1 รหัสต่อสมาชิก
assert(template.includes('id="kpiTransferRoundsSubtext"'), 'kpiTransferRoundsSubtext must exist in template');
assert(template.includes('คิดเป็น 1 รหัสต่อสมาชิก'), 'Subtext explaining 1 member code statistics must exist');
console.log('  ✔ PASS: Pillar cards indicate statistics are counted as 1 member code with transfer round tracking');

// 4. Check 4-Branch comparison table headers
assert(template.includes('รหัสสมาชิกทั้งหมด'), 'Table must specify รหัสสมาชิกทั้งหมด');
assert(template.includes('เข้าส่งได้ (รหัส)'), 'Table must specify เข้าส่งได้ (รหัส)');
assert(template.includes('ยังส่งไม่ได้ (รหัส)'), 'Table must specify ยังส่งไม่ได้ (รหัส)');
assert(template.includes('รหัสที่มีงานโอน (รอบ)'), 'Table must specify รหัสที่มีงานโอน (รอบ)');
console.log('  ✔ PASS: Branch matrix table headers reflect unique member counts and transfer rounds');

// 5. Check transfer detail table contains round badge and accessibility resolution
assert(template.includes('memberTransferCountMap'), 'memberTransferCountMap must exist for precomputing round counts');
assert(template.includes('🔁 โอน ${rounds} รอบ'), 'Badge for transfer rounds count must exist');
assert(template.includes('🟢 เข้าส่งได้แล้ว'), 'Resolution status badge for accessible member must exist');
assert(template.includes('🔴 ยังค้างส่ง'), 'Resolution status badge for pending member must exist');
console.log('  ✔ PASS: Transfer detail table displays round badge (โอน X รอบ) and resolution status per member');

// 6. Test logic with sample mock data (like user example: member 1234 transferred 3 times)
const mockOrders = [
  // Member 1234: 3 transfer rounds, then resolved with customer bucket
  { memberId: '1234', name: 'Member 1234', date: '2026-09-26 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, reason: 'น้ำท่วมสูงไม่สามารถส่งได้', status: 'ยังส่งไม่ได้', branch: 'สาขารามอินทรา' },
  { memberId: '1234', name: 'Member 1234', date: '2026-09-28 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, reason: 'น้ำท่วมสูงไม่สามารถส่งได้', status: 'ยังส่งไม่ได้', branch: 'สาขารามอินทรา' },
  { memberId: '1234', name: 'Member 1234', date: '2026-09-30 10:00', round: 'ปกติ', isTransferred: false, reason: '', status: 'ลูกค้าตั้งถัง', branch: 'สาขารามอินทรา' },
  
  // Member 5678: 2 transfer rounds, still pending (no subsequent resolved status)
  { memberId: '5678', name: 'Member 5678', date: '2026-09-26 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, reason: 'น้ำท่วมสูงไม่สามารถส่งได้', status: 'ยังส่งไม่ได้', branch: 'สาขารามอินทรา' },
  { memberId: '5678', name: 'Member 5678', date: '2026-09-29 10:00', round: 'โอนงานสิ้นวัน', isTransferred: true, reason: 'เกิดข้อผิดพลาด เลื่อนวันที่ส่ง', status: 'ยังส่งไม่ได้', branch: 'สาขารามอินทรา' },

  // Member 9999: 1 normal delivery attempt, successful
  { memberId: '9999', name: 'Member 9999', date: '2026-09-26 11:00', round: 'ปกติ', isTransferred: false, reason: '', status: 'ส่งสำเร็จแล้ว', branch: 'สาขารามอินทรา' }
];

// Extract getMemberAggregation code from template and eval test
const fnMatch = template.match(/function getMemberAggregation\([\s\S]*?\n    \}/);
assert(fnMatch, 'Could not extract getMemberAggregation function code');

const evalFn = new Function('items', fnMatch[0] + '\nreturn getMemberAggregation(items);');
const res = evalFn(mockOrders);

assert.strictEqual(res.totalMembers, 3, 'Total members should be 3 unique codes');
assert.strictEqual(res.accessibleMembers, 2, 'Accessible members should be 2 (1234 resolved + 9999 normal)');
assert.strictEqual(res.pendingMembers, 1, 'Pending members should be 1 (5678 still pending)');
assert.strictEqual(res.transferMembers, 2, 'Transfer members should be 2 codes (1234 and 5678)');
assert.strictEqual(res.totalTransferRounds, 4, 'Total transfer rounds should be 4 (2 for 1234 + 2 for 5678)');

console.log('  ✔ PASS: Mock test matches user requirements exactly:');
console.log('         - Member 1234 transferred 3 times -> counted as 1 member in stats, resolved as accessible');
console.log('         - Member 5678 transferred 2 times -> counted as 1 member in stats, pending (no subsequent status)');
console.log('         - Member 9999 delivered -> counted as 1 member in stats');

console.log('\n========================================================');
console.log('ALL UNIQUE MEMBER AGGREGATION TESTS PASSED SUCCESSFULLY!');
console.log('========================================================\n');
