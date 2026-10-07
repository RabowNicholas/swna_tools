"use client";

import { Fragment, type ReactNode } from "react";

interface AnswerTextProps {
  text: string;
  /** Cites present in the sources; others render as plain text. */
  knownCites: Set<string>;
  onCiteClick: (cite: string) => void;
}

/** Renders the model's answer: paragraphs, "- " bullets, **bold**, and [cite] chips. */
export function AnswerText({ text, knownCites, onCiteClick }: AnswerTextProps) {
  const blocks = text.split(/\n{2,}/);

  function inline(s: string): ReactNode[] {
    return s.split(/(\*\*[^*]+\*\*|\[[^\]\n]{1,40}\])/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
      const cites = part.match(/^\[(.+)\]$/)?.[1].split(/\s*[;,]\s*/);
      if (cites && cites.every((c) => knownCites.has(c))) {
        return (
          <Fragment key={i}>
            {cites.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onCiteClick(c)}
                className="mx-0.5 inline-block rounded bg-primary/10 px-1.5 py-px align-baseline font-mono text-xs font-semibold text-primary hover:bg-primary/20"
              >
                {c}
              </button>
            ))}
          </Fragment>
        );
      }
      return <Fragment key={i}>{part}</Fragment>;
    });
  }

  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-foreground">
      {blocks.flatMap((block, i) => {
        // Group consecutive bullet lines into a list; other lines are a paragraph.
        const groups: { bullets: boolean; lines: string[] }[] = [];
        for (const line of block.split("\n").filter((l) => l.trim())) {
          const bullet = /^\s*[-*•]\s+/.test(line);
          const last = groups[groups.length - 1];
          const content = line.replace(/^\s*[-*•]\s+/, "");
          if (last && last.bullets === bullet) last.lines.push(content);
          else groups.push({ bullets: bullet, lines: [content] });
        }
        return groups.map((g, j) =>
          g.bullets ? (
            <ul key={`${i}-${j}`} className="list-disc space-y-1 pl-5">
              {g.lines.map((l, k) => (
                <li key={k}>{inline(l)}</li>
              ))}
            </ul>
          ) : (
            <p key={`${i}-${j}`}>{inline(g.lines.join(" "))}</p>
          )
        );
      })}
    </div>
  );
}
