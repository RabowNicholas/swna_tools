"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { FolderInput } from "lucide-react";
import {
  getSyncState,
  reconnectSyncFolder,
  listFolders,
  sharedFolderFrom,
  pathToShared,
  NEW_CLAIMS,
  type DirHandle,
  type SyncState,
} from "@/lib/files/sync-folder";
import { saveAndLog, type SaveResult } from "@/lib/files/save-to-client";
import type { FolderClient } from "./SaveToClientFolder";
import {
  SaveCardShell,
  Notice,
  DownloadFallback,
  syncGate,
  SaveTargetRows,
  SavedMessage,
} from "./SaveCardParts";

const DRAFTS_SUFFIX = "'s Claim Drafts";

/** Picked in the folder list to make the user's own drafts folder */
const CREATE = "__create__";

interface SaveToClaimDraftsProps {
  /** The client the claim is for, whose Airtable Log notes the save */
  client: FolderClient;
  blob: Blob;
  /** e.g. "EEOIC Claim CS B. White 10.14.26.pdf" */
  fileName: string;
}

/**
 * Saves an assembled claim into the signed-in user's "<Name>'s Claim Drafts"
 * under "5. New Claims - To Compile", where it waits for a teammate to check
 * it before it's sent.
 */
export function SaveToClaimDrafts({ client, blob, fileName: givenName }: SaveToClaimDraftsProps) {
  const { data: session } = useSession();
  const expected = `${session?.user?.name ?? ""}${DRAFTS_SUFFIX}`;

  const [sync, setSync] = useState<SyncState | null>(null);
  const [newClaims, setNewClaims] = useState<DirHandle | null>(null);
  const [draftFolders, setDraftFolders] = useState<string[] | null>(null);
  const [folder, setFolder] = useState<string | null>(null);
  const [fileName, setFileName] = useState(givenName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    getSyncState().then(setSync, (e) => setError(String(e)));
  }, []);

  // Find "5. New Claims - To Compile" and the drafts folders in it
  useEffect(() => {
    if (sync?.status !== "ready" || !sync.root || !session?.user?.name) return;
    (async () => {
      const shared = await sharedFolderFrom(sync.root!);
      if (!shared) {
        setUnreachable(true);
        return;
      }
      const dir = (await shared.getDirectoryHandle(NEW_CLAIMS)) as DirHandle;
      const names = (await listFolders(dir)).filter((n) => n.endsWith(DRAFTS_SUFFIX));
      setNewClaims(dir);
      setDraftFolders(names);
      const own = names.find((n) => n.toLowerCase() === expected.toLowerCase());
      if (own) setFolder(own);
    })().catch((e) => setError(`Couldn’t open “${NEW_CLAIMS}”: ${e}`));
  }, [sync, session?.user?.name, expected]);

  const handleReconnect = async () => {
    if (sync?.root) setSync(await reconnectSyncFolder(sync.root));
  };

  const target = folder === CREATE ? expected : folder;
  const path = sync?.root && target ? [...pathToShared(sync.root), NEW_CLAIMS, target] : [];

  const handleSave = async () => {
    if (!newClaims || !folder || !target) return;
    setSaving(true);
    setError(null);
    try {
      const { result, logError } = await saveAndLog({
        dir: newClaims,
        subfolder: target,
        createSubfolder: folder === CREATE,
        fileName: fileName.trim(),
        blob,
        recordId: client.id,
        where: target,
        userEmail: session?.user?.email,
      });
      setSaved(result);
      setLogError(logError);
    } catch (e) {
      setError(`Couldn’t save the file: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSaving(false);
    }
  };

  const body = () => {
    const gate = syncGate(sync, { blob, fileName, onReconnect: handleReconnect });
    if (gate) return gate;
    if (unreachable) {
      return (
        <DownloadFallback blob={blob} fileName={fileName}>
          Your Sync folder is set to &ldquo;2. Active Clients&rdquo;, so the app can&apos;t reach{" "}
          &ldquo;{NEW_CLAIMS}&rdquo;. Pick the Sync folder itself in{" "}
          <Link href="/settings" className="text-primary underline">Settings</Link>.
        </DownloadFallback>
      );
    }
    if (!draftFolders) return <p className="text-sm text-muted-foreground">Finding your Claim Drafts folder…</p>;

    const own = draftFolders.some((n) => n.toLowerCase() === expected.toLowerCase());
    return (
      <div className="space-y-5">
        {!own && (
          <Notice tone="warning" title={`There’s no “${expected}” folder in ${NEW_CLAIMS}. Where should it go?`}>
            <div className="mt-2 space-y-2">
              {[CREATE, ...draftFolders].map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="drafts-folder"
                    className="accent-primary"
                    checked={folder === f}
                    onChange={() => setFolder(f)}
                  />
                  {f === CREATE ? <>Create &ldquo;{expected}&rdquo;</> : f}
                </label>
              ))}
            </div>
          </Notice>
        )}

        <SaveTargetRows
          from="The claim you just assembled"
          path={target ? path : null}
          boldFrom={path.length - 1}
          fileName={fileName}
          onFileNameChange={setFileName}
        />

        <Button
          type="button"
          size="lg"
          onClick={handleSave}
          disabled={!newClaims || !target || !fileName.trim() || saving}
          loading={saving}
          icon={<FolderInput className="h-5 w-5" />}
        >
          {target ? `Save to ${target}` : "Save"}
        </Button>
      </div>
    );
  };

  return (
    <SaveCardShell title="Save to your Claim Drafts">
      {saved ? (
        <SavedMessage path={path} saved={saved} askedName={fileName.trim()} logError={logError} />
      ) : (
        body()
      )}
      {error && <Notice tone="error" title={error} />}
    </SaveCardShell>
  );
}
