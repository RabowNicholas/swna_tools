"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Download, Send, X } from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ClientSelector, parseClientName, type ClientSelectorClient } from "@/components/form/ClientSelector";
import { FileDropzone, type FilePickerType } from "@/components/form/FileDropzone";
import { PageHeader } from "@/components/layout/PageHeader";
import { SaveToClientFolder } from "@/components/files/SaveToClientFolder";
import { PortalAccess } from "@/components/portal/PortalAccess";
import { AirtableLogCard } from "@/components/airtable/AirtableLogCard";
import { TextTemplateCard, type TextTemplateCardProps } from "@/components/text/TextTemplateCard";
import { downloadBlob } from "@/lib/files/save-to-client";
import { fileNameFor } from "@/lib/files/destinations";
import { track } from "@/lib/events/client";
import { cn } from "@/lib/utils";
import { loadPhoto, renderPage, DEFAULT_THRESHOLD, type ScanOptions } from "@/lib/scan/scan-look";
import { buildPdf } from "@/lib/pdf/build-pdf";
import { readPdf } from "@/lib/pdf/pdf-pages";

// Tags a fresh IR Report submission supersedes — every stage a case can be at
// while an IR is being scheduled or is out with a doctor, from pipeline-config.ts's
// impairment_rating stage (minus the terminal tags that already mean it's back).
const IR_IN_PROGRESS_TAGS = [
  "Pre-IR",
  "Pre-Dr. Lewis IR",
  "Pre-La Plata IR",
  "IR (Dr. Lewis)",
  "IR (La Plata)",
  "IR (Dr. Soo Hoo)",
  "IR (Dr. Lakatosh)",
  "IR Recommended",
];

// Submissions common enough through the portal that the tag work shouldn't
// have to happen by hand in Airtable afterward. Add another entry here for
// the next common one.
const COMMON_SUBMISSIONS = [
  {
    value: "IR Submitted",
    label: "IR Report",
    submissionText: "IR Report",
    removes: IR_IN_PROGRESS_TAGS,
  },
];

// The client text that goes with a common submission, shown inside the log
// card once it's picked and logged in the same entry
const SUBMISSION_TEXT_TEMPLATE: Record<string, string> = {
  "IR Submitted": "ir-report-submitted",
};

const ACCEPT = "application/pdf,.pdf,image/*,.heic,.heif";
const PICKER_TYPES: FilePickerType[] = [
  {
    description: "PDFs and photos",
    accept: { "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png", ".heic", ".heif"] },
  },
];

/** A page in the grid: a photo, or one page of a PDF that was added */
type Page = { id: number; name: string } & (
  | { kind: "photo"; bitmap: ImageBitmap }
  // `src` is the file it came from, `of` that file's page count
  | { kind: "pdf"; bytes: ArrayBuffer; index: number; thumb: string; src: number; of: number }
);

/** A file that was added, and where it lives on disk when Chrome said */
interface Added {
  file: File;
  handle?: FileSystemFileHandle;
}

type Mode = "submit" | "download";

/** Resolution of the on-screen photo previews; the PDF itself is sharper */
const PREVIEW_DPI = 72;
/** Width in pixels the pages of an added PDF are drawn at for the grid */
const PDF_THUMB_WIDTH = 400;

let nextId = 0;

export default function DolPortalPage() {
  const { clients, refreshClients } = useClientContext();
  const [pages, setPages] = useState<Page[]>([]);
  const [reading, setReading] = useState(0);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [gray, setGray] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [readErrors, setReadErrors] = useState<string[]>([]);
  const [building, setBuilding] = useState(false);
  const [pdf, setPdf] = useState<Blob | null>(null);
  // Bumped on every Make PDF, so the cards below start fresh for each file
  const [made, setMade] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("submit");
  const [added, setAdded] = useState<Record<number, Added>>({});
  // The PDF is a file that was added, untouched; it goes as is, not rebuilt
  const [original, setOriginal] = useState<Added | null>(null);
  const [pickedSubmission, setPickedSubmission] = useState<string | null>(null);
  // What the client was texted, when the text is checked off as sent — goes
  // into the same log entry as the submission
  const [textSummary, setTextSummary] = useState<string | null>(null);

  const client = clients.find((c) => c.id === clientId);
  const photos = pages.filter((p) => p.kind === "photo");
  const hasPdfPages = photos.length < pages.length;
  // One PDF with every page in its own order needs no rebuilding, so a file
  // already in Submitted DOL can be recognised as the same file
  const first = pages[0];
  const untouched =
    first?.kind === "pdf" &&
    pages.length === first.of &&
    pages.every((p, i) => p.kind === "pdf" && p.src === first.src && p.index === i)
      ? added[first.src]
      : null;
  const defaultName = untouched
    ? untouched.file.name.replace(/\.pdf$/i, "")
    : hasPdfPages
      ? "Combined"
      : "Scan";
  // What the file is called; a client's folder adds their name and the date.
  // Slashes and colons can't go in a file name.
  const doc = name.trim().replace(/\.pdf$/i, "").replace(/[/\\:]/g, "-") || defaultName;
  const downloadName = `${doc}.pdf`;

  // Any change makes the last PDF out of date
  useEffect(() => setPdf(null), [pages, gray, threshold, clientId, mode]);

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

  const addPdf = async (file: File, handle?: FileSystemFileHandle) => {
    setReading((n) => n + 1);
    try {
      const { bytes, thumbs } = await readPdf(file, PDF_THUMB_WIDTH);
      const src = nextId++;
      setAdded((prev) => ({ ...prev, [src]: { file, handle } }));
      setPages((prev) => [
        ...prev,
        ...thumbs.map((thumb, index) => ({
          id: nextId++,
          name: file.name,
          kind: "pdf" as const,
          bytes,
          index,
          thumb,
          src,
          of: thumbs.length,
        })),
      ]);
    } catch (e) {
      setReadErrors((prev) => [...prev, `${file.name}: ${e instanceof Error ? e.message : "couldn’t read this PDF."}`]);
    } finally {
      setReading((n) => n - 1);
    }
  };

  const addFile = async (file: File, handle?: FileSystemFileHandle) => {
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return addPdf(file, handle);
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
      const blob =
        untouched?.file ??
        (await buildPdf(
          pages.map((p) => (p.kind === "photo" ? p : { kind: "pdf", bytes: p.bytes, index: p.index })),
          { gray, threshold }
        ));
      setOriginal(untouched);
      setPdf(blob);
      setMade((n) => n + 1);
      track({
        type: "tool_used",
        tool: "build-pdf",
        clientId: clientId || undefined,
        props: { pages: pages.length, photos: photos.length, gray, mode },
      });
      if (mode === "download") downloadBlob(blob, downloadName);
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
            take some out. Photos come out looking scanned; PDF pages stay as they are. Several files are combined
            into one PDF, since the portal takes one file per upload.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileDropzone
            accept={ACCEPT}
            pickerTypes={PICKER_TYPES}
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
            <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="What to do with it">
              {(
                [
                  { value: "submit", label: "Submit to DOL" },
                  { value: "download", label: "Just download" },
                ] as const
              ).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === o.value}
                  onClick={() => setMode(o.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mode === o.value ? "bg-primary-fill text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {mode === "submit"
                ? "Files it in the client’s Submitted DOL folder, fills the DOL portal, and logs the DCN."
                : "Downloads the PDF. Nothing is saved to Sync, filed with DOL or logged."}
            </p>
            {mode === "submit" && (
              <ClientSelector
                clients={clients as ClientSelectorClient[]}
                value={clientId}
                onChange={(id) => {
                  setClientId(id);
                  // The log card starts fresh for a new client, so its pick does too
                  setPickedSubmission(null);
                }}
                onRefresh={() => refreshClients(true)}
                showCard={false}
                label="Client"
                placeholder="Pick the client this goes to DOL for"
              />
            )}
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
              helperText={
                mode === "submit"
                  ? client
                    ? `Files as “${fileNameFor(doc, String(client.fields.Name ?? ""))}”, and logs as “Submitted ${doc} to DOL”`
                    : "Say what it is, e.g. Medical Records. The client’s name and the date are added."
                  : `Downloads as “${downloadName}”`
              }
            />
            <Button
              type="button"
              size="lg"
              onClick={handleMake}
              loading={building}
              disabled={building || (mode === "submit" && !client)}
              icon={mode === "submit" ? <Send className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            >
              {building
                ? "Making PDF…"
                : `${mode === "submit" ? "Submit to DOL" : "Download PDF"} (${pages.length} page${pages.length === 1 ? "" : "s"})`}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {pdf && mode === "submit" && client && (
        <>
          <SaveToClientFolder
            key={`save-${made}`}
            client={client}
            blob={pdf}
            destination="build-pdf"
            doc={doc}
            source={original?.handle}
          />

          <PortalAccess key={`portal-${made}`} client={client} autoOpen={true} file={pdf} tool="build-pdf" doc={doc} />

          <AirtableLogCard
            key={`log-${made}`}
            client={client}
            subject={`the ${doc}`}
            action={(reference) =>
              `Submitted ${doc} to DOL (*${reference})` + (textSummary ? `; texted client re: ${textSummary}` : "")
            }
            statusPicker={{
              label: "Common Submission (optional)",
              options: COMMON_SUBMISSIONS,
            }}
            onStatusChange={setPickedSubmission}
          >
            {pickedSubmission && SUBMISSION_TEXT_TEMPLATE[pickedSubmission] && (
              <TextTemplateCard
                client={client as TextTemplateCardProps["client"]}
                templateId={SUBMISSION_TEXT_TEMPLATE[pickedSubmission]}
                onLogSummaryChange={setTextSummary}
                defaultClientName={parseClientName(String(client.fields.Name ?? ""))}
              />
            )}
          </AirtableLogCard>
        </>
      )}

      {pdf && mode === "download" && (
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
