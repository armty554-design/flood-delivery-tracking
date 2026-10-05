# Test Infrastructure & E2E Verification Architecture (Tab 5)

## 1. Overview
This document defines the automated, opaque-box, requirement-driven test infrastructure built for **Tab 5 ("รายงานระดับน้ำ & ข่าวสารน้ำท่วม Real-time")** of the Bangkok Flood Delivery Tracking System (4 สาขา: กรุงเทพกรีฑา, รามอินทรา, สุขุมวิท 50, พระราม 3).

The test suite ensures end-to-end functional integrity across both server-side Google Apps Script (`รหัส.js`) and client-side single page application (`Index_template.html`), as well as build and deployment pipelines (`generate_index.js`, `.clasp.json`, `.claspignore`).

---

## 2. Test Architecture & Engineering Principles

### 2.1 Pure Node.js Zero-Dependency Runner
- **Runner Path**: `tests/test_tab5_e2e.js`
- **Core Modules**: Node.js standard built-ins (`assert`, `fs`, `path`, `vm`, `child_process`).
- **Portability**: Operates natively in any environment without requiring `npm install` or external headless browsers (e.g. Puppeteer/Selenium).

### 2.2 Dual-Phase Verification Model
1. **Static AST & Template Structural Verification**:
   - Parses `Index_template.html` and `รหัส.js` for required DOM IDs, CSS classes, JavaScript functions, event handlers, and clasp deployment settings.
   - Verifies build artifacts, configuration files, and deployment targets against `PROJECT.md` and `ORIGINAL_REQUEST.md`.
2. **Authentic Node.js VM Sandbox Execution**:
   - **Backend GAS Sandbox (`gasSandbox`)**: Evaluates `รหัส.js` directly within an isolated VM context stubbing GAS globals (`SpreadsheetApp`, `ContentService`, `HtmlService`, `Utilities`, `Session`, `Logger`). Directly executes `getRealtimeFloodMonitoringData()` and `doGet(e)` JSON routing.
   - **Client DOM Sandbox (`clientSandbox`)**: Evaluates client script extracted from `Index.html` within a simulated DOM context, executing genuine production functions (`formatWaterLevel`, `calculateGaugePercentage`, `renderWaterStations`, `renderIncidents`, `renderFleetImpact`, `switchTab`, `changeWaterSyncInterval`, `selectSingleTruckAndSwitch`).
   - Zero self-certifying tests and zero mock duplicate function declarations.

---

## 3. Four-Tier Test Hierarchy & Coverage Matrix

| Tier | Name | Target Focus | Test Count | Features Covered |
| :--- | :--- | :--- | :---: | :--- |
| **Tier 1** | Feature Coverage | Primary happy paths & structural contracts for all features | 42 | F1, F2, F3, F4, F5, F6, F7 |
| **Tier 2** | Boundary & Corner Cases | Extreme values, empty states, missing attributes, offline fallback | 7 | B1 - B7 |
| **Tier 3** | Cross-Feature Combinations | Multi-component synchronization, correlation, event bridging | 5 | C1 - C5 |
| **Tier 4** | Real-World User Scenarios | End-to-end dispatch & coordination user journeys | 4 | J1 - J4 |
| **Total** | | | **58** | **Comprehensive Full Coverage** |

---

## 4. Feature Coverage Matrix (F1 to F7)

### Feature F1: Tab 5 Navigation & Container
- `F1-01`: Tab 5 button exists in navigation bar with Thai title ("รายงานระดับน้ำ & ข่าวสารน้ำท่วม Real-time").
- `F1-02`: Tab 5 content section container exists with `tabContent-*` ID (`tabContent-water` or `tabContent-flood`).
- `F1-03`: `switchTab()` function handles Tab 5 identifier and toggles container display.
- `F1-04`: Tab 5 container is hidden by default when initial tab is active (`map`).
- `F1-05`: Tab 5 button adheres to active/inactive styling conventions matching Tabs 1-4 (`rounded-xl font-semibold tab-btn`).
- `F1-06`: Tab 5 container layout supports responsive grid and desktop/mobile layout.

### Feature F2: Water Level Gauges in ม.รทก. (🟢/🟡/🔴)
- `F2-01`: Gauge panel covers คลองประเวศบุรีรมย์ (near คลังกรุงเทพกรีฑา).
- `F2-02`: Gauge panel covers คลองแสนแสบ (near คลังรามอินทรา / บางชัน).
- `F2-03`: Gauge panel covers คลองลาดพร้าว (near คลังรามอินทรา).
- `F2-04`: Gauge panel covers แม่น้ำเจ้าพระยา / พระราม 3 (near คลังพระราม 3).
- `F2-05`: Gauge metrics format numerical levels in ม.รทก. with 2 decimal places.
- `F2-06`: Status badge threshold evaluation accurately maps levels to 🟢 NORMAL, 🟡 WARNING, 🔴 CRITICAL.
- `F2-07`: Gauge card metadata includes normalLimit, warningLimit, criticalLimit, and affectedRoutes.

### Feature F3: Live Incident & Flood News Feed
- `F3-01`: Incident feed container and list element exist in template (`#incidentFeedList` / `#floodNewsContainer`).
- `F3-02`: Incident card displays district classification (พื้นที่เขต).
- `F3-03`: Incident card displays report timestamp (เวลาที่รายงาน).
- `F3-04`: Incident severity categorization supports CRITICAL, WARNING, and NORMAL/RESOLVED.
- `F3-05`: Incident card displays drainage status (สถานะการระบายน้ำ เช่น กำลังสูบระบายน้ำ).
- `F3-06`: Incident filtering function correctly filters by district query and severity.

### Feature F4: Delivery Fleet Impact Mapping
- `F4-01`: Fleet impact covers all 4 branches (กรุงเทพกรีฑา, รามอินทรา, สุขุมวิท 50, พระราม 3).
- `F4-02`: Impact mapping correctly classifies truck prefixes:
  - `16xxx` -> คลังกรุงเทพกรีฑา
  - `13xxx` -> คลังรามอินทรา
  - `50xxx` -> คลังสุขุมวิท 50 & คลังพระราม 3
- `F4-03`: Summary card calculates affected trucks count and risk level accurately.
- `F4-04`: Impact card includes actionable recommendation / detour guidance.
- `F4-05`: Quick truck click handler navigates to Tab 3 (trucks) or Tab 4 (table).

### Feature F5: Auto-Sync & Refresh Interval Controls
- `F5-01`: Manual refresh button exists with `refresh-cw` icon or action handler.
- `F5-02`: Refresh button triggers spinning state (`animate-spin`) during asynchronous load.
- `F5-03`: Auto-sync interval dropdown supports Off, 1m, 3m, 5m options.
- `F5-04`: Auto-sync interval management clears previous interval before setting new timer.
- `F5-05`: Last-updated timestamp display element exists in template.
- `F5-06`: Sync status text or indicator displays connection state.

### Feature F6: Backend Apps Script Data & Endpoints (`รหัส.js`)
- `F6-01`: `getRealtimeFloodMonitoringData()` function is declared in `รหัส.js`.
- `F6-02`: Top-level return schema contains `timestamp`, `waterStations`, `incidents`, `fleetImpact`.
- `F6-03`: Telemetry `waterStations` item schema validates types and limits.
- `F6-04`: Telemetry `incidents` item schema validates types and severity.
- `F6-05`: Telemetry `fleetImpact` item schema validates branches and truck routes.
- `F6-06`: Backend `doGet(e)` handler in `รหัส.js` handles errors gracefully with try/catch.

### Feature F7: Build & Clasp Pipeline Validation
- `F7-01`: `generate_index.js` reads `Index_template.html` and replaces `/*INITIAL_DATA_PLACEHOLDER*/`.
- `F7-02`: Compiled `Index.html` exists and exceeds 1,000,000 bytes.
- `F7-03`: `.claspignore` explicitly excludes `.agents/**` to protect agent workspace.
- `F7-04`: `.claspignore` explicitly excludes `tests/**` to keep GAS deployment lean.
- `F7-05`: `.clasp.json` contains correct target scriptId (`1tlfEVvW3fSy00kYJOvvvZ30lpVmgwHz3OAyf4bEp3WAER96emiV5aS5c`).
- `F7-06`: Target Deployment ID matches specification (`AKfycbwnP-RK798xf8HsPJESYIwlTEnx0-edSgViZ43uOMczdcbWC7Rv7t_MgLT2H5WYlidn`).

---

## 5. Boundary & Corner Cases (Tier 2)
- `T2-01`: Empty `waterStations` array rendered without throwing unhandled exceptions.
- `T2-02`: Empty `incidents` array displays a friendly "ไม่พบรายงานสถานการณ์น้ำท่วมขัง" empty state.
- `T2-03`: Extreme gauge overflow (level > 2x criticalLimit, e.g. 1.90 ม.รทก. vs 0.80) clamps progress bar width at 100% to preserve UI layout.
- `T2-04`: Negative gauge levels (e.g. -0.45 ม.รทก. during drought) clamp bar width at 0% safely.
- `T2-05`: Non-existent district query yields empty search state without crashing.
- `T2-06`: Offline fallback activates seamlessly when `google.script.run` is undefined (standalone browser mode).
- `T2-07`: Missing optional telemetry attributes (null `drainageStatus`, null `affectedTrucks`) sanitized with default fallbacks.

---

## 6. Cross-Feature Combinations (Tier 3)
- `T3-01`: Water canal critical status (คลองประเวศฯ CRITICAL) escalates corresponding branch risk to `HIGH`.
- `T3-02`: Incident district (บางกะปิ / เสรีไทย) correlates directly with delivery trucks operating in that district from real dataset (16201, 16204).
- `T3-03`: Single refresh dispatch simultaneously updates gauges, incident feed, and fleet impact state.
- `T3-04`: Global 4-branch selector cross-filters Tab 5 view for the selected branch.
- `T3-05`: Clicking truck badge from Tab 5 fleet card switches to Tab 3 or Tab 4 with filter pre-applied.

---

## 7. Real-World End-to-End Scenarios (Tier 4)
- `T4-01`: Dispatcher monitors all 4 branches across Bangkok waterways (Prawet, Saen Saep, Lat Phrao, Chao Phraya/Rama 3).
- `T4-02`: Ramindra delivery coordinator filters flood incident to truck 13101 and receives recommended detour advisory.
- `T4-03`: Real-time monitoring cycle with 1-minute auto-refresh and spinner animation.
- `T4-04`: Resilient multi-tab user navigation cycling through all 5 tabs without DOM or state corruption.

---

## 8. Authoritative Interface Contract Reference

Server endpoint `getRealtimeFloodMonitoringData()` in `รหัส.js` returns:

```json
{
  "timestamp": "2026-09-30T14:30:00.000Z",
  "waterStations": [
    {
      "id": "ST-01",
      "name": "สถานีคลองประเวศฯ - ประตูระบายน้ำกระทุ่มเสือปลา",
      "canal": "คลองประเวศบุรีรมย์",
      "branch": "คลังกรุงเทพกรีฑา",
      "district": "ประเวศ",
      "level": 0.85,
      "unit": "ม.รทก.",
      "status": "CRITICAL",
      "statusLabel": "วิกฤตล้นตลิ่ง",
      "normalLimit": 0.30,
      "warningLimit": 0.60,
      "criticalLimit": 0.80,
      "affectedRoutes": ["16103", "16201", "16204", "16302"]
    }
  ],
  "incidents": [
    {
      "id": "INC-001",
      "timestamp": "2026-09-30 14:15",
      "district": "บางกะปิ",
      "location": "ถ.เสรีไทย ปากซอยเสรีไทย 43",
      "severity": "CRITICAL",
      "severityLabel": "น้ำท่วมสูง 25-30 ซม. ปิดการจราจร 2 ช่องทาง",
      "drainageStatus": "กำลังสูบระบายน้ำ",
      "affectedBranch": "คลังกรุงเทพกรีฑา",
      "affectedTrucks": ["16201", "16204"]
    }
  ],
  "fleetImpact": [
    {
      "branch": "คลังกรุงเทพกรีฑา",
      "riskLevel": "HIGH",
      "affectedTrucksCount": 8,
      "trucks": ["16103", "16201", "16204", "16302", "16304"],
      "recommendedAction": "หลีกเลี่ยงแนวคลองประเวศฯ และ ถ.เสรีไทย แนะนำใช้ทางเลี่ยงมอเตอร์เวย์"
    }
  ]
}
```

---

## 9. Running Tests

```bash
# Standard run (exits 0 if all pass, 1 if any failure):
node tests/test_tab5_e2e.js

# Graceful run (always exits 0, useful for inspecting progress during development):
node tests/test_tab5_e2e.js --graceful
```
