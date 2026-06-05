function getConfig() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('⚙️ Config');
  var config = {};
  if (!sheet) return config;
  var data = sheet.getDataRange().getValues();
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
