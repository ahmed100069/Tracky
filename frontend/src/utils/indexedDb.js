const DB_NAME = "tracky_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "kv";

let dbPromise = null;

const openDb = () => {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(() => null);
  }

  return dbPromise;
};

const runTransaction = async (mode, handler) => {
  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = handler(store);

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }).catch(() => null);
};

export const idbSet = async (key, value) =>
  runTransaction("readwrite", (store) => {
    store.put(value, key);
  });

export const idbGet = async (key) =>
  new Promise(async (resolve) => {
    const db = await openDb();
    if (!db) {
      resolve(null);
      return;
    }

    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => resolve(null);
  });

export const idbRemove = async (key) =>
  runTransaction("readwrite", (store) => {
    store.delete(key);
  });

export const idbGetMany = async (keys = []) => {
  const entries = await Promise.all(keys.map(async (key) => [key, await idbGet(key)]));
  return Object.fromEntries(entries);
};
