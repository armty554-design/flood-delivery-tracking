/**
 * ============================================================================
 * Automated Test Suite for Dedicated Live CCTV Surveillance & Traffic Portal Tab
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

console.log('\n=== TESTING DEDICATED LIVE CCTV PORTAL TAB (หน้ากล้องสดออนไลน์เต็มรูปแบบ) ===\n');

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
// 1. Navigation Controls in Sidebar, Header Pills, and Mobile Navigation
// ----------------------------------------------------------------------------
it('Desktop Sidebar contains #tabBtn-cctv for dedicated Live CCTV Surveillance Portal', () => {
  assert.ok(templateHtml.includes('id="tabBtn-cctv"'), 'Must have #tabBtn-cctv in template');
  assert.ok(templateHtml.includes("switchTab('cctv')"), "Must bind onclick to switchTab('cctv')");
  assert.ok(indexHtml.includes('id="tabBtn-cctv"'), 'Must have #tabBtn-cctv in Index.html');
  assert.ok(docsHtml.includes('id="tabBtn-cctv"'), 'Must have #tabBtn-cctv in docs/index.html');
});

it('Top Header Pills contains #headerTab-cctv quick navigation pill', () => {
  assert.ok(templateHtml.includes('id="headerTab-cctv"'), 'Must have #headerTab-cctv in template');
  assert.ok(indexHtml.includes('id="headerTab-cctv"'), 'Must have #headerTab-cctv in Index.html');
  assert.ok(docsHtml.includes('id="headerTab-cctv"'), 'Must have #headerTab-cctv in docs/index.html');
});

it('Mobile Navigation bar contains #mobileTab-cctv pill button', () => {
  assert.ok(templateHtml.includes('id="mobileTab-cctv"'), 'Must have #mobileTab-cctv in template');
  assert.ok(indexHtml.includes('id="mobileTab-cctv"'), 'Must have #mobileTab-cctv in Index.html');
});

// ----------------------------------------------------------------------------
// 2. Dedicated Section (#tabContent-cctv) Structure
// ----------------------------------------------------------------------------
it('Contains #tabContent-cctv with dedicated large viewport and interactive iframe', () => {
  assert.ok(templateHtml.includes('id="tabContent-cctv"'), 'Must have #tabContent-cctv container');
  assert.ok(templateHtml.includes('id="dedicatedCctvPortalFrame"'), 'Must have #dedicatedCctvPortalFrame iframe');
  assert.ok(templateHtml.includes('https://trafficvision.live/country/thailand'), 'Must embed TrafficVision Thailand');
  assert.ok(indexHtml.includes('id="tabContent-cctv"'), 'Index.html must have #tabContent-cctv');
  assert.ok(docsHtml.includes('id="tabContent-cctv"'), 'docs/index.html must have #tabContent-cctv');
});

it('Dedicated CCTV section provides portal switching, refresh, fullscreen, and shortcuts', () => {
  assert.ok(templateHtml.includes('id="dedicatedPortalSelect"'), 'Must have portal select dropdown');
  assert.ok(templateHtml.includes('switchDedicatedPortalSource('), 'Must call switchDedicatedPortalSource');
  assert.ok(templateHtml.includes('refreshDedicatedPortalFrame()'), 'Must call refreshDedicatedPortalFrame');
  assert.ok(templateHtml.includes('toggleDedicatedPortalFullscreen()'), 'Must call toggleDedicatedPortalFullscreen');
  assert.ok(templateHtml.includes('id="dedicatedCctvQuadGrid"'), 'Must have 4 branch cross-reference grid');
});

// ----------------------------------------------------------------------------
// 3. Tab 3 Cross-Link to Dedicated Page
// ----------------------------------------------------------------------------
it('Tab 3 includes banner linking to dedicated live CCTV portal page', () => {
  assert.ok(templateHtml.includes('เปิดหน้ากล้องสดเต็มจอ ↗'), 'Tab 3 must have button to open dedicated tab');
  assert.ok(templateHtml.includes("onclick=\"switchTab('cctv')\""), 'Must trigger switchTab(\'cctv\')');
});

// ----------------------------------------------------------------------------
// 4. JavaScript Functions, Routing, and Window Bindings
// ----------------------------------------------------------------------------
it('JavaScript functions are declared and exported to window', () => {
  assert.ok(templateHtml.includes('function initDedicatedCctvPortal'), 'Must declare initDedicatedCctvPortal');
  assert.ok(templateHtml.includes('function switchDedicatedPortalSource'), 'Must declare switchDedicatedPortalSource');
  assert.ok(templateHtml.includes('function refreshDedicatedPortalFrame'), 'Must declare refreshDedicatedPortalFrame');
  assert.ok(templateHtml.includes('function toggleDedicatedPortalFullscreen'), 'Must declare toggleDedicatedPortalFullscreen');
  assert.ok(templateHtml.includes('window.initDedicatedCctvPortal = initDedicatedCctvPortal'), 'Must export initDedicatedCctvPortal');
  assert.ok(templateHtml.includes('window.switchDedicatedPortalSource = switchDedicatedPortalSource'), 'Must export switchDedicatedPortalSource');
});

it('URL Routing engine supports cctv deep link routing', () => {
  assert.ok(templateHtml.includes("'cctv': 'cctv'"), 'TAB_ROUTING_MAP must map cctv to cctv');
  assert.ok(templateHtml.includes("'live-cctv': 'cctv'"), 'TAB_ROUTING_MAP must map live-cctv to cctv');
  assert.ok(templateHtml.includes("'portal': 'cctv'"), 'TAB_ROUTING_MAP must map portal to cctv');
});

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests.\n`);
if (failed > 0) process.exit(1);
