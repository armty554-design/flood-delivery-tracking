const fs = require('fs');
const assert = require('assert');

console.log('=== TESTING USER OPERATIONAL EXCEL UPLOAD FORMAT ===\n');

const template = fs.readFileSync('Index_template.html', 'utf8');

// 1. Verify SheetJS script tag is included in HTML head
assert(template.includes('xlsx.full.min.js'), 'Index_template.html must include SheetJS library');
console.log('  ✔ PASS: SheetJS library included for native Excel (.xlsx/.xls) support');

// 2. Extract processParsedMatrix function from template
const matrixFnMatch = template.match(/function processParsedMatrix\([\s\S]*?\n    \}/);
assert(matrixFnMatch, 'processParsedMatrix must be defined');

let capturedRows = [];
function processParsedUploadRows(rows) {
  capturedRows = rows;
}
function showUploadAlert(type, msg) {}

const evalFn = new Function('matrix', 'processParsedUploadRows', 'showUploadAlert', matrixFnMatch[0] + '\nreturn processParsedMatrix(matrix);');

// Test Case 1: Matrix with exact Thai headers from user screenshot
const testMatrixWithHeaders = [
  ['รหัสสมาชิก', 'ชื่อลูกค้า', 'วันเวลาที่ส่งน้ำ', 'สถานะ', 'รอบ', 'เหตุขาดส่ง', 'สายรถ', 'เปลี่ยนน้ำ', 'หมายเหตุ', 'พิกัด', 'กลุ่มลูกค้า', 'เขต', 'สาขา'],
  ['00033/23', 'ไทยฮอนด้า แมนูแฟคเจอริ่ง', '2026-09-26 09:00:00', 'เข้าส่งได้', '1', 'ลูกค้าตั้งถัง', '13106', '1', 'auto ปิด Job 30', '13.7845, 100.7321', 'B2B', 'ลาดกระบัง', 'สาขารามอินทรา'],
  ['08564/1', 'คุณปนัดดา มีสุข', '2026-09-26 10:30:00', 'เข้าส่งได้', '1', 'พบลูกค้า', '12102', '1', 'ส่งมอบเรียบร้อย', '13.7451, 100.6723', 'B2C', 'สะพานสูง', 'สาขากรุงเทพกรีฑา'],
  ['01210/3', 'คุณวรพรรณ รัตนวิชัย', '2026-09-26 11:15:00', 'ยังส่งไม่ได้', '1', 'น้ำท่วมสูงในพื้นที่', '11105', '1', 'น้ำท่วมสูง 40 ซม.', '13.7021, 100.5982', 'B2C', 'คลองเตย', 'สาขาสุขุมวิท 50'],
  ['03237/43', 'คุณจิดาภา อักษรสาร', '2026-09-26 13:00:00', 'โอนงานสิ้นวัน', 'โอนงานสิ้นวัน', 'เกิดข้อผิดพลาด เลื่อนวันที่ส่ง', '14101', '1', 'ผู้ทำรายการ: admin_bcp', '13.6892, 100.5281', 'B2C', 'ยานนาวา', 'สาขาพระราม 3']
];

evalFn(testMatrixWithHeaders, processParsedUploadRows, showUploadAlert);

assert.strictEqual(capturedRows.length, 4, 'Should parse 4 rows');
const row0 = capturedRows[0];
assert.strictEqual(row0.member_id, '00033/23');
assert.strictEqual(row0.customer_name, 'ไทยฮอนด้า แมนูแฟคเจอริ่ง');
assert.strictEqual(row0.delivery_date, '2026-09-26 09:00:00');
assert.strictEqual(row0.status, 'เข้าส่งได้');
assert.strictEqual(row0.reason, 'ลูกค้าตั้งถัง');
assert.strictEqual(row0.truck_number, '13106');
assert.strictEqual(row0.change_bottle, '1');
assert.strictEqual(row0.note, 'auto ปิด Job 30');
assert.strictEqual(row0.gps, '13.7845, 100.7321');
assert.strictEqual(row0.customer_type, 'B2B');
assert.strictEqual(row0.district, 'ลาดกระบัง');
assert.strictEqual(row0.branch, 'สาขารามอินทรา');
console.log('  ✔ PASS: Thai headers from operational Excel parsed and mapped correctly to all 13 columns');

// Test Case 2: Matrix without headers (positional fallback detecting date in col 2)
const testMatrixNoHeaders = [
  ['00184/1', 'บริษัท ซีพี ออลล์ จำกัด', '2026-09-26 14:00:00', 'เข้าส่งได้', '1', 'พบลูกค้า', '13106', '10', 'ส่งครบ', '13.75, 100.71', 'B2B', 'ลาดกระบัง', 'สาขารามอินทรา']
];
evalFn(testMatrixNoHeaders, processParsedUploadRows, showUploadAlert);
assert.strictEqual(capturedRows.length, 1);
assert.strictEqual(capturedRows[0].member_id, '00184/1');
assert.strictEqual(capturedRows[0].customer_name, 'บริษัท ซีพี ออลล์ จำกัด');
assert.strictEqual(capturedRows[0].delivery_date, '2026-09-26 14:00:00');
assert.strictEqual(capturedRows[0].branch, 'สาขารามอินทรา');
assert.strictEqual(capturedRows[0].truck_number, '13106');
console.log('  ✔ PASS: Positional fallback correctly detected operational format by date in column 2');

// 3. Check sample template file existence & headers
const sampleCsv = fs.readFileSync('sample_delivery_orders_template.csv', 'utf8');
assert(sampleCsv.includes('รหัสสมาชิก,ชื่อลูกค้า,วันเวลาที่ส่งน้ำ,สถานะ,รอบ,เหตุขาดส่ง,สายรถ,เปลี่ยนน้ำ,หมายเหตุ,พิกัด,กลุ่มลูกค้า,เขต,สาขา'), 'Sample template must match operational Excel columns');
console.log('  ✔ PASS: sample_delivery_orders_template.csv matches operational Excel columns');

console.log('\n========================================================');
console.log('ALL USER EXCEL UPLOAD FORMAT TESTS PASSED! (100% SUCCESS)');
console.log('========================================================\n');
