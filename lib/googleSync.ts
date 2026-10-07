import {
  getGoogleConfig,
  updateProductSyncStatus,
  getPendingProducts,
  getProductFields,
  ProductRecord,
} from './db';
import { getStoredAuthSession } from './googleAuth';
import {
  appendProductRowToSheet,
  uploadPhotoToDriveFolder,
  getOrCreateDateFolderPath,
  extractIdFromUrlOrId,
} from './googleApi';

let isSyncing = false;
let listeners: Array<(pendingCount: number, syncing: boolean) => void> = [];

export function subscribeSyncStatus(
  callback: (pendingCount: number, syncing: boolean) => void
) {
  listeners.push(callback);
  notifyListeners();
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

export async function notifyListeners() {
  const pending = await getPendingProducts();
  listeners.forEach((l) => l(pending.length, isSyncing));
}

export async function syncSingleProduct(product: ProductRecord): Promise<boolean> {
  const session = getStoredAuthSession();
  if (!session || !session.accessToken) {
    await updateProductSyncStatus(product.id, 'failed', {
      error: 'Google Account not connected or session expired. Please sign in via Settings.',
    });
    notifyListeners();
    return false;
  }

  const config = await getGoogleConfig();
  const spreadsheetId = extractIdFromUrlOrId(config.spreadsheetId || config.spreadsheetUrl || '');
  const driveFolderId = extractIdFromUrlOrId(config.driveFolderId || config.driveFolderUrl || '');

  if (!spreadsheetId) {
    await updateProductSyncStatus(product.id, 'failed', {
      error: 'No Google Sheet connected. Please select or create a Sheet in Settings.',
    });
    notifyListeners();
    return false;
  }

  if (!driveFolderId) {
    await updateProductSyncStatus(product.id, 'failed', {
      error: 'No Google Drive Folder connected. Please select or create a folder in Settings.',
    });
    notifyListeners();
    return false;
  }

  await updateProductSyncStatus(product.id, 'syncing');
  notifyListeners();

  try {
    const photoUrls: string[] = [];
    let upcFolderUrl = '';

    // Load product field definitions for id -> name mapping
    const fieldDefs = await getProductFields();

    // 1. Create Year → Month → Day → UPC folder and upload photos
    const scanDate = product.timestamp ? new Date(product.timestamp) : new Date();
    const dayFolderId = await getOrCreateDateFolderPath(
      session.accessToken,
      driveFolderId,
      scanDate
    );

    // Create a UPC-named subfolder inside the day folder.
    // Sanitize UPC so Drive API never rejects the folder name (remove chars illegal in Drive).
    // Handle collisions: if "<upc>" already exists, try "<upc>(1)", "<upc>(2)", etc.
    const upcBase = (product.upc || 'UNKNOWN')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '-')   // replace Drive-illegal chars
      .replace(/\s+/g, ' ')             // collapse whitespace
      .substring(0, 100)                // Drive name limit is 32,767 but keep it short
      || 'UNKNOWN';
    let upcFolderId = '';

    // Try to find an unused name (up to 99 collisions)
    for (let attempt = 0; attempt <= 99; attempt++) {
      const candidateName = attempt === 0 ? upcBase : `${upcBase}(${attempt})`;
      // Check if a folder with this exact name exists in dayFolderId
      const searchQuery = encodeURIComponent(
        `name="${candidateName}" and mimeType="application/vnd.google-apps.folder" and "${dayFolderId}" in parents and trashed=false`
      );
      const checkRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id)&pageSize=1`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );
      const checkData = checkRes.ok ? await checkRes.json() : { files: [] };
      if (!checkData.files || checkData.files.length === 0) {
        // Name is free — create the folder
        const createRes = await fetch(
          'https://www.googleapis.com/drive/v3/files?fields=id,webViewLink',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: candidateName,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [dayFolderId],
            }),
          }
        );
        if (!createRes.ok) throw new Error('Failed to create UPC subfolder in Drive.');
        const created = await createRes.json();
        upcFolderId = created.id;
        upcFolderUrl = created.webViewLink || `https://drive.google.com/drive/folders/${upcFolderId}`;
        break;
      }
    }

    if (!upcFolderId) throw new Error('Could not create a unique UPC folder in Drive after 100 attempts.');

    // 2. Upload photos into the UPC folder
    if (product.photos && product.photos.length > 0) {
      for (let i = 0; i < product.photos.length; i++) {
        const photo = product.photos[i];
        const fileName = `${String(i + 1).padStart(2, '0')}_${product.upc || 'photo'}_${Date.now()}.jpg`;
        const photoUrl = await uploadPhotoToDriveFolder(
          session.accessToken,
          upcFolderId,
          photo,
          fileName
        );
        photoUrls.push(photoUrl);
      }
    }

    // 3. Append row to Google Sheet — Drive Folder link points to UPC-specific folder
    await appendProductRowToSheet(
      session.accessToken,
      spreadsheetId,
      product,
      upcFolderUrl,
      fieldDefs
    );

    // 4. Mark as synced
    await updateProductSyncStatus(product.id, 'synced', {
      driveFolderUrl: upcFolderUrl,
      photoUrls,
    });

    notifyListeners();
    return true;
  } catch (error: any) {
    const errorMessage = error?.message || 'Error syncing product to Google Drive/Sheets.';
    await updateProductSyncStatus(product.id, 'failed', { error: errorMessage });
    notifyListeners();
    return false;
  }
}

export async function processSyncQueue(): Promise<void> {
  if (isSyncing) return;
  const session = getStoredAuthSession();
  if (!session || !session.accessToken) {
    notifyListeners();
    return;
  }

  isSyncing = true;
  notifyListeners();

  try {
    const pending = await getPendingProducts();
    for (const product of pending) {
      await syncSingleProduct(product);
    }
  } finally {
    isSyncing = false;
    notifyListeners();
  }
}

// Auto-trigger background queue processing when network comes online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processSyncQueue();
  });
}
