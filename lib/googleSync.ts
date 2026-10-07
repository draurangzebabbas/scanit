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

// Treat 'syncing' as pending too — if app crashed mid-sync, product is stuck in 'syncing'
export async function getPendingAndStuckProducts() {
  const { getAllProducts } = await import('./db');
  const all = await getAllProducts();
  return all.filter((p) => p.syncStatus === 'pending' || p.syncStatus === 'failed' || p.syncStatus === 'syncing');
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
    const upcBase = (product.upc || 'UNKNOWN')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '-')   // replace Drive-illegal chars
      .replace(/\s+/g, ' ')             // collapse whitespace
      .substring(0, 100)                // Drive name limit is 32,767 but keep it short
      || 'UNKNOWN';

    // Check for duplicate UPC entries in the same day folder in 1 single list query
    let targetFolderName = upcBase;
    try {
      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `mimeType='application/vnd.google-apps.folder' and '${dayFolderId}' in parents and trashed=false and name contains '${upcBase}'`
        )}&fields=files(name)&pageSize=100`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        const existingNames = new Set((listData.files || []).map((f: any) => f.name));
        if (existingNames.has(upcBase)) {
          let suffix = 1;
          while (existingNames.has(`${upcBase}(${suffix})`)) {
            suffix++;
          }
          targetFolderName = `${upcBase}(${suffix})`;
        }
      }
    } catch (err) {
      // If list query fails, fallback to upcBase
    }

    // Direct folder creation inside the day folder
    const createRes = await fetch(
      'https://www.googleapis.com/drive/v3/files?fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: targetFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [dayFolderId],
        }),
      }
    );

    if (!createRes.ok) throw new Error('Failed to create UPC subfolder in Drive.');
    const created = await createRes.json();
    const upcFolderId = created.id;
    const upcFolderUrl = created.webViewLink || `https://drive.google.com/drive/folders/${upcFolderId}`;

    // 2. Upload all photos IN PARALLEL into the UPC folder for maximum speed
    let photoUrls: string[] = [];
    if (product.photos && product.photos.length > 0) {
      photoUrls = await Promise.all(
        product.photos.map(async (photo, idx) => {
          const fileName = `${String(idx + 1).padStart(2, '0')}_${product.upc || 'photo'}_${Date.now()}.jpg`;
          return uploadPhotoToDriveFolder(
            session.accessToken,
            upcFolderId,
            photo,
            fileName
          );
        })
      );
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
    // Also pick up products stuck in 'syncing' from a previous crashed session
    const { getAllProducts } = await import('./db');
    const all = await getAllProducts();
    const pending = all.filter((p) =>
      p.syncStatus === 'pending' || p.syncStatus === 'failed' || p.syncStatus === 'syncing'
    );
    // Process sequentially to avoid Google Sheets race conditions on concurrent appends
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
