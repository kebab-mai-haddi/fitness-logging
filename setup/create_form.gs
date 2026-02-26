// ============================================================
// Fitness Log — Google Form + Auto-Normalization
// ============================================================
// HOW TO USE:
// 1. Go to script.google.com → New Project
// 2. Paste this entire file
// 3. Run "createFitnessForm" (authorize when prompted)
// 4. Check the Execution Log for your Form URL and Sheet ID
// 5. That's it — the form auto-normalizes data on each submit
// ============================================================

var WORKOUTS = {
  'Upper A (Push)': [
    { name: 'DB Bench Press', fields: ['weight', 'sets', 'reps'] },
    { name: 'DB Standing Shoulder Press', fields: ['weight', 'sets', 'reps'] },
    { name: 'DB Lateral Raise', fields: ['weight', 'sets', 'reps'] },
    { name: 'Machine Chest Fly', fields: ['weight', 'sets', 'reps'] },
    { name: 'BB Skullcrusher', fields: ['weight', 'sets', 'reps'] },
    { name: 'Cable OH Tricep Extension', fields: ['weight', 'sets', 'reps'] },
  ],
  'Lower A (Quad)': [
    { name: 'BB Back Squat', fields: ['weight', 'sets', 'reps'] },
    { name: 'Angled Leg Press', fields: ['weight', 'sets', 'reps'] },
    { name: 'Walking Lunges', fields: ['weight', 'sets', 'reps'] },
    { name: 'Leg Extension Machine', fields: ['weight', 'sets', 'reps'] },
    { name: 'Standing Calf Raises', fields: ['weight', 'sets', 'reps'] },
    { name: 'Weighted Plank', fields: ['weight', 'sets', 'duration'] },
  ],
  'Upper B (Pull)': [
    { name: 'BB Bent Over Row', fields: ['weight', 'sets', 'reps'] },
    { name: 'Assisted Pull-Ups', fields: ['weight', 'sets', 'reps'] },
    { name: 'Lat Machine Row', fields: ['weight', 'sets', 'reps'] },
    { name: 'Incline DB Curl', fields: ['weight', 'sets', 'reps'] },
    { name: 'Cable Reverse Curl', fields: ['weight', 'sets', 'reps'] },
    { name: 'Farmer Walk', fields: ['weight', 'sets', 'duration'] },
  ],
  'Lower B (Ham/Glute)': [
    { name: 'Romanian Deadlift', fields: ['weight', 'sets', 'reps'] },
    { name: 'Bulgarian Split Squats', fields: ['weight', 'sets', 'reps'] },
    { name: 'Glute Bridge/Hip Thrust', fields: ['weight', 'sets', 'reps'] },
    { name: 'Hamstring Curl Machine', fields: ['weight', 'sets', 'reps'] },
    { name: 'Seated Calf Raise', fields: ['weight', 'sets', 'reps'] },
    { name: 'Hanging Leg Raises', fields: ['sets', 'reps'] },
  ],
  'Long Run': [
    { name: 'Long Run', fields: ['duration', 'distance'] },
  ],
  'Mileage Run': [
    { name: 'Mileage Run', fields: ['duration', 'distance'] },
  ],
  'Other': [
    { name: '__custom__', fields: ['weight', 'sets', 'reps', 'duration', 'distance'] },
  ],
};

var FIELD_LABELS = {
  weight: 'Weight (lbs)',
  sets: 'Sets',
  reps: 'Reps',
  duration: 'Duration (min)',
  distance: 'Distance (miles)',
};

// ============================================================
// RUN THIS ONCE — creates form, sheet, and trigger
// ============================================================
function createFitnessForm() {
  var form = FormApp.create('Fitness Log');
  form.setDescription('Pick your day, fill in the numbers, done.');
  form.setConfirmationMessage('Logged!');

  // --- Page 1: Date + Workout Day ---
  form.addDateItem().setTitle('Date').setRequired(true);
  var dayItem = form.addListItem().setTitle('Workout Day').setRequired(true);

  // --- Create a section for each workout day ---
  var dayNames = Object.keys(WORKOUTS);
  var pages = {};

  for (var d = 0; d < dayNames.length; d++) {
    var dayName = dayNames[d];
    var exercises = WORKOUTS[dayName];

    var page = form.addPageBreakItem().setTitle(dayName);
    pages[dayName] = page;

    for (var e = 0; e < exercises.length; e++) {
      var ex = exercises[e];

      if (ex.name === '__custom__') {
        // "Other" section — free-form exercise name
        form.addTextItem().setTitle('Exercise Name').setRequired(true);
      } else {
        form.addSectionHeaderItem().setTitle(ex.name);
      }

      for (var f = 0; f < ex.fields.length; f++) {
        var fieldKey = ex.fields[f];
        var label = ex.name === '__custom__'
          ? FIELD_LABELS[fieldKey]
          : ex.name + ' \u2014 ' + FIELD_LABELS[fieldKey];

        var item = form.addTextItem().setTitle(label);
        item.setValidation(
          FormApp.createTextValidation().requireNumber().build()
        );
      }
    }
  }

  // --- Notes page (all paths converge here) ---
  var notesPage = form.addPageBreakItem().setTitle('Wrap Up');
  form.addParagraphTextItem().setTitle('Notes');

  // --- Set dropdown navigation ---
  var choices = [];
  for (var d = 0; d < dayNames.length; d++) {
    choices.push(dayItem.createChoice(dayNames[d], pages[dayNames[d]]));
  }
  dayItem.setChoices(choices);

  // --- After each section, skip to Notes (not the next section) ---
  // setGoToPage on a PageBreakItem redirects linear flow arriving at that page.
  // So setting it on every section except the first makes each section exit to Notes.
  for (var d = 1; d < dayNames.length; d++) {
    pages[dayNames[d]].setGoToPage(notesPage);
  }
  // After the last workout section ("Other"), linear flow goes to Notes naturally.

  // --- Create linked spreadsheet ---
  var ss = SpreadsheetApp.create('Fitness Log Data');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Create the normalized "Data" sheet the dashboard reads from
  var dataSheet = ss.insertSheet('Data');
  dataSheet.appendRow([
    'Timestamp', 'Date', 'Workout Day', 'Exercise Name',
    'Sets', 'Reps', 'Weight', 'Duration', 'Distance', 'Notes'
  ]);
  // Bold the header
  dataSheet.getRange(1, 1, 1, 10).setFontWeight('bold');

  // Store spreadsheet ID for the trigger
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  // --- Install form-submit trigger ---
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();

  // --- Log everything ---
  Logger.log('=== SETUP COMPLETE ===');
  Logger.log('Form URL (fill out): ' + form.getPublishedUrl());
  Logger.log('Form URL (edit):     ' + form.getEditUrl());
  Logger.log('Sheet URL:           ' + ss.getUrl());
  Logger.log('');
  Logger.log('>>> Sheet ID for your dashboard: ' + ss.getId());
  Logger.log('    Paste this into js/app.js CONFIG.sheetId');
}

// ============================================================
// AUTO-RUNS on every form submission — normalizes into rows
// ============================================================
function onFormSubmit(e) {
  var ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var ss = SpreadsheetApp.openById(ssId);
  var dataSheet = ss.getSheetByName('Data');

  var response = e.response;
  var timestamp = Utilities.formatDate(
    response.getTimestamp(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'
  );
  var items = response.getItemResponses();

  var date = '';
  var workoutDay = '';
  var notes = '';
  var exercises = {}; // { exerciseName: { weight, sets, reps, duration, distance } }
  var customExerciseName = '';

  for (var i = 0; i < items.length; i++) {
    var title = items[i].getItem().getTitle();
    var value = items[i].getResponse();

    if (title === 'Date') {
      date = value;
    } else if (title === 'Workout Day') {
      workoutDay = value;
    } else if (title === 'Notes') {
      notes = value || '';
    } else if (title === 'Exercise Name') {
      customExerciseName = value;
    } else if (title.indexOf(' \u2014 ') !== -1) {
      // Format: "Exercise Name — Field Label"
      var parts = title.split(' \u2014 ');
      var exName = parts[0];
      var fieldLabel = parts[1].toLowerCase();

      if (!exercises[exName]) exercises[exName] = {};

      if (fieldLabel.indexOf('weight') !== -1) exercises[exName].weight = value;
      else if (fieldLabel.indexOf('sets') !== -1) exercises[exName].sets = value;
      else if (fieldLabel.indexOf('reps') !== -1) exercises[exName].reps = value;
      else if (fieldLabel.indexOf('duration') !== -1) exercises[exName].duration = value;
      else if (fieldLabel.indexOf('distance') !== -1) exercises[exName].distance = value;
    } else {
      // Bare field labels from "Other" section (Weight, Sets, Reps, etc.)
      var fl = title.toLowerCase();
      var exKey = customExerciseName || 'Other';
      if (!exercises[exKey]) exercises[exKey] = {};

      if (fl.indexOf('weight') !== -1) exercises[exKey].weight = value;
      else if (fl.indexOf('sets') !== -1) exercises[exKey].sets = value;
      else if (fl.indexOf('reps') !== -1) exercises[exKey].reps = value;
      else if (fl.indexOf('duration') !== -1) exercises[exKey].duration = value;
      else if (fl.indexOf('distance') !== -1) exercises[exKey].distance = value;
    }
  }

  // Write one row per exercise to the Data sheet
  var exerciseNames = Object.keys(exercises);
  for (var i = 0; i < exerciseNames.length; i++) {
    var name = exerciseNames[i];
    var ex = exercises[name];

    // Skip exercises with no data filled in
    if (!ex.weight && !ex.sets && !ex.reps && !ex.duration && !ex.distance) continue;

    dataSheet.appendRow([
      timestamp,
      date,
      workoutDay,
      name,
      ex.sets || '',
      ex.reps || '',
      ex.weight || '',
      ex.duration || '',
      ex.distance || '',
      notes
    ]);
  }
}
