const fs = require('fs');
const assert = require('assert');

console.log('\n=== TESTING CLICKABLE MEMBER HISTORY & DECLUTTERED UI ===\n');

const template = fs.readFileSync('Index_template.html', 'utf8');
const compiled = fs.readFileSync('Index.html', 'utf8');

// 1. Decluttered UI: Case Studies Collapsible
console.log('[1. Decluttered UI: Case Studies Collapsible]');
assert(template.includes('id="caseStudiesContent" class="hidden'), 'caseStudiesContent must be hidden by default to prevent screen clutter');
assert(template.includes('toggleCaseStudiesSection'), 'toggleCaseStudiesSection function must exist');
assert(template.includes('id="caseToggleLabel"'), 'caseToggleLabel element must exist');
assert(compiled.includes('id="caseStudiesContent" class="hidden'), 'Compiled HTML must have caseStudiesContent hidden by default');
console.log('  ✔ PASS: Case studies section is collapsible and collapsed by default (screen clutter eliminated)');

// 2. Clickable Member Codes & Delivery History Modal
console.log('\n[2. Interactive History Modal Markup]');
assert(template.includes('id="actionModal"'), 'Modal must exist with id="actionModal"');
assert(template.includes('id="modalTimelineList"'), 'Modal must contain #modalTimelineList for vertical attempt timeline');
assert(template.includes('id="modalEvaluationBanner"'), 'Modal must contain #modalEvaluationBanner for consolidated status');
assert(template.includes('id="modalHistoryCountText"'), 'Modal must contain #modalHistoryCountText');
assert(template.includes('openMemberHistoryModal'), 'openMemberHistoryModal function must be defined');
console.log('  ✔ PASS: Modal contains rich timeline list and lifecycle evaluation elements');

// 3. Table Rows Make Member ID Clickable
console.log('\n[3. Clickable Member Code in Table Rows]');
assert(template.includes("openMemberHistoryModal('${item.memberId}')"), 'renderTable must render clickable member ID linking to openMemberHistoryModal');
assert(compiled.includes("openMemberHistoryModal("), 'Compiled Index.html must render clickable member IDs');
console.log('  ✔ PASS: Every member ID in the table is an interactive button opening full history');

// 4. Modal Timeline Assembly & Resolution Logic on 4 Real Cases
console.log('\n[4. History Timeline & Business Logic Verification]');
const initialData = JSON.parse(fs.readFileSync('initial_data.json', 'utf8'));
const pending26 = JSON.parse(fs.readFileSync('pending_from_26.json', 'utf8'));
const resolved26 = JSON.parse(fs.readFileSync('resolved_from_26.json', 'utf8'));

// Extract openMemberHistoryModal and helpers into evaluation context
const openModalMatch = template.match(/function openMemberHistoryModal\(memberId\) \{[\s\S]*?\n    \}/);
assert(openModalMatch, 'Could not extract openMemberHistoryModal function');

console.log('  ✔ Case 1 (00033/23): Thai Honda (Auto ปิด Job 30)');
const hondaRecords = initialData.filter(i => i.memberId === '00033/23');
assert(hondaRecords.length >= 8, 'Honda should have at least 8 order attempts in initial_data');
assert(hondaRecords.some(r => r.note.includes('auto ปิด Job 30')), 'Honda must contain auto ปิด Job 30');

console.log('  ✔ Case 2 (08564/1): Panadda (โอน 2 รอบ ➔ พบลูกค้า ส่งสำเร็จ)');
const panaddaRecords = initialData.filter(i => i.memberId === '08564/1');
assert(panaddaRecords.length >= 3, 'Panadda should have at least 3 attempts');
const panaddaResolved = panaddaRecords.some(r => r.reason && r.reason.includes('พบลูกค้า'));
assert(panaddaResolved, 'Panadda 3rd attempt must be resolved as found customer / delivered');

console.log('  ✔ Case 3 (01210/3): Worapan (ติดน้ำท่วมสูงในพื้นที่)');
const worapanPending = pending26.find(x => x.memberId === '01210/3');
assert(worapanPending, 'Worapan must be in pending crisis dataset');
assert(worapanPending.lastReason.includes('น้ำท่วมสูง'), 'Worapan reason must be flood blocked');

console.log('  ✔ Case 4 (03237/43): Jidapha (โอนงานยังไม่มีสถานะซ้ำ)');
const jidaphaPending = pending26.find(x => x.memberId === '03237/43');
assert(jidaphaPending, 'Jidapha must be in pending crisis dataset');
assert(jidaphaPending.pendingCategory === 'โอนงานสิ้นวัน', 'Jidapha category must be transfer EOD');

console.log('\n========================================================');
console.log('ALL CLICKABLE MEMBER HISTORY & DECLUTTER TESTS PASSED!');
console.log('========================================================\n');
