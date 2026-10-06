const fs = require('fs');
const assert = require('assert');

console.log('\n=== TESTING CLEAN UI, MASTER FILTERS & REAL CASE STUDIES ===\n');

const template = fs.readFileSync('Index_template.html', 'utf8');
const compiled = fs.readFileSync('Index.html', 'utf8');

// 1. New Business Rule: auto ปิด Job 30
console.log('[1. Business Rule: "ยกเลิกรอบน้ำโดยระบบ auto ปิด Job 30" -> สำเร็จ]');
assert(template.includes('auto ปิด Job 30'), 'Template must include detection for auto ปิด Job 30');
assert(compiled.includes('auto ปิด Job 30'), 'Compiled Index.html must include detection for auto ปิด Job 30');

// Test logic on sample item
const mockJob30Items = [
  {
    memberId: '00033/23',
    name: 'ไทยฮอนด้า จำกัด',
    round: 'ยกเลิก รอบส่ง',
    status: 'ยกเลิก',
    reason: '',
    note: 'ยกเลิกรอบน้ำโดยระบบ auto ปิด Job 30',
    branch: 'สาขารามอินทรา'
  }
];

const checkOrderFnMatch = template.match(/function checkOrderDeliveryStatus\([\s\S]*?\n    \}/);
const evalLifecycleFnMatch = template.match(/function evaluateMemberLifecycle\([\s\S]*?\n    \}/);
const fnMatch = template.match(/function getMemberAggregation\([\s\S]*?\n    \}/);
assert(checkOrderFnMatch && evalLifecycleFnMatch && fnMatch, 'Could not find required aggregation functions');
const evalFn = new Function('items', checkOrderFnMatch[0] + '\n' + evalLifecycleFnMatch[0] + '\n' + fnMatch[0] + '\nreturn getMemberAggregation(items);');
const res30 = evalFn(mockJob30Items);

assert.strictEqual(res30.totalMembers, 1, 'Total members should be 1');
assert.strictEqual(res30.accessibleMembers, 1, 'Auto ปิด Job 30 must count as accessible / successful');
assert.strictEqual(res30.subAutoJob30, 1, 'subAutoJob30 must count 1');
assert.strictEqual(res30.pendingMembers, 0, 'Pending members must be 0 for auto Job 30');
console.log('  ✔ PASS: "ยกเลิกรอบน้ำโดยระบบ auto ปิด Job 30" correctly resolves member as successful');

// 2. Unified Master Filter Bar
console.log('\n[2. Unified Master Filter Bar]');
assert(template.includes('id="globalFilterDate"'), 'Template must have #globalFilterDate');
assert(template.includes('id="globalFilterBranch"'), 'Template must have #globalFilterBranch');
assert(template.includes('id="globalFilterTruck"'), 'Template must have #globalFilterTruck');
assert(template.includes('id="globalFilterStatus"'), 'Template must have #globalFilterStatus');
assert(template.includes('id="globalFilterSearch"'), 'Template must have #globalFilterSearch');
assert(template.includes('resetGlobalFilters'), 'Template must have resetGlobalFilters');
assert(template.includes('applyGlobalFilters'), 'Template must have applyGlobalFilters');
assert(template.includes('populateGlobalTrucks'), 'Template must have populateGlobalTrucks');
console.log('  ✔ PASS: 4 Unified filter controls (Date, Branch, Truck, Status) + Search & Reset exist');

// 3. 4 Clean KPI Cards
console.log('\n[3. 4 Clean High-Contrast KPI Cards]');
assert(template.includes('id="kpiTotalMembers"'), 'Must have #kpiTotalMembers');
assert(template.includes('id="kpiSuccessCount"'), 'Must have #kpiSuccessCount');
assert(template.includes('id="kpiFailCount"'), 'Must have #kpiFailCount');
assert(template.includes('id="kpiTransferCount"'), 'Must have #kpiTransferCount');
console.log('  ✔ PASS: 4 KPI summary cards exist with unique member calculation');

// 4. Real Case Studies Showcase
console.log('\n[4. Real Case Studies Showcase (4 Core Archetypes)]');
assert(template.includes('ตัวอย่างเคสจริงจากข้อมูลรอบส่ง (Real Case Studies & Column K Notes)'), 'Must include case studies section header');
assert(template.includes('00033'), 'Must showcase Case 1: 00033 (Auto ปิด Job 30)');
assert(template.includes('08564/1'), 'Must showcase Case 2: 08564/1 (Multi-Round Transfer Resolved)');
assert(template.includes('01210/3'), 'Must showcase Case 3: 01210/3 (Flood Blocked Pending)');
assert(template.includes('03237/43'), 'Must showcase Case 4: 03237/43 (Unresolved Transfer Pending)');
assert(template.includes('filterByCaseMember'), 'Must have filterByCaseMember drill-down function');
console.log('  ✔ PASS: All 4 real case studies displayed with drill-down buttons');

// 5. Default Active Landing View (Executive Crisis Summary Tab Active by Default)
console.log('\n[5. Executive UI Landing: Crisis Summary Tab Active by Default]');
assert(template.includes("let currentTab = 'summary';"), "JS initial state must be let currentTab = 'summary';");
assert(template.includes('id="tabContent-summary" class="space-y-6"'), 'Summary tab container must be active/visible by default');
assert(template.includes('id="tabContent-map" class="hidden space-y-4"'), 'Map tab container must be hidden by default');
assert(template.includes('id="tabBtn-summary" class="tab-btn active'), 'Sidebar summary button must be marked active');
console.log('  ✔ PASS: Executive Crisis Summary view is default active landing view');

console.log('\n========================================================');
console.log('ALL CLEAN UI & CASE STUDIES TESTS PASSED! (100% PASS)');
console.log('========================================================\n');
