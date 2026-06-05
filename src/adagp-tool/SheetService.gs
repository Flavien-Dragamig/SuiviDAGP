var COLS_DECLARATIONS = [
  'Date du passage', 'Type de média', 'Nom du média', "Titre de l'œuvre",
  'Description / Contexte', 'Lien Drive', 'Statut', 'Date de saisie', 'ID Drive'
];

var COLS_CONFIG = ['Paramètre', 'Valeur', 'Description'];
var COLS_OEUVRES = ['Titre', 'Année', 'Technique', 'Notes'];

function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, 'Déclarations', COLS_DECLARATIONS);
  ensureSheet(ss, '⚙️ Config', COLS_CONFIG);
  ensureSheet(ss, '🎨 Œuvres', COLS_OEUVRES);
  populateDefaultConfig(ss);
  SpreadsheetApp.getUi().alert('Onglets initialisés. Renseignez DRIVE_FOLDER_ID dans ⚙️ Config et votre clé API via le menu ADAGP → Configurer la clé API.');
}

function ensureSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setFontWeight('bold');
    range.setBackground('#f3f3f3');
  }
  return sheet;
}

function populateDefaultConfig(ss) {
  var sheet = ss.getSheetByName('⚙️ Config');
  if (sheet.getLastRow() > 1) return;
  var defaults = [
    ['DRIVE_FOLDER_ID', '', "ID du dossier Google Drive (dans l'URL après /folders/)"],
    ['AI_PROVIDER', 'gemini', 'gemini ou openai'],
    ['AI_MODEL', 'gemini-2.0-flash', 'Nom du modèle IA'],
    ['PROMPT_EXTRACTION', getDefaultPrompt(), "Prompt envoyé à l'IA (modifiable)"]
  ];
  sheet.getRange(2, 1, defaults.length, 3).setValues(defaults);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 350);
}

function getDefaultPrompt() {
  return "Tu analyses une image qui est soit une capture d'écran de télévision, soit un scan de presse.\n"
    + "Extrais les informations suivantes au format JSON :\n"
    + "{\n"
    + '  "date_passage": "JJ/MM/AAAA ou vide si non visible",\n'
    + '  "type_media": "TV ou Presse ou Web",\n'
    + '  "nom_media": "nom du média ou vide",\n'
    + '  "titre_oeuvre": "titre le plus proche parmi cette liste : [LISTE_OEUVRES], ou vide si aucun match clair",\n'
    + '  "description": "résumé en 1-2 phrases du contexte d\'apparition de l\'œuvre"\n'
    + "}\n"
    + "Réponds uniquement avec le JSON, sans commentaire.";
}

function appendDeclaration(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Déclarations');
  var driveUrl = 'https://drive.google.com/file/d/' + data.fileId + '/view';
  sheet.appendRow([
    data.date_passage || '',
    data.type_media || '',
    data.nom_media || '',
    data.titre_oeuvre || '',
    data.description || '',
    driveUrl,
    'validé',
    Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy'),
    data.fileId
  ]);
  // Masquer la colonne ID Drive (colonne I = 9)
  sheet.hideColumns(9);
}

function getProcessedFileIds() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Déclarations');
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 9, sheet.getLastRow() - 1, 1)
    .getValues()
    .flat()
    .filter(Boolean);
}
