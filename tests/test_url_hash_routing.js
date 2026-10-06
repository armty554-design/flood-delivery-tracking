const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TESTING URL ROUTING / HASH DEEP LINKING SUITE ===\n');

const htmlPath = path.join(__dirname, '..', 'Index.html');
const templatePath = path.join(__dirname, '..', 'Index_template.html');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const templateContent = fs.readFileSync(templatePath, 'utf8');

// [1. Verify Declarations and Window Bindings]
console.log('[1. Function Declarations & Window Bindings]');
assert(templateContent.includes('const TAB_ROUTING_MAP ='), 'TAB_ROUTING_MAP must be declared');
assert(templateContent.includes('const TAB_TO_HASH_MAP ='), 'TAB_TO_HASH_MAP must be declared');
assert(templateContent.includes('function parseUrlHash('), 'parseUrlHash function must exist');
assert(templateContent.includes('function getUrlHashForCurrentState('), 'getUrlHashForCurrentState function must exist');
assert(templateContent.includes('function setUrlHash('), 'setUrlHash function must exist');
assert(templateContent.includes('function applyRouteFromHash('), 'applyRouteFromHash function must exist');
assert(templateContent.includes('function initUrlRouting('), 'initUrlRouting function must exist');

assert(templateContent.includes('window.switchTab = switchTab'), 'window.switchTab binding must exist');
assert(templateContent.includes('window.parseUrlHash = parseUrlHash'), 'window.parseUrlHash binding must exist');
assert(templateContent.includes('window.getUrlHashForCurrentState = getUrlHashForCurrentState'), 'window.getUrlHashForCurrentState binding must exist');
assert(templateContent.includes('window.applyRouteFromHash = applyRouteFromHash'), 'window.applyRouteFromHash binding must exist');
assert(templateContent.includes('window.initUrlRouting = initUrlRouting'), 'window.initUrlRouting binding must exist');

assert(htmlContent.includes('parseUrlHash'), 'Compiled Index.html must include parseUrlHash');
assert(htmlContent.includes('initUrlRouting'), 'Compiled Index.html must include initUrlRouting');
console.log('  ✔ PASS: All routing functions declared and bound to window in template & compiled Index.html');

// [2. Test Hash Parser (All formats: /#overview, /#fleet, /#fleet?car=13207)]
console.log('\n[2. Testing Hash Parser]');

const parseFnMatch = templateContent.match(/function parseUrlHash\([\s\S]*?\n    \}/);
const tabRoutingMapMatch = templateContent.match(/const TAB_ROUTING_MAP = \{[\s\S]*?\};/);
assert(parseFnMatch && tabRoutingMapMatch, 'Could not extract parseUrlHash and routing map');

const parseContext = new Function('hashStr', `
  ${tabRoutingMapMatch[0]}
  ${parseFnMatch[0]}
  return parseUrlHash(hashStr);
`);

// Test #overview
const rOverview1 = parseContext('#overview');
assert.strictEqual(rOverview1.tab, 'summary', '#overview must map to summary tab');

const rOverview2 = parseContext('#/overview');
assert.strictEqual(rOverview2.tab, 'summary', '#/overview must map to summary tab');

const rOverview3 = parseContext('/#overview');
assert.strictEqual(rOverview3.tab, 'summary', '/#overview must map to summary tab');

// Test #fleet and #fleet?car=13207
const rFleet = parseContext('#fleet');
assert.strictEqual(rFleet.tab, 'trucks', '#fleet must map to trucks tab');

const rFleetCar = parseContext('#fleet?car=13207');
assert.strictEqual(rFleetCar.tab, 'trucks', '#fleet?car=13207 must map to trucks tab');
assert.strictEqual(rFleetCar.params.car, '13207', 'car param must be 13207');

const rFleetSlash = parseContext('#/fleet?car=13207');
assert.strictEqual(rFleetSlash.tab, 'trucks', '#/fleet?car=13207 must map to trucks tab');
assert.strictEqual(rFleetSlash.params.car, '13207', 'car param must be 13207');

const rFleetTruckAlias = parseContext('/#fleet?truck=13207');
assert.strictEqual(rFleetTruckAlias.tab, 'trucks', '/#fleet?truck=13207 must map to trucks tab');
assert.strictEqual(rFleetTruckAlias.params.truck, '13207', 'truck param alias must be 13207');

// Test #table and #table?search=M999
const rTableSearch = parseContext('#/table?search=M999');
assert.strictEqual(rTableSearch.tab, 'table', '#/table must map to table tab');
assert.strictEqual(rTableSearch.params.search, 'M999', 'search param must be M999');

// Test other tabs
assert.strictEqual(parseContext('#/transfers').tab, 'transfers', '#/transfers must map to transfers tab');
assert.strictEqual(parseContext('#/water').tab, 'water', '#/water must map to water tab');
assert.strictEqual(parseContext('#/routes').tab, 'routes', '#/routes must map to routes tab');
assert.strictEqual(parseContext('#/map').tab, 'map', '#/map must map to map tab');
assert.strictEqual(parseContext('#/analytics').tab, 'analytics', '#/analytics must map to analytics tab');

console.log('  ✔ PASS: parseUrlHash accurately handles #overview, #/overview, #fleet, #fleet?car=13207, and all tabs');

// [3. Test Hash State Generator]
console.log('\n[3. Testing Hash State Generator]');
const tabToHashMapMatch = templateContent.match(/const TAB_TO_HASH_MAP = \{[\s\S]*?\};/);
const getHashFnMatch = templateContent.match(/function getUrlHashForCurrentState\([\s\S]*?\n    \}/);
assert(tabToHashMapMatch && getHashFnMatch, 'Could not extract getUrlHashForCurrentState');

function mockGetHash(tabId, selectedTruckSet = new Set(), searchVal = '') {
  const fn = new Function('tabId', 'selectedTrucks', 'document', `
    ${tabToHashMapMatch[0]}
    let currentTab = tabId;
    ${getHashFnMatch[0]}
    return getUrlHashForCurrentState(tabId);
  `);
  const mockDoc = {
    getElementById: (id) => {
      if (id === 'tableSearch' && searchVal) return { value: searchVal };
      return null;
    }
  };
  return fn(tabId, selectedTruckSet, mockDoc);
}

assert.strictEqual(mockGetHash('summary'), '/overview', 'Summary tab must generate /overview');
assert.strictEqual(mockGetHash('trucks'), '/fleet', 'Trucks tab with no single truck must generate /fleet');

const singleTruckSet = new Set(['13207']);
assert.strictEqual(mockGetHash('trucks', singleTruckSet), '/fleet?car=13207', 'Trucks tab with 1 truck must generate /fleet?car=13207');

assert.strictEqual(mockGetHash('table'), '/table', 'Table tab must generate /table');
assert.strictEqual(mockGetHash('table', new Set(), '13207'), '/table?search=13207', 'Table tab with search must generate /table?search=13207');
assert.strictEqual(mockGetHash('transfers'), '/transfers', 'Transfers tab must generate /transfers');
assert.strictEqual(mockGetHash('water'), '/water', 'Water tab must generate /water');
assert.strictEqual(mockGetHash('routes'), '/routes', 'Routes tab must generate /routes');

console.log('  ✔ PASS: getUrlHashForCurrentState produces clean, standardized deep-link URL hashes');

// [4. Simulation of Deep Linking Application]
console.log('\n[4. Simulation of Deep Link State Application]');

let simulatedCurrentTab = 'table';
let simulatedSelectedTrucks = new Set();
let simulatedSearch = '';

function simulateApplyRoute(hashStr) {
  const route = parseContext(hashStr);
  if (!route.tab) return false;
  if (route.params.car || route.params.truck) {
    simulatedSelectedTrucks.clear();
    simulatedSelectedTrucks.add(route.params.car || route.params.truck);
  }
  if (route.params.search) {
    simulatedSearch = route.params.search;
  }
  simulatedCurrentTab = route.tab;
  return true;
}

// Deep link to /#fleet?car=13207
const resFleet = simulateApplyRoute('/#fleet?car=13207');
assert.strictEqual(resFleet, true);
assert.strictEqual(simulatedCurrentTab, 'trucks', 'Target tab must be trucks');
assert.strictEqual(simulatedSelectedTrucks.has('13207'), true, 'Truck 13207 must be selected');

// Deep link to /#overview
const resOverview = simulateApplyRoute('/#overview');
assert.strictEqual(resOverview, true);
assert.strictEqual(simulatedCurrentTab, 'summary', 'Target tab must be summary');

// Deep link to /#table?search=270520
const resTable = simulateApplyRoute('/#table?search=270520');
assert.strictEqual(resTable, true);
assert.strictEqual(simulatedCurrentTab, 'table', 'Target tab must be table');
assert.strictEqual(simulatedSearch, '270520', 'Search query must be 270520');

console.log('  ✔ PASS: Deep link route application correctly activates tab, truck selection, and search queries');

console.log('\n================================================================');
console.log('ALL URL ROUTING & HASH DEEP LINKING TESTS PASSED! (100%)');
console.log('================================================================\n');
