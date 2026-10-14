"use client";

import { useEffect, useState } from "react";
import { FolderInput, CheckCircle, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  chooseSyncFolder,
  getSyncState,
  reconnectSyncFolder,
  listFolders,
  pathToActiveClients,
  type SyncState,
} from "@/lib/files/sync-folder";

export default function SettingsPage() {
  const [sync, setSync] = useState<SyncState | null>(null);
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (state?: SyncState) => {
    const next = state ?? (await getSyncState());
    setSync(next);
    setClientCount(null);
    if (next.activeClients) {
      setClientCount((await listFolders(next.activeClients)).length);
    }
  };

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
  }, []);

  const handleChoose = async () => {
    setError(null);
    try {
      await chooseSyncFolder();
      await refresh();
    } catch (e) {
      // Closing the picker isn't an error worth showing
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleReconnect = async () => {
    if (sync?.root) await refresh(await reconnectSyncFolder(sync.root));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader />

      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FolderInput className="h-5 w-5 text-primary" />
            <CardTitle>Sync folder</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Pick the Sync folder on this computer, the one with &ldquo;1. SWNA Shared Folder&rdquo; in it. On a
            Mac it&apos;s usually in Finder&apos;s sidebar under Locations, or at
            ~/Library/CloudStorage/Sync. The app then saves files straight into each client&apos;s folder.
            It&apos;s remembered in this browser only.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sync && <p className="text-sm text-muted-foreground">Checking…</p>}

          {sync?.status === "unsupported" && (
            <p className="text-sm text-muted-foreground">
              This browser can&apos;t save to folders. Open the app in Chrome.
            </p>
          )}

          {sync?.status === "unset" && (
            <p className="text-sm text-muted-foreground">No Sync folder set on this computer yet.</p>
          )}

          {sync?.status === "ready" && sync.root && (
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
              <div>
                <p className="text-foreground">Connected: {pathToActiveClients(sync.root).join(" › ")}</p>
                {clientCount !== null && (
                  <p className="text-muted-foreground">{clientCount.toLocaleString()} client folders</p>
                )}
              </div>
            </div>
          )}

          {sync?.status === "needs-permission" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                &ldquo;{sync.root?.name}&rdquo; is set, but Chrome needs your OK to use it again. Pick &ldquo;Allow
                on every visit&rdquo; so it stops asking.
              </p>
              <Button type="button" onClick={handleReconnect}>
                Allow access
              </Button>
            </div>
          )}

          {sync?.status === "missing" && (
            <p className="text-sm text-destructive">
              &ldquo;{sync.root?.name}&rdquo; no longer has &ldquo;1. SWNA Shared Folder/2. Active Clients&rdquo; in
              it. Pick your Sync folder again.
            </p>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {sync && sync.status !== "unsupported" && (
            <Button
              type="button"
              variant={sync.status === "ready" ? "secondary" : "primary"}
              onClick={handleChoose}
              icon={<FolderInput className="h-4 w-4" />}
            >
              {sync.status === "unset" ? "Choose Sync folder" : "Change Sync folder"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
