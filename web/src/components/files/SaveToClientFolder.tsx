"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FolderInput, CheckCircle, AlertCircle, AlertTriangle, FileDown } from "lucide-react";
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
import {
  findClientFolder,
  saveToClientFolder,
  logSave,
  downloadBlob,
  type SaveResult,
} from "@/lib/files/save-to-client";

interface Client {
  id: string;
  fields: { Name?: string; [key: string]: unknown };
}

interface SaveToClientFolderProps {
  client: Client;
  /** The file the tool just generated */
  blob: Blob;
  destination: DestinationId;
}

/** Picked in the subfolder list to make the expected subfolder */
const CREATE = "__create__";

/**
 * Saves a generated file straight into the client's Sync folder, showing
 * exactly what goes where before the click, then logs it to Airtable. Falls
 * back to a plain download when there's no Sync folder set up.
 */
export function SaveToClientFolder({ client, blob, destination }: SaveToClientFolderProps) {
  const { data: session } = useSession();
  const { doc, subfolder: expectedSub } = DESTINATIONS[destination];
  const airtableName = client.fields.Name ?? "";

  const [sync, setSync] = useState<SyncState | null>(null);
  const [match, setMatch] = useState<FolderMatch | null>(null);
  const [folder, setFolder] = useState("");
  const [clientDir, setClientDir] = useState<DirHandle | null>(null);
  const [subfolders, setSubfolders] = useState<string[] | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [fileName, setFileName] = useState(() => fileNameFor(doc, airtableName));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  useEffect(() => {
    getSyncState().then(setSync, (e) => setError(String(e)));
  }, []);

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
      const result = await saveToClientFolder({
        clientDir,
        subfolder: target,
        fileName: fileName.trim(),
        blob,
        createSubfolder: sub === CREATE,
      });
      setSaved(result);
      try {
        await logSave({
          recordId: client.id,
          fileName: result.savedAs,
          where: target || "the client folder",
          userEmail: session?.user?.email,
        });
      } catch (e) {
        setLogError(e instanceof Error ? e.message : String(e));
      }
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

  const fallback = (message: React.ReactNode) => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button
        type="button"
        variant="secondary"
        onClick={() => downloadBlob(blob, fileName.trim())}
        icon={<FileDown className="h-4 w-4" />}
      >
        Download instead
      </Button>
    </div>
  );

  const body = () => {
    if (!sync) return <p className="text-sm text-muted-foreground">Checking your Sync folder…</p>;
    if (sync.status === "unsupported") {
      return fallback("Saving straight to the client folder only works in Chrome.");
    }
    if (sync.status === "unset") {
      return fallback(
        <>
          Set your Sync folder in <Link href="/settings" className="text-primary underline">Settings</Link>{" "}
          to save files straight to the client&apos;s folder.
        </>
      );
    }
    if (sync.status === "needs-permission") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Chrome needs your OK to use your Sync folder again. Pick &ldquo;Allow on every visit&rdquo; so it stops asking.
          </p>
          <Button type="button" onClick={handleReconnect} icon={<FolderInput className="h-4 w-4" />}>
            Allow access to {sync.root?.name}
          </Button>
        </div>
      );
    }
    if (sync.status === "missing") {
      return fallback(
        <>
          Your Sync folder no longer has “1. SWNA Shared Folder/2. Active Clients” in it. Check it in{" "}
          <Link href="/settings" className="text-primary underline">Settings</Link>.
        </>
      );
    }
    if (!match) return <p className="text-sm text-muted-foreground">Finding the client’s folder…</p>;
    if (match.status === "none") {
      return fallback(
        <>
          There&apos;s no folder for <strong>{match.expected}</strong> in 2. Active Clients. It should be named
          &ldquo;{match.expected}&rdquo;; check the name in Sync, then generate again.
        </>
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
          <dl className="grid grid-cols-[4rem_1fr] gap-x-3 gap-y-3 text-sm">
            <dt className="font-medium text-muted-foreground">From</dt>
            <dd className="text-foreground">The {doc} you just generated</dd>
            <dt className="font-medium text-muted-foreground">To</dt>
            <dd className="text-foreground break-words">
              {sub === null ? (
                <span className="text-muted-foreground">Pick a folder above</span>
              ) : (
                path.map((p, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-muted-foreground"> › </span>}
                    <span className={i >= path.length - (targetSub ? 2 : 1) ? "font-semibold" : ""}>{p}</span>
                  </span>
                ))
              )}
            </dd>
            <dt className="font-medium text-muted-foreground pt-2.5">Name</dt>
            <dd>
              <Input value={fileName} onChange={(e) => setFileName(e.target.value)} aria-label="File name" />
            </dd>
          </dl>
        )}

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
      </div>
    );
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FolderInput className="h-5 w-5 text-primary" />
          <CardTitle>Save to the client&apos;s folder</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {saved ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                Saved to {path.join(" › ")} › <strong>{saved.savedAs}</strong>
                {saved.renamed && (
                  <p className="text-muted-foreground mt-1">
                    A file named &ldquo;{fileName.trim()}&rdquo; was already there, so this one got a number.
                  </p>
                )}
                {!logError && <p className="text-muted-foreground mt-1">Noted in the client&apos;s Airtable Log.</p>}
              </div>
            </div>
            {logError && (
              <Notice tone="error" title="The file is saved, but the Airtable Log wasn’t updated:">
                {logError}
              </Notice>
            )}
          </div>
        ) : (
          body()
        )}
        {error && <Notice tone="error" title={error} />}
      </CardContent>
    </Card>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: "warning" | "error";
  title: string;
  children?: React.ReactNode;
}) {
  const Icon = tone === "warning" ? AlertTriangle : AlertCircle;
  return (
    <div
      className={
        tone === "warning"
          ? "flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm"
          : "flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm"
      }
    >
      <Icon className={tone === "warning" ? "h-4 w-4 mt-0.5 text-warning flex-shrink-0" : "h-4 w-4 mt-0.5 text-destructive flex-shrink-0"} />
      <div className="text-foreground">
        <p>{title}</p>
        {children}
      </div>
    </div>
  );
}
