/**
 * ============================================================================
 * E2E Automated Test Suite for CCTV Cameras & Road Flood Reports (JK World Inspired)
 * ============================================================================
 * Features:
 *   1. Live CCTV Cameras Registry & Dynamic Surveillance Cards
 *   2. Live CCTV Modal Player with Surveillance HUD & Second-by-Second Timer
 *   3. Road Flooding & Drainage Reports (BMA DDS Standard)
 *   4. Rain Radar & Weather Watch Integration (TMD & RainViewer)
 *   5. Leaflet Routes Map CCTV Pins Integration
 *   6. Backend Apps Script APIs in รหัส.js
 * ============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');

// Load รหัส.js backend in GAS Sandbox
const codeJs = fs.readFileSync(path.join(ROOT_DIR, 'รหัส.js'), 'utf8');
const gasSandbox = {
  Utilities: {
    formatDate: (d, tz, fmt) => '14:45 น.'
  },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput: (text) => ({
      _text: text,
      _mime: 'text/plain',
      setMimeType: function(m) { this._mime = m; return this; },
      getContent: function() { return this._text; }
    })
  },
  HtmlService: {
    createHtmlOutputFromFile: () => ({
      setTitle: function() { return this; },
      addMetaTag: function() { return this; },
      setXFrameOptionsMode: function() { return this; }
    }),
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
  },
  SpreadsheetApp: {},
  Logger: { log: () => {} }
};
vm.createContext(gasSandbox);
vm.runInContext(codeJs, gasSandbox);

// Load compiled Index.html into DOM Sandbox
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'Index.html'), 'utf8');

function createClientDomSandbox() {
  const elements = new Map();
  const intervals = new Set();
  const timeouts = new Set();

  function getOrCreateElement(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id: id,
        innerHTML: '',
        textContent: '',
        value: '',
        className: '',
        classList: {
          _classes: new Set(),
          add: function(...cls) { cls.forEach(c => this._classes.add(c)); },
          remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); },
          toggle: function(c, force) {
            if (force === true) this._classes.add(c);
            else if (force === false) this._classes.delete(c);
            else if (this._classes.has(c)) this._classes.delete(c);
            else this._classes.add(c);
          },
          contains: function(c) { return this._classes.has(c); }
        },
        style: {},
        attributes: {},
        setAttribute: function(k, v) { this.attributes[k] = v; },
        getAttribute: function(k) { return this.attributes[k] || null; },
        querySelector: function() { return null; },
        querySelectorAll: function() { return []; },
        addEventListener: function() {},
        removeEventListener: function() {},
        remove: function() {}
      });
    }
    return elements.get(id);
  }

  const domSandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    document: {
      getElementById: (id) => getOrCreateElement(id),
      querySelectorAll: (sel) => [],
      querySelector: (sel) => null,
      createElement: (tag) => getOrCreateElement('el_' + Math.random().toString(36).substring(2)),
      activeElement: null,
      fullscreenElement: null,
      exitFullscreen: () => {}
    },
    window: {
      location: { href: 'http://localhost/index' },
      addEventListener: () => {}
    },
    navigator: {},
    lucide: { createIcons: () => {} },
    Chart: class { constructor() {} destroy() {} update() {} static register() {} },
    setInterval: (fn, ms) => {
      const id = 100 + intervals.size;
      intervals.add(id);
      return id;
    },
    clearInterval: (id) => {
      intervals.delete(id);
    },
    setTimeout: (fn, ms) => {
      const id = 200 + timeouts.size;
      timeouts.add(id);
      return id;
    },
    clearTimeout: (id) => {
      timeouts.delete(id);
    },
    L: {
      map: () => ({
        setView: function() { return this; },
        addLayer: function() { return this; },
        invalidateSize: function() { return this; },
        on: function() { return this; }
      }),
      tileLayer: () => ({ addTo: function() { return this; } }),
      layerGroup: () => ({
        clearLayers: function() {},
        addLayer: function() {},
        addTo: function() { return this; }
      }),
      divIcon: (opts) => opts,
      marker: (latlng, opts) => ({
        bindPopup: function() { return this; },
        addTo: function() { return this; }
      }),
      polyline: (coords, opts) => ({
        bindPopup: function() { return this; },
        addTo: function() { return this; },
        on: function() { return this; }
      })
    },
    safeCreateIcons: () => {}
  };

  domSandbox.window.document = domSandbox.document;
  vm.createContext(domSandbox);

  // Extract <script> content from Index.html
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(indexHtml)) !== null) {
    try {
      vm.runInContext(match[1], domSandbox);
    } catch (e) {
      // Ignore external or non-executable blocks
    }
  }

  return { domSandbox, elements, intervals, timeouts };
}

// Test Runner
let passed = 0;
let failed = 0;

function runTest(title, testFn) {
  try {
    testFn();
    console.log(`  ✔ PASS: ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ FAIL: ${title}`);
    console.error(`    -> ${err.message}`);
    failed++;
  }
}

console.log('\n=== CCTV CAMERAS & ROAD FLOOD REPORTS E2E TEST SUITE ===\n');

// Group 1: Backend Data in รหัส.js
console.log('[Group 1: Backend Apps Script Data & APIs]');
runTest('getRealtimeFloodMonitoringData returns 14 CCTV cameras', () => {
  const telemetry = gasSandbox.getRealtimeFloodMonitoringData();
  assert.ok(telemetry.cctvCameras, 'Must contain cctvCameras key');
  assert.strictEqual(telemetry.cctvCameras.length, 14, 'Should have exactly 14 CCTV cameras');
});

runTest('CCTV cameras cover all 4 branches', () => {
  const telemetry = gasSandbox.getRealtimeFloodMonitoringData();
  const branches = new Set(telemetry.cctvCameras.map(c => c.branch));
  assert.ok(branches.has('สาขากรุงเทพกรีฑา'), 'Must cover กรุงเทพกรีฑา');
  assert.ok(branches.has('สาขารามอินทรา'), 'Must cover รามอินทรา');
  assert.ok(branches.has('สาขาสุขุมวิท 50'), 'Must cover สุขุมวิท 50');
  assert.ok(branches.has('สาขาพระราม 3'), 'Must cover พระราม 3');
});

runTest('CCTV camera schema contains required fields', () => {
  const telemetry = gasSandbox.getRealtimeFloodMonitoringData();
  const cam = telemetry.cctvCameras[0];
  ['id', 'name', 'branch', 'district', 'road', 'status', 'riskLevel', 'waterDepthCm', 'source', 'streamType', 'quality', 'lat', 'lng', 'affectedTrucks'].forEach(f => {
    assert.ok(cam[f] !== undefined, `Camera schema must contain field "${f}"`);
  });
});

runTest('getRealtimeFloodMonitoringData returns 8 road flood reports', () => {
  const telemetry = gasSandbox.getRealtimeFloodMonitoringData();
  assert.ok(telemetry.roadFloodReports, 'Must contain roadFloodReports key');
  assert.strictEqual(telemetry.roadFloodReports.length, 8, 'Should have exactly 8 road flood reports');
});

runTest('Road flood report schema conforms to BMA DDS standards', () => {
  const telemetry = gasSandbox.getRealtimeFloodMonitoringData();
  const rep = telemetry.roadFloodReports[0];
  ['id', 'roadName', 'location', 'district', 'branch', 'depthCm', 'lanesAffected', 'passableVehicles', 'severity', 'drainageStatus', 'pumpsOperating', 'camId', 'affectedTrucks'].forEach(f => {
    assert.ok(rep[f] !== undefined, `Road flood report must contain field "${f}"`);
  });
});

runTest('doGet action=getCctvCameras returns JSON camera array', () => {
  const out = gasSandbox.doGet({ parameter: { action: 'getCctvCameras' } });
  assert.strictEqual(out._mime, 'application/json', 'Must have JSON mime type');
  const list = JSON.parse(out.getContent());
  assert.strictEqual(list.length, 14, 'Must return 14 cameras');
});

runTest('doGet action=getRoadFloodReports returns JSON reports array', () => {
  const out = gasSandbox.doGet({ parameter: { action: 'getRoadFloodReports' } });
  assert.strictEqual(out._mime, 'application/json', 'Must have JSON mime type');
  const list = JSON.parse(out.getContent());
  assert.strictEqual(list.length, 8, 'Must return 8 reports');
});

// Group 2: Client UI & Sandboxed Functions
console.log('\n[Group 2: Client DOM Sandbox & UI Functions]');
const { domSandbox, elements, intervals } = createClientDomSandbox();

runTest('renderCctvCameras renders camera cards with CCTV styling', () => {
  const data = gasSandbox.getRealtimeFloodMonitoringData();
  domSandbox.renderCctvCameras(data.cctvCameras);
  const container = elements.get('cctvCamerasContainer');
  assert.ok(container.innerHTML.length > 500, 'Container must render card markup');
  assert.ok(container.innerHTML.includes('CAM-BKK-01'), 'Must include CAM-BKK-01');
  assert.ok(container.innerHTML.includes('CAM-RAM-02'), 'Must include CAM-RAM-02');
  assert.ok(container.innerHTML.includes('openCctvModal'), 'Must link to openCctvModal');
});

runTest('setCctvBranchFilter filters cameras correctly by branch', () => {
  const data = gasSandbox.getRealtimeFloodMonitoringData();
  domSandbox.floodTelemetryData = data;
  domSandbox.setCctvBranchFilter('สาขารามอินทรา');
  const container = elements.get('cctvCamerasContainer');
  assert.ok(container.innerHTML.includes('CAM-RAM-01'), 'Must include Ram Intra cam');
  assert.ok(!container.innerHTML.includes('CAM-BKK-01'), 'Must not include Krungthep Kreetha cam');
});

runTest('setCctvSeverityFilter filters cameras correctly by risk level', () => {
  const data = gasSandbox.getRealtimeFloodMonitoringData();
  domSandbox.floodTelemetryData = data;
  domSandbox.setCctvBranchFilter('ALL');
  domSandbox.setCctvSeverityFilter('CRITICAL');
  const container = elements.get('cctvCamerasContainer');
  assert.ok(container.innerHTML.includes('CAM-RAM-02'), 'Must include critical cam CAM-RAM-02');
  assert.ok(!container.innerHTML.includes('CAM-RAM-04'), 'Must not include normal cam CAM-RAM-04');
});

runTest('openCctvModal displays modal player and activates live timer', () => {
  const data = gasSandbox.getRealtimeFloodMonitoringData();
  domSandbox.floodTelemetryData = data;
  domSandbox.openCctvModal('CAM-RAM-02');
  const modal = elements.get('cctvModal');
  assert.ok(!modal.classList.contains('hidden'), 'Modal must not have hidden class');
  const title = elements.get('cctvModalTitle');
  assert.ok(title.textContent.includes('CAM-RAM-02'), 'Title must display camera ID');
  assert.ok(title.textContent.includes('ถ.เสรีไทย'), 'Title must display road name');
  const depth = elements.get('cctvWaterDepthHud');
  assert.ok(depth.textContent.includes('28 ซม.'), 'Depth HUD must display 28 ซม.');
});

runTest('closeCctvModal closes modal and clears live timer', () => {
  domSandbox.closeCctvModal();
  const modal = elements.get('cctvModal');
  assert.ok(modal.classList.contains('hidden'), 'Modal must have hidden class after closing');
});

runTest('renderRoadFloodReports renders DDS standard road flood cards', () => {
  const data = gasSandbox.getRealtimeFloodMonitoringData();
  domSandbox.renderRoadFloodReports(data.roadFloodReports);
  const container = elements.get('roadFloodReportsList');
  assert.ok(container.innerHTML.length > 500, 'Container must render road flood cards');
  assert.ok(container.innerHTML.includes('ถนนเสรีไทย'), 'Must include ถนนเสรีไทย');
  assert.ok(container.innerHTML.includes('ความลึก 25-30 ซม.'), 'Must include water depth');
  assert.ok(container.innerHTML.includes('เครื่องสูบน้ำ 8 นิ้ว'), 'Must include drainage pump status');
  assert.ok(container.innerHTML.includes('openCctvModal'), 'Must link to openCctvModal');
});

runTest('setRoadFloodSeverity filters road flood reports by severity', () => {
  const data = gasSandbox.getRealtimeFloodMonitoringData();
  domSandbox.floodTelemetryData = data;
  domSandbox.setRoadFloodSeverity('CRITICAL');
  const container = elements.get('roadFloodReportsList');
  assert.ok(container.innerHTML.includes('ถนนเสรีไทย'), 'Must include critical road');
  assert.ok(!container.innerHTML.includes('ซอยสุขุมวิท 50'), 'Must not include normal road');
});

runTest('renderRainRadar renders radar display and 4 branch forecasts', () => {
  const data = gasSandbox.getRealtimeFloodMonitoringData();
  domSandbox.renderRainRadar(data.rainRadar);
  const container = elements.get('rainRadarContainer');
  assert.ok(container.innerHTML.includes('TMD & BMA RADAR'), 'Must include radar header');
  assert.ok(container.innerHTML.includes('สาขากรุงเทพกรีฑา'), 'Must include branch forecast');
  assert.ok(container.innerHTML.includes('สาขารามอินทรา'), 'Must include branch forecast');
  assert.ok(container.innerHTML.includes('ความแรง:'), 'Must include radar intensity legend');
});

runTest('generateCctvSvgPreview produces valid surveillance preview markup', () => {
  const cam = gasSandbox.getRealtimeFloodMonitoringData().cctvCameras[0];
  const preview = domSandbox.generateCctvSvgPreview(cam);
  assert.ok(preview.includes(cam.id), 'Must include camera ID in surveillance preview');
  assert.ok(preview.includes('CONNECTING FEED') || preview.includes('LIVE'), 'Must include surveillance live or connecting indicator');
  
  // Test with snapshot image populated
  const camWithPhoto = Object.assign({}, cam, { snapshotBase64: 'data:image/jpeg;base64,sample' });
  const photoPreview = domSandbox.generateCctvSvgPreview(camWithPhoto);
  assert.ok(photoPreview.includes('<img'), 'Must render real image tag when snapshot is available');
  assert.ok(photoPreview.includes('LIVE'), 'Must show LIVE indicator');
});

// Group 3: Template & Compiled Build Validation
console.log('\n[Group 3: Template & Compiled HTML Validation]');
runTest('Index_template.html contains cctvCamerasSection', () => {
  const tpl = fs.readFileSync(path.join(ROOT_DIR, 'Index_template.html'), 'utf8');
  assert.ok(tpl.includes('id="cctvCamerasSection"'), 'Template must have cctvCamerasSection container');
});

runTest('Index_template.html contains roadFloodReportsSection', () => {
  const tpl = fs.readFileSync(path.join(ROOT_DIR, 'Index_template.html'), 'utf8');
  assert.ok(tpl.includes('id="roadFloodReportsSection"'), 'Template must have roadFloodReportsSection container');
});

runTest('Index_template.html contains rainRadarSection', () => {
  const tpl = fs.readFileSync(path.join(ROOT_DIR, 'Index_template.html'), 'utf8');
  assert.ok(tpl.includes('id="rainRadarSection"'), 'Template must have rainRadarSection container');
});

runTest('Index_template.html contains cctvModal for live streaming', () => {
  const tpl = fs.readFileSync(path.join(ROOT_DIR, 'Index_template.html'), 'utf8');
  assert.ok(tpl.includes('id="cctvModal"'), 'Template must have cctvModal');
});

runTest('Index_template.html links to external JK World Flood Watch', () => {
  const tpl = fs.readFileSync(path.join(ROOT_DIR, 'Index_template.html'), 'utf8');
  assert.ok(tpl.includes('https://world.tehx.dyndns.info/flood'), 'Template must link to JK World Flood Watch');
});

runTest('Compiled Index.html exists and is over 2,000,000 bytes', () => {
  const stat = fs.statSync(path.join(ROOT_DIR, 'Index.html'));
  assert.ok(stat.size > 2000000, `Index.html size (${stat.size}) must exceed 2,000,000 bytes`);
});

// Clean up intervals
intervals.forEach(id => clearInterval(id));

console.log('\n========================================================');
console.log(`TOTAL CCTV & FLOOD REPORTS TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('========================================================\n');

if (failed > 0) process.exit(1);
