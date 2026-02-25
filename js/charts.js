// charts.js — All Chart.js chart renderers

const FitnessCharts = (() => {
  const instances = {};

  const WORKOUT_COLORS = {
    'Upper A (Push)': '#58a6ff',
    'Lower A (Quad)': '#3fb950',
    'Upper B (Pull)': '#bc8cff',
    'Lower B (Ham/Glute)': '#d29922',
    'Long Run': '#f85149',
    'Mileage Run': '#f0883e',
    'Other': '#8b949e',
  };

  const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#8b949e', font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: '#21262d',
        titleColor: '#e6edf3',
        bodyColor: '#e6edf3',
        borderColor: '#30363d',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#8b949e' },
        grid: { color: 'rgba(48,54,61,0.5)' },
      },
      y: {
        ticks: { color: '#8b949e' },
        grid: { color: 'rgba(48,54,61,0.5)' },
      },
    },
  };

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  function destroyAll() {
    Object.keys(instances).forEach(destroy);
  }

  function getCtx(canvasId) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    // Reset canvas dimensions for clean re-render
    el.style.height = '300px';
    return el.getContext('2d');
  }

  // 1. Exercise Distribution — Doughnut
  function renderExerciseDistribution(canvasId, data) {
    destroy(canvasId);
    const ctx = getCtx(canvasId);
    if (!ctx) return;

    const counts = {};
    data.forEach(r => {
      counts[r.workoutDay] = (counts[r.workoutDay] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const values = Object.values(counts);
    const colors = labels.map(l => WORKOUT_COLORS[l] || '#8b949e');

    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: '#161b22',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#8b949e', font: { size: 12 }, padding: 12 },
          },
          tooltip: CHART_DEFAULTS.plugins.tooltip,
        },
      },
    });
  }

  // 2. Weekly Workout Trends — Dual-axis Line
  function renderWeeklyTrends(canvasId, data) {
    destroy(canvasId);
    const ctx = getCtx(canvasId);
    if (!ctx) return;

    const weekMap = {};
    data.forEach(r => {
      if (!weekMap[r.weekKey]) weekMap[r.weekKey] = { days: new Set(), volume: 0 };
      weekMap[r.weekKey].days.add(r.dateKey);
      weekMap[r.weekKey].volume += r.volume;
    });

    const weeks = Object.keys(weekMap).sort();
    const dayCounts = weeks.map(w => weekMap[w].days.size);
    const volumes = weeks.map(w => weekMap[w].volume);

    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeks,
        datasets: [
          {
            label: 'Workout Days',
            data: dayCounts,
            borderColor: '#58a6ff',
            backgroundColor: 'rgba(88,166,255,0.1)',
            yAxisID: 'y',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Total Volume (lbs)',
            data: volumes,
            borderColor: '#3fb950',
            backgroundColor: 'rgba(63,185,80,0.1)',
            yAxisID: 'y1',
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          x: {
            ticks: { color: '#8b949e', maxTicksLimit: 12 },
            grid: { color: 'rgba(48,54,61,0.5)' },
          },
          y: {
            position: 'left',
            title: { display: true, text: 'Workout Days', color: '#8b949e' },
            ticks: { color: '#58a6ff', stepSize: 1 },
            grid: { color: 'rgba(48,54,61,0.5)' },
          },
          y1: {
            position: 'right',
            title: { display: true, text: 'Volume (lbs)', color: '#8b949e' },
            ticks: { color: '#3fb950' },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  // 3. Progress Over Time — Line (for selected exercise)
  function renderProgressOverTime(canvasId, data, exerciseName) {
    destroy(canvasId);
    const ctx = getCtx(canvasId);
    if (!ctx) return;

    const filtered = data.filter(r => r.exerciseName === exerciseName);
    if (filtered.length === 0) return;

    const isRun = exerciseName.toLowerCase().includes('run');

    const labels = filtered.map(r => r.dateKey);

    const datasets = [];
    if (isRun) {
      datasets.push({
        label: 'Distance (mi)',
        data: filtered.map(r => r.distance),
        borderColor: '#f85149',
        tension: 0.3,
      });
      datasets.push({
        label: 'Duration (min)',
        data: filtered.map(r => r.duration),
        borderColor: '#d29922',
        tension: 0.3,
      });
    } else {
      datasets.push({
        label: 'Weight (lbs)',
        data: filtered.map(r => r.weight),
        borderColor: '#58a6ff',
        tension: 0.3,
      });
      datasets.push({
        label: 'Volume (lbs)',
        data: filtered.map(r => r.volume),
        borderColor: '#3fb950',
        tension: 0.3,
      });
      datasets.push({
        label: 'Reps',
        data: filtered.map(r => r.reps),
        borderColor: '#bc8cff',
        tension: 0.3,
      });
    }

    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          x: {
            ticks: { color: '#8b949e', maxTicksLimit: 10 },
            grid: { color: 'rgba(48,54,61,0.5)' },
          },
          y: {
            ticks: { color: '#8b949e' },
            grid: { color: 'rgba(48,54,61,0.5)' },
          },
        },
      },
    });
  }

  // 4. Workout Frequency Heatmap — Canvas-drawn calendar
  function renderFrequencyHeatmap(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Count workouts per day
    const dayCounts = {};
    data.forEach(r => {
      const key = r.dateKey;
      if (!dayCounts[key]) dayCounts[key] = new Set();
      dayCounts[key].add(r.workoutDay);
    });

    // Build 52-week calendar (last 52 weeks)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const cellSize = 14;
    const cellGap = 3;
    const leftPad = 30;
    const topPad = 20;
    const weeks = 53;

    const canvas = document.createElement('canvas');
    canvas.width = leftPad + weeks * (cellSize + cellGap);
    canvas.height = topPad + 7 * (cellSize + cellGap) + 10;
    container.innerHTML = '';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Day labels
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillStyle = '#8b949e';
    dayLabels.forEach((label, i) => {
      if (label) ctx.fillText(label, 0, topPad + i * (cellSize + cellGap) + 11);
    });

    // Month labels
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let lastMonth = -1;
    const d = new Date(startDate);
    for (let w = 0; w < weeks; w++) {
      const tempDate = new Date(d);
      tempDate.setDate(tempDate.getDate() + w * 7);
      const m = tempDate.getMonth();
      if (m !== lastMonth) {
        ctx.fillStyle = '#8b949e';
        ctx.fillText(months[m], leftPad + w * (cellSize + cellGap), 12);
        lastMonth = m;
      }
    }

    // Cells
    const colorScale = [
      '#161b22', // 0
      '#0e4429', // 1
      '#006d32', // 2
      '#26a641', // 3
      '#39d353', // 4+
    ];

    const currentDate = new Date(startDate);
    for (let w = 0; w < weeks; w++) {
      for (let day = 0; day < 7; day++) {
        const key = currentDate.toISOString().split('T')[0];
        const count = dayCounts[key] ? dayCounts[key].size : 0;
        const colorIdx = Math.min(count, 4);

        const x = leftPad + w * (cellSize + cellGap);
        const y = topPad + day * (cellSize + cellGap);

        ctx.fillStyle = colorScale[colorIdx];
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, 2);
        ctx.fill();

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  // 5. Volume by Exercise — Horizontal Bar
  function renderVolumeByExercise(canvasId, data) {
    destroy(canvasId);
    const ctx = getCtx(canvasId);
    if (!ctx) return;

    const volumeMap = {};
    data.forEach(r => {
      if (r.volume > 0) {
        volumeMap[r.exerciseName] = (volumeMap[r.exerciseName] || 0) + r.volume;
      }
    });

    const sorted = Object.entries(volumeMap).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([name]) => name);
    const values = sorted.map(([, vol]) => vol);

    // Height based on number of exercises
    const canvasEl = document.getElementById(canvasId);
    canvasEl.style.height = Math.max(300, sorted.length * 32) + 'px';

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Total Volume (lbs)',
          data: values,
          backgroundColor: '#58a6ff',
          borderRadius: 4,
        }],
      },
      options: {
        ...CHART_DEFAULTS,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: CHART_DEFAULTS.plugins.tooltip,
        },
        scales: {
          x: {
            ticks: { color: '#8b949e' },
            grid: { color: 'rgba(48,54,61,0.5)' },
          },
          y: {
            ticks: { color: '#8b949e', font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    });
  }

  // 6. Monthly Volume Trend — Stacked Bar
  function renderMonthlyVolume(canvasId, data) {
    destroy(canvasId);
    const ctx = getCtx(canvasId);
    if (!ctx) return;

    const monthWorkout = {};
    data.forEach(r => {
      if (!monthWorkout[r.monthKey]) monthWorkout[r.monthKey] = {};
      if (!monthWorkout[r.monthKey][r.workoutDay]) monthWorkout[r.monthKey][r.workoutDay] = 0;
      monthWorkout[r.monthKey][r.workoutDay] += r.volume;
    });

    const monthKeys = Object.keys(monthWorkout).sort();
    const workoutDays = [...new Set(data.map(r => r.workoutDay))];

    const datasets = workoutDays.map(wd => ({
      label: wd,
      data: monthKeys.map(mk => monthWorkout[mk][wd] || 0),
      backgroundColor: WORKOUT_COLORS[wd] || '#8b949e',
      borderRadius: 2,
    }));

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels: monthKeys, datasets },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          legend: {
            labels: { color: '#8b949e', font: { size: 11 } },
          },
          tooltip: CHART_DEFAULTS.plugins.tooltip,
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: '#8b949e' },
            grid: { color: 'rgba(48,54,61,0.5)' },
          },
          y: {
            stacked: true,
            title: { display: true, text: 'Volume (lbs)', color: '#8b949e' },
            ticks: { color: '#8b949e' },
            grid: { color: 'rgba(48,54,61,0.5)' },
          },
        },
      },
    });
  }

  // 7. Running Progress — Line with target overlay
  function renderRunningProgress(canvasId, data) {
    destroy(canvasId);
    const ctx = getCtx(canvasId);
    if (!ctx) return;

    const runs = data.filter(r =>
      r.workoutDay === 'Long Run' || r.workoutDay === 'Mileage Run'
    ).sort((a, b) => a.dateObj - b.dateObj);

    if (runs.length === 0) return;

    const longRuns = runs.filter(r => r.workoutDay === 'Long Run');
    const mileageRuns = runs.filter(r => r.workoutDay === 'Mileage Run');

    // Compute 10% weekly target for long runs
    let targetData = [];
    if (longRuns.length > 0) {
      const firstDistance = longRuns[0].distance || 1;
      const firstDate = longRuns[0].dateObj;
      targetData = longRuns.map(r => {
        const weeksElapsed = Math.max(0, (r.dateObj - firstDate) / (7 * 86400000));
        return {
          x: r.dateKey,
          y: +(firstDistance * Math.pow(1.1, weeksElapsed)).toFixed(2),
        };
      });
    }

    const datasets = [];

    if (longRuns.length > 0) {
      datasets.push({
        label: 'Long Run (mi)',
        data: longRuns.map(r => ({ x: r.dateKey, y: r.distance })),
        borderColor: '#f85149',
        backgroundColor: 'rgba(248,81,73,0.1)',
        tension: 0.3,
        fill: true,
      });
    }

    if (mileageRuns.length > 0) {
      datasets.push({
        label: 'Mileage Run (mi)',
        data: mileageRuns.map(r => ({ x: r.dateKey, y: r.distance })),
        borderColor: '#f0883e',
        backgroundColor: 'rgba(240,136,62,0.1)',
        tension: 0.3,
        fill: true,
      });
    }

    if (targetData.length > 0) {
      datasets.push({
        label: '10% Weekly Target',
        data: targetData,
        borderColor: 'rgba(139,148,158,0.5)',
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      });
    }

    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          x: {
            type: 'category',
            labels: [...new Set(runs.map(r => r.dateKey))].sort(),
            ticks: { color: '#8b949e', maxTicksLimit: 10 },
            grid: { color: 'rgba(48,54,61,0.5)' },
          },
          y: {
            title: { display: true, text: 'Distance (miles)', color: '#8b949e' },
            ticks: { color: '#8b949e' },
            grid: { color: 'rgba(48,54,61,0.5)' },
          },
        },
      },
    });
  }

  return {
    renderExerciseDistribution,
    renderWeeklyTrends,
    renderProgressOverTime,
    renderFrequencyHeatmap,
    renderVolumeByExercise,
    renderMonthlyVolume,
    renderRunningProgress,
    destroyAll,
  };
})();
