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
