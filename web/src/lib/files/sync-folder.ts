// The user's Sync folder, as a Chrome File System Access handle. Each user
// picks it once in Settings; the handle lives in this browser's IndexedDB, so
// it's per user per computer. Everything under it is the shared structure:
// "1. SWNA Shared Folder/2. Active Clients/<Last, First>/…".

export const SHARED_FOLDER = '1. SWNA Shared Folder';
export const ACTIVE_CLIENTS = '2. Active Clients';
/** Where assembled claims wait in each person's "<Name>'s Claim Drafts" */
export const NEW_CLAIMS = '5. New Claims - To Compile';

// The File System Access calls Chrome has that TypeScript's DOM types don't
type PermissionMode = { mode: 'readwrite' };
export interface DirHandle extends FileSystemDirectoryHandle {
  queryPermission(opts: PermissionMode): Promise<PermissionState>;
  requestPermission(opts: PermissionMode): Promise<PermissionState>;
  values(): AsyncIterableIterator<FileSystemHandle>;
}
declare global {
  interface Window {
    showDirectoryPicker?: (opts?: { id?: string; mode?: 'readwrite' }) => Promise<DirHandle>;
  }
}

const DB_NAME = 'swna-files';
const STORE = 'handles';
const KEY = 'sync-folder';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export function isSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

export async function loadSyncFolder(): Promise<DirHandle | null> {
  if (!isSupported()) return null;
  try {
    return (await idb<DirHandle | undefined>('readonly', (s) => s.get(KEY))) ?? null;
  } catch {
    return null;
  }
}

export async function forgetSyncFolder(): Promise<void> {
  await idb('readwrite', (s) => s.delete(KEY));
}

/**
 * Finds "2. Active Clients" from whichever level the user picked: the Sync
 * folder itself, "1. SWNA Shared Folder", or "2. Active Clients". Null when
 * it isn't there.
 */
export async function activeClientsFrom(root: DirHandle): Promise<DirHandle | null> {
  try {
    if (root.name === ACTIVE_CLIENTS) return root;
    const shared =
      root.name === SHARED_FOLDER ? root : await root.getDirectoryHandle(SHARED_FOLDER);
    return (await shared.getDirectoryHandle(ACTIVE_CLIENTS)) as DirHandle;
  } catch {
    return null;
  }
}

/**
 * "1. SWNA Shared Folder" from whichever level the user picked. Null when they
 * picked "2. Active Clients" itself, since a picked folder can't see its parent.
 */
export async function sharedFolderFrom(root: DirHandle): Promise<DirHandle | null> {
  if (root.name === SHARED_FOLDER) return root;
  try {
    return (await root.getDirectoryHandle(SHARED_FOLDER)) as DirHandle;
  } catch {
    return null;
  }
}

/** The folders down to "1. SWNA Shared Folder", for showing where a file goes */
export function pathToShared(root: DirHandle): string[] {
  return root.name === SHARED_FOLDER ? [SHARED_FOLDER] : [root.name, SHARED_FOLDER];
}

/** The folders above a client's folder, for showing where a file goes */
export function pathToActiveClients(root: DirHandle): string[] {
  if (root.name === ACTIVE_CLIENTS) return [ACTIVE_CLIENTS];
  if (root.name === SHARED_FOLDER) return [SHARED_FOLDER, ACTIVE_CLIENTS];
  return [root.name, SHARED_FOLDER, ACTIVE_CLIENTS];
}

/**
 * Opens Chrome's folder picker and keeps the choice. Throws a plain-words
 * error when the folder picked has no "2. Active Clients" under it.
 */
export async function chooseSyncFolder(): Promise<DirHandle> {
  if (!window.showDirectoryPicker) throw new Error('This browser can’t save to folders. Use Chrome.');
  const root = await window.showDirectoryPicker({ id: 'swna-sync', mode: 'readwrite' });
  if (!(await activeClientsFrom(root))) {
    throw new Error(
      `“${root.name}” doesn’t have “${SHARED_FOLDER}/${ACTIVE_CLIENTS}” in it. Pick your Sync folder.`
    );
  }
  await idb('readwrite', (s) => s.put(root, KEY));
  return root;
}

export type SyncStatus = 'unsupported' | 'unset' | 'needs-permission' | 'missing' | 'ready';

export interface SyncState {
  status: SyncStatus;
  root: DirHandle | null;
  activeClients: DirHandle | null;
}

/** Where things stand, without asking the user for anything */
export async function getSyncState(): Promise<SyncState> {
  if (!isSupported()) return { status: 'unsupported', root: null, activeClients: null };
  const root = await loadSyncFolder();
  if (!root) return { status: 'unset', root: null, activeClients: null };
  if ((await root.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    return { status: 'needs-permission', root, activeClients: null };
  }
  const activeClients = await activeClientsFrom(root);
  return { status: activeClients ? 'ready' : 'missing', root, activeClients };
}

/**
 * Asks Chrome for access again. Has to run from a click; Chrome remembers the
 * answer if the user picks "Allow on every visit".
 */
export async function reconnectSyncFolder(root: DirHandle): Promise<SyncState> {
  if ((await root.requestPermission({ mode: 'readwrite' })) !== 'granted') {
    return { status: 'needs-permission', root, activeClients: null };
  }
  return getSyncState();
}

/** The names of the folders directly inside a folder, sorted */
export async function listFolders(dir: DirHandle): Promise<string[]> {
  const names: string[] = [];
  for await (const entry of dir.values()) {
    if (entry.kind === 'directory') names.push(entry.name);
  }
  return names.sort((a, b) => a.localeCompare(b));
}
