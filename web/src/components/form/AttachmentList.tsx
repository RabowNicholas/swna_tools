"use client";

/**
 * PDFs to merge onto the back of a generated letter: a numbered list the user
 * can reorder or trim, and a dropzone to add more. Pair with
 * `mergeAttachments` to build the packet.
 *
 * With `scan`, photos are accepted too and become scanner-look pages (black
 * and white, or grayscale) the same way the DOL Portal does it.
 */

import { useState, type Dispatch, type SetStateAction } from "react";
import { ArrowDown, ArrowUp, Lock, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { FileDropzone } from "@/components/form/FileDropzone";
import { appendPdf } from "@/lib/pdf/append-pdf";
import { addScanPage, DEFAULT_THRESHOLD, loadPhoto, type ScanOptions } from "@/lib/scan/scan-look";
import { cn } from "@/lib/utils";

export const DEFAULT_SCAN: ScanOptions = { gray: false, threshold: DEFAULT_THRESHOLD };

function isPdf(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export interface AttachmentListProps {
  files: File[];
  /** A state setter: one drop of several files adds each in turn */
  onChange: Dispatch<SetStateAction<File[]>>;
  /** Names what to drop, e.g. "the doctor's letter" */
  prompt?: string;
  hint?: string;
  label?: string;
  required?: boolean;
  /** Accept photos as well, turned into scanned pages with these settings */
  scan?: ScanOptions;
  onScanChange?: (scan: ScanOptions) => void;
}

export function AttachmentList({
  files,
  onChange,
  prompt,
  hint,
  label,
  required,
  scan,
  onScanChange,
}: AttachmentListProps) {
  const photos = Boolean(scan);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const hasPhotos = photos && files.some((f) => !isPdf(f));

  // Photos are opened once on the way in, so one Chrome can't read (iPhone
  // HEIC) is turned away here instead of failing the whole letter later
  const add = async (file: File) => {
    if (photos && !isPdf(file)) {
      try {
        (await loadPhoto(file)).close();
      } catch {
        setPhotoErrors((prev) => [
          ...prev,
          /\.hei[cf]$/i.test(file.name)
            ? `${file.name}: Chrome can’t open iPhone HEIC photos. Export it as a JPEG first (in Photos: File › Export).`
            : `${file.name}: couldn’t read this image.`,
        ]);
        return;
      }
    }
    setPhotoErrors([]);
    onChange((current) => [...current, file]);
  };

  const move = (index: number, by: -1 | 1) =>
    onChange((current) => {
      const next = [...current];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });

  return (
    <div className="space-y-4">
      {files.length > 0 && (
        <ol className="space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${file.lastModified}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${file.name} up`}
                className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === files.length - 1}
                aria-label={`Move ${file.name} down`}
                className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange((current) => current.filter((_, j) => j !== i))}
                aria-label={`Remove ${file.name}`}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {hasPhotos && scan && onScanChange && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Photo look">
            {[
              { value: false, label: "Black & white" },
              { value: true, label: "Grayscale" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={scan.gray === o.value}
                onClick={() => onScanChange({ ...scan, gray: o.value })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  scan.gray === o.value ? "bg-primary-fill text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            Photos become scanned pages. PDFs are attached as they are.
          </span>
        </div>
      )}

      <FileDropzone
        accept={photos ? "application/pdf,.pdf,image/*,.heic,.heif" : "application/pdf,.pdf"}
        file={null}
        multiple
        label={label}
        required={required}
        onFile={(file) => void add(file)}
        prompt={prompt ?? (photos ? "PDFs or photos to attach" : "PDFs to attach")}
        hint={hint ?? (photos ? "PDFs or photos (JPG, PNG). Add as many as you need." : "PDF only. Add as many as you need.")}
        typeError={photos ? "Only PDFs and photos can be attached." : "Only PDFs can be attached."}
      />

      {photoErrors.length > 0 && (
        <ul className="space-y-1 text-sm text-destructive">
          {photoErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          Attachments are merged into the letter here in your browser. They
          are never uploaded to the server.
        </p>
      </div>
    </div>
  );
}

/**
 * The letter first, then each attachment in order, as one PDF. Photos (only
 * present when the list was given `scan`) become one scanned page each.
 */
export async function mergeAttachments(
  letter: Blob,
  files: File[],
  scan: ScanOptions = DEFAULT_SCAN
): Promise<Blob> {
  let packet: Uint8Array | ArrayBuffer = await letter.arrayBuffer();
  for (const file of files) {
    let bytes: Uint8Array | ArrayBuffer;
    if (isPdf(file)) {
      bytes = await file.arrayBuffer();
    } else {
      const page = await PDFDocument.create();
      const photo = await loadPhoto(file);
      try {
        await addScanPage(page, photo, scan);
      } finally {
        photo.close();
      }
      bytes = await page.save();
    }
    packet = await appendPdf(packet, bytes, `attachment "${file.name}"`);
  }
  return new Blob([packet as BlobPart], { type: "application/pdf" });
}
