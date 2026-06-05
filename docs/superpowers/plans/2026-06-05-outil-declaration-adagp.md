# Outil de déclaration ADAGP — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer un outil Google Apps Script dans un Google Sheet permettant à une adhérente ADAGP de traiter par lots ses captures/scans de passages médias via une IA de vision, de valider les champs extraits dans une interface modale, et d'insérer les lignes dans un onglet de déclarations.

**Architecture:** Le projet est entièrement en Google Apps Script (GAS), hébergé dans un Google Sheet. Il lit les fichiers d'un dossier Drive, appelle Gemini Flash (ou OpenAI) via `UrlFetchApp`, présente les résultats dans un dialogue HTML modal pour validation, et écrit les lignes validées dans l'onglet `Déclarations`. Les livrables finaux sont un `SCRIPT.md` (code assemblé, prêt à copier) et un `README.md` (guide de mise en service).

**Tech Stack:** Google Apps Script, Google Sheets API (SpreadsheetApp), Google Drive API (DriveApp), Gemini REST API (`generativelanguage.googleapis.com`), OpenAI REST API (optionnel), HTML/CSS/JS vanilla pour la UI modale.

---

## Structure des fichiers

```
src/adagp-tool/
  appsscript.json     — manifest GAS (timezone, runtimeVersion)
  Config.gs           — lecture de l'onglet ⚙️ Config + Script Properties
  SheetService.gs     — init des onglets, lecture des œuvres, écriture des déclarations
  DriveService.gs     — liste les fichiers non traités du dossier Drive
  AIService.gs        — appel Gemini ou OpenAI, retourne les champs extraits
  Menu.gs             — onOpen, menu ADAGP, getNextFile(), saveDeclaration()
  Sidebar.html        — dialogue modal de validation (HTML/CSS/JS)

docs/
  SCRIPT.md           — tout le code assemblé, prêt à copier-coller dans GAS
  README.md           — guide de mise en service de A à Z
```

---

## Task 1 : Manifest et Config.gs

**Files:**
- Create: `src/adagp-tool/appsscript.json`
- Create: `src/adagp-tool/Config.gs`

- [ ] **Créer `appsscript.json`**

```json
{
  "timeZone": "Europe/Paris",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

- [ ] **Créer `Config.gs`**

```javascript
function getConfig() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('⚙️ Config');
  var data = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) config[data[i][0]] = data[i][1];
  }
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

- [ ] **Tester manuellement dans l'éditeur GAS**

Dans l'éditeur, sélectionner `getConfig` et cliquer **Exécuter**. Vérifier dans le journal d'exécution que la fonction ne lève pas d'erreur (l'onglet Config n'existe pas encore — ce sera créé à la Task 2, mais la fonction doit retourner `{}` sans crasher).

Modifier temporairement pour tester :
```javascript
function testGetConfig() {
  Logger.log(JSON.stringify(getConfig()));
}
```
Résultat attendu : `{}` (pas d'erreur).

- [ ] **Commit**

```bash
git add src/adagp-tool/appsscript.json src/adagp-tool/Config.gs
git commit -m "feat(adagp): Config.gs — lecture config sheet + API key"
```

---

## Task 2 : SheetService.gs — initialisation des onglets

**Files:**
- Create: `src/adagp-tool/SheetService.gs`

- [ ] **Créer `SheetService.gs`**

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
    ['DRIVE_FOLDER_ID', '', 'ID du dossier Google Drive (dans l\'URL après /folders/)'],
    ['AI_PROVIDER', 'gemini', 'gemini ou openai'],
    ['AI_MODEL', 'gemini-2.0-flash', 'Nom du modèle IA'],
    ['PROMPT_EXTRACTION', getDefaultPrompt(), 'Prompt envoyé à l\'IA (modifiable)']
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
```

- [ ] **Tester `initSheets` dans l'éditeur GAS**

Sélectionner `initSheets` → Exécuter. Vérifier que 3 onglets sont créés (`Déclarations`, `⚙️ Config`, `🎨 Œuvres`) avec les en-têtes corrects et les valeurs par défaut dans Config. Si les onglets existent déjà, la fonction ne doit pas les écraser.

- [ ] **Commit**

```bash
git add src/adagp-tool/SheetService.gs
git commit -m "feat(adagp): SheetService.gs — init onglets, lecture œuvres, écriture déclarations"
```

---

## Task 3 : DriveService.gs — liste des fichiers non traités

**Files:**
- Create: `src/adagp-tool/DriveService.gs`

- [ ] **Créer `DriveService.gs`**

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
    throw new Error('DRIVE_FOLDER_ID non configuré dans l\'onglet ⚙️ Config.');
  }
  var folder = DriveApp.getFolderById(config.DRIVE_FOLDER_ID);
  var files = folder.getFiles();
  var processedIds = new Set(getProcessedFileIds());
  var result = [];
  while (files.hasNext()) {
    var file = files.next();
    if (MIME_TYPES_ACCEPTES.indexOf(file.getMimeType()) !== -1
        && !processedIds.has(file.getId())) {
      result.push({
        id: file.getId(),
        name: file.getName(),
        mimeType: file.getMimeType()
      });
    }
  }
  return result;
}
```

- [ ] **Tester `getUnprocessedFiles` dans l'éditeur GAS**

1. Renseigner `DRIVE_FOLDER_ID` dans l'onglet `⚙️ Config` avec un vrai ID de dossier Drive contenant au moins une image.
2. Sélectionner `getUnprocessedFiles` → Exécuter.
3. Dans le journal : `Logger.log(JSON.stringify(getUnprocessedFiles()))` — attendre un tableau avec `[{id, name, mimeType}]`.
4. Ajouter manuellement une ligne dans `Déclarations` avec cet ID en colonne I, relancer → vérifier que le fichier n'apparaît plus.

- [ ] **Commit**

```bash
git add src/adagp-tool/DriveService.gs
git commit -m "feat(adagp): DriveService.gs — liste fichiers Drive non traités"
```

---

## Task 4 : AIService.gs — extraction vision

**Files:**
- Create: `src/adagp-tool/AIService.gs`

- [ ] **Créer `AIService.gs`**

```javascript
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

function buildPrompt(template, oeuvres) {
  var liste = oeuvres.length > 0 ? oeuvres.join(', ') : 'aucune liste disponible';
  return template.replace('[LISTE_OEUVRES]', liste);
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

- [ ] **Tester `extractFromImage` dans l'éditeur GAS**

Créer une fonction de test :
```javascript
function testExtract() {
  var config = getConfig();
  var files = getUnprocessedFiles();
  if (files.length === 0) { Logger.log('Aucun fichier à traiter'); return; }
  var result = extractFromImage(files[0].id, config);
  Logger.log(JSON.stringify(result));
}
```
Exécuter `testExtract`. Résultat attendu dans le journal : un objet JSON avec les 5 champs (`date_passage`, `type_media`, `nom_media`, `titre_oeuvre`, `description`). Si erreur API key, vérifier que `AI_API_KEY` est bien défini dans Script Properties (Projet → Paramètres → Propriétés du script).

- [ ] **Commit**

```bash
git add src/adagp-tool/AIService.gs
git commit -m "feat(adagp): AIService.gs — extraction vision Gemini + OpenAI"
```

---

## Task 5 : Sidebar.html — dialogue modal de validation

**Files:**
- Create: `src/adagp-tool/Sidebar.html`

- [ ] **Créer `Sidebar.html`**

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
      <option>TV</option>
      <option>Presse</option>
      <option>Web</option>
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

- [ ] **Note sur le rendu** : la sidebar GAS est fixée à ~300 px de large. La mise en page est prévue pour cette contrainte (formulaire vertical, iframe preview en haut).

- [ ] **Commit**

```bash
git add src/adagp-tool/Sidebar.html
git commit -m "feat(adagp): Sidebar.html — dialogue modal de validation"
```

---

## Task 6 : Menu.gs — orchestration principale

**Files:**
- Create: `src/adagp-tool/Menu.gs`

- [ ] **Créer `Menu.gs`**

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

- [ ] **Tester le menu dans le Sheet**

Recharger le Sheet (F5 ou rouvrir). Vérifier que le menu `ADAGP` apparaît avec 4 entrées. Cliquer `Initialiser les onglets` → les 3 onglets doivent exister. Cliquer `Configurer la clé API` → coller une clé de test → confirmer l'alert "✅ Clé API enregistrée."

- [ ] **Tester `openValidationDialog` avec des fichiers réels**

1. Déposer 2–3 images dans le dossier Drive configuré.
2. Cliquer `ADAGP → Traiter les nouveaux fichiers`.
3. La sidebar s'ouvre avec le premier fichier affiché et les champs pré-remplis.
4. Corriger si besoin → Valider → passer au suivant.
5. Après validation, vérifier dans l'onglet `Déclarations` que la ligne est bien insérée avec l'ID Drive en colonne I (colonne masquée).
6. Relancer → les fichiers validés n'apparaissent plus.

- [ ] **Commit**

```bash
git add src/adagp-tool/Menu.gs
git commit -m "feat(adagp): Menu.gs — onOpen, promptApiKey, orchestration getNextFile/saveDeclaration"
```

---

## Task 7 : SCRIPT.md — code assemblé prêt à copier

**Files:**
- Create: `docs/SCRIPT.md`

- [ ] **Créer `docs/SCRIPT.md`** en assemblant tous les fichiers GAS dans l'ordre d'installation :

````markdown
# Script ADAGP — Google Apps Script

> Copier chaque bloc dans un fichier séparé dans l'éditeur Apps Script (Extensions → Apps Script).
> Nommer chaque fichier exactement comme indiqué.

---

## `appsscript.json`

> Remplacer le contenu du fichier manifest existant.

```json
[contenu de appsscript.json]
```

---

## `Config.gs`

```javascript
[contenu de Config.gs]
```

---

## `SheetService.gs`

```javascript
[contenu de SheetService.gs]
```

---

## `DriveService.gs`

```javascript
[contenu de DriveService.gs]
```

---

## `AIService.gs`

```javascript
[contenu de AIService.gs]
```

---

## `Menu.gs`

```javascript
[contenu de Menu.gs]
```

---

## `Sidebar.html`

> Dans l'éditeur, cliquer `+` → **HTML** → nommer le fichier `Sidebar`.

```html
[contenu de Sidebar.html]
```
````

> **Note pour l'agent :** substituer `[contenu de X]` par le code réel de chaque fichier depuis `src/adagp-tool/`.

- [ ] **Commit**

```bash
git add docs/SCRIPT.md
git commit -m "docs(adagp): SCRIPT.md — code complet assemblé prêt à copier"
```

---

## Task 8 : README.md — guide de mise en service

**Files:**
- Create: `README.md` (à la racine du projet)

- [ ] **Créer `README.md`** avec les sections suivantes :

```markdown
# Outil de déclaration ADAGP

Outil Google Apps Script pour déclarer les passages médias d'une adhérente ADAGP.
Analyse les captures TV et scans presse par IA, valide les champs dans un dialogue,
et enregistre les déclarations dans un Google Sheet.

---

## Prérequis

- Un compte Google avec accès à Google Drive et Google Sheets
- Une clé API **Gemini** (gratuit) : https://aistudio.google.com/apikey
  *(ou une clé OpenAI si vous préférez ce modèle)*

---

## Installation (une seule fois, ~10 minutes)

### Étape 1 — Préparer le Google Sheet

1. Créer un nouveau Google Sheet vide.
2. Lui donner un nom, ex : `Déclarations ADAGP 2026`.

### Étape 2 — Ouvrir l'éditeur Apps Script

1. Dans le Sheet : **Extensions → Apps Script**.
2. L'éditeur s'ouvre dans un nouvel onglet.

### Étape 3 — Copier le code

Pour chaque fichier dans `docs/SCRIPT.md` :

1. Dans l'éditeur, cliquer `+` à côté de "Fichiers" → choisir **Script** (ou **HTML** pour Sidebar).
2. Nommer le fichier exactement comme indiqué (sans extension).
3. Coller le contenu correspondant.
4. Pour `appsscript.json` : cliquer sur l'icône ⚙️ "Paramètres du projet" → cocher
   "Afficher le fichier manifeste" → remplacer le contenu.

Ordre des fichiers à créer :
- `Config` (Script)
- `SheetService` (Script)
- `DriveService` (Script)
- `AIService` (Script)
- `Menu` (Script)
- `Sidebar` (HTML)

### Étape 4 — Enregistrer la clé API

1. Dans l'éditeur Apps Script : **Paramètres du projet** (⚙️) → **Propriétés du script**.
2. Ajouter une propriété : Nom = `AI_API_KEY`, Valeur = votre clé Gemini ou OpenAI.
3. Cliquer **Enregistrer**.

> ⚠️ La clé n'est jamais visible dans le Sheet, elle est stockée de façon sécurisée.

### Étape 5 — Initialiser le Sheet

1. Revenir dans le Google Sheet et **recharger la page** (F5).
2. Un menu `ADAGP` apparaît dans la barre de menus.
3. Cliquer **ADAGP → Initialiser les onglets**.
4. Autoriser l'accès si demandé (Drive + Sheets + URL externe).
5. Trois onglets sont créés : `Déclarations`, `⚙️ Config`, `🎨 Œuvres`.

### Étape 6 — Configurer le dossier Drive

1. Aller dans l'onglet **⚙️ Config**.
2. Sur la ligne `DRIVE_FOLDER_ID`, coller l'ID de votre dossier Drive.
   - L'ID se trouve dans l'URL du dossier :
     `https://drive.google.com/drive/folders/**VOTRE_ID_ICI**`

### Étape 7 — Ajouter vos œuvres

1. Aller dans l'onglet **🎨 Œuvres**.
2. Remplir la liste de vos créations (une par ligne, colonne "Titre").
3. L'IA utilisera cette liste pour identifier l'œuvre visible sur chaque capture.

---

## Utilisation au quotidien

1. **Déposer** vos captures TV et scans presse dans le dossier Google Drive configuré.
   *(formats acceptés : JPG, PNG, PDF, GIF, WEBP)*

2. **Ouvrir** votre Google Sheet.

3. Cliquer **ADAGP → Traiter les nouveaux fichiers**.

4. Pour chaque fichier, un panneau s'ouvre avec :
   - L'aperçu de l'image
   - Les champs pré-remplis par l'IA
   
5. **Corriger** si besoin, puis :
   - **💾 Valider** → enregistre la ligne dans `Déclarations` et passe au suivant
   - **⏭ Ignorer** → saute ce fichier (il reviendra au prochain lancement)

6. Une fois terminé, l'onglet `Déclarations` contient toutes vos déclarations.

---

## Changer le modèle IA

Dans l'onglet **⚙️ Config** :

| Pour utiliser | Changer `AI_PROVIDER` | Changer `AI_MODEL` |
|---|---|---|
| Gemini Flash (gratuit) | `gemini` | `gemini-2.0-flash` |
| Gemini Pro | `gemini` | `gemini-1.5-pro` |
| GPT-4o mini | `openai` | `gpt-4o-mini` |
| GPT-4o | `openai` | `gpt-4o` |

Penser à mettre à jour la clé API si vous changez de fournisseur (**ADAGP → Configurer la clé API**).

---

## Modifier le prompt d'extraction

L'IA utilise le prompt visible dans la cellule `PROMPT_EXTRACTION` de l'onglet ⚙️ Config.
Vous pouvez l'ajuster directement dans la cellule si les résultats ne sont pas satisfaisants.

---

## Dépannage

| Problème | Solution |
|---|---|
| Le menu ADAGP n'apparaît pas | Recharger la page (F5) |
| "DRIVE_FOLDER_ID non configuré" | Renseigner l'ID dans ⚙️ Config |
| "Gemini API erreur 400" | Vérifier que la clé API est correcte (ADAGP → Configurer la clé API) |
| "Gemini API erreur 429" | Quota dépassé (rare pour ce volume) — réessayer dans 1 min |
| L'image ne s'affiche pas | Vérifier que le fichier est dans un Drive accessible par le compte Google |
| Extraction IA vide | Remplir manuellement — ajuster le prompt dans ⚙️ Config |
```

- [ ] **Commit**

```bash
git add README.md
git commit -m "docs(adagp): README.md — guide complet de mise en service"
```

---

## Self-review

**Couverture de la spec :**
- ✅ Menu ADAGP dans Google Sheets → `Menu.gs / onOpen`
- ✅ Lecture du dossier Drive, filtrage par type MIME → `DriveService.gs`
- ✅ Appel Gemini Flash (défaut, gratuit) → `AIService.gs / callGemini`
- ✅ Appel OpenAI (alternatif) → `AIService.gs / callOpenAI`
- ✅ Modèle configurable → onglet `⚙️ Config`, paramètres `AI_PROVIDER` + `AI_MODEL`
- ✅ Clé API sécurisée → `Script Properties` via `promptApiKey`
- ✅ Dialogue de validation HTML → `Sidebar.html`
- ✅ Œuvres référencées → onglet `🎨 Œuvres`, dropdown dans sidebar
- ✅ Écriture dans `Déclarations` + déduplication → `SheetService.gs / appendDeclaration + getProcessedFileIds`
- ✅ Bouton Ignorer (session) → `ignoredIds` côté JS sidebar
- ✅ `SCRIPT.md` (code assemblé) → Task 7
- ✅ `README.md` (guide de mise en service) → Task 8

**Cohérence des types et noms :**
- `getOeuvres()` défini dans `Config.gs`, appelé dans `AIService.gs` et `Menu.gs` ✅
- `getProcessedFileIds()` retourne `string[]`, consommé comme `new Set(...)` dans `DriveService.gs` ✅
- `appendDeclaration(data)` attend `data.fileId`, `data.date_passage`, etc. — fourni par `saveDeclaration` dans `Menu.gs` depuis le JSON sidebar ✅
- `getNextFile(ignoredIds)` retourne `{id, name, total, fields, error}` — consommé par `renderFile(file)` dans `Sidebar.html` ✅
