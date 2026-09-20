import {
  getGoogleConfig,
  updateProductSyncStatus,
  getPendingProducts,
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
    const driveFolderUrl = config.driveFolderUrl || `https://drive.google.com/drive/folders/${driveFolderId}`;

    // 1. Upload photos to Google Drive (inside Year → Month → Day subfolders)
    if (product.photos && product.photos.length > 0) {
      // Resolve the dated subfolder once for all photos in this product
      const scanDate = product.timestamp ? new Date(product.timestamp) : new Date();
      const dayFolderId = await getOrCreateDateFolderPath(
        session.accessToken,
        driveFolderId,
        scanDate
      );

      for (let i = 0; i < product.photos.length; i++) {
        const photo = product.photos[i];
        const fileName = `${product.upc || 'PRODUCT'}_photo_${i + 1}_${Date.now()}.jpg`;
        const photoUrl = await uploadPhotoToDriveFolder(
          session.accessToken,
          dayFolderId,
          photo,
          fileName
        );
        photoUrls.push(photoUrl);
      }
    }

    // 2. Append row to Google Sheet
    await appendProductRowToSheet(
      session.accessToken,
      spreadsheetId,
      product,
      driveFolderUrl,
      photoUrls
    );

    // 3. Mark as synced
    await updateProductSyncStatus(product.id, 'synced', {
      driveFolderUrl,
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
