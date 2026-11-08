/**
 * ระบบบันทึกยอดขาย รายรับ และรายจ่าย 3 สาขา + รายจ่ายบริษัท
 * หนองคาย • โคราช • ขอนแก่น • รายจ่ายบริษัท
 * บันทึกรายวัน สรุปยอดรายเดือน (Daily Entry & Monthly Summary)
 */

// Storage Keys
const KEY_SALES = 'app_mb_sales_v2';
const KEY_REVENUE = 'app_mb_revenue_v2';
const KEY_EXPENSES = 'app_mb_expenses_v2';
const KEY_RECORDER = 'app_mb_last_recorder_v2';
const KEY_GMAIL_RECIPIENT = 'app_mb_last_gmail_recipient_v2';

// 6 Sales/Revenue Channels
const CHANNELS = [
  { key: 'cash', label: 'เงินสด', icon: '💵', color: '#16a34a', bg: 'var(--ch-cash-bg)' },
  { key: 'transfer', label: 'เงินโอน', icon: '📱', color: '#2563eb', bg: 'var(--ch-transfer-bg)' },
  { key: 'grab', label: 'แกรป (Grab)', icon: '🛵', color: '#00b14f', bg: 'var(--ch-grab-bg)' },
  { key: 'lineman', label: 'ไลน์แมน (LINE MAN)', icon: '🛵', color: '#00c73c', bg: 'var(--ch-lineman-bg)' },
  { key: 'shopee', label: 'ช็อปปี้ฟู้ด (ShopeeFood)', icon: '🛍️', color: '#ea580c', bg: 'var(--ch-shopee-bg)' },
  { key: 'thai', label: 'ไทยช่วยไทย', icon: '🇹🇭', color: '#0284c7', bg: 'var(--ch-thai-bg)' }
];

// Expense Categories
const EXPENSE_CATEGORIES = [
  { name: 'ต้นทุนวัตถุดิบเครื่องดื่ม', icon: '🥤', color: '#0284c7', class: 'cat-beverage' },
  { name: 'อาหาร', icon: '🍲', color: '#ea580c', class: 'cat-food' },
  { name: 'เบเกอรี่', icon: '🥐', color: '#d97706', class: 'cat-bakery' },
  { name: 'น้ำมันเชื้อเพลิงการเดินทาง', icon: '⛽', color: '#dc2626', class: 'cat-fuel' },
  { name: 'ค่าแรง', icon: '👥', color: '#7c3aed', class: 'cat-wage' },
  { name: 'ค่าเช่าสาธารณูปโภค', icon: '🏢', color: '#475569', class: 'cat-rent' },
  { name: 'ค่าใช้จ่ายอื่นๆ / เบ็ดเตล็ด', icon: '📦', color: '#94a3b8', class: 'cat-other' }
];

// Branches
const SALES_BRANCHES = ['หนองคาย', 'โคราช', 'ขอนแก่น'];
const ALL_EXPENSE_BRANCHES = ['หนองคาย', 'โคราช', 'ขอนแก่น', 'รายจ่ายบริษัท'];

// Global State
let salesList = [];
let revenueList = [];
let expenseList = [];
let currentMonth = ''; // Format 'YYYY-MM'
let activeBranch = 'ALL';
let activeTab = 'tab-dashboard';
let activeDailyExpBranch = 'ALL';
let activeDailyExpDate = '';

// Format currency
const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

const formatNumber = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

const formatDateThai = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const year = parseInt(parts[0], 10) + 543;
  return `${parts[2]}/${parts[1]}/${year}`;
};

const formatMonthThai = (monthStr) => {
  if (!monthStr) return '-';
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const mIndex = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[0], 10) + 543;
  return `${monthNames[mIndex] || parts[1]} ${year}`;
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initDateAndMonth();
  loadData();
  setupEventListeners();
  renderAll();
});

// Setup Initial Month & Dates
function initDateAndMonth() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  
  currentMonth = `${yyyy}-${mm}`;
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Set Inputs
  const monthInput = document.getElementById('selectedMonthInput');
  if (monthInput) monthInput.value = currentMonth;

  const salesDate = document.getElementById('salesInputDate');
  if (salesDate) salesDate.value = todayStr;

  const revDate = document.getElementById('revInputDate');
  if (revDate) revDate.value = todayStr;

  const expDate = document.getElementById('expInputDate');
  if (expDate) expDate.value = todayStr;

  activeDailyExpDate = todayStr;
  const dailyExpDateInput = document.getElementById('dailyExpFilterDate');
  if (dailyExpDateInput) dailyExpDateInput.value = todayStr;

  // Restore Last Recorder
  const lastRecorder = localStorage.getItem(KEY_RECORDER);
  if (lastRecorder) {
    if (document.getElementById('salesInputRecorder')) document.getElementById('salesInputRecorder').value = lastRecorder;
    if (document.getElementById('revInputRecorder')) document.getElementById('revInputRecorder').value = lastRecorder;
    if (document.getElementById('expInputRecorder')) document.getElementById('expInputRecorder').value = lastRecorder;
  }
}

// Load Data from LocalStorage (or generate Demo Data if empty)
function loadData() {
  const savedSales = localStorage.getItem(KEY_SALES);
  const savedRev = localStorage.getItem(KEY_REVENUE);
  const savedExp = localStorage.getItem(KEY_EXPENSES);

  if (savedSales || savedRev || savedExp) {
    salesList = savedSales ? JSON.parse(savedSales) : [];
    revenueList = savedRev ? JSON.parse(savedRev) : [];
    expenseList = savedExp ? JSON.parse(savedExp) : [];
  } else {
    // Generate Sample Demo Data automatically on first visit
    generateDemoData();
  }
}

// Save Data to LocalStorage
function saveData() {
  localStorage.setItem(KEY_SALES, JSON.stringify(salesList));
  localStorage.setItem(KEY_REVENUE, JSON.stringify(revenueList));
  localStorage.setItem(KEY_EXPENSES, JSON.stringify(expenseList));
}

// Setup Event Listeners
function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Month Controls
  const monthInput = document.getElementById('selectedMonthInput');
  if (monthInput) {
    monthInput.addEventListener('change', (e) => {
      if (e.target.value) {
        currentMonth = e.target.value;
        renderAll();
      }
    });
  }

  const btnPrev = document.getElementById('btnPrevMonth');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      shiftMonth(-1);
    });
  }

  const btnNext = document.getElementById('btnNextMonth');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      shiftMonth(1);
    });
  }

  const btnCurrentMonth = document.getElementById('btnCurrentMonth');
  if (btnCurrentMonth) {
    btnCurrentMonth.addEventListener('click', () => {
      const now = new Date();
      currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (monthInput) monthInput.value = currentMonth;
      renderAll();
    });
  }

  // Branch Filter Pills
  document.querySelectorAll('.branch-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.branch-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeBranch = btn.getAttribute('data-branch') || 'ALL';
      renderAll();
    });
  });

  // Top Action Buttons
  document.getElementById('btnQuickAddSales')?.addEventListener('click', () => {
    switchTab('tab-sales');
    document.getElementById('salesCash')?.focus();
  });
  document.getElementById('btnQuickAddRevenue')?.addEventListener('click', () => {
    switchTab('tab-revenue');
    document.getElementById('revCash')?.focus();
  });
  document.getElementById('btnQuickAddExpense')?.addEventListener('click', () => {
    switchTab('tab-expenses');
    document.getElementById('expInputAmount')?.focus();
  });
  document.getElementById('btnPrintTopBtn')?.addEventListener('click', () => {
    window.print();
  });
  document.getElementById('btnPrintReportFull')?.addEventListener('click', () => {
    window.print();
  });
  document.getElementById('btnExportTopBtn')?.addEventListener('click', () => {
    exportFullMonthlyCSV();
  });
  document.getElementById('btnExportFullMonthlyCSV')?.addEventListener('click', () => {
    exportFullMonthlyCSV();
  });
  document.getElementById('btnExportDailyCSV')?.addEventListener('click', () => {
    exportDailySummaryCSV();
  });

  // Gmail Modal Listeners
  document.getElementById('btnOpenGmailModal')?.addEventListener('click', () => openGmailModal('MONTHLY'));
  document.getElementById('btnReportSendGmail')?.addEventListener('click', () => openGmailModal('MONTHLY'));
  document.getElementById('btnCloseGmailModal')?.addEventListener('click', closeGmailModal);
  document.getElementById('btnCancelGmailModal')?.addEventListener('click', closeGmailModal);
  document.getElementById('gmailReportType')?.addEventListener('change', onGmailReportTypeChange);
  document.getElementById('gmailSelectedDate')?.addEventListener('change', updateGmailPreview);
  document.getElementById('gmailBranchFilter')?.addEventListener('change', updateGmailPreview);
  document.getElementById('gmailRecipientInput')?.addEventListener('input', () => {
    localStorage.setItem(KEY_GMAIL_RECIPIENT, document.getElementById('gmailRecipientInput').value);
  });
  document.getElementById('btnCopyGmailBody')?.addEventListener('click', copyGmailPreview);
  document.getElementById('btnLaunchGmailCompose')?.addEventListener('click', launchGmailCompose);
  document.getElementById('btnOpenMailtoClient')?.addEventListener('click', openMailtoCompose);

  // JPG Export Modal Listeners
  document.getElementById('btnExportJPG')?.addEventListener('click', () => openJpgModal('MONTHLY'));
  document.getElementById('btnReportExportJPG')?.addEventListener('click', () => openJpgModal('MONTHLY'));
  document.getElementById('btnCloseJpgModal')?.addEventListener('click', closeJpgModal);
  document.getElementById('btnCancelJpgModal')?.addEventListener('click', closeJpgModal);
  document.getElementById('jpgReportType')?.addEventListener('change', onJpgReportTypeChange);
  document.getElementById('jpgSelectedDate')?.addEventListener('change', renderSummaryCanvas);
  document.getElementById('jpgBranchFilter')?.addEventListener('change', renderSummaryCanvas);
  document.getElementById('btnDownloadJpgImage')?.addEventListener('click', downloadJpgImage);
  document.getElementById('btnCopyJpgImage')?.addEventListener('click', copyJpgImageToClipboard);

  // Daily Expense Section Listeners
  const dailyExpDateInput = document.getElementById('dailyExpFilterDate');
  if (dailyExpDateInput) {
    dailyExpDateInput.addEventListener('change', (e) => {
      activeDailyExpDate = e.target.value;
      renderDailyExpenseSection();
    });
  }

  document.querySelectorAll('#dailyExpBranchPillsWrap .branch-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#dailyExpBranchPillsWrap .branch-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeDailyExpBranch = btn.getAttribute('data-daily-branch') || 'ALL';
      renderDailyExpenseSection();
    });
  });

  document.getElementById('btnExportDailyExpenseJPG')?.addEventListener('click', () => {
    const targetDate = activeDailyExpDate || document.getElementById('dailyExpFilterDate')?.value || new Date().toISOString().slice(0, 10);
    openJpgModal('DAILY_EXPENSE', targetDate, activeDailyExpBranch);
  });

  document.getElementById('btnSendDailyExpenseGmail')?.addEventListener('click', () => {
    const targetDate = activeDailyExpDate || document.getElementById('dailyExpFilterDate')?.value || new Date().toISOString().slice(0, 10);
    openGmailModal('DAILY_EXPENSE', targetDate, activeDailyExpBranch);
  });

  // Sales Form Live Calculations
  document.querySelectorAll('.sales-channel-input').forEach(input => {
    input.addEventListener('input', updateSalesTotalPreview);
  });

  // Revenue Form Live Calculations
  document.querySelectorAll('.rev-channel-input').forEach(input => {
    input.addEventListener('input', updateRevTotalPreview);
  });

  // Sales Form Submit
  const formSales = document.getElementById('formDailySales');
  if (formSales) {
    formSales.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSalesSubmit(false);
    });
  }

  // Sales Form Submit & Sync Revenue
  const btnSync = document.getElementById('btnSubmitSalesAndSyncRevenue');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      handleSalesSubmit(true);
    });
  }

  // Revenue Form Submit
  const formRev = document.getElementById('formDailyRevenue');
  if (formRev) {
    formRev.addEventListener('submit', (e) => {
      e.preventDefault();
      handleRevenueSubmit();
    });
  }

  // Fetch Sales to Revenue Button
  const btnCopySales = document.getElementById('btnCopyFromSalesToRev');
  if (btnCopySales) {
    btnCopySales.addEventListener('click', handleCopySalesToRevenue);
  }

  // Expense Form Submit
  const formExp = document.getElementById('formExpense');
  if (formExp) {
    formExp.addEventListener('submit', (e) => {
      e.preventDefault();
      handleExpenseSubmit();
    });
  }

  // Reset Form Buttons
  document.getElementById('btnResetSalesForm')?.addEventListener('click', resetSalesForm);
  document.getElementById('btnResetRevForm')?.addEventListener('click', resetRevenueForm);
  document.getElementById('btnResetExpenseForm')?.addEventListener('click', resetExpenseForm);

  // Search & Filter Events
  document.getElementById('salesSearchInput')?.addEventListener('input', renderSalesTable);
  document.getElementById('revSearchInput')?.addEventListener('input', renderRevenueTable);
  document.getElementById('expSearchInput')?.addEventListener('input', renderExpenseTable);
  document.getElementById('expCategoryFilter')?.addEventListener('change', renderExpenseTable);

  // CSV Export Buttons
  document.getElementById('btnExportSalesCSV')?.addEventListener('click', exportSalesCSV);
  document.getElementById('btnExportRevenueCSV')?.addEventListener('click', exportRevenueCSV);
  document.getElementById('btnExportExpensesCSV')?.addEventListener('click', exportExpensesCSV);

  // Backup & Restore
  document.getElementById('btnLoadDemoData')?.addEventListener('click', () => {
    if (confirm('คุณต้องการโหลดข้อมูลตัวอย่างจำลองใช่หรือไม่? ข้อมูลทดสอบจะถูกเขียนทับลงในระบบ')) {
      generateDemoData();
      renderAll();
      showToast('โหลดข้อมูลตัวอย่างจำลอง 3 สาขา และรายจ่ายบริษัทเรียบร้อยแล้ว', 'success');
    }
  });

  document.getElementById('btnClearAllDatabase')?.addEventListener('click', () => {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      salesList = [];
      revenueList = [];
      expenseList = [];
      saveData();
      renderAll();
      showToast('ล้างข้อมูลทั้งหมดในระบบเรียบร้อยแล้ว', 'error');
    }
  });

  document.getElementById('btnExportJSON')?.addEventListener('click', exportJSONBackup);
  document.getElementById('inputImportJSON')?.addEventListener('change', importJSONBackup);
}

// Switch View Tabs
function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-content').forEach(section => {
    if (section.id === tabId) {
      section.style.display = 'block';
    } else {
      section.style.display = 'none';
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Shift Month Helper (+1 or -1)
function shiftMonth(direction) {
  const parts = currentMonth.split('-');
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10) + direction;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  currentMonth = `${y}-${String(m).padStart(2, '0')}`;
  const monthInput = document.getElementById('selectedMonthInput');
  if (monthInput) monthInput.value = currentMonth;
  renderAll();
}

// Live Calculate Sales Form Preview
function updateSalesTotalPreview() {
  const cash = parseFloat(document.getElementById('salesCash')?.value) || 0;
  const transfer = parseFloat(document.getElementById('salesTransfer')?.value) || 0;
  const grab = parseFloat(document.getElementById('salesGrab')?.value) || 0;
  const lineman = parseFloat(document.getElementById('salesLineman')?.value) || 0;
  const shopee = parseFloat(document.getElementById('salesShopee')?.value) || 0;
  const thai = parseFloat(document.getElementById('salesThai')?.value) || 0;
  const total = cash + transfer + grab + lineman + shopee + thai;

  const preview = document.getElementById('salesCalcTotalPreview');
  if (preview) preview.textContent = formatCurrency(total);
}

// Live Calculate Revenue Form Preview
function updateRevTotalPreview() {
  const cash = parseFloat(document.getElementById('revCash')?.value) || 0;
  const transfer = parseFloat(document.getElementById('revTransfer')?.value) || 0;
  const grab = parseFloat(document.getElementById('revGrab')?.value) || 0;
  const lineman = parseFloat(document.getElementById('revLineman')?.value) || 0;
  const shopee = parseFloat(document.getElementById('revShopee')?.value) || 0;
  const thai = parseFloat(document.getElementById('revThai')?.value) || 0;
  const total = cash + transfer + grab + lineman + shopee + thai;

  const preview = document.getElementById('revCalcTotalPreview');
  if (preview) preview.textContent = formatCurrency(total);
}

// Handle Sales Submission
function handleSalesSubmit(syncToRev = false) {
  const editId = document.getElementById('salesEditId').value;
  const date = document.getElementById('salesInputDate').value;
  const branchRadio = document.querySelector('input[name="salesBranch"]:checked');
  const branch = branchRadio ? branchRadio.value : 'หนองคาย';
  const recorder = document.getElementById('salesInputRecorder').value.trim();
  const note = document.getElementById('salesInputNote').value.trim();

  const cash = parseFloat(document.getElementById('salesCash').value) || 0;
  const transfer = parseFloat(document.getElementById('salesTransfer').value) || 0;
  const grab = parseFloat(document.getElementById('salesGrab').value) || 0;
  const lineman = parseFloat(document.getElementById('salesLineman').value) || 0;
  const shopee = parseFloat(document.getElementById('salesShopee').value) || 0;
  const thai = parseFloat(document.getElementById('salesThai').value) || 0;
  const total = cash + transfer + grab + lineman + shopee + thai;

  if (!date) {
    showToast('กรุณาระบุวันที่บันทึกยอดขาย', 'error');
    return;
  }
  if (!recorder) {
    showToast('กรุณาระบุชื่อผู้บันทึกข้อมูล', 'error');
    return;
  }
  if (total <= 0) {
    if (!confirm('ยอดขายรวมเป็น 0.00 บาท ต้องการบันทึกข้อมูลนี้ใช่หรือไม่?')) {
      return;
    }
  }

  // Save last recorder for convenience
  localStorage.setItem(KEY_RECORDER, recorder);

  if (editId) {
    // Edit existing
    const index = salesList.findIndex(s => s.id === editId);
    if (index !== -1) {
      salesList[index] = {
        ...salesList[index],
        date,
        branch,
        cash,
        transfer,
        grab,
        lineman,
        shopee,
        thai,
        total,
        recorder,
        note,
        updatedAt: new Date().toISOString()
      };
      showToast(`แก้ไขยอดขายสาขา${branch} วันที่ ${formatDateThai(date)} สำเร็จ`, 'success');
    }
  } else {
    // Create new
    const newSales = {
      id: 'sal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date,
      branch,
      cash,
      transfer,
      grab,
      lineman,
      shopee,
      thai,
      total,
      recorder,
      note,
      createdAt: new Date().toISOString()
    };
    salesList.push(newSales);
    showToast(`บันทึกยอดขายสาขา${branch} ประจำวันที่ ${formatDateThai(date)} เรียบร้อย`, 'success');

    // If requested, sync to Revenue
    if (syncToRev) {
      const newRev = {
        id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date,
        branch,
        cash,
        transfer,
        grab,
        lineman,
        shopee,
        thai,
        total,
        recorder,
        note: 'สร้างอัตโนมัติจากยอดขาย: ' + (note || '-'),
        createdAt: new Date().toISOString()
      };
      revenueList.push(newRev);
      showToast(`สร้างข้อมูลรายรับสาขา${branch} วันที่ ${formatDateThai(date)} ให้อัตโนมัติแล้ว!`, 'success');
    }
  }

  saveData();
  resetSalesForm();
  renderAll();
}

// Reset Sales Form
function resetSalesForm() {
  document.getElementById('salesEditId').value = '';
  document.getElementById('salesCash').value = '0';
  document.getElementById('salesTransfer').value = '0';
  document.getElementById('salesGrab').value = '0';
  document.getElementById('salesLineman').value = '0';
  document.getElementById('salesShopee').value = '0';
  document.getElementById('salesThai').value = '0';
  document.getElementById('salesInputNote').value = '';
  document.getElementById('btnSubmitSales').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
    บันทึกยอดขาย
  `;
  updateSalesTotalPreview();
}

// Handle Revenue Submission
function handleRevenueSubmit() {
  const editId = document.getElementById('revEditId').value;
  const date = document.getElementById('revInputDate').value;
  const branchRadio = document.querySelector('input[name="revBranch"]:checked');
  const branch = branchRadio ? branchRadio.value : 'หนองคาย';
  const recorder = document.getElementById('revInputRecorder').value.trim();
  const note = document.getElementById('revInputNote').value.trim();

  const cash = parseFloat(document.getElementById('revCash').value) || 0;
  const transfer = parseFloat(document.getElementById('revTransfer').value) || 0;
  const grab = parseFloat(document.getElementById('revGrab').value) || 0;
  const lineman = parseFloat(document.getElementById('revLineman').value) || 0;
  const shopee = parseFloat(document.getElementById('revShopee').value) || 0;
  const thai = parseFloat(document.getElementById('revThai').value) || 0;
  const total = cash + transfer + grab + lineman + shopee + thai;

  if (!date) {
    showToast('กรุณาระบุวันที่บันทึกรายรับ', 'error');
    return;
  }
  if (!recorder) {
    showToast('กรุณาระบุชื่อผู้บันทึกข้อมูล', 'error');
    return;
  }

  localStorage.setItem(KEY_RECORDER, recorder);

  if (editId) {
    const index = revenueList.findIndex(r => r.id === editId);
    if (index !== -1) {
      revenueList[index] = {
        ...revenueList[index],
        date,
        branch,
        cash,
        transfer,
        grab,
        lineman,
        shopee,
        thai,
        total,
        recorder,
        note,
        updatedAt: new Date().toISOString()
      };
      showToast(`แก้ไขรายรับสาขา${branch} วันที่ ${formatDateThai(date)} สำเร็จ`, 'success');
    }
  } else {
    const newRev = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date,
      branch,
      cash,
      transfer,
      grab,
      lineman,
      shopee,
      thai,
      total,
      recorder,
      note,
      createdAt: new Date().toISOString()
    };
    revenueList.push(newRev);
    showToast(`บันทึกรายรับสาขา${branch} ประจำวันที่ ${formatDateThai(date)} เรียบร้อย`, 'success');
  }

  saveData();
  resetRevenueForm();
  renderAll();
}

// Reset Revenue Form
function resetRevenueForm() {
  document.getElementById('revEditId').value = '';
  document.getElementById('revCash').value = '0';
  document.getElementById('revTransfer').value = '0';
  document.getElementById('revGrab').value = '0';
  document.getElementById('revLineman').value = '0';
  document.getElementById('revShopee').value = '0';
  document.getElementById('revThai').value = '0';
  document.getElementById('revInputNote').value = '';
  document.getElementById('btnSubmitRevenue').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
    บันทึกรายรับ
  `;
  updateRevTotalPreview();
}

// Copy Sales to Revenue
function handleCopySalesToRevenue() {
  const targetDate = document.getElementById('revInputDate').value;
  const branchRadio = document.querySelector('input[name="revBranch"]:checked');
  const targetBranch = branchRadio ? branchRadio.value : 'หนองคาย';

  const match = salesList.find(s => s.date === targetDate && s.branch === targetBranch);
  if (!match) {
    showToast(`ไม่พบข้อมูลยอดขายของสาขา${targetBranch} ในวันที่ ${formatDateThai(targetDate)}`, 'error');
    return;
  }

  document.getElementById('revCash').value = match.cash;
  document.getElementById('revTransfer').value = match.transfer;
  document.getElementById('revGrab').value = match.grab;
  document.getElementById('revLineman').value = match.lineman;
  document.getElementById('revShopee').value = match.shopee;
  document.getElementById('revThai').value = match.thai;
  updateRevTotalPreview();
  showToast(`คัดลอกยอดขายของสาขา${targetBranch} วันที่ ${formatDateThai(targetDate)} มาใส่เรียบร้อยแล้ว`, 'success');
}

// Handle Expense Submission
function handleExpenseSubmit() {
  const editId = document.getElementById('expEditId').value;
  const date = document.getElementById('expInputDate').value;
  const branchRadio = document.querySelector('input[name="expBranch"]:checked');
  const branch = branchRadio ? branchRadio.value : 'หนองคาย';
  const category = document.getElementById('expInputCategory').value;
  const amount = parseFloat(document.getElementById('expInputAmount').value);
  const desc = document.getElementById('expInputDesc').value.trim();
  const paymentMethod = document.getElementById('expInputPaymentMethod').value;
  const paidBy = document.getElementById('expInputPaidBy').value.trim();
  const recorder = document.getElementById('expInputRecorder').value.trim();
  const receiptNo = document.getElementById('expInputReceiptNo').value.trim();

  if (!date) {
    showToast('กรุณาระบุวันที่จ่าย', 'error');
    return;
  }
  if (!desc) {
    showToast('กรุณากรอกรายละเอียดรายการรายจ่าย', 'error');
    return;
  }
  if (!amount || amount <= 0) {
    showToast('กรุณากรอกจำนวนเงินที่ถูกต้อง', 'error');
    return;
  }
  if (!recorder) {
    showToast('กรุณาระบุชื่อผู้บันทึกข้อมูล', 'error');
    return;
  }

  localStorage.setItem(KEY_RECORDER, recorder);

  if (editId) {
    const index = expenseList.findIndex(e => e.id === editId);
    if (index !== -1) {
      expenseList[index] = {
        ...expenseList[index],
        date,
        branch,
        category,
        desc,
        amount,
        paymentMethod,
        paidBy,
        recorder,
        receiptNo,
        updatedAt: new Date().toISOString()
      };
      showToast(`แก้ไขรายจ่าย "${desc}" เรียบร้อย`, 'success');
    }
  } else {
    const newExp = {
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date,
      branch,
      category,
      desc,
      amount,
      paymentMethod,
      paidBy,
      recorder,
      receiptNo,
      createdAt: new Date().toISOString()
    };
    expenseList.push(newExp);
    showToast(`บันทึกรายจ่าย "${desc}" (${branch}) เรียบร้อย`, 'success');
  }

  saveData();
  resetExpenseForm();
  renderAll();
}

// Reset Expense Form
function resetExpenseForm() {
  document.getElementById('expEditId').value = '';
  document.getElementById('expInputAmount').value = '';
  document.getElementById('expInputDesc').value = '';
  document.getElementById('expInputPaidBy').value = '';
  document.getElementById('expInputReceiptNo').value = '';
  document.getElementById('btnSubmitExpense').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
    บันทึกรายจ่าย
  `;
}

// Edit Sales Action
window.editSalesRecord = function(id) {
  const item = salesList.find(s => s.id === id);
  if (!item) return;

  switchTab('tab-sales');
  document.getElementById('salesEditId').value = item.id;
  document.getElementById('salesInputDate').value = item.date;

  const radio = document.querySelector(`input[name="salesBranch"][value="${item.branch}"]`);
  if (radio) radio.checked = true;

  document.getElementById('salesCash').value = item.cash;
  document.getElementById('salesTransfer').value = item.transfer;
  document.getElementById('salesGrab').value = item.grab;
  document.getElementById('salesLineman').value = item.lineman;
  document.getElementById('salesShopee').value = item.shopee;
  document.getElementById('salesThai').value = item.thai;
  document.getElementById('salesInputRecorder').value = item.recorder;
  document.getElementById('salesInputNote').value = item.note || '';

  document.getElementById('btnSubmitSales').innerHTML = `💾 บันทึกการแก้ไขยอดขาย`;
  updateSalesTotalPreview();
  window.scrollTo({ top: 100, behavior: 'smooth' });
};

// Delete Sales Action
window.deleteSalesRecord = function(id) {
  const item = salesList.find(s => s.id === id);
  if (!item) return;
  if (confirm(`คุณต้องการลบยอดขายสาขา${item.branch} วันที่ ${formatDateThai(item.date)} ยอด ${formatCurrency(item.total)} ใช่หรือไม่?`)) {
    salesList = salesList.filter(s => s.id !== id);
    saveData();
    renderAll();
    showToast('ลบรายการยอดขายเรียบร้อยแล้ว', 'error');
  }
};

// Edit Revenue Action
window.editRevenueRecord = function(id) {
  const item = revenueList.find(r => r.id === id);
  if (!item) return;

  switchTab('tab-revenue');
  document.getElementById('revEditId').value = item.id;
  document.getElementById('revInputDate').value = item.date;

  const radio = document.querySelector(`input[name="revBranch"][value="${item.branch}"]`);
  if (radio) radio.checked = true;

  document.getElementById('revCash').value = item.cash;
  document.getElementById('revTransfer').value = item.transfer;
  document.getElementById('revGrab').value = item.grab;
  document.getElementById('revLineman').value = item.lineman;
  document.getElementById('revShopee').value = item.shopee;
  document.getElementById('revThai').value = item.thai;
  document.getElementById('revInputRecorder').value = item.recorder;
  document.getElementById('revInputNote').value = item.note || '';

  document.getElementById('btnSubmitRevenue').innerHTML = `💾 บันทึกการแก้ไขรายรับ`;
  updateRevTotalPreview();
  window.scrollTo({ top: 100, behavior: 'smooth' });
};

// Delete Revenue Action
window.deleteRevenueRecord = function(id) {
  const item = revenueList.find(r => r.id === id);
  if (!item) return;
  if (confirm(`คุณต้องการลบรายรับสาขา${item.branch} วันที่ ${formatDateThai(item.date)} ยอด ${formatCurrency(item.total)} ใช่หรือไม่?`)) {
    revenueList = revenueList.filter(r => r.id !== id);
    saveData();
    renderAll();
    showToast('ลบรายการรายรับเรียบร้อยแล้ว', 'error');
  }
};

// Edit Expense Action
window.editExpenseRecord = function(id) {
  const item = expenseList.find(e => e.id === id);
  if (!item) return;

  switchTab('tab-expenses');
  document.getElementById('expEditId').value = item.id;
  document.getElementById('expInputDate').value = item.date;

  const radio = document.querySelector(`input[name="expBranch"][value="${item.branch}"]`);
  if (radio) radio.checked = true;

  document.getElementById('expInputCategory').value = item.category;
  document.getElementById('expInputAmount').value = item.amount;
  document.getElementById('expInputDesc').value = item.desc;
  document.getElementById('expInputPaymentMethod').value = item.paymentMethod || 'เงินในลิ้นชักสาขา';
  document.getElementById('expInputPaidBy').value = item.paidBy || '';
  document.getElementById('expInputRecorder').value = item.recorder;
  document.getElementById('expInputReceiptNo').value = item.receiptNo || '';

  document.getElementById('btnSubmitExpense').innerHTML = `💾 บันทึกการแก้ไขรายจ่าย`;
  window.scrollTo({ top: 100, behavior: 'smooth' });
};

// Delete Expense Action
window.deleteExpenseRecord = function(id) {
  const item = expenseList.find(e => e.id === id);
  if (!item) return;
  if (confirm(`คุณต้องการลบรายจ่าย "${item.desc}" ยอด ${formatCurrency(item.amount)} ใช่หรือไม่?`)) {
    expenseList = expenseList.filter(e => e.id !== id);
    saveData();
    renderAll();
    showToast('ลบรายการรายจ่ายเรียบร้อยแล้ว', 'error');
  }
};

// ==============================================================
// CORE RENDERING FUNCTIONS
// ==============================================================

function renderAll() {
  renderBadgesCount();
  renderDashboard();
  renderSalesTable();
  renderRevenueTable();
  renderExpenseTable();
  renderDailyExpenseSection();
  renderReports();
}

function renderBadgesCount() {
  const curSales = salesList.filter(s => s.date.startsWith(currentMonth));
  const curRev = revenueList.filter(r => r.date.startsWith(currentMonth));
  const curExp = expenseList.filter(e => e.date.startsWith(currentMonth));

  document.getElementById('badgeSalesCount').textContent = curSales.length;
  document.getElementById('badgeRevenueCount').textContent = curRev.length;
  document.getElementById('badgeExpenseCount').textContent = curExp.length;
}

// Render Dashboard (Hero KPIs, Branch Cards, Charts, Daily Table)
function renderDashboard() {
  // Filter by Month and Branch
  const filteredSales = salesList.filter(s => {
    const matchMonth = s.date.startsWith(currentMonth);
    const matchBranch = activeBranch === 'ALL' || s.branch === activeBranch;
    return matchMonth && matchBranch;
  });

  const filteredRevenue = revenueList.filter(r => {
    const matchMonth = r.date.startsWith(currentMonth);
    const matchBranch = activeBranch === 'ALL' || r.branch === activeBranch;
    return matchMonth && matchBranch;
  });

  const filteredExpense = expenseList.filter(e => {
    const matchMonth = e.date.startsWith(currentMonth);
    const matchBranch = activeBranch === 'ALL' || e.branch === activeBranch;
    return matchMonth && matchBranch;
  });

  // Calculate Totals
  const totalSales = filteredSales.reduce((acc, cur) => acc + (cur.total || 0), 0);
  const totalRev = filteredRevenue.reduce((acc, cur) => acc + (cur.total || 0), 0);
  const totalExp = filteredExpense.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const netProfit = totalRev - totalExp;

  // Render KPIs
  document.getElementById('kpiSalesTotal').textContent = formatCurrency(totalSales);
  document.getElementById('kpiRevenueTotal').textContent = formatCurrency(totalRev);
  document.getElementById('kpiExpenseTotal').textContent = formatCurrency(totalExp);

  const profitEl = document.getElementById('kpiProfitTotal');
  const profitSub = document.getElementById('kpiProfitSub');
  profitEl.textContent = formatCurrency(netProfit);

  if (netProfit >= 0) {
    profitEl.style.color = 'var(--profit-color)';
    const margin = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0';
    profitSub.innerHTML = `<span class="kpi-badge positive">กำไร ${margin}%</span> <span>รายรับมากกว่ารายจ่าย</span>`;
  } else {
    profitEl.style.color = 'var(--loss-color)';
    const lossMargin = totalRev > 0 ? ((Math.abs(netProfit) / totalRev) * 100).toFixed(1) : '0';
    profitSub.innerHTML = `<span class="kpi-badge negative">ขาดทุน ${lossMargin}%</span> <span>รายจ่ายมากกว่ารายรับ</span>`;
  }

  // Render 4 Branch Performance Cards
  renderBranchCards();

  // Render Visual Breakdown Charts
  renderSalesChannelsBreakdown(filteredSales, totalSales);
  renderExpenseCategoriesBreakdown(filteredExpense, totalExp);
  renderBranchComparisonChart();

  // Render Daily Table
  renderDailySummaryTable();
}

// 4 Branch Cards Grid (หนองคาย, โคราช, ขอนแก่น, รายจ่ายบริษัท)
function renderBranchCards() {
  const container = document.getElementById('dashboardBranchCards');
  if (!container) return;

  const branchList = [
    { name: 'หนองคาย', badgeClass: 'badge-nongkhai', icon: '📍', isCompany: false },
    { name: 'โคราช', badgeClass: 'badge-korat', icon: '📍', isCompany: false },
    { name: 'ขอนแก่น', badgeClass: 'badge-khonkaen', icon: '📍', isCompany: false },
    { name: 'รายจ่ายบริษัท', badgeClass: 'badge-company', icon: '🏢', isCompany: true }
  ];

  let html = '';

  branchList.forEach(b => {
    // Sales
    const bSales = b.isCompany ? 0 : salesList
      .filter(s => s.date.startsWith(currentMonth) && s.branch === b.name)
      .reduce((acc, c) => acc + (c.total || 0), 0);

    // Revenue
    const bRev = b.isCompany ? 0 : revenueList
      .filter(r => r.date.startsWith(currentMonth) && r.branch === b.name)
      .reduce((acc, c) => acc + (c.total || 0), 0);

    // Expense
    const bExp = expenseList
      .filter(e => e.date.startsWith(currentMonth) && e.branch === b.name)
      .reduce((acc, c) => acc + (c.amount || 0), 0);

    const bProfit = bRev - bExp;
    const profitColor = bProfit >= 0 ? 'var(--profit-color)' : 'var(--loss-color)';

    html += `
      <div class="branch-summary-card">
        <div class="branch-card-header">
          <span class="branch-badge ${b.badgeClass}">${b.icon} ${b.name}</span>
          <span style="font-size: 0.75rem; color: var(--gray-400);">${b.isCompany ? 'สำนักงานใหญ่' : 'สาขาเปิดหน้าร้าน'}</span>
        </div>
        <div class="branch-metric-row">
          <span class="label">ยอดขายรวม:</span>
          <span class="val" style="color: var(--sales-color);">${b.isCompany ? '-' : formatCurrency(bSales)}</span>
        </div>
        <div class="branch-metric-row">
          <span class="label">รายรับรวม:</span>
          <span class="val" style="color: var(--revenue-color);">${b.isCompany ? '-' : formatCurrency(bRev)}</span>
        </div>
        <div class="branch-metric-row">
          <span class="label">รายจ่ายรวม:</span>
          <span class="val" style="color: var(--expense-color);">${formatCurrency(bExp)}</span>
        </div>
        <div class="branch-net-row">
          <span class="label">${b.isCompany ? 'รวมรายจ่ายส่วนกลาง:' : 'กำไร-ขาดทุน:'}</span>
          <span class="val" style="color: ${b.isCompany ? 'var(--expense-color)' : profitColor};">
            ${b.isCompany ? formatCurrency(bExp) : formatCurrency(bProfit)}
          </span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Render Sales Channels Breakdown Progress Bars
function renderSalesChannelsBreakdown(sales, total) {
  const container = document.getElementById('salesChannelsBreakdownList');
  const label = document.getElementById('salesChannelTotalLabel');
  if (!container) return;

  if (label) label.textContent = `ยอดรวม ${formatCurrency(total)}`;

  if (total <= 0) {
    container.innerHTML = `<div class="empty-state"><p class="empty-state-text">ยังไม่มียอดขายในเดือนนี้</p></div>`;
    return;
  }

  let html = '';
  CHANNELS.forEach(ch => {
    const sum = sales.reduce((acc, cur) => acc + (cur[ch.key] || 0), 0);
    const percent = total > 0 ? ((sum / total) * 100).toFixed(1) : 0;

    html += `
      <div class="breakdown-item">
        <div class="breakdown-info">
          <span class="name">${ch.icon} ${ch.label}</span>
          <span class="amount">${formatCurrency(sum)} <span style="font-weight: 400; color: var(--gray-500); font-size: 0.75rem;">(${percent}%)</span></span>
        </div>
        <div class="breakdown-bar-track">
          <div class="breakdown-bar-fill fill-${ch.key}" style="width: ${percent}%;"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Render Expense Categories Breakdown Progress Bars
function renderExpenseCategoriesBreakdown(expenses, total) {
  const container = document.getElementById('expenseCategoriesBreakdownList');
  const label = document.getElementById('expenseCategoryTotalLabel');
  if (!container) return;

  if (label) label.textContent = `ยอดรวม ${formatCurrency(total)}`;

  if (total <= 0) {
    container.innerHTML = `<div class="empty-state"><p class="empty-state-text">ยังไม่มีรายจ่ายในเดือนนี้</p></div>`;
    return;
  }

  let html = '';
  EXPENSE_CATEGORIES.forEach(cat => {
    const sum = expenses
      .filter(e => e.category === cat.name)
      .reduce((acc, cur) => acc + (cur.amount || 0), 0);
    const percent = total > 0 ? ((sum / total) * 100).toFixed(1) : 0;

    let fillClass = 'fill-other';
    if (cat.name.includes('เครื่องดื่ม')) fillClass = 'fill-beverage';
    else if (cat.name === 'อาหาร') fillClass = 'fill-food';
    else if (cat.name === 'เบเกอรี่') fillClass = 'fill-bakery';
    else if (cat.name.includes('น้ำมัน')) fillClass = 'fill-fuel';
    else if (cat.name === 'ค่าแรง') fillClass = 'fill-wage';
    else if (cat.name.includes('สาธารณูปโภค')) fillClass = 'fill-rent';

    html += `
      <div class="breakdown-item">
        <div class="breakdown-info">
          <span class="name">${cat.icon} ${cat.name}</span>
          <span class="amount">${formatCurrency(sum)} <span style="font-weight: 400; color: var(--gray-500); font-size: 0.75rem;">(${percent}%)</span></span>
        </div>
        <div class="breakdown-bar-track">
          <div class="breakdown-bar-fill ${fillClass}" style="width: ${percent}%;"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Render Comparison Chart (SVG / HTML Responsive Bars)
function renderBranchComparisonChart() {
  const container = document.getElementById('branchComparisonChartWrap');
  if (!container) return;

  const branches = [
    { name: 'หนองคาย', color: 'var(--nongkhai-color)' },
    { name: 'โคราช', color: 'var(--korat-color)' },
    { name: 'ขอนแก่น', color: 'var(--khonkaen-color)' },
    { name: 'รายจ่ายบริษัท', color: 'var(--company-color)' }
  ];

  let maxVal = 1000;
  const data = branches.map(b => {
    const s = salesList.filter(item => item.date.startsWith(currentMonth) && item.branch === b.name).reduce((acc, c) => acc + (c.total || 0), 0);
    const r = revenueList.filter(item => item.date.startsWith(currentMonth) && item.branch === b.name).reduce((acc, c) => acc + (c.total || 0), 0);
    const e = expenseList.filter(item => item.date.startsWith(currentMonth) && item.branch === b.name).reduce((acc, c) => acc + (c.amount || 0), 0);
    maxVal = Math.max(maxVal, s, r, e);
    return { name: b.name, sales: s, revenue: r, expense: e };
  });

  let html = `
    <div style="display: flex; gap: 1.5rem; justify-content: flex-end; font-size: 0.8rem; margin-bottom: 1rem;">
      <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 12px; height: 12px; background: var(--sales-color); border-radius: 2px;"></span> ยอดขาย</span>
      <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 12px; height: 12px; background: var(--revenue-color); border-radius: 2px;"></span> รายรับ</span>
      <span style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 12px; height: 12px; background: var(--expense-color); border-radius: 2px;"></span> รายจ่าย</span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; align-items: flex-end; min-height: 180px; padding-bottom: 0.5rem; border-bottom: 1px solid var(--gray-300);">
  `;

  data.forEach(item => {
    const sHeight = Math.max(4, (item.sales / maxVal) * 150);
    const rHeight = Math.max(4, (item.revenue / maxVal) * 150);
    const eHeight = Math.max(4, (item.expense / maxVal) * 150);

    html += `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
        <div style="display: flex; gap: 6px; align-items: flex-end; height: 150px;">
          <div title="ยอดขาย: ${formatCurrency(item.sales)}" style="width: 22px; height: ${sHeight}px; background: var(--sales-color); border-radius: 3px 3px 0 0;"></div>
          <div title="รายรับ: ${formatCurrency(item.revenue)}" style="width: 22px; height: ${rHeight}px; background: var(--revenue-color); border-radius: 3px 3px 0 0;"></div>
          <div title="รายจ่าย: ${formatCurrency(item.expense)}" style="width: 22px; height: ${eHeight}px; background: var(--expense-color); border-radius: 3px 3px 0 0;"></div>
        </div>
        <div style="font-size: 0.825rem; font-weight: 600; text-align: center; color: var(--gray-800);">${item.name}</div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// Render Day-by-Day Table for the Month
function renderDailySummaryTable() {
  const tbody = document.getElementById('tableDailySummaryBody');
  const sub = document.getElementById('dailyTableSub');
  if (!tbody) return;

  if (sub) sub.textContent = `แสดงสถิติรายวันประจำเดือน ${formatMonthThai(currentMonth)} (เลือกกรอง: ${activeBranch === 'ALL' ? 'ทุกสาขา' : activeBranch})`;

  // Calculate days in current month
  const parts = currentMonth.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const totalDays = new Date(year, month, 0).getDate();

  let totalMonthSales = 0;
  let totalMonthRev = 0;
  let totalMonthExp = 0;
  let html = '';

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;

    // Filter for this day and branch
    const daySales = salesList
      .filter(s => s.date === dateStr && (activeBranch === 'ALL' || s.branch === activeBranch))
      .reduce((acc, cur) => acc + (cur.total || 0), 0);

    const dayRev = revenueList
      .filter(r => r.date === dateStr && (activeBranch === 'ALL' || r.branch === activeBranch))
      .reduce((acc, cur) => acc + (cur.total || 0), 0);

    const dayExp = expenseList
      .filter(e => e.date === dateStr && (activeBranch === 'ALL' || e.branch === activeBranch))
      .reduce((acc, cur) => acc + (cur.amount || 0), 0);

    const dayProfit = dayRev - dayExp;

    totalMonthSales += daySales;
    totalMonthRev += dayRev;
    totalMonthExp += dayExp;

    if (daySales === 0 && dayRev === 0 && dayExp === 0) {
      continue; // Skip completely empty days to keep table compact & readable
    }

    const profitColor = dayProfit >= 0 ? 'var(--profit-color)' : 'var(--loss-color)';
    const statusBadge = dayProfit >= 0 
      ? `<span class="kpi-badge positive">กำไร</span>` 
      : `<span class="kpi-badge negative">ขาดทุน</span>`;

    html += `
      <tr>
        <td style="font-weight: 500;">${formatDateThai(dateStr)}</td>
        <td style="color: var(--sales-color); font-weight: 600;">${formatCurrency(daySales)}</td>
        <td style="color: var(--revenue-color); font-weight: 600;">${formatCurrency(dayRev)}</td>
        <td style="color: var(--expense-color); font-weight: 600;">${formatCurrency(dayExp)}</td>
        <td style="color: ${profitColor}; font-weight: 700;">${formatCurrency(dayProfit)}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }

  if (!html) {
    html = `<tr><td colspan="6" class="empty-state">ไม่พบข้อมูลรายวันในเดือน ${formatMonthThai(currentMonth)}</td></tr>`;
  }

  tbody.innerHTML = html;

  // Footers
  const monthProfit = totalMonthRev - totalMonthExp;
  document.getElementById('footDailySalesTotal').textContent = formatCurrency(totalMonthSales);
  document.getElementById('footDailyRevenueTotal').textContent = formatCurrency(totalMonthRev);
  document.getElementById('footDailyExpenseTotal').textContent = formatCurrency(totalMonthExp);
  
  const profitFoot = document.getElementById('footDailyProfitTotal');
  profitFoot.textContent = formatCurrency(monthProfit);
  profitFoot.style.color = monthProfit >= 0 ? 'var(--profit-color)' : 'var(--loss-color)';

  document.getElementById('footDailyProfitStatus').innerHTML = monthProfit >= 0 
    ? `<span class="kpi-badge positive">กำไรสุทธิ</span>` 
    : `<span class="kpi-badge negative">ขาดทุนสุทธิ</span>`;
}

// Render Sales Table (Tab 2)
function renderSalesTable() {
  const tbody = document.getElementById('tableSalesBody');
  const countLabel = document.getElementById('salesCountLabel');
  const search = document.getElementById('salesSearchInput')?.value.toLowerCase().trim() || '';
  if (!tbody) return;

  const filtered = salesList.filter(s => {
    const matchMonth = s.date.startsWith(currentMonth);
    const matchBranch = activeBranch === 'ALL' || s.branch === activeBranch;
    const matchSearch = !search || 
      s.branch.toLowerCase().includes(search) || 
      s.recorder.toLowerCase().includes(search) || 
      s.date.includes(search) || 
      (s.note && s.note.toLowerCase().includes(search));
    return matchMonth && matchBranch && matchSearch;
  });

  // Sort descending by date
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (countLabel) countLabel.textContent = `แสดง ${filtered.length} รายการ (เดือน ${formatMonthThai(currentMonth)})`;

  let sumCash = 0, sumTransfer = 0, sumGrab = 0, sumLineman = 0, sumShopee = 0, sumThai = 0, sumTotal = 0;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-state">ไม่พบรายการยอดขายในเงื่อนไขที่เลือก</td></tr>`;
  } else {
    let html = '';
    filtered.forEach(s => {
      sumCash += (s.cash || 0);
      sumTransfer += (s.transfer || 0);
      sumGrab += (s.grab || 0);
      sumLineman += (s.lineman || 0);
      sumShopee += (s.shopee || 0);
      sumThai += (s.thai || 0);
      sumTotal += (s.total || 0);

      let branchBadgeClass = 'badge-nongkhai';
      if (s.branch === 'โคราช') branchBadgeClass = 'badge-korat';
      if (s.branch === 'ขอนแก่น') branchBadgeClass = 'badge-khonkaen';

      html += `
        <tr>
          <td style="white-space: nowrap;">${formatDateThai(s.date)}</td>
          <td><span class="branch-badge ${branchBadgeClass}">📍 ${s.branch}</span></td>
          <td style="text-align: right;">${formatNumber(s.cash)}</td>
          <td style="text-align: right;">${formatNumber(s.transfer)}</td>
          <td style="text-align: right;">${formatNumber(s.grab)}</td>
          <td style="text-align: right;">${formatNumber(s.lineman)}</td>
          <td style="text-align: right;">${formatNumber(s.shopee)}</td>
          <td style="text-align: right;">${formatNumber(s.thai)}</td>
          <td style="text-align: right; font-weight: 700; color: var(--sales-color);">${formatCurrency(s.total)}</td>
          <td>
            <div>${s.recorder}</div>
            ${s.note ? `<span style="font-size: 0.725rem; color: var(--gray-500);">${s.note}</span>` : ''}
          </td>
          <td class="no-print" style="text-align: center; white-space: nowrap;">
            <button class="btn btn-outline btn-sm" onclick="editSalesRecord('${s.id}')" title="แก้ไข">✏️</button>
            <button class="btn btn-danger-outline btn-sm" onclick="deleteSalesRecord('${s.id}')" title="ลบ">🗑️</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  // Footer Totals
  document.getElementById('salesSumCash').textContent = formatNumber(sumCash);
  document.getElementById('salesSumTransfer').textContent = formatNumber(sumTransfer);
  document.getElementById('salesSumGrab').textContent = formatNumber(sumGrab);
  document.getElementById('salesSumLineman').textContent = formatNumber(sumLineman);
  document.getElementById('salesSumShopee').textContent = formatNumber(sumShopee);
  document.getElementById('salesSumThai').textContent = formatNumber(sumThai);
  document.getElementById('salesSumTotal').textContent = formatCurrency(sumTotal);
}

// Render Revenue Table (Tab 3)
function renderRevenueTable() {
  const tbody = document.getElementById('tableRevenueBody');
  const countLabel = document.getElementById('revCountLabel');
  const search = document.getElementById('revSearchInput')?.value.toLowerCase().trim() || '';
  if (!tbody) return;

  const filtered = revenueList.filter(r => {
    const matchMonth = r.date.startsWith(currentMonth);
    const matchBranch = activeBranch === 'ALL' || r.branch === activeBranch;
    const matchSearch = !search || 
      r.branch.toLowerCase().includes(search) || 
      r.recorder.toLowerCase().includes(search) || 
      r.date.includes(search) || 
      (r.note && r.note.toLowerCase().includes(search));
    return matchMonth && matchBranch && matchSearch;
  });

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (countLabel) countLabel.textContent = `แสดง ${filtered.length} รายการ (เดือน ${formatMonthThai(currentMonth)})`;

  let sumCash = 0, sumTransfer = 0, sumGrab = 0, sumLineman = 0, sumShopee = 0, sumThai = 0, sumTotal = 0;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-state">ไม่พบรายการรายรับในเงื่อนไขที่เลือก</td></tr>`;
  } else {
    let html = '';
    filtered.forEach(r => {
      sumCash += (r.cash || 0);
      sumTransfer += (r.transfer || 0);
      sumGrab += (r.grab || 0);
      sumLineman += (r.lineman || 0);
      sumShopee += (r.shopee || 0);
      sumThai += (r.thai || 0);
      sumTotal += (r.total || 0);

      let branchBadgeClass = 'badge-nongkhai';
      if (r.branch === 'โคราช') branchBadgeClass = 'badge-korat';
      if (r.branch === 'ขอนแก่น') branchBadgeClass = 'badge-khonkaen';

      html += `
        <tr>
          <td style="white-space: nowrap;">${formatDateThai(r.date)}</td>
          <td><span class="branch-badge ${branchBadgeClass}">📍 ${r.branch}</span></td>
          <td style="text-align: right;">${formatNumber(r.cash)}</td>
          <td style="text-align: right;">${formatNumber(r.transfer)}</td>
          <td style="text-align: right;">${formatNumber(r.grab)}</td>
          <td style="text-align: right;">${formatNumber(r.lineman)}</td>
          <td style="text-align: right;">${formatNumber(r.shopee)}</td>
          <td style="text-align: right;">${formatNumber(r.thai)}</td>
          <td style="text-align: right; font-weight: 700; color: var(--revenue-color);">${formatCurrency(r.total)}</td>
          <td>
            <div>${r.recorder}</div>
            ${r.note ? `<span style="font-size: 0.725rem; color: var(--gray-500);">${r.note}</span>` : ''}
          </td>
          <td class="no-print" style="text-align: center; white-space: nowrap;">
            <button class="btn btn-outline btn-sm" onclick="editRevenueRecord('${r.id}')" title="แก้ไข">✏️</button>
            <button class="btn btn-danger-outline btn-sm" onclick="deleteRevenueRecord('${r.id}')" title="ลบ">🗑️</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  document.getElementById('revSumCash').textContent = formatNumber(sumCash);
  document.getElementById('revSumTransfer').textContent = formatNumber(sumTransfer);
  document.getElementById('revSumGrab').textContent = formatNumber(sumGrab);
  document.getElementById('revSumLineman').textContent = formatNumber(sumLineman);
  document.getElementById('revSumShopee').textContent = formatNumber(sumShopee);
  document.getElementById('revSumThai').textContent = formatNumber(sumThai);
  document.getElementById('revSumTotal').textContent = formatCurrency(sumTotal);
}

// Render Expenses Table (Tab 4)
function renderExpenseTable() {
  const tbody = document.getElementById('tableExpensesBody');
  const countLabel = document.getElementById('expCountLabel');
  const search = document.getElementById('expSearchInput')?.value.toLowerCase().trim() || '';
  const catFilter = document.getElementById('expCategoryFilter')?.value || 'ALL';
  if (!tbody) return;

  const filtered = expenseList.filter(e => {
    const matchMonth = e.date.startsWith(currentMonth);
    const matchBranch = activeBranch === 'ALL' || e.branch === activeBranch;
    const matchCat = catFilter === 'ALL' || e.category === catFilter;
    const matchSearch = !search || 
      e.branch.toLowerCase().includes(search) || 
      e.desc.toLowerCase().includes(search) || 
      e.recorder.toLowerCase().includes(search) || 
      (e.paidBy && e.paidBy.toLowerCase().includes(search)) ||
      (e.receiptNo && e.receiptNo.toLowerCase().includes(search));
    return matchMonth && matchBranch && matchCat && matchSearch;
  });

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (countLabel) countLabel.textContent = `แสดง ${filtered.length} รายการ (เดือน ${formatMonthThai(currentMonth)})`;

  let sumTotal = 0;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">ไม่พบรายการรายจ่ายในเงื่อนไขที่เลือก</td></tr>`;
  } else {
    let html = '';
    filtered.forEach(e => {
      sumTotal += (e.amount || 0);

      let branchBadgeClass = 'badge-nongkhai';
      if (e.branch === 'โคราช') branchBadgeClass = 'badge-korat';
      if (e.branch === 'ขอนแก่น') branchBadgeClass = 'badge-khonkaen';
      if (e.branch === 'รายจ่ายบริษัท') branchBadgeClass = 'badge-company';

      let catClass = 'cat-other';
      if (e.category.includes('เครื่องดื่ม')) catClass = 'cat-beverage';
      else if (e.category === 'อาหาร') catClass = 'cat-food';
      else if (e.category === 'เบเกอรี่') catClass = 'cat-bakery';
      else if (e.category.includes('น้ำมัน')) catClass = 'cat-fuel';
      else if (e.category === 'ค่าแรง') catClass = 'cat-wage';
      else if (e.category.includes('สาธารณูปโภค')) catClass = 'cat-rent';

      html += `
        <tr>
          <td style="white-space: nowrap;">${formatDateThai(e.date)}</td>
          <td><span class="branch-badge ${branchBadgeClass}">${e.branch === 'รายจ่ายบริษัท' ? '🏢' : '📍'} ${e.branch}</span></td>
          <td><span class="category-badge ${catClass}">${e.category}</span></td>
          <td>
            <div style="font-weight: 500;">${e.desc}</div>
            ${e.receiptNo ? `<span style="font-size: 0.725rem; color: var(--gray-500);">บิล: ${e.receiptNo}</span>` : ''}
          </td>
          <td style="text-align: right; font-weight: 700; color: var(--expense-color);">${formatCurrency(e.amount)}</td>
          <td>
            <div style="font-size: 0.8rem;">${e.paymentMethod || '-'}</div>
            ${e.paidBy ? `<div style="font-size: 0.725rem; color: #7c3aed;">ผู้จ่าย: ${e.paidBy}</div>` : ''}
          </td>
          <td>${e.recorder}</td>
          <td class="no-print" style="text-align: center; white-space: nowrap;">
            <button class="btn btn-outline btn-sm" onclick="editExpenseRecord('${e.id}')" title="แก้ไข">✏️</button>
            <button class="btn btn-danger-outline btn-sm" onclick="deleteExpenseRecord('${e.id}')" title="ลบ">🗑️</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  document.getElementById('expSumTotal').textContent = formatCurrency(sumTotal);
}

// ==============================================================
// RENDER DAILY EXPENSE SUMMARY SECTION (TAB 4)
// ==============================================================
function renderDailyExpenseSection() {
  const dateInput = document.getElementById('dailyExpFilterDate');
  const targetDate = activeDailyExpDate || (dateInput && dateInput.value) || new Date().toISOString().slice(0, 10);
  const branch = activeDailyExpBranch || 'ALL';

  if (dateInput && dateInput.value !== targetDate) {
    dateInput.value = targetDate;
  }

  const dateDisplay = document.getElementById('dailyExpDateDisplay');
  if (dateDisplay) {
    dateDisplay.innerHTML = `📅 สรุปประจำวันที่: <strong style="color: var(--gray-800);">${formatDateThai(targetDate)}</strong> (${branch === 'ALL' ? 'รวมทุกสาขา + บริษัท' : branch})`;
  }

  // Filter items for targetDate and branch
  const dayExps = expenseList.filter(e => {
    const matchDate = e.date === targetDate;
    const matchBranch = branch === 'ALL' || e.branch === branch;
    return matchDate && matchBranch;
  });

  const dayTotal = dayExps.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  // 1. Render 4 KPI Cards in #dailyExpKpiGrid
  const kpiGrid = document.getElementById('dailyExpKpiGrid');
  if (kpiGrid) {
    const bevFoodBak = dayExps.filter(e => e.category.includes('เครื่องดื่ม') || e.category === 'อาหาร' || e.category === 'เบเกอรี่').reduce((a, c) => a + (c.amount || 0), 0);
    const wageFuel = dayExps.filter(e => e.category === 'ค่าแรง' || e.category.includes('น้ำมัน')).reduce((a, c) => a + (c.amount || 0), 0);
    const rentOther = dayExps.filter(e => e.category.includes('สาธารณูปโภค') || e.category.includes('อื่นๆ')).reduce((a, c) => a + (c.amount || 0), 0);

    kpiGrid.innerHTML = `
      <div class="kpi-card expense">
        <div class="kpi-header">
          <span class="kpi-title">${branch === 'ALL' ? 'รายจ่ายรวมทุกสาขาประจำวัน' : 'รายจ่ายประจำวัน (' + branch + ')'}</span>
          <div class="kpi-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--expense-color); font-size: 1.45rem;">${formatCurrency(dayTotal)}</div>
        <div class="kpi-subtext"><span>รวมทั้งสิ้น ${dayExps.length} รายการ</span></div>
      </div>

      <div class="kpi-card" style="border-left: 4px solid #ea580c;">
        <div class="kpi-header">
          <span class="kpi-title">ต้นทุนวัตถุดิบรวม</span>
          <div class="kpi-icon" style="background: #ffedd5; color: #c2410c;">🥤</div>
        </div>
        <div class="kpi-value" style="color: #c2410c; font-size: 1.45rem;">${formatCurrency(bevFoodBak)}</div>
        <div class="kpi-subtext"><span>เครื่องดื่ม + อาหาร + เบเกอรี่</span></div>
      </div>

      <div class="kpi-card" style="border-left: 4px solid #7c3aed;">
        <div class="kpi-header">
          <span class="kpi-title">ค่าแรง & น้ำมันเชื้อเพลิง</span>
          <div class="kpi-icon" style="background: #ede9fe; color: #6d28d9;">👥</div>
        </div>
        <div class="kpi-value" style="color: #6d28d9; font-size: 1.45rem;">${formatCurrency(wageFuel)}</div>
        <div class="kpi-subtext"><span>ค่าจ้าง ค่าเดินทางส่งของ</span></div>
      </div>

      <div class="kpi-card" style="border-left: 4px solid #475569;">
        <div class="kpi-header">
          <span class="kpi-title">ค่าเช่าสาธารณูปโภค & อื่นๆ</span>
          <div class="kpi-icon" style="background: #f1f5f9; color: #334155;">🏢</div>
        </div>
        <div class="kpi-value" style="color: #334155; font-size: 1.45rem;">${formatCurrency(rentOther)}</div>
        <div class="kpi-subtext"><span>ค่าเช่า น้ำ ไฟ เบ็ดเตล็ด</span></div>
      </div>
    `;
  }

  // 2. Render 4 Branch Breakdown Mini Cards in #dailyExpBranchBreakdownWrap
  const branchWrap = document.getElementById('dailyExpBranchBreakdownWrap');
  if (branchWrap) {
    const branches = [
      { name: 'หนองคาย', badge: 'badge-nongkhai', icon: '📍' },
      { name: 'โคราช', badge: 'badge-korat', icon: '📍' },
      { name: 'ขอนแก่น', badge: 'badge-khonkaen', icon: '📍' },
      { name: 'รายจ่ายบริษัท', badge: 'badge-company', icon: '🏢' }
    ];

    let bHtml = '<div class="branch-grid" style="margin-bottom: 0;">';
    branches.forEach(b => {
      const bSum = expenseList.filter(e => e.date === targetDate && e.branch === b.name).reduce((acc, c) => acc + (c.amount || 0), 0);
      const isSelected = branch === b.name;
      const borderStyle = isSelected ? 'border: 2px solid var(--primary); box-shadow: var(--shadow-md); background: #eff6ff;' : '';

      bHtml += `
        <div class="branch-summary-card" style="padding: 0.85rem; cursor: pointer; transition: all 0.2s ease; ${borderStyle}" onclick="selectDailyExpenseBranch('${b.name}')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <span class="branch-badge ${b.badge}">${b.icon} ${b.name}</span>
            <span style="font-size: 0.725rem; color: ${isSelected ? 'var(--primary)' : 'var(--gray-400)'}; font-weight: ${isSelected ? '600' : '400'};">${isSelected ? '✓ แสดงอยู่' : 'คลิกแยกดู'}</span>
          </div>
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--expense-color);">${formatCurrency(bSum)}</div>
        </div>
      `;
    });
    bHtml += '</div>';
    branchWrap.innerHTML = bHtml;
  }

  // 3. Render Categories Breakdown
  const catList = document.getElementById('dailyExpCategoryList');
  const catLabel = document.getElementById('dailyExpCategoryTotalLabel');
  if (catLabel) catLabel.textContent = `ยอดรวม ${formatCurrency(dayTotal)}`;

  if (catList) {
    if (dayTotal <= 0) {
      catList.innerHTML = `<div class="empty-state" style="padding: 1.5rem;"><p class="empty-state-text">ไม่มีรายการรายจ่ายในวันที่เลือก (${branch === 'ALL' ? 'ทุกสาขา' : branch})</p></div>`;
    } else {
      let cHtml = '';
      EXPENSE_CATEGORIES.forEach(cat => {
        const sum = dayExps.filter(e => e.category === cat.name).reduce((acc, cur) => acc + (cur.amount || 0), 0);
        const percent = dayTotal > 0 ? ((sum / dayTotal) * 100).toFixed(1) : 0;

        let fillClass = 'fill-other';
        if (cat.name.includes('เครื่องดื่ม')) fillClass = 'fill-beverage';
        else if (cat.name === 'อาหาร') fillClass = 'fill-food';
        else if (cat.name === 'เบเกอรี่') fillClass = 'fill-bakery';
        else if (cat.name.includes('น้ำมัน')) fillClass = 'fill-fuel';
        else if (cat.name === 'ค่าแรง') fillClass = 'fill-wage';
        else if (cat.name.includes('สาธารณูปโภค')) fillClass = 'fill-rent';

        cHtml += `
          <div class="breakdown-item">
            <div class="breakdown-info">
              <span class="name">${cat.icon} ${cat.name}</span>
              <span class="amount">${formatCurrency(sum)} <span style="font-weight: 400; color: var(--gray-500); font-size: 0.75rem;">(${percent}%)</span></span>
            </div>
            <div class="breakdown-bar-track">
              <div class="breakdown-bar-fill ${fillClass}" style="width: ${percent}%;"></div>
            </div>
          </div>
        `;
      });
      catList.innerHTML = cHtml;
    }
  }

  // 4. Render Itemized Table for that Day
  const itemsList = document.getElementById('dailyExpItemsList');
  const countLabel = document.getElementById('dailyExpItemCountLabel');
  if (countLabel) countLabel.textContent = `${dayExps.length} รายการ`;

  if (itemsList) {
    if (dayExps.length === 0) {
      itemsList.innerHTML = `<div class="empty-state" style="padding: 2rem;"><p class="empty-state-text">ไม่พบรายการรายจ่ายในวันที่ ${formatDateThai(targetDate)}</p></div>`;
    } else {
      let iHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
      dayExps.forEach((item) => {
        let bBadge = 'badge-nongkhai';
        if (item.branch === 'โคราช') bBadge = 'badge-korat';
        if (item.branch === 'ขอนแก่น') bBadge = 'badge-khonkaen';
        if (item.branch === 'รายจ่ายบริษัท') bBadge = 'badge-company';

        iHtml += `
          <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 0.65rem 0.85rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.35rem; margin-bottom: 2px;">
                <span class="branch-badge ${bBadge}" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">${item.branch}</span>
                <span style="font-size: 0.825rem; font-weight: 600; color: var(--gray-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.desc}</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--gray-500);">
                <span>หมวด: ${item.category}</span>
                ${item.paidBy ? ` • <span style="color: #7c3aed;">ผู้จ่าย: ${item.paidBy}</span>` : ''}
                ${item.recorder ? ` • บันทึก: ${item.recorder}` : ''}
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-weight: 700; color: var(--expense-color); font-size: 0.95rem;">${formatCurrency(item.amount)}</span>
              <div class="no-print" style="display: flex; gap: 0.25rem;">
                <button class="btn btn-outline btn-sm" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" onclick="editExpenseRecord('${item.id}')" title="แก้ไข">✏️</button>
                <button class="btn btn-danger-outline btn-sm" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" onclick="deleteExpenseRecord('${item.id}')" title="ลบ">🗑️</button>
              </div>
            </div>
          </div>
        `;
      });
      iHtml += '</div>';
      itemsList.innerHTML = iHtml;
    }
  }
}

window.selectDailyExpenseBranch = function(branchName) {
  activeDailyExpBranch = branchName;
  document.querySelectorAll('#dailyExpBranchPillsWrap .branch-pill-btn').forEach(btn => {
    if (btn.getAttribute('data-daily-branch') === branchName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderDailyExpenseSection();
};

// Render Reports (Tab 5)
function renderReports() {
  const periodTitle = document.getElementById('reportPeriodTitle');
  if (periodTitle) {
    periodTitle.textContent = `ประจำเดือน: ${formatMonthThai(currentMonth)} (สาขา: หนองคาย, โคราช, ขอนแก่น, รายจ่ายบริษัท)`;
  }

  // Print Meta info
  const printMeta = document.getElementById('printMetaInfo');
  if (printMeta) {
    const now = new Date();
    printMeta.textContent = `ประจำเดือน: ${formatMonthThai(currentMonth)} | พิมพ์เมื่อ: ${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH')}`;
  }

  // 1. Branch Performance Matrix
  const perfBody = document.getElementById('reportBodyBranchPerformance');
  if (perfBody) {
    const branches = [
      { name: 'หนองคาย', isCompany: false },
      { name: 'โคราช', isCompany: false },
      { name: 'ขอนแก่น', isCompany: false },
      { name: 'รายจ่ายบริษัท', isCompany: true }
    ];

    let grandSales = 0, grandRev = 0, grandExp = 0;
    let html = '';

    branches.forEach(b => {
      const s = b.isCompany ? 0 : salesList.filter(item => item.date.startsWith(currentMonth) && item.branch === b.name).reduce((acc, c) => acc + (c.total || 0), 0);
      const r = b.isCompany ? 0 : revenueList.filter(item => item.date.startsWith(currentMonth) && item.branch === b.name).reduce((acc, c) => acc + (c.total || 0), 0);
      const e = expenseList.filter(item => item.date.startsWith(currentMonth) && item.branch === b.name).reduce((acc, c) => acc + (c.amount || 0), 0);
      const p = r - e;
      const margin = r > 0 ? ((p / r) * 100).toFixed(1) + '%' : '-';

      grandSales += s;
      grandRev += r;
      grandExp += e;

      html += `
        <tr>
          <td style="font-weight: 600;">${b.isCompany ? '🏢 ' : '📍 สาขา'}${b.name}</td>
          <td style="text-align: right; color: var(--sales-color); font-weight: 600;">${b.isCompany ? '-' : formatCurrency(s)}</td>
          <td style="text-align: right; color: var(--revenue-color); font-weight: 600;">${b.isCompany ? '-' : formatCurrency(r)}</td>
          <td style="text-align: right; color: var(--expense-color); font-weight: 600;">${formatCurrency(e)}</td>
          <td style="text-align: right; font-weight: 700; color: ${p >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'};">
            ${b.isCompany ? '-' + formatCurrency(e) : formatCurrency(p)}
          </td>
          <td style="text-align: right;">${margin}</td>
        </tr>
      `;
    });

    const grandProfit = grandRev - grandExp;
    const grandMargin = grandRev > 0 ? ((grandProfit / grandRev) * 100).toFixed(1) + '%' : '-';

    html += `
      <tr style="font-weight: 700; background: var(--gray-100);">
        <td>รวมทั้งหมด (3 สาขา + บริษัท):</td>
        <td style="text-align: right; color: var(--sales-color);">${formatCurrency(grandSales)}</td>
        <td style="text-align: right; color: var(--revenue-color);">${formatCurrency(grandRev)}</td>
        <td style="text-align: right; color: var(--expense-color);">${formatCurrency(grandExp)}</td>
        <td style="text-align: right; color: ${grandProfit >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'};">${formatCurrency(grandProfit)}</td>
        <td style="text-align: right;">${grandMargin}</td>
      </tr>
    `;

    perfBody.innerHTML = html;
  }

  // 2. Sales Channels Breakdown Matrix
  const salesChanBody = document.getElementById('reportBodySalesChannels');
  if (salesChanBody) {
    const branches = ['หนองคาย', 'โคราช', 'ขอนแก่น'];
    let totals = { cash: 0, transfer: 0, grab: 0, lineman: 0, shopee: 0, thai: 0, grand: 0 };
    let html = '';

    branches.forEach(b => {
      const bItems = salesList.filter(s => s.date.startsWith(currentMonth) && s.branch === b);
      const c = bItems.reduce((acc, cur) => acc + (cur.cash || 0), 0);
      const t = bItems.reduce((acc, cur) => acc + (cur.transfer || 0), 0);
      const g = bItems.reduce((acc, cur) => acc + (cur.grab || 0), 0);
      const l = bItems.reduce((acc, cur) => acc + (cur.lineman || 0), 0);
      const sh = bItems.reduce((acc, cur) => acc + (cur.shopee || 0), 0);
      const th = bItems.reduce((acc, cur) => acc + (cur.thai || 0), 0);
      const bTotal = c + t + g + l + sh + th;

      totals.cash += c; totals.transfer += t; totals.grab += g; totals.lineman += l; totals.shopee += sh; totals.thai += th; totals.grand += bTotal;

      html += `
        <tr>
          <td style="font-weight: 600;">📍 สาขา${b}</td>
          <td style="text-align: right;">${formatNumber(c)}</td>
          <td style="text-align: right;">${formatNumber(t)}</td>
          <td style="text-align: right;">${formatNumber(g)}</td>
          <td style="text-align: right;">${formatNumber(l)}</td>
          <td style="text-align: right;">${formatNumber(sh)}</td>
          <td style="text-align: right;">${formatNumber(th)}</td>
          <td style="text-align: right; font-weight: 700; color: var(--sales-color);">${formatCurrency(bTotal)}</td>
        </tr>
      `;
    });

    html += `
      <tr style="font-weight: 700; background: var(--gray-100);">
        <td>รวมยอดขาย 3 สาขา:</td>
        <td style="text-align: right;">${formatNumber(totals.cash)}</td>
        <td style="text-align: right;">${formatNumber(totals.transfer)}</td>
        <td style="text-align: right;">${formatNumber(totals.grab)}</td>
        <td style="text-align: right;">${formatNumber(totals.lineman)}</td>
        <td style="text-align: right;">${formatNumber(totals.shopee)}</td>
        <td style="text-align: right;">${formatNumber(totals.thai)}</td>
        <td style="text-align: right; color: var(--sales-color);">${formatCurrency(totals.grand)}</td>
      </tr>
    `;

    salesChanBody.innerHTML = html;
  }

  // 3. Expense Categories Breakdown Matrix
  const expCatBody = document.getElementById('reportBodyExpenseCategories');
  if (expCatBody) {
    const branches = ['หนองคาย', 'โคราช', 'ขอนแก่น', 'รายจ่ายบริษัท'];
    let totals = { bev: 0, food: 0, bak: 0, fuel: 0, wage: 0, rent: 0, other: 0, grand: 0 };
    let html = '';

    branches.forEach(b => {
      const bItems = expenseList.filter(e => e.date.startsWith(currentMonth) && e.branch === b);
      const bev = bItems.filter(e => e.category.includes('เครื่องดื่ม')).reduce((acc, c) => acc + (c.amount || 0), 0);
      const food = bItems.filter(e => e.category === 'อาหาร').reduce((acc, c) => acc + (c.amount || 0), 0);
      const bak = bItems.filter(e => e.category === 'เบเกอรี่').reduce((acc, c) => acc + (c.amount || 0), 0);
      const fuel = bItems.filter(e => e.category.includes('น้ำมัน')).reduce((acc, c) => acc + (c.amount || 0), 0);
      const wage = bItems.filter(e => e.category === 'ค่าแรง').reduce((acc, c) => acc + (c.amount || 0), 0);
      const rent = bItems.filter(e => e.category.includes('สาธารณูปโภค')).reduce((acc, c) => acc + (c.amount || 0), 0);
      const other = bItems.filter(e => e.category.includes('อื่นๆ')).reduce((acc, c) => acc + (c.amount || 0), 0);
      const bTotal = bev + food + bak + fuel + wage + rent + other;

      totals.bev += bev; totals.food += food; totals.bak += bak; totals.fuel += fuel; totals.wage += wage; totals.rent += rent; totals.other += other; totals.grand += bTotal;

      html += `
        <tr>
          <td style="font-weight: 600;">${b === 'รายจ่ายบริษัท' ? '🏢 ' : '📍 สาขา'}${b}</td>
          <td style="text-align: right;">${formatNumber(bev)}</td>
          <td style="text-align: right;">${formatNumber(food)}</td>
          <td style="text-align: right;">${formatNumber(bak)}</td>
          <td style="text-align: right;">${formatNumber(fuel)}</td>
          <td style="text-align: right;">${formatNumber(wage)}</td>
          <td style="text-align: right;">${formatNumber(rent)}</td>
          <td style="text-align: right;">${formatNumber(other)}</td>
          <td style="text-align: right; font-weight: 700; color: var(--expense-color);">${formatCurrency(bTotal)}</td>
        </tr>
      `;
    });

    html += `
      <tr style="font-weight: 700; background: var(--gray-100);">
        <td>รวมรายจ่ายทั้งหมด:</td>
        <td style="text-align: right;">${formatNumber(totals.bev)}</td>
        <td style="text-align: right;">${formatNumber(totals.food)}</td>
        <td style="text-align: right;">${formatNumber(totals.bak)}</td>
        <td style="text-align: right;">${formatNumber(totals.fuel)}</td>
        <td style="text-align: right;">${formatNumber(totals.wage)}</td>
        <td style="text-align: right;">${formatNumber(totals.rent)}</td>
        <td style="text-align: right;">${formatNumber(totals.other)}</td>
        <td style="text-align: right; color: var(--expense-color);">${formatCurrency(totals.grand)}</td>
      </tr>
    `;

    expCatBody.innerHTML = html;
  }
}

// ==============================================================
// CSV EXPORT LOGIC (UTF-8 with BOM for Perfect Thai Excel Support)
// ==============================================================

function downloadCSV(csvContent, filename) {
  // \uFEFF ensures UTF-8 BOM so Excel opens Thai correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportSalesCSV() {
  const filtered = salesList.filter(s => s.date.startsWith(currentMonth));
  if (filtered.length === 0) {
    showToast('ไม่พบข้อมูลยอดขายประจำเดือนนี้ที่จะส่งออก', 'error');
    return;
  }

  let csv = 'วันที่,สาขา,ยอดขายเงินสด,ยอดขายเงินโอน,ยอดขายแกรป,ยอดขายไลน์แมน,ยอดขายช็อปปี้ฟู้ด,ยอดขายไทยช่วยไทย,ยอดขายรวม,ผู้บันทึก,หมายเหตุ\n';
  filtered.forEach(s => {
    csv += `"${s.date}","${s.branch}",${s.cash || 0},${s.transfer || 0},${s.grab || 0},${s.lineman || 0},${s.shopee || 0},${s.thai || 0},${s.total || 0},"${(s.recorder || '').replace(/"/g, '""')}","${(s.note || '').replace(/"/g, '""')}"\n`;
  });

  downloadCSV(csv, `ยอดขาย3สาขา_${currentMonth}.csv`);
  showToast('ส่งออกไฟล์ Excel ยอดขายเรียบร้อย', 'success');
}

function exportRevenueCSV() {
  const filtered = revenueList.filter(r => r.date.startsWith(currentMonth));
  if (filtered.length === 0) {
    showToast('ไม่พบข้อมูลรายรับประจำเดือนนี้ที่จะส่งออก', 'error');
    return;
  }

  let csv = 'วันที่,สาขา,รายรับเงินสด,รายรับเงินโอน,รายรับแกรป,รายรับไลน์แมน,รายรับช็อปปี้ฟู้ด,รายรับไทยช่วยไทย,รายรับรวม,ผู้บันทึก,หมายเหตุ\n';
  filtered.forEach(r => {
    csv += `"${r.date}","${r.branch}",${r.cash || 0},${r.transfer || 0},${r.grab || 0},${r.lineman || 0},${r.shopee || 0},${r.thai || 0},${r.total || 0},"${(r.recorder || '').replace(/"/g, '""')}","${(r.note || '').replace(/"/g, '""')}"\n`;
  });

  downloadCSV(csv, `รายรับ3สาขา_${currentMonth}.csv`);
  showToast('ส่งออกไฟล์ Excel รายรับเรียบร้อย', 'success');
}

function exportExpensesCSV() {
  const filtered = expenseList.filter(e => e.date.startsWith(currentMonth));
  if (filtered.length === 0) {
    showToast('ไม่พบข้อมูลรายจ่ายประจำเดือนนี้ที่จะส่งออก', 'error');
    return;
  }

  let csv = 'วันที่,สาขา/หน่วยงาน,หมวดหมู่,รายละเอียดรายการ,จำนวนเงิน,ประเภทเงิน/แหล่งที่มา,ผู้ชำระเงิน,ผู้บันทึก,เลขที่บิล\n';
  filtered.forEach(e => {
    csv += `"${e.date}","${e.branch}","${e.category}","${(e.desc || '').replace(/"/g, '""')}",${e.amount || 0},"${e.paymentMethod || ''}","${(e.paidBy || '').replace(/"/g, '""')}","${(e.recorder || '').replace(/"/g, '""')}","${(e.receiptNo || '').replace(/"/g, '""')}"\n`;
  });

  downloadCSV(csv, `รายจ่าย3สาขาและบริษัท_${currentMonth}.csv`);
  showToast('ส่งออกไฟล์ Excel รายจ่ายเรียบร้อย', 'success');
}

function exportDailySummaryCSV() {
  const parts = currentMonth.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const totalDays = new Date(year, month, 0).getDate();

  let csv = 'วันที่,ยอดขายรวม,รายรับรวม,รายจ่ายรวม,กำไรสุทธิ,สถานะ\n';
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
    const s = salesList.filter(item => item.date === dateStr).reduce((acc, c) => acc + (c.total || 0), 0);
    const r = revenueList.filter(item => item.date === dateStr).reduce((acc, c) => acc + (c.total || 0), 0);
    const e = expenseList.filter(item => item.date === dateStr).reduce((acc, c) => acc + (c.amount || 0), 0);
    const p = r - e;
    csv += `"${dateStr}",${s},${r},${e},${p},"${p >= 0 ? 'กำไร' : 'ขาดทุน'}"\n`;
  }

  downloadCSV(csv, `สรุปรายวัน_${currentMonth}.csv`);
  showToast('ส่งออกไฟล์ Excel สรุปรายวันเรียบร้อย', 'success');
}

function exportFullMonthlyCSV() {
  let csv = `รายงานสรุปภาพรวมงบการเงิน 3 สาขา และรายจ่ายบริษัท ประจำเดือน ${formatMonthThai(currentMonth)}\n\n`;
  
  csv += '1. สรุปผลประกอบการแยกตามสาขา\n';
  csv += 'สาขา,ยอดขายรวม,รายรับรวม,รายจ่ายรวม,กำไรสุทธิ\n';
  ['หนองคาย', 'โคราช', 'ขอนแก่น', 'รายจ่ายบริษัท'].forEach(b => {
    const s = b === 'รายจ่ายบริษัท' ? 0 : salesList.filter(item => item.date.startsWith(currentMonth) && item.branch === b).reduce((acc, c) => acc + (c.total || 0), 0);
    const r = b === 'รายจ่ายบริษัท' ? 0 : revenueList.filter(item => item.date.startsWith(currentMonth) && item.branch === b).reduce((acc, c) => acc + (c.total || 0), 0);
    const e = expenseList.filter(item => item.date.startsWith(currentMonth) && item.branch === b).reduce((acc, c) => acc + (c.amount || 0), 0);
    const p = r - e;
    csv += `"${b}",${s},${r},${e},${p}\n`;
  });

  csv += '\n2. สรุปยอดขาย 6 ช่องทาง\n';
  csv += 'สาขา,เงินสด,เงินโอน,Grab,LINE MAN,ShopeeFood,ไทยช่วยไทย,ยอดรวม\n';
  ['หนองคาย', 'โคราช', 'ขอนแก่น'].forEach(b => {
    const bItems = salesList.filter(s => s.date.startsWith(currentMonth) && s.branch === b);
    const c = bItems.reduce((acc, cur) => acc + (cur.cash || 0), 0);
    const t = bItems.reduce((acc, cur) => acc + (cur.transfer || 0), 0);
    const g = bItems.reduce((acc, cur) => acc + (cur.grab || 0), 0);
    const l = bItems.reduce((acc, cur) => acc + (cur.lineman || 0), 0);
    const sh = bItems.reduce((acc, cur) => acc + (cur.shopee || 0), 0);
    const th = bItems.reduce((acc, cur) => acc + (cur.thai || 0), 0);
    const total = c + t + g + l + sh + th;
    csv += `"${b}",${c},${t},${g},${l},${sh},${th},${total}\n`;
  });

  csv += '\n3. สรุปรายจ่ายตามหมวดหมู่\n';
  csv += 'สาขา,วัตถุดิบเครื่องดื่ม,อาหาร,เบเกอรี่,น้ำมันเดินทาง,ค่าแรง,ค่าเช่าสาธารณูปโภค,อื่นๆ,รวมรายจ่าย\n';
  ['หนองคาย', 'โคราช', 'ขอนแก่น', 'รายจ่ายบริษัท'].forEach(b => {
    const bItems = expenseList.filter(e => e.date.startsWith(currentMonth) && e.branch === b);
    const bev = bItems.filter(e => e.category.includes('เครื่องดื่ม')).reduce((acc, c) => acc + (c.amount || 0), 0);
    const food = bItems.filter(e => e.category === 'อาหาร').reduce((acc, c) => acc + (c.amount || 0), 0);
    const bak = bItems.filter(e => e.category === 'เบเกอรี่').reduce((acc, c) => acc + (c.amount || 0), 0);
    const fuel = bItems.filter(e => e.category.includes('น้ำมัน')).reduce((acc, c) => acc + (c.amount || 0), 0);
    const wage = bItems.filter(e => e.category === 'ค่าแรง').reduce((acc, c) => acc + (c.amount || 0), 0);
    const rent = bItems.filter(e => e.category.includes('สาธารณูปโภค')).reduce((acc, c) => acc + (c.amount || 0), 0);
    const other = bItems.filter(e => e.category.includes('อื่นๆ')).reduce((acc, c) => acc + (c.amount || 0), 0);
    const bTotal = bev + food + bak + fuel + wage + rent + other;
    csv += `"${b}",${bev},${food},${bak},${fuel},${wage},${rent},${other},${bTotal}\n`;
  });

  downloadCSV(csv, `รายงานงบการเงินรายเดือน_${currentMonth}.csv`);
  showToast('ส่งออกรายงานงบการเงินรายเดือนฉบับเต็มเรียบร้อย', 'success');
}

// JSON Backup & Restore
function exportJSONBackup() {
  const backup = {
    appName: 'MultiBranch_Sales_Revenue_Expense_System',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    sales: salesList,
    revenue: revenueList,
    expenses: expenseList
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_data_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a);
  showToast('ดาวน์โหลดไฟล์สำรองข้อมูล JSON เรียบร้อย', 'success');
}

function importJSONBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data && Array.isArray(data.sales) && Array.isArray(data.revenue) && Array.isArray(data.expenses)) {
        salesList = data.sales;
        revenueList = data.revenue;
        expenseList = data.expenses;
        saveData();
        renderAll();
        showToast('นำเข้าข้อมูลจากไฟล์สำรองสำเร็จ!', 'success');
      } else {
        showToast('โครงสร้างไฟล์สำรองไม่ถูกต้อง', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

// Toast Alert
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠️'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==============================================================
// RICH DEMO DATA GENERATOR
// ==============================================================
function generateDemoData() {
  salesList = [];
  revenueList = [];
  expenseList = [];

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const daysInMonth = 28;

  const branches = ['หนองคาย', 'โคราช', 'ขอนแก่น'];

  // 1. Generate Daily Sales & Revenue
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dayStr}`;

    branches.forEach((branch, bIdx) => {
      // Base variations per branch
      const multiplier = branch === 'โคราช' ? 1.25 : (branch === 'ขอนแก่น' ? 1.4 : 1.0);
      const isWeekend = (d % 7 === 0 || d % 7 === 6);
      const weekendBonus = isWeekend ? 1.4 : 1.0;

      const cash = Math.round((3500 + Math.random() * 2200) * multiplier * weekendBonus);
      const transfer = Math.round((4200 + Math.random() * 3000) * multiplier * weekendBonus);
      const grab = Math.round((1800 + Math.random() * 1500) * multiplier * weekendBonus);
      const lineman = Math.round((2100 + Math.random() * 1600) * multiplier * weekendBonus);
      const shopee = Math.round((1100 + Math.random() * 900) * multiplier * weekendBonus);
      const thai = Math.round((800 + Math.random() * 700) * multiplier * weekendBonus);
      const totalSales = cash + transfer + grab + lineman + shopee + thai;

      salesList.push({
        id: `sal_${d}_${bIdx}`,
        date: dateStr,
        branch,
        cash,
        transfer,
        grab,
        lineman,
        shopee,
        thai,
        total: totalSales,
        recorder: branch === 'หนองคาย' ? 'สมศรี (แคชเชียร์)' : (branch === 'โคราช' ? 'วิภาดา (หน้าร้าน)' : 'ณัชชา (แคชเชียร์)'),
        note: isWeekend ? 'วันหยุด ลูกค้าหน้าร้านหนาแน่น' : '',
        createdAt: new Date().toISOString()
      });

      // Net revenue (Delivery apps deduct GP fee around ~25-30% on settlement, cash/transfer 100%)
      const revCash = cash;
      const revTransfer = transfer;
      const revGrab = Math.round(grab * 0.72);
      const revLineman = Math.round(lineman * 0.72);
      const revShopee = Math.round(shopee * 0.72);
      const revThai = Math.round(thai * 0.95);
      const totalRev = revCash + revTransfer + revGrab + revLineman + revShopee + revThai;

      revenueList.push({
        id: `rev_${d}_${bIdx}`,
        date: dateStr,
        branch,
        cash: revCash,
        transfer: revTransfer,
        grab: revGrab,
        lineman: revLineman,
        shopee: revShopee,
        thai: revThai,
        total: totalRev,
        recorder: branch === 'หนองคาย' ? 'สมหมาย (ผจก.)' : (branch === 'โคราช' ? 'ธนพล (ผจก.)' : 'กานดา (บัญชี)'),
        note: 'หัก GP เดลิเวอรี่ตามรอบโอนเงินจริง',
        createdAt: new Date().toISOString()
      });
    });
  }

  // 2. Generate Expenses (3 Branches + รายจ่ายบริษัท)
  // Raw materials (Beverage, Food, Bakery)
  branches.forEach((branch, bIdx) => {
    expenseList.push(
      {
        id: `exp_bev_${bIdx}_1`,
        date: `${yyyy}-${mm}-03`,
        branch,
        category: 'ต้นทุนวัตถุดิบเครื่องดื่ม',
        desc: 'เมล็ดกาแฟอาราบิก้าคั่วกลาง 20 กก. + ชาเขียวมัทฉะ',
        amount: 8500,
        paymentMethod: 'เงินโอนบัญชีสาขา',
        paidBy: 'บัญชีร้าน',
        recorder: 'ผู้จัดการสาขา',
        receiptNo: 'INV-CF-0881'
      },
      {
        id: `exp_bev_${bIdx}_2`,
        date: `${yyyy}-${mm}-15`,
        branch,
        category: 'ต้นทุนวัตถุดิบเครื่องดื่ม',
        desc: 'นมสดพาสเจอร์ไรส์ 40 แกลลอน + ไซรัปคาราเมล',
        amount: 4600,
        paymentMethod: 'เงินในลิ้นชักสาขา',
        paidBy: 'เงินสดประจำสาขา',
        recorder: 'บาริสต้าหัวหน้ากะ',
        receiptNo: 'CSH-9921'
      },
      {
        id: `exp_food_${bIdx}_1`,
        date: `${yyyy}-${mm}-06`,
        branch,
        category: 'อาหาร',
        desc: 'วัตถุดิบสด ไก่สด ผักสลัด ไข่ไก่ เครื่องปรุงรส',
        amount: 5200,
        paymentMethod: 'เงินในลิ้นชักสาขา',
        paidBy: 'เงินสดย่อยสาขา',
        recorder: 'กุ๊กประจำสาขา',
        receiptNo: 'MKT-041'
      },
      {
        id: `exp_food_${bIdx}_2`,
        date: `${yyyy}-${mm}-18`,
        branch,
        category: 'อาหาร',
        desc: 'ซื้อเนื้อหมูสไลด์ ผักสด ตลาดสดยามเช้า',
        amount: 4100,
        paymentMethod: 'เงินในลิ้นชักสาขา',
        paidBy: 'เงินสดย่อยสาขา',
        recorder: 'กุ๊กประจำสาขา',
        receiptNo: 'MKT-089'
      },
      {
        id: `exp_bak_${bIdx}_1`,
        date: `${yyyy}-${mm}-08`,
        branch,
        category: 'เบเกอรี่',
        desc: 'แป้งเค้ก เนยสดแท้ ครัวซองต์แช่แข็ง ช็อกโกแลตนำเข้า',
        amount: 6300,
        paymentMethod: 'เงินโอนบัญชีสาขา',
        paidBy: 'บัญชีร้าน',
        recorder: 'เบเกอรี่เชฟ',
        receiptNo: 'BK-552'
      },
      {
        id: `exp_fuel_${bIdx}_1`,
        date: `${yyyy}-${mm}-12`,
        branch,
        category: 'น้ำมันเชื้อเพลิงการเดินทาง',
        desc: 'เติมน้ำมันรถมอเตอร์ไซค์ส่งของสาขา + วิ่งส่งเอกสาร',
        amount: 850,
        paymentMethod: 'เงินในลิ้นชักสาขา',
        paidBy: 'เงินสดหน้าร้าน',
        recorder: 'พนักงานส่งของ',
        receiptNo: 'PTT-10294'
      },
      {
        id: `exp_wage_${bIdx}_1`,
        date: `${yyyy}-${mm}-25`,
        branch,
        category: 'ค่าแรง',
        desc: 'จ่ายเงินเดือนและค่าแรงพนักงานหน้าร้าน + โอที ประจำงวด',
        amount: 32000,
        paymentMethod: 'โอนจากบัญชีบริษัทส่วนกลาง',
        paidBy: 'บัญชีส่วนกลาง',
        recorder: 'ฝ่ายบุคคล',
        receiptNo: 'PAYROLL-M1'
      },
      {
        id: `exp_rent_${bIdx}_1`,
        date: `${yyyy}-${mm}-05`,
        branch,
        category: 'ค่าเช่าสาธารณูปโภค',
        desc: 'ค่าเช่าพื้นที่สาขาประจำเดือน',
        amount: 18000,
        paymentMethod: 'โอนจากบัญชีบริษัทส่วนกลาง',
        paidBy: 'บัญชีบริษัทส่วนกลาง',
        recorder: 'แอดมินสาขา',
        receiptNo: 'RENT-202610'
      },
      {
        id: `exp_rent_${bIdx}_2`,
        date: `${yyyy}-${mm}-10`,
        branch,
        category: 'ค่าเช่าสาธารณูปโภค',
        desc: 'ค่าไฟฟ้าประจำสาขา + ค่าน้ำประปา + อินเทอร์เน็ต',
        amount: 5850,
        paymentMethod: 'เงินโอนบัญชีสาขา',
        paidBy: 'บัญชีสาขา',
        recorder: 'แอดมินสาขา',
        receiptNo: 'MEA-88301'
      }
    );
  });

  // Company HQ Expenses (รายจ่ายบริษัท)
  expenseList.push(
    {
      id: 'exp_comp_1',
      date: `${yyyy}-${mm}-02`,
      branch: 'รายจ่ายบริษัท',
      category: 'ค่าแรง',
      desc: 'เงินเดือนทีมบริหารส่วนกลาง, ผู้จัดการเขต 3 สาขา, นักบัญชี',
      amount: 65000,
      paymentMethod: 'โอนจากบัญชีบริษัทส่วนกลาง',
      paidBy: 'บัญชีบริษัทส่วนกลาง',
      recorder: 'ฝ่ายบุคคลส่วนกลาง',
      receiptNo: 'HQ-PAYROLL'
    },
    {
      id: 'exp_comp_2',
      date: `${yyyy}-${mm}-07`,
      branch: 'รายจ่ายบริษัท',
      category: 'น้ำมันเชื้อเพลิงการเดินทาง',
      desc: 'ค่าน้ำมันและค่าทางด่วนเดินทางตรวจสาขา หนองคาย-โคราช-ขอนแก่น',
      amount: 4800,
      paymentMethod: 'ผู้จัดการ/เจ้าของสำรองจ่าย',
      paidBy: 'คุณวิชัย (กรรมการผู้จัดการ สำรองจ่าย)',
      recorder: 'ผู้ช่วยกรรมการ',
      receiptNo: 'TRV-091'
    },
    {
      id: 'exp_comp_3',
      date: `${yyyy}-${mm}-14`,
      branch: 'รายจ่ายบริษัท',
      category: 'ค่าเช่าสาธารณูปโภค',
      desc: 'ค่าเช่าสำนักงานใหญ่ + ค่าอินเทอร์เน็ตเซิร์ฟเวอร์ระบบ POS',
      amount: 15500,
      paymentMethod: 'โอนจากบัญชีบริษัทส่วนกลาง',
      paidBy: 'บัญชีบริษัทส่วนกลาง',
      recorder: 'บัญชีส่วนกลาง',
      receiptNo: 'HQ-RENT-10'
    },
    {
      id: 'exp_comp_4',
      date: `${yyyy}-${mm}-20`,
      branch: 'รายจ่ายบริษัท',
      category: 'ค่าใช้จ่ายอื่นๆ / เบ็ดเตล็ด',
      desc: 'ค่าโปรโมทการตลาด ยิงแอด Facebook / TikTok สำหรับโปรโมชั่น 3 สาขา',
      amount: 12000,
      paymentMethod: 'โอนจากบัญชีบริษัทส่วนกลาง',
      paidBy: 'บัญชีบริษัทส่วนกลาง',
      recorder: 'ฝ่ายการตลาด',
      receiptNo: 'MKT-AD-042'
    }
  );

  saveData();
}

// ==============================================================
// GMAIL SUMMARY & INSTANT DISPATCH LOGIC
// ==============================================================

function openGmailModal(type = 'MONTHLY', targetDate = '', targetBranch = '') {
  const modal = document.getElementById('gmailModal');
  if (!modal) return;

  const typeSelect = document.getElementById('gmailReportType');
  if (typeSelect) typeSelect.value = type;

  const dateWrap = document.getElementById('gmailDateWrap');
  const dateInput = document.getElementById('gmailSelectedDate');
  const todayStr = new Date().toISOString().slice(0, 10);

  if (dateInput) {
    dateInput.value = targetDate || todayStr;
  }

  const isDayMode = type === 'DAILY' || type === 'DAILY_EXPENSE';
  if (dateWrap) {
    dateWrap.style.display = isDayMode ? 'block' : 'none';
  }

  // Restore last saved recipient email
  const lastRecipient = localStorage.getItem(KEY_GMAIL_RECIPIENT) || '';
  const recipientInput = document.getElementById('gmailRecipientInput');
  if (recipientInput) recipientInput.value = lastRecipient;

  // Restore current active branch filter to match
  const branchSelect = document.getElementById('gmailBranchFilter');
  if (branchSelect) {
    branchSelect.value = targetBranch || activeBranch || 'ALL';
  }

  updateGmailPreview();
  modal.classList.add('active');
}

function closeGmailModal() {
  const modal = document.getElementById('gmailModal');
  if (modal) modal.classList.remove('active');
}

function onGmailReportTypeChange() {
  const typeSelect = document.getElementById('gmailReportType');
  const dateWrap = document.getElementById('gmailDateWrap');
  const type = typeSelect ? typeSelect.value : 'MONTHLY';
  const isDayMode = type === 'DAILY' || type === 'DAILY_EXPENSE';
  if (typeSelect && dateWrap) {
    dateWrap.style.display = isDayMode ? 'block' : 'none';
  }
  updateGmailPreview();
}

function updateGmailPreview() {
  const typeSelect = document.getElementById('gmailReportType');
  const type = typeSelect ? typeSelect.value : 'MONTHLY';
  const branchSelect = document.getElementById('gmailBranchFilter');
  const branch = branchSelect ? branchSelect.value : 'ALL';
  const dateInput = document.getElementById('gmailSelectedDate');
  const targetDate = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().slice(0, 10);

  const subjectInput = document.getElementById('gmailSubjectInput');
  const previewBox = document.getElementById('gmailPreviewText');

  let subject = '';
  let branchText = branch === 'ALL' ? 'ทุกสาขา + บริษัท' : branch;

  if (type === 'DAILY_EXPENSE') {
    subject = `[สรุปรายจ่ายประจำวัน] ประจำวันที่ ${formatDateThai(targetDate)} (${branchText})`;
  } else if (type === 'MONTHLY_EXPENSE') {
    subject = `[สรุปรายจ่ายประจำเดือน] ประจำเดือน ${formatMonthThai(currentMonth)} (${branchText})`;
  } else if (type === 'DAILY') {
    subject = `[สรุปยอดขาย-รายรับ-รายจ่าย] ประจำวันที่ ${formatDateThai(targetDate)} (${branchText})`;
  } else {
    subject = `[สรุปยอดขาย-รายรับ-รายจ่าย] ประจำเดือน ${formatMonthThai(currentMonth)} (${branchText})`;
  }

  if (subjectInput) subjectInput.value = subject;

  const bodyText = buildSummaryText(type, targetDate, branch);
  if (previewBox) {
    previewBox.textContent = bodyText;
  }
}

function buildSummaryText(type, targetDate, branch) {
  const isDaily = type === 'DAILY' || type === 'DAILY_EXPENSE';
  const periodLabel = isDaily 
    ? `ประจำวันที่: ${formatDateThai(targetDate)}` 
    : `ประจำเดือน: ${formatMonthThai(currentMonth)}`;

  const branchLabel = branch === 'ALL' 
    ? 'ทุกสาขา (หนองคาย, โคราช, ขอนแก่น) + รายจ่ายบริษัท' 
    : branch;

  // Filter Sales
  const sales = salesList.filter(s => {
    const matchTime = isDaily ? s.date === targetDate : s.date.startsWith(currentMonth);
    const matchBranch = branch === 'ALL' || s.branch === branch;
    return matchTime && matchBranch;
  });

  // Filter Revenue
  const revs = revenueList.filter(r => {
    const matchTime = isDaily ? r.date === targetDate : r.date.startsWith(currentMonth);
    const matchBranch = branch === 'ALL' || r.branch === branch;
    return matchTime && matchBranch;
  });

  // Filter Expenses
  const exps = expenseList.filter(e => {
    const matchTime = isDaily ? e.date === targetDate : e.date.startsWith(currentMonth);
    const matchBranch = branch === 'ALL' || e.branch === branch;
    return matchTime && matchBranch;
  });

  // Calculations
  const totalSales = sales.reduce((acc, cur) => acc + (cur.total || 0), 0);
  const totalRev = revs.reduce((acc, cur) => acc + (cur.total || 0), 0);
  const totalExp = exps.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const netProfit = totalRev - totalExp;
  const marginPercent = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0';

  // Sales Channels
  const sCash = sales.reduce((acc, cur) => acc + (cur.cash || 0), 0);
  const sTrans = sales.reduce((acc, cur) => acc + (cur.transfer || 0), 0);
  const sGrab = sales.reduce((acc, cur) => acc + (cur.grab || 0), 0);
  const sLineman = sales.reduce((acc, cur) => acc + (cur.lineman || 0), 0);
  const sShopee = sales.reduce((acc, cur) => acc + (cur.shopee || 0), 0);
  const sThai = sales.reduce((acc, cur) => acc + (cur.thai || 0), 0);

  // Revenue Channels
  const rCash = revs.reduce((acc, cur) => acc + (cur.cash || 0), 0);
  const rTrans = revs.reduce((acc, cur) => acc + (cur.transfer || 0), 0);
  const rGrab = revs.reduce((acc, cur) => acc + (cur.grab || 0), 0);
  const rLineman = revs.reduce((acc, cur) => acc + (cur.lineman || 0), 0);
  const rShopee = revs.reduce((acc, cur) => acc + (cur.shopee || 0), 0);
  const rThai = revs.reduce((acc, cur) => acc + (cur.thai || 0), 0);

  // Expense Categories
  const eBev = exps.filter(e => e.category.includes('เครื่องดื่ม')).reduce((acc, c) => acc + (c.amount || 0), 0);
  const eFood = exps.filter(e => e.category === 'อาหาร').reduce((acc, c) => acc + (c.amount || 0), 0);
  const eBak = exps.filter(e => e.category === 'เบเกอรี่').reduce((acc, c) => acc + (c.amount || 0), 0);
  const eFuel = exps.filter(e => e.category.includes('น้ำมัน')).reduce((acc, c) => acc + (c.amount || 0), 0);
  const eWage = exps.filter(e => e.category === 'ค่าแรง').reduce((acc, c) => acc + (c.amount || 0), 0);
  const eRent = exps.filter(e => e.category.includes('สาธารณูปโภค')).reduce((acc, c) => acc + (c.amount || 0), 0);
  const eOther = exps.filter(e => e.category.includes('อื่นๆ')).reduce((acc, c) => acc + (c.amount || 0), 0);

  const now = new Date();
  const timeStr = `${now.toLocaleDateString('th-TH')} เวลา ${now.toLocaleTimeString('th-TH')}`;

  if (type === 'DAILY_EXPENSE' || type === 'MONTHLY_EXPENSE') {
    const isDay = type === 'DAILY_EXPENSE';
    let expSummary = `=======================================================
🧾 รายงานสรุปรายจ่าย${isDay ? 'ประจำวัน' : 'ประจำเดือน'}
🏢 ขอบเขต: ${branchLabel}
📅 ${periodLabel}
=======================================================

📉 ยอดรวมรายจ่ายทั้งสิ้น: ${formatCurrency(totalExp)}
(จำนวนรายการทั้งหมด: ${exps.length} รายการ)

🏢 สรุปรายจ่ายแยกตามสาขาและบริษัท:
`;
    ['หนองคาย', 'โคราช', 'ขอนแก่น'].forEach(b => {
      const bSum = expenseList.filter(e => (isDay ? e.date === targetDate : e.date.startsWith(currentMonth)) && e.branch === b).reduce((a, c) => a + (c.amount || 0), 0);
      expSummary += `   📍 สาขา${b}: ${formatCurrency(bSum)}\n`;
    });
    const cSum = expenseList.filter(e => (isDay ? e.date === targetDate : e.date.startsWith(currentMonth)) && e.branch === 'รายจ่ายบริษัท').reduce((a, c) => a + (c.amount || 0), 0);
    expSummary += `   🏢 รายจ่ายบริษัทส่วนกลาง: ${formatCurrency(cSum)}\n`;

    expSummary += `
📦 สรุปรายจ่ายแยกตาม 6 หมวดหมู่:
   • 🥤 ต้นทุนวัตถุดิบเครื่องดื่ม: ${formatCurrency(eBev)} (${totalExp > 0 ? ((eBev / totalExp) * 100).toFixed(1) : 0}%)
   • 🍲 อาหาร: ${formatCurrency(eFood)} (${totalExp > 0 ? ((eFood / totalExp) * 100).toFixed(1) : 0}%)
   • 🥐 เบเกอรี่: ${formatCurrency(eBak)} (${totalExp > 0 ? ((eBak / totalExp) * 100).toFixed(1) : 0}%)
   • ⛽ น้ำมันเชื้อเพลิงการเดินทาง: ${formatCurrency(eFuel)} (${totalExp > 0 ? ((eFuel / totalExp) * 100).toFixed(1) : 0}%)
   • 👥 ค่าแรง: ${formatCurrency(eWage)} (${totalExp > 0 ? ((eWage / totalExp) * 100).toFixed(1) : 0}%)
   • 🏢 ค่าเช่าสาธารณูปโภค: ${formatCurrency(eRent)} (${totalExp > 0 ? ((eRent / totalExp) * 100).toFixed(1) : 0}%)
   • 📦 ค่าใช้จ่ายอื่นๆ / เบ็ดเตล็ด: ${formatCurrency(eOther)} (${totalExp > 0 ? ((eOther / totalExp) * 100).toFixed(1) : 0}%)

📝 รายการจ่ายเงิน (${Math.min(12, exps.length)} รายการแรก):
`;
    exps.slice(0, 12).forEach((item, idx) => {
      expSummary += `   ${idx + 1}. [${item.branch}] ${item.desc} (${item.category}): ${formatCurrency(item.amount)}\n`;
    });
    if (exps.length > 12) {
      expSummary += `   ... และอีก ${exps.length - 12} รายการ\n`;
    }

    expSummary += `-------------------------------------------------------
รายงานจัดทำโดย: ระบบบันทึกยอดขาย รายรับ-รายจ่าย 3 สาขา
วันที่ส่งสรุป: ${timeStr}
=======================================================`;
    return expSummary;
  }

  let summary = `=======================================================
📊 รายงานสรุปยอดขาย รายรับ และรายจ่าย
🏢 ขอบเขตสาขา: ${branchLabel}
📅 ${periodLabel}
=======================================================

💰 1. ยอดขายรวม: ${formatCurrency(totalSales)}
   • 💵 ยอดขายเงินสด: ${formatCurrency(sCash)}
   • 📱 ยอดขายเงินโอน: ${formatCurrency(sTrans)}
   • 🛵 ยอดขายแกรป (Grab): ${formatCurrency(sGrab)}
   • 🛵 ยอดขายไลน์แมน (LINE MAN): ${formatCurrency(sLineman)}
   • 🛍️ ยอดขายช็อปปี้ฟู้ด (Shopee): ${formatCurrency(sShopee)}
   • 🇹🇭 ยอดขายไทยช่วยไทย: ${formatCurrency(sThai)}

💵 2. รายรับรวม (รับเข้าจริง): ${formatCurrency(totalRev)}
   • 💵 รายรับเงินสด: ${formatCurrency(rCash)}
   • 📱 รายรับเงินโอน: ${formatCurrency(rTrans)}
   • 🛵 รายรับแกรป: ${formatCurrency(rGrab)}
   • 🛵 รายรับไลน์แมน: ${formatCurrency(rLineman)}
   • 🛍️ รายรับช็อปปี้ฟู้ด: ${formatCurrency(rShopee)}
   • 🇹🇭 รายรับไทยช่วยไทย: ${formatCurrency(rThai)}

📉 3. รายจ่ายรวม: ${formatCurrency(totalExp)}
   • 🥤 ต้นทุนวัตถุดิบเครื่องดื่ม: ${formatCurrency(eBev)}
   • 🍲 อาหาร: ${formatCurrency(eFood)}
   • 🥐 เบเกอรี่: ${formatCurrency(eBak)}
   • ⛽ น้ำมันเชื้อเพลิงการเดินทาง: ${formatCurrency(eFuel)}
   • 👥 ค่าแรง: ${formatCurrency(eWage)}
   • 🏢 ค่าเช่าสาธารณูปโภค: ${formatCurrency(eRent)}
   • 📦 ค่าใช้จ่ายอื่นๆ / เบ็ดเตล็ด: ${formatCurrency(eOther)}

-------------------------------------------------------
📈 4. สรุปผลกำไร-ขาดทุนสุทธิ:
   ★ ${netProfit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'}: ${formatCurrency(netProfit)} (คิดเป็น ${marginPercent}% ของรายรับ)
-------------------------------------------------------
`;

  // Branch Breakdown section if ALL branches
  if (branch === 'ALL') {
    summary += `
🏢 5. ผลประกอบการแยกตามสาขา:
`;
    ['หนองคาย', 'โคราช', 'ขอนแก่น'].forEach(b => {
      const bSales = salesList.filter(s => (isDaily ? s.date === targetDate : s.date.startsWith(currentMonth)) && s.branch === b).reduce((acc, c) => acc + (c.total || 0), 0);
      const bRev = revenueList.filter(r => (isDaily ? r.date === targetDate : r.date.startsWith(currentMonth)) && r.branch === b).reduce((acc, c) => acc + (c.total || 0), 0);
      const bExp = expenseList.filter(e => (isDaily ? e.date === targetDate : e.date.startsWith(currentMonth)) && e.branch === b).reduce((acc, c) => acc + (c.amount || 0), 0);
      const bProfit = bRev - bExp;
      summary += `   📍 สาขา${b}:
      - ยอดขาย: ${formatCurrency(bSales)} | รายรับ: ${formatCurrency(bRev)}
      - รายจ่าย: ${formatCurrency(bExp)}
      - กำไรสุทธิ: ${formatCurrency(bProfit)}\n`;
    });

    const compExp = expenseList.filter(e => (isDaily ? e.date === targetDate : e.date.startsWith(currentMonth)) && e.branch === 'รายจ่ายบริษัท').reduce((acc, c) => acc + (c.amount || 0), 0);
    summary += `   🏢 รายจ่ายบริษัท (ส่วนกลาง):
      - รวมรายจ่าย: ${formatCurrency(compExp)}\n`;
  }

  summary += `-------------------------------------------------------
รายงานจัดทำโดย: ระบบบันทึกยอดขาย รายรับ-รายจ่าย 3 สาขา
วันที่ส่งสรุป: ${timeStr}
=======================================================`;

  return summary;
}

function launchGmailCompose() {
  const recipient = document.getElementById('gmailRecipientInput').value.trim();
  const subject = document.getElementById('gmailSubjectInput').value.trim();
  const bodyText = document.getElementById('gmailPreviewText').innerText || document.getElementById('gmailPreviewText').textContent;

  if (recipient) {
    localStorage.setItem(KEY_GMAIL_RECIPIENT, recipient);
  }

  const toParam = encodeURIComponent(recipient);
  const suParam = encodeURIComponent(subject);
  const bodyParam = encodeURIComponent(bodyText);

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${toParam}&su=${suParam}&body=${bodyParam}`;
  window.open(gmailUrl, '_blank');
  showToast('เปิด Gmail พร้อมกรอกข้อมูลสรุปเรียบร้อยแล้ว!', 'success');
}

function openMailtoCompose() {
  const recipient = document.getElementById('gmailRecipientInput').value.trim();
  const subject = document.getElementById('gmailSubjectInput').value.trim();
  const bodyText = document.getElementById('gmailPreviewText').innerText || document.getElementById('gmailPreviewText').textContent;

  if (recipient) {
    localStorage.setItem(KEY_GMAIL_RECIPIENT, recipient);
  }

  const toParam = encodeURIComponent(recipient);
  const suParam = encodeURIComponent(subject);
  const bodyParam = encodeURIComponent(bodyText);

  window.location.href = `mailto:${toParam}?subject=${suParam}&body=${bodyParam}`;
  showToast('เปิดโปรแกรมอีเมลในเครื่องเรียบร้อย', 'success');
}

function copyGmailPreview() {
  const bodyText = document.getElementById('gmailPreviewText').innerText || document.getElementById('gmailPreviewText').textContent;
  if (!bodyText) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(bodyText).then(() => {
      showToast('คัดลอกข้อความสรุปเรียบร้อยแล้ว (สามารถนำไปวางใน Gmail หรือ LINE ได้ทันที)', 'success');
    }).catch(() => {
      fallbackCopy(bodyText);
    });
  } else {
    fallbackCopy(bodyText);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  showToast('คัดลอกข้อความสรุปเรียบร้อยแล้ว', 'success');
}

// ==============================================================
// JPG IMAGE EXPORT ENGINE (HTML5 CANVAS INFOGRAPHIC GENERATOR)
// ==============================================================

function openJpgModal(type = 'DAILY_EXPENSE', targetDate = '', targetBranch = '') {
  const modal = document.getElementById('jpgModal');
  if (!modal) return;

  const typeSelect = document.getElementById('jpgReportType');
  if (typeSelect) typeSelect.value = type;

  const dateWrap = document.getElementById('jpgDateWrap');
  const dateInput = document.getElementById('jpgSelectedDate');
  const todayStr = new Date().toISOString().slice(0, 10);

  if (dateInput) {
    dateInput.value = targetDate || todayStr;
  }

  const isDayMode = (type === 'DAILY' || type === 'DAILY_EXPENSE');
  if (dateWrap) {
    dateWrap.style.display = isDayMode ? 'block' : 'none';
  }

  const branchSelect = document.getElementById('jpgBranchFilter');
  if (branchSelect) {
    branchSelect.value = targetBranch || activeBranch || 'ALL';
  }

  modal.classList.add('active');
  // Render canvas after modal becomes visible
  setTimeout(renderSummaryCanvas, 50);
}

function closeJpgModal() {
  const modal = document.getElementById('jpgModal');
  if (modal) modal.classList.remove('active');
}

function onJpgReportTypeChange() {
  const typeSelect = document.getElementById('jpgReportType');
  const dateWrap = document.getElementById('jpgDateWrap');
  const type = typeSelect ? typeSelect.value : 'MONTHLY';
  const isDayMode = (type === 'DAILY' || type === 'DAILY_EXPENSE');
  if (dateWrap) {
    dateWrap.style.display = isDayMode ? 'block' : 'none';
  }
  renderSummaryCanvas();
}

function drawRoundedRect(ctx, x, y, width, height, radius, fillColor, strokeColor, lineWidth = 1) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function renderSummaryCanvas() {
  const canvas = document.getElementById('exportJpgCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const type = document.getElementById('jpgReportType')?.value || 'DAILY_EXPENSE';
  const branch = document.getElementById('jpgBranchFilter')?.value || 'ALL';
  const dateInput = document.getElementById('jpgSelectedDate');
  const targetDate = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().slice(0, 10);

  if (type === 'DAILY_EXPENSE' || type === 'MONTHLY_EXPENSE') {
    renderExpenseOnlyCanvas(ctx, canvas, type, targetDate, branch);
    return;
  }

  const isDaily = type === 'DAILY';

  // Set High-Res Canvas Size (Width: 1080px, Height: 1420px)
  canvas.width = 1080;
  canvas.height = 1420;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Filter Data
  const sales = salesList.filter(s => {
    const matchTime = isDaily ? s.date === targetDate : s.date.startsWith(currentMonth);
    const matchBranch = branch === 'ALL' || s.branch === branch;
    return matchTime && matchBranch;
  });

  const revs = revenueList.filter(r => {
    const matchTime = isDaily ? r.date === targetDate : r.date.startsWith(currentMonth);
    const matchBranch = branch === 'ALL' || r.branch === branch;
    return matchTime && matchBranch;
  });

  const exps = expenseList.filter(e => {
    const matchTime = isDaily ? e.date === targetDate : e.date.startsWith(currentMonth);
    const matchBranch = branch === 'ALL' || e.branch === branch;
    return matchTime && matchBranch;
  });

  const totalSales = sales.reduce((acc, cur) => acc + (cur.total || 0), 0);
  const totalRev = revs.reduce((acc, cur) => acc + (cur.total || 0), 0);
  const totalExp = exps.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const netProfit = totalRev - totalExp;
  const marginPercent = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0';

  // Period label
  const periodText = isDaily 
    ? `ประจำวันที่: ${formatDateThai(targetDate)}` 
    : `ประจำเดือน: ${formatMonthThai(currentMonth)}`;
  const branchText = branch === 'ALL' ? 'ทุกสาขา + ส่วนกลางบริษัท' : `สาขา: ${branch}`;

  // 1. Header Gradient Banner Card (x: 40, y: 35, w: 1000, h: 140)
  const grad = ctx.createLinearGradient(40, 35, 1040, 175);
  grad.addColorStop(0, '#1e3a8a');
  grad.addColorStop(1, '#0f766e');
  drawRoundedRect(ctx, 40, 35, 1000, 140, 16, grad, null);

  // Header Titles
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Prompt, -apple-system, sans-serif';
  ctx.fillText('📊 รายงานสรุปยอดขาย รายรับ และรายจ่าย (3 สาขา + บริษัท)', 70, 78);

  ctx.fillStyle = '#bae6fd';
  ctx.font = '500 16px Prompt, -apple-system, sans-serif';
  ctx.fillText('สาขาหนองคาย • สาขาโคราช • สาขาขอนแก่น • รายจ่ายบริษัทส่วนกลาง', 70, 108);

  // Header Badges
  drawRoundedRect(ctx, 70, 124, 260, 32, 16, 'rgba(255, 255, 255, 0.22)', null);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 14px Prompt, -apple-system, sans-serif';
  ctx.fillText(`📅 ${periodText}`, 85, 145);

  drawRoundedRect(ctx, 345, 124, 260, 32, 16, 'rgba(255, 255, 255, 0.22)', null);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`🏢 ${branchText}`, 360, 145);

  // 2. 4 Key Stat Cards (y = 195 to 325)
  const cardW = 232;
  const cardH = 120;
  const cardY = 195;
  const gap = 24;

  const kpis = [
    { title: 'ยอดขายรวม (Sales)', value: formatCurrency(totalSales), sub: '6 ช่องทางยอดขาย', color: '#0284c7', topColor: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
    { title: 'รายรับรวม (Revenue)', value: formatCurrency(totalRev), sub: 'รับจริงในบัญชี/เงินสด', color: '#059669', topColor: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    { title: 'รายจ่ายรวม (Expenses)', value: formatCurrency(totalExp), sub: '3 สาขา + ส่วนกลาง', color: '#dc2626', topColor: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    { title: 'กำไรสุทธิ (Net Profit)', value: formatCurrency(netProfit), sub: `มาร์จิ้น: ${marginPercent}%`, color: netProfit >= 0 ? '#10b981' : '#ef4444', topColor: netProfit >= 0 ? '#10b981' : '#ef4444', bg: '#faf5ff', border: '#e9d5ff' }
  ];

  kpis.forEach((kpi, idx) => {
    const kx = 40 + idx * (cardW + gap);
    drawRoundedRect(ctx, kx, cardY, cardW, cardH, 12, '#ffffff', kpi.border, 1.5);
    
    // Top colored stripe
    drawRoundedRect(ctx, kx, cardY, cardW, 5, 2, kpi.topColor, null);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 13px Prompt, -apple-system, sans-serif';
    ctx.fillText(kpi.title, kx + 14, cardY + 30);

    ctx.fillStyle = kpi.color;
    ctx.font = 'bold 22px Prompt, -apple-system, sans-serif';
    ctx.fillText(kpi.value, kx + 14, cardY + 68);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 12px Prompt, -apple-system, sans-serif';
    ctx.fillText(kpi.sub, kx + 14, cardY + 98);
  });

  // 3. Section: ผลประกอบการแยกตามสาขา (y = 335 to 645)
  const sec1Y = 335;
  drawRoundedRect(ctx, 40, sec1Y, 1000, 310, 14, '#ffffff', '#e2e8f0', 1);

  // Section 1 Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 17px Prompt, -apple-system, sans-serif';
  ctx.fillText('🏢 1. สรุปผลประกอบการแยกตามสาขา (หนองคาย • โคราช • ขอนแก่น • รายจ่ายบริษัท)', 60, sec1Y + 32);

  // Table Header Background
  drawRoundedRect(ctx, 60, sec1Y + 48, 960, 36, 6, '#f1f5f9', '#e2e8f0', 1);
  ctx.fillStyle = '#334155';
  ctx.font = '600 13px Prompt, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('สาขา / หน่วยงาน', 75, sec1Y + 71);
  ctx.textAlign = 'right';
  ctx.fillText('ยอดขายรวม (บาท)', 350, sec1Y + 71);
  ctx.fillText('รายรับรวม (บาท)', 520, sec1Y + 71);
  ctx.fillText('รายจ่ายรวม (บาท)', 690, sec1Y + 71);
  ctx.fillText('กำไรสุทธิ (บาท)', 860, sec1Y + 71);
  ctx.fillText('อัตรากำไร (%)', 1000, sec1Y + 71);

  // Rows Data
  const branchRows = [
    { name: '📍 สาขาหนองคาย', key: 'หนองคาย', isCompany: false },
    { name: '📍 สาขาโคราช', key: 'โคราช', isCompany: false },
    { name: '📍 สาขาขอนแก่น', key: 'ขอนแก่น', isCompany: false },
    { name: '🏢 รายจ่ายบริษัทส่วนกลาง', key: 'รายจ่ายบริษัท', isCompany: true }
  ];

  let rowY = sec1Y + 115;
  branchRows.forEach((b) => {
    const s = b.isCompany ? 0 : salesList.filter(item => (isDaily ? item.date === targetDate : item.date.startsWith(currentMonth)) && item.branch === b.key).reduce((acc, c) => acc + (c.total || 0), 0);
    const r = b.isCompany ? 0 : revenueList.filter(item => (isDaily ? item.date === targetDate : item.date.startsWith(currentMonth)) && item.branch === b.key).reduce((acc, c) => acc + (c.total || 0), 0);
    const e = expenseList.filter(item => (isDaily ? item.date === targetDate : item.date.startsWith(currentMonth)) && item.branch === b.key).reduce((acc, c) => acc + (c.amount || 0), 0);
    const p = r - e;
    const m = r > 0 ? ((p / r) * 100).toFixed(1) + '%' : '-';

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    ctx.font = '500 14px Prompt, -apple-system, sans-serif';
    ctx.fillText(b.name, 75, rowY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0284c7';
    ctx.fillText(b.isCompany ? '-' : formatCurrency(s), 350, rowY);

    ctx.fillStyle = '#059669';
    ctx.fillText(b.isCompany ? '-' : formatCurrency(r), 520, rowY);

    ctx.fillStyle = '#dc2626';
    ctx.fillText(formatCurrency(e), 690, rowY);

    ctx.fillStyle = p >= 0 ? '#10b981' : '#ef4444';
    ctx.font = 'bold 14px Prompt, -apple-system, sans-serif';
    ctx.fillText(b.isCompany ? '-' + formatCurrency(e) : formatCurrency(p), 860, rowY);

    ctx.fillStyle = '#475569';
    ctx.font = '400 14px Prompt, -apple-system, sans-serif';
    ctx.fillText(m, 1000, rowY);

    // Row divider
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, rowY + 14);
    ctx.lineTo(1020, rowY + 14);
    ctx.stroke();

    rowY += 42;
  });

  // Table Total Row
  drawRoundedRect(ctx, 60, rowY - 14, 960, 42, 6, '#f8fafc', '#cbd5e1', 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px Prompt, -apple-system, sans-serif';
  ctx.fillText('รวมทั้งสิ้น (3 สาขา + บริษัท):', 75, rowY + 12);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0284c7';
  ctx.fillText(formatCurrency(totalSales), 350, rowY + 12);
  ctx.fillStyle = '#059669';
  ctx.fillText(formatCurrency(totalRev), 520, rowY + 12);
  ctx.fillStyle = '#dc2626';
  ctx.fillText(formatCurrency(totalExp), 690, rowY + 12);
  ctx.fillStyle = netProfit >= 0 ? '#10b981' : '#ef4444';
  ctx.fillText(formatCurrency(netProfit), 860, rowY + 12);
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`${marginPercent}%`, 1000, rowY + 12);

  // 4. Two Columns: 6 Sales Channels & 6 Expense Categories (y = 665 to 1130)
  const sec2Y = 665;
  const colW = 488;
  const colH = 460;

  // Left Column: 6 Sales Channels
  drawRoundedRect(ctx, 40, sec2Y, colW, colH, 14, '#ffffff', '#e2e8f0', 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 16px Prompt, -apple-system, sans-serif';
  ctx.fillText('💰 2. ยอดขายแยกตาม 6 ช่องทาง', 60, sec2Y + 34);

  const sChannels = [
    { label: '💵 ยอดขายเงินสด', val: sales.reduce((a, c) => a + (c.cash || 0), 0) },
    { label: '📱 ยอดขายเงินโอน', val: sales.reduce((a, c) => a + (c.transfer || 0), 0) },
    { label: '🛵 ยอดขายแกรป (Grab)', val: sales.reduce((a, c) => a + (c.grab || 0), 0) },
    { label: '🛵 ยอดขายไลน์แมน (LINE MAN)', val: sales.reduce((a, c) => a + (c.lineman || 0), 0) },
    { label: '🛍️ ยอดขายช็อปปี้ฟู้ด (Shopee)', val: sales.reduce((a, c) => a + (c.shopee || 0), 0) },
    { label: '🇹🇭 ยอดขายไทยช่วยไทย', val: sales.reduce((a, c) => a + (c.thai || 0), 0) }
  ];

  let cY = sec2Y + 75;
  sChannels.forEach(ch => {
    const pct = totalSales > 0 ? ((ch.val / totalSales) * 100).toFixed(1) : '0';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '500 14px Prompt, -apple-system, sans-serif';
    ctx.fillText(ch.label, 60, cY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 14px Prompt, -apple-system, sans-serif';
    ctx.fillText(`${formatCurrency(ch.val)} (${pct}%)`, 495, cY);

    // Mini Progress Track
    drawRoundedRect(ctx, 60, cY + 8, 440, 6, 3, '#f1f5f9', null);
    const fillW = Math.max(0, Math.min(440, (parseFloat(pct) / 100) * 440));
    drawRoundedRect(ctx, 60, cY + 8, fillW, 6, 3, '#38bdf8', null);

    cY += 50;
  });

  // Sales Total Box
  drawRoundedRect(ctx, 60, cY + 5, 448, 42, 8, '#f0f9ff', '#bae6fd', 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 15px Prompt, -apple-system, sans-serif';
  ctx.fillText('รวมยอดขายทั้งหมด:', 75, cY + 31);
  ctx.textAlign = 'right';
  ctx.fillText(formatCurrency(totalSales), 490, cY + 31);

  // Right Column: 6 Expense Categories
  const rx = 552;
  drawRoundedRect(ctx, rx, sec2Y, colW, colH, 14, '#ffffff', '#e2e8f0', 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 16px Prompt, -apple-system, sans-serif';
  ctx.fillText('📉 3. รายจ่ายแยกตาม 6 หมวดหมู่', rx + 20, sec2Y + 34);

  const eCategories = [
    { label: '🥤 ต้นทุนวัตถุดิบเครื่องดื่ม', val: exps.filter(e => e.category.includes('เครื่องดื่ม')).reduce((a, c) => a + (c.amount || 0), 0) },
    { label: '🍲 อาหาร', val: exps.filter(e => e.category === 'อาหาร').reduce((a, c) => a + (c.amount || 0), 0) },
    { label: '🥐 เบเกอรี่', val: exps.filter(e => e.category === 'เบเกอรี่').reduce((a, c) => a + (c.amount || 0), 0) },
    { label: '⛽ น้ำมันเชื้อเพลิงการเดินทาง', val: exps.filter(e => e.category.includes('น้ำมัน')).reduce((a, c) => a + (c.amount || 0), 0) },
    { label: '👥 ค่าแรง', val: exps.filter(e => e.category === 'ค่าแรง').reduce((a, c) => a + (c.amount || 0), 0) },
    { label: '🏢 ค่าเช่าสาธารณูปโภค', val: exps.filter(e => e.category.includes('สาธารณูปโภค')).reduce((a, c) => a + (c.amount || 0), 0) },
    { label: '📦 อื่นๆ / เบ็ดเตล็ด', val: exps.filter(e => e.category.includes('อื่นๆ')).reduce((a, c) => a + (c.amount || 0), 0) }
  ];

  let eY = sec2Y + 70;
  eCategories.forEach(cat => {
    const pct = totalExp > 0 ? ((cat.val / totalExp) * 100).toFixed(1) : '0';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '500 13px Prompt, -apple-system, sans-serif';
    ctx.fillText(cat.label, rx + 20, eY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px Prompt, -apple-system, sans-serif';
    ctx.fillText(`${formatCurrency(cat.val)} (${pct}%)`, rx + 465, eY);

    // Mini Progress Track
    drawRoundedRect(ctx, rx + 20, eY + 6, 445, 5, 2.5, '#f1f5f9', null);
    const fillW = Math.max(0, Math.min(445, (parseFloat(pct) / 100) * 445));
    drawRoundedRect(ctx, rx + 20, eY + 6, fillW, 5, 2.5, '#f87171', null);

    eY += 43;
  });

  // Expense Total Box
  drawRoundedRect(ctx, rx + 20, eY + 2, 448, 42, 8, '#fef2f2', '#fecaca', 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#b91c1c';
  ctx.font = 'bold 15px Prompt, -apple-system, sans-serif';
  ctx.fillText('รวมรายจ่ายทั้งหมด:', rx + 35, eY + 28);
  ctx.textAlign = 'right';
  ctx.fillText(formatCurrency(totalExp), rx + 450, eY + 28);

  // 5. Section: Bottom Conclusion Banner (y = 1145 to 1320)
  const sec3Y = 1145;
  const isProfitable = netProfit >= 0;
  const concBg = isProfitable ? '#ecfdf5' : '#fef2f2';
  const concBorder = isProfitable ? '#a7f3d0' : '#fecaca';
  const concColor = isProfitable ? '#065f46' : '#991b1b';

  drawRoundedRect(ctx, 40, sec3Y, 1000, 150, 14, concBg, concBorder, 1.5);
  ctx.textAlign = 'left';
  ctx.fillStyle = concColor;
  ctx.font = 'bold 20px Prompt, -apple-system, sans-serif';
  ctx.fillText(`★ บทสรุปผลการดำเนินงานสุทธิ: ${isProfitable ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'} ${formatCurrency(netProfit)}`, 70, sec3Y + 45);

  ctx.fillStyle = '#334155';
  ctx.font = '500 15px Prompt, -apple-system, sans-serif';
  ctx.fillText(`• รายรับรวมทั้งสิ้น ${formatCurrency(totalRev)} หักลบ รายจ่ายรวมทั้งสิ้น ${formatCurrency(totalExp)}`, 70, sec3Y + 80);
  ctx.fillText(`• คิดเป็นอัตรากำไรสุทธิ (Profit Margin): ${marginPercent}% ของรายรับรวม`, 70, sec3Y + 110);

  // 6. Footer (y = 1350 to 1395)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 1345);
  ctx.lineTo(1040, 1345);
  ctx.stroke();

  const now = new Date();
  const timeStr = `${now.toLocaleDateString('th-TH')} เวลา ${now.toLocaleTimeString('th-TH')}`;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 13px Prompt, -apple-system, sans-serif';
  ctx.fillText(`พิมพ์/ส่งออกเมื่อ: ${timeStr} • ระบบบันทึกยอดขาย รายรับ-รายจ่าย 3 สาขา`, 40, 1380);

  ctx.textAlign = 'right';
  ctx.fillText('หนองคาย • โคราช • ขอนแก่น • ส่วนกลางบริษัท', 1040, 1380);
}

function downloadJpgImage() {
  const canvas = document.getElementById('exportJpgCanvas');
  if (!canvas) return;

  const type = document.getElementById('jpgReportType')?.value || 'DAILY_EXPENSE';
  const branch = document.getElementById('jpgBranchFilter')?.value || 'ALL';
  const dateInput = document.getElementById('jpgSelectedDate');
  const targetDate = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().slice(0, 10);

  let filename = '';
  if (type === 'DAILY_EXPENSE') {
    filename = `สรุปรายจ่าย_${branch}_วันที่_${targetDate}.jpg`;
  } else if (type === 'MONTHLY_EXPENSE') {
    filename = `สรุปรายจ่าย_${branch}_เดือน_${currentMonth}.jpg`;
  } else if (type === 'DAILY') {
    filename = `สรุปยอด_${branch}_วันที่_${targetDate}.jpg`;
  } else {
    filename = `สรุปยอด_${branch}_เดือน_${currentMonth}.jpg`;
  }

  canvas.toBlob(blob => {
    if (!blob) {
      showToast('ไม่สามารถสร้างรูปภาพได้', 'error');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดรูปภาพสรุปยอด JPG สำเร็จแล้ว 🖼️', 'success');
  }, 'image/jpeg', 0.95);
}

function copyJpgImageToClipboard() {
  const canvas = document.getElementById('exportJpgCanvas');
  if (!canvas) return;

  if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
    canvas.toBlob(blob => {
      if (!blob) {
        downloadJpgImage();
        return;
      }
      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard.write([item]).then(() => {
        showToast('คัดลอกรูปภาพลงคลิปบอร์ดแล้ว! สามารถกด Ctrl+V วางใน LINE ได้ทันที 📋', 'success');
      }).catch(err => {
        downloadJpgImage();
      });
    }, 'image/png');
  } else {
    downloadJpgImage();
  }
}

// ==============================================================
// SPECIALIZED EXPENSE-ONLY INFOGRAPHIC CANVAS ENGINE
// ==============================================================
function renderExpenseOnlyCanvas(ctx, canvas, type, targetDate, branch) {
  const isDaily = (type === 'DAILY_EXPENSE');
  const isAll = (branch === 'ALL');

  // Dynamic Height: 1460 if ALL branches, 1340 if specific branch
  canvas.width = 1080;
  canvas.height = isAll ? 1460 : 1340;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Filter Data
  const exps = expenseList.filter(e => {
    const matchTime = isDaily ? e.date === targetDate : e.date.startsWith(currentMonth);
    const matchBranch = isAll || e.branch === branch;
    return matchTime && matchBranch;
  });

  const totalExp = exps.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  const bev = exps.filter(e => e.category.includes('เครื่องดื่ม')).reduce((a, c) => a + (c.amount || 0), 0);
  const food = exps.filter(e => e.category === 'อาหาร').reduce((a, c) => a + (c.amount || 0), 0);
  const bak = exps.filter(e => e.category === 'เบเกอรี่').reduce((a, c) => a + (c.amount || 0), 0);
  const fuel = exps.filter(e => e.category.includes('น้ำมัน')).reduce((a, c) => a + (c.amount || 0), 0);
  const wage = exps.filter(e => e.category === 'ค่าแรง').reduce((a, c) => a + (c.amount || 0), 0);
  const rent = exps.filter(e => e.category.includes('สาธารณูปโภค')).reduce((a, c) => a + (c.amount || 0), 0);
  const other = exps.filter(e => e.category.includes('อื่นๆ')).reduce((a, c) => a + (c.amount || 0), 0);
  const rawTotal = bev + food + bak;

  const periodText = isDaily 
    ? `ประจำวันที่: ${formatDateThai(targetDate)}` 
    : `ประจำเดือน: ${formatMonthThai(currentMonth)}`;
  const branchText = isAll ? 'สรุปรายจ่ายรวมประจำวัน (ทุกสาขา + บริษัท)' : `เฉพาะสาขา: ${branch}`;

  // 1. Header Gradient Banner Card (Ruby Red to Rose)
  const grad = ctx.createLinearGradient(40, 35, 1040, 175);
  grad.addColorStop(0, '#991b1b');
  grad.addColorStop(1, '#dc2626');
  drawRoundedRect(ctx, 40, 35, 1000, 140, 16, grad, null);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Prompt, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`🧾 รายงานสรุปรายจ่าย${isDaily ? 'ประจำวัน (Daily Expense Summary)' : 'ประจำเดือน'}`, 70, 78);

  ctx.fillStyle = '#fecdd3';
  ctx.font = '500 16px Prompt, -apple-system, sans-serif';
  ctx.fillText('ระบบบันทึกยอดขาย รายรับ-รายจ่าย 3 สาขา (หนองคาย • โคราช • ขอนแก่น) และรายจ่ายบริษัท', 70, 108);

  // Badges
  drawRoundedRect(ctx, 70, 124, 260, 32, 16, 'rgba(255, 255, 255, 0.22)', null);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 14px Prompt, -apple-system, sans-serif';
  ctx.fillText(`📅 ${periodText}`, 85, 145);

  drawRoundedRect(ctx, 345, 124, 380, 32, 16, 'rgba(255, 255, 255, 0.22)', null);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`🏢 ${branchText}`, 360, 145);

  // 2. 4 Key Stat Cards
  const cardW = 232;
  const cardH = 120;
  const cardY = 195;
  const gap = 24;

  const kpis = [
    { title: 'รายจ่ายรวมทั้งสิ้น', value: formatCurrency(totalExp), sub: `รวม ${exps.length} รายการ`, color: '#dc2626', topColor: '#dc2626', border: '#fecaca' },
    { title: 'ต้นทุนวัตถุดิบรวม', value: formatCurrency(rawTotal), sub: 'เครื่องดื่ม • อาหาร • เบเกอรี่', color: '#ea580c', topColor: '#ea580c', border: '#fed7aa' },
    { title: 'ค่าแรง & น้ำมันเชื้อเพลิง', value: formatCurrency(wage + fuel), sub: 'ค่าจ้าง • เดินทางส่งของ', color: '#7c3aed', topColor: '#7c3aed', border: '#ddd6fe' },
    { title: 'ค่าเช่าสาธารณูปโภค & อื่นๆ', value: formatCurrency(rent + other), sub: 'ค่าเช่า น้ำ ไฟ เบ็ดเตล็ด', color: '#475569', topColor: '#475569', border: '#cbd5e1' }
  ];

  kpis.forEach((kpi, idx) => {
    const kx = 40 + idx * (cardW + gap);
    drawRoundedRect(ctx, kx, cardY, cardW, cardH, 12, '#ffffff', kpi.border, 1.5);
    drawRoundedRect(ctx, kx, cardY, cardW, 5, 2, kpi.topColor, null);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 13px Prompt, -apple-system, sans-serif';
    ctx.fillText(kpi.title, kx + 14, cardY + 30);

    ctx.fillStyle = kpi.color;
    ctx.font = 'bold 22px Prompt, -apple-system, sans-serif';
    ctx.fillText(kpi.value, kx + 14, cardY + 68);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 12px Prompt, -apple-system, sans-serif';
    ctx.fillText(kpi.sub, kx + 14, cardY + 98);
  });

  let currentY = 335;

  // 3. Branch Breakdown Cards (If isAll)
  if (isAll) {
    drawRoundedRect(ctx, 40, currentY, 1000, 125, 12, '#ffffff', '#e2e8f0', 1);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Prompt, -apple-system, sans-serif';
    ctx.fillText('🏢 สรุปรายจ่ายรวมประจำวัน แยกตาม 3 สาขา และ ส่วนกลางบริษัท', 60, currentY + 30);

    const bBranches = [
      { name: '📍 หนองคาย', key: 'หนองคาย', color: '#059669' },
      { name: '📍 โคราช', key: 'โคราช', color: '#d97706' },
      { name: '📍 ขอนแก่น', key: 'ขอนแก่น', color: '#2563eb' },
      { name: '🏢 รายจ่ายบริษัท', key: 'รายจ่ายบริษัท', color: '#7c3aed' }
    ];

    bBranches.forEach((b, idx) => {
      const bx = 60 + idx * 240;
      const bSum = expenseList.filter(e => (isDaily ? e.date === targetDate : e.date.startsWith(currentMonth)) && e.branch === b.key).reduce((acc, c) => acc + (c.amount || 0), 0);
      drawRoundedRect(ctx, bx, currentY + 45, 220, 65, 8, '#f8fafc', '#e2e8f0', 1);

      ctx.fillStyle = b.color;
      ctx.font = '600 13px Prompt, -apple-system, sans-serif';
      ctx.fillText(b.name, bx + 12, currentY + 68);

      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 18px Prompt, -apple-system, sans-serif';
      ctx.fillText(formatCurrency(bSum), bx + 12, currentY + 96);
    });

    currentY += 140;
  }

  // 4. Two Columns: Categories Breakdown & Items List
  const colW = 488;
  const colH = 480;

  // Left Column: 6 Categories Breakdown
  drawRoundedRect(ctx, 40, currentY, colW, colH, 14, '#ffffff', '#e2e8f0', 1);
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 16px Prompt, -apple-system, sans-serif';
  ctx.fillText('📦 รายละเอียดรายจ่ายแบ่งตาม 6 หมวดหมู่', 60, currentY + 34);

  const eCategories = [
    { label: '🥤 ต้นทุนวัตถุดิบเครื่องดื่ม', val: bev, color: '#0284c7' },
    { label: '🍲 อาหาร', val: food, color: '#ea580c' },
    { label: '🥐 เบเกอรี่', val: bak, color: '#d97706' },
    { label: '⛽ น้ำมันเชื้อเพลิงการเดินทาง', val: fuel, color: '#dc2626' },
    { label: '👥 ค่าแรง', val: wage, color: '#7c3aed' },
    { label: '🏢 ค่าเช่าสาธารณูปโภค', val: rent, color: '#475569' },
    { label: '📦 ค่าใช้จ่ายอื่นๆ / เบ็ดเตล็ด', val: other, color: '#94a3b8' }
  ];

  let eY = currentY + 70;
  eCategories.forEach(cat => {
    const pct = totalExp > 0 ? ((cat.val / totalExp) * 100).toFixed(1) : '0';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '500 13px Prompt, -apple-system, sans-serif';
    ctx.fillText(cat.label, 60, eY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px Prompt, -apple-system, sans-serif';
    ctx.fillText(`${formatCurrency(cat.val)} (${pct}%)`, 505, eY);

    drawRoundedRect(ctx, 60, eY + 6, 445, 5, 2.5, '#f1f5f9', null);
    const fillW = Math.max(0, Math.min(445, (parseFloat(pct) / 100) * 445));
    drawRoundedRect(ctx, 60, eY + 6, fillW, 5, 2.5, cat.color, null);

    eY += 46;
  });

  // Total Box
  drawRoundedRect(ctx, 60, eY + 5, 448, 44, 8, '#fef2f2', '#fecaca', 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#b91c1c';
  ctx.font = 'bold 15px Prompt, -apple-system, sans-serif';
  ctx.fillText('รวมรายจ่ายทั้งหมด:', 75, eY + 32);
  ctx.textAlign = 'right';
  ctx.fillText(formatCurrency(totalExp), 490, eY + 32);

  // Right Column: Items List
  const rx = 552;
  drawRoundedRect(ctx, rx, currentY, colW, colH, 14, '#ffffff', '#e2e8f0', 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7c3aed';
  ctx.font = 'bold 16px Prompt, -apple-system, sans-serif';
  ctx.fillText(`📝 รายการจ่ายเงินของวันนี้ (${exps.length} รายการ)`, rx + 20, currentY + 34);

  if (exps.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 14px Prompt, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ไม่มีรายการรายจ่ายในวันที่เลือก', rx + colW / 2, currentY + colH / 2);
  } else {
    let itemY = currentY + 68;
    const maxShow = 7;
    exps.slice(0, maxShow).forEach((item, idx) => {
      drawRoundedRect(ctx, rx + 16, itemY - 14, 456, 46, 6, idx % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0', 1);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 13px Prompt, -apple-system, sans-serif';
      const truncatedDesc = item.desc.length > 24 ? item.desc.slice(0, 24) + '...' : item.desc;
      ctx.fillText(`${idx + 1}. [${item.branch}] ${truncatedDesc}`, rx + 24, itemY + 8);

      ctx.fillStyle = '#64748b';
      ctx.font = '400 11px Prompt, -apple-system, sans-serif';
      ctx.fillText(`${item.category} • ${item.paidBy || item.paymentMethod || '-'}`, rx + 24, itemY + 24);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 13px Prompt, -apple-system, sans-serif';
      ctx.fillText(formatCurrency(item.amount), rx + 460, itemY + 16);

      itemY += 52;
    });

    if (exps.length > maxShow) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.font = '500 12px Prompt, -apple-system, sans-serif';
      ctx.fillText(`... และอีก ${exps.length - maxShow} รายการ รวมเป็น ${formatCurrency(totalExp)}`, rx + colW / 2, currentY + colH - 18);
    }
  }

  // 5. Verification & Summary Box
  const vY = currentY + colH + 16;
  drawRoundedRect(ctx, 40, vY, 1000, 75, 12, '#fef2f2', '#fecaca', 1.5);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#991b1b';
  ctx.font = 'bold 16px Prompt, -apple-system, sans-serif';
  ctx.fillText(`★ ยอดรวมรายจ่ายประจำวันทั้งสิ้น: ${formatCurrency(totalExp)} บาท`, 60, vY + 32);
  ctx.font = '400 13px Prompt, -apple-system, sans-serif';
  ctx.fillText(`ตรวจสอบครบถ้วน ${exps.length} รายการ (${branchText})`, 60, vY + 54);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = '500 13px Prompt, -apple-system, sans-serif';
  ctx.fillText('ผู้จัดทำรายงาน: ______________________    ผู้ตรวจสอบ/อนุมัติ: ______________________', 1010, vY + 44);

  // 6. Footer
  const footY = vY + 100;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, footY - 10);
  ctx.lineTo(1040, footY - 10);
  ctx.stroke();

  const now = new Date();
  const timeStr = `${now.toLocaleDateString('th-TH')} เวลา ${now.toLocaleTimeString('th-TH')}`;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 13px Prompt, -apple-system, sans-serif';
  ctx.fillText(`พิมพ์/ส่งออกเมื่อ: ${timeStr} • ระบบบันทึกยอดขาย รายรับ-รายจ่าย 3 สาขา`, 40, footY + 14);

  ctx.textAlign = 'right';
  ctx.fillText('สาขาหนองคาย • สาขาโคราช • สาขาขอนแก่น • ส่วนกลางบริษัท', 1040, footY + 14);
}
