/**
 * IndexedDB를 키-값 저장소로 쓰는 작은 래퍼 (외부 패키지 없음).
 * 저장하는 것은 파싱 결과뿐이며, 원본 파일 내용은 저장하지 않는다. 브라우저 밖으로 나가지 않는다.
 */
const DB_NAME = "seum-desk";
const STORE = "kv";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

export function idbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/** zustand persist의 StateStorage 모양 (비동기) */
export const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!idbAvailable()) return null;
    try {
      const v = await tx<string | undefined>("readonly", (s) => s.get(name));
      return v ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (!idbAvailable()) return;
    try {
      await tx("readwrite", (s) => s.put(value, name));
    } catch {
      /* 저장 실패(사생활 보호 모드 등)는 무시 — 화면 동작에는 영향 없음 */
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (!idbAvailable()) return;
    try {
      await tx("readwrite", (s) => s.delete(name));
    } catch {
      /* 무시 */
    }
  },
};
