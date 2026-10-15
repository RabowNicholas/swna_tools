"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FolderInput, CheckCircle, AlertCircle, AlertTriangle, FileDown } from "lucide-react";
import { downloadBlob, type SaveResult } from "@/lib/files/save-to-client";
import type { SyncState } from "@/lib/files/sync-folder";

// The pieces every "save to a Sync folder" card shares, so the client-folder
// card and the claim-drafts card look and behave the same.

export function SaveCardShell({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FolderInput className="h-5 w-5 text-primary" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function Notice({
  tone,
  title,
  children,
}: {
  tone: "warning" | "error";
  title: string;
  children?: ReactNode;
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

/** A note with a plain download, for when the file can't be saved to Sync */
export function DownloadFallback({ blob, fileName, children }: { blob: Blob; fileName: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{children}</p>
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
}

/** Files already downloaded, so a remount or re-render doesn't download them twice */
const autoDownloaded = new WeakSet<Blob>();

/**
 * With no Sync folder set up (or not in Chrome), the file just downloads like
 * it used to and no save card shows. True in that case, so the card can hide.
 */
export function useAutoDownload(sync: SyncState | null, blob: Blob, fileName: string): boolean {
  const off = sync?.status === "unset" || sync?.status === "unsupported";
  useEffect(() => {
    if (!off || autoDownloaded.has(blob)) return;
    autoDownloaded.add(blob);
    downloadBlob(blob, fileName.trim());
  }, [off, blob, fileName]);
  return off;
}

/**
 * What to show while the Sync folder isn't usable yet: still checking,
 * waiting on Chrome's permission, or moved. Null once it's ready. (With no
 * Sync folder set up at all, useAutoDownload hides the card instead.)
 */
export function syncGate(
  sync: SyncState | null,
  { blob, fileName, onReconnect }: { blob: Blob; fileName: string; onReconnect: () => void }
): ReactNode | null {
  if (!sync) return <p className="text-sm text-muted-foreground">Checking your Sync folder…</p>;
  switch (sync.status) {
    case "needs-permission":
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Chrome needs your OK to use your Sync folder again. Pick &ldquo;Allow on every visit&rdquo; so it stops
            asking.
          </p>
          <Button type="button" onClick={onReconnect} icon={<FolderInput className="h-4 w-4" />}>
            Allow access to {sync.root?.name}
          </Button>
        </div>
      );
    case "missing":
      return (
        <DownloadFallback blob={blob} fileName={fileName}>
          Your Sync folder no longer has &ldquo;1. SWNA Shared Folder/2. Active Clients&rdquo; in it. Check it in{" "}
          <Link href="/settings" className="text-primary underline">Settings</Link>.
        </DownloadFallback>
      );
    default:
      return null;
  }
}

/** The From / To / Name rows; `path` is null until a folder is chosen */
export function SaveTargetRows({
  from,
  path,
  boldFrom,
  fileName,
  onFileNameChange,
}: {
  from: string;
  path: string[] | null;
  /** Folders from this index on are shown bold, the part that changes per file */
  boldFrom: number;
  fileName: string;
  onFileNameChange: (name: string) => void;
}) {
  return (
    <dl className="grid grid-cols-[4rem_1fr] gap-x-3 gap-y-3 text-sm">
      <dt className="font-medium text-muted-foreground">From</dt>
      <dd className="text-foreground">{from}</dd>
      <dt className="font-medium text-muted-foreground">To</dt>
      <dd className="text-foreground break-words">
        {path === null ? (
          <span className="text-muted-foreground">Pick a folder above</span>
        ) : (
          path.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="text-muted-foreground"> › </span>}
              <span className={i >= boldFrom ? "font-semibold" : ""}>{p}</span>
            </span>
          ))
        )}
      </dd>
      <dt className="font-medium text-muted-foreground pt-2.5">Name</dt>
      <dd>
        <Input value={fileName} onChange={(e) => onFileNameChange(e.target.value)} aria-label="File name" />
      </dd>
    </dl>
  );
}

/** The confirmation once the file is written, and whether the log landed */
export function SavedMessage({
  path,
  saved,
  askedName,
  logError,
}: {
  path: string[];
  saved: SaveResult;
  askedName: string;
  logError: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
        <div className="text-sm text-foreground">
          Saved to {path.join(" › ")} › <strong>{saved.savedAs}</strong>
          {saved.renamed && (
            <p className="text-muted-foreground mt-1">
              A file named &ldquo;{askedName}&rdquo; was already there, so this one got a number.
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
  );
}
