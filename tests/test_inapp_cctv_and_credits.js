const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const templateHtml = fs.readFileSync(path.join(ROOT_DIR, 'Index_template.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'Index.html'), 'utf8');

console.log('\n=== TESTING IN-APP CCTV SURVEILLANCE & DEVELOPER CREDITS ===\n');

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

// 1. In-App CCTV Elements
it('Index_template.html contains #cctvInAppConsole (Live Monitor Wall in Tab 5)', () => {
  assert.ok(templateHtml.includes('id="cctvInAppConsole"'), 'Must have #cctvInAppConsole');
  assert.ok(templateHtml.includes('id="inlineCctvPlayerScreen"'), 'Must have #inlineCctvPlayerScreen');
  assert.ok(templateHtml.includes('id="inlineCctvChannelButtons"'), 'Must have #inlineCctvChannelButtons');
  assert.ok(templateHtml.includes('id="inlineCctvQuadViewport"'), 'Must have #inlineCctvQuadViewport');
});

it('In-app CCTV JavaScript functions exist and are exported to window', () => {
  assert.ok(templateHtml.includes('function initInlineCctvConsole'), 'Must have initInlineCctvConsole');
  assert.ok(templateHtml.includes('function switchInlineCctv'), 'Must have switchInlineCctv');
  assert.ok(templateHtml.includes('function setInlineCctvViewMode'), 'Must have setInlineCctvViewMode');
  assert.ok(templateHtml.includes('function captureCctvSnapshot'), 'Must have captureCctvSnapshot');
  assert.ok(templateHtml.includes('window.switchInlineCctv = switchInlineCctv'), 'Must export switchInlineCctv to window');
  assert.ok(templateHtml.includes('window.setInlineCctvViewMode = setInlineCctvViewMode'), 'Must export setInlineCctvViewMode to window');
});

// 2. Developer Credit Elements
it('Index_template.html contains Developer Credits footer with คุณวุฒิชัย (Wuttichai)', () => {
  assert.ok(templateHtml.includes('พัฒนาและดูแลระบบโดย'), 'Must have credit header');
  assert.ok(templateHtml.includes('คุณวุฒิชัย') || templateHtml.includes('Wuttichai'), 'Must have user credit');
  assert.ok(templateHtml.includes('Logistics Operations & Fleet Crisis Management'), 'Must have role credit');
  assert.ok(templateHtml.includes('กรุงเทพกรีฑา • รามอินทรา • สุขุมวิท 50 • พระราม 3'), 'Must mention all 4 branches');
});

// 3. Compiled Index.html Integrity
it('Compiled Index.html contains in-app CCTV console and footer credit', () => {
  assert.ok(indexHtml.includes('id="cctvInAppConsole"'), 'Index.html must have #cctvInAppConsole');
  assert.ok(indexHtml.includes('คุณวุฒิชัย'), 'Index.html must have คุณวุฒิชัย credit');
  assert.ok(Buffer.byteLength(indexHtml, 'utf8') > 2400000, 'Index.html must exceed 2.4MB');
});

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests.\n`);
if (failed > 0) process.exit(1);
