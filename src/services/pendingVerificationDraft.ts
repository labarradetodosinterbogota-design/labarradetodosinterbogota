const DB_NAME = 'legion-bacata-auth';
const STORE_NAME = 'pending-verification-drafts';
const DB_VERSION = 1;
const MAX_DRAFT_AGE_MS = 3 * 24 * 60 * 60 * 1000;

interface PendingVerificationDraftRow {
  email: string;
  fileBlob: Blob;
  fileName: string;
  fileType: string;
  createdAt: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isIndexedDbAvailable(): boolean {
  return globalThis.indexedDB !== undefined;
}

function waitForTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('No se pudo completar la transacción local.'));
    tx.onabort = () => reject(tx.error ?? new Error('La transacción local fue cancelada.'));
  });
}

function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo leer almacenamiento local.'));
  });
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB no está disponible en este navegador.'));
      return;
    }

    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'email' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('No se pudo abrir almacenamiento local de verificación.'));
  });
}

function buildDraftFile(row: PendingVerificationDraftRow): File {
  const fileName = row.fileName.trim() || 'hincha-inter.jpg';
  const fileType = row.fileType.trim() || row.fileBlob.type || 'application/octet-stream';
  return new File([row.fileBlob], fileName, { type: fileType, lastModified: row.createdAt });
}

export async function savePendingVerificationDraft(email: string, file: File): Promise<void> {
  const key = normalizeEmail(email);
  if (!key || !isIndexedDbAvailable()) return;

  const db = await openDraftDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const row: PendingVerificationDraftRow = {
      email: key,
      fileBlob: file,
      fileName: file.name,
      fileType: file.type,
      createdAt: Date.now(),
    };
    store.put(row);
    await waitForTransaction(tx);
  } finally {
    db.close();
  }
}

export async function readPendingVerificationDraft(email: string): Promise<File | null> {
  const key = normalizeEmail(email);
  if (!key || !isIndexedDbAvailable()) return null;

  const db = await openDraftDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key) as IDBRequest<PendingVerificationDraftRow | undefined>;
    const row = await waitForRequest(request);

    if (!row) {
      await waitForTransaction(tx);
      return null;
    }

    if (Date.now() - row.createdAt > MAX_DRAFT_AGE_MS) {
      store.delete(key);
      await waitForTransaction(tx);
      return null;
    }

    await waitForTransaction(tx);
    return buildDraftFile(row);
  } finally {
    db.close();
  }
}

export async function clearPendingVerificationDraft(email: string): Promise<void> {
  const key = normalizeEmail(email);
  if (!key || !isIndexedDbAvailable()) return;

  const db = await openDraftDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    await waitForTransaction(tx);
  } finally {
    db.close();
  }
}
