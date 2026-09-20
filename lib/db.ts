export interface ProductField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'dropdown' | 'date' | 'checkbox' | 'longtext';
  required: boolean;
  system: boolean;
  options?: string[];
}

export interface ProductPhoto {
  dataUrl: string;
  mimeType: string;
  name: string;
}

export interface ProductRecord {
  id: string; // Record ID: REC-YYYYMMDD-HHMMSS-XXXXXX
  timestamp: string; // ISO string
  upc: string;
  fields: Record<string, any>;
  photos: ProductPhoto[];
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  syncError?: string;
  driveFolderUrl?: string;
  photoUrls?: string[];
}

export interface AppGoogleConfig {
  spreadsheetUrl?: string;
  spreadsheetId?: string;
  spreadsheetName?: string;
  driveFolderUrl?: string;
  driveFolderId?: string;
  driveFolderName?: string;
  webAppUrl?: string;
}

const DB_NAME = 'ProductHuntingDB';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB is only available in browser'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('timestamp', 'timestamp', { unique: false });
        productStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        productStore.createIndex('upc', 'upc', { unique: false });
      }
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const DEFAULT_PRODUCT_FIELDS: ProductField[] = [
  { id: 'title', name: 'Title', type: 'text', required: false, system: false },
  { id: 'cog', name: 'COG', type: 'number', required: false, system: false },
  { id: 'quantity', name: 'Quantity', type: 'number', required: false, system: false },
];

/* ================= CONFIG METHODS ================= */
export async function getGoogleConfig(): Promise<AppGoogleConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('config', 'readonly');
      const store = tx.objectStore('config');
      const req = store.get('GOOGLE_CONFIG');
      req.onsuccess = () => resolve(req.result ? req.result.value : {});
      req.onerror = () => resolve({});
    });
  } catch (e) {
    return {};
  }
}

export async function saveGoogleConfig(config: AppGoogleConfig): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('config', 'readwrite');
    const store = tx.objectStore('config');
    const req = store.put({ key: 'GOOGLE_CONFIG', value: config });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getProductFields(): Promise<ProductField[]> {
  if (typeof window === 'undefined') return DEFAULT_PRODUCT_FIELDS;
  try {
    const db = await openDatabase();
    return new Promise(async (resolve) => {
      const tx = db.transaction('config', 'readonly');
      const store = tx.objectStore('config');
      const req = store.get('PRODUCT_FIELDS');
      req.onsuccess = async () => {
        if (req.result !== undefined && Array.isArray(req.result.value)) {
          resolve(req.result.value);
        } else {
          await saveProductFields(DEFAULT_PRODUCT_FIELDS);
          resolve(DEFAULT_PRODUCT_FIELDS);
        }
      };
      req.onerror = () => resolve(DEFAULT_PRODUCT_FIELDS);
    });
  } catch (e) {
    return DEFAULT_PRODUCT_FIELDS;
  }
}

export async function saveProductFields(fields: ProductField[]): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('config', 'readwrite');
    const store = tx.objectStore('config');
    const req = store.put({ key: 'PRODUCT_FIELDS', value: fields });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ================= PRODUCT METHODS ================= */
export function generateRecordId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REC-${year}${month}${day}-${hours}${mins}${secs}-${random}`;
}

export async function saveProductLocal(data: {
  upc: string;
  fields: Record<string, any>;
  photos: ProductPhoto[];
}): Promise<ProductRecord> {
  const db = await openDatabase();
  const recordId = generateRecordId();
  const timestamp = new Date().toISOString();

  const record: ProductRecord = {
    id: recordId,
    timestamp,
    upc: data.upc.trim(),
    fields: data.fields,
    photos: data.photos || [],
    syncStatus: 'pending',
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function updateProductSyncStatus(
  id: string,
  status: 'pending' | 'syncing' | 'synced' | 'failed',
  details?: { error?: string; driveFolderUrl?: string; photoUrls?: string[] }
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result as ProductRecord | undefined;
      if (!record) return resolve();

      record.syncStatus = status;
      if (details?.error !== undefined) record.syncError = details.error;
      if (details?.driveFolderUrl !== undefined) record.driveFolderUrl = details.driveFolderUrl;
      if (details?.photoUrls !== undefined) record.photoUrls = details.photoUrls;

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getAllProducts(): Promise<ProductRecord[]> {
  if (typeof window === 'undefined') return [];
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result || []) as ProductRecord[];
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(records);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function getPendingProducts(): Promise<ProductRecord[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.syncStatus === 'pending' || p.syncStatus === 'failed');
}

export async function deleteProductLocal(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllProductsLocal(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
