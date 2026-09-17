const APP_CONFIG = {
  CONFIG_SHEET_NAME: 'App Config',
  PRODUCTS_SHEET_NAME: 'Products',
  SYSTEM_COLUMNS: [
    'Record ID',
    'Timestamp',
    'UPC',
    'Title',
    'COG',
    'Quantity',
    'Drive Folder',
    'Photo 1',
    'Photo 2',
    'Photo 3',
    'Photo 4',
    'Photo 5'
  ],
  DEFAULT_FIELDS: [
    { id: 'title', name: 'Title', type: 'text', required: true, system: true, options: [] },
    { id: 'cog', name: 'COG', type: 'number', required: true, system: true, options: [] },
    { id: 'quantity', name: 'Quantity', type: 'number', required: true, system: true, options: [] }
  ],
  ALLOWED_FIELD_TYPES: ['text', 'number', 'dropdown', 'date', 'checkbox', 'longtext'],
  MAX_PHOTOS: 5
};

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Product Hunting')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('No data received');
    }
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload;
    let result;

    switch (action) {
      case 'getAppSetup':
        result = getAppSetup();
        break;
      case 'createNewSpreadsheet':
        result = createNewSpreadsheet(payload);
        break;
      case 'connectSpreadsheet':
        result = connectSpreadsheet(payload);
        break;
      case 'disconnectSpreadsheet':
        result = disconnectSpreadsheet();
        break;
      case 'getProductFields':
        result = getProductFields();
        break;
      case 'saveProductFields':
        result = saveProductFields(payload);
        break;
      case 'connectDriveFolder':
        result = connectDriveFolder(payload);
        break;
      case 'createNewDriveFolder':
        result = createNewDriveFolder(payload);
        break;
      case 'disconnectDriveFolder':
        result = disconnectDriveFolder();
        break;
      case 'saveProduct':
        result = saveProduct(payload);
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message || String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* ========================= APP SETUP ========================= */
function getAppSetup() {
  const properties = PropertiesService.getUserProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  const driveFolderId = properties.getProperty('DRIVE_FOLDER_ID');

  let spreadsheetInfo = { connected: false };
  let driveInfo = { connected: false };

  if (spreadsheetId) {
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      spreadsheetInfo = {
        connected: true,
        spreadsheetId: spreadsheet.getId(),
        spreadsheetName: spreadsheet.getName(),
        spreadsheetUrl: spreadsheet.getUrl()
      };
    } catch (error) {
      properties.deleteProperty('SPREADSHEET_ID');
    }
  }

  if (driveFolderId) {
    try {
      const folder = DriveApp.getFolderById(driveFolderId);
      driveInfo = {
        connected: true,
        folderId: folder.getId(),
        folderName: folder.getName(),
        folderUrl: folder.getUrl()
      };
    } catch (error) {
      properties.deleteProperty('DRIVE_FOLDER_ID');
    }
  }

  return { spreadsheet: spreadsheetInfo, drive: driveInfo };
}

/* ========================= SHEETS ========================= */
function createNewSpreadsheet(name) {
  name = String(name || '').trim() || 'Product Hunting Database';
  const spreadsheet = SpreadsheetApp.create(name);
  setupSpreadsheet(spreadsheet);
  saveSpreadsheetConnection(spreadsheet.getId());
  return {
    success: true,
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl()
  };
}

function connectSpreadsheet(spreadsheetIdOrUrl) {
  const value = String(spreadsheetIdOrUrl || '').trim();
  if (!value) throw new Error('Please enter a Google Sheet URL or ID.');

  const spreadsheetId = extractSpreadsheetId(value);
  if (!spreadsheetId) throw new Error('Invalid Google Sheet URL or ID.');

  let spreadsheet;
  try {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    throw new Error('Could not access this Google Sheet. Make sure you have access to it.');
  }

  setupSpreadsheet(spreadsheet);
  saveSpreadsheetConnection(spreadsheet.getId());
  return {
    success: true,
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl()
  };
}

function disconnectSpreadsheet() {
  PropertiesService.getUserProperties().deleteProperty('SPREADSHEET_ID');
  return { success: true };
}

function setupSpreadsheet(spreadsheet) {
  let productsSheet = spreadsheet.getSheetByName(APP_CONFIG.PRODUCTS_SHEET_NAME);
  if (!productsSheet) productsSheet = spreadsheet.insertSheet(APP_CONFIG.PRODUCTS_SHEET_NAME);
  ensureHeaders(productsSheet, APP_CONFIG.SYSTEM_COLUMNS);

  let configSheet = spreadsheet.getSheetByName(APP_CONFIG.CONFIG_SHEET_NAME);
  if (!configSheet) configSheet = spreadsheet.insertSheet(APP_CONFIG.CONFIG_SHEET_NAME);
  ensureConfigSheet(configSheet);
  ensureDefaultFields(configSheet);
}

function ensureHeaders(sheet, requiredHeaders) {
  const lastColumn = sheet.getLastColumn();
  let existingHeaders = [];
  if (lastColumn > 0) {
    existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
      .map(value => String(value).trim())
      .filter(value => value !== '');
  }

  const finalHeaders = [...existingHeaders];
  requiredHeaders.forEach(header => {
    if (!finalHeaders.includes(header)) finalHeaders.push(header);
  });

  if (finalHeaders.length > 0) {
    sheet.getRange(1, 1, 1, finalHeaders.length).setValues([finalHeaders]);
  }
  sheet.setFrozenRows(1);
}

function ensureConfigSheet(sheet) {
  ensureHeaders(sheet, ['Key', 'Value']);
}

function ensureDefaultFields(configSheet) {
  const existing = getFieldsFromConfigSheet(configSheet);
  if (existing.length === 0) saveFieldsToConfigSheet(configSheet, APP_CONFIG.DEFAULT_FIELDS);
}

/* ========================= PRODUCT FIELD CONFIG ========================= */
function getProductFields() {
  const spreadsheet = getConnectedSpreadsheet();
  const configSheet = spreadsheet.getSheetByName(APP_CONFIG.CONFIG_SHEET_NAME);
  if (!configSheet) throw new Error('Configuration sheet does not exist.');

  let fields = getFieldsFromConfigSheet(configSheet);
  if (fields.length === 0) {
    fields = APP_CONFIG.DEFAULT_FIELDS.map(cloneField);
    saveFieldsToConfigSheet(configSheet, fields);
  }
  return fields;
}

function saveProductFields(fields) {
  if (!Array.isArray(fields)) throw new Error('Invalid product fields.');

  const cleanedFields = [];
  const usedIds = new Set();
  const usedNames = new Set();

  fields.forEach(field => {
    if (!field) return;
    const id = String(field.id || '').trim();
    const name = String(field.name || '').trim();
    const type = String(field.type || 'text').trim();
    const required = Boolean(field.required);
    const system = Boolean(field.system);

    if (!id || !name) return;
    if (!APP_CONFIG.ALLOWED_FIELD_TYPES.includes(type)) {
      throw new Error('Unsupported field type: ' + type);
    }
    if (usedIds.has(id)) throw new Error('Duplicate field ID: ' + id);

    const normalizedName = name.toLowerCase();
    if (usedNames.has(normalizedName)) throw new Error('Duplicate field name: ' + name);

    usedIds.add(id);
    usedNames.add(normalizedName);

    cleanedFields.push({
      id,
      name,
      type,
      required,
      system,
      options: Array.isArray(field.options) ? field.options.map(v => String(v)) : []
    });
  });

  const requiredSystemFields = APP_CONFIG.DEFAULT_FIELDS.map(cloneField);
  requiredSystemFields.forEach(requiredField => {
    const existingIndex = cleanedFields.findIndex(field => field.id === requiredField.id);
    if (existingIndex === -1) {
      cleanedFields.unshift(requiredField);
    } else {
      cleanedFields[existingIndex] = requiredField;
    }
  });

  const spreadsheet = getConnectedSpreadsheet();
  const configSheet = spreadsheet.getSheetByName(APP_CONFIG.CONFIG_SHEET_NAME);
  saveFieldsToConfigSheet(configSheet, cleanedFields);

  const productsSheet = spreadsheet.getSheetByName(APP_CONFIG.PRODUCTS_SHEET_NAME);
  ensureHeaders(productsSheet, cleanedFields.map(field => field.name));
  return cleanedFields;
}

function getFieldsFromConfigSheet(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const fields = [];

  values.forEach(row => {
    const key = String(row[0] || '').trim();
    const value = String(row[1] || '').trim();
    if (key !== 'PRODUCT_FIELDS') return;

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) fields.push(...parsed);
    } catch (error) {
      throw new Error('Product field configuration is invalid.');
    }
  });

  return fields;
}

function saveFieldsToConfigSheet(sheet, fields) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    values.forEach((row, index) => {
      if (String(row[0] || '').trim() === 'PRODUCT_FIELDS') {
        sheet.getRange(index + 2, 1, 1, 2).clearContent();
      }
    });
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, 2).setValues([
    ['PRODUCT_FIELDS', JSON.stringify(fields)]
  ]);
}

/* ========================= DRIVE CONNECTION ========================= */
function connectDriveFolder(folderIdOrUrl) {
  const value = String(folderIdOrUrl || '').trim();
  if (!value) throw new Error('Please enter a Google Drive folder URL or ID.');

  const folderId = extractDriveFolderId(value);
  if (!folderId) throw new Error('Invalid Google Drive folder URL or ID.');

  let folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (error) {
    throw new Error('Could not access this Google Drive folder.');
  }

  saveDriveConnection(folder.getId());
  return {
    success: true,
    folderId: folder.getId(),
    folderName: folder.getName(),
    folderUrl: folder.getUrl()
  };
}

function createNewDriveFolder(name) {
  name = String(name || '').trim() || 'Product Hunting';
  const folder = DriveApp.createFolder(name);
  saveDriveConnection(folder.getId());
  return {
    success: true,
    folderId: folder.getId(),
    folderName: folder.getName(),
    folderUrl: folder.getUrl()
  };
}

function disconnectDriveFolder() {
  PropertiesService.getUserProperties().deleteProperty('DRIVE_FOLDER_ID');
  return { success: true };
}

function saveDriveConnection(folderId) {
  PropertiesService.getUserProperties().setProperty('DRIVE_FOLDER_ID', folderId);
}

function extractDriveFolderId(value) {
  const urlMatch = value.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^[a-zA-Z0-9-_]+$/.test(value)) return value;
  return null;
}

function getConnectedDriveFolder() {
  const folderId = PropertiesService.getUserProperties().getProperty('DRIVE_FOLDER_ID');
  if (!folderId) throw new Error('No Google Drive folder is connected.');
  try {
    return DriveApp.getFolderById(folderId);
  } catch (error) {
    throw new Error('The connected Google Drive folder could not be accessed.');
  }
}

/* ========================= PRODUCT DRIVE FOLDERS ========================= */
function createProductDriveFolder(title, recordId, timestamp) {
  title = String(title || '').trim();
  recordId = String(recordId || '').trim();
  if (!title) throw new Error('Product title is required.');
  if (!recordId) throw new Error('Record ID is required.');

  const rootFolder = getConnectedDriveFolder();
  const date = timestamp ? new Date(timestamp) : new Date();

  const yearName = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy');
  const monthName = Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM - MMMM');
  const dayName = Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd');

  const yearFolder = getOrCreateFolder(rootFolder, yearName);
  const monthFolder = getOrCreateFolder(yearFolder, monthName);
  const dayFolder = getOrCreateFolder(monthFolder, dayName);

  const safeTitle = sanitizeDriveFolderName(title) || 'Untitled Product';
  const productFolderName = safeTitle + ' - ' + recordId;
  const productFolder = dayFolder.createFolder(productFolderName);

  return {
    folderId: productFolder.getId(),
    folderName: productFolder.getName(),
    folderUrl: productFolder.getUrl()
  };
}

function getOrCreateFolder(parentFolder, name) {
  const folders = parentFolder.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(name);
}

function sanitizeDriveFolderName(name) {
  return String(name)
    .replace(/[\\\/:*?"<>|#%]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 120);
}

/* ========================= STEP 5: PRODUCT SAVE ========================= */
function saveProduct(productData) {
  const lock = LockService.getUserLock();
  lock.waitLock(30000);

  try {
    if (!productData || typeof productData !== 'object') {
      throw new Error('Invalid product data.');
    }

    const spreadsheet = getConnectedSpreadsheet();
    const productsSheet = spreadsheet.getSheetByName(APP_CONFIG.PRODUCTS_SHEET_NAME);
    if (!productsSheet) throw new Error('Products sheet does not exist.');

    const driveRoot = getConnectedDriveFolder();
    if (!driveRoot) throw new Error('Google Drive is not connected.');

    const fields = getProductFields();
    const values = productData.fields && typeof productData.fields === 'object'
      ? productData.fields
      : {};

    const upc = String(productData.upc == null ? '' : productData.upc).trim();
    if (!upc) throw new Error('UPC is required.');

    const titleField = fields.find(field => field.id === 'title');
    const cogField = fields.find(field => field.id === 'cog');
    const quantityField = fields.find(field => field.id === 'quantity');

    const title = String(values[titleField ? titleField.id : 'title'] == null ? '' : values[titleField ? titleField.id : 'title']).trim();
    const cogRaw = values[cogField ? cogField.id : 'cog'];
    const quantityRaw = values[quantityField ? quantityField.id : 'quantity'];

    if (!title) throw new Error('Title is required.');
    const cog = toFiniteNumber(cogRaw, 'COG');
    const quantity = toFiniteNumber(quantityRaw, 'Quantity');

    fields.forEach(field => {
      const value = values[field.id];
      if (field.required && isEmptyFieldValue(value, field.type)) {
        throw new Error(field.name + ' is required.');
      }
      if (field.type === 'number' && !isEmptyFieldValue(value, field.type)) {
        toFiniteNumber(value, field.name);
      }
      if (field.type === 'dropdown' && !isEmptyFieldValue(value, field.type) && field.options.length > 0) {
        const selected = String(value);
        if (!field.options.map(String).includes(selected)) {
          throw new Error('Invalid value for ' + field.name + '.');
        }
      }
    });

    const photos = Array.isArray(productData.photos) ? productData.photos : [];
    if (photos.length > APP_CONFIG.MAX_PHOTOS) {
      throw new Error('A maximum of 5 photos is allowed.');
    }

    const timestamp = new Date();
    const recordId = generateUniqueRecordId(productsSheet);
    const folderInfo = createProductDriveFolder(title, recordId, timestamp);
    const photoUrls = [];

    try {
      photos.forEach((photo, index) => {
        photoUrls.push(uploadProductPhoto(folderInfo.folderId, photo, index + 1));
      });
    } catch (error) {
      throw new Error('Product could not be saved because the photo upload failed.');
    }

    try {
      ensureHeaders(productsSheet, APP_CONFIG.SYSTEM_COLUMNS);
      ensureHeaders(productsSheet, fields.map(field => field.name));

      const lastColumn = productsSheet.getLastColumn();
      const headers = productsSheet.getRange(1, 1, 1, lastColumn).getValues()[0]
        .map(value => String(value).trim());

      const row = new Array(headers.length).fill('');
      setRowValueByHeader(headers, row, 'Record ID', recordId);
      setRowValueByHeader(headers, row, 'Timestamp', timestamp);
      setRowValueByHeader(headers, row, 'UPC', upc);
      setRowValueByHeader(headers, row, 'Title', title);
      setRowValueByHeader(headers, row, 'COG', cog);
      setRowValueByHeader(headers, row, 'Quantity', quantity);
      setRowValueByHeader(headers, row, 'Drive Folder', folderInfo.folderUrl);

      photoUrls.forEach((url, index) => {
        setRowValueByHeader(headers, row, 'Photo ' + (index + 1), url);
      });

      fields.forEach(field => {
        if (field.system) return;
        if (Object.prototype.hasOwnProperty.call(values, field.id)) {
          let value = values[field.id];
          if (field.type === 'number' && value !== '' && value != null) value = Number(value);
          if (field.type === 'checkbox') value = Boolean(value);
          setRowValueByHeader(headers, row, field.name, value);
        }
      });

      const upcIndex = headers.indexOf('UPC');
      if (upcIndex !== -1) {
        productsSheet.getRange(2, upcIndex + 1, Math.max(productsSheet.getMaxRows() - 1, 1), 1)
          .setNumberFormat('@');
      }

      productsSheet.getRange(productsSheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    } catch (error) {
      throw new Error('Product could not be saved to the Google Sheet.');
    }

    return {
      success: true,
      recordId,
      timestamp: timestamp.toISOString(),
      driveFolderUrl: folderInfo.folderUrl,
      photoUrls,
      message: 'Product saved successfully.'
    };
  } finally {
    lock.releaseLock();
  }
}

function uploadProductPhoto(folderId, photo, index) {
  if (!photo || typeof photo !== 'object') throw new Error('Invalid photo.');
  const dataUrl = String(photo.dataUrl || '');
  if (!dataUrl) throw new Error('Photo data is missing.');

  const match = dataUrl.match(/^data:([^;,]+)?(?:;[^,]*)?,(.*)$/);
  if (!match) throw new Error('Invalid photo data.');

  const mimeType = String(photo.mimeType || match[1] || 'image/jpeg').split(';')[0] || 'image/jpeg';
  const base64 = match[2];
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, buildPhotoFileName(photo.name, index, mimeType));
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);

  return file.getUrl();
}

function buildPhotoFileName(originalName, index, mimeType) {
  const original = String(originalName || '').trim();
  const extensionMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif'
  };
  const extension = extensionMap[mimeType] || 'jpg';
  const safeOriginal = original
    .replace(/[^a-zA-Z0-9._ -]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);

  if (safeOriginal) {
    const withoutExtension = safeOriginal.replace(/\.[^.]+$/, '');
    return String(index).padStart(2, '0') + ' - ' + withoutExtension + '.' + extension;
  }
  return String(index).padStart(2, '0') + '.' + extension;
}

function generateUniqueRecordId(productsSheet) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const now = new Date();
    const stamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
    const random = Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();
    const candidate = 'REC-' + stamp + '-' + random;

    const lastRow = productsSheet.getLastRow();
    if (lastRow < 2) return candidate;

    const recordColumn = APP_CONFIG.SYSTEM_COLUMNS.indexOf('Record ID') + 1;
    const existing = productsSheet.getRange(2, recordColumn, lastRow - 1, 1).getDisplayValues()
      .flat()
      .map(value => String(value).trim());

    if (!existing.includes(candidate)) return candidate;
  }
  throw new Error('Could not generate a unique Record ID. Please try again.');
}

function setRowValueByHeader(headers, row, header, value) {
  const index = headers.indexOf(header);
  if (index !== -1) row[index] = value;
}

function isEmptyFieldValue(value, type) {
  if (type === 'checkbox') return value !== true;
  return value === undefined || value === null || String(value).trim() === '';
}

function toFiniteNumber(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(fieldName + ' is required.');
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(fieldName + ' must be a valid number.');
  return number;
}

/* ========================= HELPERS ========================= */
function cloneField(field) {
  return {
    id: field.id,
    name: field.name,
    type: field.type,
    required: Boolean(field.required),
    system: Boolean(field.system),
    options: Array.isArray(field.options) ? field.options.slice() : []
  };
}

function saveSpreadsheetConnection(spreadsheetId) {
  PropertiesService.getUserProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
}

function getConnectedSpreadsheet() {
  const spreadsheetId = PropertiesService.getUserProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Google Sheet is not connected. Please connect a Sheet in Settings.');
  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    throw new Error('The connected Google Sheet could not be accessed.');
  }
}

function extractSpreadsheetId(value) {
  const urlMatch = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^[a-zA-Z0-9-_]+$/.test(value)) return value;
  return null;
}
