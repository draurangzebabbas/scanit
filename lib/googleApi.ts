import { ProductField, ProductPhoto, ProductRecord } from './db';

const SYSTEM_COLUMNS = [
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
  'Photo 5',
];

// Utility to extract Google ID from URL or return raw ID
export function extractIdFromUrlOrId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch && sheetMatch[1]) return sheetMatch[1];
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];
  const idMatch = trimmed.match(/([a-zA-Z0-9-_]{20,})/);
  if (idMatch && idMatch[1]) return idMatch[1];
  return trimmed;
}

/* ================= GOOGLE SHEETS API ================= */

export async function createSpreadsheet(
  accessToken: string,
  name: string = 'Scanit Database'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; spreadsheetName: string }> {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: name },
      sheets: [
        { properties: { title: 'Products' } },
        { properties: { title: 'App Config' } },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to create Google Sheet.');
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  await setupSpreadsheetStructure(accessToken, spreadsheetId);

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetName: name,
  };
}

export async function setupSpreadsheetStructure(
  accessToken: string,
  spreadsheetId: string,
  customFields: ProductField[] = []
): Promise<void> {
  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!getRes.ok) throw new Error('Could not access Google Sheet.');
  const sheetData = await getRes.json();
  const sheetTitles: string[] = sheetData.sheets?.map((s: any) => s.properties.title) || [];

  const requests: any[] = [];
  if (!sheetTitles.includes('Products')) {
    requests.push({ addSheet: { properties: { title: 'Products' } } });
  }
  if (!sheetTitles.includes('App Config')) {
    requests.push({ addSheet: { properties: { title: 'App Config' } } });
  }

  if (requests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  }

  const headers = [...SYSTEM_COLUMNS];
  customFields.forEach((cf) => {
    if (!cf.system && !headers.includes(cf.name)) {
      headers.push(cf.name);
    }
  });

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!1:1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [headers] }),
    }
  );

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'App Config'!A1:E1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [['field_id', 'field_name', 'field_type', 'required', 'options_json']],
      }),
    }
  );
}

export async function fetchSpreadsheetInfo(
  accessToken: string,
  spreadsheetId: string
): Promise<{ spreadsheetId: string; spreadsheetName: string; spreadsheetUrl: string }> {
  const cleanId = extractIdFromUrlOrId(spreadsheetId);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to fetch spreadsheet details.');
  }

  const data = await res.json();
  return {
    spreadsheetId: cleanId,
    spreadsheetName: data.properties?.title || 'Connected Sheet',
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${cleanId}`,
  };
}

export async function getProductFieldsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<ProductField[]> {
  const cleanId = extractIdFromUrlOrId(spreadsheetId);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'App Config'!A2:E100`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  const rows = data.values || [];
  const fields: ProductField[] = [];

  rows.forEach((row: any[]) => {
    if (row && row[0]) {
      fields.push({
        id: row[0],
        name: row[1] || row[0],
        type: row[2] || 'text',
        required: row[3] === 'TRUE' || row[3] === true || row[3] === 'true',
        system: false,
        options: row[4] ? JSON.parse(row[4]) : [],
      });
    }
  });

  return fields;
}

export async function saveProductFieldsToSheet(
  accessToken: string,
  spreadsheetId: string,
  fields: ProductField[]
): Promise<void> {
  const cleanId = extractIdFromUrlOrId(spreadsheetId);

  const rows = fields.map((f) => [
    f.id,
    f.name,
    f.type,
    f.required ? 'TRUE' : 'FALSE',
    JSON.stringify(f.options || []),
  ]);

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'App Config'!A2:E100:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'App Config'!A2?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  await setupSpreadsheetStructure(accessToken, cleanId, fields);
}

export async function appendProductRowToSheet(
  accessToken: string,
  spreadsheetId: string,
  record: ProductRecord,
  driveFolderUrl: string,
  photoUrls: string[]
): Promise<void> {
  const cleanId = extractIdFromUrlOrId(spreadsheetId);

  const headerRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Products!1:1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!headerRes.ok) {
    throw new Error('Failed to read header row from Products sheet.');
  }

  const headerData = await headerRes.json();
  const headers: string[] = (headerData.values && headerData.values[0]) || SYSTEM_COLUMNS;

  const dataMap: Record<string, any> = {
    'Record ID': record.id,
    Timestamp: record.timestamp,
    UPC: record.upc,
    Title: record.fields.title || '',
    COG: record.fields.cog !== undefined ? record.fields.cog : '',
    Quantity: record.fields.quantity !== undefined ? record.fields.quantity : '',
    'Drive Folder': driveFolderUrl || '',
    'Photo 1': photoUrls[0] || '',
    'Photo 2': photoUrls[1] || '',
    'Photo 3': photoUrls[2] || '',
    'Photo 4': photoUrls[3] || '',
    'Photo 5': photoUrls[4] || '',
  };

  Object.keys(record.fields).forEach((key) => {
    dataMap[key] = record.fields[key];
  });

  const rowValues = headers.map((header) => {
    if (dataMap[header] !== undefined) return dataMap[header];
    if (record.fields[header] !== undefined) return record.fields[header];
    return '';
  });

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Products!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [rowValues] }),
    }
  );

  if (!appendRes.ok) {
    const err = await appendRes.json();
    throw new Error(err.error?.message || 'Failed to append product row to sheet.');
  }
}

/* ================= GOOGLE DRIVE API ================= */

export async function createDriveFolder(
  accessToken: string,
  folderName: string = 'Scanit Photos',
  parentFolderId?: string
): Promise<{ folderId: string; folderName: string; folderUrl: string }> {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to create Drive folder.');
  }

  const data = await res.json();
  return {
    folderId: data.id,
    folderName: data.name,
    folderUrl: data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`,
  };
}

export async function fetchDriveFolderInfo(
  accessToken: string,
  folderId: string
): Promise<{ folderId: string; folderName: string; folderUrl: string }> {
  const cleanId = extractIdFromUrlOrId(folderId);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${cleanId}?fields=id,name,webViewLink`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Could not access Google Drive folder.');
  }

  const data = await res.json();
  return {
    folderId: cleanId,
    folderName: data.name || 'Connected Folder',
    folderUrl: data.webViewLink || `https://drive.google.com/drive/folders/${cleanId}`,
  };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export async function uploadPhotoToDriveFolder(
  accessToken: string,
  folderId: string,
  photo: ProductPhoto,
  fileName: string
): Promise<string> {
  const cleanFolderId = extractIdFromUrlOrId(folderId);
  const blob = dataUrlToBlob(photo.dataUrl);

  const metadata = {
    name: fileName,
    parents: [cleanFolderId],
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', blob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to upload photo to Google Drive.');
  }

  const data = await res.json();
  return data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`;
}
