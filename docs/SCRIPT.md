# Script ADAGP — Google Apps Script

> Copier chaque bloc dans un fichier séparé dans l'éditeur Apps Script
> (Extensions → Apps Script). Nommer chaque fichier exactement comme indiqué.

---

## `appsscript.json`

> Remplacer le contenu du fichier manifest existant (icône ⚙️ → "Paramètres du projet" → cocher "Afficher le fichier manifeste appsscript.json").

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

> Script → Nouveau fichier → nommer `Config`

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

> Script → Nouveau fichier → nommer `SheetService`

```javascript
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
  if (!sheet) throw new Error("Onglet 'Déclarations' introuvable. Lancez ADAGP → Initialiser les onglets.");
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
```

---

## `DriveService.gs`

> Script → Nouveau fichier → nommer `DriveService`

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

> Script → Nouveau fichier → nommer `AIService`

```javascript
/**
 * AIService.gs — Extraction vision via Gemini ou OpenAI
 * Lit un fichier Drive, encode en base64, envoie à l'API choisie
 * et retourne l'objet JSON parsé (déclaration ADAGP).
 */

/**
 * Point d'entrée principal : extrait les données d'une image via IA.
 * @param {string} fileId  - ID Google Drive du fichier image
 * @param {Object} config  - Objet config issu de getConfig()
 * @returns {Object}       - Objet JSON extrait par le modèle
 */
function extractFromImage(fileId, config) {
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();
  var base64 = Utilities.base64Encode(blob.getBytes());
  var mimeType = blob.getContentType();
  var oeuvres = getOeuvres();
  var prompt = buildPrompt(config.PROMPT_EXTRACTION, oeuvres);

  if (config.AI_PROVIDER === 'openai') {
    return callOpenAI(base64, mimeType, prompt, config);
  }
  return callGemini(base64, mimeType, prompt, config);
}

/**
 * Injecte la liste des œuvres dans le template de prompt.
 * @param {string}   template - Template contenant '[LISTE_OEUVRES]'
 * @param {string[]} oeuvres  - Titres des œuvres connues
 * @returns {string}          - Prompt final
 */
function buildPrompt(template, oeuvres) {
  var liste = oeuvres.length > 0 ? oeuvres.join(', ') : 'aucune liste disponible';
  return template.split('[LISTE_OEUVRES]').join(liste);
}

/**
 * Appelle l'API Gemini (Google Generative Language) avec vision.
 * @param {string} base64   - Image encodée en base64
 * @param {string} mimeType - Type MIME de l'image (ex: image/jpeg)
 * @param {string} prompt   - Prompt d'extraction
 * @param {Object} config   - Config (AI_MODEL, AI_API_KEY)
 * @returns {Object}        - Objet JSON parsé depuis la réponse Gemini
 */
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
  // text est déjà une chaîne JSON valide grâce à response_mime_type: 'application/json'
  return JSON.parse(text);
}

/**
 * Appelle l'API OpenAI (GPT-4 Vision) avec mode JSON forcé.
 * @param {string} base64   - Image encodée en base64
 * @param {string} mimeType - Type MIME de l'image (ex: image/jpeg)
 * @param {string} prompt   - Prompt d'extraction
 * @param {Object} config   - Config (AI_MODEL, AI_API_KEY)
 * @returns {Object}        - Objet JSON parsé depuis la réponse OpenAI
 */
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

> Script → Nouveau fichier → nommer `Menu`

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

> HTML → Nouveau fichier → nommer `Sidebar` (choisir HTML, pas Script)

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
    .preview-wrap { width: 100%; height: 220px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; margin-bottom: 12px; background: #f9f9f9; }
    iframe { width: 100%; height: 100%; border: none; }
    label { display: block; font-weight: bold; margin-top: 8px; margin-bottom: 3px; font-size: 12px; }
    input[type=text], select, textarea {
      width: 100%; padding: 5px 7px; border: 1px solid #ccc;
      border-radius: 3px; font-size: 12px; font-family: Arial, sans-serif;
    }
    textarea { height: 56px; resize: vertical; }
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
    <div class="preview-wrap">
      <iframe id="preview" src="about:blank" allow="same-origin"></iframe>
    </div>

    <label>Date du passage</label>
    <input id="f-date" type="text" placeholder="JJ/MM/AAAA">

    <label>Type de média</label>
    <select id="f-type">
      <option value="">— choisir —</option>
      <option value="TV">TV</option>
      <option value="Presse">Presse</option>
      <option value="Web">Web</option>
    </select>

    <label>Nom du média</label>
    <input id="f-media" type="text" placeholder="Ex : France 5, Le Monde…">

    <label>Titre de l'œuvre</label>
    <select id="f-oeuvre"></select>

    <label>Description / Contexte</label>
    <textarea id="f-desc" placeholder="Résumé du contexte…"></textarea>

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
    var ignoredIds = [];

    function show(id) {
      ['st-loading','st-main','st-done'].forEach(function(s) {
        document.getElementById(s).style.display = s === id ? 'block' : 'none';
      });
    }

    function loadOeuvres() {
      google.script.run
        .withSuccessHandler(function(list) {
          var sel = document.getElementById('f-oeuvre');
          sel.innerHTML = '<option value="">— choisir ou laisser vide —</option>';
          list.forEach(function(o) {
            var opt = document.createElement('option');
            opt.value = o; opt.textContent = o;
            sel.appendChild(opt);
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
      document.getElementById('f-date').value  = f.date_passage  || '';
      document.getElementById('f-type').value  = f.type_media    || '';
      document.getElementById('f-media').value = f.nom_media     || '';
      document.getElementById('f-oeuvre').value = f.titre_oeuvre || '';
      document.getElementById('f-desc').value  = f.description   || '';

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
      var data = {
        fileId:        currentFileId,
        date_passage:  document.getElementById('f-date').value.trim(),
        type_media:    document.getElementById('f-type').value,
        nom_media:     document.getElementById('f-media').value.trim(),
        titre_oeuvre:  document.getElementById('f-oeuvre').value,
        description:   document.getElementById('f-desc').value.trim()
      };
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
