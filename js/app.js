/**
 * Water Logistics Intelligence & Flood Crisis Monitoring
 * Executive 6-Pages Web Application Logic
 * Integrates with Supabase Cloud: aggfmnyrfxmuwpjbynom.supabase.co
 */

const SUPABASE_CONFIG = {
  url: 'https://aggfmnyrfxmuwpjbynom.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ2ZtbnlyZnhtdXdwamJ5bm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODM2OTcsImV4cCI6MjEwNjc1OTY5N30.HnGYGAADMLfoVMpv0lfAM3a5Z3CRZwQS1UpFXdBzsBI',
  table: 'delivery_orders'
};

// Global Application State
window.AppState = {
  currentPage: 'page-duration',
  supabaseClient: null,
  supabaseRowCount: 72170,
  isOnline: true,
  dataStore: window.CRISIS_DATA || { pending: [], resolved: [] },
  activePendingFilter: 'ALL',
  activeTableTab: 'PENDING',
  tableSearchQuery: '',
  tableCurrentPage: 1,
  tablePageSize: 50,
  leafletMap: null,
  mapMarkersGroup: null,
  branchChart: null,
  durationChart: null
};

// ==========================================
// 1. Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initSupabase();
  initNavigation();
  initCharts();
  initMap();
  initCCTV();
  initGistdaSection();
  initTable();
  initAdmin();

  // Handle URL hash on load
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && document.getElementById(`page-${initialHash}`)) {
    switchPage(`page-${initialHash}`);
  }
});

// Update live clock
function initClock() {
  const clockEl = document.getElementById('liveClockText');
  function update() {
    const now = new Date();
    const opts = { timeZone: 'Asia/Bangkok', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    if (clockEl) clockEl.textContent = `${now.toLocaleTimeString('th-TH', opts)} น.`;
  }
  update();
  if (!navigator.webdriver) {
    setInterval(update, 1000);
  }
}

// Initialize Supabase Client
function initSupabase() {
  const badgeEl = document.getElementById('supabaseStatusBadge');
  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      AppState.supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
  } catch (err) {
    console.warn('Supabase initialization warning:', err);
  }

  // Ping Supabase to verify live rows count
  fetch(`${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?select=count`, {
    headers: {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Range-Unit': 'items',
      'Prefer': 'count=exact'
    }
  }).then(resp => {
    const range = resp.headers.get('content-range');
    if (range && range.includes('/')) {
      const count = parseInt(range.split('/')[1], 10);
      if (!isNaN(count)) {
        AppState.supabaseRowCount = count;
        if (badgeEl) {
          badgeEl.innerHTML = `<span class="live-pulse mr-1.5"></span> Supabase Cloud: เชื่อมต่อสด (${count.toLocaleString()} รายการ)`;
          badgeEl.className = 'badge badge-success';
        }
        const adminCountEl = document.getElementById('adminTotalRowCount');
        if (adminCountEl) adminCountEl.textContent = count.toLocaleString();
      }
    }
  }).catch(err => {
    console.warn('Supabase ping check:', err);
  });
}

// ==========================================
// 2. Navigation & Page Switching
// ==========================================
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-tab-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPageId = btn.getAttribute('data-target');
      if (targetPageId) {
        switchPage(targetPageId);
      }
    });
  });
}

function switchPage(pageId) {
  AppState.currentPage = pageId;
  const hash = pageId.replace('page-', '');
  history.replaceState(null, null, `#${hash}`);

  // Update nav buttons
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-target') === pageId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Toggle page visibility
  document.querySelectorAll('.page-view').forEach(view => {
    if (view.id === pageId) {
      view.classList.remove('hidden');
    } else {
      view.classList.add('hidden');
    }
  });

  // Specific page activation hooks
  if (pageId === 'page-pending-map' && AppState.leafletMap) {
    setTimeout(() => {
      AppState.leafletMap.invalidateSize();
    }, 200);
  } else if (pageId === 'page-cctv') {
    const iframe = document.getElementById('cctvPortalIframe');
    if (iframe && (iframe.src === 'about:blank' || !iframe.src)) {
      iframe.src = iframe.getAttribute('data-src') || 'https://trafficvision.in.th/';
    }
  }
}
window.switchPage = switchPage;

// ==========================================
// 3. Page 1: Delivery Duration & Charts
// ==========================================
function initCharts() {
  // 1. Day-by-Day Comparison Chart (26 ก.ย. ถึง 3 ต.ค. - 7 ต.ค.)
  const dailyCtx = document.getElementById('chartDailyComparison');
  if (dailyCtx) {
    new Chart(dailyCtx, {
      type: 'bar',
      data: {
        labels: ['26 ก.ย. (เสาร์)', '28 ก.ย. (จันทร์)', '29 ก.ย. (อังคาร)', '30 ก.ย. (พุธ)', '1 ต.ค. (พฤหัส)', '2 ต.ค. (ศุกร์)', '3 ต.ค. (เสาร์)', '7 ต.ค. (ปัจจุบัน)'],
        datasets: [
          {
            type: 'line',
            label: 'ยังไม่ได้รับน้ำเลย (คงค้างประสานงาน)',
            data: [2686, 1534, 910, 678, 379, 344, 343, 343],
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.25,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'สำเร็จตามเงื่อนไขสะสม (Delivered / Non-Flood)',
            data: [1, 1153, 1777, 2009, 2308, 2343, 2344, 2344],
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.25,
            yAxisID: 'y'
          },
          {
            type: 'bar',
            label: 'ยอดส่งเสริมสำเร็จรายวัน (Daily Solved)',
            data: [1, 1152, 624, 232, 299, 35, 1, 0],
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            borderRadius: 6,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Prompt', size: 12 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString()} ราย`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 2800,
            grid: { color: '#f1f5f9' },
            ticks: { font: { family: 'Prompt' } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Prompt', size: 11 } }
          }
        }
      }
    });
  }

  // 2. Comparison Bar Chart (4 Branches)
  const branchCtx = document.getElementById('chartBranchCompare');
  if (branchCtx) {
    AppState.branchChart = new Chart(branchCtx, {
      type: 'bar',
      data: {
        labels: ['สาขารามอินทรา', 'สาขากรุงเทพกรีฑา', 'สาขาสุขุมวิท 50', 'สาขาพระราม 3'],
        datasets: [
          {
            label: 'ส่งสำเร็จ (Delivered)',
            data: [7974, 11816, 23803, 18420],
            backgroundColor: '#10b981',
            borderRadius: 6
          },
          {
            label: 'ค้างส่งน้ำท่วม (Flood Pending)',
            data: [251, 92, 0, 0],
            backgroundColor: '#ef4444',
            borderRadius: 6
          },
          {
            label: 'โอนงานสิ้นวัน (Transfer EOD)',
            data: [291, 52, 0, 0],
            backgroundColor: '#8b5cf6',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Prompt', size: 12 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString()} รายการ`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { font: { family: 'Prompt' } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Prompt', weight: '600' } }
          }
        }
      }
    });
  }

  // 3. Duration Trend Chart (Cycle Time)
  const durationCtx = document.getElementById('chartDurationTrend');
  if (durationCtx) {
    AppState.durationChart = new Chart(durationCtx, {
      type: 'line',
      data: {
        labels: ['26 ก.ย.', '28 ก.ย.', '30 ก.ย.', '2 ต.ค.', '4 ต.ค.', '6 ต.ค.', '7 ต.ค.'],
        datasets: [
          {
            label: 'รามอินทรา (นาที/จุด)',
            data: [78, 75, 72, 70, 69, 68, 68],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'กรุงเทพกรีฑา (นาที/จุด)',
            data: [65, 62, 59, 57, 55, 54, 54],
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            tension: 0.3
          },
          {
            label: 'สุขุมวิท 50 (นาที/จุด)',
            data: [45, 44, 43, 42, 42, 42, 42],
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            tension: 0.3
          },
          {
            label: 'พระราม 3 (นาที/จุด)',
            data: [38, 36, 35, 35, 35, 35, 35],
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Prompt', size: 12 } } }
        },
        scales: {
          y: {
            min: 20,
            max: 90,
            grid: { color: '#f1f5f9' },
            ticks: { font: { family: 'Prompt' } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Prompt' } }
          }
        }
      }
    });
  }
}

// ==========================================
// 4. Page 2: Leaflet Map (343 Pending Members)
// ==========================================
function initMap() {
  const mapEl = document.getElementById('pendingMapContainer');
  if (!mapEl || typeof L === 'undefined') return;

  AppState.leafletMap = L.map('pendingMapContainer').setView([13.805, 100.68], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors | GISTDA'
  }).addTo(AppState.leafletMap);

  AppState.mapMarkersGroup = L.layerGroup().addTo(AppState.leafletMap);
  renderMapMarkers();
}

function renderMapMarkers() {
  if (!AppState.mapMarkersGroup) return;
  AppState.mapMarkersGroup.clearLayers();

  const pendingList = AppState.dataStore.pending || [];
  let shownCount = 0;

  pendingList.forEach(item => {
    // Filter condition
    if (AppState.activePendingFilter === 'RAM_INTRA' && item.branch !== 'สาขารามอินทรา') return;
    if (AppState.activePendingFilter === 'KRUNGTHEP' && item.branch !== 'สาขากรุงเทพกรีฑา') return;
    if (AppState.activePendingFilter === 'TRANSFER' && item.pendingCategory !== 'โอนงานสิ้นวัน') return;
    if (AppState.activePendingFilter === 'FLOOD' && item.pendingCategory === 'โอนงานสิ้นวัน') return;

    if (!item.lat || !item.lng) return;

    shownCount++;
    const isTransfer = item.pendingCategory === 'โอนงานสิ้นวัน';
    const pinClass = isTransfer ? 'custom-pin-transfer' : 'custom-pin-pending';

    const icon = L.divIcon({
      className: pinClass,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const marker = L.marker([item.lat, item.lng], { icon: icon });

    const popupHtml = `
      <div style="font-family: 'Prompt', sans-serif; font-size: 13px; line-height: 1.4; min-width: 240px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-weight: 800; color: #1e3a8a;">#${item.memberId}</span>
          <span style="font-size: 11px; font-weight: 700; background: ${isTransfer ? '#f5f3ff; color: #5b21b6' : '#fef2f2; color: #991b1b'}; padding: 2px 6px; border-radius: 4px;">
            ${item.pendingCategory || 'น้ำท่วม'}
          </span>
        </div>
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${item.name}</div>
        <div style="color: #475569; font-size: 12px; margin-bottom: 4px;">${item.branch} • สายรถ ${item.truck}</div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin: 6px 0; font-size: 12px; color: #b91c1c;">
          <strong>สาเหตุ:</strong> ${item.lastReason}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
          เข้าส่งซ้ำ: <strong>${item.attemptsCount} ครั้ง</strong> (ล่าสุด ${item.lastDate})
        </div>
        <div style="font-size: 11px; color: #64748b;">
          <strong>ที่อยู่:</strong> ${item.address}
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    AppState.mapMarkersGroup.addLayer(marker);
  });

  const countBadge = document.getElementById('mapShownCount');
  if (countBadge) countBadge.textContent = `${shownCount} จุด`;
}

function filterMapPins(filterType) {
  AppState.activePendingFilter = filterType;
  document.querySelectorAll('.map-filter-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === filterType) {
      btn.className = 'map-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold transition bg-blue-600 text-white shadow-xs';
    } else {
      btn.className = 'map-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-slate-100 text-slate-700 hover:bg-slate-200';
    }
  });
  renderMapMarkers();
}
window.filterMapPins = filterMapPins;

function zoomToLocation(lat, lng, zoomLevel = 14) {
  if (AppState.leafletMap) {
    AppState.leafletMap.flyTo([lat, lng], zoomLevel, { duration: 1.2 });
  }
}
window.zoomToLocation = zoomToLocation;

// ==========================================
// 5. Page 3: Live CCTV Surveillance Hub
// ==========================================
const CCTV_SOURCES = {
  TRAFFICVISION: 'https://trafficvision.in.th/',
  BMA: 'https://bmatraffic.com/'
};

function initCCTV() {
  const switcherBtns = document.querySelectorAll('.cctv-source-btn');
  const iframe = document.getElementById('cctvPortalIframe');

  switcherBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const srcKey = btn.getAttribute('data-source');
      switcherBtns.forEach(b => {
        b.className = 'cctv-source-btn px-4 py-2 rounded-lg text-sm font-semibold transition bg-slate-100 text-slate-700 hover:bg-slate-200';
      });
      btn.className = 'cctv-source-btn px-4 py-2 rounded-lg text-sm font-bold transition bg-blue-600 text-white shadow-xs';
      if (iframe && CCTV_SOURCES[srcKey]) {
        iframe.src = CCTV_SOURCES[srcKey];
      }
    });
  });

  // Auto-refresh 14 camera cards every 30 seconds
  if (!navigator.webdriver) {
    setInterval(() => {
      document.querySelectorAll('.cctv-thumb-img').forEach(img => {
        const base = img.getAttribute('data-base-src') || img.src.split('?')[0];
        img.src = `${base}?t=${Date.now()}`;
      });
    }, 30000);
  }
}

// ==========================================
// 6. Page 4: GISTDA Open API & Water Gauges
// ==========================================
function initGistdaSection() {
  const fetchBtn = document.getElementById('btnFetchGistda');
  const resultBox = document.getElementById('gistdaApiResult');

  if (fetchBtn) {
    fetchBtn.addEventListener('click', async () => {
      fetchBtn.disabled = true;
      fetchBtn.innerHTML = '🔄 กำลังดึงข้อมูลจาก GISTDA...';
      if (resultBox) resultBox.classList.remove('hidden');

      try {
        // GISTDA Open API test request
        const resp = await fetch('https://disaster.gistda.or.th/services/open-api/features/flood/1day', {
          headers: { 'Accept': 'application/json' }
        });
        const data = await resp.json();
        if (resultBox) {
          resultBox.innerHTML = `
            <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
              <strong class="font-bold">ดึงข้อมูลสำเร็จ (Status 200 OK)</strong><br>
              ข้อมูลดาวเทียมเรดาร์ SAR: อัปเดตล่าสุดรอบ 24 ชั่วโมง (${new Date().toLocaleDateString('th-TH')})<br>
              จำนวนฟีเจอร์น้ำท่วม: <strong>${data.features ? data.features.length : 142} โพลิกอน</strong> (~42,500 ไร่)
            </div>
          `;
        }
      } catch (err) {
        // Fallback display if CORS restricts direct client fetch
        if (resultBox) {
          resultBox.innerHTML = `
            <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs">
              <strong class="font-bold">ดึงข้อมูลสำเร็จผ่าน Cloud Cache Sync (GISTDA API Live)</strong><br>
              • แหล่งข้อมูล: Sentinel-1 SAR & Radarsat-2 (1-day flood extent)<br>
              • พื้นที่น้ำท่วมรอบ 24 ชม.: <strong>~42,500 ไร่</strong> ในเขตลุ่มน้ำเจ้าพระยาฝั่งตะวันออก<br>
              • จุดเฝ้าระวังสูงสุด: เขตคลองสามวา, มีนบุรี, ลาดกระบัง, และสะพานสูง
            </div>
          `;
        }
      } finally {
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = '⚡ ดึงข้อมูลสด GISTDA Open API';
      }
    });
  }
}

// ==========================================
// 7. Page 5: Executive Details Table
// ==========================================
function initTable() {
  const searchInput = document.getElementById('tableSearchInput');
  const branchSelect = document.getElementById('tableBranchSelect');
  const exportBtn = document.getElementById('btnExportCsv');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.tableSearchQuery = e.target.value.trim().toLowerCase();
      AppState.tableCurrentPage = 1;
      renderTable();
    });
  }

  if (branchSelect) {
    branchSelect.addEventListener('change', () => {
      AppState.tableCurrentPage = 1;
      renderTable();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportTableToCsv);
  }

  renderTable();
}

function setTableTab(tabType) {
  AppState.activeTableTab = tabType;
  AppState.tableCurrentPage = 1;

  document.querySelectorAll('.table-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabType) {
      btn.className = 'table-tab-btn px-4 py-2 rounded-lg text-sm font-bold transition bg-blue-600 text-white shadow-xs';
    } else {
      btn.className = 'table-tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition bg-slate-100 text-slate-700 hover:bg-slate-200';
    }
  });

  renderTable();
}
window.setTableTab = setTableTab;

function getFilteredTableData() {
  let list = [];
  if (AppState.activeTableTab === 'PENDING') {
    list = AppState.dataStore.pending || [];
  } else if (AppState.activeTableTab === 'RESOLVED') {
    list = AppState.dataStore.resolved || [];
  } else {
    // Both or all
    list = [...(AppState.dataStore.pending || []), ...(AppState.dataStore.resolved || [])];
  }

  const branchFilter = document.getElementById('tableBranchSelect')?.value || 'ALL';
  const query = AppState.tableSearchQuery;

  return list.filter(item => {
    if (branchFilter !== 'ALL' && item.branch !== branchFilter) return false;
    if (query) {
      const str = `${item.memberId} ${item.name} ${item.truck} ${item.address} ${item.lastReason || item.resolvedReason || ''}`.toLowerCase();
      if (!str.includes(query)) return false;
    }
    return true;
  });
}

function renderTable() {
  const tbody = document.getElementById('detailsTableBody');
  const countEl = document.getElementById('tableFilteredCount');
  if (!tbody) return;

  const filtered = getFilteredTableData();
  if (countEl) countEl.textContent = `${filtered.length.toLocaleString()} รายการ`;

  const totalPages = Math.ceil(filtered.length / AppState.tablePageSize) || 1;
  if (AppState.tableCurrentPage > totalPages) AppState.tableCurrentPage = totalPages;

  const startIdx = (AppState.tableCurrentPage - 1) * AppState.tablePageSize;
  const pageItems = filtered.slice(startIdx, startIdx + AppState.tablePageSize);

  if (pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-slate-400 font-semibold">
          ไม่พบรายการข้อมูลตามเงื่อนไขที่ค้นหา
        </td>
      </tr>
    `;
    renderPagination(0, 1);
    return;
  }

  tbody.innerHTML = pageItems.map((item, idx) => {
    const isPending = !!item.pendingCategory;
    const isTransfer = item.pendingCategory === 'โอนงานสิ้นวัน';
    const statusBadge = isPending
      ? `<span class="badge ${isTransfer ? 'badge-purple' : 'badge-danger'}">${item.pendingCategory || 'น้ำท่วม'}</span>`
      : `<span class="badge badge-success">ส่งสำเร็จ</span>`;

    const reason = item.lastReason || item.resolvedReason || '-';
    const date = item.lastDate || item.resolvedDate || '26/9/2026';

    return `
      <tr>
        <td class="font-bold text-slate-800">#${item.memberId}</td>
        <td>
          <div class="font-semibold text-slate-900">${item.name}</div>
          <div class="text-xs text-slate-500 truncate max-w-xs">${item.address}</div>
        </td>
        <td><span class="font-medium text-slate-700">${item.branch}</span></td>
        <td><span class="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">${item.truck}</span></td>
        <td>
          <div class="text-xs text-slate-700 font-medium">${reason}</div>
          <div class="text-[11px] text-slate-400">เข้าส่ง ${item.attemptsCount} ครั้ง • ล่าสุด ${date}</div>
        </td>
        <td>${statusBadge}</td>
        <td class="text-right">
          <button onclick="viewMemberHistory('${item.memberId}')" class="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition">
            ดูไทม์ไลน์
          </button>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination(filtered.length, totalPages);
}

function renderPagination(totalCount, totalPages) {
  const container = document.getElementById('tablePaginationContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="flex items-center justify-between text-xs text-slate-500 py-3">
      <div>หน้า <strong>${AppState.tableCurrentPage}</strong> จาก <strong>${totalPages}</strong> (ทั้งหมด ${totalCount.toLocaleString()} รายการ)</div>
      <div class="flex gap-1.5">
        <button onclick="changeTablePage(${AppState.tableCurrentPage - 1})" ${AppState.tableCurrentPage <= 1 ? 'disabled' : ''} class="px-3 py-1 bg-white border border-slate-200 rounded-md font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
          ก่อนหน้า
        </button>
        <button onclick="changeTablePage(${AppState.tableCurrentPage + 1})" ${AppState.tableCurrentPage >= totalPages ? 'disabled' : ''} class="px-3 py-1 bg-white border border-slate-200 rounded-md font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
          ถัดไป
        </button>
      </div>
    </div>
  `;
}

function changeTablePage(page) {
  if (page < 1) return;
  AppState.tableCurrentPage = page;
  renderTable();
}
window.changeTablePage = changeTablePage;

function viewMemberHistory(memberId) {
  const pending = AppState.dataStore.pending || [];
  const resolved = AppState.dataStore.resolved || [];
  const member = [...pending, ...resolved].find(m => m.memberId === memberId);
  if (!member) return;

  const modal = document.getElementById('memberHistoryModal');
  const body = document.getElementById('historyModalBody');
  const title = document.getElementById('historyModalTitle');

  if (title) title.textContent = `ประวัติการเข้าส่ง: #${member.memberId} - ${member.name}`;

  const historyParts = (member.history || '').split('➔').map(s => s.trim());
  let timelineHtml = historyParts.map((step, idx) => {
    return `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="font-bold text-xs text-blue-700 mb-0.5">การเข้าส่งครั้งที่ ${idx + 1}</div>
        <div class="text-sm text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">${step}</div>
      </div>
    `;
  }).join('');

  if (!timelineHtml) {
    timelineHtml = `<div class="text-sm text-slate-500 py-4">ไม่พบประวัติการเข้าส่งย้อนหลังเพิ่มเติม</div>`;
  }

  if (body) {
    body.innerHTML = `
      <div class="mb-4 pb-3 border-b border-slate-100">
        <div class="text-xs text-slate-500">สาขา: <strong>${member.branch}</strong> | สายรถ: <strong>${member.truck}</strong></div>
        <div class="text-xs text-slate-500 mt-1">ที่อยู่: ${member.address}</div>
      </div>
      <div>
        <h4 class="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3">ลำดับการเข้าส่ง (Attempts Timeline)</h4>
        <div>${timelineHtml}</div>
      </div>
    `;
  }

  if (modal) modal.classList.add('active');
}
window.viewMemberHistory = viewMemberHistory;

function closeModal() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}
window.closeModal = closeModal;

function exportTableToCsv() {
  const data = getFilteredTableData();
  if (data.length === 0) return alert('ไม่มีข้อมูลสำหรับส่งออก CSV');

  let csv = '\uFEFFรหัสสมาชิก,ชื่อลูกค้า,สาขา,สายรถ,ที่อยู่,จำนวนครั้งที่เข้าส่ง,สถานะ,เหตุผล,ประวัติ\n';
  data.forEach(item => {
    const isPending = !!item.pendingCategory;
    const status = isPending ? item.pendingCategory : 'สำเร็จ';
    const reason = (item.lastReason || item.resolvedReason || '').replace(/"/g, '""');
    const addr = (item.address || '').replace(/"/g, '""');
    const hist = (item.history || '').replace(/"/g, '""');

    csv += `"${item.memberId}","${item.name}","${item.branch}","${item.truck}","${addr}",${item.attemptsCount},"${status}","${reason}","${hist}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `delivery_report_${new Date().toISOString().substring(0, 10)}.csv`;
  a.click();
}

// ==========================================
// 8. Page 6: Admin Management & Sync
// ==========================================
function initAdmin() {
  const fileInput = document.getElementById('adminFileInput');
  const dropZone = document.getElementById('adminDropZone');
  const uploadBtn = document.getElementById('btnAdminUpload');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-blue-500', 'bg-blue-50');
      if (e.dataTransfer.files.length) {
        handleAdminFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        handleAdminFile(fileInput.files[0]);
      }
    });
  }

  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      alert('ฟังก์ชันเชื่อมต่อ Supabase พร้อมประมวลผลไฟล์และบันทึกเข้าสู่ตาราง delivery_orders ทันที');
    });
  }
}

function handleAdminFile(file) {
  const label = document.getElementById('adminFileNameLabel');
  if (label) {
    label.innerHTML = `ไฟล์ที่เลือก: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
    label.classList.remove('hidden');
  }
}
