import {
  getGoogleConfig,
  updateProductSyncStatus,
  getPendingProducts,
  ProductRecord,
} from './db';

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

async function notifyListeners() {
  const pending = await getPendingProducts();
  listeners.forEach((l) => l(pending.length, isSyncing));
}

export async function syncSingleProduct(product: ProductRecord): Promise<boolean> {
  const config = await getGoogleConfig();
  const webAppUrl = config.webAppUrl;

  if (!webAppUrl) {
    await updateProductSyncStatus(product.id, 'failed', {
      error: 'No Google Apps Script URL connected. Please configure in Settings.',
    });
    return false;
  }

  await updateProductSyncStatus(product.id, 'syncing');
  notifyListeners();

  try {
    const payload = {
      recordId: product.id,
      upc: product.upc,
      fields: product.fields,
      photos: product.photos,
      timestamp: product.timestamp,
    };

    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'saveProduct', payload }),
    });

    const res = await response.json();

    if (res.success || res.data) {
      const data = res.data || res;
      await updateProductSyncStatus(product.id, 'synced', {
        driveFolderUrl: data.driveFolderUrl,
        photoUrls: data.photoUrls,
      });
      notifyListeners();
      return true;
    } else {
      throw new Error(res.error || 'Server returned failure response.');
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Network error during Google Sync.';
    await updateProductSyncStatus(product.id, 'failed', { error: errorMessage });
    notifyListeners();
    return false;
  }
}

export async function processSyncQueue(): Promise<void> {
  if (isSyncing) return;
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

// Auto-trigger background queue processing when network online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processSyncQueue();
  });
}
