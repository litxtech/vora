const DB_NAME = 'vora-offline';
const DB_VERSION = 1;

export type OfflineStore = 'records' | 'queue' | 'blobs' | 'meta';

let opening: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('indexedDB yok'));
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('records')) {
          const store = db.createObjectStore('records', { keyPath: 'id' });
          store.createIndex('kind', 'kind', { unique: false });
          store.createIndex('pin', 'pin', { unique: false });
        }
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        opening = null;
        reject(request.error ?? new Error('indexedDB açılamadı'));
      };
    });
  }
  return opening;
}

function request<T>(store: OfflineStore, mode: IDBTransactionMode, run: (objectStore: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const done = run(tx.objectStore(store));
        done.onsuccess = () => resolve(done.result);
        done.onerror = () => reject(done.error ?? new Error('indexedDB işlemi başarısız'));
      }),
  );
}

export function idbGet<T>(store: OfflineStore, key: IDBValidKey): Promise<T | undefined> {
  return request<T | undefined>(store, 'readonly', (objectStore) => objectStore.get(key));
}

export function idbPut<T>(store: OfflineStore, value: T): Promise<IDBValidKey> {
  return request(store, 'readwrite', (objectStore) => objectStore.put(value));
}

export function idbDelete(store: OfflineStore, key: IDBValidKey): Promise<void> {
  return request(store, 'readwrite', (objectStore) => objectStore.delete(key)).then(() => undefined);
}

export function idbAll<T>(store: OfflineStore): Promise<T[]> {
  return request<T[]>(store, 'readonly', (objectStore) => objectStore.getAll());
}

export function idbClear(store: OfflineStore): Promise<void> {
  return request(store, 'readwrite', (objectStore) => objectStore.clear()).then(() => undefined);
}
