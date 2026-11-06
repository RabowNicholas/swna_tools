"use client";

/**
 * PDFs to merge onto the back of a generated letter: a numbered list the user
 * can reorder or trim, and a dropzone to add more. Pair with
 * `mergeAttachments` to build the packet.
 */

import type { Dispatch, SetStateAction } from "react";
import { ArrowDown, ArrowUp, Lock, X } from "lucide-react";
import { FileDropzone } from "@/components/form/FileDropzone";
import { appendPdf } from "@/lib/pdf/append-pdf";

export interface AttachmentListProps {
  files: File[];
  /** A state setter: one drop of several files adds each in turn */
  onChange: Dispatch<SetStateAction<File[]>>;
  /** Names what to drop, e.g. "the doctor's letter" */
  prompt?: string;
  hint?: string;
  label?: string;
  required?: boolean;
}

export function AttachmentList({
  files,
  onChange,
  prompt = "PDFs to attach",
  hint = "PDF only. Add as many as you need.",
  label,
  required,
}: AttachmentListProps) {
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

      <FileDropzone
        accept="application/pdf,.pdf"
        file={null}
        multiple
        label={label}
        required={required}
        onFile={(file) => onChange((current) => [...current, file])}
        prompt={prompt}
        hint={hint}
        typeError="Only PDFs can be attached."
      />

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

/** The letter first, then each attachment in order, as one PDF */
export async function mergeAttachments(letter: Blob, files: File[]): Promise<Blob> {
  let packet: Uint8Array | ArrayBuffer = await letter.arrayBuffer();
  for (const file of files) {
    packet = await appendPdf(packet, await file.arrayBuffer(), `attachment "${file.name}"`);
  }
  return new Blob([packet as BlobPart], { type: "application/pdf" });
}
