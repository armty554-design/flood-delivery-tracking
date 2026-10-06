/**
 * ============================================================================
 * Automated Test Suite for Live CCTV Direct Pulling & Web-Wide Flood Intelligence
 * ============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const templateHtml = fs.readFileSync(path.join(ROOT_DIR, 'Index_template.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'Index.html'), 'utf8');
const docsHtml = fs.readFileSync(path.join(ROOT_DIR, 'docs', 'index.html'), 'utf8');

console.log('\n=== TESTING LIVE CCTV DIRECT PULL & WEB-WIDE FLOOD INTEL ANALYZER ===\n');

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
// 1. Tab 3: Live CCTV Pull & Surveillance Console Tests
// ----------------------------------------------------------------------------
it('Tab 3 Header contains #btnPullLiveCctv button for direct real-time CCTV pulling', () => {
  assert.ok(templateHtml.includes('id="btnPullLiveCctv"'), 'Must contain #btnPullLiveCctv in template');
  assert.ok(templateHtml.includes('pullAllLiveCctvFeeds(true)'), 'Must bind onclick to pullAllLiveCctvFeeds(true)');
  assert.ok(indexHtml.includes('id="btnPullLiveCctv"'), 'Must contain #btnPullLiveCctv in compiled Index.html');
  assert.ok(docsHtml.includes('id="btnPullLiveCctv"'), 'Must contain #btnPullLiveCctv in docs/index.html');
});

it('CCTV In-App Console contains Auto-Patrol toggle and progress bar elements', () => {
  assert.ok(templateHtml.includes('id="btnAutoPatrolCctv"'), 'Must have #btnAutoPatrolCctv');
  assert.ok(templateHtml.includes('toggleAutoPatrolCctv()'), 'Must bind onclick to toggleAutoPatrolCctv()');
  assert.ok(templateHtml.includes('id="inlineCctvAutoPatrolBarContainer"'), 'Must have #inlineCctvAutoPatrolBarContainer');
  assert.ok(templateHtml.includes('id="inlineCctvAutoPatrolBar"'), 'Must have #inlineCctvAutoPatrolBar');
});

it('CCTV In-App Console contains High-Tech Telemetry HUD Overlays', () => {
  assert.ok(templateHtml.includes('id="inlineCctvBitrateHud"'), 'Must have #inlineCctvBitrateHud');
  assert.ok(templateHtml.includes('id="inlineCctvWeatherHud"'), 'Must have #inlineCctvWeatherHud');
  assert.ok(templateHtml.includes('● REC LIVE'), 'Must display ● REC LIVE badge');
  assert.ok(templateHtml.includes('id="inlineCctvLiveClock"'), 'Must have #inlineCctvLiveClock');
});

it('CCTV Cards contain directPullCamera button on each surveillance card', () => {
  assert.ok(templateHtml.includes('directPullCamera('), 'Template must call directPullCamera on CCTV cards');
  assert.ok(indexHtml.includes('directPullCamera('), 'Index.html must call directPullCamera');
});

it('CCTV In-App Console includes official direct streaming portals bar', () => {
  assert.ok(templateHtml.includes('https://cpudapp.bangkok.go.th/bmatraffic/'), 'Must have BMA Traffic Live URL');
  assert.ok(templateHtml.includes('https://floodbangkok.bangkok.go.th/'), 'Must have BMA Flood Bangkok URL');
  assert.ok(templateHtml.includes('https://traffic.longdo.com/'), 'Must have Longdo Traffic URL');
});

it('Live CCTV JavaScript functions are declared and exported to window', () => {
  assert.ok(templateHtml.includes('function pullAllLiveCctvFeeds'), 'Must declare pullAllLiveCctvFeeds');
  assert.ok(templateHtml.includes('function directPullCamera'), 'Must declare directPullCamera');
  assert.ok(templateHtml.includes('function toggleAutoPatrolCctv'), 'Must declare toggleAutoPatrolCctv');
  assert.ok(templateHtml.includes('window.pullAllLiveCctvFeeds = pullAllLiveCctvFeeds'), 'Must export pullAllLiveCctvFeeds to window');
  assert.ok(templateHtml.includes('window.directPullCamera = directPullCamera'), 'Must export directPullCamera to window');
  assert.ok(templateHtml.includes('window.toggleAutoPatrolCctv = toggleAutoPatrolCctv'), 'Must export toggleAutoPatrolCctv to window');
});

// ----------------------------------------------------------------------------
// 2. Tab 2: Web-Wide Flood Intelligence & Deep Water Analyzer Tests
// ----------------------------------------------------------------------------
it('Tab 2 contains #webFloodIntelSection for web-wide flood search and analysis', () => {
  assert.ok(templateHtml.includes('id="webFloodIntelSection"'), 'Template must have #webFloodIntelSection');
  assert.ok(templateHtml.includes('id="webFloodSearchInput"'), 'Must have #webFloodSearchInput');
  assert.ok(templateHtml.includes('id="webFloodIntelResultContainer"'), 'Must have #webFloodIntelResultContainer');
  assert.ok(indexHtml.includes('id="webFloodIntelSection"'), 'Index.html must have #webFloodIntelSection');
  assert.ok(docsHtml.includes('id="webFloodIntelSection"'), 'docs/index.html must have #webFloodIntelSection');
});

it('Tab 2 displays online crawling agency telemetry badges', () => {
  assert.ok(templateHtml.includes('now.bkk'), 'Must show now.bkk telemetry badge');
  assert.ok(templateHtml.includes('dds.bkk'), 'Must show dds.bkk telemetry badge');
  assert.ok(templateHtml.includes('thaiwater'), 'Must show thaiwater telemetry badge');
  assert.ok(templateHtml.includes('tmd.radar'), 'Must show tmd.radar telemetry badge');
  assert.ok(templateHtml.includes('traffy'), 'Must show traffy telemetry badge');
  assert.ok(templateHtml.includes('doh/drr'), 'Must show doh/drr telemetry badge');
  assert.ok(templateHtml.includes('js100'), 'Must show js100 telemetry badge');
});

it('Tab 2 contains quick corridor chips for top flood routes', () => {
  const corridors = ['ศรีนครินทร์', 'รามอินทรา', 'กรุงเทพกรีฑา', 'สุขุมวิท 50', 'พระราม 3', 'เสรีไทย', 'ลาดกระบัง', 'คลองสามวา', 'สุคนธสวัสดิ์', 'มอเตอร์เวย์', 'พัฒนาการ'];
  corridors.forEach(c => {
    assert.ok(templateHtml.includes(`triggerWebFloodChip('${c}')`), `Must have chip trigger for ${c}`);
  });
});

it('WEB_FLOOD_INTEL_CORRIDORS database contains deep multi-dimensional telemetry data', () => {
  assert.ok(templateHtml.includes('const WEB_FLOOD_INTEL_CORRIDORS = ['), 'Must define WEB_FLOOD_INTEL_CORRIDORS');
  assert.ok(templateHtml.includes('function searchWebFloodIntel'), 'Must declare searchWebFloodIntel');
  assert.ok(templateHtml.includes('function triggerWebFloodChip'), 'Must declare triggerWebFloodChip');
  assert.ok(templateHtml.includes('function plotSearchedRouteOnMap'), 'Must declare plotSearchedRouteOnMap');
  assert.ok(templateHtml.includes('function initWebFloodIntel'), 'Must declare initWebFloodIntel');
});

it('Web Flood Intelligence search functions are exported to window', () => {
  assert.ok(templateHtml.includes('window.searchWebFloodIntel = searchWebFloodIntel'), 'Must export searchWebFloodIntel');
  assert.ok(templateHtml.includes('window.triggerWebFloodChip = triggerWebFloodChip'), 'Must export triggerWebFloodChip');
  assert.ok(templateHtml.includes('window.plotSearchedRouteOnMap = plotSearchedRouteOnMap'), 'Must export plotSearchedRouteOnMap');
  assert.ok(templateHtml.includes('window.initWebFloodIntel = initWebFloodIntel'), 'Must export initWebFloodIntel');
  assert.ok(templateHtml.includes('window.WEB_FLOOD_INTEL_CORRIDORS = WEB_FLOOD_INTEL_CORRIDORS'), 'Must export WEB_FLOOD_INTEL_CORRIDORS');
});

// ----------------------------------------------------------------------------
// 3. Execution Simulation: Corridor Search & Water Volume Analysis
// ----------------------------------------------------------------------------
it('Simulation: Corridor search returns water depth, rainfall, discharge rate, and passability matrix', () => {
  const sandbox = {
    document: {
      getElementById: (id) => {
        return {
          id: id,
          value: '',
          innerHTML: '',
          classList: { add: () => {}, remove: () => {} },
          style: {}
        };
      },
      querySelectorAll: () => []
    },
    safeCreateIcons: () => {},
    showToast: () => {},
    window: {}
  };

  vm.createContext(sandbox);

  // Extract WEB_FLOOD_INTEL_CORRIDORS and searchWebFloodIntel from templateHtml
  const match = templateHtml.match(/const WEB_FLOOD_INTEL_CORRIDORS = \[([\s\S]*?)\];\s*let currentWebFloodItem = null;\s*function initWebFloodIntel\(\) \{[\s\S]*?function searchWebFloodIntel\(rawQuery\) \{([\s\S]*?)\}\s*function plotSearchedRouteOnMap/);
  assert.ok(match, 'Must extract WEB_FLOOD_INTEL_CORRIDORS and searchWebFloodIntel code');

  const evalCode = `
    const WEB_FLOOD_INTEL_CORRIDORS = [${match[1]}];
    let currentWebFloodItem = null;
    function searchWebFloodIntel(rawQuery) {
      ${match[2]}
    }
    this.corridors = WEB_FLOOD_INTEL_CORRIDORS;
    this.searchFn = searchWebFloodIntel;
    this.getCurrent = () => currentWebFloodItem;
  `;
  vm.runInContext(evalCode, sandbox);

  assert.strictEqual(sandbox.corridors.length, 11, 'Must have 11 comprehensive corridors');

  // Test search for Srinakarin
  sandbox.searchFn('ศรีนครินทร์');
  let current = sandbox.getCurrent();
  assert.strictEqual(current.id, 'CORR-SRI');
  assert.strictEqual(current.waterDepthCm, 35);
  assert.strictEqual(current.rainAccumMm, 78.5);
  assert.strictEqual(current.status, 'CRITICAL');
  assert.strictEqual(current.passability.truckBcp.pass, true);
  assert.strictEqual(current.passability.sedan.pass, false);

  // Test search for Ramindra
  sandbox.searchFn('รามอินทรา');
  current = sandbox.getCurrent();
  assert.strictEqual(current.id, 'CORR-RAM');
  assert.strictEqual(current.waterDepthCm, 30);
  assert.strictEqual(current.rainAccumMm, 82.0);

  // Test search for Sukhumvit 50
  sandbox.searchFn('สุขุมวิท 50');
  current = sandbox.getCurrent();
  assert.strictEqual(current.id, 'CORR-SK50');
  assert.strictEqual(current.waterDepthCm, 12);
  assert.strictEqual(current.status, 'NORMAL');

  // Test search for Motorway (Safe detour)
  sandbox.searchFn('มอเตอร์เวย์');
  current = sandbox.getCurrent();
  assert.strictEqual(current.id, 'CORR-MOTOR');
  assert.strictEqual(current.waterDepthCm, 0);
  assert.strictEqual(current.status, 'NORMAL');
});

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests.\n`);
if (failed > 0) process.exit(1);
