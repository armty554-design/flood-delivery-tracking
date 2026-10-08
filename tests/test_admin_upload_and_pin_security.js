/**
 * Automated Test: Admin PIN Security & Excel/CSV Uploader Engine
 */

const fs = require('fs');
const assert = require('assert');

console.log('=== TEST: ADMIN PIN SECURITY & EXCEL/CSV UPLOADER ENGINE ===\n');

// 1. Verify index.html and docs/index.html
['index.html', 'docs/index.html'].forEach(file => {
  const html = fs.readFileSync(file, 'utf8');

  // SheetJS library included
  assert(html.includes('xlsx.full.min.js'), `SheetJS CDN script must be loaded in ${file}`);

  // Admin PIN Gate Security: Check that NO leaked PIN 171938 appears in HTML
  assert(html.includes('id="adminAuthGate"'), `adminAuthGate exists in ${file}`);
  assert(html.includes('id="adminPinInput"'), `adminPinInput exists in ${file}`);
  assert(html.includes('type="password"'), `adminPinInput is type="password" in ${file}`);
  assert(!html.includes('placeholder="กรอกรหัส 171938"'), `Leaked placeholder must not exist in ${file}`);
  assert(!html.includes('⚡ เข้าสู่ระบบทันทีด้วยรหัสผ่าน 171938'), `Quick login bypass button must not exist in ${file}`);
  assert(!html.includes('(รหัสผ่านความปลอดภัย: <strong>171938</strong>)'), `Leaked footer PIN must not exist in ${file}`);

  // Uploader UI Elements
  assert(html.includes('id="adminDropZone"'), `adminDropZone exists in ${file}`);
  assert(html.includes('id="adminFileInput"'), `adminFileInput exists in ${file}`);
  assert(html.includes('id="adminUploadPreviewContainer"'), `adminUploadPreviewContainer exists in ${file}`);
  assert(html.includes('id="uploadStatRowCount"'), `uploadStatRowCount exists in ${file}`);
  assert(html.includes('id="uploadPreviewTableBody"'), `uploadPreviewTableBody exists in ${file}`);
  assert(html.includes('id="adminUploadProgressBarContainer"'), `adminUploadProgressBarContainer exists in ${file}`);
  assert(html.includes('id="btnAdminUpload"'), `btnAdminUpload exists in ${file}`);
  assert(html.includes('resetAdminUploadState'), `resetAdminUploadState trigger exists in ${file}`);

  console.log(`✔ PASS: HTML structure and PIN security validated in ${file}`);
});

// 2. Verify js/app.js and docs/js/app.js
['js/app.js', 'docs/js/app.js'].forEach(file => {
  const js = fs.readFileSync(file, 'utf8');

  // PIN validation logic
  assert(js.includes('verifyAdminPin'), `verifyAdminPin defined in ${file}`);
  assert(js.includes("'171938'"), `171938 verified in ${file}`);
  assert(!js.includes('❌ รหัสผ่านไม่ถูกต้อง (รหัสที่ถูกต้องคือ 171938)'), `PIN must not be leaked in error text in ${file}`);

  // Excel/CSV Parser & Upload logic
  assert(js.includes('function parseExcelOrCsvFile('), `parseExcelOrCsvFile function defined in ${file}`);
  assert(js.includes('function normalizeParsedDate('), `normalizeParsedDate function defined in ${file}`);
  assert(js.includes('function startParsedDataUpload('), `startParsedDataUpload function defined in ${file}`);
  assert(js.includes('function resetAdminUploadState('), `resetAdminUploadState function defined in ${file}`);
  assert(js.includes('function escapeHtml('), `escapeHtml function defined in ${file}`);
  assert(js.includes('XLSX.read'), `XLSX.read used for parsing workbook in ${file}`);
  assert(js.includes('XLSX.utils.sheet_to_json'), `XLSX sheet_to_json used in ${file}`);

  console.log(`✔ PASS: JavaScript Parser & PIN Security logic validated in ${file}`);
});

console.log('\n========================================================');
console.log('ALL ADMIN PIN SECURITY & EXCEL UPLOADER TESTS PASSED! 🛡️📊✨');
console.log('========================================================\n');
