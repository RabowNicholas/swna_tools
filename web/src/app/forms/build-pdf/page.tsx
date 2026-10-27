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
import { loadPhoto, renderPage, DEFAULT_THRESHOLD, type ScanOptions } from "@/lib/scan/scan-look";
import { buildPdf } from "@/lib/pdf/build-pdf";
import { readPdf } from "@/lib/pdf/pdf-pages";

/** A page in the grid: a photo, or one page of a PDF that was added */
type Page = { id: number; name: string } & (
  | { kind: "photo"; bitmap: ImageBitmap }
  | { kind: "pdf"; bytes: ArrayBuffer; index: number; thumb: string }
);

/** Resolution of the on-screen photo previews; the PDF itself is sharper */
const PREVIEW_DPI = 72;
/** Width in pixels the pages of an added PDF are drawn at for the grid */
const PDF_THUMB_WIDTH = 400;

let nextId = 0;

export default function BuildPdfPage() {
  const { clients, refreshClients } = useClientContext();
  const [pages, setPages] = useState<Page[]>([]);
  const [reading, setReading] = useState(0);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [gray, setGray] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [clientId, setClientId] = useState("");
  const [readErrors, setReadErrors] = useState<string[]>([]);
  const [building, setBuilding] = useState(false);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = clients.find((c) => c.id === clientId);
  const photos = pages.filter((p) => p.kind === "photo");
  const hasPdfPages = photos.length < pages.length;
  const downloadName = hasPdfPages ? "Combined.pdf" : "Scan.pdf";

  // Any change makes the last PDF out of date
  useEffect(() => setPdf(null), [pages, gray, threshold, clientId]);

  // Re-render the previews when the photos or the look change; the short
  // wait keeps dragging the slider smooth
  useEffect(() => {
    const opts: ScanOptions = { gray, threshold };
    const timer = setTimeout(() => {
      const next: Record<number, string> = {};
      for (const p of pages) {
        if (p.kind === "photo") next[p.id] = renderPage(p.bitmap, PREVIEW_DPI, opts).toDataURL("image/png");
      }
      setPreviews(next);
    }, 150);
    return () => clearTimeout(timer);
    // Only photos have previews to redraw; PDF pages are drawn once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.map((p) => p.id).join(), gray, threshold]);

  const addPdf = async (file: File) => {
    setReading((n) => n + 1);
    try {
      const { bytes, thumbs } = await readPdf(file, PDF_THUMB_WIDTH);
      setPages((prev) => [
        ...prev,
        ...thumbs.map((thumb, index) => ({ id: nextId++, name: file.name, kind: "pdf" as const, bytes, index, thumb })),
      ]);
    } catch (e) {
      setReadErrors((prev) => [...prev, `${file.name}: ${e instanceof Error ? e.message : "couldn’t read this PDF."}`]);
    } finally {
      setReading((n) => n - 1);
    }
  };

  const addFile = async (file: File) => {
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return addPdf(file);
    try {
      const bitmap = await loadPhoto(file);
      setPages((prev) => [...prev, { id: nextId++, name: file.name, kind: "photo", bitmap }]);
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
    setPages((prev) => {
      const next = [...prev];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });

  const remove = (id: number) => setPages((prev) => prev.filter((p) => p.id !== id));

  const handleMake = async () => {
    setBuilding(true);
    setError(null);
    // Let the button show its spinner before the page work ties up the tab
    await new Promise((r) => setTimeout(r, 50));
    try {
      const blob = await buildPdf(
        pages.map((p) => (p.kind === "photo" ? p : { kind: "pdf", bytes: p.bytes, index: p.index })),
        { gray, threshold }
      );
      setPdf(blob);
      track({
        type: "tool_used",
        tool: "build-pdf",
        clientId: clientId || undefined,
        props: { pages: pages.length, photos: photos.length, gray },
      });
      if (!client) downloadBlob(blob, downloadName);
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
          <CardTitle>Files</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add PDFs and photos of documents. Every page lands in the grid below, where you can put them in order or
            take some out. Photos come out looking scanned; PDF pages stay as they are. Nothing is uploaded; it all
            happens on this computer.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileDropzone
            accept="application/pdf,.pdf,image/*,.heic,.heif"
            file={null}
            multiple
            onFile={addFile}
            prompt="PDFs or photos of the pages"
            hint="PDF, JPG or PNG. Select several at once."
            typeError="Please choose PDFs or photos (JPG or PNG)."
          />
          {reading > 0 && <p className="text-sm text-muted-foreground">Reading the PDF…</p>}
          {readErrors.map((e) => (
            <p key={e} className="text-sm text-destructive">{e}</p>
          ))}
        </CardContent>
      </Card>

      {pages.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {photos.length > 0 && (
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
                {hasPdfPages && <span className="text-sm text-muted-foreground">Only changes the photos.</span>}
              </div>
            )}

            {photos.length > 0 && !gray && (
              <p className="text-sm text-muted-foreground">
                If the pages look speckled, slide toward lighter. If faint writing is missing, slide toward darker,
                or switch to grayscale for photos and light handwriting.
              </p>
            )}

            <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {pages.map((p, i) => {
                const picture = p.kind === "pdf" ? p.thumb : previews[p.id];
                const label = p.kind === "pdf" ? `${p.name}, p. ${p.index + 1}` : p.name;
                return (
                  <li key={p.id} className="space-y-2">
                    <div className="overflow-hidden rounded-md border border-border bg-white">
                      {picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={picture} alt={`Page ${i + 1}`} className="w-full" />
                      ) : (
                        <div className="aspect-[8.5/11] animate-pulse bg-muted" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-sm text-muted-foreground" title={label}>
                        {i + 1}. {label}
                      </span>
                      <span className="flex shrink-0">
                        <IconButton label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}>
                          <ArrowLeft className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Move later" disabled={i === pages.length - 1} onClick={() => move(i, 1)}>
                          <ArrowRight className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Remove" onClick={() => remove(p.id)}>
                          <X className="h-4 w-4" />
                        </IconButton>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {pages.length > 0 && (
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
              {building ? "Making PDF…" : `Make PDF (${pages.length} page${pages.length === 1 ? "" : "s"})`}
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
            <p className="text-sm text-foreground">Your PDF downloaded as {downloadName}.</p>
            <Button type="button" variant="outline" onClick={() => downloadBlob(pdf, downloadName)} icon={<Download className="h-4 w-4" />}>
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
