function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ADAGP')
    .addItem('Initialiser les onglets', 'initSheets')
    .addItem('Configurer la clé API', 'promptApiKey')
    .addSeparator()
    .addItem('Traiter les nouveaux fichiers', 'openValidationDialog')
    .addToUi();
}

function promptApiKey() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.prompt(
    'Clé API IA',
    'Collez votre clé API Gemini (Google AI Studio) ou OpenAI :',
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() === ui.Button.OK) {
    var key = result.getResponseText().trim();
    if (key) {
      PropertiesService.getScriptProperties().setProperty('AI_API_KEY', key);
      ui.alert('✅ Clé API enregistrée.');
    }
  }
}

function openValidationDialog() {
  var files = getUnprocessedFiles();
  if (files.length === 0) {
    SpreadsheetApp.getUi().alert('✅ Aucun nouveau fichier à traiter dans le dossier Drive.');
    return;
  }
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Déclarations ADAGP — ' + files.length + ' fichier(s)');
  SpreadsheetApp.getUi().showSidebar(html);
}

// Appelé par la sidebar JS : retourne le prochain fichier non traité + ses champs extraits
function getNextFile(ignoredIds) {
  var ignored = new Set(ignoredIds || []);
  var files = getUnprocessedFiles();
  var next = null;
  for (var i = 0; i < files.length; i++) {
    if (!ignored.has(files[i].id)) { next = files[i]; break; }
  }
  if (!next) return null;

  var config = getConfig();
  var fields = {};
  var error = null;
  try {
    fields = extractFromImage(next.id, config);
  } catch (e) {
    error = e.message;
  }
  return {
    id:     next.id,
    name:   next.name,
    total:  files.length,
    fields: fields,
    error:  error
  };
}

// Appelé par la sidebar JS : enregistre une déclaration validée
function saveDeclaration(data) {
  appendDeclaration(data);
}
