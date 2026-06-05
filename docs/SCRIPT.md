# ADAGP — Script Google Apps Script complet

> **Mode d'emploi** : copiez chaque bloc dans le fichier correspondant de votre projet Apps Script.  
> Voir `README.md` pour le guide de mise en service complet.

---

## `appsscript.json`

```json
{
  "timeZone": "Europe/Paris",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

---

## `Config.gs`

```javascript
function getConfig() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('⚙️ Config');
  var config = {};
  if (!sheet) {
    config.AI_API_KEY = PropertiesService.getScriptProperties().getProperty('AI_API_KEY');
    return config;
  }
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) config[data[i][0]] = data[i][1];
  }
  // Clé API toujours lue depuis Script Properties (jamais depuis le sheet)
  config.AI_API_KEY = PropertiesService.getScriptProperties().getProperty('AI_API_KEY');
  return config;
}

function getOeuvres() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('🎨 Œuvres');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  return data.slice(1).map(function(row) { return row[0]; }).filter(Boolean);
}
```

---

## `SheetService.gs`

```javascript
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
      data.chaine_tv        || '',
      data.date             || '',
      data.heure            || '',
      data.type_emission    || '',
      data.titre_emission   || '',
      data.episode          || '',
      data.titre_oeuvre     || '',
      data.nb_oeuvres       || 1,
      data.type_utilisation || '',
      data.commentaire      || '',
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
```

---

## `DriveService.gs`

```javascript
var MIME_TYPES_ACCEPTES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];

function getUnprocessedFiles() {
  var config = getConfig();
  if (!config.DRIVE_FOLDER_ID) {
    throw new Error("DRIVE_FOLDER_ID non configuré dans l'onglet ⚙️ Config.");
  }
  var folder = DriveApp.getFolderById(config.DRIVE_FOLDER_ID);
  var files = folder.getFiles();
  var processedIds = new Set(getProcessedFileIds());
  var result = [];
  while (files.hasNext()) {
    var file = files.next();
    var mimeType = file.getMimeType();
    var id = file.getId();
    if (MIME_TYPES_ACCEPTES.indexOf(mimeType) !== -1 && !processedIds.has(id)) {
      result.push({ id: id, name: file.getName(), mimeType: mimeType });
    }
  }
  return result;
}
```

---

## `AIService.gs`

```javascript
/**
 * AIService.gs — Extraction vision via Gemini ou OpenAI
 * Envoie l'image à l'API IA avec le prompt adapté au type de fichier (TV ou Presse)
 * et retourne l'objet JSON parsé.
 */

function extractFromImage(fileId, config) {
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();
  var base64 = Utilities.base64Encode(blob.getBytes());
  var mimeType = blob.getContentType();
  var oeuvres = getOeuvres();

  var promptTemplate = detectMediaType(file.getName()) === 'Presse'
    ? (config.PROMPT_PRESSE || getDefaultPromptPresse())
    : (config.PROMPT_TV    || getDefaultPromptTV());

  var prompt = buildPrompt(promptTemplate, oeuvres);

  if (config.AI_PROVIDER === 'openai') {
    return callOpenAI(base64, mimeType, prompt, config);
  }
  return callGemini(base64, mimeType, prompt, config);
}

function detectMediaType(filename) {
  var lower = filename.toLowerCase();
  if (/\.pdf$/.test(lower)) return 'Presse';
  if (/cosmo|figaro|monde|obs|elle|marie|vogue|express|point|telerama|presse|magazine|journal|article/.test(lower)) return 'Presse';
  return 'TV';
}

function buildPrompt(template, oeuvres) {
  var liste = oeuvres.length > 0 ? oeuvres.join(', ') : 'aucune liste disponible';
  return template.split('[LISTE_OEUVRES]').join(liste);
}

function callGemini(base64, mimeType, prompt, config) {
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + config.AI_MODEL + ':generateContent?key=' + config.AI_API_KEY;
  var payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64 } }
      ]
    }],
    generationConfig: { response_mime_type: 'application/json' }
  };
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code !== 200) {
    throw new Error('Gemini API erreur ' + code + ' : ' + response.getContentText());
  }
  var result = JSON.parse(response.getContentText());
  var text = result.candidates[0].content.parts[0].text;
  return JSON.parse(text);
}

function callOpenAI(base64, mimeType, prompt, config) {
  var url = 'https://api.openai.com/v1/chat/completions';
  var payload = {
    model: config.AI_MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64 } }
      ]
    }],
    response_format: { type: 'json_object' }
  };
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + config.AI_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code !== 200) {
    throw new Error('OpenAI API erreur ' + code + ' : ' + response.getContentText());
  }
  var result = JSON.parse(response.getContentText());
  return JSON.parse(result.choices[0].message.content);
}
```

---

## `Menu.gs`

```javascript
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
```

---

## `Sidebar.html`

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 16px; font-size: 13px; color: #333; }
    h3 { margin: 0 0 4px; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .progress { color: #888; font-size: 12px; margin-bottom: 10px; }
    .media-badge { display: inline-block; font-size: 11px; font-weight: bold; padding: 2px 7px; border-radius: 10px; margin-bottom: 8px; }
    .badge-tv { background: #e8f0fe; color: #1a73e8; }
    .badge-presse { background: #fce8e6; color: #c5221f; }
    .preview-wrap { width: 100%; height: 200px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; margin-bottom: 12px; background: #f9f9f9; }
    iframe { width: 100%; height: 100%; border: none; }
    label { display: block; font-weight: bold; margin-top: 8px; margin-bottom: 3px; font-size: 12px; }
    input[type=text], input[type=number], select, textarea {
      width: 100%; padding: 5px 7px; border: 1px solid #ccc;
      border-radius: 3px; font-size: 12px; font-family: Arial, sans-serif;
    }
    textarea { height: 52px; resize: vertical; }
    .row2 { display: flex; gap: 8px; }
    .row2 > div { flex: 1; }
    .error-box { color: #c00; font-size: 11px; margin-top: 6px; padding: 6px 8px; background: #fff0f0; border-radius: 3px; }
    .buttons { margin-top: 14px; display: flex; gap: 8px; }
    .btn-skip { flex: 1; padding: 8px 4px; background: #f1f3f4; border: 1px solid #ccc; cursor: pointer; border-radius: 4px; font-size: 12px; }
    .btn-skip:hover { background: #e8eaed; }
    .btn-save { flex: 2; padding: 8px 4px; background: #1a73e8; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold; font-size: 13px; }
    .btn-save:hover:not(:disabled) { background: #1557b0; }
    .btn-save:disabled { background: #aaa; cursor: default; }
    .state-msg { text-align: center; padding: 60px 20px; color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <div id="st-loading" class="state-msg">⏳ Chargement...</div>

  <div id="st-main" style="display:none">
    <h3 id="filename" title=""></h3>
    <div class="progress" id="progress"></div>
    <span id="media-badge" class="media-badge"></span>
    <div class="preview-wrap">
      <iframe id="preview" src="about:blank" allow="same-origin"></iframe>
    </div>

    <!-- Formulaire TV -->
    <div id="form-tv" style="display:none">
      <div class="row2">
        <div>
          <label>Chaîne TV</label>
          <input id="tv-chaine" type="text" placeholder="Ex : France 4">
        </div>
        <div>
          <label>Type d'émission</label>
          <select id="tv-type-emission">
            <option value="">— choisir —</option>
            <option value="Journal">Journal</option>
            <option value="Magazine">Magazine</option>
            <option value="Divertissement">Divertissement</option>
            <option value="Documentaire">Documentaire</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
      </div>
      <div class="row2">
        <div>
          <label>Date (JJ/MM/AAAA)</label>
          <input id="tv-date" type="text" placeholder="27/10/2025">
        </div>
        <div>
          <label>Heure (HH:MM)</label>
          <input id="tv-heure" type="text" placeholder="19:30">
        </div>
      </div>
      <label>Titre de l'émission</label>
      <input id="tv-titre-emission" type="text" placeholder="Ex : Les Maternelles">
      <label>Épisode</label>
      <input id="tv-episode" type="text" placeholder="Titre ou numéro (facultatif)">
      <label>Titre de l'œuvre</label>
      <select id="tv-oeuvre"></select>
      <div class="row2">
        <div>
          <label>Nb d'œuvres</label>
          <input id="tv-nb-oeuvres" type="number" min="1" value="1">
        </div>
        <div>
          <label>Type d'utilisation</label>
          <select id="tv-type-utilisation">
            <option value="">— choisir —</option>
            <option value="Banc-titre">Banc-titre</option>
            <option value="Décoration">Décoration</option>
            <option value="Générique">Générique</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
      </div>
      <label>Commentaire</label>
      <textarea id="tv-commentaire" placeholder="Contexte de l'apparition…"></textarea>
    </div>

    <!-- Formulaire Presse -->
    <div id="form-presse" style="display:none">
      <label>Titre de presse</label>
      <input id="pr-titre" type="text" placeholder="Ex : Cosmopolitan, Le Figaro…">
      <div class="row2">
        <div>
          <label>Pays</label>
          <input id="pr-pays" type="text" placeholder="France">
        </div>
        <div>
          <label>Année de parution</label>
          <input id="pr-annee" type="text" placeholder="2026">
        </div>
      </div>
      <label>Titre de l'œuvre</label>
      <select id="pr-oeuvre"></select>
      <label>Nb d'images reproduites</label>
      <input id="pr-nb-images" type="number" min="1" value="1">
      <label>Commentaires / Observations</label>
      <textarea id="pr-commentaire" placeholder="Contexte de l'apparition…"></textarea>
    </div>

    <div id="ai-error" class="error-box" style="display:none"></div>

    <div class="buttons">
      <button class="btn-skip" onclick="skipFile()">⏭ Ignorer</button>
      <button class="btn-save" id="btn-save" onclick="saveFile()">💾 Valider</button>
    </div>
  </div>

  <div id="st-done" class="state-msg" style="display:none">
    ✅ Tous les fichiers ont été traités !
  </div>

  <script>
    var currentFileId = null;
    var currentType = 'TV';
    var ignoredIds = [];

    function show(id) {
      ['st-loading','st-main','st-done'].forEach(function(s) {
        document.getElementById(s).style.display = s === id ? 'block' : 'none';
      });
    }

    function loadOeuvres() {
      google.script.run
        .withSuccessHandler(function(list) {
          ['tv-oeuvre','pr-oeuvre'].forEach(function(selId) {
            var sel = document.getElementById(selId);
            sel.innerHTML = '<option value="">— choisir ou laisser vide —</option>';
            list.forEach(function(o) {
              var opt = document.createElement('option');
              opt.value = o; opt.textContent = o;
              sel.appendChild(opt);
            });
          });
          loadNext();
        })
        .withFailureHandler(onError)
        .getOeuvres();
    }

    function loadNext() {
      show('st-loading');
      google.script.run
        .withSuccessHandler(renderFile)
        .withFailureHandler(onError)
        .getNextFile(ignoredIds);
    }

    function renderFile(file) {
      if (!file) { show('st-done'); return; }
      currentFileId = file.id;
      document.getElementById('filename').textContent = file.name;
      document.getElementById('filename').title = file.name;
      document.getElementById('progress').textContent =
        'Fichier ' + (ignoredIds.length + 1) + ' sur ' + file.total + ' non traité(s)';
      document.getElementById('preview').src =
        'https://drive.google.com/file/d/' + file.id + '/preview';

      var f = file.fields || {};
      currentType = (f.type_media === 'Presse') ? 'Presse' : 'TV';

      var badge = document.getElementById('media-badge');
      if (currentType === 'Presse') {
        badge.textContent = '📰 Presse';
        badge.className = 'media-badge badge-presse';
        document.getElementById('form-tv').style.display = 'none';
        document.getElementById('form-presse').style.display = 'block';
        document.getElementById('pr-titre').value       = f.titre_presse || '';
        document.getElementById('pr-pays').value        = f.pays         || 'France';
        document.getElementById('pr-annee').value       = f.annee        || '';
        document.getElementById('pr-oeuvre').value      = f.titre_oeuvre || '';
        document.getElementById('pr-nb-images').value   = f.nb_images    || 1;
        document.getElementById('pr-commentaire').value = f.commentaire  || '';
      } else {
        badge.textContent = '📺 TV';
        badge.className = 'media-badge badge-tv';
        document.getElementById('form-presse').style.display = 'none';
        document.getElementById('form-tv').style.display = 'block';
        document.getElementById('tv-chaine').value           = f.chaine_tv         || '';
        document.getElementById('tv-date').value             = f.date              || '';
        document.getElementById('tv-heure').value            = f.heure             || '';
        document.getElementById('tv-type-emission').value    = f.type_emission     || '';
        document.getElementById('tv-titre-emission').value   = f.titre_emission    || '';
        document.getElementById('tv-episode').value          = f.episode           || '';
        document.getElementById('tv-oeuvre').value           = f.titre_oeuvre      || '';
        document.getElementById('tv-nb-oeuvres').value       = f.nb_oeuvres        || 1;
        document.getElementById('tv-type-utilisation').value = f.type_utilisation  || '';
        document.getElementById('tv-commentaire').value      = f.commentaire       || '';
      }

      var errBox = document.getElementById('ai-error');
      if (file.error) {
        errBox.style.display = 'block';
        errBox.textContent = '⚠️ Extraction IA échouée : ' + file.error + '. Remplissez manuellement.';
      } else {
        errBox.style.display = 'none';
      }
      document.getElementById('btn-save').disabled = false;
      document.getElementById('btn-save').textContent = '💾 Valider';
      show('st-main');
    }

    function saveFile() {
      var btn = document.getElementById('btn-save');
      btn.disabled = true;
      btn.textContent = 'Enregistrement…';

      var data = { fileId: currentFileId, type_media: currentType };
      if (currentType === 'Presse') {
        data.titre_presse = document.getElementById('pr-titre').value.trim();
        data.pays         = document.getElementById('pr-pays').value.trim();
        data.annee        = document.getElementById('pr-annee').value.trim();
        data.titre_oeuvre = document.getElementById('pr-oeuvre').value;
        data.nb_images    = parseInt(document.getElementById('pr-nb-images').value, 10) || 1;
        data.commentaire  = document.getElementById('pr-commentaire').value.trim();
      } else {
        data.chaine_tv        = document.getElementById('tv-chaine').value.trim();
        data.date             = document.getElementById('tv-date').value.trim();
        data.heure            = document.getElementById('tv-heure').value.trim();
        data.type_emission    = document.getElementById('tv-type-emission').value;
        data.titre_emission   = document.getElementById('tv-titre-emission').value.trim();
        data.episode          = document.getElementById('tv-episode').value.trim();
        data.titre_oeuvre     = document.getElementById('tv-oeuvre').value;
        data.nb_oeuvres       = parseInt(document.getElementById('tv-nb-oeuvres').value, 10) || 1;
        data.type_utilisation = document.getElementById('tv-type-utilisation').value;
        data.commentaire      = document.getElementById('tv-commentaire').value.trim();
      }

      google.script.run
        .withSuccessHandler(loadNext)
        .withFailureHandler(function(e) {
          btn.disabled = false;
          btn.textContent = '💾 Valider';
          alert('Erreur enregistrement : ' + e.message);
        })
        .saveDeclaration(data);
    }

    function skipFile() {
      ignoredIds.push(currentFileId);
      loadNext();
    }

    function onError(e) {
      show('st-loading');
      document.getElementById('st-loading').textContent = '❌ Erreur : ' + e.message;
    }

    loadOeuvres();
  </script>
</body>
</html>
```
