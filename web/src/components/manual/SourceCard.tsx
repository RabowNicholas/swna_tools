"use client";

import { useRef, useState } from "react";
import { Check, Copy, TextSelect } from "lucide-react";
import { cn } from "@/lib/utils";
import { quoteForLetter } from "@/lib/manual/quotes";
import type { ManualMeta, ManualUnit } from "@/lib/manual/types";

const COLLAPSED_CHARS = 1400;

interface SourceCardProps {
  unit: ManualUnit;
  meta: ManualMeta;
  highlighted?: boolean;
}

/**
 * One manual paragraph or exhibit, shown verbatim. "Copy quote" copies the
 * whole text with its citation; highlighting part of it offers "Copy selection".
 */
export function SourceCard({ unit, meta, highlighted }: SourceCardProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState("");
  const [copied, setCopied] = useState<"all" | "selection" | null>(null);

  const long = unit.text.length > COLLAPSED_CHARS;
  const shown = long && !expanded ? unit.text.slice(0, COLLAPSED_CHARS).replace(/\s+\S*$/, "") + " …" : unit.text;

  function captureSelection() {
    const sel = window.getSelection();
    const inside = sel && bodyRef.current && sel.anchorNode && bodyRef.current.contains(sel.anchorNode);
    setSelection(inside ? sel.toString().trim() : "");
  }

  async function copy(text: string, which: "all" | "selection") {
    await navigator.clipboard.writeText(quoteForLetter(text, unit, meta));
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div
      id={`src-${unit.id}`}
      className={cn(
        "rounded-lg border bg-card p-4 transition-colors scroll-mt-24",
        highlighted ? "border-primary ring-2 ring-primary/30" : "border-border"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <span className="inline-block rounded bg-primary/10 px-2 py-0.5 font-mono text-sm font-semibold text-primary">
            {unit.cite}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {[unit.chapterTitle && `Ch. ${unit.chapter} – ${unit.chapterTitle}`, ...unit.path].filter(Boolean).join(" › ")}
            {unit.page && ` · p. ${unit.page}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {selection && (
            <button
              type="button"
              onClick={() => copy(selection, "selection")}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
            >
              {copied === "selection" ? <Check className="h-4 w-4" /> : <TextSelect className="h-4 w-4" />}
              {copied === "selection" ? "Copied" : "Copy selection"}
            </button>
          )}
          <button
            type="button"
            onClick={() => copy(unit.text, "all")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            {copied === "all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "all" ? "Copied" : "Copy quote"}
          </button>
        </div>
      </div>

      {unit.heading && unit.kind === "paragraph" && unit.text !== unit.heading && !unit.text.startsWith(unit.heading) && (
        <p className="text-sm font-semibold text-foreground">{unit.heading}.</p>
      )}
      <div
        ref={bodyRef}
        onMouseUp={captureSelection}
        onKeyUp={captureSelection}
        className={cn(
          "text-sm leading-relaxed text-foreground selection:bg-primary/25",
          unit.kind === "exhibit" ? "whitespace-pre-wrap font-mono text-xs" : "whitespace-pre-line"
        )}
      >
        {shown}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show full text"}
        </button>
      )}
    </div>
  );
}
