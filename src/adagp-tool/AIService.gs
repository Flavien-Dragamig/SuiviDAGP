/**
 * AIService.gs — Extraction vision via Gemini ou OpenAI
 * Envoie l'image à l'API IA avec le prompt adapté au type de fichier (TV ou Presse)
 * et retourne l'objet JSON parsé.
 */

/**
 * Point d'entrée : extrait les champs ADAGP d'une image.
 * Choisit automatiquement PROMPT_TV ou PROMPT_PRESSE selon le nom du fichier,
 * avec PROMPT_TV comme fallback si le type n'est pas détectable.
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

  var promptTemplate = detectMediaType(file.getName()) === 'Presse'
    ? (config.PROMPT_PRESSE || getDefaultPromptPresse())
    : (config.PROMPT_TV    || getDefaultPromptTV());

  var prompt = buildPrompt(promptTemplate, oeuvres);

  if (config.AI_PROVIDER === 'openai') {
    return callOpenAI(base64, mimeType, prompt, config);
  }
  return callGemini(base64, mimeType, prompt, config);
}

/**
 * Détecte le type de média (TV ou Presse) depuis le nom du fichier.
 * Convention : les scans presse sont dans un dossier "presses" ou ont un nom incluant
 * des indicateurs presse (pdf, Cosmo, etc.). Fallback : TV.
 * @param {string} filename
 * @returns {string} 'TV' ou 'Presse'
 */
function detectMediaType(filename) {
  var lower = filename.toLowerCase();
  // Signaux presse : PDF, noms de magazines connus, "presse"
  if (/\.pdf$/.test(lower)) return 'Presse';
  if (/cosmo|figaro|monde|obs|elle|marie|vogue|express|point|telerama|presse|magazine|journal|article/.test(lower)) return 'Presse';
  return 'TV';
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
