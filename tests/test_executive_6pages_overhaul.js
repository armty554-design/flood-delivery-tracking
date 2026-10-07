/**
 * tests/test_executive_6pages_overhaul.js
 * Comprehensive automated verification for Executive 6-Pages Architecture:
 * 1. หน้า 1: กราฟติดตามระยะเวลาในการส่ง ทั้ง 4 สาขา (Delivery Duration Tracking across 4 Branches)
 * 2. หน้า 2: หน้าแผนที่โชว์จุดของสมาชิกที่ยังจัดส่งไม่ได้ (Pending Members Geolocation Map - 343 Pins)
 * 3. หน้า 3: CCtv (Live CCTV Surveillance Portal - 1,800+ LIVE feeds)
 * 4. หน้า 4: แผนที่น้ำท่วม ดึงจาก GISTDA Open API (1-Day Flood Area Surveillance)
 * 5. หน้า 5: รายละเอียดข้อมูล (Member Delivery Data Details & 26 Sept Rule)
 * 6. หน้า 6: จัดการข้อมูล Admin (Admin Operations & Master Data Control)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TESTING EXECUTIVE 6-PAGES ARCHITECTURE & OPERATIONAL RULES ===\n');

const templatePath = path.join(__dirname, '..', 'Index_template.html');
const indexPath = path.join(__dirname, '..', 'Index.html');
const docsPath = path.join(__dirname, '..', 'docs', 'index.html');

assert(fs.existsSync(templatePath), 'Index_template.html must exist');
assert(fs.existsSync(indexPath), 'Index.html must exist');
assert(fs.existsSync(docsPath), 'docs/index.html must exist');

const templateHtml = fs.readFileSync(templatePath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const docsHtml = fs.readFileSync(docsPath, 'utf8');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✔ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.log(`  ✖ FAIL: ${desc}`);
    console.log(`    Error: ${err.message}`);
    failed++;
  }
}

// ----------------------------------------------------------------------------
// 1. Navigation Architecture (Desktop Sidebar, Top Header, Mobile Navigation)
// ----------------------------------------------------------------------------
console.log('[1. Navigation Architecture - 6 Primary Pages]');

it('Desktop Sidebar lists all 6 primary pages in correct sequence', () => {
  assert.ok(templateHtml.includes('id="tabBtn-summary"'), 'Must have tabBtn-summary (Page 1)');
  assert.ok(templateHtml.includes('id="tabBtn-map"'), 'Must have tabBtn-map (Page 2)');
  assert.ok(templateHtml.includes('id="tabBtn-cctv"'), 'Must have tabBtn-cctv (Page 3)');
  assert.ok(templateHtml.includes('id="tabBtn-water"'), 'Must have tabBtn-water (Page 4)');
  assert.ok(templateHtml.includes('id="tabBtn-table"'), 'Must have tabBtn-table (Page 5)');
  assert.ok(templateHtml.includes('id="tabBtn-transfers"'), 'Must have tabBtn-transfers (Page 6)');
});

it('Top Header Segmented Pills include all 6 primary pages', () => {
  assert.ok(templateHtml.includes('id="headerTab-summary"'), 'Header has headerTab-summary');
  assert.ok(templateHtml.includes('id="headerTab-map"'), 'Header has headerTab-map');
  assert.ok(templateHtml.includes('id="headerTab-cctv"'), 'Header has headerTab-cctv');
  assert.ok(templateHtml.includes('id="headerTab-water"'), 'Header has headerTab-water');
  assert.ok(templateHtml.includes('id="headerTab-table"'), 'Header has headerTab-table');
  assert.ok(templateHtml.includes('id="headerTab-transfers"'), 'Header has headerTab-transfers');
});

it('Daily tracking badge exists for executive oversight', () => {
  assert.ok(templateHtml.includes('เข้าอัปเดตทุกวัน'), 'Must contain daily active updates badge');
  assert.ok(templateHtml.includes('7 ต.ค. 2569'), 'Must contain current operating date 7 ต.ค. 2569');
});

// ----------------------------------------------------------------------------
// 2. Page 1: Delivery Duration Tracking Across 4 Branches (tabContent-summary)
// ----------------------------------------------------------------------------
console.log('\n[2. Page 1: กราฟติดตาม ระยะเวลาในการส่ง ทั้ง 4 สาขา]');

it('Page 1 has executive banner for Delivery Duration Tracking across 4 branches', () => {
  assert.ok(templateHtml.includes('หน้า 1 • กราฟติดตามระยะเวลาในการส่ง ทั้ง 4 สาขา'), 'Banner must mention Page 1 4-Branch Duration');
  assert.ok(templateHtml.includes('id="tabContent-summary"'), 'Must have tabContent-summary container');
});

it('Page 1 contains 4-branch delivery duration KPI metrics', () => {
  assert.ok(templateHtml.includes('สาขาพระราม 3') && templateHtml.includes('35') && templateHtml.includes('นาที/จุด'), 'Rama 3 duration metric verified (35m)');
  assert.ok(templateHtml.includes('สาขาสุขุมวิท 50') && templateHtml.includes('42') && templateHtml.includes('นาที/จุด'), 'Sukhumvit 50 duration metric verified (42m)');
  assert.ok(templateHtml.includes('สาขากรุงเทพกรีฑา') && templateHtml.includes('54') && templateHtml.includes('นาที/จุด'), 'Krungthep Kreetha duration metric verified (54m)');
  assert.ok(templateHtml.includes('สาขารามอินทรา') && templateHtml.includes('68') && templateHtml.includes('นาที/จุด'), 'Ram Intra duration metric verified (68m)');
});

it('Page 1 embeds grouped bar comparison chart canvas #chartBranchCompare', () => {
  assert.ok(templateHtml.includes('id="chartBranchCompare"'), 'Must contain #chartBranchCompare canvas in Tab 1');
  assert.ok(indexHtml.includes('id="chartBranchCompare"'), 'Index.html must contain #chartBranchCompare');
});

it('Page 1 retains 4-branch pivot table and 3 pillars', () => {
  assert.ok(templateHtml.includes('id="summaryBranchTableBody"'), 'Must have summaryBranchTableBody');
  assert.ok(templateHtml.includes('id="sumCardSuccessCount"'), 'Must have sumCardSuccessCount');
  assert.ok(templateHtml.includes('id="sumCardFailCount"'), 'Must have sumCardFailCount');
  assert.ok(templateHtml.includes('id="sumCardTransferCount"'), 'Must have sumCardTransferCount');
});

// ----------------------------------------------------------------------------
// 3. Page 2: Map of Pending Members (tabContent-map)
// ----------------------------------------------------------------------------
console.log('\n[3. Page 2: หน้าแผนที่โชว์จุดของสมาชิกที่ยังจัดส่งไม่ได้ (343 ราย)]');

it('Page 2 has dedicated executive banner for 343 pending members', () => {
  assert.ok(templateHtml.includes('หน้า 2 • แผนที่โชว์จุดของสมาชิกที่ยังจัดส่งไม่ได้ (343 จุดวิกฤต)'), 'Page 2 banner verified');
  assert.ok(templateHtml.includes('id="tabContent-map"'), 'Must have tabContent-map container');
});

it('Page 2 contains map pin filter controls and Leaflet map container', () => {
  assert.ok(templateHtml.includes('id="map"'), 'Must have Leaflet map container');
  assert.ok(templateHtml.includes('id="mapPinFilterGroup"'), 'Must have map pin filter group');
  assert.ok(templateHtml.includes('setMapPinFilter(\'FAIL\')'), 'Must have quick filter button for pending pins');
});

// ----------------------------------------------------------------------------
// 4. Page 3: Live CCTV Surveillance Portal (tabContent-cctv)
// ----------------------------------------------------------------------------
console.log('\n[4. Page 3: CCtv]');

it('Page 3 has dedicated CCTV surveillance banner and portal frame', () => {
  assert.ok(templateHtml.includes('หน้า 3 • กล้องสด CCTV ตรวจการณ์จราจรและระดับน้ำ 4 สาขา'), 'Page 3 CCTV banner verified');
  assert.ok(templateHtml.includes('id="tabContent-cctv"'), 'Must have tabContent-cctv container');
  assert.ok(templateHtml.includes('id="dedicatedCctvPortalFrame"'), 'Must have dedicated CCTV iframe');
  assert.ok(templateHtml.includes('id="dedicatedPortalSelect"'), 'Must have portal select dropdown');
});

// ----------------------------------------------------------------------------
// 5. Page 4: GISTDA Open API Flood Map (tabContent-water)
// ----------------------------------------------------------------------------
console.log('\n[5. Page 4: แผนที่น้ำท่วม ดึงจาก GISTDA Open API]');

it('Page 4 integrates GISTDA Open API with exact official documentation link', () => {
  const gistdaDocUrl = 'https://disaster.gistda.or.th/services/open-api#%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5%E0%B8%9E%E0%B8%B7%E0%B9%89%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%97%E0%B9%88%E0%B8%A7%E0%B8%A1-get_features_flood_1day';
  assert.ok(templateHtml.includes(gistdaDocUrl), 'Must include exact GISTDA Open API documentation URL');
  assert.ok(indexHtml.includes(gistdaDocUrl), 'Index.html must include exact GISTDA Open API documentation URL');
  assert.ok(docsHtml.includes(gistdaDocUrl), 'docs/index.html must include exact GISTDA Open API documentation URL');
});

it('Page 4 contains GISTDA API metadata and live fetch triggers', () => {
  assert.ok(templateHtml.includes('GET /features/flood/1day'), 'Must show GISTDA endpoint GET /features/flood/1day');
  assert.ok(templateHtml.includes('Sentinel-1 SAR / Radarsat-2'), 'Must mention SAR satellite sensors');
  assert.ok(templateHtml.includes('fetchGistdaFloodData(true)'), 'Must call fetchGistdaFloodData');
  assert.ok(templateHtml.includes('function fetchGistdaFloodData'), 'JS must define fetchGistdaFloodData');
  assert.ok(templateHtml.includes('id="waterStationsContainer"'), 'Must retain canal water telemetry stations');
});

// ----------------------------------------------------------------------------
// 6. Page 5: Delivery Data Details & 26 Sept Rule (tabContent-table)
// ----------------------------------------------------------------------------
console.log('\n[6. Page 5: รายละเอียดข้อมูล]');

it('Page 5 banner states exact business rule for 26 Sept - Present', () => {
  assert.ok(templateHtml.includes('หน้า 5 • รายละเอียดข้อมูลการจัดส่ง &amp; ติดตามรายสมาชิก (26 ก.ย. ถึงปัจจุบัน)'), 'Page 5 banner verified');
  assert.ok(templateHtml.includes('โอนงานสิ้นวัน') && templateHtml.includes('น้ำท่วม') && templateHtml.includes('343 ราย'), 'Exact rule stated');
  assert.ok(templateHtml.includes('id="tabContent-table"'), 'Must have tabContent-table container');
  assert.ok(templateHtml.includes('id="globalFilterSearch"'), 'Must have table search input');
});

// ----------------------------------------------------------------------------
// 7. Page 6: Admin Data Management (tabContent-transfers)
// ----------------------------------------------------------------------------
console.log('\n[7. Page 6: จัดการข้อมูล Admin]');

it('Page 6 has dedicated Admin management banner and operations controls', () => {
  assert.ok(templateHtml.includes('หน้า 6 • จัดการข้อมูล Admin &amp; ศูนย์งานโอนสิ้นวัน'), 'Page 6 Admin banner verified');
  assert.ok(templateHtml.includes('id="tabContent-transfers"'), 'Must have tabContent-transfers container');
  assert.ok(templateHtml.includes('openSupabaseUploadModal()'), 'Must have Supabase upload trigger');
  assert.ok(templateHtml.includes('id="transferKpiTotal"'), 'Must have transferKpiTotal metric');
  assert.ok(templateHtml.includes('exportTransferMatrixCSV'), 'Must have CSV export');
});

// ----------------------------------------------------------------------------
// 8. Strict Data Numbers Verification
// ----------------------------------------------------------------------------
console.log('\n[8. Data Numbers Verification]');

it('Pending records equal 343 and resolved records equal 2,344 (Total 2,687)', () => {
  const pendingData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pending_from_26.json'), 'utf8'));
  const resolvedData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'resolved_from_26.json'), 'utf8'));
  assert.strictEqual(pendingData.length, 343, 'Pending must strictly be 343');
  assert.strictEqual(resolvedData.length, 2344, 'Resolved must strictly be 2,344');
  assert.strictEqual(pendingData.length + resolvedData.length, 2687, 'Total must strictly be 2,687');
});

console.log(`\n========================================================`);
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log(`========================================================\n`);

if (failed > 0) {
  process.exit(1);
}
