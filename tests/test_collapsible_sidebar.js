// =========================================================================
// Automated Test Suite: Collapsible Left Sidebar Layout Verification
// =========================================================================
const fs = require('fs');
const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function test(condition, message) {
  if (condition) {
    console.log(`  ✔ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

console.log('=== TEST: COLLAPSIBLE LEFT SIDEBAR LAYOUT VERIFICATION ===\n');

// 1. Check HTML markup in index.html & docs/index.html
['index.html', 'docs/index.html'].forEach(filePath => {
  console.log(`[1. Verifying HTML Markup in ${filePath}]`);
  const html = fs.readFileSync(filePath, 'utf-8');

  // Sidebar container and backdrop
  test(html.includes('id="appSidebar"'), `${filePath} contains #appSidebar`);
  test(html.includes('id="sidebarBackdrop"'), `${filePath} contains #sidebarBackdrop`);
  test(html.includes('id="sidebarToggleBtn"'), `${filePath} contains #sidebarToggleBtn`);
  test(html.includes('id="sidebarToggleIcon"'), `${filePath} contains #sidebarToggleIcon`);
  test(html.includes('toggleSidebar()'), `${filePath} contains toggleSidebar() trigger`);
  test(html.includes('openMobileSidebar()'), `${filePath} contains openMobileSidebar() trigger`);
  test(html.includes('closeMobileSidebar()'), `${filePath} contains closeMobileSidebar() trigger`);

  // Main wrapper and top header
  test(html.includes('class="main-wrapper'), `${filePath} contains .main-wrapper`);
  test(html.includes('id="topBarActivePageTitle"'), `${filePath} contains #topBarActivePageTitle`);
  test(html.includes('id="topBarActivePageIcon"'), `${filePath} contains #topBarActivePageIcon`);
  test(html.includes('id="topBarClockText"'), `${filePath} contains #topBarClockText`);

  // Navigation Items
  test(html.includes('data-target="page-duration"'), `${filePath} contains page-duration in sidebar`);
  test(html.includes('data-target="page-truck-summary"'), `${filePath} contains page-truck-summary in sidebar`);
  test(html.includes('data-target="page-pending-map"'), `${filePath} contains page-pending-map in sidebar`);
  test(html.includes('data-target="page-cctv"'), `${filePath} contains page-cctv in sidebar`);
  test(html.includes('data-target="page-gistda-flood"'), `${filePath} contains page-gistda-flood in sidebar`);
  test(html.includes('data-target="page-details"'), `${filePath} contains page-details in sidebar`);
  test(html.includes('data-target="page-admin"'), `${filePath} contains page-admin in sidebar`);
});

// 2. Check CSS styles in css/app.css & docs/css/app.css
['css/app.css', 'docs/css/app.css'].forEach(cssPath => {
  console.log(`\n[2. Verifying CSS Styles in ${cssPath}]`);
  const css = fs.readFileSync(cssPath, 'utf-8');

  test(css.includes('.sidebar-wrapper'), `${cssPath} defines .sidebar-wrapper`);
  test(css.includes('body.sidebar-collapsed'), `${cssPath} defines body.sidebar-collapsed`);
  test(css.includes('body.sidebar-collapsed .sidebar-text'), `${cssPath} hides text when collapsed`);
  test(css.includes('body.mobile-sidebar-open'), `${cssPath} defines body.mobile-sidebar-open for responsive drawer`);
  test(css.includes('transition: width'), `${cssPath} has smooth width transition`);
});

// 3. Check JavaScript implementation in js/app.js & docs/js/app.js
['js/app.js', 'docs/js/app.js'].forEach(jsPath => {
  console.log(`\n[3. Verifying JavaScript Logic in ${jsPath}]`);
  const js = fs.readFileSync(jsPath, 'utf-8');

  test(js.includes('function initSidebar'), `${jsPath} defines initSidebar`);
  test(js.includes('function toggleSidebar'), `${jsPath} defines toggleSidebar`);
  test(js.includes('function openMobileSidebar'), `${jsPath} defines openMobileSidebar`);
  test(js.includes('function closeMobileSidebar'), `${jsPath} defines closeMobileSidebar`);
  test(js.includes('window.toggleSidebar = toggleSidebar'), `${jsPath} exports toggleSidebar to window`);
  test(js.includes('water_intel_sidebar_collapsed'), `${jsPath} persists sidebar state to localStorage`);
});

console.log(`\n========================================================`);
console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed out of ${passedTests + failedTests} tests`);
console.log(`========================================================\n`);

if (failedTests > 0) process.exit(1);
