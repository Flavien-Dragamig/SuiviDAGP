var COLS_TV = [
  'Chaîne TV', 'Date', 'Heure', "Type d'émission", "Titre de l'émission",
  'Épisode', "Titre de l'œuvre", "Nb d'œuvres", "Type d'utilisation",
  'Commentaire', 'Lien Drive', 'Statut', 'Date de saisie', 'ID Drive'
];

var COLS_PRESSE = [
  'Titre de presse', 'Pays', 'Année de parution', "Titre de l'œuvre",
  "Nb d'images reproduites", 'Commentaires / Observations',
  'Lien Drive', 'Statut', 'Date de saisie', 'ID Drive'
];

var COLS_CONFIG = ['Paramètre', 'Valeur', 'Description'];
var COLS_OEUVRES = ['Titre', 'Année', 'Technique', 'Notes'];

function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, '📺 Déclarations TV', COLS_TV);
  ensureSheet(ss, '📰 Déclarations Presse', COLS_PRESSE);
  ensureSheet(ss, '⚙️ Config', COLS_CONFIG);
  ensureSheet(ss, '🎨 Œuvres', COLS_OEUVRES);
  populateDefaultConfig(ss);
  SpreadsheetApp.getUi().alert('Onglets initialisés. Renseignez DRIVE_FOLDER_ID dans ⚙️ Config et votre clé API via ADAGP → Configurer la clé API.');
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
    ['PROMPT_TV', getDefaultPromptTV(), "Prompt IA pour les captures TV (modifiable)"],
    ['PROMPT_PRESSE', getDefaultPromptPresse(), "Prompt IA pour les scans Presse (modifiable)"]
  ];
  sheet.getRange(2, 1, defaults.length, 3).setValues(defaults);
  sheet.setColumnWidth(2, 350);
  sheet.setColumnWidth(3, 350);
}

function getDefaultPromptTV() {
  return "Tu analyses une capture d'écran de télévision ou de plateforme vidéo à la demande.\n"
    + "L'artiste concernée est Laure Barrière (auteure de BD/romans graphiques).\n"
    + "Extrais les informations suivantes au format JSON :\n"
    + "{\n"
    + '  "type_media": "TV",\n'
    + '  "chaine_tv": "nom de la chaîne ou vide",\n'
    + '  "date": "JJ/MM/AAAA ou vide si non visible",\n'
    + '  "heure": "HH:MM ou vide si non visible",\n'
    + '  "type_emission": "Journal / Magazine / Divertissement / Documentaire / Autre ou vide",\n'
    + '  "titre_emission": "titre de l\'émission ou vide",\n'
    + '  "episode": "titre ou numéro de l\'épisode, ou vide",\n'
    + '  "titre_oeuvre": "titre le plus proche parmi cette liste : [LISTE_OEUVRES], ou vide si aucun match clair",\n'
    + '  "nb_oeuvres": 1,\n'
    + '  "type_utilisation": "Banc-titre ou Décoration ou Autre ou vide",\n'
    + '  "commentaire": "contexte d\'apparition de l\'œuvre en 1-2 phrases, ou vide"\n'
    + "}\n"
    + "Réponds uniquement avec le JSON, sans commentaire.";
}

function getDefaultPromptPresse() {
  return "Tu analyses un scan d'article de presse écrite ou de site internet.\n"
    + "L'artiste concernée est Laure Barrière (auteure de BD/romans graphiques).\n"
    + "Extrais les informations suivantes au format JSON :\n"
    + "{\n"
    + '  "type_media": "Presse",\n'
    + '  "titre_presse": "nom du magazine ou journal ou vide",\n'
    + '  "pays": "France ou autre pays ou vide",\n'
    + '  "annee": "AAAA ou vide si non visible",\n'
    + '  "titre_oeuvre": "titre le plus proche parmi cette liste : [LISTE_OEUVRES], ou vide si aucun match clair",\n'
    + '  "nb_images": 1,\n'
    + '  "commentaire": "contexte de l\'apparition de l\'œuvre en 1-2 phrases, ou vide"\n'
    + "}\n"
    + "Réponds uniquement avec le JSON, sans commentaire.";
}

function appendDeclaration(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var driveUrl = 'https://drive.google.com/file/d/' + data.fileId + '/view';
  var today = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');

  if (data.type_media === 'Presse') {
    var sheetP = ss.getSheetByName('📰 Déclarations Presse');
    if (!sheetP) throw new Error("Onglet '📰 Déclarations Presse' introuvable. Lancez ADAGP → Initialiser les onglets.");
    sheetP.appendRow([
      data.titre_presse  || '',
      data.pays          || '',
      data.annee         || '',
      data.titre_oeuvre  || '',
      data.nb_images     || 1,
      data.commentaire   || '',
      driveUrl,
      'validé',
      today,
      data.fileId
    ]);
    sheetP.hideColumns(10);
  } else {
    var sheetTV = ss.getSheetByName('📺 Déclarations TV');
    if (!sheetTV) throw new Error("Onglet '📺 Déclarations TV' introuvable. Lancez ADAGP → Initialiser les onglets.");
    sheetTV.appendRow([
      data.chaine_tv       || '',
      data.date            || '',
      data.heure           || '',
      data.type_emission   || '',
      data.titre_emission  || '',
      data.episode         || '',
      data.titre_oeuvre    || '',
      data.nb_oeuvres      || 1,
      data.type_utilisation|| '',
      data.commentaire     || '',
      driveUrl,
      'validé',
      today,
      data.fileId
    ]);
    sheetTV.hideColumns(14);
  }
}

function getProcessedFileIds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ids = [];
  var sheetTV = ss.getSheetByName('📺 Déclarations TV');
  if (sheetTV && sheetTV.getLastRow() > 1) {
    ids = ids.concat(
      sheetTV.getRange(2, 14, sheetTV.getLastRow() - 1, 1).getValues().flat().filter(Boolean)
    );
  }
  var sheetP = ss.getSheetByName('📰 Déclarations Presse');
  if (sheetP && sheetP.getLastRow() > 1) {
    ids = ids.concat(
      sheetP.getRange(2, 10, sheetP.getLastRow() - 1, 1).getValues().flat().filter(Boolean)
    );
  }
  return ids;
}
