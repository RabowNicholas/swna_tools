"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Download, FileText, X } from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ClientSelector, type ClientSelectorClient } from "@/components/form/ClientSelector";
import { FileDropzone } from "@/components/form/FileDropzone";
import { PageHeader } from "@/components/layout/PageHeader";
import { SaveToClientFolder } from "@/components/files/SaveToClientFolder";
import { downloadBlob } from "@/lib/files/save-to-client";
import { track } from "@/lib/events/client";
import { cn } from "@/lib/utils";
import {
  buildScanPdf,
  loadPhoto,
  renderPage,
  DEFAULT_THRESHOLD,
  type ScanOptions,
} from "@/lib/scan/scan-look";

interface ScanPhoto {
  id: number;
  name: string;
  bitmap: ImageBitmap;
}

/** Resolution of the on-screen previews; the PDF itself is sharper */
const PREVIEW_DPI = 72;

let nextId = 0;

export default function ScanToPdfPage() {
  const { clients, refreshClients } = useClientContext();
  const [photos, setPhotos] = useState<ScanPhoto[]>([]);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [gray, setGray] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [clientId, setClientId] = useState("");
  const [readErrors, setReadErrors] = useState<string[]>([]);
  const [building, setBuilding] = useState(false);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = clients.find((c) => c.id === clientId);

  // Any change makes the last PDF out of date
  useEffect(() => setPdf(null), [photos, gray, threshold, clientId]);

  // Re-render the previews when the photos or the look change; the short
  // wait keeps dragging the slider smooth
  useEffect(() => {
    const opts: ScanOptions = { gray, threshold };
    const timer = setTimeout(() => {
      const next: Record<number, string> = {};
      for (const p of photos) next[p.id] = renderPage(p.bitmap, PREVIEW_DPI, opts).toDataURL("image/png");
      setPreviews(next);
    }, 150);
    return () => clearTimeout(timer);
  }, [photos, gray, threshold]);

  const addFile = async (file: File) => {
    try {
      const bitmap = await loadPhoto(file);
      setPhotos((prev) => [...prev, { id: nextId++, name: file.name, bitmap }]);
    } catch {
      const heic = /\.hei[cf]$/i.test(file.name);
      setReadErrors((prev) => [
        ...prev,
        heic
          ? `${file.name}: Chrome can’t open iPhone HEIC photos. Export it as a JPEG first (in Photos: File › Export).`
          : `${file.name}: couldn’t read this image.`,
      ]);
    }
  };

  const move = (index: number, by: number) =>
    setPhotos((prev) => {
      const next = [...prev];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });

  const remove = (id: number) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  const handleMake = async () => {
    setBuilding(true);
    setError(null);
    // Let the button show its spinner before the page work ties up the tab
    await new Promise((r) => setTimeout(r, 50));
    try {
      const blob = await buildScanPdf(photos.map((p) => p.bitmap), { gray, threshold });
      setPdf(blob);
      track({ type: "tool_used", tool: "scan-to-pdf", clientId: clientId || undefined, props: { pages: photos.length, gray } });
      if (!client) downloadBlob(blob, "Scan.pdf");
    } catch (e) {
      setError(`Couldn’t make the PDF: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader />

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Photos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each photo becomes one page, in the order shown below. Nothing is uploaded; it all happens on this computer.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileDropzone
            accept="image/*,.heic,.heif"
            file={null}
            multiple
            onFile={addFile}
            prompt="photos of the pages"
            hint="JPG or PNG. Select several at once."
            typeError="Please choose photos (JPG or PNG)."
          />
          {readErrors.map((e) => (
            <p key={e} className="text-sm text-destructive">{e}</p>
          ))}
        </CardContent>
      </Card>

      {photos.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Look">
                {[
                  { value: false, label: "Black & white" },
                  { value: true, label: "Grayscale" },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    role="radio"
                    aria-checked={gray === o.value}
                    onClick={() => setGray(o.value)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      gray === o.value ? "bg-primary-fill text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              {!gray && (
                <label className="flex items-center gap-3 text-sm text-muted-foreground">
                  Lighter
                  <input
                    type="range"
                    min={120}
                    max={230}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-40 accent-primary"
                    aria-label="Darkness"
                  />
                  Darker
                </label>
              )}
            </div>

            {!gray && (
              <p className="text-sm text-muted-foreground">
                If the pages look speckled, slide toward lighter. If faint writing is missing, slide toward darker,
                or switch to grayscale for photos and light handwriting.
              </p>
            )}

            <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((p, i) => (
                <li key={p.id} className="space-y-2">
                  <div className="overflow-hidden rounded-md border border-border bg-white">
                    {previews[p.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previews[p.id]} alt={`Page ${i + 1}`} className="w-full" />
                    ) : (
                      <div className="aspect-[8.5/11] animate-pulse bg-muted" />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-sm text-muted-foreground" title={p.name}>
                      {i + 1}. {p.name}
                    </span>
                    <span className="flex shrink-0">
                      <IconButton label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowLeft className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Move later" disabled={i === photos.length - 1} onClick={() => move(i, 1)}>
                        <ArrowRight className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Remove" onClick={() => remove(p.id)}>
                        <X className="h-4 w-4" />
                      </IconButton>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {photos.length > 0 && (
        <Card variant="elevated">
          <CardContent className="space-y-6 p-6">
            <ClientSelector
              clients={clients as ClientSelectorClient[]}
              value={clientId}
              onChange={setClientId}
              onRefresh={() => refreshClients(true)}
              showCard={false}
              label="Client (optional)"
              placeholder="Pick a client to save into their folder"
            />
            <Button
              type="button"
              size="lg"
              onClick={handleMake}
              loading={building}
              disabled={building}
              icon={<FileText className="h-5 w-5" />}
            >
              {building ? "Making PDF…" : `Make PDF (${photos.length} page${photos.length === 1 ? "" : "s"})`}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {pdf && client && (
        <SaveToClientFolder key={clientId} client={client} blob={pdf} destination="scan" />
      )}

      {pdf && !client && (
        <Card variant="elevated" className="bg-success/10 border-success/20">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <p className="text-sm text-foreground">Your PDF downloaded as Scan.pdf.</p>
            <Button type="button" variant="outline" onClick={() => downloadBlob(pdf, "Scan.pdf")} icon={<Download className="h-4 w-4" />}>
              Download again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
