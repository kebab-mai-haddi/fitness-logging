// data.js — Google Sheets fetch, parse, enrich, cache

const FitnessData = (() => {
  const CACHE_KEY = 'fitness_data_cache';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const COLUMNS = [
    'timestamp', 'date', 'workoutDay', 'exerciseName',
    'sets', 'reps', 'weight', 'duration', 'distance', 'notes'
  ];

  function getGvizUrl(sheetId) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  }

  function getCsvUrl(sheetId) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  }

  function parseGvizResponse(text) {
    // Strip the callback wrapper: google.visualization.Query.setResponse({...})
    const match = text.match(/google\.visualization\.Query\.setResponse\(({.*})\)/s);
    if (!match) {
      // Try stripping any prefix like /*O_o*/ or setResponse(...)
      const alt = text.replace(/^[^{]*/, '').replace(/\);?\s*$/, '');
      return JSON.parse(alt);
    }
    return JSON.parse(match[1]);
  }

  function gvizToRows(gvizData) {
    const cols = gvizData.table.cols;
    const rows = gvizData.table.rows;
    return rows.map(row => {
      const obj = {};
      row.c.forEach((cell, i) => {
        if (i >= COLUMNS.length) return;
        const key = COLUMNS[i];
        if (!cell || cell.v === null || cell.v === undefined) {
          obj[key] = null;
          return;
        }
        // gviz date values come as "Date(year,month,day)"
        if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
          const parts = cell.v.replace('Date(', '').replace(')', '').split(',').map(Number);
          obj[key] = new Date(parts[0], parts[1], parts[2]).toISOString().split('T')[0];
        } else if (cell.f && (key === 'date' || key === 'timestamp')) {
          // Use formatted value for dates if available
          obj[key] = cell.f;
        } else {
          obj[key] = cell.v;
        }
      });
      return obj;
    });
  }

  function parseCsvToRows(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    // Skip header row
    return lines.slice(1).map(line => {
      const values = parseCsvLine(line);
      const obj = {};
      COLUMNS.forEach((key, i) => {
        const raw = values[i] || '';
        if (['sets', 'reps', 'weight', 'duration', 'distance'].includes(key)) {
          obj[key] = raw ? parseFloat(raw) : null;
        } else {
          obj[key] = raw || null;
        }
      });
      return obj;
    });
  }

  function parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          values.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    values.push(current.trim());
    return values;
  }

  function normalizeRow(row) {
    const sets = row.sets ? Number(row.sets) : null;
    const reps = row.reps ? Number(row.reps) : null;
    const weight = row.weight ? Number(row.weight) : null;
    const duration = row.duration ? Number(row.duration) : null;
    const distance = row.distance ? Number(row.distance) : null;

    // Parse date — handle various formats
    let dateStr = row.date || row.timestamp;
    let dateObj = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(dateObj.getTime()) && dateStr) {
      // Try M/D/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        dateObj = new Date(parts[2], parts[0] - 1, parts[1]);
      }
    }
    const dateKey = dateObj.toISOString().split('T')[0];

    // Week key: ISO week start (Monday)
    const monday = new Date(dateObj);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    const weekKey = monday.toISOString().split('T')[0];

    // Month key
    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

    // Volume = sets * reps * weight (only when all three are present)
    const volume = (sets && reps && weight) ? sets * reps * weight : 0;

    return {
      date: dateKey,
      dateObj,
      workoutDay: row.workoutDay || 'Other',
      exerciseName: row.exerciseName || 'Unknown',
      sets,
      reps,
      weight,
      duration,
      distance,
      notes: row.notes || '',
      volume,
      dateKey,
      weekKey,
      monthKey,
    };
  }

  function getCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) return null;
      return data;
    } catch {
      return null;
    }
  }

  function setCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch {
      // localStorage might be full or unavailable
    }
  }

  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  }

  async function fetchData(sheetId, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = getCache();
      if (cached) return cached.map(r => ({ ...r, dateObj: new Date(r.date) }));
    }

    let rows;

    // Try gviz JSON endpoint first
    try {
      const resp = await fetch(getGvizUrl(sheetId));
      const text = await resp.text();
      const gviz = parseGvizResponse(text);
      rows = gvizToRows(gviz);
    } catch (e) {
      console.warn('gviz fetch failed, trying CSV fallback:', e);
      // Fallback to CSV
      const resp = await fetch(getCsvUrl(sheetId));
      const text = await resp.text();
      rows = parseCsvToRows(text);
    }

    const normalized = rows
      .map(normalizeRow)
      .filter(r => r.exerciseName !== 'Unknown')
      .sort((a, b) => a.dateObj - b.dateObj);

    setCache(normalized);
    return normalized;
  }

  return { fetchData, clearCache };
})();
