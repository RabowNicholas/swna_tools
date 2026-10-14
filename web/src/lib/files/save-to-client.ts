// Saving a generated file straight into a client's Sync folder. Kept out of
// the pages so any tool, or later an agent, can file a document the same way.

import { buildLogEntry } from '@/lib/airtable-log';
import { matchClientFolder, type FolderMatch } from './client-folder';
import { listFolders, type DirHandle } from './sync-folder';

// The Active Clients listing is ~2,000 folders, so it's read once per page
// visit and re-read only when a client isn't in it
let cachedListing: { dir: DirHandle; names: string[] } | null = null;

export async function findClientFolder(
  activeClients: DirHandle,
  airtableName: string
): Promise<FolderMatch> {
  if (!cachedListing || cachedListing.dir !== activeClients) {
    cachedListing = { dir: activeClients, names: await listFolders(activeClients) };
  }
  const match = matchClientFolder(airtableName, cachedListing.names);
  if (match.status !== 'none') return match;
  // A folder made since the listing was read
  cachedListing = { dir: activeClients, names: await listFolders(activeClients) };
  return matchClientFolder(airtableName, cachedListing.names);
}

async function exists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

/** "x.pdf" → "x (2).pdf", "x (3).pdf"… until one isn't taken */
async function freeName(dir: FileSystemDirectoryHandle, name: string): Promise<string> {
  if (!(await exists(dir, name))) return name;
  const dot = name.lastIndexOf('.');
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  for (let n = 2; ; n++) {
    const candidate = `${stem} (${n})${ext}`;
    if (!(await exists(dir, candidate))) return candidate;
  }
}

export interface SaveResult {
  /** The name it was saved under, which differs from the one asked for on a clash */
  savedAs: string;
  renamed: boolean;
}

/**
 * Writes the file into the client's folder, or a subfolder of it ('' for the
 * main folder). Never overwrites: a name already there gets " (2)" and so on.
 * `createSubfolder` makes the subfolder when it's missing.
 */
export async function saveToClientFolder({
  clientDir,
  subfolder,
  fileName,
  blob,
  createSubfolder = false,
}: {
  clientDir: DirHandle;
  subfolder: string;
  fileName: string;
  blob: Blob;
  createSubfolder?: boolean;
}): Promise<SaveResult> {
  const dir = subfolder
    ? await clientDir.getDirectoryHandle(subfolder, { create: createSubfolder })
    : clientDir;
  const savedAs = await freeName(dir, fileName);
  const file = await dir.getFileHandle(savedAs, { create: true });
  const writable = await file.createWritable();
  await writable.write(blob);
  await writable.close();
  return { savedAs, renamed: savedAs !== fileName };
}

/** Notes the save at the top of the client's Airtable Log */
export async function logSave({
  recordId,
  fileName,
  where,
  userEmail,
}: {
  recordId: string;
  fileName: string;
  /** e.g. "Submitted DOL", or "the client folder" */
  where: string;
  userEmail?: string | null;
}): Promise<void> {
  const response = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recordId,
      prepend: { Log: buildLogEntry(`Saved ${fileName} to ${where}`, userEmail) },
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.details || data.error || 'Couldn’t write to the Airtable Log');
  }
}

/** The plain browser download, for when there's no Sync folder to save to */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
