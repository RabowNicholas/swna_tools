// Finding a client's folder in "2. Active Clients". Folders are named
// "Last, First", but many carry an "aa"/"zz" prefix or a " - ar need" style
// suffix. Those still count as the client's folder, with a flag so whoever is
// saving can see the name isn't clean. Pure functions, so they can be tested
// against a plain list of folder names.

export type FolderMatchStatus = 'exact' | 'flagged' | 'none' | 'multiple';

export interface FolderMatch {
  status: FolderMatchStatus;
  /** The folder to save into, for 'exact' and 'flagged' */
  folder?: string;
  /** Every folder that could be this client's, for 'multiple' */
  candidates: string[];
  /** Why the match isn't clean, in plain words, for 'flagged' */
  flags: string[];
  /** The "Last, First" name the folder should have */
  expected: string;
}

/** Folders in Active Clients that never belong to a client */
const NOT_CLIENT_FOLDERS = /^1\. Template for Copying/i;

/**
 * "White, Bryan K - 1234" (the Airtable Name) → "White, Bryan K", the name
 * the client's folder should have.
 */
export function expectedFolderName(airtableName: string): string {
  return airtableName.split(/\s+-\s+/)[0].trim();
}

/**
 * Splits a folder name into the "Last, First" part and anything around it:
 * "zz - Inactive Beck, Kevin R" → core "Beck, Kevin R", prefix "zz - Inactive".
 */
export function parseFolderName(folder: string): {
  core: string;
  prefix: string;
  suffix: string;
} {
  let rest = folder.trim();
  // Prefixes can stack, e.g. "zz Inactive - aa Barnum, Ruben"
  const prefixes: string[] = [];
  let prefixMatch: RegExpMatchArray | null;
  while ((prefixMatch = rest.match(/^(zz?(?:\s*-?\s*inactive)?|aa)(?:\s*-\s*|\s+)/i))) {
    prefixes.push(prefixMatch[1]);
    rest = rest.slice(prefixMatch[0].length);
  }
  const prefix = prefixes.join(' ');

  let suffix = '';
  // " - ar need", " - Case 50021954", "(SV of Alexander)", or a bare
  // "ar need(ed)" at the end, whichever comes first
  const suffixMatch = rest.match(/\s*\(.*$|\s+-\s+.*$|\s+ar needed?$/i);
  if (suffixMatch) {
    suffix = suffixMatch[0].trim();
    rest = rest.slice(0, suffixMatch.index);
  }

  return { core: rest.trim(), prefix, suffix };
}

/** Case, periods and spacing don't decide a match */
function normalize(name: string): string {
  return name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

/** "White, Bryan K" → { last: "white", first: "bryan" } */
function lastAndFirst(name: string): { last: string; first: string } {
  const [last, rest = ''] = normalize(name).split(',', 2);
  return { last: last.trim(), first: rest.trim().split(' ')[0] ?? '' };
}

export function matchClientFolder(
  airtableName: string,
  folderNames: string[]
): FolderMatch {
  const expected = expectedFolderName(airtableName);
  const target = normalize(expected);
  const { last, first } = lastAndFirst(expected);
  const folders = folderNames.filter((f) => !NOT_CLIENT_FOLDERS.test(f));

  const exact = folders.filter((f) => normalize(f) === target);
  // Same "Last, First" once any prefix or suffix is set aside
  const wrapped = folders.filter(
    (f) => !exact.includes(f) && normalize(parseFolderName(f).core) === target
  );
  // Same last name and first name, e.g. a middle initial on one side only
  const loose = folders.filter((f) => {
    if (exact.includes(f) || wrapped.includes(f)) return false;
    const parts = lastAndFirst(parseFolderName(f).core);
    return parts.last === last && parts.first === first && first !== '';
  });

  const result = (status: FolderMatchStatus, folder?: string, candidates: string[] = []): FolderMatch => ({
    status,
    folder,
    candidates,
    flags: folder && status === 'flagged' ? flagsFor(folder, expected) : [],
    expected,
  });

  if (exact.length === 1 && wrapped.length === 0 && loose.length === 0) {
    return result('exact', exact[0]);
  }

  const all = [...exact, ...wrapped, ...loose];
  if (all.length === 0) return result('none');
  if (all.length === 1) return result('flagged', all[0]);
  return result('multiple', undefined, all);
}

/** Plain-words reasons a matched folder's name isn't the clean "Last, First" */
export function flagsFor(folder: string, expected: string): string[] {
  if (normalize(folder) === normalize(expected)) return [];
  const { core, prefix, suffix } = parseFolderName(folder);
  const flags: string[] = [];
  if (/inactive/i.test(prefix)) flags.push('The folder is marked Inactive.');
  else if (/\bzz?\b/i.test(prefix)) flags.push('The folder starts with "zz".');
  if (/\baa\b/i.test(prefix)) flags.push('The folder starts with "aa".');
  if (suffix) flags.push(`The folder name ends with "${suffix}".`);
  if (normalize(core) !== normalize(expected)) {
    flags.push(`The name in the folder is "${core}", not "${expected}".`);
  }
  return flags.length > 0 ? flags : [`The folder is named "${folder}", not "${expected}".`];
}
