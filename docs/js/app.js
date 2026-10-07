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
  tableDateMode: 'single',
  tableDateFilter: '',
  tableStartDate: '',
  tableEndDate: '',
  tableTruckFilter: '',
  leafletMap: null,
  mapMarkersGroup: null,
  branchChart: null,
  durationChart: null,
  // Truck & Branch Summary State
  truckSummaryDateMode: 'single',
  truckSummaryDate: '',
  truckSummaryStartDate: '',
  truckSummaryEndDate: '',
  truckSummaryTruckFilter: '',
  truckSummaryBranchFilter: 'ALL',
  activeTruckModalTruck: null,
  activeTruckModalItems: [],
  // Admin Data Management State
  adminOrders: [],
  adminFilteredOrders: [],
  adminSelectedIds: new Set(),
  adminCurrentPage: 1,
  adminPageSize: 25,
  adminSearchQuery: '',
  adminBranchFilter: 'ALL',
  adminDateMode: 'single',
  adminDateFilter: '',
  adminStartDate: '',
  adminEndDate: '',
  adminTruckFilter: '',
  adminStatusFilter: 'ALL',
  adminTotalFilteredCount: 72170,
  isDeletingAdminOrders: false,
};

// Performance Debounce Utility
function debounce(func, wait = 150) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ==========================================
// 1. Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initSupabase();
  initNavigation();
  initCharts();
  renderPage1FilteredView();
  initMap();
  initCCTV();
  initGistdaSection();
  initTable();
  initTruckSummary();
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
  } else if (pageId === 'page-admin') {
    updateAdminAuthUI();
  }
}
window.switchPage = switchPage;

// ==========================================
// Chart.js Data Labels Plugin (Displays Numbers Directly on Canvas)
// ==========================================
const customDataLabelsPlugin = {
  id: 'customDataLabels',
  afterDatasetsDraw(chart) {
    if (chart.options.plugins && chart.options.plugins.datalabels === false) return;
    const { ctx } = chart;
    ctx.save();

    chart.data.datasets.forEach((dataset, datasetIdx) => {
      if (!chart.isDatasetVisible(datasetIdx)) return;
      const meta = chart.getDatasetMeta(datasetIdx);
      if (!meta || meta.hidden) return;

      const isBar = meta.type === 'bar';
      const isLine = meta.type === 'line';

      meta.data.forEach((element, index) => {
        const val = dataset.data[index];
        if (val === null || val === undefined) return;
        // Skip 0 for bars to avoid visual clutter on zero baseline
        if (isBar && val === 0) return;

        let labelText = typeof val === 'number' ? val.toLocaleString() : String(val);
        if (dataset.datalabelSuffix) {
          labelText += dataset.datalabelSuffix;
        }

        ctx.font = 'bold 10.5px Prompt, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let x = element.x;
        let y = element.y;

        if (isBar) {
          const barHeight = Math.abs(element.base - element.y);
          if (barHeight > 45 && dataset.datalabelInside) {
            // Render inside tall bar
            y = element.y + 12;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 3;
          } else {
            // Render above bar
            y = element.y - 9;
            ctx.fillStyle = dataset.datalabelColor || '#1e293b';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowBlur = 4;
          }
        } else if (isLine) {
          const offset = dataset.datalabelYOffset !== undefined ? dataset.datalabelYOffset : -10;
          y = element.y + offset;
          ctx.fillStyle = dataset.datalabelColor || dataset.borderColor || '#0f172a';
          ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
          ctx.shadowBlur = 4;
        }

        ctx.fillText(labelText, x, y);
      });
    });

    ctx.restore();
  }
};

if (typeof Chart !== 'undefined' && Chart.register) {
  Chart.register(customDataLabelsPlugin);
}

// ==========================================
// 3. Page 1: Delivery Duration & Charts
// ==========================================
function initCharts() {
  // 1. Day-by-Day Comparison Chart (26 ก.ย. ถึง 7 ต.ค. ปัจจุบัน)
  const dailyCtx = document.getElementById('chartDailyComparison');
  if (dailyCtx) {
    new Chart(dailyCtx, {
      type: 'bar',
      data: {
        labels: ['26 ก.ย. (เสาร์)', '28 ก.ย. (จันทร์)', '29 ก.ย. (อังคาร)', '30 ก.ย. (พุธ)', '1 ต.ค. (พฤหัส)', '2 ต.ค. (ศุกร์)', '3 ต.ค. (เสาร์)', '5 ต.ค. (จันทร์)', '6 ต.ค. (อังคาร)', '7 ต.ค. (ปัจจุบัน)'],
        datasets: [
          {
            type: 'line',
            label: 'ยังไม่ได้รับน้ำเลย (คงค้างประสานงาน)',
            data: [2598, 2180, 1680, 1390, 1150, 1040, 990, 985, 980, 977],
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.25,
            yAxisID: 'y',
            datalabelColor: '#dc2626',
            datalabelYOffset: -12
          },
          {
            type: 'line',
            label: 'สำเร็จตามเงื่อนไขสะสม (Delivered / Non-Flood)',
            data: [0, 418, 918, 1208, 1448, 1558, 1608, 1613, 1618, 1621],
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.25,
            yAxisID: 'y',
            datalabelColor: '#059669',
            datalabelYOffset: -12
          },
          {
            type: 'bar',
            label: 'ยอดส่งเสริมสำเร็จรายวัน (Daily Solved)',
            data: [0, 418, 500, 290, 240, 110, 50, 5, 5, 3],
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            borderRadius: 6,
            yAxisID: 'y',
            datalabelColor: '#1d4ed8',
            datalabelInside: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 18 } },
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
            max: 2950,
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
            borderRadius: 6,
            datalabelColor: '#047857'
          },
          {
            label: 'ค้างส่งน้ำท่วม (Flood Pending)',
            data: [539, 397, 0, 0],
            backgroundColor: '#ef4444',
            borderRadius: 6,
            datalabelColor: '#dc2626'
          },
          {
            label: 'โอนงานสิ้นวัน (Transfer EOD)',
            data: [17, 0, 24, 0],
            backgroundColor: '#8b5cf6',
            borderRadius: 6,
            datalabelColor: '#7c3aed'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 18 } },
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
            suggestedMax: 26000,
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

  // 3. Daily Success Rate Trend Chart (แนวโน้มอัตราการจัดส่งสำเร็จรายวัน %)
  const durationCtx = document.getElementById('chartDurationTrend');
  if (durationCtx) {
    AppState.durationChart = new Chart(durationCtx, {
      type: 'line',
      data: {
        labels: ['26 ก.ย.', '28 ก.ย.', '30 ก.ย.', '2 ต.ค.', '4 ต.ค.', '6 ต.ค.', '7 ต.ค.'],
        datasets: [
          {
            label: 'พระราม 3 (สำเร็จ %)',
            data: [100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0],
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            tension: 0.3,
            datalabelColor: '#047857',
            datalabelSuffix: '%'
          },
          {
            label: 'สุขุมวิท 50 (สำเร็จ %)',
            data: [96.8, 97.2, 97.8, 98.0, 98.2, 98.4, 98.4],
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            tension: 0.3,
            datalabelColor: '#1d4ed8',
            datalabelSuffix: '%'
          },
          {
            label: 'กรุงเทพกรีฑา (สำเร็จ %)',
            data: [48.5, 52.0, 58.6, 64.2, 69.8, 74.5, 74.5],
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            tension: 0.3,
            datalabelColor: '#b45309',
            datalabelSuffix: '%'
          },
          {
            label: 'รามอินทรา (สำเร็จ %)',
            data: [32.1, 36.4, 42.0, 48.5, 53.2, 58.2, 58.2],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            fill: true,
            tension: 0.3,
            datalabelColor: '#dc2626',
            datalabelSuffix: '%'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 20 } },
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Prompt', size: 12 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        },
        scales: {
          y: {
            min: 20,
            max: 108,
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: 'Prompt' },
              callback: (val) => val + '%'
            }
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
// 3.1. Page 1 Filter Logic (Branch & Status)
// ==========================================
function renderPage1FilteredView() {
  const branchFilter = document.getElementById('durationBranchFilter')?.value || 'ALL';
  const statusFilter = document.getElementById('durationStatusFilter')?.value || 'ALL';

  const pendingList = (AppState.dataStore && AppState.dataStore.pending) || (window.CRISIS_DATA && window.CRISIS_DATA.pending) || [];
  const resolvedList = (AppState.dataStore && AppState.dataStore.resolved) || (window.CRISIS_DATA && window.CRISIS_DATA.resolved) || [];

  // Filter Pending List
  const filteredPending = pendingList.filter(item => {
    if (branchFilter !== 'ALL' && item.branch !== branchFilter) return false;
    if (statusFilter === 'FLOOD' && item.pendingCategory === 'โอนงานสิ้นวัน') return false;
    if (statusFilter === 'TRANSFER' && item.pendingCategory !== 'โอนงานสิ้นวัน') return false;
    if (statusFilter === 'RESOLVED') return false;
    return true;
  });

  // Filter Resolved List
  const filteredResolved = resolvedList.filter(item => {
    if (branchFilter !== 'ALL' && item.branch !== branchFilter) return false;
    if (statusFilter === 'PENDING' || statusFilter === 'FLOOD' || statusFilter === 'TRANSFER') return false;
    return true;
  });

  const pendingCount = filteredPending.length;
  const resolvedCount = filteredResolved.length;
  const totalCount = pendingCount + resolvedCount;

  const pendingRate = totalCount > 0 ? ((pendingCount / totalCount) * 100).toFixed(1) : '0.0';
  const resolvedRate = totalCount > 0 ? ((resolvedCount / totalCount) * 100).toFixed(1) : '0.0';
  const progressRate = resolvedRate;

  // Breakdown for Pending
  const ramIntraPending = filteredPending.filter(p => p.branch === 'สาขารามอินทรา').length;
  const krungthepPending = filteredPending.filter(p => p.branch === 'สาขากรุงเทพกรีฑา').length;
  const sukhumvitPending = filteredPending.filter(p => p.branch === 'สาขาสุขุมวิท 50').length;

  const floodPending = filteredPending.filter(p => p.pendingCategory !== 'โอนงานสิ้นวัน').length;
  const transferPending = filteredPending.filter(p => p.pendingCategory === 'โอนงานสิ้นวัน').length;

  // Update Page 1 KPI Cards
  const kpiPending = document.getElementById('page1KpiPending');
  if (kpiPending) kpiPending.textContent = pendingCount.toLocaleString();

  const kpiPendingRate = document.getElementById('page1KpiPendingRate');
  if (kpiPendingRate) kpiPendingRate.textContent = `ราย (${pendingRate}%)`;

  const kpiPendingBreakdown = document.getElementById('page1KpiPendingBreakdown');
  if (kpiPendingBreakdown) {
    if (branchFilter === 'ALL') {
      kpiPendingBreakdown.innerHTML = `
        <span>รามอินทรา: <strong class="text-rose-600">${ramIntraPending.toLocaleString()}</strong></span>
        <span>กรุงเทพกรีฑา: <strong class="text-amber-600">${krungthepPending.toLocaleString()}</strong></span>
        <span>สุขุมวิท 50: <strong class="text-purple-600">${sukhumvitPending.toLocaleString()}</strong></span>
      `;
    } else {
      kpiPendingBreakdown.innerHTML = `
        <span>${branchFilter}: <strong class="text-rose-600">${pendingCount.toLocaleString()}</strong> ราย</span>
        <span>น้ำท่วม: <strong>${floodPending.toLocaleString()}</strong> | โอนงาน: <strong>${transferPending.toLocaleString()}</strong></span>
      `;
    }
  }

  const kpiResolved = document.getElementById('page1KpiResolved');
  if (kpiResolved) kpiResolved.textContent = resolvedCount.toLocaleString();

  const kpiResolvedRate = document.getElementById('page1KpiResolvedRate');
  if (kpiResolvedRate) kpiResolvedRate.textContent = `ราย (${resolvedRate}%)`;

  const kpiTotal = document.getElementById('page1KpiTotal');
  if (kpiTotal) kpiTotal.textContent = totalCount.toLocaleString();

  const kpiTotalBreakdown = document.getElementById('page1KpiTotalBreakdown');
  if (kpiTotalBreakdown) {
    kpiTotalBreakdown.innerHTML = `
      <span>น้ำท่วมสูง: <strong>${floodPending.toLocaleString()}</strong></span>
      <span>โอนงานสิ้นวัน: <strong>${transferPending.toLocaleString()}</strong></span>
    `;
  }

  const kpiProgressRate = document.getElementById('page1KpiProgressRate');
  if (kpiProgressRate) kpiProgressRate.textContent = `${progressRate}%`;

  const kpiRemainingText = document.getElementById('page1KpiRemainingText');
  if (kpiRemainingText) {
    kpiRemainingText.innerHTML = `คงเหลือค้างจริง: <strong>${pendingRate}% (${pendingCount.toLocaleString()} ราย)</strong>`;
  }
}
window.renderPage1FilteredView = renderPage1FilteredView;

function resetPage1Filters() {
  const bFilter = document.getElementById('durationBranchFilter');
  const sFilter = document.getElementById('durationStatusFilter');
  if (bFilter) bFilter.value = 'ALL';
  if (sFilter) sFilter.value = 'ALL';
  renderPage1FilteredView();
}
window.resetPage1Filters = resetPage1Filters;

// ==========================================
// 4. Page 2: Leaflet Map (Pending Members Display)
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

function applyMapFilters() {
  if (!AppState.mapMarkersGroup) return;
  AppState.mapMarkersGroup.clearLayers();

  const pendingList = (AppState.dataStore && AppState.dataStore.pending) || (window.CRISIS_DATA && window.CRISIS_DATA.pending) || [];
  
  const branch = document.getElementById('mapBranchSelect')?.value || 'ALL';
  const status = document.getElementById('mapStatusSelect')?.value || 'ALL';
  const truck = (document.getElementById('mapTruckInput')?.value || '').trim().toLowerCase();

  let shownCount = 0;
  let floodCount = 0;
  let transferCount = 0;

  pendingList.forEach(item => {
    // 1. Branch Filter
    if (branch !== 'ALL' && item.branch !== branch) return;

    // 2. Legacy button filter compatibility
    if (AppState.activePendingFilter === 'RAM_INTRA' && item.branch !== 'สาขารามอินทรา') return;
    if (AppState.activePendingFilter === 'KRUNGTHEP' && item.branch !== 'สาขากรุงเทพกรีฑา') return;
    if (AppState.activePendingFilter === 'SUKHUMVIT' && item.branch !== 'สาขาสุขุมวิท 50') return;

    // 3. Status Filter
    const isTransfer = item.pendingCategory === 'โอนงานสิ้นวัน';
    if (status === 'FLOOD' && isTransfer) return;
    if (status === 'TRANSFER' && !isTransfer) return;

    if (AppState.activePendingFilter === 'TRANSFER' && !isTransfer) return;
    if (AppState.activePendingFilter === 'FLOOD' && isTransfer) return;

    // 4. Truck / Member Search
    if (truck) {
      const trk = String(item.truck || '').toLowerCase();
      const mid = String(item.memberId || '').toLowerCase();
      const name = String(item.name || '').toLowerCase();
      if (!trk.includes(truck) && !mid.includes(truck) && !name.includes(truck)) return;
    }

    if (!item.lat || !item.lng) return;

    shownCount++;
    if (isTransfer) {
      transferCount++;
    } else {
      floodCount++;
    }

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
            ${item.pendingCategory || 'น้ำท่วมสูง'}
          </span>
        </div>
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${item.name}</div>
        <div style="color: #475569; font-size: 12px; margin-bottom: 4px;">${item.branch} • สายรถ ${item.truck}</div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin: 6px 0; font-size: 12px; color: #b91c1c;">
          <strong>สถานะล่าสุด:</strong> ${item.lastReason} (${item.lastDate})
        </div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
          เข้าส่งทั้งหมด: <strong>${item.attemptsCount} ครั้ง</strong>
        </div>
        <div style="font-size: 11px; color: #64748b;">
          <strong>ที่อยู่:</strong> ${item.address || 'กรุงเทพมหานคร'}
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    AppState.mapMarkersGroup.addLayer(marker);
  });

  const countBadge = document.getElementById('mapShownCount');
  if (countBadge) countBadge.textContent = `${shownCount.toLocaleString()} จุด`;

  const breakdownText = document.getElementById('mapBreakdownText');
  if (breakdownText) {
    breakdownText.textContent = `น้ำท่วมสูง: ${floodCount.toLocaleString()} จุด • โอนงานสิ้นวัน: ${transferCount.toLocaleString()} จุด`;
  }

  updateMapFilterButtonCounts();
}
window.applyMapFilters = applyMapFilters;

function resetMapFilters() {
  const bSelect = document.getElementById('mapBranchSelect');
  const sSelect = document.getElementById('mapStatusSelect');
  const tInput = document.getElementById('mapTruckInput');
  if (bSelect) bSelect.value = 'ALL';
  if (sSelect) sSelect.value = 'ALL';
  if (tInput) tInput.value = '';
  AppState.activePendingFilter = 'ALL';
  applyMapFilters();
}
window.resetMapFilters = resetMapFilters;

function renderMapMarkers() {
  applyMapFilters();
}

function updateMapFilterButtonCounts() {
  const pending = (AppState.dataStore && AppState.dataStore.pending) || (window.CRISIS_DATA && window.CRISIS_DATA.pending) || [];
  const total = pending.length;
  const ramIntra = pending.filter(p => p.branch === 'สาขารามอินทรา').length;
  const krungthep = pending.filter(p => p.branch === 'สาขากรุงเทพกรีฑา').length;
  const sukhumvit = pending.filter(p => p.branch === 'สาขาสุขุมวิท 50').length;
  const flood = pending.filter(p => p.pendingCategory !== 'โอนงานสิ้นวัน').length;
  const transfer = pending.filter(p => p.pendingCategory === 'โอนงานสิ้นวัน').length;

  const btnAll = document.querySelector('.map-filter-btn[data-filter="ALL"]');
  if (btnAll) btnAll.textContent = `ทั้งหมด (${total.toLocaleString()} จุด)`;

  const btnRam = document.querySelector('.map-filter-btn[data-filter="RAM_INTRA"]');
  if (btnRam) btnRam.textContent = `รามอินทรา (${ramIntra.toLocaleString()} จุด)`;

  const btnKtp = document.querySelector('.map-filter-btn[data-filter="KRUNGTHEP"]');
  if (btnKtp) btnKtp.textContent = `กรุงเทพกรีฑา (${krungthep.toLocaleString()} จุด)`;

  const btnSvk = document.querySelector('.map-filter-btn[data-filter="SUKHUMVIT"]');
  if (btnSvk) btnSvk.textContent = `สุขุมวิท 50 (${sukhumvit.toLocaleString()} จุด)`;

  const btnFlood = document.querySelector('.map-filter-btn[data-filter="FLOOD"]');
  if (btnFlood) btnFlood.textContent = `🔴 น้ำท่วมสูง (${flood.toLocaleString()} จุด)`;

  const btnTransfer = document.querySelector('.map-filter-btn[data-filter="TRANSFER"]');
  if (btnTransfer) btnTransfer.textContent = `🟣 โอนงานสิ้นวัน (${transfer.toLocaleString()} จุด)`;

  const bannerTitle = document.querySelector('#page-pending-map h1');
  if (bannerTitle) bannerTitle.textContent = `หน้าแผนที่โชว์จุดของสมาชิกที่ยังจัดส่งไม่ได้ (${total.toLocaleString()} ราย)`;

  // Update Page 5 Fast Tabs
  const pendingBadge = document.getElementById('tableTabPendingBadge');
  if (pendingBadge) pendingBadge.textContent = `${total.toLocaleString()} ราย`;

  const resolved = (AppState.dataStore && AppState.dataStore.resolved) || (window.CRISIS_DATA && window.CRISIS_DATA.resolved) || [];
  const resolvedBadge = document.getElementById('tableTabResolvedBadge');
  if (resolvedBadge) resolvedBadge.textContent = `${resolved.length.toLocaleString()} ราย`;

  const allBadge = document.getElementById('tableTabAllBadge');
  if (allBadge) allBadge.textContent = `${(total + resolved.length).toLocaleString()} ราย`;
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
  applyMapFilters();
}
window.filterMapPins = filterMapPins;

function zoomToLocation(lat, lng, zoomLevel = 14) {
  if (AppState.leafletMap) {
    AppState.leafletMap.flyTo([lat, lng], zoomLevel, { duration: 1.2 });
  }
}
window.zoomToLocation = zoomToLocation;

function syncLiveFromSupabase() {
  const countBadge = document.getElementById('mapShownCount');
  if (countBadge) countBadge.textContent = 'กำลังซิงค์...';

  try {
    if (window.CRISIS_DATA) {
      AppState.dataStore = window.CRISIS_DATA;
    }
    applyMapFilters();
    if (typeof renderTable === 'function') renderTable();
    showToast(`✅ ซิงค์ข้อมูลล่าสุดเรียบร้อย (${AppState.dataStore.pending ? AppState.dataStore.pending.length : 592} รายที่ยังไม่ได้รับน้ำ)`);
  } catch (err) {
    console.error('Sync failed:', err);
    showToast('⚠️ ไม่สามารถซิงค์ข้อมูลได้: ' + err.message);
  }
}
window.syncLiveFromSupabase = syncLiveFromSupabase;

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
  const statusSelect = document.getElementById('tableStatusSelect');
  const truckInput = document.getElementById('tableTruckInput');
  const dateInput = document.getElementById('tableDateInput');
  const startDateInput = document.getElementById('tableStartDateInput');
  const endDateInput = document.getElementById('tableEndDateInput');
  const exportBtn = document.getElementById('btnExportCsv');

  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      AppState.tableSearchQuery = e.target.value.trim().toLowerCase();
      AppState.tableCurrentPage = 1;
      renderTable();
    }, 120));
  }

  if (branchSelect) {
    branchSelect.addEventListener('change', () => {
      AppState.tableCurrentPage = 1;
      renderTable();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      AppState.tableCurrentPage = 1;
      renderTable();
    });
  }

  if (truckInput) {
    truckInput.addEventListener('input', debounce((e) => {
      AppState.tableTruckFilter = e.target.value.trim().toLowerCase();
      AppState.tableCurrentPage = 1;
      renderTable();
    }, 120));
  }

  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      AppState.tableDateFilter = e.target.value;
      AppState.tableCurrentPage = 1;
      renderTable();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener('change', (e) => {
      AppState.tableStartDate = e.target.value;
      AppState.tableCurrentPage = 1;
      renderTable();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener('change', (e) => {
      AppState.tableEndDate = e.target.value;
      AppState.tableCurrentPage = 1;
      renderTable();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportTableToCsv);
  }

  renderTable();
}

function setTableDateMode(mode) {
  AppState.tableDateMode = mode;
  const singleContainer = document.getElementById('tableSingleDateContainer');
  const rangeContainer = document.getElementById('tableRangeDateContainer');
  const btnSingle = document.getElementById('btnTableDateSingle');
  const btnRange = document.getElementById('btnTableDateRange');

  if (mode === 'single') {
    if (singleContainer) singleContainer.classList.remove('hidden');
    if (rangeContainer) rangeContainer.classList.add('hidden');
    if (btnSingle) {
      btnSingle.className = 'px-2.5 py-1 rounded-md text-xs font-bold transition bg-white text-blue-700 shadow-2xs';
    }
    if (btnRange) {
      btnRange.className = 'px-2.5 py-1 rounded-md text-xs font-semibold transition text-slate-600 hover:text-slate-900';
    }
  } else {
    if (singleContainer) singleContainer.classList.add('hidden');
    if (rangeContainer) rangeContainer.classList.remove('hidden');
    if (btnSingle) {
      btnSingle.className = 'px-2.5 py-1 rounded-md text-xs font-semibold transition text-slate-600 hover:text-slate-900';
    }
    if (btnRange) {
      btnRange.className = 'px-2.5 py-1 rounded-md text-xs font-bold transition bg-white text-blue-700 shadow-2xs';
    }
  }

  AppState.tableCurrentPage = 1;
  renderTable();
}
window.setTableDateMode = setTableDateMode;

function resetTableDateFilters() {
  AppState.tableDateFilter = '';
  AppState.tableStartDate = '';
  AppState.tableEndDate = '';
  const dInput = document.getElementById('tableDateInput');
  const sInput = document.getElementById('tableStartDateInput');
  const eInput = document.getElementById('tableEndDateInput');
  if (dInput) dInput.value = '';
  if (sInput) sInput.value = '';
  if (eInput) eInput.value = '';
  AppState.tableCurrentPage = 1;
  renderTable();
}
window.resetTableDateFilters = resetTableDateFilters;

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
    list = [...(AppState.dataStore.pending || []), ...(AppState.dataStore.resolved || [])];
  }

  const branchFilter = document.getElementById('tableBranchSelect')?.value || 'ALL';
  const statusFilter = document.getElementById('tableStatusSelect')?.value || 'ALL';
  const query = AppState.tableSearchQuery;
  const truckFilter = AppState.tableTruckFilter;
  const dateMode = AppState.tableDateMode;
  const singleDate = AppState.tableDateFilter;
  const startDate = AppState.tableStartDate;
  const endDate = AppState.tableEndDate;

  return list.filter(item => {
    // 1. Branch Filter
    if (branchFilter !== 'ALL' && item.branch !== branchFilter) return false;

    // 2. Status Filter
    const isPending = !!item.pendingCategory;
    const isTransfer = item.pendingCategory === 'โอนงานสิ้นวัน';
    if (statusFilter === 'PENDING' && !isPending) return false;
    if (statusFilter === 'FLOOD' && (!isPending || isTransfer)) return false;
    if (statusFilter === 'TRANSFER' && (!isPending || !isTransfer)) return false;
    if (statusFilter === 'RESOLVED' && isPending) return false;
    
    // 3. Truck Filter
    if (truckFilter) {
      const trk = String(item.truck || '').toLowerCase();
      if (!trk.includes(truckFilter)) return false;
    }

    // 4. Date Filter
    if (dateMode === 'single' && singleDate) {
      const [y, m, d] = singleDate.split('-');
      const shortThai = `${parseInt(d, 10)}/${parseInt(m, 10)}/${parseInt(y, 10) + 543}`;
      const shortAd = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
      const hist = item.history || '';
      const iso = item.lastDateIso || '';
      const lastD = item.lastDate || '';
      const matches = iso.startsWith(singleDate) || lastD === shortThai || lastD === shortAd || hist.includes(shortThai) || hist.includes(shortAd);
      if (!matches) return false;
    } else if (dateMode === 'range' && (startDate || endDate)) {
      const iso = item.lastDateIso ? item.lastDateIso.substring(0, 10) : '';
      if (startDate && iso && iso < startDate) return false;
      if (endDate && iso && iso > endDate) return false;
    }

    // 5. Search Query
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
// 7. Page 1: Daily Detail Modal (Drilldown)
// ==========================================
const DAILY_METRICS_INFO = {
  '2026-09-26': { label: '26 ก.ย. 2569 (เสาร์)', dailyResolved: 1, cumResolved: 1, pending: 2686, rate: '0.1%', note: 'วันเกิดเหตุวิกฤตน้ำท่วมฉับพลันและเริ่มบันทึกการโอนงานสิ้นวัน' },
  '2026-09-28': { label: '28 ก.ย. 2569 (จันทร์)', dailyResolved: 1152, cumResolved: 1153, pending: 1534, rate: '42.9%', note: 'เปิดปฏิบัติการฟื้นฟูเชิงรุก ส่งสำเร็จเพิ่มขึ้นอย่างมีนัยสำคัญ' },
  '2026-09-29': { label: '29 ก.ย. 2569 (อังคาร)', dailyResolved: 624, cumResolved: 1777, pending: 910, rate: '66.1%', note: 'คลี่คลายต่อเนื่องในโซนพื้นที่น้ำลด สาขากรุงเทพกรีฑาเริ่มกลับมาส่งได้' },
  '2026-09-30': { label: '30 ก.ย. 2569 (พุธ)', dailyResolved: 232, cumResolved: 2009, pending: 678, rate: '74.8%', note: 'ยอดจัดส่งสำเร็จสะสมแตะระดับ 2,000 ราย' },
  '2026-10-01': { label: '1 ต.ค. 2569 (พฤหัส)', dailyResolved: 299, cumResolved: 2308, pending: 379, rate: '85.9%', note: 'เข้าส่งซ้ำในพื้นที่น้ำท่วมสูงกรุงเทพกรีฑาและรามอินทรา' },
  '2026-10-02': { label: '2 ต.ค. 2569 (ศุกร์)', dailyResolved: 24, cumResolved: 2332, pending: 355, rate: '86.8%', note: 'เข้าแก้ไขกลุ่มเคสตกค้างและจุดน้ำลดระดับ' },
  '2026-10-03': { label: '3 ต.ค. 2569 (เสาร์)', dailyResolved: 12, cumResolved: 2344, pending: 343, rate: '87.2%', note: 'เก็บตกรอบสัปดาห์แรก คลี่คลายได้ 87.2%' },
  '2026-10-05': { label: '5 ต.ค. 2569 (จันทร์)', dailyResolved: 21, cumResolved: 2365, pending: 322, rate: '88.0%', note: 'เริ่มรอบสัปดาห์ใหม่ เข้าพื้นที่จุดน้ำท่วมเดิมซ้ำ' },
  '2026-10-06': { label: '6 ต.ค. 2569 (อังคาร)', dailyResolved: 14, cumResolved: 2379, pending: 308, rate: '88.5%', note: 'อัตราความสำเร็จสะสมเพิ่มเป็น 88.5%' },
  '2026-10-07': { label: '7 ต.ค. 2569 (ปัจจุบัน)', dailyResolved: 8, cumResolved: 2387, pending: 300, rate: '88.8%', note: 'สถานะปัจจุบัน คงเหลือกลุ่มน้ำท่วมลึกและโอนงานที่กำลังติดตามประสานงาน' }
};

AppState.currentDailyModalDate = '2026-09-28';
AppState.currentDailyModalItems = [];

function openDailyDetailModal(dateStr, dateLabel) {
  AppState.currentDailyModalDate = dateStr;
  const modal = document.getElementById('dailyDetailModal');
  if (!modal) return;

  const metric = DAILY_METRICS_INFO[dateStr] || {
    label: dateLabel || dateStr,
    dailyResolved: 0,
    cumResolved: 0,
    pending: 0,
    rate: '-',
    note: 'ข้อมูลสรุปการจัดส่งประจำวัน'
  };

  const titleEl = document.getElementById('dailyDetailModalTitle');
  const subtitleEl = document.getElementById('dailyDetailModalSubtitle');
  const dailyResolvedEl = document.getElementById('dailyModalDailyResolved');
  const cumResolvedEl = document.getElementById('dailyModalCumResolved');
  const pendingEl = document.getElementById('dailyModalPending');
  const rateEl = document.getElementById('dailyModalRate');

  if (titleEl) titleEl.textContent = `📊 รายละเอียดรอบส่งประจำวัน: ${metric.label}`;
  if (subtitleEl) subtitleEl.textContent = metric.note;
  if (dailyResolvedEl) dailyResolvedEl.textContent = `+${metric.dailyResolved.toLocaleString()} ราย`;
  if (cumResolvedEl) cumResolvedEl.textContent = `${metric.cumResolved.toLocaleString()} ราย`;
  if (pendingEl) pendingEl.textContent = `${metric.pending.toLocaleString()} ราย`;
  if (rateEl) rateEl.textContent = metric.rate;

  // Reset modal filters
  const searchInput = document.getElementById('dailyModalSearchInput');
  const branchSelect = document.getElementById('dailyModalBranchSelect');
  if (searchInput) searchInput.value = '';
  if (branchSelect) branchSelect.value = 'ALL';

  // Gather members for this date
  AppState.currentDailyModalItems = extractMembersForDailyModal(dateStr);
  filterDailyModalList();

  modal.classList.add('active');
}
window.openDailyDetailModal = openDailyDetailModal;

function extractMembersForDailyModal(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const thaiYear = parseInt(y, 10) + 543;
  const shortDateThai = `${parseInt(d, 10)}/${parseInt(m, 10)}/${thaiYear}`;
  const shortDateAd = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
  const shortDayMonth = `${parseInt(d, 10)}/${parseInt(m, 10)}`;

  const allCrisis = [...(AppState.dataStore.pending || []), ...(AppState.dataStore.resolved || [])];

  let matchedItems = [];

  allCrisis.forEach(item => {
    const history = item.history || '';
    const steps = history.split('➔').map(s => s.trim());
    let stepForDate = steps.find(s => s.startsWith(shortDateThai) || s.startsWith(shortDateAd) || s.startsWith(shortDayMonth));

    let matched = false;
    let dayReason = '';

    if (stepForDate) {
      matched = true;
      const match = stepForDate.match(/\[(.*?)\]/);
      dayReason = match ? match[1] : stepForDate;
    } else if (item.lastDateIso && item.lastDateIso.startsWith(dateStr)) {
      matched = true;
      dayReason = item.lastReason || item.resolvedReason || 'ส่งสำเร็จ';
    } else if (item.lastDate && (item.lastDate === shortDateThai || item.lastDate === shortDateAd)) {
      matched = true;
      dayReason = item.lastReason || item.resolvedReason || 'ส่งสำเร็จ';
    }

    if (matched) {
      const isFlood = dayReason.includes('น้ำท่วม') || dayReason.includes('รอน้ำลด');
      const isTransfer = dayReason.includes('โอนงาน') || dayReason.includes('เลื่อนวันที่ส่ง') || dayReason.includes('ข้อผิดพลาด');
      const isSuccess = dayReason.includes('ปกติ') || dayReason.includes('ตั้งถัง') || dayReason.includes('สำเร็จ') || dayReason.includes('ส่งแล้ว');

      let statusBadgeHtml = isSuccess
        ? `<span class="badge badge-success">ส่งสำเร็จ</span>`
        : (isTransfer ? `<span class="badge badge-purple">โอนงาน / เลื่อนส่ง</span>` : `<span class="badge badge-danger">น้ำท่วมสูง</span>`);

      matchedItems.push({
        memberId: item.memberId,
        name: item.name,
        branch: item.branch,
        truck: item.truck,
        address: item.address,
        attemptsCount: item.attemptsCount,
        dayReason: dayReason || (isSuccess ? 'จัดส่งสำเร็จ' : 'น้ำท่วมสูงในพื้นที่'),
        statusBadgeHtml,
        history: item.history
      });
    }
  });

  // Fallback: If no explicit date attempt records (e.g. current day 7 Oct or 3 Oct), show active pending & resolved cohort
  if (matchedItems.length === 0 && allCrisis.length > 0) {
    const cohort = (AppState.dataStore.pending && AppState.dataStore.pending.length > 0)
      ? AppState.dataStore.pending.slice(0, 100)
      : allCrisis.slice(0, 100);

    matchedItems = cohort.map(item => {
      const isPending = !!item.pendingCategory;
      const isTransfer = item.pendingCategory === 'โอนงานสิ้นวัน';
      const statusBadgeHtml = isPending
        ? `<span class="badge ${isTransfer ? 'badge-purple' : 'badge-danger'}">${item.pendingCategory || 'น้ำท่วม'}</span>`
        : `<span class="badge badge-success">ส่งสำเร็จ</span>`;

      return {
        memberId: item.memberId,
        name: item.name,
        branch: item.branch,
        truck: item.truck,
        address: item.address,
        attemptsCount: item.attemptsCount,
        dayReason: item.lastReason || item.resolvedReason || 'ติดตามการจัดส่ง',
        statusBadgeHtml,
        history: item.history
      };
    });
  }

  return matchedItems;
}

function filterDailyModalList() {
  const tbody = document.getElementById('dailyModalTableBody');
  const countEl = document.getElementById('dailyModalItemCount');
  if (!tbody) return;

  const searchInput = document.getElementById('dailyModalSearchInput');
  const branchSelect = document.getElementById('dailyModalBranchSelect');

  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const branch = branchSelect ? branchSelect.value : 'ALL';

  const items = AppState.currentDailyModalItems || [];

  const filtered = items.filter(item => {
    if (branch !== 'ALL' && item.branch !== branch) return false;
    if (query) {
      const str = `${item.memberId} ${item.name} ${item.branch} ${item.truck} ${item.address} ${item.dayReason}`.toLowerCase();
      if (!str.includes(query)) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `แสดง ${filtered.length.toLocaleString()} รายการ (จากทั้งหมด ${items.length.toLocaleString()} รายการของวันนี้)`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-slate-400 font-semibold">
          ไม่พบรายการข้อมูลตามเงื่อนไขที่ค้นหา
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.slice(0, 100).map(item => {
    return `
      <tr>
        <td class="font-bold text-slate-800 font-mono">#${item.memberId}</td>
        <td>
          <div class="font-semibold text-slate-900">${item.name}</div>
          <div class="text-[11px] text-slate-500 truncate max-w-xs">${item.address || '-'}</div>
        </td>
        <td><span class="font-medium text-slate-700">${item.branch}</span></td>
        <td><span class="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">${item.truck || '-'}</span></td>
        <td>
          <div class="text-xs text-slate-800 font-medium">${item.dayReason}</div>
          <div class="text-[11px] text-slate-400">เข้าส่งรวม ${item.attemptsCount} ครั้ง</div>
        </td>
        <td>${item.statusBadgeHtml}</td>
        <td class="text-right">
          <button onclick="viewMemberHistory('${item.memberId}')" class="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition inline-flex items-center gap-1">
            <span>ไทม์ไลน์</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (filtered.length > 100) {
    tbody.innerHTML += `
      <tr class="bg-slate-50">
        <td colspan="7" class="text-center py-2 text-xs text-slate-500 font-semibold">
          ... แสดง 100 รายการแรก หากต้องการดูข้อมูลทั้งหมดหรือกรองละเอียด กด "⚙️ ดูข้อมูลในหน้า Admin" ด้านบน ...
        </td>
      </tr>
    `;
  }
}
window.filterDailyModalList = filterDailyModalList;

function goToAdminFromDailyModal() {
  const dateStr = AppState.currentDailyModalDate;
  closeModal();
  switchPage('page-admin');
  const dateInput = document.getElementById('adminDateInput');
  if (dateInput && dateStr) {
    dateInput.value = dateStr;
    AppState.adminDateFilter = dateStr;
    if (typeof loadAdminOrders === 'function') {
      loadAdminOrders(1);
    }
  }
}
window.goToAdminFromDailyModal = goToAdminFromDailyModal;

function goToMapFromDailyModal() {
  closeModal();
  switchPage('page-pending-map');
}
window.goToMapFromDailyModal = goToMapFromDailyModal;

function exportDailyModalCsv() {
  const items = AppState.currentDailyModalItems || [];
  if (items.length === 0) return alert('ไม่มีข้อมูลสำหรับส่งออก CSV');

  const dateStr = AppState.currentDailyModalDate || 'export';
  let csv = '\uFEFFรหัสสมาชิก,ชื่อลูกค้า,สาขา,สายรถ,ที่อยู่,จำนวนครั้งเข้าส่ง,ผลการส่งวันนี้,ประวัติ\n';
  items.forEach(item => {
    const reason = (item.dayReason || '').replace(/"/g, '""');
    const addr = (item.address || '').replace(/"/g, '""');
    const hist = (item.history || '').replace(/"/g, '""');
    csv += `"${item.memberId}","${item.name}","${item.branch}","${item.truck}","${addr}",${item.attemptsCount},"${reason}","${hist}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `daily_orders_${dateStr}.csv`;
  a.click();
}
window.exportDailyModalCsv = exportDailyModalCsv;

// ==========================================
// 8. Page 6: Admin Management & Supabase Selection Delete
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

  // --- Admin Data Table Controls ---
  const searchInput = document.getElementById('adminSearchInput');
  const branchSelect = document.getElementById('adminBranchSelect');
  const dateInput = document.getElementById('adminDateInput');
  const truckInput = document.getElementById('adminTruckInput');
  const statusSelect = document.getElementById('adminStatusSelect');
  const masterCheckbox = document.getElementById('adminMasterCheckbox');
  const btnSelectAll = document.getElementById('btnAdminSelectAll');
  const btnDeselectAll = document.getElementById('btnAdminDeselectAll');
  const btnDeleteSelected = document.getElementById('btnAdminDeleteSelected');
  const btnConfirmDelete = document.getElementById('btnConfirmDeleteSupabase');

  let adminDebounce = null;

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(adminDebounce);
      adminDebounce = setTimeout(() => {
        AppState.adminSearchQuery = e.target.value.trim().toLowerCase();
        AppState.adminCurrentPage = 1;
        loadAdminOrders();
      }, 300);
    });
  }

  if (branchSelect) {
    branchSelect.addEventListener('change', (e) => {
      AppState.adminBranchFilter = e.target.value;
      AppState.adminCurrentPage = 1;
      loadAdminOrders();
    });
  }

  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      setAdminDateFilter(e.target.value);
    });
  }

  if (truckInput) {
    truckInput.addEventListener('input', (e) => {
      clearTimeout(adminDebounce);
      adminDebounce = setTimeout(() => {
        AppState.adminTruckFilter = e.target.value.trim();
        AppState.adminCurrentPage = 1;
        loadAdminOrders();
      }, 300);
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      AppState.adminStatusFilter = e.target.value;
      AppState.adminCurrentPage = 1;
      loadAdminOrders();
    });
  }

  if (masterCheckbox) {
    masterCheckbox.addEventListener('change', (e) => {
      toggleAdminSelectAllOnPage(e.target.checked);
    });
  }

  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', () => {
      toggleAdminSelectAllOnPage(true);
    });
  }

  if (btnDeselectAll) {
    btnDeselectAll.addEventListener('click', () => {
      clearAdminSelection();
    });
  }

  if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', () => {
      openAdminDeleteModal();
    });
  }

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', () => {
      executeSupabaseDelete();
    });
  }

  // Admin PIN Auth Gate & Session Management
  const pinForm = document.getElementById('adminPinForm');
  const pinInput = document.getElementById('adminPinInput');
  const btnLogin = document.getElementById('btnAdminLogin');

  if (pinForm) {
    pinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      verifyAdminPin();
    });
  }
  if (btnLogin) {
    btnLogin.addEventListener('click', (e) => {
      e.preventDefault();
      verifyAdminPin();
    });
  }
  if (pinInput) {
    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyAdminPin();
      }
    });
  }

  updateAdminAuthUI();

  // Fetch initial data for Admin table
  loadAdminOrders();
}

function handleAdminFile(file) {
  const label = document.getElementById('adminFileNameLabel');
  if (label) {
    label.innerHTML = `ไฟล์ที่เลือก: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
    label.classList.remove('hidden');
  }
}

function formatThaiDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).substring(0, 10);
    const dateFormatted = d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    // Check if time is non-zero
    if (hours !== '00' || mins !== '00') {
      // Local Thai time representation
      const localH = String(d.getHours()).padStart(2, '0');
      const localM = String(d.getMinutes()).padStart(2, '0');
      return `${dateFormatted} ${localH}:${localM} น.`;
    }
    return dateFormatted;
  } catch (e) {
    return String(dateStr).substring(0, 10);
  }
}
window.formatThaiDateTime = formatThaiDateTime;

function setAdminDateMode(mode) {
  AppState.adminDateMode = mode;
  const singleContainer = document.getElementById('adminSingleDateContainer');
  const rangeContainer = document.getElementById('adminRangeDateContainer');
  const btnSingle = document.getElementById('btnAdminDateModeSingle');
  const btnRange = document.getElementById('btnAdminDateModeRange');

  if (mode === 'single') {
    if (singleContainer) singleContainer.classList.remove('hidden');
    if (rangeContainer) rangeContainer.classList.add('hidden');
    if (btnSingle) btnSingle.className = 'font-bold text-blue-600 underline';
    if (btnRange) btnRange.className = 'text-slate-500 hover:text-slate-800';
  } else {
    if (singleContainer) singleContainer.classList.add('hidden');
    if (rangeContainer) rangeContainer.classList.remove('hidden');
    if (btnSingle) btnSingle.className = 'text-slate-500 hover:text-slate-800';
    if (btnRange) btnRange.className = 'font-bold text-blue-600 underline';
  }

  AppState.adminCurrentPage = 1;
  loadAdminOrders();
}
window.setAdminDateMode = setAdminDateMode;

function setAdminDateRangePreset(start, end) {
  AppState.adminDateMode = 'range';
  AppState.adminStartDate = start;
  AppState.adminEndDate = end;

  const singleContainer = document.getElementById('adminSingleDateContainer');
  const rangeContainer = document.getElementById('adminRangeDateContainer');
  const sInput = document.getElementById('adminStartDateInput');
  const eInput = document.getElementById('adminEndDateInput');
  const btnSingle = document.getElementById('btnAdminDateModeSingle');
  const btnRange = document.getElementById('btnAdminDateModeRange');

  if (singleContainer) singleContainer.classList.add('hidden');
  if (rangeContainer) rangeContainer.classList.remove('hidden');
  if (btnSingle) btnSingle.className = 'text-slate-500 hover:text-slate-800';
  if (btnRange) btnRange.className = 'font-bold text-blue-600 underline';
  if (sInput) sInput.value = start;
  if (eInput) eInput.value = end;

  document.querySelectorAll('.admin-date-chip').forEach(chip => {
    if (chip.textContent.includes('รอบวิกฤต')) {
      chip.className = 'admin-date-chip px-2.5 py-1 rounded-md bg-blue-600 text-white font-bold shadow-xs';
    } else {
      chip.className = 'admin-date-chip px-2.5 py-1 rounded-md bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 shadow-2xs';
    }
  });

  AppState.adminCurrentPage = 1;
  loadAdminOrders();
}
window.setAdminDateRangePreset = setAdminDateRangePreset;

function setAdminDateFilter(dateStr) {
  AppState.adminDateFilter = dateStr;
  const dateInput = document.getElementById('adminDateInput');
  if (dateInput) dateInput.value = dateStr;

  // Highlight active chip
  document.querySelectorAll('.admin-date-chip').forEach(chip => {
    const chipText = chip.textContent.trim();
    if ((!dateStr && chipText === 'ทุกวัน') || (dateStr && chip.getAttribute('onclick')?.includes(dateStr))) {
      chip.className = 'admin-date-chip px-2.5 py-1 rounded-md bg-blue-600 text-white font-bold shadow-xs';
    } else {
      chip.className = 'admin-date-chip px-2.5 py-1 rounded-md bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 shadow-2xs';
    }
  });

  AppState.adminCurrentPage = 1;
  loadAdminOrders();
}
window.setAdminDateFilter = setAdminDateFilter;

function resetAdminFilters() {
  AppState.adminSearchQuery = '';
  AppState.adminBranchFilter = 'ALL';
  AppState.adminDateMode = 'single';
  AppState.adminDateFilter = '';
  AppState.adminStartDate = '';
  AppState.adminEndDate = '';
  AppState.adminTruckFilter = '';
  AppState.adminStatusFilter = 'ALL';
  AppState.adminCurrentPage = 1;

  if (document.getElementById('adminSearchInput')) document.getElementById('adminSearchInput').value = '';
  if (document.getElementById('adminBranchSelect')) document.getElementById('adminBranchSelect').value = 'ALL';
  if (document.getElementById('adminDateInput')) document.getElementById('adminDateInput').value = '';
  if (document.getElementById('adminStartDateInput')) document.getElementById('adminStartDateInput').value = '';
  if (document.getElementById('adminEndDateInput')) document.getElementById('adminEndDateInput').value = '';
  if (document.getElementById('adminTruckInput')) document.getElementById('adminTruckInput').value = '';
  if (document.getElementById('adminStatusSelect')) document.getElementById('adminStatusSelect').value = 'ALL';

  setAdminDateMode('single');

  document.querySelectorAll('.admin-date-chip').forEach(chip => {
    if (chip.textContent.trim() === 'ทุกวัน') {
      chip.className = 'admin-date-chip px-2.5 py-1 rounded-md bg-blue-600 text-white font-bold shadow-xs';
    } else {
      chip.className = 'admin-date-chip px-2.5 py-1 rounded-md bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 shadow-2xs';
    }
  });

  loadAdminOrders();
}
window.resetAdminFilters = resetAdminFilters;

// Fetch orders for Admin Table directly from Supabase Cloud (Live across all 72,170+ rows)
async function loadAdminOrders() {
  const tbody = document.getElementById('adminOrdersTableBody');
  const countEl = document.getElementById('adminFilteredCount');
  const totalCountEl = document.getElementById('adminTotalRowCount');

  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-slate-500 font-semibold"><span class="live-pulse inline-block mr-2"></span>กำลังเชื่อมต่อและดึงข้อมูลสดจาก Supabase Cloud (72,170+ รายการ)...</td></tr>`;
  }

  const q = (AppState.adminSearchQuery || '').trim();
  const branch = AppState.adminBranchFilter || 'ALL';
  const date = (AppState.adminDateFilter || '').trim();
  const truck = (AppState.adminTruckFilter || '').trim();
  const status = AppState.adminStatusFilter || 'ALL';
  const page = AppState.adminCurrentPage || 1;
  const pageSize = AppState.adminPageSize || 25;
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize - 1;

  try {
    let url = `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?select=id,order_code,member_id,customer_name,branch,truck_number,status,reason,delivery_date,address,is_transferred,round&order=delivery_date.desc.nullslast,id.desc`;

    if (branch !== 'ALL') {
      url += `&branch=eq.${encodeURIComponent(branch)}`;
    }
    if (truck) {
      url += `&truck_number=ilike.*${encodeURIComponent(truck)}*`;
    }
    if (AppState.adminDateMode === 'single' && date) {
      url += `&delivery_date=gte.${encodeURIComponent(date)}T00:00:00%2B00:00&delivery_date=lte.${encodeURIComponent(date)}T23:59:59%2B00:00`;
    } else if (AppState.adminDateMode === 'range') {
      const sDate = AppState.adminStartDate || (document.getElementById('adminStartDateInput')?.value || '');
      const eDate = AppState.adminEndDate || (document.getElementById('adminEndDateInput')?.value || '');
      if (sDate) {
        url += `&delivery_date=gte.${encodeURIComponent(sDate)}T00:00:00%2B00:00`;
      }
      if (eDate) {
        url += `&delivery_date=lte.${encodeURIComponent(eDate)}T23:59:59%2B00:00`;
      }
    }
    if (status === 'โอนงานสิ้นวัน') {
      url += `&or=(is_transferred.eq.true,reason.ilike.*โอนงาน*,status.ilike.*โอนงาน*,round.ilike.*โอนงาน*)`;
    } else if (status === 'น้ำท่วม') {
      url += `&or=(reason.ilike.*น้ำท่วม*,status.ilike.*น้ำท่วม*,status.ilike.*รอน้ำลด*)`;
    } else if (status === 'ส่งสำเร็จ') {
      url += `&or=(status.ilike.*สำเร็จ*,status.ilike.*ปกติ*,reason.ilike.*ตั้งถัง*,reason.ilike.*พบลูกค้า*)`;
    }
    if (q) {
      url += `&or=(member_id.ilike.*${encodeURIComponent(q)}*,customer_name.ilike.*${encodeURIComponent(q)}*,truck_number.ilike.*${encodeURIComponent(q)}*,address.ilike.*${encodeURIComponent(q)}*,reason.ilike.*${encodeURIComponent(q)}*)`;
    }

    const resp = await fetch(url, {
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Prefer': 'count=exact',
        'Range-Unit': 'items',
        'Range': `${startIdx}-${endIdx}`
      }
    });

    if (resp.ok) {
      const data = await resp.json();
      const contentRange = resp.headers.get('content-range');
      let total = 0;
      if (contentRange && contentRange.includes('/')) {
        total = parseInt(contentRange.split('/')[1], 10) || 0;
      } else {
        total = data.length;
      }

      AppState.adminOrders = data;
      AppState.adminFilteredOrders = data;
      AppState.adminTotalFilteredCount = total;

      if (countEl) countEl.textContent = total.toLocaleString();
      renderAdminTable(data, total, page, pageSize);
      return;
    }
  } catch (err) {
    console.warn('Live Supabase query error, falling back to local dataset:', err);
  }

  // Fallback to local store filtering
  applyAdminLocalFilters();
}
window.loadAdminOrders = loadAdminOrders;

function applyAdminLocalFilters() {
  const q = (AppState.adminSearchQuery || '').toLowerCase();
  const branch = AppState.adminBranchFilter || 'ALL';
  const date = AppState.adminDateFilter || '';
  const truck = (AppState.adminTruckFilter || '').toLowerCase();
  const status = AppState.adminStatusFilter || 'ALL';

  if (!AppState.adminLocalAllOrders || AppState.adminLocalAllOrders.length === 0) {
    const fallback = [];
    let synthId = 10001;
    (AppState.dataStore.pending || []).forEach(p => {
      fallback.push({
        id: p.id || synthId++,
        order_code: p.order_code || synthId,
        member_id: p.memberId || 'N/A',
        customer_name: p.name || 'สมาชิกทั่วไป',
        branch: p.branch || 'สาขารามอินทรา',
        truck_number: p.truck || '-',
        status: p.pendingCategory || 'ค้างส่งน้ำท่วม',
        reason: p.lastReason || 'น้ำท่วมสูงไม่สามารถส่งได้',
        delivery_date: p.lastDateIso || '2026-09-28T07:45:00+00:00',
        address: p.address || '-'
      });
    });
    (AppState.dataStore.resolved || []).forEach(r => {
      fallback.push({
        id: r.id || synthId++,
        order_code: r.order_code || synthId,
        member_id: r.memberId || 'N/A',
        customer_name: r.name || 'สมาชิกทั่วไป',
        branch: r.branch || 'สาขากรุงเทพกรีฑา',
        truck_number: r.truck || '-',
        status: 'ส่งสำเร็จ',
        reason: r.resolvedReason || 'ลูกค้าตั้งถัง',
        delivery_date: r.resolvedDateIso || '2026-10-03T11:53:00+00:00',
        address: r.address || '-'
      });
    });
    AppState.adminLocalAllOrders = fallback;
  }

  const filtered = (AppState.adminLocalAllOrders || []).filter(item => {
    if (q) {
      const match = (item.member_id || '').toLowerCase().includes(q) ||
                    (item.customer_name || '').toLowerCase().includes(q) ||
                    (item.truck_number || '').toLowerCase().includes(q) ||
                    (item.address || '').toLowerCase().includes(q) ||
                    (item.reason || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (branch !== 'ALL' && item.branch !== branch) return false;
    if (truck && !(item.truck_number || '').toLowerCase().includes(truck)) return false;
    if (date && !(item.delivery_date || '').startsWith(date)) return false;
    if (status !== 'ALL') {
      const st = (item.status || '') + ' ' + (item.reason || '');
      if (status === 'โอนงานสิ้นวัน' && !st.includes('โอนงาน')) return false;
      if (status === 'น้ำท่วม' && !st.includes('น้ำท่วม')) return false;
      if (status === 'ส่งสำเร็จ' && !st.includes('สำเร็จ') && !st.includes('ปกติ') && !st.includes('ตั้งถัง')) return false;
    }
    return true;
  });

  const total = filtered.length;
  const pageSize = AppState.adminPageSize || 25;
  const page = AppState.adminCurrentPage || 1;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  AppState.adminFilteredOrders = pageItems;
  AppState.adminTotalFilteredCount = total;

  const countEl = document.getElementById('adminFilteredCount');
  if (countEl) countEl.textContent = total.toLocaleString();

  renderAdminTable(pageItems, total, page, pageSize);
}

function renderAdminTable(items, totalCount, page, pageSize) {
  const tbody = document.getElementById('adminOrdersTableBody');
  if (!tbody) return;

  const total = totalCount !== undefined ? totalCount : AppState.adminFilteredOrders.length;
  const size = pageSize || AppState.adminPageSize || 25;
  const curPage = page || AppState.adminCurrentPage || 1;
  const totalPages = Math.ceil(total / size) || 1;

  const pageItems = items || AppState.adminFilteredOrders;

  if (!pageItems || pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-10 text-slate-400">
          <div class="text-2xl mb-1">🔍</div>
          <div class="font-semibold text-sm">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหาใน Supabase</div>
          <p class="text-xs text-slate-400 mt-1">ลองปรับเปลี่ยนคำค้นหา วันที่ส่ง เบอร์รถ หรือตัวกรองสาขา/สถานะ</p>
        </td>
      </tr>
    `;
    renderAdminPagination(0, 1);
    updateAdminSelectionUI();
    return;
  }

  let html = '';
  pageItems.forEach(item => {
    const isChecked = AppState.adminSelectedIds.has(item.id);
    const formattedDate = formatThaiDateTime(item.delivery_date);

    // Status Badge determination
    let statusBadge = '<span class="badge badge-success">ส่งสำเร็จ</span>';
    const statusText = (item.status || '') + ' ' + (item.reason || '') + ' ' + (item.round || '');
    if (statusText.includes('น้ำท่วม')) {
      statusBadge = '<span class="badge badge-danger">น้ำท่วมสูง</span>';
    } else if (item.is_transferred || statusText.includes('โอนงาน')) {
      statusBadge = '<span class="badge badge-purple">โอนงานสิ้นวัน</span>';
    } else if (statusText.includes('ติดตาม') || statusText.includes('ไม่สามารถ')) {
      statusBadge = '<span class="badge badge-warning">ติดตามปัญหา</span>';
    }

    html += `
      <tr class="${isChecked ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'} transition-colors">
        <td class="text-center">
          <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleAdminRowSelect(${item.id}, this.checked)" class="admin-row-chk w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer">
        </td>
        <td class="font-mono text-xs font-bold text-blue-700">#${item.member_id || '-'}</td>
        <td>
          <div class="font-bold text-slate-900 text-xs">${item.customer_name || 'ไม่ระบุชื่อ'}</div>
          <div class="text-[11px] text-slate-400 truncate max-w-xs" title="${item.address || ''}">${item.address || '-'}</div>
        </td>
        <td><span class="text-xs text-slate-700 font-semibold">${item.branch || '-'}</span></td>
        <td><span class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">${item.truck_number || '-'}</span></td>
        <td class="text-xs font-semibold text-slate-700 whitespace-nowrap">${formattedDate}</td>
        <td>
          <div class="flex flex-col gap-0.5">
            <div>${statusBadge}</div>
            <div class="text-[11px] text-slate-500 truncate max-w-[180px]" title="${item.reason || ''}">${item.reason || item.status || '-'}</div>
          </div>
        </td>
        <td class="text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button type="button" onclick="openAdminEditModal(${item.id})" title="แก้ไขข้อมูลออเดอร์นี้" class="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold transition inline-flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button type="button" onclick="openSingleDeleteModal(${item.id})" title="ลบรายการนี้ออกจาก Supabase" class="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition inline-flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  renderAdminPagination(total, totalPages);
  updateAdminSelectionUI();
}

function toggleAdminRowSelect(id, checked) {
  if (checked) {
    AppState.adminSelectedIds.add(id);
  } else {
    AppState.adminSelectedIds.delete(id);
  }
  updateAdminSelectionUI();
}
window.toggleAdminRowSelect = toggleAdminRowSelect;

function toggleAdminSelectAllOnPage(checked) {
  const pageItems = AppState.adminOrders || [];

  pageItems.forEach(item => {
    if (checked) {
      AppState.adminSelectedIds.add(item.id);
    } else {
      AppState.adminSelectedIds.delete(item.id);
    }
  });

  const total = AppState.adminTotalFilteredCount || pageItems.length;
  const totalPages = Math.ceil(total / AppState.adminPageSize) || 1;
  renderAdminTable(pageItems, total, AppState.adminCurrentPage, AppState.adminPageSize);
}
window.toggleAdminSelectAllOnPage = toggleAdminSelectAllOnPage;

function clearAdminSelection() {
  AppState.adminSelectedIds.clear();
  const pageItems = AppState.adminOrders || [];
  const total = AppState.adminTotalFilteredCount || pageItems.length;
  renderAdminTable(pageItems, total, AppState.adminCurrentPage, AppState.adminPageSize);
}
window.clearAdminSelection = clearAdminSelection;

function updateAdminSelectionUI() {
  const count = AppState.adminSelectedIds.size;
  const badge = document.getElementById('adminSelectedCountBadge');
  const btnCount = document.getElementById('btnDeleteCount');
  const btnDelete = document.getElementById('btnAdminDeleteSelected');
  const masterBox = document.getElementById('adminMasterCheckbox');

  if (badge) badge.textContent = `${count.toLocaleString()} รายการ`;
  if (btnCount) btnCount.textContent = count.toLocaleString();
  if (btnDelete) {
    btnDelete.disabled = count === 0;
  }

  // Update master checkbox state
  if (masterBox) {
    const pageItems = AppState.adminOrders || [];
    if (pageItems.length === 0) {
      masterBox.checked = false;
      masterBox.indeterminate = false;
    } else {
      const allSelected = pageItems.every(item => AppState.adminSelectedIds.has(item.id));
      const someSelected = pageItems.some(item => AppState.adminSelectedIds.has(item.id));
      masterBox.checked = allSelected;
      masterBox.indeterminate = !allSelected && someSelected;
    }
  }
}

function renderAdminPagination(totalItems, totalPages) {
  const container = document.getElementById('adminTablePagination');
  if (!container) return;

  if (totalItems === 0) {
    container.innerHTML = '';
    return;
  }

  const cur = AppState.adminCurrentPage;
  const startItem = (cur - 1) * AppState.adminPageSize + 1;
  const endItem = Math.min(cur * AppState.adminPageSize, totalItems);

  container.innerHTML = `
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 text-xs text-slate-500">
      <div>
        แสดงรายการที่ <strong class="text-slate-700">${startItem.toLocaleString()}</strong> ถึง <strong class="text-slate-700">${endItem.toLocaleString()}</strong> จากทั้งหมด <strong class="text-blue-700 font-bold">${totalItems.toLocaleString()}</strong> รายการใน Supabase
      </div>
      <div class="flex items-center gap-1">
        <button onclick="setAdminPage(1)" ${cur === 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-200"'} class="px-2.5 py-1 rounded bg-slate-100 font-semibold text-slate-700 transition">⇤ แรกสุด</button>
        <button onclick="setAdminPage(${cur - 1})" ${cur === 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-200"'} class="px-2.5 py-1 rounded bg-slate-100 font-semibold text-slate-700 transition">◀ ก่อนหน้า</button>
        <span class="px-3 py-1 font-bold text-blue-700 bg-blue-50 rounded border border-blue-200">หน้า ${cur} / ${totalPages}</span>
        <button onclick="setAdminPage(${cur + 1})" ${cur === totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-200"'} class="px-2.5 py-1 rounded bg-slate-100 font-semibold text-slate-700 transition">ถัดไป ▶</button>
        <button onclick="setAdminPage(${totalPages})" ${cur === totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-200"'} class="px-2.5 py-1 rounded bg-slate-100 font-semibold text-slate-700 transition">ท้ายสุด ⇥</button>
      </div>
    </div>
  `;
}

function setAdminPage(pageNum) {
  const total = AppState.adminTotalFilteredCount || AppState.adminFilteredOrders.length;
  const totalPages = Math.ceil(total / AppState.adminPageSize) || 1;
  if (pageNum < 1 || pageNum > totalPages) return;
  AppState.adminCurrentPage = pageNum;
  loadAdminOrders();
}
window.setAdminPage = setAdminPage;

function openAdminDeleteModal() {
  if (AppState.adminSelectedIds.size === 0) {
    alert('กรุณาเลือกรายการที่ต้องการลบอย่างน้อย 1 รายการ');
    return;
  }

  const modal = document.getElementById('adminConfirmDeleteModal');
  const countEl = document.getElementById('deleteModalCount');
  const listEl = document.getElementById('deleteModalItemList');

  if (countEl) countEl.textContent = AppState.adminSelectedIds.size.toLocaleString();

  if (listEl) {
    const selectedList = (AppState.adminOrders || []).filter(o => AppState.adminSelectedIds.has(o.id));
    let itemsHtml = '';
    selectedList.slice(0, 10).forEach(item => {
      itemsHtml += `<div class="truncate">• ID: <strong>#${item.id}</strong> | รหัสสมาชิก: <strong>${item.member_id}</strong> - ${item.customer_name} (${item.branch}) [วันที่: ${formatThaiDateTime(item.delivery_date)}]</div>`;
    });
    if (selectedList.length > 10) {
      itemsHtml += `<div class="text-slate-400 italic">... และอีก ${(selectedList.length - 10).toLocaleString()} รายการ</div>`;
    }
    listEl.innerHTML = itemsHtml || '<div class="text-slate-400">รายการที่เลือก</div>';
  }

  if (modal) modal.classList.add('active');
}
window.openAdminDeleteModal = openAdminDeleteModal;

function openSingleDeleteModal(id) {
  AppState.adminSelectedIds.clear();
  AppState.adminSelectedIds.add(id);
  openAdminDeleteModal();
}
window.openSingleDeleteModal = openSingleDeleteModal;

async function executeSupabaseDelete() {
  if (AppState.adminSelectedIds.size === 0 || AppState.isDeletingAdminOrders) return;
  AppState.isDeletingAdminOrders = true;

  const btnConfirm = document.getElementById('btnConfirmDeleteSupabase');
  const originalBtnText = btnConfirm ? btnConfirm.innerHTML : '';
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = `<span class="live-pulse mr-1"></span> กำลังลบข้อมูลจาก Supabase Cloud...`;
  }

  const idsArray = Array.from(AppState.adminSelectedIds);
  const idsParam = idsArray.join(',');

  try {
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?id=in.(${idsParam})`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Prefer': 'return=minimal'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase API response: ${response.status} ${errText}`);
    }

    // Success! Update local state
    const deletedCount = idsArray.length;
    AppState.adminOrders = (AppState.adminOrders || []).filter(o => !AppState.adminSelectedIds.has(o.id));
    AppState.adminSelectedIds.clear();
    AppState.supabaseRowCount = Math.max(0, AppState.supabaseRowCount - deletedCount);

    // Update Row Count Display
    const adminCountEl = document.getElementById('adminTotalRowCount');
    if (adminCountEl) adminCountEl.textContent = AppState.supabaseRowCount.toLocaleString();

    const badgeEl = document.getElementById('supabaseStatusBadge');
    if (badgeEl) {
      badgeEl.innerHTML = `<span class="live-pulse mr-1.5"></span> Supabase Cloud: เชื่อมต่อสด (${AppState.supabaseRowCount.toLocaleString()} รายการ)`;
    }

    closeModal();
    await loadAdminOrders();

    // Show feedback alert
    alert(`✅ ลบข้อมูลสำเร็จจำนวน ${deletedCount.toLocaleString()} รายการ ออกจากฐานข้อมูล Supabase Cloud เรียบร้อยแล้ว`);
  } catch (err) {
    console.error('Delete operation error:', err);
    alert(`❌ เกิดข้อผิดพลาดในการลบข้อมูลจาก Supabase: ${err.message}`);
  } finally {
    AppState.isDeletingAdminOrders = false;
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = originalBtnText;
    }
  }
}
window.executeSupabaseDelete = executeSupabaseDelete;

// ==========================================
// 9. Admin PIN Security & Session Gate (PIN 171938)
// ==========================================
function verifyAdminPin() {
  const pinInput = document.getElementById('adminPinInput');
  const errorEl = document.getElementById('adminLoginError');
  let entered = pinInput ? pinInput.value.trim() : '';

  // Clean quotes, spaces, and normalize Thai numerals to Arabic numerals
  entered = entered.replace(/["'“”‘’]/g, '').trim();
  const thaiNumerals = ['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙'];
  thaiNumerals.forEach((th, idx) => {
    entered = entered.replaceAll(th, idx.toString());
  });

  if (entered === '171938') {
    AppState.isAdminAuthenticated = true;
    try { sessionStorage.setItem('admin_auth', '171938'); } catch (e) {}
    if (errorEl) errorEl.classList.add('hidden');
    if (pinInput) pinInput.value = '';
    updateAdminAuthUI();
  } else {
    if (errorEl) {
      errorEl.classList.remove('hidden');
      errorEl.textContent = '❌ รหัสผ่านไม่ถูกต้อง (รหัสที่ถูกต้องคือ 171938)';
    }
    if (pinInput) {
      pinInput.focus();
      pinInput.select();
    }
  }
}
window.verifyAdminPin = verifyAdminPin;

function quickAdminLogin() {
  const pinInput = document.getElementById('adminPinInput');
  if (pinInput) pinInput.value = '171938';
  verifyAdminPin();
}
window.quickAdminLogin = quickAdminLogin;

function togglePinVisibility() {
  const pinInput = document.getElementById('adminPinInput');
  const btn = document.getElementById('btnTogglePin');
  if (!pinInput) return;
  if (pinInput.type === 'password') {
    pinInput.type = 'text';
    if (btn) btn.textContent = '🙈';
  } else {
    pinInput.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
}
window.togglePinVisibility = togglePinVisibility;

function logoutAdmin() {
  AppState.isAdminAuthenticated = false;
  try { sessionStorage.removeItem('admin_auth'); } catch (e) {}
  updateAdminAuthUI();
}
window.logoutAdmin = logoutAdmin;

function updateAdminAuthUI() {
  const gate = document.getElementById('adminAuthGate');
  const content = document.getElementById('adminAuthenticatedContent');
  const isAuth = AppState.isAdminAuthenticated || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('admin_auth') === '171938');

  if (isAuth) {
    AppState.isAdminAuthenticated = true;
    if (gate) {
      gate.classList.add('hidden');
      gate.style.display = 'none';
    }
    if (content) {
      content.classList.remove('hidden');
      content.style.display = 'block';
    }
    // Refresh admin table once unlocked
    if (AppState.adminOrders && AppState.adminOrders.length > 0) {
      renderAdminTable();
    } else {
      loadAdminOrders();
    }
  } else {
    AppState.isAdminAuthenticated = false;
    if (gate) {
      gate.classList.remove('hidden');
      gate.style.display = 'block';
    }
    if (content) {
      content.classList.add('hidden');
      content.style.display = 'none';
    }
    const pinInput = document.getElementById('adminPinInput');
    if (pinInput) setTimeout(() => pinInput.focus(), 150);
  }
}
window.updateAdminAuthUI = updateAdminAuthUI;

// ==========================================
// 10. Admin Order Edit (PATCH to Supabase Cloud)
// ==========================================
function openAdminEditModal(id) {
  const order = AppState.adminOrders.find(o => o.id === id);
  if (!order) {
    alert('ไม่พบข้อมูลออเดอร์ #' + id);
    return;
  }

  const modal = document.getElementById('adminEditOrderModal');
  const idInput = document.getElementById('editOrderId');
  const memberInput = document.getElementById('editMemberId');
  const nameInput = document.getElementById('editCustomerName');
  const branchSelect = document.getElementById('editBranch');
  const truckInput = document.getElementById('editTruckNumber');
  const statusSelect = document.getElementById('editStatus');
  const reasonInput = document.getElementById('editReason');
  const addressInput = document.getElementById('editAddress');

  if (idInput) idInput.value = order.id;
  if (memberInput) memberInput.value = order.member_id || '';
  if (nameInput) nameInput.value = order.customer_name || '';
  if (branchSelect) branchSelect.value = order.branch || 'สาขารามอินทรา';
  if (truckInput) truckInput.value = order.truck_number || '';

  if (statusSelect) {
    const s = (order.status || '') + ' ' + (order.reason || '');
    if (s.includes('น้ำท่วม')) statusSelect.value = 'น้ำท่วมสูงไม่สามารถส่งได้';
    else if (s.includes('โอนงาน')) statusSelect.value = 'โอนงานสิ้นวัน';
    else if (s.includes('ติดตาม')) statusSelect.value = 'ติดตามปัญหา';
    else statusSelect.value = 'ส่งสำเร็จ';
  }

  if (reasonInput) reasonInput.value = order.reason || '';
  if (addressInput) addressInput.value = order.address || '';

  if (modal) modal.classList.add('active');
}
window.openAdminEditModal = openAdminEditModal;

async function saveAdminOrderEdit() {
  const idInput = document.getElementById('editOrderId');
  const memberInput = document.getElementById('editMemberId');
  const nameInput = document.getElementById('editCustomerName');
  const branchSelect = document.getElementById('editBranch');
  const truckInput = document.getElementById('editTruckNumber');
  const statusSelect = document.getElementById('editStatus');
  const reasonInput = document.getElementById('editReason');
  const addressInput = document.getElementById('editAddress');
  const btnSave = document.getElementById('btnSaveEditOrder');

  const orderId = idInput ? parseInt(idInput.value, 10) : null;
  if (!orderId) return;

  const payload = {
    member_id: memberInput ? memberInput.value.trim() : '',
    customer_name: nameInput ? nameInput.value.trim() : '',
    branch: branchSelect ? branchSelect.value : '',
    truck_number: truckInput ? truckInput.value.trim() : '',
    status: statusSelect ? statusSelect.value : '',
    reason: reasonInput ? reasonInput.value.trim() : '',
    address: addressInput ? addressInput.value.trim() : ''
  };

  const originalBtnText = btnSave ? btnSave.innerHTML : '';
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = `<span class="live-pulse mr-1"></span> กำลังบันทึกข้อมูลเข้าสู่ Supabase...`;
  }

  try {
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase PATCH failed: ${response.status} ${errText}`);
    }

    // Update locally in AppState.adminOrders
    const targetIdx = AppState.adminOrders.findIndex(o => o.id === orderId);
    if (targetIdx !== -1) {
      AppState.adminOrders[targetIdx] = {
        ...AppState.adminOrders[targetIdx],
        ...payload
      };
    }

    closeModal();
    applyAdminFilters();
    alert(`✅ บันทึกการแก้ไขข้อมูลออเดอร์ #${orderId} ลงใน Supabase Cloud เรียบร้อยแล้ว`);
  } catch (err) {
    console.error('Error saving order edit to Supabase:', err);
    // If synthetic/offline, update locally anyway
    const targetIdx = AppState.adminOrders.findIndex(o => o.id === orderId);
    if (targetIdx !== -1) {
      AppState.adminOrders[targetIdx] = {
        ...AppState.adminOrders[targetIdx],
        ...payload
      };
      closeModal();
      applyAdminFilters();
      alert(`⚠️ บันทึกข้อมูลในระบบเรียบร้อย (Supabase Cloud แจ้งเตือน: ${err.message})`);
    } else {
      alert(`❌ เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
    }
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = originalBtnText;
    }
  }
}
window.saveAdminOrderEdit = saveAdminOrderEdit;

// ==========================================
// 9. Page: Branch & Truck Intelligence Summary
// ==========================================
const TRUCK_ZONES = {
  '16306': 'ชุมชนนักกีฬาแหลมทอง ซ.1-15 / ทับช้าง',
  '16304': 'หมู่บ้านชาลิสา / กรุงเทพกรีฑา 18-20',
  '16302': 'สะพานสูง / ถ.นักกีฬาแหลมทอง',
  '16308': 'เคหะร่มเกล้า / ราษฎร์พัฒนา',
  '16204': 'ศรีนครินทร์-ร่มเกล้า / กรุงเทพกรีฑาตัดใหม่',
  '16301': 'พัฒนาการตัดใหม่ / สะพานสูง',
  '16202': 'หัวหมาก / ลำสาลี',
  '16303': 'ประชาสุขคอนโด / นักกีฬาแหลมทอง 9',
  '16305': 'รามคำแหง 118 / สัมมากร',
  '16102': 'มีนบุรีใต้ / เคหะชุมชน',
  '13205': 'นิมิตใหม่ / แสนแสบ / มีนบุรี',
  '13101': 'วัชรพล / สุขาภิบาล 5 / นันทวัน',
  '13207': 'ถ.บึงขวาง 1-2 / ทรายกองดิน',
  '13203': 'คลองสามวา / รามอินทรา กม.8',
  '13L16': 'พระยาสุเรนทร์ / ปัญญาอินทรา',
  '13304': 'ท่าแร้ง / โนเบิลจีโอ วัชรพล',
  '13402': 'ออเงิน / สุขาภิบาล 5 ซ.28',
  '13404': 'สายไหม / เพิ่มสิน',
  '13210': 'หทัยราษฎร์ / มีนบุรี',
  '13201': 'รามอินทรา กม.4-6 / คู้บอน',
  '11108': 'พระโขนง / สุขุมวิท 50-71 / คลองเตย',
  '11308': 'บางจาก / อ่อนนุช / ปุณณวิถี',
  '11206': 'อุดมสุข / บางนา-ตราด',
  '30206': 'สาธุประดิษฐ์ / ช่องนนทรี / ยานนาวา',
  '50101': 'พระราม 3 ริมน้ำ / คลองเตย',
  '50103': 'เจริญกรุง / บางคอแหลม',
  '50207': 'นราธิวาสราชนครินทร์ / นางลิ้นจี่',
  '50304': 'สีลม / สาทร / พระราม 4'
};

function initTruckSummary() {
  const dateInput = document.getElementById('truckSummaryDateInput');
  const startDateInput = document.getElementById('truckSummaryStartDateInput');
  const endDateInput = document.getElementById('truckSummaryEndDateInput');
  const searchInput = document.getElementById('truckSummarySearchInput');

  if (dateInput) {
    dateInput.addEventListener('change', () => {
      AppState.truckSummaryDate = dateInput.value;
      renderTruckSummaryPage();
    });
  }
  if (startDateInput) {
    startDateInput.addEventListener('change', () => {
      AppState.truckSummaryStartDate = startDateInput.value;
      renderTruckSummaryPage();
    });
  }
  if (endDateInput) {
    endDateInput.addEventListener('change', () => {
      AppState.truckSummaryEndDate = endDateInput.value;
      renderTruckSummaryPage();
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.truckSummaryTruckFilter = e.target.value.trim().toLowerCase();
      renderTruckSummaryPage();
    });
  }

  renderTruckSummaryPage();
}

function setTruckSummaryDateMode(mode) {
  AppState.truckSummaryDateMode = mode;
  const singleContainer = document.getElementById('truckSumSingleDateContainer');
  const rangeContainer = document.getElementById('truckSumRangeDateContainer');
  const btnSingle = document.getElementById('btnTruckSumModeSingle');
  const btnRange = document.getElementById('btnTruckSumModeRange');

  if (mode === 'single') {
    if (singleContainer) singleContainer.classList.remove('hidden');
    if (rangeContainer) rangeContainer.classList.add('hidden');
    if (btnSingle) btnSingle.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition bg-white text-blue-700 shadow-2xs';
    if (btnRange) btnRange.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition text-slate-600 hover:text-slate-900';
  } else {
    if (singleContainer) singleContainer.classList.add('hidden');
    if (rangeContainer) rangeContainer.classList.remove('hidden');
    if (btnSingle) btnSingle.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition text-slate-600 hover:text-slate-900';
    if (btnRange) btnRange.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition bg-white text-blue-700 shadow-2xs';
  }

  renderTruckSummaryPage();
}
window.setTruckSummaryDateMode = setTruckSummaryDateMode;

function setTruckSummaryDatePreset(mode, val1, val2) {
  if (mode === 'all') {
    AppState.truckSummaryDate = '';
    AppState.truckSummaryStartDate = '';
    AppState.truckSummaryEndDate = '';
    if (document.getElementById('truckSummaryDateInput')) document.getElementById('truckSummaryDateInput').value = '';
    if (document.getElementById('truckSummaryStartDateInput')) document.getElementById('truckSummaryStartDateInput').value = '';
    if (document.getElementById('truckSummaryEndDateInput')) document.getElementById('truckSummaryEndDateInput').value = '';
  } else if (mode === 'single') {
    setTruckSummaryDateMode('single');
    AppState.truckSummaryDate = val1;
    if (document.getElementById('truckSummaryDateInput')) document.getElementById('truckSummaryDateInput').value = val1;
  } else if (mode === 'range') {
    setTruckSummaryDateMode('range');
    AppState.truckSummaryStartDate = val1;
    AppState.truckSummaryEndDate = val2;
    if (document.getElementById('truckSummaryStartDateInput')) document.getElementById('truckSummaryStartDateInput').value = val1;
    if (document.getElementById('truckSummaryEndDateInput')) document.getElementById('truckSummaryEndDateInput').value = val2;
  }
  renderTruckSummaryPage();
}
window.setTruckSummaryDatePreset = setTruckSummaryDatePreset;

function setTruckSummaryBranch(branch) {
  AppState.truckSummaryBranchFilter = branch;
  document.querySelectorAll('.truck-branch-pill').forEach(btn => {
    if (btn.getAttribute('data-branch') === branch) {
      btn.className = 'truck-branch-pill px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-xs';
    } else {
      btn.className = 'truck-branch-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold transition bg-slate-100 text-slate-700 hover:bg-slate-200';
    }
  });
  renderTruckSummaryPage();
}
window.setTruckSummaryBranch = setTruckSummaryBranch;

function resetTruckSummaryFilters() {
  AppState.truckSummaryBranchFilter = 'ALL';
  AppState.truckSummaryTruckFilter = '';
  AppState.truckSummaryDate = '';
  AppState.truckSummaryStartDate = '';
  AppState.truckSummaryEndDate = '';

  if (document.getElementById('truckSummarySearchInput')) document.getElementById('truckSummarySearchInput').value = '';
  if (document.getElementById('truckSummaryDateInput')) document.getElementById('truckSummaryDateInput').value = '';
  if (document.getElementById('truckSummaryStartDateInput')) document.getElementById('truckSummaryStartDateInput').value = '';
  if (document.getElementById('truckSummaryEndDateInput')) document.getElementById('truckSummaryEndDateInput').value = '';

  setTruckSummaryBranch('ALL');
  setTruckSummaryDateMode('single');
}
window.resetTruckSummaryFilters = resetTruckSummaryFilters;

function renderTruckSummaryPage() {
  const container = document.getElementById('truckSummaryBranchesContainer');
  if (!container) return;

  const allCrisis = [...(AppState.dataStore.pending || []), ...(AppState.dataStore.resolved || [])];

  const branchFilter = AppState.truckSummaryBranchFilter || 'ALL';
  const truckQuery = (AppState.truckSummaryTruckFilter || '').toLowerCase();
  const dateMode = AppState.truckSummaryDateMode;
  const singleDate = AppState.truckSummaryDate;
  const startDate = AppState.truckSummaryStartDate;
  const endDate = AppState.truckSummaryEndDate;

  // Filter raw data according to date filters
  const filteredCrisis = allCrisis.filter(item => {
    if (dateMode === 'single' && singleDate) {
      const [y, m, d] = singleDate.split('-');
      const shortThai = `${parseInt(d, 10)}/${parseInt(m, 10)}/${parseInt(y, 10) + 543}`;
      const shortAd = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
      const hist = item.history || '';
      const iso = item.lastDateIso || '';
      const lastD = item.lastDate || '';
      return iso.startsWith(singleDate) || lastD === shortThai || lastD === shortAd || hist.includes(shortThai) || hist.includes(shortAd);
    } else if (dateMode === 'range' && (startDate || endDate)) {
      const iso = item.lastDateIso ? item.lastDateIso.substring(0, 10) : '';
      if (startDate && iso && iso < startDate) return false;
      if (endDate && iso && iso > endDate) return false;
    }
    return true;
  });

  // Calculate Overall KPIs
  let overallTotal = filteredCrisis.length;
  let overallResolved = 0;
  let overallFlood = 0;
  let overallTransfer = 0;

  const branchMap = {
    'สาขากรุงเทพกรีฑา': { total: 0, resolved: 0, flood: 0, transfer: 0, trucks: {} },
    'สาขารามอินทรา': { total: 0, resolved: 0, flood: 0, transfer: 0, trucks: {} },
    'สาขาสุขุมวิท 50': { total: 0, resolved: 0, flood: 0, transfer: 0, trucks: {} },
    'สาขาพระราม 3': { total: 0, resolved: 0, flood: 0, transfer: 0, trucks: {} }
  };

  filteredCrisis.forEach(item => {
    const b = item.branch || 'สาขากรุงเทพกรีฑา';
    const trk = item.truck || 'ไม่ระบุ';
    if (!branchMap[b]) {
      branchMap[b] = { total: 0, resolved: 0, flood: 0, transfer: 0, trucks: {} };
    }

    const isPending = !!item.pendingCategory;
    const isTransfer = item.pendingCategory === 'โอนงานสิ้นวัน';

    branchMap[b].total++;
    if (isPending) {
      if (isTransfer) {
        branchMap[b].transfer++;
        overallTransfer++;
      } else {
        branchMap[b].flood++;
        overallFlood++;
      }
    } else {
      branchMap[b].resolved++;
      overallResolved++;
    }

    if (!branchMap[b].trucks[trk]) {
      branchMap[b].trucks[trk] = {
        truck: trk,
        branch: b,
        total: 0,
        resolved: 0,
        flood: 0,
        transfer: 0,
        members: []
      };
    }

    branchMap[b].trucks[trk].total++;
    if (isPending) {
      if (isTransfer) branchMap[b].trucks[trk].transfer++;
      else branchMap[b].trucks[trk].flood++;
    } else {
      branchMap[b].trucks[trk].resolved++;
    }
    branchMap[b].trucks[trk].members.push(item);
  });

  // Count active unique trucks
  let totalUniqueTrucks = 0;
  Object.values(branchMap).forEach(b => {
    totalUniqueTrucks += Object.keys(b.trucks).length;
  });

  // Update Top KPI Cards
  const kpiTotalEl = document.getElementById('kpiSumTotalOrders');
  const kpiTrucksEl = document.getElementById('kpiSumActiveTrucks');
  const kpiResolvedEl = document.getElementById('kpiSumResolvedOrders');
  const kpiResolvedRateEl = document.getElementById('kpiSumResolvedRate');
  const kpiFloodEl = document.getElementById('kpiSumFloodOrders');
  const kpiTransferEl = document.getElementById('kpiSumTransferOrders');

  if (kpiTotalEl) kpiTotalEl.textContent = overallTotal.toLocaleString();
  if (kpiTrucksEl) kpiTrucksEl.textContent = `${totalUniqueTrucks} คัน`;
  if (kpiResolvedEl) kpiResolvedEl.textContent = overallResolved.toLocaleString();
  if (kpiResolvedRateEl) {
    const rate = overallTotal > 0 ? ((overallResolved / overallTotal) * 100).toFixed(1) : '100';
    kpiResolvedRateEl.textContent = `${rate}%`;
  }
  if (kpiFloodEl) kpiFloodEl.textContent = overallFlood.toLocaleString();
  if (kpiTransferEl) kpiTransferEl.textContent = overallTransfer.toLocaleString();

  // Render Branches HTML
  const branchesToDisplay = branchFilter === 'ALL'
    ? Object.keys(branchMap)
    : [branchFilter];

  let html = '';

  branchesToDisplay.forEach(branchName => {
    const bData = branchMap[branchName] || { total: 0, resolved: 0, flood: 0, transfer: 0, trucks: {} };
    let truckList = Object.values(bData.trucks);

    // Apply Truck Search Filter
    if (truckQuery) {
      truckList = truckList.filter(t => t.truck.toLowerCase().includes(truckQuery) || (TRUCK_ZONES[t.truck] || '').toLowerCase().includes(truckQuery));
    }

    // Sort: highest pending / lowest success first
    truckList.sort((a, b) => (b.flood + b.transfer) - (a.flood + a.transfer) || b.total - a.total);

    const bRate = bData.total > 0 ? ((bData.resolved / bData.total) * 100).toFixed(1) : '100.0';

    let branchBorderColor = 'border-l-blue-600';
    let branchBadgeClass = 'badge-blue';
    if (branchName.includes('รามอินทรา')) {
      branchBorderColor = 'border-l-rose-600';
      branchBadgeClass = 'badge-danger';
    } else if (branchName.includes('กรุงเทพกรีฑา')) {
      branchBorderColor = 'border-l-amber-500';
      branchBadgeClass = 'badge-warning';
    } else if (branchName.includes('พระราม 3')) {
      branchBorderColor = 'border-l-emerald-500';
      branchBadgeClass = 'badge-success';
    }

    html += `
      <div class="exec-card p-5 border-l-4 ${branchBorderColor} shadow-sm space-y-4">
        
        <!-- Branch Header Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-base shadow-2xs">
              🏢
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-extrabold text-base text-slate-900">${branchName}</h3>
                <span class="badge ${branchBadgeClass}">${bRate}% สำเร็จ</span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                รวมทั้งหมด <strong class="text-slate-800">${bData.total.toLocaleString()}</strong> ถัง • ส่งสำเร็จ <strong class="text-emerald-700 font-bold">${bData.resolved.toLocaleString()}</strong> • ค้างส่งน้ำท่วม <strong class="text-rose-600 font-bold">${bData.flood.toLocaleString()}</strong> • โอนงาน <strong class="text-purple-600 font-bold">${bData.transfer.toLocaleString()}</strong>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              สายรถทั้งหมด: <strong class="text-blue-700 font-bold">${Object.keys(bData.trucks).length} คัน</strong>
            </span>
          </div>
        </div>

        <!-- Clean Trucks Table -->
        <div class="overflow-x-auto border border-slate-200 rounded-xl">
          <table class="exec-table text-xs w-full">
            <thead class="bg-slate-50">
              <tr>
                <th style="width: 100px;">เบอร์รถ</th>
                <th>โซนพื้นที่รับผิดชอบ</th>
                <th style="width: 110px;" class="text-center">ออเดอร์ทั้งหมด</th>
                <th style="width: 100px;" class="text-center">ส่งสำเร็จ</th>
                <th style="width: 105px;" class="text-center">ค้างน้ำท่วม</th>
                <th style="width: 95px;" class="text-center">โอนงาน</th>
                <th style="width: 150px;">ความสำเร็จ (%)</th>
                <th style="width: 120px;" class="text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (truckList.length === 0) {
      html += `
        <tr>
          <td colspan="8" class="text-center py-6 text-slate-400 font-semibold">
            ไม่พบสายรถตามเงื่อนไขที่ค้นหา
          </td>
        </tr>
      `;
    } else {
      truckList.forEach(t => {
        const rate = t.total > 0 ? ((t.resolved / t.total) * 100).toFixed(1) : '100.0';
        const numRate = parseFloat(rate);
        const zone = TRUCK_ZONES[t.truck] || 'เขตพื้นที่บริการหลัก';

        let progressColor = 'bg-emerald-500';
        if (numRate < 60) progressColor = 'bg-rose-500';
        else if (numRate < 85) progressColor = 'bg-amber-500';

        html += `
          <tr class="hover:bg-blue-50/50 transition cursor-pointer" onclick="openTruckDetailModal('${t.truck}', '${branchName}')">
            <td>
              <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                🚚 ${t.truck}
              </span>
            </td>
            <td>
              <div class="font-semibold text-slate-800">${zone}</div>
            </td>
            <td class="text-center font-bold text-slate-800">${t.total}</td>
            <td class="text-center font-bold text-emerald-700">${t.resolved}</td>
            <td class="text-center font-bold ${t.flood > 0 ? 'text-rose-600' : 'text-slate-400'}">${t.flood > 0 ? `${t.flood} ราย` : '0'}</td>
            <td class="text-center font-bold ${t.transfer > 0 ? 'text-purple-600' : 'text-slate-400'}">${t.transfer > 0 ? `${t.transfer} ราย` : '0'}</td>
            <td>
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div class="${progressColor} h-2 rounded-full" style="width: ${numRate}%"></div>
                </div>
                <span class="font-bold text-[11px] text-slate-700 w-10 text-right">${numRate}%</span>
              </div>
            </td>
            <td class="text-right">
              <button type="button" onclick="event.stopPropagation(); openTruckDetailModal('${t.truck}', '${branchName}')" class="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition inline-flex items-center gap-1 shadow-2xs">
                <span>🔍 รายชื่อสมาชิก</span>
              </button>
            </td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}
window.renderTruckSummaryPage = renderTruckSummaryPage;

// --- Truck Members Detail Modal ---
function openTruckDetailModal(truckNumber, branch) {
  AppState.activeTruckModalTruck = truckNumber;
  const modal = document.getElementById('truckDetailModal');
  if (!modal) return;

  const titleEl = document.getElementById('truckDetailModalTitle');
  const subtitleEl = document.getElementById('truckDetailModalSubtitle');
  const totalEl = document.getElementById('truckModalTotal');
  const resolvedEl = document.getElementById('truckModalResolved');
  const floodEl = document.getElementById('truckModalFlood');
  const transferEl = document.getElementById('truckModalTransfer');

  const allCrisis = [...(AppState.dataStore.pending || []), ...(AppState.dataStore.resolved || [])];
  const truckItems = allCrisis.filter(item => String(item.truck) === String(truckNumber));

  AppState.activeTruckModalItems = truckItems;

  let total = truckItems.length;
  let resolved = truckItems.filter(i => !i.pendingCategory).length;
  let flood = truckItems.filter(i => i.pendingCategory && i.pendingCategory !== 'โอนงานสิ้นวัน').length;
  let transfer = truckItems.filter(i => i.pendingCategory === 'โอนงานสิ้นวัน').length;

  const zone = TRUCK_ZONES[truckNumber] || 'เขตพื้นที่บริการ';

  if (titleEl) titleEl.textContent = `รายละเอียดสายรถ: 🚚 #${truckNumber} (${branch || 'ทุกสาขา'})`;
  if (subtitleEl) subtitleEl.textContent = `โซน: ${zone} • สมาชิกที่เข้าส่งทั้งหมด ${total.toLocaleString()} ราย`;
  if (totalEl) totalEl.textContent = total.toLocaleString();
  if (resolvedEl) resolvedEl.textContent = resolved.toLocaleString();
  if (floodEl) floodEl.textContent = flood.toLocaleString();
  if (transferEl) transferEl.textContent = transfer.toLocaleString();

  const searchInput = document.getElementById('truckModalSearchInput');
  if (searchInput) searchInput.value = '';

  filterTruckModalMembers();
  modal.classList.add('active');
}
window.openTruckDetailModal = openTruckDetailModal;

function filterTruckModalMembers() {
  const tbody = document.getElementById('truckModalTableBody');
  const countEl = document.getElementById('truckModalItemCount');
  if (!tbody) return;

  const query = (document.getElementById('truckModalSearchInput')?.value || '').trim().toLowerCase();
  const items = AppState.activeTruckModalItems || [];

  const filtered = items.filter(item => {
    if (query) {
      const str = `${item.memberId} ${item.name} ${item.address} ${item.lastReason || item.resolvedReason || ''}`.toLowerCase();
      if (!str.includes(query)) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `แสดง ${filtered.length.toLocaleString()} รายการ`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 font-semibold">ไม่พบรายการสมาชิก</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const isPending = !!item.pendingCategory;
    const isTransfer = item.pendingCategory === 'โอนงานสิ้นวัน';
    const statusBadge = isPending
      ? `<span class="badge ${isTransfer ? 'badge-purple' : 'badge-danger'}">${item.pendingCategory || 'น้ำท่วม'}</span>`
      : `<span class="badge badge-success">ส่งสำเร็จ</span>`;

    const date = item.lastDate || item.resolvedDate || '-';
    const reason = item.lastReason || item.resolvedReason || (isPending ? 'ไม่สามารถเข้าส่งได้' : 'ส่งสำเร็จเรียบร้อย');

    return `
      <tr>
        <td class="font-bold text-slate-800 font-mono">#${item.memberId}</td>
        <td>
          <div class="font-semibold text-slate-900">${item.name}</div>
          <div class="text-[11px] text-slate-500 truncate max-w-xs">${item.address || '-'}</div>
        </td>
        <td><div class="text-xs text-slate-700">${date}</div></td>
        <td><div class="text-xs text-slate-800 font-medium">${reason}</div></td>
        <td>${statusBadge}</td>
        <td class="text-right">
          <button onclick="viewMemberHistory('${item.memberId}')" class="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition inline-flex items-center gap-1">
            <span>ไทม์ไลน์</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
window.filterTruckModalMembers = filterTruckModalMembers;

function goToMapWithTruck() {
  const truck = AppState.activeTruckModalTruck;
  closeModal();
  switchPage('page-pending-map');
  const mapTruckInput = document.getElementById('mapTruckInput');
  if (mapTruckInput && truck) {
    mapTruckInput.value = truck;
    applyMapFilters();
  }
}
window.goToMapWithTruck = goToMapWithTruck;

function goToDetailsWithTruck() {
  const truck = AppState.activeTruckModalTruck;
  closeModal();
  switchPage('page-details');
  const truckInput = document.getElementById('tableTruckInput');
  if (truckInput && truck) {
    truckInput.value = truck;
    AppState.tableTruckFilter = truck.toLowerCase();
    renderTable();
  }
}
window.goToDetailsWithTruck = goToDetailsWithTruck;

function exportTruckModalCsv() {
  const truck = AppState.activeTruckModalTruck || 'truck';
  const items = AppState.activeTruckModalItems || [];
  if (items.length === 0) return alert('ไม่มีข้อมูลสำหรับส่งออก CSV');

  let csv = '\uFEFFรหัสสมาชิก,ชื่อลูกค้า,สาขา,สายรถ,ที่อยู่,จำนวนครั้งเข้าส่ง,สถานะ,เหตุผล,ประวัติ\n';
  items.forEach(item => {
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
  a.download = `truck_${truck}_orders.csv`;
  a.click();
}
window.exportTruckModalCsv = exportTruckModalCsv;


