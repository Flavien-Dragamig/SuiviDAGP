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
