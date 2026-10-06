/**
 * test_executive_3tabs_overhaul.js
 * Comprehensive test suite verifying the Executive 3-Tabs Overhaul:
 * 1. Tab 1: Crisis Backlog & Attempts Tracker (Landing page by default)
 *    - 343 members pending since 26 Sept
 *    - Interactive attempts filter chips (All, 1, 2, 3, 4, 5+ attempts)
 *    - Stacked visual percentage distribution bar
 *    - Detailed crisis member table with attempt badges & history modals
 * 2. Tab 2: Fleet Routes & Weather/Flood Intel
 *    - Leaflet route map & GPS traces
 *    - TMD / BMA Live Rain Radar & 3-hour forecasts
 *    - Road Flooding & Drainage Telemetry (8 critical roadways)
 * 3. Tab 3: Water Monitoring & Live CCTV
 *    - 12 Telemetered Canal Gauges
 *    - 14 HD CCTV Surveillance Feeds (Quad / Single view)
 * 4. Collapsible Secondary Operations Menu
 *    - Clean professional organization for secondary tools (Table, Map, Analytics, Trucks, Transfers)
 * 5. Executive Navigation Controls (Sidebar, Top Header, Mobile Pills)
 */

const fs = require('fs');
const assert = require('assert');
const path = require('path');

console.log('Testing Executive 3-Tabs Overhaul...');

const htmlPath = path.join(__dirname, '..', 'Index.html');
assert.ok(fs.existsSync(htmlPath), 'Index.html must exist');
const html = fs.readFileSync(htmlPath, 'utf8');

// ==========================================
// 1. Executive Navigation Structure
// ==========================================
console.log('1. Checking Executive Navigation (Sidebar, Header, Mobile)...');

// Sidebar Executive Tabs
assert.ok(html.includes('id="tabBtn-summary"'), 'Sidebar must have tabBtn-summary');
assert.ok(html.includes('id="tabBtn-routes"'), 'Sidebar must have tabBtn-routes');
assert.ok(html.includes('id="tabBtn-water"'), 'Sidebar must have tabBtn-water');

// Secondary Operations Collapsible Menu
assert.ok(html.includes('id="secondaryMenuContainer"'), 'Must have secondaryMenuContainer');
assert.ok(html.includes('toggleSecondaryMenu()'), 'Must have toggleSecondaryMenu() in button onclick');
assert.ok(html.includes('id="tabBtn-table"'), 'Sidebar must have tabBtn-table inside secondary menu');
assert.ok(html.includes('id="tabBtn-map"'), 'Sidebar must have tabBtn-map inside secondary menu');
assert.ok(html.includes('id="tabBtn-analytics"'), 'Sidebar must have tabBtn-analytics inside secondary menu');
assert.ok(html.includes('id="tabBtn-trucks"'), 'Sidebar must have tabBtn-trucks inside secondary menu');
assert.ok(html.includes('id="tabBtn-transfers"'), 'Sidebar must have tabBtn-transfers inside secondary menu');

// Header Segmented Pills
assert.ok(html.includes('id="headerTab-summary"'), 'Header must have headerTab-summary');
assert.ok(html.includes('id="headerTab-routes"'), 'Header must have headerTab-routes');
assert.ok(html.includes('id="headerTab-water"'), 'Header must have headerTab-water');

// Mobile Pills
assert.ok(html.includes('id="mobileTab-summary"'), 'Mobile must have mobileTab-summary');
assert.ok(html.includes('id="mobileTab-routes"'), 'Mobile must have mobileTab-routes');
assert.ok(html.includes('id="mobileTab-water"'), 'Mobile must have mobileTab-water');

// Default Tab
assert.ok(html.includes("let currentTab = 'summary';"), "currentTab must default to 'summary'");

// ==========================================
// 2. Tab 1: Crisis Backlog & Attempts Tracker
// ==========================================
console.log('2. Checking Tab 1: Crisis Backlog & Attempts Tracker...');

assert.ok(html.includes('id="tabContent-summary"'), 'Must have tabContent-summary');
// Verify tabContent-summary is active by default (not hidden)
assert.ok(html.includes('id="tabContent-summary" class="space-y-6"'), 'tabContent-summary must be visible by default (space-y-6 without hidden)');
// Verify tabContent-table is hidden by default
assert.ok(html.includes('id="tabContent-table" class="hidden space-y-4"'), 'tabContent-table must have hidden class by default');

// 4 KPI Cards
assert.ok(html.includes('ยังไม่ได้รับน้ำเลย'), 'Must show pending category tile');
assert.ok(html.includes('>343<'), 'Must show 343 pending count');
assert.ok(html.includes('สำเร็จตามเงื่อนไข'), 'Must show success category tile');
assert.ok(html.includes('>2,344<'), 'Must show 2,344 success count');
assert.ok(html.includes('>2,687<'), 'Must show 2,687 total starting incidents');
assert.ok(html.includes('รามอินทรา:'), 'Must show Ramintra branch breakdown');
assert.ok(html.includes('กรุงเทพกรีฑา:'), 'Must show Krungthep Kreetha branch breakdown');

// Attempts Filter Chips
assert.ok(html.includes('id="btnAttemptFilter-ALL"'), 'Must have filter button for ALL');
assert.ok(html.includes('id="btnAttemptFilter-1"'), 'Must have filter button for 1 attempt');
assert.ok(html.includes('id="btnAttemptFilter-2"'), 'Must have filter button for 2 attempts');
assert.ok(html.includes('id="btnAttemptFilter-3"'), 'Must have filter button for 3 attempts');
assert.ok(html.includes('id="btnAttemptFilter-4"'), 'Must have filter button for 4 attempts');
assert.ok(html.includes('id="btnAttemptFilter-5"'), 'Must have filter button for 5+ attempts');

// Attempts Distribution Stacked Bar
assert.ok(html.includes('สัดส่วนความพยายามเข้าจัดส่งสะสม (Attempts Distribution)'), 'Must have stacked attempts distribution section');
assert.ok(html.includes('86.0%'), 'Must have 86.0% dominant percentage');
assert.ok(html.includes('11.4%'), 'Must have 11.4% percentage for 4 attempts');

// Crisis Table & Modal
assert.ok(html.includes('id="crisisTableBody"'), 'Must have crisisTableBody');
assert.ok(html.includes('id="actionModal"'), 'Must have actionModal');
assert.ok(html.includes('openMemberHistoryModal'), 'Must have openMemberHistoryModal');

// ==========================================
// 3. Tab 2: Fleet Routes & Weather/Flood Intel
// ==========================================
console.log('3. Checking Tab 2: Fleet Routes & Weather/Flood Intel...');

assert.ok(html.includes('id="tabContent-routes"'), 'Must have tabContent-routes');
assert.ok(html.includes('id="routesMap"'), 'Tab 2 must have routesMap');
assert.ok(html.includes('id="routesRainRadarContainer"'), 'Tab 2 must have routesRainRadarContainer');
assert.ok(html.includes('id="routesRoadFloodContainer"'), 'Tab 2 must have routesRoadFloodContainer');
assert.ok(html.includes('renderRoutesRoadFloods'), 'Must define renderRoutesRoadFloods');

// ==========================================
// 4. Tab 3: Water Monitoring & Live CCTV
// ==========================================
console.log('4. Checking Tab 3: Water Monitoring & Live CCTV...');

assert.ok(html.includes('id="tabContent-water"'), 'Must have tabContent-water');
assert.ok(html.includes('id="waterStationsContainer"'), 'Tab 3 must have waterStationsContainer');
assert.ok(html.includes('id="cctvInAppConsole"'), 'Tab 3 must have cctvInAppConsole');
assert.ok(html.includes('id="cctvCamerasContainer"'), 'Tab 3 must have cctvCamerasContainer');
assert.ok(html.includes('id="cctvModal"'), 'Must have cctvModal for HD live view');

// ==========================================
// 5. JavaScript Logic & Data Calculations
// ==========================================
console.log('5. Checking Crisis Attempts Filter & Calculations Logic...');

// Test data calculation directly from crisis_26_data.js
const crisisDataPath = path.join(__dirname, '..', 'crisis_26_data.js');
assert.ok(fs.existsSync(crisisDataPath), 'crisis_26_data.js must exist');

// Load crisis data in sandbox
const crisisCode = fs.readFileSync(crisisDataPath, 'utf8');
const sandbox = { window: {} };
eval(`(function(window) { ${crisisCode} })(sandbox.window)`);

const pendingList = sandbox.window.CRISIS_26_PENDING || [];
assert.strictEqual(pendingList.length, 343, 'Total pending since 26 Sept must be 343 members');

// Calculate attempt counts
const countMap = {};
for (const m of pendingList) {
  const attempts = m.attemptsCount || 0;
  countMap[attempts] = (countMap[attempts] || 0) + 1;
}

console.log('Attempt Distribution:', countMap);
assert.strictEqual(countMap[1], 2, 'Exactly 2 members have 1 attempt');
assert.strictEqual(countMap[2], 295, 'Exactly 295 members have 2 attempts');
assert.strictEqual(countMap[3], 5, 'Exactly 5 members have 3 attempts');
assert.strictEqual(countMap[4], 39, 'Exactly 39 members have 4 attempts');
assert.strictEqual(countMap[5], 2, 'Exactly 2 members have 5 attempts');

// Verify helper function setCrisisAttemptsFilter works as expected
assert.ok(html.includes('function setCrisisAttemptsFilter(countVal)'), 'setCrisisAttemptsFilter must be defined');
assert.ok(html.includes('crisisAttemptsFilter'), 'crisisAttemptsFilter state variable must exist');

console.log('✅ ALL EXECUTIVE 3-TABS OVERHAUL TESTS PASSED SUCCESSFULLY!');
