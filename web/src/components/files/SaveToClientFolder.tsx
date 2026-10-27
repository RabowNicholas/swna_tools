"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { FolderInput } from "lucide-react";
import { DESTINATIONS, fileNameFor, type DestinationId } from "@/lib/files/destinations";
import type { FolderMatch } from "@/lib/files/client-folder";
import {
  getSyncState,
  reconnectSyncFolder,
  listFolders,
  pathToActiveClients,
  type DirHandle,
  type SyncState,
} from "@/lib/files/sync-folder";
import { findClientFolder, saveAndLog, type SaveResult } from "@/lib/files/save-to-client";
import { signerOf } from "@/lib/airtable-log";
import {
  SaveCardShell,
  Notice,
  DownloadFallback,
  syncGate,
  useAutoDownload,
  SaveTargetRows,
  SavedMessage,
  PreviewButton,
} from "./SaveCardParts";

/** Any Airtable client record; only the id and Name are used */
export interface FolderClient {
  id: string;
  fields: { Name?: string; [key: string]: unknown };
}

interface SaveToClientFolderProps {
  client: FolderClient;
  /** The file the tool just generated */
  blob: Blob;
  destination: DestinationId;
  /** Overrides the destination's document name, e.g. "EE-1 SIGNED" */
  doc?: string;
  /** A finished file name, for tools that already build one in the house format */
  fileName?: string;
}

/** Picked in the subfolder list to make the expected subfolder */
const CREATE = "__create__";

/**
 * Saves a generated file straight into the client's Sync folder, showing
 * exactly what goes where before the click, then logs it to Airtable. With no
 * Sync folder set up, the file just downloads and nothing shows.
 */
export function SaveToClientFolder({
  client,
  blob,
  destination,
  doc: docOverride,
  fileName: givenName,
}: SaveToClientFolderProps) {
  const { data: session } = useSession();
  const { doc: defaultDoc, subfolder: expectedSub } = DESTINATIONS[destination];
  const doc = docOverride ?? defaultDoc;
  const airtableName = client.fields.Name ?? "";

  const [sync, setSync] = useState<SyncState | null>(null);
  const [match, setMatch] = useState<FolderMatch | null>(null);
  const [folder, setFolder] = useState("");
  const [clientDir, setClientDir] = useState<DirHandle | null>(null);
  const [subfolders, setSubfolders] = useState<string[] | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [fileName, setFileName] = useState(() => givenName ?? fileNameFor(doc, airtableName));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  useEffect(() => {
    getSyncState().then(setSync, (e) => setError(String(e)));
  }, []);

  // A tool that lets the user name the document can change it after the card
  // shows; follow it
  const firstDoc = useRef(doc);
  useEffect(() => {
    if (givenName || doc === firstDoc.current) return;
    firstDoc.current = doc;
    setFileName(fileNameFor(doc, airtableName));
  }, [doc, givenName, airtableName]);

  const autoDownload = useAutoDownload(sync, blob, fileName);

  // Find the client's folder once there's access to Sync
  useEffect(() => {
    if (sync?.status !== "ready" || !sync.activeClients) return;
    findClientFolder(sync.activeClients, airtableName).then((m) => {
      setMatch(m);
      if (m.folder) setFolder(m.folder);
    }, (e) => setError(`Couldn’t read the Active Clients folder: ${e}`));
  }, [sync, airtableName]);

  // Read the chosen folder's subfolders, to check the expected one is there
  useEffect(() => {
    if (!folder || !sync?.activeClients) return;
    setSubfolders(null);
    (async () => {
      const dir = (await sync.activeClients!.getDirectoryHandle(folder)) as DirHandle;
      const names = await listFolders(dir);
      setClientDir(dir);
      setSubfolders(names);
      setSub(expectedSub === "" || names.includes(expectedSub) ? expectedSub : null);
    })().catch((e) => setError(`Couldn’t open “${folder}”: ${e}`));
  }, [folder, sync, expectedSub]);

  const handleReconnect = async () => {
    if (!sync?.root) return;
    setSync(await reconnectSyncFolder(sync.root));
  };

  const handleSave = async () => {
    if (!clientDir || sub === null) return;
    setSaving(true);
    setError(null);
    const target = sub === CREATE ? expectedSub : sub;
    try {
      const { result, logError } = await saveAndLog({
        dir: clientDir,
        subfolder: target,
        createSubfolder: sub === CREATE,
        fileName: fileName.trim(),
        blob,
        recordId: client.id,
        where: target || "the client folder",
        signer: signerOf(session?.user),
      });
      setSaved(result);
      setLogError(logError);
    } catch (e) {
      setError(`Couldn’t save the file: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSaving(false);
    }
  };

  const targetSub = sub === CREATE ? expectedSub : sub;
  const path = [
    ...(sync?.root ? pathToActiveClients(sync.root) : []),
    folder,
    ...(targetSub ? [targetSub] : []),
  ];
  const shortTarget = [folder, targetSub].filter(Boolean).join(" › ");

  const body = () => {
    const gate = syncGate(sync, { blob, fileName, onReconnect: handleReconnect });
    if (gate) return gate;
    if (!match) return <p className="text-sm text-muted-foreground">Finding the client’s folder…</p>;
    if (match.status === "none") {
      return (
        <DownloadFallback blob={blob} fileName={fileName}>
          There&apos;s no folder for <strong>{match.expected}</strong> in 2. Active Clients. It should be named
          &ldquo;{match.expected}&rdquo;; check the name in Sync, then generate again.
        </DownloadFallback>
      );
    }

    return (
      <div className="space-y-5">
        {match.status === "multiple" && (
          <Notice tone="warning" title={`More than one folder could be ${match.expected}. Pick the right one, and consider merging them:`}>
            <div className="mt-2 space-y-2">
              {match.candidates.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="client-folder"
                    className="accent-primary"
                    checked={folder === c}
                    onChange={() => setFolder(c)}
                  />
                  {c}
                </label>
              ))}
            </div>
          </Notice>
        )}

        {match.status === "flagged" && (
          <Notice tone="warning" title={`This folder isn’t named just “${match.expected}”:`}>
            <ul className="mt-1 list-disc pl-5">
              {match.flags.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </Notice>
        )}

        {folder && subfolders && sub === null && (
          <Notice tone="warning" title={`${folder} has no “${expectedSub}” folder. Where should it go?`}>
            <div className="mt-2 space-y-2">
              {[CREATE, "", ...subfolders].map((s) => (
                <label key={s || "main"} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="subfolder" className="accent-primary" onChange={() => setSub(s)} />
                  {s === CREATE ? <>Create &ldquo;{expectedSub}&rdquo;</> : s || "The client’s main folder"}
                </label>
              ))}
            </div>
          </Notice>
        )}

        {folder && (
          <SaveTargetRows
            from={`The ${doc} you just generated`}
            path={sub === null ? null : path}
            boldFrom={path.length - (targetSub ? 2 : 1)}
            fileName={fileName}
            onFileNameChange={setFileName}
          />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="lg"
            onClick={handleSave}
            disabled={!clientDir || sub === null || !fileName.trim() || saving}
            loading={saving}
            icon={<FolderInput className="h-5 w-5" />}
          >
            {shortTarget && sub !== null ? `Save to ${shortTarget}` : "Save"}
          </Button>
          <PreviewButton blob={blob} />
        </div>
      </div>
    );
  };

  if (autoDownload) return null;

  return (
    <SaveCardShell title={<>Save to the client&apos;s folder</>}>
      {saved ? (
        <SavedMessage path={path} saved={saved} askedName={fileName.trim()} logError={logError} blob={blob} />
      ) : (
        body()
      )}
      {error && <Notice tone="error" title={error} />}
    </SaveCardShell>
  );
}
