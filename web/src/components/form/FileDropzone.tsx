"use client";

/**
 * The upload field every tool uses: drop a file on it from Finder, or click
 * (or press Enter/Space) to choose one.
 *
 * A dropped file skips the browser's `accept` filter, so the type is checked
 * here against the same `accept` string before the parent ever sees it.
 */

import { useEffect, useId, useRef, useState } from "react";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileDropzoneProps {
  /** Same format as the input's `accept`: MIME types, `image/*`, or `.ext` */
  accept: string;
  /** The file the parent currently holds, shown in place of the prompt */
  file: File | null;
  onFile: (file: File) => void;
  /** Visible label above the zone */
  label?: string;
  required?: boolean;
  /** Names what to drop, e.g. "the signed AR form" */
  prompt?: string;
  /** Small text under the prompt, e.g. "PDF only" */
  hint?: string;
  /** Shown when a file of the wrong type is dropped or picked */
  typeError?: string;
  disabled?: boolean;
  className?: string;
}

function matchesAccept(file: File, accept: string): boolean {
  const rules = accept
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (rules.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

// A file dropped just outside a zone would otherwise replace the whole app
// with the file. One window listener catches those misses for every zone.
let guardCount = 0;
const swallowFileDrop = (e: DragEvent) => {
  if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
};

export function FileDropzone({
  accept,
  file,
  onFile,
  label,
  required,
  prompt = "a file",
  hint,
  typeError = "That file type isn't accepted here.",
  disabled,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (guardCount++ === 0) {
      window.addEventListener("dragover", swallowFileDrop);
      window.addEventListener("drop", swallowFileDrop);
    }
    return () => {
      if (--guardCount === 0) {
        window.removeEventListener("dragover", swallowFileDrop);
        window.removeEventListener("drop", swallowFileDrop);
      }
    };
  }, []);

  const take = (selected: File | undefined) => {
    if (!selected) return;
    if (!matchesAccept(selected, accept)) {
      setError(typeError);
      return;
    }
    setError(null);
    onFile(selected);
  };

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium mb-2 text-foreground"
        >
          {label}
          {required && (
            <span className="text-muted-foreground" aria-label="required">
              {" "}
              *
            </span>
          )}
        </label>
      )}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={label ? undefined : `Upload ${prompt}`}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={(e) => {
          // Ignore leaving into a child element of the zone
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) take(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-5 text-sm transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          disabled
            ? "cursor-not-allowed opacity-60 border-border"
            : "cursor-pointer hover:bg-muted/40",
          dragging
            ? "border-primary bg-primary/10"
            : error
              ? "border-destructive/60"
              : file
                ? "border-success/40 bg-success/5"
                : "border-border"
        )}
      >
        {file && !dragging ? (
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-success" />
        ) : (
          <Upload
            className={cn(
              "h-5 w-5 flex-shrink-0",
              dragging ? "text-primary" : "text-muted-foreground"
            )}
          />
        )}
        <div className="min-w-0">
          {dragging ? (
            <p className="font-medium text-primary">Drop to upload</p>
          ) : file ? (
            <>
              <p className="truncate font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-muted-foreground">
                Drop or click to replace
              </p>
            </>
          ) : (
            <>
              <p className="text-foreground">
                Drop {prompt} here, or{" "}
                <span className="font-medium text-primary">click to choose</span>
              </p>
              {hint && <p className="text-muted-foreground">{hint}</p>}
            </>
          )}
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            take(e.target.files?.[0]);
            // Lets the same file be picked again after a reset
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p className="mt-2 flex items-start gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
