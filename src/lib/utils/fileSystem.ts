const DB_NAME = 'gemini_reader_db';
const DB_VERSION = 1;
const STORE_NAME = 'recent_handles';

export function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveHandleToDb(key: string, handle: any): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) return false;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, key);
    return new Promise(res => {
      tx.oncomplete = () => res(true);
      tx.onerror = () => res(false);
    });
  } catch {
    return false;
  }
}

export async function getHandleFromDb(key: string): Promise<any | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    return new Promise(res => {
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

export async function removeHandleFromDb(key: string): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  } catch {}
}

export function detectGeminiRootPath(text: string, fallbackName = '.gemini'): string {
  if (!text) return fallbackName;
  const m = text.match(
    /The project.*?temporary directory is:[^\r\n]*?([a-zA-Z]:[\\\/][^\r\n]*?[\\\/]\.gemini|\/[^\r\n]*?\/[.]gemini)/i
  );
  if (m) return m[1];
  const m2 = text.match(/temporary directory is:[^\r\n]*?([^\r\n]+)[\\\/]tmp[\\\/]/i);
  if (m2) return m2[1];
  return fallbackName;
}

export function detectActualFolderPath(dirHandle: any, rawFiles: { file: File; path: string }[] = []): string {
  if (!dirHandle && (!rawFiles || rawFiles.length === 0)) return '';

  // Check if any File object has a native path (e.g. Electron, desktop runtimes)
  if (rawFiles && rawFiles.length > 0) {
    for (const rf of rawFiles) {
      const filePath = (rf.file as any)?.path;
      if (filePath) {
        const full = filePath.replace(/\\/g, '/');
        const rel = (rf.path || '').replace(/\\/g, '/');
        if (rel && full.endsWith(rel)) {
          return filePath.slice(0, filePath.length - rf.path.length).replace(/[/\\]$/, '');
        }
        const idx = full.lastIndexOf('/chats/');
        if (idx !== -1) {
          return filePath.slice(0, idx);
        }
        const dirIdx = full.lastIndexOf('/');
        if (dirIdx !== -1) {
          return filePath.slice(0, dirIdx);
        }
      }
    }
  }

  if (dirHandle) {
    if (dirHandle.path) return dirHandle.path;
    if (dirHandle.fullPath) return dirHandle.fullPath;
    if (dirHandle.name) return dirHandle.name;
  }

  return '';
}
