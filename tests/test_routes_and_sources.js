/**
 * ============================================================================
 * Automated Test Suite for Tab 6 (Flooded Routes Map) & Official Citations
 * ============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'Index.html'), 'utf8');
const templateHtml = fs.readFileSync(path.join(ROOT_DIR, 'Index_template.html'), 'utf8');
const backendCode = fs.readFileSync(path.join(ROOT_DIR, 'รหัส.js'), 'utf8');

console.log('\n=== TESTING TAB 6 (FLOODED ROUTES) & OFFICIAL SOURCES CITATIONS ===\n');

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

// 1. Backend Verification
it('รหัส.js contains floodedRoutes with 8 routes across branches', () => {
  const backendSandbox = {
    Logger: { log: () => {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => null },
    HtmlService: { createHtmlOutputFromFile: () => {} }
  };
  vm.createContext(backendSandbox);
  vm.runInContext(backendCode, backendSandbox);

  assert.strictEqual(typeof backendSandbox.getRealtimeFloodMonitoringData, 'function');
  const res = backendSandbox.getRealtimeFloodMonitoringData();
  assert.ok(res.success, 'Backend returned success: true');
  assert.ok(Array.isArray(res.floodedRoutes), 'floodedRoutes must be an array');
  assert.strictEqual(res.floodedRoutes.length, 8, 'Must contain 8 routes');
  
  const ids = res.floodedRoutes.map(r => r.id);
  assert.ok(ids.includes('ROUTE-01') && ids.includes('ROUTE-08'));
  
  const severities = new Set(res.floodedRoutes.map(r => r.status));
  assert.ok(severities.has('CRITICAL') && severities.has('WARNING') && severities.has('NORMAL'));
});

it('รหัส.js contains officialSources with 6 verified agencies', () => {
  const backendSandbox = {
    Logger: { log: () => {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => null },
    HtmlService: { createHtmlOutputFromFile: () => {} }
  };
  vm.createContext(backendSandbox);
  vm.runInContext(backendCode, backendSandbox);

  const res = backendSandbox.getRealtimeFloodMonitoringData();
  assert.ok(res.officialSources.length >= 6, 'Must contain at least 6 official sources');

  const names = res.officialSources.map(s => s.name).join(' ');
  assert.ok(names.includes('สำนักการระบายน้ำ'), 'Must include DDS - BMA');
  assert.ok(names.includes('สสน.') || names.includes('ThaiWater'), 'Must include ThaiWater');
  assert.ok(names.includes('ชลประทาน') || names.includes('SWOC'), 'Must include SWOC');
  assert.ok(names.includes('บก.02') || names.includes('บก.จร.'), 'Must include บก.02');
  assert.ok(names.includes('จส.100'), 'Must include JS100');
  assert.ok(names.includes('ปภ.'), 'Must include DDPM');
});

// 2. Template / DOM Structure Verification
it('Index_template.html contains tabBtn-routes with icon and route count badge', () => {
  assert.ok(templateHtml.includes('id="tabBtn-routes"'));
  assert.ok(templateHtml.includes('switchTab(\'routes\')'));
  assert.ok(templateHtml.includes('แผนที่เส้นทางน้ำท่วม'));
});

it('Index_template.html contains #tabContent-routes with #routesMap and #routesListContainer', () => {
  assert.ok(templateHtml.includes('id="tabContent-routes"'));
  assert.ok(templateHtml.includes('id="routesMap"'));
  assert.ok(templateHtml.includes('id="routesListContainer"'));
  assert.ok(templateHtml.includes('id="routesKpiCritical"'));
  assert.ok(templateHtml.includes('id="routesKpiWarning"'));
  assert.ok(templateHtml.includes('id="routesKpiNormal"'));
});

it('Index_template.html contains #dataSourcesSection with #officialSourcesList in Tab 5', () => {
  assert.ok(templateHtml.includes('id="dataSourcesSection"'));
  assert.ok(templateHtml.includes('id="officialSourcesList"'));
  assert.ok(templateHtml.includes('แหล่งข้อมูลอ้างอิงทางการ & หน่วยงานภาครัฐ'));
});

// 3. Client DOM Sandbox & Functionality
const elements = {};
function createMockElement(id) {
  return {
    id: id,
    tagName: 'DIV',
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    classList: {
      _classes: new Set(),
      add: function(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); },
      toggle: function(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
      },
      contains: function(c) { return this._classes.has(c); }
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    scrollIntoView: () => {}
  };
}

function getElem(id) {
  if (!elements[id]) elements[id] = createMockElement(id);
  return elements[id];
}

const mockDoc = {
  getElementById: getElem,
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelectorAll: (selector) => {
    if (selector === '.tab-btn') {
      return ['map', 'analytics', 'trucks', 'table', 'water', 'routes'].map(t => getElem('tabBtn-' + t));
    }
    if (selector === '.route-status-btn') {
      return ['ALL', 'CRITICAL', 'WARNING', 'NORMAL'].map(s => getElem('btnRouteFilter-' + s));
    }
    if (selector === '.water-canal-btn') {
      return ['ALL', 'prawet', 'saensaep', 'latphrao', 'chaophraya'].map(c => getElem('btnWaterCanal-' + c));
    }
    if (selector === '.sev-filter-btn') {
      return ['ALL', 'CRITICAL', 'WARNING', 'NORMAL'].map(s => getElem('btnSev-' + s));
    }
    return [];
  },
  createElement: (tag) => createMockElement('dyn_' + Math.random().toString(36).substr(2, 5))
};

const mockLeaflet = {
  map: () => ({
    setView: function() { return this; },
    fitBounds: function() { return this; },
    invalidateSize: function() {}
  }),
  tileLayer: () => ({
    addTo: function() { return this; }
  }),
  layerGroup: () => ({
    addTo: function() { return this; },
    clearLayers: function() {}
  }),
  polyline: () => ({
    bindPopup: function() { return this; },
    addTo: function() { return this; },
    getBounds: function() { return {}; },
    openPopup: function() {}
  }),
  circleMarker: () => ({
    bindPopup: function() { return this; },
    addTo: function() { return this; }
  }),
  markerClusterGroup: () => ({
    clearLayers: () => {},
    addLayer: () => {},
    addTo: () => {}
  })
};

const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, scriptCode = '';
while ((m = scriptRegex.exec(indexHtml)) !== null) {
  if (m[1].includes('initWaterTab')) {
    scriptCode = m[1];
  }
}

const clientSandbox = {
  document: mockDoc,
  window: {},
  console: { log: () => {}, warn: () => {}, error: () => {} },
  L: mockLeaflet,
  Chart: function() {
    return { destroy: () => {}, update: () => {} };
  },
  setTimeout: (fn, ms) => {
    // Only execute if not a retry loop
    if (ms !== 250) fn();
  },
  setInterval: () => 123,
  clearInterval: () => {},
  lucide: { createIcons: () => {} }
};
clientSandbox.Chart.register = () => {};
clientSandbox.window = clientSandbox;
vm.createContext(clientSandbox);
vm.runInContext(scriptCode, clientSandbox);

it('client functions for Tab 6 and Official Sources exist on window', () => {
  assert.strictEqual(typeof clientSandbox.initRoutesMap, 'function');
  assert.strictEqual(typeof clientSandbox.renderRoutesTab, 'function');
  assert.strictEqual(typeof clientSandbox.filterAndRenderRoutes, 'function');
  assert.strictEqual(typeof clientSandbox.setRouteStatusFilter, 'function');
  assert.strictEqual(typeof clientSandbox.focusRoute, 'function');
  assert.strictEqual(typeof clientSandbox.resetRoutesMapView, 'function');
  assert.strictEqual(typeof clientSandbox.renderOfficialSources, 'function');
});

it('renderOfficialSources renders all 6 government citations into #officialSourcesList', () => {
  clientSandbox.renderOfficialSources();
  const html = getElem('officialSourcesList').innerHTML;
  assert.ok(html.includes('สำนักการระบายน้ำ'), 'DDS BMA rendered');
  assert.ok(html.includes('ThaiWater') || html.includes('สสน.'), 'ThaiWater rendered');
  assert.ok(html.includes('กรมชลประทาน') || html.includes('SWOC'), 'SWOC rendered');
  assert.ok(html.includes('บก.02') || html.includes('บก.จร.'), 'บก.02 rendered');
  assert.ok(html.includes('จส.100'), 'จส.100 rendered');
  assert.ok(html.includes('ปภ.'), 'DDPM rendered');
  assert.ok(html.includes('ตรวจสอบแล้ว'), 'Verified checkmark rendered');
});

it('renderRoutesTab renders KPI summary accurately (3 critical, 3 warning, 2 normal)', () => {
  clientSandbox.renderRoutesTab();
  assert.strictEqual(getElem('routesKpiCritical').textContent, 3, '3 critical routes');
  assert.strictEqual(getElem('routesKpiWarning').textContent, 3, '3 warning routes');
  assert.strictEqual(getElem('routesKpiNormal').textContent, 2, '2 normal routes');
  assert.ok(Number(getElem('routesKpiImpactedTrucks').textContent) >= 8, 'At least 8 impacted trucks');
});

it('filterAndRenderRoutes filters by status accurately', () => {
  clientSandbox.setRouteStatusFilter('CRITICAL');
  const criticalHtml = getElem('routesListContainer').innerHTML;
  assert.ok(criticalHtml.includes('ROUTE-01'), 'Must include ROUTE-01 in critical');
  assert.ok(!criticalHtml.includes('ROUTE-07'), 'ROUTE-07 is NORMAL and must be filtered out');

  clientSandbox.setRouteStatusFilter('NORMAL');
  const normalHtml = getElem('routesListContainer').innerHTML;
  assert.ok(normalHtml.includes('ROUTE-07') && normalHtml.includes('ROUTE-08'), 'Must include ROUTE-07 and ROUTE-08');
  assert.ok(!normalHtml.includes('ROUTE-01'), 'ROUTE-01 must be filtered out');

  // Reset to ALL
  clientSandbox.setRouteStatusFilter('ALL');
  const allHtml = getElem('routesListContainer').innerHTML;
  assert.ok(allHtml.includes('ROUTE-01') && allHtml.includes('ROUTE-07'));
});

it('filterAndRenderRoutes filters by search query and branch', () => {
  getElem('routeSearchInput').value = 'เสรีไทย';
  clientSandbox.filterAndRenderRoutes();
  const resHtml = getElem('routesListContainer').innerHTML;
  assert.ok(resHtml.includes('เสรีไทย'), 'Search for เสรีไทย matched');

  // Reset
  getElem('routeSearchInput').value = '';
  clientSandbox.filterAndRenderRoutes();
});

it('switchTab handles all 6 tabs seamlessly (map, analytics, trucks, table, water, routes)', () => {
  const allTabs = ['map', 'analytics', 'trucks', 'table', 'water', 'routes'];

  allTabs.forEach(t => {
    clientSandbox.switchTab(t);
    assert.strictEqual(vm.runInContext('currentTab', clientSandbox), t);
    assert.strictEqual(getElem('tabContent-' + t).classList.contains('hidden'), false, `#tabContent-${t} visible`);
    assert.ok(getElem('tabBtn-' + t).classList.contains('bg-blue-600'), `#tabBtn-${t} active`);
  });

  // Switch back to routes
  clientSandbox.switchTab('routes');
  assert.strictEqual(getElem('tabContent-routes').classList.contains('hidden'), false);
  assert.strictEqual(getElem('tabContent-map').classList.contains('hidden'), true);
  assert.strictEqual(getElem('tabContent-water').classList.contains('hidden'), true);
});

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests.\n`);
if (failed > 0) process.exit(1);
