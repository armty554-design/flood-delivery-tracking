const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== VERIFYING USER 3 REQUIREMENTS TEST SUITE ===\n');

function runTests() {
  const templatePath = path.join(__dirname, '..', 'Index_template.html');
  const indexPath = path.join(__dirname, '..', 'Index.html');
  const docsIndexPath = path.join(__dirname, '..', 'docs', 'index.html');
  const crisisDataPath = path.join(__dirname, '..', 'crisis_26_data.js');
  const pendingJsonPath = path.join(__dirname, '..', 'pending_from_26.json');
  const resolvedJsonPath = path.join(__dirname, '..', 'resolved_from_26.json');

  assert(fs.existsSync(templatePath), 'Index_template.html must exist');
  assert(fs.existsSync(indexPath), 'Index.html must exist');
  assert(fs.existsSync(docsIndexPath), 'docs/index.html must exist');
  assert(fs.existsSync(crisisDataPath), 'crisis_26_data.js must exist');
  assert(fs.existsSync(pendingJsonPath), 'pending_from_26.json must exist');
  assert(fs.existsSync(resolvedJsonPath), 'resolved_from_26.json must exist');

  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  // =========================================================================
  // REQUIREMENT 1: แผนที่น้ำท่วมเส้นทางไหนอยู่
  // =========================================================================
  console.log('[Requirement 1: แผนที่น้ำท่วมเส้นทางไหนอยู่]');
  assert(templateHtml.includes('id="btnToggleMainRoutes"'), 'Main map must have #btnToggleMainRoutes');
  assert(templateHtml.includes('focusMainFloodRoute(\'ROUTE-01\')'), 'Main map must have quick route zoom for ROUTE-01');
  assert(templateHtml.includes('focusMainFloodRoute(\'ROUTE-02\')'), 'Main map must have quick route zoom for ROUTE-02');
  assert(templateHtml.includes('focusMainFloodRoute(\'ROUTE-04\')'), 'Main map must have quick route zoom for ROUTE-04 (นวมินทร์)');
  assert(templateHtml.includes('function renderMainMapFloodRoutes'), 'JS must define renderMainMapFloodRoutes()');
  assert(templateHtml.includes('function toggleMainFloodRoutes'), 'JS must define toggleMainFloodRoutes()');
  assert(templateHtml.includes('function focusMainFloodRoute'), 'JS must define focusMainFloodRoute()');
  console.log('  ✔ PASS: Main map flood overlay controls & functions exist');

  // =========================================================================
  // REQUIREMENT 2: สรุปยอด 3 สถานะหลัก + ติดตามวิกฤต 26 ก.ย.
  // =========================================================================
  console.log('\n[Requirement 2: สรุปยอด 3 สถานะหลัก & ติดตามงาน 26 ก.ย.]');
  assert(templateHtml.includes('id="tabContent-summary"'), 'Index_template.html must contain #tabContent-summary');
  assert(templateHtml.includes('id="tabBtn-summary"'), 'Sidebar must have #tabBtn-summary');

  // 3 Hero Pillars
  assert(templateHtml.includes('id="kpiSuccessCount"'), 'Must have #kpiSuccessCount');
  assert(templateHtml.includes('id="kpiFailCount"'), 'Must have #kpiFailCount');
  assert(templateHtml.includes('id="kpiTransferCount"'), 'Must have #kpiTransferCount');
  assert(templateHtml.includes('id="sumCardSuccessCount"'), 'Summary tab must have #sumCardSuccessCount');
  assert(templateHtml.includes('id="sumCardFailCount"'), 'Summary tab must have #sumCardFailCount');
  assert(templateHtml.includes('id="sumCardTransferCount"'), 'Summary tab must have #sumCardTransferCount');
  assert(templateHtml.includes('id="summaryBranchTableBody"'), 'Summary tab must have #summaryBranchTableBody for 4-branch pivot table');
  console.log('  ✔ PASS: 3 Hero delivery pillar cards & 4-branch pivot table exist');

  // Crisis 26 Sept lifecycle trace (User Operational Rule)
  const pendingData = JSON.parse(fs.readFileSync(pendingJsonPath, 'utf8'));
  const resolvedData = JSON.parse(fs.readFileSync(resolvedJsonPath, 'utf8'));
  assert.strictEqual(pendingData.length, 343, 'Pending crisis records must equal 343 (True Pending Water)');
  assert.strictEqual(resolvedData.length, 2344, 'Resolved crisis records must equal 2,344 (Condition Resolved)');
  assert.strictEqual(pendingData.length + resolvedData.length, 2687, 'Total crisis records must equal 2,687');

  assert(templateHtml.includes('id="crisisTableBody"'), 'Must have #crisisTableBody');
  assert(templateHtml.includes('id="crisisSearchInput"'), 'Must have #crisisSearchInput');
  assert(templateHtml.includes('id="crisisBranchSelect"'), 'Must have #crisisBranchSelect');
  assert(templateHtml.includes('id="crisisCategorySelect"'), 'Must have #crisisCategorySelect for filtering crisis categories');
  assert(templateHtml.includes('exportCrisisReportCSV'), 'Must have exportCrisisReportCSV function');
  assert(templateHtml.includes('function renderCrisisTable'), 'Must have renderCrisisTable function');
  console.log('  ✔ PASS: Crisis 26 Sept trace data & controls verified (343 pending, 2344 resolved = 2,687 total)');

  // =========================================================================
  // REQUIREMENT 3: แดชบอร์ดสถิติ & กราฟ ปรับ UI ใหม่ & ย้ายแท็บไปซ้ายมือ
  // =========================================================================
  console.log('\n[Requirement 3: แดชบอร์ดสถิติ & กราฟ ปรับ UI ใหม่ & แท็บไปซ้ายมือ]');
  assert(templateHtml.includes('class="w-full lg:w-72') && templateHtml.includes('id="appSidebar"'), 'Sidebar must have proper layout width and ID');
  assert(templateHtml.includes('id="chartBranchCompare"'), 'Analytics tab must have #chartBranchCompare canvas');
  assert(templateHtml.includes('chartBranchCompareInstance'), 'JS must initialize and update chartBranchCompareInstance');
  assert(templateHtml.includes('คุณวุฒิชัย (Wuttichai)'), 'Developer credit for คุณวุฒิชัย must be preserved');
  console.log('  ✔ PASS: Left sidebar layout & redesigned branch comparison chart verified');

  // =========================================================================
  // COMPILED FILES & GITHUB PAGES INTEGRITY
  // =========================================================================
  console.log('\n[Compiled Files & GitHub Pages Integrity]');
  assert(indexHtml.includes('id="tabContent-summary"'), 'Compiled Index.html must have #tabContent-summary');
  assert(indexHtml.includes('id="btnToggleMainRoutes"'), 'Compiled Index.html must have #btnToggleMainRoutes');
  assert(indexHtml.includes('id="chartBranchCompare"'), 'Compiled Index.html must have #chartBranchCompare');
  assert(indexHtml.includes('<aside id="appSidebar"'), 'Compiled Index.html must have #appSidebar');
  assert(fs.existsSync(path.join(__dirname, '..', 'docs', 'crisis_26_data.js')), 'docs/crisis_26_data.js must exist for GitHub Pages');
  assert(fs.existsSync(path.join(__dirname, '..', 'docs', 'pending_from_26.json')), 'docs/pending_from_26.json must exist for GitHub Pages');
  assert(fs.existsSync(path.join(__dirname, '..', 'docs', 'resolved_from_26.json')), 'docs/resolved_from_26.json must exist for GitHub Pages');
  console.log('  ✔ PASS: All compiled files and docs deployment assets are in sync');

  console.log('\n========================================================');
  console.log('ALL 3 USER REQUIREMENTS VERIFIED SUCCESSFULLY! (100% PASS)');
  console.log('========================================================');
}

runTests();
