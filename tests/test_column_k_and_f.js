/**
 * ============================================================================
 * Automated Test Suite for Column K (Transferred Jobs) & Column F (Error/Postpone)
 * ============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const rCode = fs.readFileSync(path.join(ROOT_DIR, 'รหัส.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'Index.html'), 'utf8');
const initialData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'initial_data.json'), 'utf8'));

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✔ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log('\n=== TESTING COLUMN K & COLUMN F FEATURES ===\n');

// 1. Backend tests for Column K & Column F in รหัส.js
it('รหัส.js captures Column K header and transfer details (ผู้ทำรายการ & โอนงานมาจากวันที่)', () => {
  assert(rCode.includes('colK') || rCode.includes('cTransferHeader'), 'รหัส.js should determine colK index');
  assert(rCode.includes('isTransferred'), 'รหัส.js should include isTransferred flag');
  assert(rCode.includes('transferOperator'), 'รหัส.js should include transferOperator');
  assert(rCode.includes('transferDate'), 'รหัส.js should include transferDate');
  assert(rCode.includes('transferRaw'), 'รหัส.js should include transferRaw');
});

it('รหัส.js captures Column F phrase "ไม่สามารถเข้าส่งได้ เกิดข้อผิดพลาด (เลื่อนวันที่ส่ง)" as delivery failure', () => {
  assert(rCode.includes('เกิดข้อผิดพลาด'), 'รหัส.js should check for เกิดข้อผิดพลาด in rawColF');
  assert(rCode.includes('เลื่อนวันที่ส่ง'), 'รหัส.js should check for เลื่อนวันที่ส่ง in rawColF');
});

// 2. Initial Data tests
it('initial_data.json contains 619 transferred items with transferOperator and transferDate', () => {
  const transferred = initialData.filter(i => i.isTransferred);
  assert.strictEqual(transferred.length, 619, `Expected 619 transferred items, got ${transferred.length}`);
  const sample = transferred[0];
  assert(sample.transferOperator, 'Transferred item should have transferOperator');
  assert(sample.transferDate, 'Transferred item should have transferDate');
  assert(sample.transferRaw.includes('ผู้ทำรายการ'), 'transferRaw should contain ผู้ทำรายการ');
  assert(sample.transferRaw.includes('โอนงานมาจากวันที่'), 'transferRaw should contain โอนงานมาจากวันที่');
});

it('initial_data.json contains items with reason "ไม่สามารถเข้าส่งได้ เกิดข้อผิดพลาด (เลื่อนวันที่ส่ง)"', () => {
  const errorItems = initialData.filter(i => i.reason === 'ไม่สามารถเข้าส่งได้ เกิดข้อผิดพลาด (เลื่อนวันที่ส่ง)');
  assert(errorItems.length > 0, 'Should have items with reason "ไม่สามารถเข้าส่งได้ เกิดข้อผิดพลาด (เลื่อนวันที่ส่ง)"');
  assert(errorItems.length >= 100, `Expected at least 100 error items, got ${errorItems.length}`);
});

// 3. Client UI elements in Index.html
it('Index.html contains Transferred Orders Matrix Table in Tab 2 (Analytics)', () => {
  assert(indexHtml.includes('transferMatrixSearch'), 'Should contain transferMatrixSearch input');
  assert(indexHtml.includes('transferMatrixHead'), 'Should contain transferMatrixHead');
  assert(indexHtml.includes('transferMatrixBody'), 'Should contain transferMatrixBody');
  assert(indexHtml.includes('transferKpiTotal'), 'Should contain transferKpiTotal');
  assert(indexHtml.includes('transferKpiTrucks'), 'Should contain transferKpiTrucks');
});

it('Index.html contains Transferred Orders KPI chip in Tab 3 (Trucks)', () => {
  assert(indexHtml.includes('truckTabTotalTransfers'), 'Should contain truckTabTotalTransfers element');
});

it('Index.html contains filterTransfer select and updated filterStatus in Tab 4', () => {
  assert(indexHtml.includes('id="filterTransfer"'), 'Should contain filterTransfer select');
  assert(indexHtml.includes('FAIL_FLOOD'), 'filterStatus should have FAIL_FLOOD option');
  assert(indexHtml.includes('FAIL_ERROR'), 'filterStatus should have FAIL_ERROR option');
});

it('Index.html contains modalTransferBox in actionModal', () => {
  assert(indexHtml.includes('modalTransferBox'), 'actionModal should have modalTransferBox');
  assert(indexHtml.includes('modalTransferDate'), 'modalTransferBox should have modalTransferDate');
  assert(indexHtml.includes('modalTransferOperator'), 'modalTransferBox should have modalTransferOperator');
});

// 4. Client logic in VM Sandbox
it('Client JS functions getTransferMatrixData and renderTransferMatrix exist and calculate accurately', () => {
  const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, clientScript = '';
  while ((m = scriptRegex.exec(indexHtml)) !== null) {
    if (m[1].includes('getTransferMatrixData')) {
      clientScript = m[1];
      break;
    }
  }
  assert(clientScript, 'Should find main client script block containing getTransferMatrixData');

  const sandbox = {
    allItems: initialData,
    filteredItems: [...initialData],
    selectedBranch: 'ALL',
    selectedTrucks: new Set(),
    tailwind: { config: {} },
    lucide: { createIcons: () => {} },
    L: {
      marker: () => ({ bindPopup: () => {} }),
      markerClusterGroup: () => ({ clearLayers: () => {}, addLayer: () => {} }),
      map: () => ({ setView: () => {}, invalidateSize: () => {} }),
      tileLayer: () => ({ addTo: () => {} }),
      circleMarker: () => ({ bindPopup: () => {}, addTo: () => {} }),
      polyline: () => ({ bindPopup: () => {}, addTo: () => {} }),
      divIcon: () => ({})
    },
    Chart: function() { return { update: () => {}, data: { datasets: [{ data: [] }] } }; },
    document: {
      readyState: 'complete',
      addEventListener: () => {},
      getElementById: (id) => ({
        value: '',
        textContent: '',
        innerHTML: '',
        classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
        getContext: () => ({})
      }),
      querySelectorAll: () => []
    },
    window: {},
    console: console,
    Blob: function(content, opts) { return { content, opts }; },
    URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} }
  };
  sandbox.window = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(clientScript, sandbox);

  assert.strictEqual(typeof sandbox.getTransferMatrixData, 'function', 'getTransferMatrixData should be a function');
  assert.strictEqual(typeof sandbox.renderTransferMatrix, 'function', 'renderTransferMatrix should be a function');

  const matrix = sandbox.getTransferMatrixData();
  assert.strictEqual(matrix.totalTransfers, 619, `Expected 619 total transfers, got ${matrix.totalTransfers}`);
  assert(matrix.distinctDates.length >= 2, 'Should have at least 2 distinct transfer dates');
  assert(matrix.distinctDates.includes('26/09/2026'), 'Should include 26/09/2026');
  assert(matrix.distinctDates.includes('28/09/2026'), 'Should include 28/09/2026');
  assert(matrix.truckList.length > 0, 'Should have trucks in transfer matrix');
});

it('CSV export functions include Column K transfer columns', () => {
  assert(indexHtml.includes('งานโอนในวัน,โอนมาจากวันที่,ผู้ทำรายการโอน'), 'exportCSV should have transfer headers');
  assert(indexHtml.includes('exportTransferMatrixCSV'), 'Index.html should define exportTransferMatrixCSV');
});

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests.\n`);
if (failed > 0) process.exit(1);
