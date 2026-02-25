// app.js — Init, tabs, filters, stats, config

const App = (() => {
  // ===== CONFIG — Set these values =====
  const CONFIG = {
    sheetId: '', // Paste your Google Sheet ID here
    formUrl: '', // Paste your Google Form URL here
  };

  let allData = [];
  let filteredData = [];

  // ===== Init =====
  async function init() {
    // Check localStorage for saved config
    const savedSheetId = localStorage.getItem('fitness_sheet_id');
    const savedFormUrl = localStorage.getItem('fitness_form_url');
    if (savedSheetId) CONFIG.sheetId = savedSheetId;
    if (savedFormUrl) CONFIG.formUrl = savedFormUrl;

    // Update form link
    updateFormLink();

    if (!CONFIG.sheetId) {
      showSetup();
      return;
    }

    showLoading();

    try {
      allData = await FitnessData.fetchData(CONFIG.sheetId);
      filteredData = [...allData];
      populateFilters();
      renderStats();
      renderActiveTab();
      showDashboard();
    } catch (err) {
      console.error('Failed to load data:', err);
      showError(err.message);
    }
  }

  // ===== Setup prompt =====
  function showSetup() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    document.getElementById('setup').style.display = 'block';
  }

  function showLoading() {
    document.getElementById('setup').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    document.getElementById('loading').style.display = 'flex';
  }

  function showDashboard() {
    document.getElementById('setup').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
  }

  function showError(msg) {
    document.getElementById('setup').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    const errorEl = document.getElementById('error');
    errorEl.style.display = 'block';
    errorEl.querySelector('.error-detail').textContent = msg;
  }

  function saveSetup() {
    const sheetInput = document.getElementById('sheet-id-input');
    const formInput = document.getElementById('form-url-input');
    const id = sheetInput.value.trim();
    const url = formInput.value.trim();

    if (!id) {
      sheetInput.focus();
      return;
    }

    CONFIG.sheetId = id;
    CONFIG.formUrl = url;
    localStorage.setItem('fitness_sheet_id', id);
    if (url) localStorage.setItem('fitness_form_url', url);
    init();
  }

  function updateFormLink() {
    const link = document.getElementById('log-workout-link');
    if (link && CONFIG.formUrl) {
      link.href = CONFIG.formUrl;
      link.style.display = 'inline-flex';
    }
  }

  // ===== Filters =====
  function populateFilters() {
    const workoutDays = [...new Set(allData.map(r => r.workoutDay))].sort();
    const exercises = [...new Set(allData.map(r => r.exerciseName))].sort();

    const wdSelect = document.getElementById('filter-workout-day');
    wdSelect.innerHTML = '<option value="">All Days</option>' +
      workoutDays.map(d => `<option value="${d}">${d}</option>`).join('');

    const exSelect = document.getElementById('filter-exercise');
    exSelect.innerHTML = '<option value="">All Exercises</option>' +
      exercises.map(e => `<option value="${e}">${e}</option>`).join('');

    // Also populate progress tab exercise selector
    const progressSelect = document.getElementById('progress-exercise');
    if (progressSelect) {
      const liftExercises = exercises.filter(e =>
        !['Long Run', 'Mileage Run'].includes(e)
      );
      progressSelect.innerHTML =
        liftExercises.map(e => `<option value="${e}">${e}</option>`).join('');
    }
  }

  function applyFilters() {
    const workoutDay = document.getElementById('filter-workout-day').value;
    const exercise = document.getElementById('filter-exercise').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    filteredData = allData.filter(r => {
      if (workoutDay && r.workoutDay !== workoutDay) return false;
      if (exercise && r.exerciseName !== exercise) return false;
      if (dateFrom && r.dateKey < dateFrom) return false;
      if (dateTo && r.dateKey > dateTo) return false;
      return true;
    });

    renderStats();
    renderActiveTab();
  }

  // ===== Stats =====
  function renderStats() {
    const data = filteredData;

    // Total workouts (unique dates)
    const uniqueDates = new Set(data.map(r => r.dateKey));
    document.getElementById('stat-total').textContent = uniqueDates.size;

    // This week
    const today = new Date();
    const monday = new Date(today);
    const day = monday.getDay();
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
    const mondayKey = monday.toISOString().split('T')[0];
    const thisWeek = new Set(data.filter(r => r.dateKey >= mondayKey).map(r => r.dateKey));
    document.getElementById('stat-week').textContent = thisWeek.size;

    // Total volume
    const totalVol = data.reduce((sum, r) => sum + r.volume, 0);
    document.getElementById('stat-volume').textContent = formatNumber(totalVol);

    // Streak (consecutive days with workouts, counting backward from today)
    const streak = computeStreak(data);
    document.getElementById('stat-streak').textContent = streak;
  }

  function computeStreak(data) {
    const datesSet = new Set(data.map(r => r.dateKey));
    let streak = 0;
    const d = new Date();
    // Check if today has a workout; if not, start from yesterday
    const todayKey = d.toISOString().split('T')[0];
    if (!datesSet.has(todayKey)) {
      d.setDate(d.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().split('T')[0];
      if (datesSet.has(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  // ===== Tabs =====
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
        renderActiveTab();
      });
    });
  }

  function getActiveTab() {
    const active = document.querySelector('.tab-btn.active');
    return active ? active.dataset.tab : 'overview';
  }

  function renderActiveTab() {
    const tab = getActiveTab();
    const data = filteredData;

    switch (tab) {
      case 'overview':
        FitnessCharts.renderExerciseDistribution('chart-distribution', data);
        FitnessCharts.renderWeeklyTrends('chart-weekly', data);
        break;
      case 'progress':
        renderProgressTab(data);
        break;
      case 'frequency':
        FitnessCharts.renderFrequencyHeatmap('heatmap-container', allData);
        break;
      case 'volume':
        FitnessCharts.renderVolumeByExercise('chart-volume-exercise', data);
        FitnessCharts.renderMonthlyVolume('chart-monthly-volume', data);
        break;
      case 'runs':
        FitnessCharts.renderRunningProgress('chart-runs', allData);
        break;
      case 'history':
        renderHistoryTable(data);
        break;
    }
  }

  function renderProgressTab(data) {
    const select = document.getElementById('progress-exercise');
    if (!select || !select.value) return;
    FitnessCharts.renderProgressOverTime('chart-progress', data, select.value);
  }

  // ===== History Table =====
  function renderHistoryTable(data) {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    const sorted = [...data].sort((a, b) => b.dateObj - a.dateObj);
    const rows = sorted.slice(0, 200); // Limit to 200 rows

    tbody.innerHTML = rows.map(r => {
      const tagClass = getTagClass(r.workoutDay);
      const detail = r.volume > 0
        ? `${r.sets}x${r.reps} @ ${r.weight}lbs`
        : r.distance
          ? `${r.distance}mi${r.duration ? ' / ' + r.duration + 'min' : ''}`
          : r.duration
            ? `${r.duration}min`
            : '—';

      return `<tr>
        <td>${r.dateKey}</td>
        <td><span class="tag ${tagClass}">${r.workoutDay}</span></td>
        <td>${r.exerciseName}</td>
        <td>${detail}</td>
        <td>${r.volume > 0 ? r.volume.toLocaleString() : '—'}</td>
        <td>${r.notes || ''}</td>
      </tr>`;
    }).join('');
  }

  function getTagClass(workoutDay) {
    const map = {
      'Upper A (Push)': 'tag-upper-a',
      'Lower A (Quad)': 'tag-lower-a',
      'Upper B (Pull)': 'tag-upper-b',
      'Lower B (Ham/Glute)': 'tag-lower-b',
      'Long Run': 'tag-long-run',
      'Mileage Run': 'tag-mileage-run',
    };
    return map[workoutDay] || 'tag-other';
  }

  // ===== Refresh =====
  async function refresh() {
    FitnessData.clearCache();
    showLoading();
    try {
      allData = await FitnessData.fetchData(CONFIG.sheetId, true);
      filteredData = [...allData];
      populateFilters();
      renderStats();
      renderActiveTab();
      showDashboard();
    } catch (err) {
      showError(err.message);
    }
  }

  // ===== Boot =====
  function boot() {
    initTabs();

    document.getElementById('btn-refresh').addEventListener('click', refresh);
    document.getElementById('btn-save-setup').addEventListener('click', saveSetup);

    document.getElementById('filter-workout-day').addEventListener('change', applyFilters);
    document.getElementById('filter-exercise').addEventListener('change', applyFilters);
    document.getElementById('filter-date-from').addEventListener('change', applyFilters);
    document.getElementById('filter-date-to').addEventListener('change', applyFilters);

    const progressSelect = document.getElementById('progress-exercise');
    if (progressSelect) {
      progressSelect.addEventListener('change', () => renderProgressTab(filteredData));
    }

    // Allow Enter key in setup
    document.getElementById('sheet-id-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') saveSetup();
    });

    init();
  }

  document.addEventListener('DOMContentLoaded', boot);

  return { refresh, saveSetup };
})();
