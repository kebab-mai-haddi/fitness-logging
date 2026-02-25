# Fitness Logging Dashboard

A zero-cost, zero-maintenance personal fitness dashboard. Log workouts via Google Form on your phone, view charts on a static website (GitHub Pages).

## Architecture

```
Google Form (phone) → Google Sheet (auto) → Static Website (GitHub Pages)
                                              ↓
                                           Chart.js charts
```

No frameworks, no build tools, no server, no database.

---

## Setup Guide

### 1. Create the Google Form

Go to [Google Forms](https://forms.google.com) and create a new form with these fields **in order**:

| # | Field | Type | Required |
|---|-------|------|----------|
| 1 | Date | Date picker | Yes |
| 2 | Workout Day | Dropdown | Yes |
| 3 | Exercise Name | Dropdown | Yes |
| 4 | Sets | Number (Short answer) | No |
| 5 | Reps | Number (Short answer) | No |
| 6 | Weight (lbs) | Number (Short answer) | No |
| 7 | Duration (min) | Number (Short answer) | No |
| 8 | Distance (miles) | Number (Short answer) | No |
| 9 | Notes | Paragraph | No |

**Workout Day options:**
- Upper A (Push)
- Lower A (Quad)
- Upper B (Pull)
- Lower B (Ham/Glute)
- Long Run
- Mileage Run
- Other

**Exercise Name options:**
- DB Bench Press
- DB Standing Shoulder Press
- DB Lateral Raise
- Machine Chest Fly
- BB Skullcrusher
- Cable OH Tricep Extension
- BB Back Squat
- Angled Leg Press
- Walking Lunges
- Leg Extension Machine
- Standing Calf Raises
- Weighted Plank
- BB Bent Over Row
- Assisted Pull-Ups
- Lat Machine Row
- Incline DB Curl
- Cable Reverse Curl
- Farmer Walk
- Romanian Deadlift
- Bulgarian Split Squats
- Glute Bridge/Hip Thrust
- Hamstring Curl Machine
- Seated Calf Raise
- Hanging Leg Raises
- Long Run
- Mileage Run
- Other

### 2. Link to Google Sheets

1. In your Google Form, click the **Responses** tab
2. Click the green Sheets icon to create a linked spreadsheet
3. Name it something like "Fitness Log"

### 3. Publish the Sheet

1. Open the linked Google Sheet
2. Go to **File → Share → Publish to web**
3. Select **Entire Document** and **Web page**, then click **Publish**
4. Also click **Share** (top right) → Change to **Anyone with the link** → **Viewer**

### 4. Get the Sheet ID

The Sheet ID is the long string in the URL between `/d/` and `/edit`:

```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       This is your Sheet ID
```

### 5. Configure the Dashboard

Open `index.html` in a browser. On first load, you'll see a setup prompt. Paste in your Sheet ID and (optionally) your Google Form URL.

Alternatively, edit `js/app.js` and set the values in the `CONFIG` object directly:

```js
const CONFIG = {
  sheetId: 'YOUR_SHEET_ID_HERE',
  formUrl: 'YOUR_FORM_URL_HERE',
};
```

### 6. Test Locally

```bash
cd fitness_logging
python3 -m http.server 8000
```

Open http://localhost:8000 in your browser.

### 7. Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/fitness-logging.git
git push -u origin main
```

Then go to **Settings → Pages → Source: main branch** and save. Your dashboard will be live at `https://YOUR_USERNAME.github.io/fitness-logging/`.

---

## Dashboard Features

- **Overview** — Exercise distribution (doughnut) + weekly workout trends (dual-axis line)
- **Progress** — Track weight/volume/reps over time for any exercise
- **Frequency** — GitHub-style heatmap of workout days over the past year
- **Volume** — Total volume by exercise (bar) + monthly volume trend (stacked bar)
- **Runs** — Running distance over time with 10% weekly progression target
- **History** — Sortable table of all logged workouts

All charts are dark-themed and responsive. Data is cached locally for 5 minutes.

---

## Program Reference

**4-Day Push/Pull/Legs Split:**

| Day | Focus | Exercises |
|-----|-------|-----------|
| Upper A | Push | DB Bench, DB Shoulder Press, Lateral Raise, Chest Fly, Skullcrusher, Tricep Extension |
| Lower A | Quad | Back Squat, Leg Press, Walking Lunges, Leg Extension, Calf Raises, Weighted Plank |
| Upper B | Pull | Bent Over Row, Pull-Ups, Lat Row, DB Curl, Reverse Curl, Farmer Walk |
| Lower B | Ham/Glute | RDL, Bulgarian Split Squat, Hip Thrust, Hamstring Curl, Seated Calf Raise, Hanging Leg Raises |

**Running:** 1 long run/week (10% weekly distance increment) + 1 mileage-building run
