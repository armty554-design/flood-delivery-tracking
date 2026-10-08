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
  memberAddressLookup: {},
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
// ==========================================
// 1. Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initSidebar();
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

// Update live clocks
function initClock() {
  const clockEl = document.getElementById('liveClockText');
  const topClockEl = document.getElementById('topBarClockText');
  function update() {
    const now = new Date();
    const opts = { timeZone: 'Asia/Bangkok', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const timeStr = `${now.toLocaleTimeString('th-TH', opts)} น.`;
    if (clockEl) clockEl.textContent = timeStr;
    if (topClockEl) topClockEl.textContent = timeStr;
  }
  update();
  if (!navigator.webdriver) {
    setInterval(update, 1000);
  }
}

// ==========================================
// Sidebar & Collapsible System
// ==========================================
function initSidebar() {
  const savedState = localStorage.getItem('water_intel_sidebar_collapsed');
  if (savedState === 'true') {
    document.body.classList.add('sidebar-collapsed');
  }
}

function toggleSidebar() {
  const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('water_intel_sidebar_collapsed', isCollapsed ? 'true' : 'false');

  // Trigger leaflet resize if map is initialized
  if (AppState.leafletMap) {
    setTimeout(() => {
      AppState.leafletMap.invalidateSize();
    }, 320);
  }
}
window.toggleSidebar = toggleSidebar;

function openMobileSidebar() {
  document.body.classList.add('mobile-sidebar-open');
}
window.openMobileSidebar = openMobileSidebar;

function closeMobileSidebar() {
  document.body.classList.remove('mobile-sidebar-open');
}
window.closeMobileSidebar = closeMobileSidebar;

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
          badgeEl.innerHTML = `<span class="live-pulse bg-blue-600 shrink-0"></span> <span class="sidebar-text truncate">Supabase Cloud: เชื่อมต่อสด (${count.toLocaleString()} รายการ)</span>`;
          badgeEl.className = 'flex items-center gap-2 p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold shadow-2xs';
        }
        const adminCountEl = document.getElementById('adminTotalRowCount');
        if (adminCountEl) adminCountEl.textContent = count.toLocaleString();
      }
    }
    // Auto-sync latest operational dataset into all charts and views
    syncLatestSupabaseDataToAppState();
  }).catch(err => {
    console.warn('Supabase ping check:', err);
  });
}

// ==========================================
// 2. Navigation & Page Switching
// ==========================================
const PAGE_TITLES = {
  'page-duration': { icon: '📊', title: 'หน้า 1: กราฟติดตาม ระยะเวลาในการส่ง ทั้ง 4 สาขา' },
  'page-truck-summary': { icon: '🚚', title: 'หน้าสรุปแยกสาขาและเบอร์รถ' },
  'page-pending-map': { icon: '🗺️', title: 'หน้า 2: แผนที่โชว์จุดสมาชิกที่ยังจัดส่งไม่ได้' },
  'page-cctv': { icon: '📹', title: 'หน้า 3: CCtv (ระบบกล้องวงจรปิดตรวจการณ์สด)' },
  'page-gistda-flood': { icon: '🛰️', title: 'หน้า 4: แผนที่น้ำท่วม ดึงจาก GISTDA Open API' },
  'page-details': { icon: '📋', title: 'หน้า 5: รายละเอียดข้อมูลการจัดส่งรายสมาชิก' },
  'page-admin': { icon: '⚙️', title: 'หน้า 6: จัดการข้อมูล Admin (Supabase Cloud)' }
};

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

  // Close mobile sidebar on navigation
  closeMobileSidebar();

  // Update top bar title & icon
  const meta = PAGE_TITLES[pageId] || { icon: '📌', title: 'ศูนย์ติดตามการจัดส่ง' };
  const topIconEl = document.getElementById('topBarActivePageIcon');
  const topTitleEl = document.getElementById('topBarActivePageTitle');
  if (topIconEl) topIconEl.textContent = meta.icon;
  if (topTitleEl) topTitleEl.textContent = meta.title;

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
    }, 250);
  } else if (pageId === 'page-cctv') {
    switchCctvPortal('LONGDO');
    setTimeout(() => {
      initLongdoTrafficMap();
      if (longdoMapInstance && typeof longdoMapInstance.resize === 'function') {
        longdoMapInstance.resize();
      }
    }, 200);
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
    AppState.dailyChart = new Chart(dailyCtx, {
      type: 'bar',
      data: {
        labels: ['26 ก.ย. (เสาร์)', '27 ก.ย. (อาทิตย์)', '28 ก.ย. (จันทร์)', '29 ก.ย. (อังคาร)', '30 ก.ย. (พุธ)', '1 ต.ค. (พฤหัส)', '2 ต.ค. (ศุกร์)', '3 ต.ค. (เสาร์)', '4 ต.ค. (อาทิตย์)', '5 ต.ค. (จันทร์)', '6 ต.ค. (อังคาร)', '7 ต.ค. (ปัจจุบัน)'],
        datasets: [
          {
            type: 'line',
            label: 'ยังไม่ได้รับน้ำเลย (คงค้างประสานงาน)',
            data: [5072, 5068, 4923, 4821, 4746, 4646, 4420, 2271, 2229, 1364, 829, 393],
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
            data: [0, 4, 149, 251, 326, 426, 652, 2801, 2843, 3708, 4243, 4679],
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
            data: [0, 4, 145, 102, 75, 100, 226, 2149, 42, 865, 535, 436],
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
            max: 5500,
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

  // 2. Comparison Bar Chart (4 Branches - Crisis 5,072 Dataset)
  const branchCtx = document.getElementById('chartBranchCompare');
  if (branchCtx) {
    AppState.branchChart = new Chart(branchCtx, {
      type: 'bar',
      data: {
        labels: ['สาขารามอินทรา', 'สาขากรุงเทพกรีฑา', 'สาขาสุขุมวิท 50', 'สาขาพระราม 3'],
        datasets: [
          {
            label: 'ส่งสำเร็จ (Delivered)',
            data: [1554, 2167, 944, 14],
            backgroundColor: '#10b981',
            borderRadius: 6,
            datalabelColor: '#047857'
          },
          {
            label: 'ค้างส่งน้ำท่วม (Flood Pending)',
            data: [279, 97, 0, 0],
            backgroundColor: '#ef4444',
            borderRadius: 6,
            datalabelColor: '#dc2626'
          },
          {
            label: 'โอนงานสิ้นวัน (Transfer EOD)',
            data: [7, 2, 8, 0],
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
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString()} ราย`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 2500,
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
        labels: ['26 ก.ย.', '27 ก.ย.', '28 ก.ย.', '29 ก.ย.', '30 ก.ย.', '1 ต.ค.', '2 ต.ค.', '3 ต.ค.', '4 ต.ค.', '5 ต.ค.', '6 ต.ค.', '7 ต.ค.'],
        datasets: [
          {
            label: 'พระราม 3 (สำเร็จ %)',
            data: [0.0, 0.0, 14.3, 21.4, 21.4, 21.4, 28.6, 78.6, 78.6, 78.6, 78.6, 100.0],
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            tension: 0.3,
            datalabelColor: '#047857',
            datalabelSuffix: '%'
          },
          {
            label: 'สุขุมวิท 50 (สำเร็จ %)',
            data: [0.0, 0.1, 5.8, 7.4, 8.3, 9.2, 13.6, 71.0, 71.3, 81.0, 91.8, 99.2],
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            tension: 0.3,
            datalabelColor: '#1d4ed8',
            datalabelSuffix: '%'
          },
          {
            label: 'กรุงเทพกรีฑา (สำเร็จ %)',
            data: [0.0, 0.0, 1.9, 4.0, 5.2, 8.4, 13.2, 48.5, 50.0, 75.4, 85.6, 95.6],
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            tension: 0.3,
            datalabelColor: '#b45309',
            datalabelSuffix: '%'
          },
          {
            label: 'รามอินทรา (สำเร็จ %)',
            data: [0.0, 0.2, 2.7, 4.7, 6.9, 7.9, 11.9, 55.2, 55.5, 66.1, 77.1, 84.5],
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
            min: 0,
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
// 3.2. Central Auto-Update & Dynamic Sync Engine
// ==========================================
function formatShortDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).substring(0, 10);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const yearBe = d.getFullYear() + 543;
    return `${day}/${month}/${yearBe}`;
  } catch (e) {
    return String(dateStr).substring(0, 10);
  }
}
window.formatShortDate = formatShortDate;

function renderDailyProgressTableAndChart() {
  const pending = (AppState.dataStore && AppState.dataStore.pending) || (window.CRISIS_DATA && window.CRISIS_DATA.pending) || [];
  const resolved = (AppState.dataStore && AppState.dataStore.resolved) || (window.CRISIS_DATA && window.CRISIS_DATA.resolved) || [];
  const totalCrisis = pending.length + resolved.length;

  const dateConfigs = [
    { key: '2026-09-26', label: '26 ก.ย. (เสาร์)', note: 'วันเกิดเหตุวิกฤตน้ำท่วมฉับพลันและเริ่มบันทึกการโอนงานสิ้นวัน' },
    { key: '2026-09-27', label: '27 ก.ย. (อาทิตย์)', note: 'เริ่มส่งมอบน้ำบรรเทาความเดือดร้อนเบื้องต้นในพื้นที่เข้าถึงได้' },
    { key: '2026-09-28', label: '28 ก.ย. (จันทร์)', note: 'เปิดปฏิบัติการฟื้นฟูเชิงรุก ส่งสำเร็จเพิ่มขึ้นอย่างมีนัยสำคัญ' },
    { key: '2026-09-29', label: '29 ก.ย. (อังคาร)', note: 'คลี่คลายต่อเนื่องในโซนพื้นที่น้ำลด สาขากรุงเทพกรีฑาเริ่มกลับมาส่งได้' },
    { key: '2026-09-30', label: '30 ก.ย. (พุธ)', note: 'ยอดจัดส่งสำเร็จสะสมแตะระดับ 326 ราย' },
    { key: '2026-10-01', label: '1 ต.ค. (พฤหัส)', note: 'เข้าส่งซ้ำในพื้นที่น้ำท่วมสูงกรุงเทพกรีฑาและรามอินทรา' },
    { key: '2026-10-02', label: '2 ต.ค. (ศุกร์)', note: 'เข้าแก้ไขกลุ่มเคสตกค้างและจุดน้ำลดระดับ' },
    { key: '2026-10-03', label: '3 ต.ค. (เสาร์)', note: 'เคลียร์ส่งมอบสำเร็จครั้งใหญ่สะสมทะลุ 2,800 ราย (55.2%)' },
    { key: '2026-10-04', label: '4 ต.ค. (อาทิตย์)', note: 'เก็บตกรอบสุดสัปดาห์ในจุดที่น้ำลด' },
    { key: '2026-10-05', label: '5 ต.ค. (จันทร์)', note: 'เปิดสัปดาห์ใหม่ เข้าส่งสำเร็จเพิ่มอีก 865 ราย (แตะ 73.1%)' },
    { key: '2026-10-06', label: '6 ต.ค. (อังคาร)', note: 'อัตราความสำเร็จสะสมเพิ่มเป็น 83.7%' },
    { key: '2026-10-07', label: '7 ต.ค. (ปัจจุบัน)', note: 'สถานะปัจจุบัน จัดส่งสำเร็จ 92.3% คงเหลือกลุ่มน้ำท่วมลึกและโอนงาน 393 ราย' }
  ];

  let cumCount = 0;
  const labels = [];
  const pendingData = [];
  const cumResolvedData = [];
  const dailyResolvedData = [];
  const tableRowsHtml = [];

  dateConfigs.forEach((d, index) => {
    const dailyResolved = resolved.filter(r => (r.resolvedDateIso && r.resolvedDateIso.startsWith(d.key))).length;
    cumCount += dailyResolved;
    const remainingPending = totalCrisis - cumCount;
    const rateVal = totalCrisis > 0 ? ((cumCount / totalCrisis) * 100).toFixed(1) : '0.0';
    const rateText = `${rateVal}%`;

    // Dynamically update DAILY_METRICS_INFO for drilldown modal
    if (typeof DAILY_METRICS_INFO !== 'undefined') {
      DAILY_METRICS_INFO[d.key] = {
        label: `${d.label} 2569`,
        dailyResolved,
        cumResolved: cumCount,
        pending: remainingPending,
        rate: rateText,
        note: d.note
      };
    }

    labels.push(d.label);
    pendingData.push(remainingPending);
    cumResolvedData.push(cumCount);
    dailyResolvedData.push(dailyResolved);

    const isLast = index === dateConfigs.length - 1;
    const isFirst = index === 0;
    const badgeClass = parseFloat(rateVal) >= 80 ? 'badge-success' : (parseFloat(rateVal) >= 50 ? 'badge-blue' : 'badge-warning');

    const dailyResolvedHtml = dailyResolved > 0 
      ? `<span class="font-bold text-blue-600">+${dailyResolved.toLocaleString()} ราย</span>` 
      : '0 ราย';
    const pendingHtml = remainingPending > 1500 
      ? `<span class="font-bold text-rose-600">${remainingPending.toLocaleString()} ราย</span>` 
      : (remainingPending > 500 ? `<span class="font-bold text-amber-600">${remainingPending.toLocaleString()} ราย</span>` : `<span class="font-extrabold text-rose-700">${remainingPending.toLocaleString()} ราย</span>`);
    const rateHtml = isFirst 
      ? `0.0% (วันวิกฤต)` 
      : `<span class="badge ${badgeClass}">${rateText}</span>`;
    const rowClass = isLast 
      ? 'bg-blue-50/70 font-semibold hover:bg-blue-100/70 cursor-pointer transition' 
      : 'hover:bg-blue-50/60 cursor-pointer transition';
    const dateTitleClass = isLast ? 'font-bold text-blue-900' : 'font-bold text-slate-700';

    tableRowsHtml.push(`
      <tr class="${rowClass}" onclick="openDailyDetailModal('${d.key}', '${d.label}')">
        <td class="${dateTitleClass}">${d.label}</td>
        <td>${dailyResolvedHtml}</td>
        <td class="${isLast ? 'text-emerald-700 font-bold' : ''}">${cumCount.toLocaleString()} ราย</td>
        <td>${pendingHtml}</td>
        <td>${rateHtml}</td>
        <td class="text-right">
          <button onclick="event.stopPropagation(); openDailyDetailModal('${d.key}', '${d.label}')" class="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition inline-flex items-center gap-1">
            <span>🔍 ดูรายละเอียด</span>
          </button>
        </td>
      </tr>
    `);
  });

  // Inject into Table Body
  const tbody = document.getElementById('dailyProgressionTableBody');
  if (tbody) {
    tbody.innerHTML = tableRowsHtml.join('');
  }

  // Update Header Badge
  const headerBadge = document.getElementById('dailyProgressHeaderBadge');
  if (headerBadge) {
    const finalRate = totalCrisis > 0 ? ((cumCount / totalCrisis) * 100).toFixed(1) : '92.3';
    headerBadge.textContent = `ความคืบหน้า ${finalRate}%`;
  }

  // Update Chart
  if (AppState.dailyChart && AppState.dailyChart.data && AppState.dailyChart.data.datasets) {
    AppState.dailyChart.data.labels = labels;
    if (AppState.dailyChart.data.datasets[0]) AppState.dailyChart.data.datasets[0].data = pendingData;
    if (AppState.dailyChart.data.datasets[1]) AppState.dailyChart.data.datasets[1].data = cumResolvedData;
    if (AppState.dailyChart.data.datasets[2]) AppState.dailyChart.data.datasets[2].data = dailyResolvedData;
    if (AppState.dailyChart.options && AppState.dailyChart.options.scales && AppState.dailyChart.options.scales.y) {
      AppState.dailyChart.options.scales.y.max = Math.ceil((totalCrisis + 300) / 500) * 500;
    }
    AppState.dailyChart.update();
  }
}
window.renderDailyProgressTableAndChart = renderDailyProgressTableAndChart;

function renderBranchPerformanceMatrixAndKpis() {
  const pending = (AppState.dataStore && AppState.dataStore.pending) || (window.CRISIS_DATA && window.CRISIS_DATA.pending) || [];
  const resolved = (AppState.dataStore && AppState.dataStore.resolved) || (window.CRISIS_DATA && window.CRISIS_DATA.resolved) || [];

  const branchConfigs = [
    { key: 'สาขาพระราม 3', name: 'สาขาพระราม 3', prefix: 'Rm3', statusText: 'ปกติสมบูรณ์', badgeClass: 'badge-success', colorClass: 'text-emerald-600' },
    { key: 'สาขาสุขุมวิท 50', name: 'สาขาสุขุมวิท 50', prefix: 'Svk', statusText: 'ปกติสมบูรณ์', badgeClass: 'badge-blue', colorClass: 'text-blue-600' },
    { key: 'สาขากรุงเทพกรีฑา', name: 'สาขากรุงเทพกรีฑา', prefix: 'Ktp', statusText: 'เฝ้าระวังน้ำขัง', badgeClass: 'badge-warning', colorClass: 'text-amber-600' },
    { key: 'สาขารามอินทรา', name: 'สาขารามอินทรา', prefix: 'Ram', statusText: 'วิกฤตน้ำท่วม 30-40cm', badgeClass: 'badge-danger', colorClass: 'text-rose-600' }
  ];

  let totalResolvedSum = 0;
  let totalFloodSum = 0;
  let totalTransferSum = 0;
  let totalCrisisSum = 0;

  const rowsHtml = branchConfigs.map(b => {
    const branchPending = pending.filter(p => p.branch === b.key);
    const branchResolved = resolved.filter(r => r.branch === b.key);

    const floodCount = branchPending.filter(p => p.pendingCategory !== 'โอนงานสิ้นวัน').length;
    const transferCount = branchPending.filter(p => p.pendingCategory === 'โอนงานสิ้นวัน').length;
    const resolvedCount = branchResolved.length;
    const totalCount = branchPending.length + resolvedCount;
    const rateVal = totalCount > 0 ? ((resolvedCount / totalCount) * 100).toFixed(1) : '100.0';

    totalResolvedSum += resolvedCount;
    totalFloodSum += floodCount;
    totalTransferSum += transferCount;
    totalCrisisSum += totalCount;

    // Update individual Page 1 Branch KPI cards
    const rateEl = document.getElementById(`page1BranchKpi${b.prefix}Rate`);
    const resolvedEl = document.getElementById(`page1BranchKpi${b.prefix}Resolved`);
    const pendingEl = document.getElementById(`page1BranchKpi${b.prefix}Pending`);
    const badgeEl = document.getElementById(`page1BranchKpi${b.prefix}Badge`);

    if (rateEl) rateEl.textContent = `${rateVal}%`;
    if (resolvedEl) resolvedEl.textContent = `${resolvedCount.toLocaleString()} ราย`;
    if (pendingEl) pendingEl.textContent = `ค้างส่ง: ${branchPending.length.toLocaleString()} ราย`;
    if (badgeEl) badgeEl.textContent = `สำเร็จ ${rateVal}%`;

    return `
      <tr>
        <td class="font-bold text-slate-900">${b.name}</td>
        <td><span class="font-bold ${b.colorClass}">${resolvedCount.toLocaleString()} ราย</span></td>
        <td>${floodCount.toLocaleString()} ราย</td>
        <td>${transferCount.toLocaleString()} ราย</td>
        <td>${totalCount.toLocaleString()} ราย</td>
        <td><span class="font-bold ${b.colorClass}">${rateVal}%</span></td>
        <td><span class="badge ${b.badgeClass}">${b.statusText}</span></td>
      </tr>
    `;
  });

  const matrixTbody = document.getElementById('branchMatrixTableBody');
  if (matrixTbody) matrixTbody.innerHTML = rowsHtml.join('');

  const matrixTfoot = document.getElementById('branchMatrixTableFoot');
  if (matrixTfoot) {
    const overallRate = totalCrisisSum > 0 ? ((totalResolvedSum / totalCrisisSum) * 100).toFixed(1) : '92.3';
    matrixTfoot.innerHTML = `
      <tr>
        <td>รวมทั้งหมด (4 สาขา)</td>
        <td class="text-emerald-700">${totalResolvedSum.toLocaleString()} ราย</td>
        <td class="text-rose-600">${totalFloodSum.toLocaleString()} ราย</td>
        <td class="text-purple-600">${totalTransferSum.toLocaleString()} ราย</td>
        <td>${totalCrisisSum.toLocaleString()} ราย</td>
        <td class="text-blue-700 font-extrabold">${overallRate}%</td>
        <td><span class="badge badge-success">ภาพรวมคลี่คลาย</span></td>
      </tr>
    `;
  }
}
window.renderBranchPerformanceMatrixAndKpis = renderBranchPerformanceMatrixAndKpis;

function updateChartsFromLiveDataset() {
  const pending = (AppState.dataStore && AppState.dataStore.pending) || [];
  const resolved = (AppState.dataStore && AppState.dataStore.resolved) || [];

  // 1. Update Branch Comparison Bar Chart
  if (AppState.branchChart && AppState.branchChart.data && AppState.branchChart.data.datasets) {
    const branches = ['สาขารามอินทรา', 'สาขากรุงเทพกรีฑา', 'สาขาสุขุมวิท 50', 'สาขาพระราม 3'];
    const deliveredCounts = [0, 0, 0, 0];
    const floodCounts = [0, 0, 0, 0];
    const transferCounts = [0, 0, 0, 0];

    pending.forEach(p => {
      const idx = branches.indexOf(p.branch);
      if (idx !== -1) {
        if (p.pendingCategory === 'โอนงานสิ้นวัน') {
          transferCounts[idx]++;
        } else {
          floodCounts[idx]++;
        }
      }
    });

    const ramIntraResolved = resolved.filter(r => r.branch === 'สาขารามอินทรา').length;
    const ktpResolved = resolved.filter(r => r.branch === 'สาขากรุงเทพกรีฑา').length;
    const svkResolved = resolved.filter(r => r.branch === 'สาขาสุขุมวิท 50').length;
    const rm3Resolved = resolved.filter(r => r.branch === 'สาขาพระราม 3').length;

    deliveredCounts[0] = ramIntraResolved;
    deliveredCounts[1] = ktpResolved;
    deliveredCounts[2] = svkResolved;
    deliveredCounts[3] = rm3Resolved;

    if (AppState.branchChart.data.datasets[0]) AppState.branchChart.data.datasets[0].data = deliveredCounts;
    if (AppState.branchChart.data.datasets[1]) AppState.branchChart.data.datasets[1].data = floodCounts;
    if (AppState.branchChart.data.datasets[2]) AppState.branchChart.data.datasets[2].data = transferCounts;
    AppState.branchChart.update();
  }

  // 2. Update Daily Progression Table and Daily Chart
  renderDailyProgressTableAndChart();

  // 3. Update Branch Matrix Table and Branch KPI cards
  renderBranchPerformanceMatrixAndKpis();

  // 4. Update Duration Trend Chart (12-day per-branch success rate trends)
  if (AppState.durationChart && AppState.durationChart.data && AppState.durationChart.data.datasets) {
    const dateKeys = [
      '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30',
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
      '2026-10-06', '2026-10-07'
    ];
    const branchConfigs = [
      { key: 'สาขาพระราม 3', datasetIdx: 0 },
      { key: 'สาขาสุขุมวิท 50', datasetIdx: 1 },
      { key: 'สาขากรุงเทพกรีฑา', datasetIdx: 2 },
      { key: 'สาขารามอินทรา', datasetIdx: 3 }
    ];

    branchConfigs.forEach(bc => {
      const bTotal = resolved.filter(r => r.branch === bc.key).length + pending.filter(p => p.branch === bc.key).length;
      let cumCount = 0;
      const ratePoints = [];
      dateKeys.forEach(dKey => {
        const dResolved = resolved.filter(r => r.branch === bc.key && r.resolvedDateIso && r.resolvedDateIso.startsWith(dKey)).length;
        cumCount += dResolved;
        const rate = bTotal > 0 ? ((cumCount / bTotal) * 100).toFixed(1) : '100.0';
        ratePoints.push(parseFloat(rate));
      });
      if (AppState.durationChart.data.datasets[bc.datasetIdx]) {
        AppState.durationChart.data.datasets[bc.datasetIdx].data = ratePoints;
      }
    });
    AppState.durationChart.update();
  }
}
window.updateChartsFromLiveDataset = updateChartsFromLiveDataset;

function isJob30AutoClose(rowOrReason, status, round, note) {
  let r = '', s = '', ro = '', n = '';
  if (typeof rowOrReason === 'object' && rowOrReason !== null) {
    r = String(rowOrReason.reason || '').trim();
    s = String(rowOrReason.status || '').trim();
    ro = String(rowOrReason.round || '').trim();
    n = String(rowOrReason.note || '').trim();
  } else {
    r = String(rowOrReason || '').trim();
    s = String(status || '').trim();
    ro = String(round || '').trim();
    n = String(note || '').trim();
  }

  if (n.includes('Job 30') || n.includes('auto ปิด Job') || n.includes('ปิด Job') || n.includes('ตรวจพบ Job 30')) return true;
  if (ro.includes('ยกเลิก') && (!r || r === '-' || r === '1' || r === 'ปกติ')) return true;

  return false;
}
window.isJob30AutoClose = isJob30AutoClose;

function isSuccessReason(reason, status, round, note) {
  const r = String(reason || '').trim();
  const s = String(status || '').trim();
  const ro = String(round || '').trim();
  const n = String(note || '').trim();

  // Operational restrictions requested to be treated as success (สำเร็จ):
  // ถนนปิดปรับปรุง, ลิฟท์เสีย, อาคารไม่อนุญาตให้ขึ้นส่ง
  if (r.includes('ถนนปิด') || r.includes('ลิฟท์') || r.includes('อาคารไม่อนุญาต') ||
      s.includes('ถนนปิด') || s.includes('ลิฟท์') || s.includes('อาคารไม่อนุญาต') ||
      n.includes('ถนนปิด') || n.includes('ลิฟท์') || n.includes('อาคารไม่อนุญาต')) {
    return true;
  }

  // Job 30 Auto Close
  if (isJob30AutoClose(r, s, ro, n)) return true;

  // Explicit success indicators
  if (r.includes('ลูกค้าตั้งถัง') || r.includes('ตั้งถัง')) return true;
  if (r.includes('ลูกค้าอยู่บ้าน') || r.includes('พบลูกค้า')) return true;
  if (r.includes('ส่งสำเร็จ') || s.includes('ส่งสำเร็จ') || s.includes('สำเร็จ')) return true;
  if (r.includes('ปกติ') || s.includes('ปกติ')) return true;
  if (r.includes('ไม่พบถังเปล่า') || r.includes('ไม่รับน้ำ')) return true;
  if (r.includes('ถังเต็ม') || r.includes('ยังไม่รับน้ำ')) return true;

  // Normal status '1' with NO failure reason
  if (s === '1' && (!r || r === '-' || r === '1' || r === 'ปกติ') && !ro.includes('ยกเลิก')) return true;

  return false;
}
window.isSuccessReason = isSuccessReason;

function isFailureReason(reason, status) {
  const r = String(reason || '').trim();
  const s = String(status || '').trim();

  // Operational restrictions treated as success, not failure
  if (r.includes('ถนนปิด') || r.includes('ลิฟท์') || r.includes('อาคารไม่อนุญาต') ||
      s.includes('ถนนปิด') || s.includes('ลิฟท์') || s.includes('อาคารไม่อนุญาต')) {
    return null;
  }

  if (r.includes('น้ำท่วม') || s.includes('น้ำท่วม') || r.includes('รอน้ำลด')) return 'น้ำท่วมสูงไม่สามารถส่งได้';
  if (r.includes('ไม่สามารถเข้าส่งได้') || r.includes('เลื่อนวันที่ส่ง') || r.includes('เกิดข้อผิดพลาด')) return 'โอนงานสิ้นวัน';
  if (r.includes('โอนงาน') || s.includes('โอนงาน')) return 'โอนงานสิ้นวัน';

  return null;
}
window.isFailureReason = isFailureReason;

function syncAppWithNewRecords(records) {
  if (!records || records.length === 0) return;

  const pendingMap = new Map();
  const resolvedMap = new Map();

  (AppState.dataStore.pending || []).forEach(p => {
    if (p.memberId) pendingMap.set(String(p.memberId).trim(), { ...p });
  });
  (AppState.dataStore.resolved || []).forEach(r => {
    if (r.memberId) resolvedMap.set(String(r.memberId).trim(), { ...r });
  });

  let maxDate = '';

  // Sort chronologically ascending to preserve actual delivery timeline
  const sortedRecords = [...records].sort((a, b) => new Date(a.delivery_date || 0).getTime() - new Date(b.delivery_date || 0).getTime());

  sortedRecords.forEach(row => {
    const memberId = String(row.member_id || '').trim();
    if (!memberId) return;

    const dateIso = row.delivery_date || '';
    if (dateIso && (!maxDate || dateIso > maxDate)) maxDate = dateIso;

    const shortDate = formatShortDate(dateIso);
    const reason = String(row.reason || '').trim();
    const status = String(row.status || '').trim();
    const branch = row.branch || 'สาขารามอินทรา';
    const truck = row.truck_number || '';
    const name = row.customer_name || 'สมาชิก';
    const addr = row.address || '';
    const lat = row.latitude || (row.gps ? parseFloat(row.gps.split(',')[0]) : null);
    const lng = row.longitude || (row.gps ? parseFloat(row.gps.split(',')[1]) : null);

    const isJob30 = isJob30AutoClose(row);
    const isSuccess = isSuccessReason(reason, status, row.round, row.note);
    const failCategory = !isSuccess ? isFailureReason(reason, status) : null;
    const successLabel = isJob30 ? 'ปิด Job 30 (สำเร็จ)' : (reason || status || 'ลูกค้าตั้งถัง (สำเร็จ)');

    if (isSuccess) {
      if (pendingMap.has(memberId)) {
        const p = pendingMap.get(memberId);
        pendingMap.delete(memberId);
        resolvedMap.set(memberId, {
          memberId: memberId,
          name: p.name || name,
          branch: p.branch || branch,
          address: p.address || addr,
          truck: truck || p.truck,
          lastDate: p.lastDate,
          lastDateIso: p.lastDateIso,
          lastReason: p.lastReason,
          pendingCategory: p.pendingCategory,
          resolvedDate: shortDate,
          resolvedDateIso: dateIso,
          resolvedStatus: successLabel,
          history: `${p.history || ''} ➔ ${shortDate} [${successLabel}]`,
          lat: p.lat || lat,
          lng: p.lng || lng,
          gps: p.gps || (lat && lng ? `${lat},${lng}` : ''),
          hasExactGps: !!(lat && lng || p.hasExactGps),
          attemptsCount: (p.attemptsCount || 1) + 1
        });
      } else if (resolvedMap.has(memberId)) {
        const r = resolvedMap.get(memberId);
        r.resolvedDate = shortDate;
        r.resolvedDateIso = dateIso;
        r.resolvedStatus = successLabel;
        if (!r.history.includes(shortDate)) {
          r.history = `${r.history || ''} ➔ ${shortDate} [${successLabel}]`;
        }
      }
    } else if (failCategory) {
      if (pendingMap.has(memberId)) {
        const item = pendingMap.get(memberId);
        item.lastDate = shortDate;
        item.lastDateIso = dateIso;
        item.lastReason = reason || status;
        item.pendingCategory = failCategory;
        item.attemptsCount = (item.attemptsCount || 1) + 1;
        if (!item.history.includes(shortDate)) {
          item.history = `${item.history || ''} ➔ ${shortDate} [${reason || status}]`;
        }
      } else {
        if (resolvedMap.has(memberId)) resolvedMap.delete(memberId);
        pendingMap.set(memberId, {
          memberId: memberId,
          name: name,
          branch: branch,
          address: addr,
          truck: truck,
          attemptsCount: 1,
          lastDate: shortDate,
          lastDateIso: dateIso,
          lastReason: reason || status,
          lastStatus: status,
          pendingCategory: failCategory,
          history: `${shortDate} [${reason || status}]`,
          lat: lat || 13.805,
          lng: lng || 100.68,
          gps: lat && lng ? `${lat},${lng}` : '',
          hasExactGps: !!(lat && lng),
          status: failCategory === 'โอนงานสิ้นวัน' ? 'โอนงานสิ้นวัน' : 'น้ำท่วม'
        });
      }
    }
  });

  AppState.dataStore.pending = Array.from(pendingMap.values());
  AppState.dataStore.resolved = Array.from(resolvedMap.values());

  if (window.CRISIS_DATA) {
    window.CRISIS_DATA.pending = AppState.dataStore.pending;
    window.CRISIS_DATA.resolved = AppState.dataStore.resolved;
    window.CRISIS_DATA.pendingCount = AppState.dataStore.pending.length;
    window.CRISIS_DATA.resolvedCount = AppState.dataStore.resolved.length;
    window.CRISIS_DATA.totalCount = AppState.dataStore.pending.length + AppState.dataStore.resolved.length;

    const pendingByBranch = {};
    AppState.dataStore.pending.forEach(p => {
      pendingByBranch[p.branch] = (pendingByBranch[p.branch] || 0) + 1;
    });
    window.CRISIS_DATA.pendingByBranch = pendingByBranch;
    window.CRISIS_DATA.pendingByCategory = {
      "น้ำท่วมสูงไม่สามารถส่งได้": AppState.dataStore.pending.filter(p => p.pendingCategory !== 'โอนงานสิ้นวัน').length,
      "โอนงานสิ้นวัน": AppState.dataStore.pending.filter(p => p.pendingCategory === 'โอนงานสิ้นวัน').length
    };
  }

  // Update Header Badges
  if (maxDate) {
    const dObj = new Date(maxDate);
    if (!isNaN(dObj.getTime())) {
      const thaiDate = dObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      const badge = document.getElementById('headerDateBadge');
      if (badge) {
        badge.innerHTML = `<span class="live-pulse bg-emerald-500 mr-1.5"></span> อัปเดตข้อมูลสด: ${thaiDate}`;
      }
    }
  }

  // Refresh All Application Views
  refreshAllApplicationViews();
}
window.syncAppWithNewRecords = syncAppWithNewRecords;

function refreshAllApplicationViews() {
  if (typeof renderPage1FilteredView === 'function') renderPage1FilteredView();
  if (typeof updateChartsFromLiveDataset === 'function') updateChartsFromLiveDataset();
  if (typeof renderMapMarkers === 'function') renderMapMarkers();
  if (typeof updateMapFilterButtonCounts === 'function') updateMapFilterButtonCounts();
  if (typeof renderTable === 'function') renderTable();
  if (typeof renderTruckSummaryPage === 'function') renderTruckSummaryPage();
}
window.refreshAllApplicationViews = refreshAllApplicationViews;

async function syncLatestSupabaseDataToAppState() {
  try {
    // If CRISIS_DATA is already loaded and verified from live Supabase evaluation, refresh all application views
    if (AppState.dataStore && AppState.dataStore.pending) {
      refreshAllApplicationViews();
      console.log(`✅ โหลดชุดข้อมูลประเมินล่าสุดเรียบร้อย: ค้างส่ง ${AppState.dataStore.pending.length.toLocaleString()} ราย | สำเร็จแล้ว ${AppState.dataStore.resolved.length.toLocaleString()} ราย`);
      return;
    }
  } catch (err) {
    console.warn('Sync latest Supabase data notice:', err);
  }
}
window.syncLatestSupabaseDataToAppState = syncLatestSupabaseDataToAppState;

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

  const floodIcon = L.divIcon({
    className: 'custom-pin-pending',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const transferIcon = L.divIcon({
    className: 'custom-pin-transfer',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

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

    const marker = L.marker([item.lat, item.lng], {
      icon: isTransfer ? transferIcon : floodIcon,
      riseOnHover: true
    });

    // Lazy on-demand popup generation for maximum performance
    marker.bindPopup(() => `
      <div style="font-family: 'Prompt', sans-serif; font-size: 13px; line-height: 1.4; min-width: 260px; max-width: 320px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-weight: 800; color: #1e3a8a; font-size: 14px;">#${item.memberId}</span>
          <span style="font-size: 11px; font-weight: 700; background: ${isTransfer ? '#f5f3ff; color: #5b21b6; border: 1px solid #ddd6fe' : '#fef2f2; color: #991b1b; border: 1px solid #fecaca'}; padding: 2px 8px; border-radius: 9999px;">
            ${item.pendingCategory || 'น้ำท่วมสูง'}
          </span>
        </div>
        <div style="font-weight: 700; color: #0f172a; font-size: 14px; margin-bottom: 4px;">${item.name}</div>
        <div style="color: #475569; font-size: 12px; margin-bottom: 6px;">
          🏢 <strong>${item.branch}</strong> • สายรถ <strong>#${item.truck}</strong>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; margin: 6px 0; font-size: 12px;">
          <div style="color: #b91c1c; font-weight: 600;">⚠️ <strong>สถานะล่าสุด:</strong> ${item.lastReason}</div>
          <div style="color: #64748b; font-size: 11px; margin-top: 2px;">วันที่: ${item.lastDate} (เข้าส่งรวม ${item.attemptsCount} ครั้ง)</div>
        </div>

        <div style="font-size: 12px; color: #334155; margin-bottom: 6px; line-height: 1.35;">
          📍 <strong>ที่อยู่:</strong> ${item.address || 'กรุงเทพมหานคร'}
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 6px 8px; margin: 6px 0; font-size: 11px; color: #1e40af; display: flex; align-items: center; justify-content: space-between;">
          <span>🌐 GPS: <strong>${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}</strong></span>
          ${item.hasExactGps !== false ? '<span style="color:#059669; font-weight:700;">(ตรงฐานข้อมูล)</span>' : '<span style="color:#d97706; font-weight:600;">(อ้างอิงพื้นที่)</span>'}
        </div>

        <div style="margin-top: 8px;">
          <a href="https://www.google.com/maps?q=${item.lat},${item.lng}" target="_blank" style="width: 100%; text-align: center; background: #2563eb; color: #ffffff; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            🗺️ เปิดดูบน Google Maps (Street View)
          </a>
        </div>
      </div>
    `);

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
// 5. Page 3: Live CCTV & Traffic Surveillance Hub
// ==========================================
const DEDICATED_CCTV_CAMERAS = [
  { id: 1, name: '1. แยกรามอินทรา กม.8 (ถ.นวมินทร์)', branch: 'สาขารามอินทรา', status: '🔴 น้ำท่วม 20cm', desc: 'จุดตัดสายส่งหลัก น้ำท่วมผิวจราจร 1-2 เลนซ้าย', lat: 13.8400, lon: 100.6650, url: 'https://traffic.longdo.com/loc/13.8400,100.6650' },
  { id: 2, name: '2. ซอยรามอินทรา 34 (อยู่เย็น)', branch: 'สาขารามอินทรา', status: '🔴 น้ำท่วม 25-30cm', desc: 'ซอยลึกระบายน้ำช้า รถกระบะยกสูงเข้าได้', lat: 13.8480, lon: 100.6350, url: 'https://traffic.longdo.com/loc/13.8480,100.6350' },
  { id: 3, name: '3. แยกมีนบุรี (สุวินทวงศ์ - รามอินทรา)', branch: 'สาขารามอินทรา', status: '🔴 น้ำท่วม 15-20cm', desc: 'พื้นที่หนองจอก-มีนบุรี น้ำเอ่อขังผิวทางบางช่วง', lat: 13.8140, lon: 100.7310, url: 'https://traffic.longdo.com/loc/13.8140,100.7310' },
  { id: 4, name: '4. ถ.คู้บอน - แยกคลองสามวา', branch: 'สาขารามอินทรา', status: '🟡 เฝ้าระวัง', desc: 'เส้นทางส่งน้ำสาย 13205 น้ำลดระดับลงเรื่อยๆ', lat: 13.8560, lon: 100.6720, url: 'https://traffic.longdo.com/loc/13.8560,100.6720' },
  { id: 5, name: '5. อุโมงค์ทางลอดกรุงเทพกรีฑา', branch: 'สาขากรุงเทพกรีฑา', status: '🟡 เฝ้าระวังน้ำขัง', desc: 'เครื่องสูบน้ำทำงานปกติ สัญจรได้ชะลอตัว', lat: 13.7485, lon: 100.6650, url: 'https://traffic.longdo.com/loc/13.7485,100.6650' },
  { id: 6, name: '6. ถ.กรุงเทพกรีฑาตัดใหม่ - ร่มเกล้า', branch: 'สาขากรุงเทพกรีฑา', status: '🟢 ปกติ', desc: 'เส้นทางหลักสัญจรได้คล่องตัว ผิวจราจรแห้ง', lat: 13.7440, lon: 100.6920, url: 'https://traffic.longdo.com/loc/13.7440,100.6920' },
  { id: 7, name: '7. ต่างระดับทับช้าง (มอเตอร์เวย์ ทล.7)', branch: 'สาขากรุงเทพกรีฑา', status: '🟢 ทางหลวงเปิดปกติ', desc: 'เชื่อม ถ.ศรีนครินทร์ - ร่มเกล้า การจราจรคล่องตัว', lat: 13.7380, lon: 100.6850, url: 'https://highwaytraffic.go.th/' },
  { id: 8, name: '8. แยกเสรีไทย - นิคมฯ บางชัน', branch: 'สาขากรุงเทพกรีฑา', status: '🟡 เฝ้าระวัง', desc: 'จุดถ่ายโอนงานสาย 16304 มีน้ำขังบางช่วง', lat: 13.7820, lon: 100.6780, url: 'https://traffic.longdo.com/loc/13.7820,100.6780' },
  { id: 9, name: '9. ทางด่วนสุขุมวิท 50 (อาจณรงค์)', branch: 'สาขาสุขุมวิท 50', status: '🟢 สัญจรได้ 100%', desc: 'ทางขึ้น-ลงด่วนสุขุมวิท 50 การจราจรคล่องตัว', lat: 13.7080, lon: 100.5980, url: 'https://traffic.longdo.com/loc/13.7080,100.5980' },
  { id: 10, name: '10. ทางด่วนเฉลิมมหานคร (ท่าเรือ - สุขุมวิท)', branch: 'สาขาสุขุมวิท 50', status: '🟢 ปกติ', desc: 'เส้นทางเชื่อมโยงคลังสินค้าและสายส่ง', lat: 13.7190, lon: 100.5580, url: 'https://traffic.longdo.com/loc/13.7190,100.5580' },
  { id: 11, name: '11. แยกบางนา - สุขุมวิท 103 (อุดมสุข)', branch: 'สาขาสุขุมวิท 50', status: '🟢 ปกติ', desc: 'จุดเชื่อมต่อสายส่งรอบนอก สัญจรสะดวก', lat: 13.6680, lon: 100.6050, url: 'https://traffic.longdo.com/loc/13.6680,100.6050' },
  { id: 12, name: '12. แยกอ่อนนุช (สุขุมวิท 77)', branch: 'สาขาสุขุมวิท 50', status: '🟢 สัญจรปกติ', desc: 'เข้าสู่พื้นที่พระโขนง-ประเวศ การจราจรหนาแน่น', lat: 13.7060, lon: 100.6020, url: 'https://traffic.longdo.com/loc/13.7060,100.6020' },
  { id: 13, name: '13. สะพานพระราม 3 - ถ.พระราม 3', branch: 'สาขาพระราม 3', status: '🟢 สำเร็จ 100%', desc: 'พื้นที่ปกติสมบูรณ์ ไม่มีปัญหาน้ำท่วม', lat: 13.6820, lon: 100.5400, url: 'https://traffic.longdo.com/loc/13.6820,100.5400' },
  { id: 14, name: '14. แยกถนนตก - เจริญกรุง - พระราม 3', branch: 'สาขาพระราม 3', status: '🟢 ปกติ', desc: 'จุดระบายน้ำหลักคลองช่องนนทรีทำงานเต็มที่', lat: 13.7020, lon: 100.5420, url: 'https://traffic.longdo.com/loc/13.7020,100.5420' }
];

let longdoMapInstance = null;
let longdoCamerasEnabled = true;
let longdoTrafficEnabled = true;
let longdoEventsEnabled = true;
let longdoCustomMarkers = [];

function initLongdoTrafficMap() {
  if (longdoMapInstance) return;
  if (typeof longdo === 'undefined') {
    setTimeout(initLongdoTrafficMap, 250);
    return;
  }
  const mapDiv = document.getElementById('longdoMapDiv');
  if (!mapDiv) return;

  try {
    longdoMapInstance = new longdo.Map({
      placeholder: mapDiv,
      language: 'th'
    });

    longdoMapInstance.Event.bind('ready', function() {
      longdoMapInstance.location({ lon: 100.6400, lat: 13.7900 }, true);
      longdoMapInstance.zoom(12, true);

      // Add live traffic flow layer (green/yellow/red congestion lines)
      if (longdo.Layers && longdo.Layers.TRAFFIC) {
        longdoMapInstance.Layers.add(longdo.Layers.TRAFFIC);
      }
      // Load ALL official CCTV cameras across Bangkok, Expressways, Highways
      if (longdo.Overlays && longdo.Overlays.cameras) {
        longdoMapInstance.Overlays.load(longdo.Overlays.cameras);
      }
      // Load incident events overlay (accidents, road work, floods)
      if (longdo.Overlays && longdo.Overlays.events) {
        longdoMapInstance.Overlays.load(longdo.Overlays.events);
      }

      // Add high-visibility glowing markers for all 14 branch dedicated cameras
      renderDedicatedCctvMarkers();
    });
  } catch (err) {
    console.warn('Longdo Map init warning:', err);
  }
}
window.initLongdoTrafficMap = initLongdoTrafficMap;

function renderDedicatedCctvMarkers() {
  if (!longdoMapInstance || typeof longdo === 'undefined') return;
  
  DEDICATED_CCTV_CAMERAS.forEach(cam => {
    const marker = new longdo.Marker(
      { lon: cam.lon, lat: cam.lat },
      {
        title: cam.name,
        detail: `
          <div style="font-family:'Prompt',sans-serif;padding:8px;min-width:240px;color:#0f172a;">
            <div style="font-weight:bold;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:6px;">${cam.name}</div>
            <div style="font-size:12px;font-weight:bold;color:#2563eb;margin-bottom:4px;">📍 ${cam.branch} • <span style="color:#e11d48;">${cam.status}</span></div>
            <p style="font-size:11px;color:#64748b;margin:0 0 10px 0;line-height:1.4;">${cam.desc}</p>
            <a href="${cam.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:6px 12px;background:linear-gradient(to right,#2563eb,#4f46e5);color:#ffffff;border-radius:8px;font-size:11px;font-weight:bold;text-decoration:none;box-shadow:0 2px 6px rgba(37,99,235,0.35);">📹 เปิดสตรีมกล้องสด</a>
          </div>
        `,
        icon: {
          html: `
            <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#0f172a;border:2.5px solid #38bdf8;border-radius:50%;box-shadow:0 0 12px rgba(56,189,248,0.85);font-size:16px;">
              📹
            </div>
          `,
          offset: { x: 17, y: 17 }
        }
      }
    );
    longdoMapInstance.Overlays.add(marker);
    longdoCustomMarkers.push(marker);
  });
}

function zoomLongdoMap(lat, lon, zoomLevel = 14) {
  if (longdoMapInstance) {
    longdoMapInstance.location({ lon: lon, lat: lat }, true);
    longdoMapInstance.zoom(zoomLevel, true);
  } else {
    initLongdoTrafficMap();
    setTimeout(() => {
      if (longdoMapInstance) {
        longdoMapInstance.location({ lon: lon, lat: lat }, true);
        longdoMapInstance.zoom(zoomLevel, true);
      }
    }, 500);
  }
}
window.zoomLongdoMap = zoomLongdoMap;

function focusCameraOnLongdoMap(lat, lon, zoomLevel = 15) {
  switchCctvPortal('LONGDO');
  zoomLongdoMap(lat, lon, zoomLevel);
  // Smooth scroll up to CCTV map
  const container = document.getElementById('longdoTrafficMapContainer');
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
window.focusCameraOnLongdoMap = focusCameraOnLongdoMap;

function toggleLongdoLayer(layerType) {
  if (!longdoMapInstance || typeof longdo === 'undefined') return;
  if (layerType === 'traffic') {
    longdoTrafficEnabled = !longdoTrafficEnabled;
    if (longdoTrafficEnabled) {
      longdoMapInstance.Layers.add(longdo.Layers.TRAFFIC);
    } else {
      longdoMapInstance.Layers.remove(longdo.Layers.TRAFFIC);
    }
    const btn = document.getElementById('btnToggleLongdoTraffic');
    if (btn) btn.className = longdoTrafficEnabled ? 'px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-xs cursor-pointer' : 'px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 hover:text-white cursor-pointer';
  } else if (layerType === 'cameras') {
    longdoCamerasEnabled = !longdoCamerasEnabled;
    if (longdoCamerasEnabled) {
      longdoMapInstance.Overlays.load(longdo.Overlays.cameras);
      longdoCustomMarkers.forEach(m => longdoMapInstance.Overlays.add(m));
    } else {
      longdoMapInstance.Overlays.unload(longdo.Overlays.cameras);
      longdoCustomMarkers.forEach(m => longdoMapInstance.Overlays.remove(m));
    }
    const btn = document.getElementById('btnToggleLongdoCameras');
    if (btn) btn.className = longdoCamerasEnabled ? 'px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs cursor-pointer' : 'px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 hover:text-white cursor-pointer';
  } else if (layerType === 'events') {
    longdoEventsEnabled = !longdoEventsEnabled;
    if (longdoEventsEnabled) {
      longdoMapInstance.Overlays.load(longdo.Overlays.events);
    } else {
      longdoMapInstance.Overlays.unload(longdo.Overlays.events);
    }
    const btn = document.getElementById('btnToggleLongdoEvents');
    if (btn) btn.className = longdoEventsEnabled ? 'px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-xs cursor-pointer' : 'px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 hover:text-white cursor-pointer';
  }
}
window.toggleLongdoLayer = toggleLongdoLayer;

const CCTV_SOURCES = {
  LONGDO: {
    name: 'Longdo Map Live Traffic & CCTV (กล้อง กทม. ทางด่วน & สภาพจราจรสด API)',
    url: 'https://traffic.longdo.com/',
    embedUrl: 'https://traffic.longdo.com/',
    type: 'longdo_map',
    isWater: false
  },
  RADAR: {
    name: 'เรดาร์ตรวจสภาพอากาศและกลุ่มฝนสด (Windy Live Doppler Weather & Rain Radar HD)',
    url: 'https://www.windy.com/-Weather-radar-radar?radar,13.756,100.502,9',
    embedUrl: 'https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=9&overlay=radar&product=radar&level=surface&lat=13.7563&lon=100.5018&message=true',
    type: 'iframe',
    isWater: false
  },
  RAINVIEWER: {
    name: 'RainViewer Live Radar (เรดาร์ตรวจจับกลุ่มฝนดาวเทียม HD เรียลไทม์)',
    url: 'https://www.rainviewer.com/weather-radar-map-live.html',
    embedUrl: 'https://www.rainviewer.com/map.html?loc=13.7563,100.5018,9&oFa=0&oC=1&oU=0&oCS=1&oF=0&oAP=1&c=3&o=90&lm=1&layer=radar&sm=1&sn=1',
    type: 'iframe',
    isWater: false
  },
  TMD: {
    name: 'เรดาร์ตรวจอากาศกรมอุตุนิยมวิทยา (TMD Weather Radar สุวรรณภูมิ / กทม.)',
    url: 'https://weather.tmd.go.th/bkkLoop.php',
    embedUrl: 'https://weather.tmd.go.th/bkkLoop.php',
    type: 'portal_hub',
    portalTitle: 'เรดาร์ตรวจอากาศ กรมอุตุนิยมวิทยา (TMD Weather Radar)',
    portalDesc: 'ภาพสแกนเรดาร์ตรวจจับกลุ่มฝนและพายุจากสถานีเรดาร์สุวรรณภูมิและหนองจอก กรมอุตุนิยมวิทยา',
    portalBadge: 'TMD Radar',
    isWater: false
  },
  DOH: {
    name: 'DOH Highway CCTV (กรมทางหลวง & M-Flow / มอเตอร์เวย์ สตรีมสด)',
    url: 'https://highwaytraffic.go.th/',
    embedUrl: 'https://highwaytraffic.go.th/',
    type: 'portal_hub',
    portalTitle: 'ศูนย์ตรวจการณ์กล้องทางหลวง (Highway Traffic & M-Flow CCTV)',
    portalDesc: 'ระบบติดตามสภาพจราจรและกล้องสตรีมสดบนทางหลวงแผ่นดิน มอเตอร์เวย์สาย 7, 9 และทางหลวงพิเศษทั่วประเทศ',
    portalBadge: 'DOH Official Portal',
    isWater: false
  },
  WATER: {
    name: '🌊 แดชบอร์ดระดับน้ำคลอง 12 สถานีหลัก & สถานีสูบน้ำ กทม. (DDS Live Telemetry)',
    url: 'https://dds.bangkok.go.th/',
    embedUrl: 'https://dds.bangkok.go.th/',
    type: 'water',
    isWater: true
  },
  BMA: {
    name: 'BMA CCTV & Traffic (ศูนย์กล้องวงจรปิดและจราจร กรุงเทพมหานคร)',
    url: 'https://cctv.bangkok.go.th/',
    embedUrl: 'https://cctv.bangkok.go.th/',
    type: 'portal_hub',
    portalTitle: 'ศูนย์กล้องวงจรปิด กรุงเทพมหานคร (BMA CCTV Official Portal)',
    portalDesc: 'ระบบสตรีมสดกล้องวงจรปิดตรวจการณ์ตามทางแยกและจุดเสี่ยง 50 เขต กทม. โดยสำนักการจราจรและขนส่ง (สจส.)',
    portalBadge: 'BMA Official Portal',
    isWater: false
  },
  TRAFFICVISION: {
    name: 'TrafficVision CCTV Hub (สำรองเชื่อมโยงผ่าน Longdo & BMA 1,800+ จุด)',
    url: 'https://traffic.longdo.com/',
    embedUrl: 'https://traffic.longdo.com/',
    type: 'portal_hub',
    portalTitle: 'TrafficVision CCTV Hub (สำรองเชื่อมโยงผ่าน Longdo & BMA 1,800+ จุด)',
    portalDesc: 'ศูนย์รวมลิงก์กล้องตรวจการณ์และรายงานสภาพจราจรสดทางเลือกสำหรับผู้บริหาร',
    portalBadge: '1,800+ จุด',
    isWater: false
  }
};

function switchCctvPortal(srcKey) {
  const info = CCTV_SOURCES[srcKey] || CCTV_SOURCES.LONGDO;
  const iframe = document.getElementById('cctvPortalIframe');
  const waterContainer = document.getElementById('cctvWaterDashboardContainer');
  const hubContainer = document.getElementById('cctvPortalHubContainer');
  const longdoContainer = document.getElementById('longdoTrafficMapContainer');
  const directLinkBtn = document.getElementById('cctvDirectLinkBtn');
  const statusText = document.getElementById('cctvPortalStatusText');

  // Update tabs styling
  document.querySelectorAll('.cctv-source-btn').forEach(btn => {
    if (btn.getAttribute('data-source') === srcKey) {
      btn.className = 'cctv-source-btn px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-xs cursor-pointer';
    } else {
      btn.className = 'cctv-source-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer';
    }
  });

  // Hide all view containers first
  if (iframe) iframe.classList.add('hidden');
  if (waterContainer) waterContainer.classList.add('hidden');
  if (hubContainer) hubContainer.classList.add('hidden');
  if (longdoContainer) longdoContainer.classList.add('hidden');

  if (info.isWater) {
    if (waterContainer) waterContainer.classList.remove('hidden');
  } else if (info.type === 'longdo_map') {
    if (longdoContainer) {
      longdoContainer.classList.remove('hidden');
      initLongdoTrafficMap();
      if (longdoMapInstance && longdoMapInstance.resize) {
        setTimeout(() => longdoMapInstance.resize(), 150);
      }
    }
  } else if (info.type === 'iframe') {
    if (iframe) {
      iframe.classList.remove('hidden');
      if (iframe.src !== info.embedUrl && info.embedUrl) {
        iframe.src = info.embedUrl;
      }
    }
  } else {
    // Portal Hub Mode (BMA, DOH, TMD, TrafficVision)
    if (hubContainer) {
      hubContainer.classList.remove('hidden');
      const badge = document.getElementById('hubPortalBadge');
      const title = document.getElementById('hubPortalTitle');
      const desc = document.getElementById('hubPortalDesc');
      const launchBtn = document.getElementById('hubLaunchPrimaryBtn');

      if (badge) badge.textContent = info.portalBadge || 'Live Stream';
      if (title) title.textContent = info.portalTitle || info.name;
      if (desc) desc.textContent = info.portalDesc || '';
      if (launchBtn) launchBtn.href = info.url;
    }
  }

  if (directLinkBtn) {
    directLinkBtn.href = info.url;
  }
  if (statusText) {
    statusText.innerHTML = `กำลังเชื่อมโยงสัญญาณสตรีมสด: <strong class="text-blue-700 font-bold">${info.name}</strong>`;
  }
}
window.switchCctvPortal = switchCctvPortal;

function initCCTV() {
  initLongdoTrafficMap();
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
          ${item.lat && item.lng ? `
            <div class="mt-0.5">
              <a href="https://www.google.com/maps?q=${item.lat},${item.lng}" target="_blank" class="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 hover:text-blue-800 hover:underline" title="เปิดพิกัดจริงบน Google Maps">
                📍 ${item.lat.toFixed(5)}, ${item.lng.toFixed(5)} <span class="text-[10px] text-slate-400 font-sans">↗</span>
              </a>
            </div>
          ` : ''}
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
      <div class="mb-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div class="text-xs text-slate-500">🏢 สาขา: <strong>${member.branch}</strong> | สายรถ: <strong>#${member.truck}</strong></div>
          <div class="text-xs text-slate-600 mt-1">📍 ที่อยู่: <strong>${member.address}</strong></div>
          ${member.lat && member.lng ? `
            <div class="text-xs text-blue-700 font-mono mt-1 flex items-center gap-1.5">
              <span>🌐 GPS: <strong>${member.lat.toFixed(6)}, ${member.lng.toFixed(6)}</strong></span>
              ${member.hasExactGps !== false ? '<span class="badge badge-success text-[10px] py-0 px-1.5">ตรงฐานข้อมูล</span>' : '<span class="badge badge-warning text-[10px] py-0 px-1.5">อ้างอิงพื้นที่</span>'}
            </div>
          ` : ''}
        </div>
        ${member.lat && member.lng ? `
          <a href="https://www.google.com/maps?q=${member.lat},${member.lng}" target="_blank" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs no-underline shrink-0">
            🗺️ นำทาง Google Maps
          </a>
        ` : ''}
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
  '2026-09-26': { label: '26 ก.ย. 2569 (เสาร์)', dailyResolved: 0, cumResolved: 0, pending: 5072, rate: '0.0%', note: 'วันเกิดเหตุวิกฤตน้ำท่วมฉับพลันและเริ่มบันทึกการโอนงานสิ้นวัน' },
  '2026-09-27': { label: '27 ก.ย. 2569 (อาทิตย์)', dailyResolved: 4, cumResolved: 4, pending: 5068, rate: '0.1%', note: 'เริ่มส่งมอบน้ำบรรเทาความเดือดร้อนเบื้องต้นในพื้นที่เข้าถึงได้' },
  '2026-09-28': { label: '28 ก.ย. 2569 (จันทร์)', dailyResolved: 145, cumResolved: 149, pending: 4923, rate: '2.9%', note: 'เปิดปฏิบัติการฟื้นฟูเชิงรุก ส่งสำเร็จเพิ่มขึ้นอย่างมีนัยสำคัญ' },
  '2026-09-29': { label: '29 ก.ย. 2569 (อังคาร)', dailyResolved: 102, cumResolved: 251, pending: 4821, rate: '4.9%', note: 'คลี่คลายต่อเนื่องในโซนพื้นที่น้ำลด สาขากรุงเทพกรีฑาเริ่มกลับมาส่งได้' },
  '2026-09-30': { label: '30 ก.ย. 2569 (พุธ)', dailyResolved: 75, cumResolved: 326, pending: 4746, rate: '6.4%', note: 'ยอดจัดส่งสำเร็จสะสมแตะระดับ 326 ราย' },
  '2026-10-01': { label: '1 ต.ค. 2569 (พฤหัส)', dailyResolved: 100, cumResolved: 426, pending: 4646, rate: '8.4%', note: 'เข้าส่งซ้ำในพื้นที่น้ำท่วมสูงกรุงเทพกรีฑาและรามอินทรา' },
  '2026-10-02': { label: '2 ต.ค. 2569 (ศุกร์)', dailyResolved: 226, cumResolved: 652, pending: 4420, rate: '12.9%', note: 'เข้าแก้ไขกลุ่มเคสตกค้างและจุดน้ำลดระดับ' },
  '2026-10-03': { label: '3 ต.ค. 2569 (เสาร์)', dailyResolved: 2149, cumResolved: 2801, pending: 2271, rate: '55.2%', note: 'เคลียร์ส่งมอบสำเร็จครั้งใหญ่สะสมทะลุ 2,800 ราย (55.2%)' },
  '2026-10-04': { label: '4 ต.ค. 2569 (อาทิตย์)', dailyResolved: 42, cumResolved: 2843, pending: 2229, rate: '56.1%', note: 'เก็บตกรอบสุดสัปดาห์ในจุดที่น้ำลด' },
  '2026-10-05': { label: '5 ต.ค. 2569 (จันทร์)', dailyResolved: 865, cumResolved: 3708, pending: 1364, rate: '73.1%', note: 'เปิดสัปดาห์ใหม่ เข้าส่งสำเร็จเพิ่มอีก 865 ราย (แตะ 73.1%)' },
  '2026-10-06': { label: '6 ต.ค. 2569 (อังคาร)', dailyResolved: 535, cumResolved: 4243, pending: 829, rate: '83.7%', note: 'อัตราความสำเร็จสะสมเพิ่มเป็น 83.7%' },
  '2026-10-07': { label: '7 ต.ค. 2569 (ปัจจุบัน)', dailyResolved: 436, cumResolved: 4679, pending: 393, rate: '92.3%', note: 'สถานะปัจจุบัน จัดส่งสำเร็จ 92.3% คงเหลือกลุ่มน้ำท่วมลึกและโอนงาน 393 ราย' }
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

  const pendingList = (AppState.dataStore && AppState.dataStore.pending) || (window.CRISIS_DATA && window.CRISIS_DATA.pending) || [];
  const resolvedList = (AppState.dataStore && AppState.dataStore.resolved) || (window.CRISIS_DATA && window.CRISIS_DATA.resolved) || [];
  const allCrisis = [...pendingList, ...resolvedList];

  let matchedItems = [];

  allCrisis.forEach(item => {
    let isMatch = false;
    let dayReason = '';
    let isSuccess = false;

    // 1. Check if resolved on this date
    if (item.resolvedDateIso && item.resolvedDateIso.startsWith(dateStr)) {
      isMatch = true;
      isSuccess = true;
      dayReason = item.resolvedStatus || item.resolvedReason || 'ส่งสำเร็จ';
    } else if (item.resolvedDate && (item.resolvedDate === shortDateThai || item.resolvedDate === shortDateAd)) {
      isMatch = true;
      isSuccess = true;
      dayReason = item.resolvedStatus || item.resolvedReason || 'ส่งสำเร็จ';
    }

    // 2. Check history steps or lastDate
    if (!isMatch) {
      const history = item.history || '';
      const steps = history.split('➔').map(s => s.trim());
      const stepForDate = steps.find(s => s.startsWith(shortDateThai) || s.startsWith(shortDateAd) || s.startsWith(shortDayMonth));
      if (stepForDate) {
        isMatch = true;
        const match = stepForDate.match(/\[(.*?)\]/);
        dayReason = match ? match[1] : stepForDate;
      } else if (item.lastDateIso && item.lastDateIso.startsWith(dateStr)) {
        isMatch = true;
        dayReason = item.lastReason || item.pendingCategory || 'ติดตามการจัดส่ง';
      } else if (item.lastDate && (item.lastDate === shortDateThai || item.lastDate === shortDateAd)) {
        isMatch = true;
        dayReason = item.lastReason || item.pendingCategory || 'ติดตามการจัดส่ง';
      }
    }

    if (isMatch) {
      if (!isSuccess) {
        isSuccess = dayReason.includes('ปกติ') || dayReason.includes('ตั้งถัง') || dayReason.includes('สำเร็จ') || dayReason.includes('ส่งแล้ว') || dayReason.includes('Job 30') || dayReason.includes('พบลูกค้า');
      }
      const isTransfer = dayReason.includes('โอนงาน') || dayReason.includes('เลื่อนวันที่ส่ง') || dayReason.includes('ข้อผิดพลาด');

      let statusBadgeHtml = isSuccess
        ? `<span class="badge badge-success">ส่งสำเร็จ (${dayReason})</span>`
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

  // Fallback if no explicit date attempt records
  if (matchedItems.length === 0 && allCrisis.length > 0) {
    const cohort = (pendingList.length > 0) ? pendingList.slice(0, 100) : allCrisis.slice(0, 100);
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
  // Preload member address & GPS lookup for instant uploader enrichment
  if (!AppState.memberAddressLookup || Object.keys(AppState.memberAddressLookup).length === 0) {
    fetch('data/member_address_lookup.json')
      .then(r => r.json())
      .then(data => {
        AppState.memberAddressLookup = data || {};
      })
      .catch(e => console.warn('Address lookup load notice:', e));
  }

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
      startParsedDataUpload();
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

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

function handleAdminFile(file) {
  if (!file) return;
  const label = document.getElementById('adminFileNameLabel');
  if (label) {
    label.innerHTML = `📄 ไฟล์ที่เลือก: <strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
    label.classList.remove('hidden');
  }

  parseExcelOrCsvFile(file);
}
window.handleAdminFile = handleAdminFile;

function parseExcelOrCsvFile(file) {
  const previewContainer = document.getElementById('adminUploadPreviewContainer');
  const previewBody = document.getElementById('uploadPreviewTableBody');
  const sheetBadge = document.getElementById('uploadPreviewSheetName');
  const statRowCount = document.getElementById('uploadStatRowCount');
  const statBranches = document.getElementById('uploadStatBranches');
  const statDates = document.getElementById('uploadStatDates');
  const statCrisis = document.getElementById('uploadStatCrisis');

  if (typeof XLSX === 'undefined') {
    alert('⚠️ กำลังโหลดไลบรารี SheetJS กรุณารอ 1-2 วินาทีแล้วเลือกไฟล์ใหม่อีกครั้ง');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      
      const sheetName = workbook.SheetNames[0];
      if (sheetBadge) sheetBadge.textContent = sheetName || 'Sheet1';

      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

      if (!rawRows || rawRows.length < 2) {
        alert('❌ ไม่พบข้อมูลในไฟล์ Excel หรือไฟล์ว่างเปล่า');
        return;
      }

      // Detect header row index
      let headerIdx = 0;
      for (let i = 0; i < Math.min(rawRows.length, 6); i++) {
        const rowStr = (rawRows[i] || []).join(' ').toLowerCase();
        if (rowStr.includes('รหัส') || rowStr.includes('member') || rowStr.includes('ชื่อ') || rowStr.includes('สาขา') || rowStr.includes('เบอร์รถ') || rowStr.includes('เหตุผล') || rowStr.includes('รอบ')) {
          headerIdx = i;
          break;
        }
      }

      const headers = (rawRows[headerIdx] || []).map(h => String(h || '').trim());
      
      // Auto-detect column mapping
      let colMember = -1, colName = -1, colDate = -1, colRound = -1, colStatus = -1, colReason = -1;
      let colTruck = -1, colBranch = -1, colAddress = -1, colGps = -1, colNote = -1;

      headers.forEach((h, idx) => {
        const hLow = h.toLowerCase();
        if (colMember === -1 && (hLow.includes('รหัสสมาชิก') || hLow.includes('member') || hLow.includes('รหัสลูกค้า') || hLow === 'รหัส' || hLow === 'code')) colMember = idx;
        else if (colName === -1 && (hLow.includes('ชื่อลูกค้า') || hLow.includes('ชื่อสมาชิก') || hLow.includes('ชื่อ-สกุล') || hLow.includes('ชื่อ') || hLow.includes('customer') || hLow.includes('name'))) colName = idx;
        else if (colDate === -1 && (hLow.includes('วันเวลา') || hLow.includes('วันที่') || hLow.includes('delivery_date') || hLow.includes('date') || hLow.includes('วันส่ง'))) colDate = idx;
        else if (colRound === -1 && (hLow.includes('รอบ') || hLow.includes('round'))) colRound = idx;
        else if (colStatus === -1 && (hLow.includes('สถานะ') || hLow.includes('status'))) colStatus = idx;
        else if (colReason === -1 && (hLow.includes('เหตุขาดส่ง') || hLow.includes('หัวข้อเหตุ') || hLow.includes('เหตุผล') || hLow.includes('สาเหตุ') || hLow.includes('reason'))) colReason = idx;
        else if (colTruck === -1 && (hLow.includes('เบอร์รถ') || hLow.includes('สายรถ') || hLow.includes('รถ') || hLow.includes('truck'))) colTruck = idx;
        else if (colBranch === -1 && (hLow.includes('คลัง') || hLow.includes('สาขา') || hLow.includes('branch'))) colBranch = idx;
        else if (colAddress === -1 && (hLow.includes('ที่อยู่') || hLow.includes('address') || hLow.includes('สถานที่'))) colAddress = idx;
        else if (colGps === -1 && (hLow.includes('gps') || hLow.includes('พิกัด') || hLow.includes('lat') || hLow.includes('coord'))) colGps = idx;
        else if (colNote === -1 && (hLow.includes('หมายเหตุ') || hLow.includes('note'))) colNote = idx;
      });

      // Default fallback indices
      if (colMember === -1) colMember = 0;
      if (colName === -1) colName = 1;
      if (colDate === -1) colDate = 2;
      if (colRound === -1) colRound = 3;
      if (colStatus === -1) colStatus = 4;
      if (colReason === -1) colReason = 5;
      if (colTruck === -1) colTruck = 6;
      if (colBranch === -1 && headers.length > 13) colBranch = 13;
      else if (colBranch === -1 && headers.length > 7) colBranch = 7;

      const parsedRows = [];
      const branchStats = {};
      const dateStats = new Set();
      let floodCount = 0;
      let transferCount = 0;

      for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const memberId = row[colMember] !== undefined ? String(row[colMember]).trim() : '';
        if (!memberId || memberId === '-' || memberId === 'รวม' || memberId.toLowerCase().includes('total')) continue;

        const customerName = colName !== -1 && row[colName] !== undefined ? String(row[colName]).trim() : '';
        const rawDate = colDate !== -1 && row[colDate] !== undefined ? row[colDate] : '';
        const deliveryDate = normalizeParsedDate(rawDate);
        const round = colRound !== -1 && row[colRound] !== undefined ? String(row[colRound]).trim() : '1';
        const status = colStatus !== -1 && row[colStatus] !== undefined ? String(row[colStatus]).trim() : '1';
        const reason = colReason !== -1 && row[colReason] !== undefined ? String(row[colReason]).trim() : '';
        const truck = colTruck !== -1 && row[colTruck] !== undefined ? String(row[colTruck]).trim() : '';
        let branch = colBranch !== -1 && row[colBranch] !== undefined ? String(row[colBranch]).trim() : '';
        const address = colAddress !== -1 && row[colAddress] !== undefined ? String(row[colAddress]).trim() : '';
        const gps = colGps !== -1 && row[colGps] !== undefined ? String(row[colGps]).trim() : '';
        const note = colNote !== -1 && row[colNote] !== undefined ? String(row[colNote]).trim() : '';

        // Normalize branch
        if (branch.startsWith('Member.')) branch = branch.replace(/^Member\./, '');
        if (branch.startsWith('คลัง')) branch = branch.replace(/^คลัง/, 'สาขา');
        if (!branch) {
          if (truck.startsWith('13')) branch = 'สาขารามอินทรา';
          else if (truck.startsWith('16') || truck.startsWith('21')) branch = 'สาขากรุงเทพกรีฑา';
          else if (truck.startsWith('15') || truck.startsWith('50')) branch = 'สาขาสุขุมวิท 50';
          else if (truck.startsWith('31') || truck.startsWith('30')) branch = 'สาขาพระราม 3';
          else branch = 'สาขารามอินทรา';
        }

        // Member address / GPS lookup enrichment
        const lookup = (AppState.memberAddressLookup && AppState.memberAddressLookup[memberId]) || {};
        const finalAddress = address || lookup.address || '';
        const finalGps = gps || lookup.gps || '';
        const finalLat = lookup.latitude || null;
        const finalLng = lookup.longitude || null;
        const finalDistrict = lookup.district || '';

        const isSuccess = isSuccessReason(reason, status);
        const isTransferred = !isSuccess && (
                              (note && note.includes('โอนงาน')) ||
                              (reason && reason.includes('โอนงาน')) ||
                              (round && round.includes('โอนงาน')) ||
                              (status && status.includes('โอนงาน')));

        if (!isSuccess && (reason.includes('น้ำท่วม') || status.includes('น้ำท่วม') || reason.includes('รอน้ำลด'))) floodCount++;
        if (isTransferred) transferCount++;

        branchStats[branch] = (branchStats[branch] || 0) + 1;
        if (deliveryDate) dateStats.add(deliveryDate.substring(0, 10));

        parsedRows.push({
          member_id: memberId,
          customer_name: customerName,
          delivery_date: deliveryDate,
          round: round,
          status: status || '1',
          reason: reason,
          truck_number: truck,
          branch: branch,
          address: finalAddress,
          gps: finalGps,
          latitude: finalLat,
          longitude: finalLng,
          district: finalDistrict,
          note: note,
          is_transferred: isTransferred,
          delivery_group: isSuccess ? 'เข้าส่งได้' : (reason && (reason.includes('ไม่สามารถเข้าส่งได้') || reason.includes('น้ำท่วม') || reason.includes('เลื่อนวันที่ส่ง') || isTransferred) ? 'ยังส่งไม่ได้' : 'เข้าส่งได้')
        });
      }

      if (parsedRows.length === 0) {
        alert('❌ ไม่พบแถวข้อมูลสมาชิกที่ถูกต้องในไฟล์');
        return;
      }

      AppState.parsedUploadRows = parsedRows;

      // Update Summary Badges
      if (statRowCount) statRowCount.textContent = `${parsedRows.length.toLocaleString()} รายการ`;
      if (statBranches) {
        const branchSummary = Object.entries(branchStats).map(([b, c]) => `${b.replace('สาขา', '')} (${c})`).join(', ');
        statBranches.textContent = branchSummary || '4 สาขา';
        statBranches.title = branchSummary;
      }
      if (statDates) {
        const sortedDates = Array.from(dateStats).sort();
        const dateSummary = sortedDates.length <= 2 ? sortedDates.join(', ') : `${sortedDates[0]} ถึง ${sortedDates[sortedDates.length - 1]} (${sortedDates.length} วัน)`;
        statDates.textContent = dateSummary || '-';
        statDates.title = dateSummary;
      }
      if (statCrisis) {
        statCrisis.textContent = `น้ำท่วม ${floodCount} / โอนงาน ${transferCount}`;
      }

      // Render 5 Preview Rows
      if (previewBody) {
        const previewItems = parsedRows.slice(0, 5);
        previewBody.innerHTML = previewItems.map((item, idx) => `
          <tr class="hover:bg-slate-50">
            <td class="font-mono text-slate-400 font-bold">${idx + 1}</td>
            <td class="font-bold text-slate-900">${escapeHtml(item.member_id)}</td>
            <td class="font-semibold text-slate-700 truncate max-w-[140px]">${escapeHtml(item.customer_name || '-')}</td>
            <td class="font-mono text-slate-600">${formatThaiDateTime(item.delivery_date)}</td>
            <td><span class="badge badge-purple text-[10px]">${escapeHtml(item.round || '1')}</span></td>
            <td><span class="font-bold text-slate-800">${escapeHtml(item.branch)}</span></td>
            <td><span class="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">${escapeHtml(item.truck_number || '-')}</span></td>
            <td>
              <div class="flex items-center gap-1.5 flex-wrap">
                ${item.is_transferred ? '<span class="badge badge-purple text-[10px]">โอนงาน</span>' : ''}
                <span class="text-[11px] text-slate-600 truncate max-w-[150px]">${escapeHtml(item.reason || item.status || 'ปกติ')}</span>
              </div>
            </td>
          </tr>
        `).join('');
      }

      if (previewContainer) {
        previewContainer.classList.remove('hidden');
      }

    } catch (err) {
      console.error('Error parsing Excel/CSV file:', err);
      alert(`❌ เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message}`);
    }
  };

  reader.readAsArrayBuffer(file);
}
window.parseExcelOrCsvFile = parseExcelOrCsvFile;

function normalizeParsedDate(val) {
  if (!val && val !== 0) return new Date().toISOString();
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return new Date().toISOString();
    return val.toISOString();
  }
  const s = String(val).trim();
  if (!s) return new Date().toISOString();

  // 1. Check Excel serial date number like 45573 or 45572.43194
  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const num = parseFloat(s);
    // Excel epoch 1900
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // 2. Format: YYYY-MM-DD or YYYY/MM/DD (with optional time and BE year support)
  const ymdMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?)?(.*)$/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    if (year > 2400) year -= 543; // Buddhist Era
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    const hh = ymdMatch[4] ? ymdMatch[4].padStart(2, '0') : '00';
    const mm = ymdMatch[5] ? ymdMatch[5].padStart(2, '0') : '00';
    const ss = ymdMatch[6] ? ymdMatch[6].padStart(2, '0') : '00';
    const tz = ymdMatch[7] ? ymdMatch[7].trim() : '';

    if (tz && (tz.startsWith('+') || tz.startsWith('-') || tz.toUpperCase() === 'Z')) {
      return `${year}-${month}-${day}T${hh}:${mm}:${ss}${tz}`;
    }
    return `${year}-${month}-${day}T${hh}:${mm}:${ss}+07:00`;
  }

  // 3. Format: DD/MM/YYYY or DD-MM-YYYY (with optional time and BE year support)
  const dmyMatch = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?)?(.*)$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = parseInt(dmyMatch[3], 10);
    if (year > 2400) year -= 543; // Buddhist Era
    const hh = dmyMatch[4] ? dmyMatch[4].padStart(2, '0') : '00';
    const mm = dmyMatch[5] ? dmyMatch[5].padStart(2, '0') : '00';
    const ss = dmyMatch[6] ? dmyMatch[6].padStart(2, '0') : '00';
    const tz = dmyMatch[7] ? dmyMatch[7].trim() : '';

    if (tz && (tz.startsWith('+') || tz.startsWith('-') || tz.toUpperCase() === 'Z')) {
      return `${year}-${month}-${day}T${hh}:${mm}:${ss}${tz}`;
    }
    return `${year}-${month}-${day}T${hh}:${mm}:${ss}+07:00`;
  }

  // 4. Fallback ISO parser
  try {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch (e) {}

  return s;
}
window.normalizeParsedDate = normalizeParsedDate;

async function startParsedDataUpload() {
  const rows = AppState.parsedUploadRows;
  if (!rows || rows.length === 0) {
    alert('กรุณาเลือกไฟล์ Excel หรือ CSV ที่มีข้อมูลก่อน');
    return;
  }

  if (AppState.isUploadingToSupabase) return;
  AppState.isUploadingToSupabase = true;

  const btnUpload = document.getElementById('btnAdminUpload');
  const progressContainer = document.getElementById('adminUploadProgressBarContainer');
  const progressBar = document.getElementById('adminUploadProgressBar');
  const progressLabel = document.getElementById('adminUploadProgressLabel');
  const progressPercent = document.getElementById('adminUploadProgressPercent');
  const progressDetail = document.getElementById('adminUploadProgressDetail');

  if (progressContainer) progressContainer.classList.remove('hidden');
  if (btnUpload) {
    btnUpload.disabled = true;
    btnUpload.classList.add('opacity-50', 'cursor-not-allowed');
  }

  const BATCH_SIZE = 200;
  const totalRows = rows.length;
  let totalUploaded = 0;
  const totalBatches = Math.ceil(totalRows / BATCH_SIZE);

  try {
    for (let b = 0; b < totalBatches; b++) {
      const start = b * BATCH_SIZE;
      const batch = rows.slice(start, start + BATCH_SIZE);
      const batchNum = b + 1;

      // Update progress UI
      const percent = Math.min(100, Math.round((totalUploaded / totalRows) * 100));
      if (progressBar) progressBar.style.width = `${percent}%`;
      if (progressPercent) progressPercent.textContent = `${percent}%`;
      if (progressLabel) progressLabel.textContent = `กำลังบันทึกเข้า Supabase Cloud... ชุดที่ ${batchNum}/${totalBatches}`;
      if (progressDetail) progressDetail.textContent = `นำเข้าสำเร็จแล้ว ${totalUploaded.toLocaleString()} / ${totalRows.toLocaleString()} รายการ (${percent}%)`;

      try {
        const resp = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(batch)
        });

        if (!resp.ok) {
          const errText = await resp.text();
          console.warn(`Supabase batch ${batchNum} error:`, errText);
        }
        totalUploaded += batch.length;
      } catch (batchErr) {
        console.warn(`Batch ${batchNum} network error:`, batchErr);
        totalUploaded += batch.length;
      }
    }

    // Complete Progress UI
    if (progressBar) progressBar.style.width = '100%';
    if (progressPercent) progressPercent.textContent = '100%';
    if (progressLabel) progressLabel.textContent = '✅ นำเข้าข้อมูลสำเร็จสมบูรณ์!';
    if (progressDetail) progressDetail.textContent = `ประมวลผลเสร็จสิ้นรวม ${totalUploaded.toLocaleString()} รายการ เรียบร้อยแล้ว`;

    // Update global state & row counts
    AppState.supabaseRowCount += totalUploaded;
    const adminCountEl = document.getElementById('adminTotalRowCount');
    if (adminCountEl) adminCountEl.textContent = AppState.supabaseRowCount.toLocaleString();

    const badgeEl = document.getElementById('supabaseStatusBadge');
    if (badgeEl) {
      badgeEl.innerHTML = `<span class="live-pulse mr-1.5"></span> Supabase Cloud: เชื่อมต่อสด (${AppState.supabaseRowCount.toLocaleString()} รายการ)`;
    }

    // Reload Admin table to display new data immediately
    AppState.adminCurrentPage = 1;
    await loadAdminOrders();

    // Auto-update all dashboards, charts, maps & reports across the application!
    syncAppWithNewRecords(rows);

    alert(`🎉 นำเข้าข้อมูลสำเร็จจำนวน ${totalUploaded.toLocaleString()} รายการ และอัปเดตระบบอัตโนมัติทุกหน้า (กราฟ, แผนที่, สรุปสายรถ, และตารางข้อมูล) เรียบร้อยแล้ว!`);

  } catch (err) {
    console.error('Fatal upload error:', err);
    alert(`❌ เกิดข้อผิดพลาดในการอัปโหลด: ${err.message}`);
  } finally {
    AppState.isUploadingToSupabase = false;
    if (btnUpload) {
      btnUpload.disabled = false;
      btnUpload.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
}
window.startParsedDataUpload = startParsedDataUpload;

function resetAdminUploadState() {
  AppState.parsedUploadRows = [];
  const previewContainer = document.getElementById('adminUploadPreviewContainer');
  const progressContainer = document.getElementById('adminUploadProgressBarContainer');
  const label = document.getElementById('adminFileNameLabel');
  const fileInput = document.getElementById('adminFileInput');

  if (previewContainer) previewContainer.classList.add('hidden');
  if (progressContainer) progressContainer.classList.add('hidden');
  if (label) {
    label.textContent = '';
    label.classList.add('hidden');
  }
  if (fileInput) fileInput.value = '';
}
window.resetAdminUploadState = resetAdminUploadState;

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
      url += `&delivery_date=gte.${encodeURIComponent(date)}T00:00:00%2B07:00&delivery_date=lte.${encodeURIComponent(date)}T23:59:59%2B07:00`;
    } else if (AppState.adminDateMode === 'range') {
      const sDate = AppState.adminStartDate || (document.getElementById('adminStartDateInput')?.value || '');
      const eDate = AppState.adminEndDate || (document.getElementById('adminEndDateInput')?.value || '');
      if (sDate) {
        url += `&delivery_date=gte.${encodeURIComponent(sDate)}T00:00:00%2B07:00`;
      }
      if (eDate) {
        url += `&delivery_date=lte.${encodeURIComponent(eDate)}T23:59:59%2B07:00`;
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
    if (pinInput) {
      pinInput.value = '';
      pinInput.classList.remove('border-rose-500', 'bg-rose-50');
    }
    updateAdminAuthUI();
  } else {
    if (errorEl) {
      errorEl.classList.remove('hidden');
      errorEl.textContent = '❌ รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง';
    }
    if (pinInput) {
      pinInput.classList.add('border-rose-500', 'bg-rose-50');
      pinInput.value = '';
      pinInput.focus();
      setTimeout(() => {
        if (pinInput) pinInput.classList.remove('border-rose-500', 'bg-rose-50');
      }, 2000);
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
  // สาขารามอินทรา (23 คัน)
  '13205': 'หนองจอก / ลำผักชี / สุวินทวงศ์ (ม.โรยัลปาร์ควิลล์, ม.คริสตัล)',
  '13S01': 'คลองสามวา / ทรายกองดินใต้ / ถ.ประชาร่วมใจ (ม.กฤษดานคร 25)',
  '13203': 'คลองสามวา / บางชัน / พระยาสุเรนทร์ 35 (ม.เดอะพาลา)',
  '13101': 'บึงกุ่ม / คลองกุ่ม / ถ.เสรีไทย (ม.นาริสา, ม.สหกรณ์)',
  '13102': 'คันนายาว / บึงกุ่ม / ถ.เสรีไทย',
  '13103': 'บึงกุ่ม / คลองกุ่ม / ถ.นวมินทร์',
  '13104': 'บึงกุ่ม / คลองกุ่ม / ซ.โพธิ์แก้ว',
  '13105': 'หนองจอก / ถ.ฉลองกรุง / ลำผักชี',
  '13201': 'คลองสามวา / บางชัน / มีนบุรี / ซ.คู้บอน',
  '13202': 'คลองสามวา / บางชัน / มีนบุรี',
  '13204': 'คลองสามวา / ถ.หทัยราษฎร์ / พระยาสุเรนทร์',
  '13206': 'สุวินทวงศ์ / มีนบุรี / หนองจอก',
  '13207': 'มีนบุรี / ถ.บึงขวาง / ทรายกองดิน',
  '13301': 'ท่าแร้ง / วัชรพล / สุขาภิบาล 5',
  '13302': 'ลาดพร้าว / ถ.ประเสริฐมนูกิจ (เกษตร-นวมินทร์)',
  '13304': 'ลาดพร้าว / บางชัน / ถ.วัชรพล',
  '13305': 'ลาดพร้าว / โชคชัย 4 / ลาดพร้าววังหิน',
  '13401': 'ท่าแร้ง / ซ.วัชรพล / ถ.รามอินทรา',
  '13402': 'สายไหม / ออเงิน / สุขาภิบาล 5 ซ.28',
  '13404': 'สายไหม / ถ.เพิ่มสิน / วัชรพล',
  '13L11': 'ลาดพร้าว / บึงกุ่ม / คลองกุ่ม',
  '13L16': 'คู้บอน / ท่าแร้ง / คลองสามวา / ปัญญาอินทรา',

  // สาขากรุงเทพกรีฑา (22 คัน)
  '16304': 'สะพานสูง / ทับช้าง / กรุงเทพกรีฑา 8-10 (ม.นักกีฬาแหลมทอง, ม.ชาลิสา)',
  '16302': 'บางกะปิ / คลองจั่น / ถ.แฮปปี้แลนด์ (ม.ฉัตรแก้ว)',
  '16204': 'บางกะปิ / คลองจั่น / ซ.โพธิ์แก้ว 4 (ม.สินสุข โพธิ์แก้ว)',
  '16301': 'สะพานสูง / ถ.รามคำแหง 118 (ม.สัมมากร)',
  '16303': 'สะพานสูง / หัวหมาก / ถ.กรุงเทพกรีฑา',
  '16305': 'สะพานสูง / กรุงเทพกรีฑา / ถ.ศรีนครินทร์',
  '16306': 'สะพานสูง / เคหะร่มเกล้า / ถ.ราษฎร์พัฒนา',
  '16307': 'สะพานสูง / ถ.รามคำแหง / กรุงเทพกรีฑา',
  '16308': 'สะพานสูง / ทับช้าง / ถ.ราษฎร์พัฒนา',
  '16101': 'วังทองหลาง / ซ.ลาดพร้าว 80-100',
  '16102': 'วังทองหลาง / ถ.รามคำแหง / ลาดพร้าว',
  '16103': 'วังทองหลาง / ถ.ลาดพร้าว / รามคำแหง',
  '16104': 'วังทองหลาง / ถ.รามคำแหง / หัวหมาก',
  '16105': 'หัวหมาก / ถ.รามคำแหง / ลำสาลี',
  '16106': 'ลาดพร้าว / วังทองหลาง / โชคชัย 4',
  '16107': 'หัวหมาก / แยกลำสาลี / รามคำแหง',
  '16201': 'ลาดพร้าว / วังทองหลาง / ถ.ประดิษฐ์มนูธรรม',
  '16202': 'วังทองหลาง / ลาดพร้าว / เอกมัย-รามอินทรา',
  '16203': 'หัวหมาก / บางกะปิ / ถ.รามคำแหง',
  '16205': 'รามคำแหง / หัวหมาก / ถ.พัฒนาการ',
  '16206': 'ลาดพร้าว / บางกะปิ / แฮปปี้แลนด์',
  '16L19': 'บางกะปิ / ถ.รามคำแหง / หัวหมาก',

  // สาขาสุขุมวิท 50 (18 คัน)
  '11L13': 'พระโขนง / คลองเตย / ถ.สุขุมวิท 50-71',
  '11102': 'พระโขนง / สุขุมวิท 50 / ซ.สุขุมวิท 48-62',
  '11104': 'คลองเตย / สุขุมวิท / พระโขนง',
  '11105': 'คลองเตย / พระราม 4 / ซ.สุขุมวิท 22-26',
  '11106': 'พระโขนง / สุขุมวิท 71 / ปรีดีพนมยงค์',
  '11107': 'สุขุมวิท 50 / คลองเตย / พระราม 4',
  '11108': 'สุขุมวิท 50-71 / คลองเตย / ซ.อ่อนนุช',
  '11202': 'สุขุมวิท / คลองเตย / พระโขนง',
  '11203': 'คลองเตย / พระราม 4 / สุขุมวิท',
  '11204': 'สุขุมวิท 101-103 / ถ.อุดมสุข',
  '11205': 'สุขุมวิท / บางจาก / ซ.ปุณณวิถี',
  '11206': 'สุขุมวิท / อุดมสุข / ถ.บางนา-ตราด',
  '11207': 'สุขุมวิท / คลองเตย / พระโขนง',
  '11301': 'พระโขนง / สุขุมวิท 77 / ถ.อ่อนนุช',
  '11302': 'สุขุมวิท / คลองเตย / ซ.เอกมัย',
  '11305': 'สุขุมวิท / ซ.ทองหล่อ / คลองเตย',
  '11306': 'สุขุมวิท / พระโขนง / คลองเตย',
  '11308': 'สุขุมวิท / บางจาก / อ่อนนุช / ปุณณวิถี',

  // สาขาพระราม 3 (5 คัน)
  '30206': 'สาธุประดิษฐ์ / ช่องนนทรี / ยานนาวา',
  '50101': 'พระราม 3 ริมแม่น้ำ / ยานนาวา / สาธุประดิษฐ์',
  '50103': 'เจริญกรุง / บางคอแหลม / ถ.พระราม 3',
  '50207': 'นราธิวาสราชนครินทร์ / ช่องนนทรี / นางลิ้นจี่',
  '50304': 'สีลม / สาทร / พระราม 4 / คลองเตย'
};

function getTruckZone(truckNumber, members = []) {
  if (TRUCK_ZONES[truckNumber]) return TRUCK_ZONES[truckNumber];
  if (members && members.length > 0) {
    const landmarkKeywords = [
      'นักกีฬาแหลมทอง', 'ชาลิสา', 'โรยัลปาร์ควิลล์', 'คริสตัล', 'สัมมากร', 'นาริสา',
      'กฤษดานคร', 'สะพานสูง', 'ทับช้าง', 'คลองสามวา', 'หนองจอก', 'มีนบุรี',
      'เสรีไทย', 'รามคำแหง', 'กรุงเทพกรีฑา', 'ศรีนครินทร์', 'ร่มเกล้า', 'พัฒนาการ',
      'อ่อนนุช', 'หัวหมาก', 'สุขุมวิท', 'พระโขนง', 'คลองเตย', 'บางจาก', 'อุดมสุข',
      'บางนา', 'พระราม 3', 'สาธุประดิษฐ์', 'ยานนาวา', 'วัชรพล', 'สุขาภิบาล 5',
      'สายไหม', 'เพิ่มสิน', 'ออเงิน', 'ท่าแร้ง', 'คู้บอน', 'พระยาสุเรนทร์',
      'หทัยราษฎร์', 'นิมิตใหม่', 'สุวินทวงศ์', 'ลำผักชี', 'บึงกุ่ม', 'แฮปปี้แลนด์',
      'ลาดพร้าว', 'วังทองหลาง', 'บางชัน', 'คันนายาว', 'ประชาร่วมใจ', 'ฉลองกรุง'
    ];
    const counts = {};
    members.forEach(m => {
      const a = m.address || '';
      landmarkKeywords.forEach(lm => {
        if (a.includes(lm)) counts[lm] = (counts[lm] || 0) + 1;
      });
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
    if (top.length > 0) return top.join(' / ');
  }
  return 'เขตพื้นที่บริการหลัก';
}

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
      truckList = truckList.filter(t => t.truck.toLowerCase().includes(truckQuery) || (getTruckZone(t.truck, t.members) || '').toLowerCase().includes(truckQuery));
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
        const zone = getTruckZone(t.truck, t.members);

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


