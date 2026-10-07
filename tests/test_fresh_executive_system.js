/**
 * Comprehensive Automated Verification for Fresh Executive 6-Pages Web Application
 */

const fs = require('fs');
const path = require('path');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✔ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    failedTests++;
  }
}

console.log('=== VERIFYING FRESH EXECUTIVE 6-PAGES WEB APPLICATION ===\n');

// 1. Files existence check
console.log('[1. Core Architecture & File Structure]');
assert(fs.existsSync('index.html'), 'index.html exists at root');
assert(fs.existsSync('Index.html'), 'Index.html exists for case-sensitivity');
assert(fs.existsSync('docs/index.html'), 'docs/index.html exists for GitHub Pages');
assert(fs.existsSync('css/app.css'), 'css/app.css exists');
assert(fs.existsSync('js/app.js'), 'js/app.js exists');
assert(fs.existsSync('js/data_store.js'), 'js/data_store.js exists');
assert(fs.existsSync('data/pending_343.json'), 'data/pending_343.json exists');
assert(fs.existsSync('data/resolved_2344.json'), 'data/resolved_2344.json exists');

// 2. Index.html content validation
console.log('\n[2. Header Branding & Realtime Badges]');
const html = fs.readFileSync('index.html', 'utf-8');

assert(html.includes('เข้าอัปเดตทุกวัน • วันที่ 7 ต.ค. 2569'), 'Daily update badge is prominent in header');
assert(html.includes('Supabase Cloud: เชื่อมต่อสด'), 'Supabase Realtime Cloud badge exists');
assert(html.includes('WATER INTELLIGENCE'), 'Executive title and branding present');

// 3. Exactly 6 Primary Pages
console.log('\n[3. Strict 6 Primary Pages Navigation]');
const pages = [
  { id: 'page-duration', title: 'หน้า 1: กราฟติดตาม ระยะเวลาในการส่ง ทั้ง 4 สาขา' },
  { id: 'page-pending-map', title: 'หน้า 2: แผนที่โชว์จุดสมาชิกที่ยังจัดส่งไม่ได้' },
  { id: 'page-cctv', title: 'หน้า 3: CCtv' },
  { id: 'page-gistda-flood', title: 'หน้า 4: แผนที่น้ำท่วม GISTDA Open API' },
  { id: 'page-details', title: 'หน้า 5: รายละเอียดข้อมูล' },
  { id: 'page-admin', title: 'หน้า 6: จัดการข้อมูล Admin' }
];

pages.forEach(p => {
  assert(html.includes(p.id), `Page container #${p.id} exists in HTML`);
  assert(html.includes(p.title), `Navigation tab title "${p.title}" exists in header`);
});

// 4. Page 1 Content Verification
console.log('\n[4. Page 1: กราฟติดตาม ระยะเวลาในการส่ง ทั้ง 4 สาขา & กราฟเปรียบเทียบวัน]');
assert(html.includes('35') && html.includes('สาขาพระราม 3'), 'Rama 3 duration metric (35 min) present');
assert(html.includes('42') && html.includes('สาขาสุขุมวิท 50'), 'Sukhumvit 50 duration metric (42 min) present');
assert(html.includes('54') && html.includes('สาขากรุงเทพกรีฑา'), 'Krungthep Kreetha duration metric (54 min) present');
assert(html.includes('68') && html.includes('สาขารามอินทรา'), 'Ram Intra duration metric (68 min) present');
assert(html.includes('id="chartDailyComparison"'), 'Day-by-Day comparison chart canvas #chartDailyComparison exists');
assert(html.includes('id="chartBranchCompare"'), 'Comparison bar chart canvas #chartBranchCompare exists');
assert(html.includes('id="chartDurationTrend"'), 'Duration trend chart canvas #chartDurationTrend exists');
assert(html.includes('น้ำท่วมสูงไม่สามารถส่งได้'), 'Logic mentions "น้ำท่วมสูงไม่สามารถส่งได้"');
assert(html.includes('โอนงานสิ้นวัน'), 'Logic mentions "โอนงานสิ้นวัน"');
assert(html.includes('28/9 - 3/10'), 'Logic mentions round 28/9 - 3/10');
assert(html.includes('สถานะการประสานงาน'), 'Logic clarifies "สถานะการประสานงาน"');
assert(html.includes('ตารางเปรียบเทียบความคืบหน้ารายวัน'), 'Daily resolution breakdown table present');
assert(html.includes('ไทม์ไลน์บันทึกการเข้าอัปเดตทุกวัน'), 'Daily operations timeline present');

// 5. Page 2 Content Verification
console.log('\n[5. Page 2: หน้าแผนที่โชว์จุดของสมาชิกที่ยังจัดส่งไม่ได้]');
assert(html.includes('id="pendingMapContainer"'), 'Leaflet map container #pendingMapContainer exists');
assert(html.includes('343 ราย'), '343 pending members mentioned in banner');
assert(html.includes('zoomToLocation'), 'Choke point quick zoom buttons exist');
assert(html.includes('filterMapPins'), 'Map pin filter buttons exist');

// 6. Page 3 Content Verification
console.log('\n[6. Page 3: CCtv]');
assert(html.includes('id="cctvPortalIframe"'), 'Live CCTV player iframe exists');
assert(html.includes('TrafficVision CCTV Hub (1,800+ จุด)'), 'TrafficVision 1,800+ cameras switcher exists');
assert(html.includes('BMA Traffic'), 'BMA Traffic switcher exists');
assert(html.includes('14 กล้องเฉพาะประจำ 4 สาขา'), '14 dedicated camera grid exists');

// 7. Page 4 Content Verification
console.log('\n[7. Page 4: แผนที่น้ำท่วม ดึงจาก GISTDA Open API]');
const gistdaUrl = 'https://disaster.gistda.or.th/services/open-api#%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5%E0%B8%9E%E0%B8%B7%E0%B9%89%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%97%E0%B9%88%E0%B8%A7%E0%B8%A1-get_features_flood_1day';
assert(html.includes(gistdaUrl), 'Exact GISTDA Open API documentation URL is linked');
assert(html.includes('GET /features/flood/1day'), 'GISTDA endpoint GET /features/flood/1day specified');
assert(html.includes('btnFetchGistda'), 'Interactive GISTDA API fetch trigger exists');
assert(html.includes('12 สถานีโทรมาตรตรวจวัดระดับน้ำ'), '12 canal water gauge stations present');

// 8. Page 5 Content Verification
console.log('\n[8. Page 5: รายละเอียดข้อมูล]');
assert(html.includes('26 ก.ย. ถึงปัจจุบัน'), '26 Sept to Present date rule highlighted');
assert(html.includes('ต้องติดตาม (343 ราย)'), 'Fast tab for 343 pending members exists');
assert(html.includes('สำเร็จตามเงื่อนไข (2,344 ราย)'), 'Fast tab for 2,344 resolved members exists');
assert(html.includes('id="detailsTableBody"'), 'Details table body #detailsTableBody exists');
assert(html.includes('id="memberHistoryModal"'), 'Member history timeline modal exists');

// 9. Page 6 Content Verification
console.log('\n[9. Page 6: จัดการข้อมูล Admin]');
assert(html.includes('aggfmnyrfxmuwpjbynom'), 'Supabase project aggfmnyrfxmuwpjbynom configured');
assert(html.includes('delivery_orders'), 'Supabase table delivery_orders specified');
assert(html.includes('id="adminDropZone"'), 'File drop zone for Excel/CSV uploader exists');
assert(html.includes('ตารางวิเคราะห์งานโอนสิ้นวัน (Transfer Matrix)'), 'Transfer Matrix analytics present');

// 10. Data Integrity & GPS Verification
console.log('\n[10. Data Integrity & GPS Coordinates Verification]');
const pendingData = JSON.parse(fs.readFileSync('data/pending_343.json', 'utf-8'));
const resolvedData = JSON.parse(fs.readFileSync('data/resolved_2344.json', 'utf-8'));

assert(pendingData.length === 343, `Pending count is exactly 343 (actual: ${pendingData.length})`);
assert(resolvedData.length === 2344, `Resolved count is exactly 2,344 (actual: ${resolvedData.length})`);
assert(pendingData.length + resolvedData.length === 2687, 'Total crisis evaluated records equal 2,687');

const ramIntraCount = pendingData.filter(p => p.branch === 'สาขารามอินทรา').length;
const krungthepCount = pendingData.filter(p => p.branch === 'สาขากรุงเทพกรีฑา').length;
assert(ramIntraCount === 251, `Ram Intra pending count is exactly 251 (actual: ${ramIntraCount})`);
assert(krungthepCount === 92, `Krungthep Kreetha pending count is exactly 92 (actual: ${krungthepCount})`);

const validGpsCount = pendingData.filter(p => p.lat && p.lng && p.lat > 13 && p.lat < 15 && p.lng > 100 && p.lng < 102).length;
assert(validGpsCount === 343, `All 343 pending members have valid Bangkok GPS coordinates (actual: ${validGpsCount}/343)`);

// 11. HTML Syntax & Tag Balance
console.log('\n[11. HTML Syntax & Tag Validation]');
const openDivs = (html.match(/<div(\s|>)/gi) || []).length;
const closeDivs = (html.match(/<\/div>/gi) || []).length;
assert(openDivs === closeDivs, `Div tags are perfectly balanced (open: ${openDivs}, close: ${closeDivs})`);

const openSections = (html.match(/<section(\s|>)/gi) || []).length;
const closeSections = (html.match(/<\/section>/gi) || []).length;
assert(openSections === closeSections && openSections === 6, `Section tags equal 6 for the 6 pages (open: ${openSections}, close: ${closeSections})`);

console.log(`\n========================================================`);
console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed out of ${passedTests + failedTests} tests`);
console.log(`========================================================\n`);

if (failedTests > 0) process.exit(1);
