"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { Loader2, MessageCircleQuestion, Quote, Search, ShieldAlert, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SourceCard } from "@/components/manual/SourceCard";
import { AnswerText } from "@/components/manual/AnswerText";
import { buildIndex, type ManualIndex } from "@/lib/manual/search";
import { loadEmbedder } from "@/lib/manual/embedder";
import type { AskResponse, ManualData, ManualEmbeddings, ManualUnit } from "@/lib/manual/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageError } from "@/components/ui/PageStatus";

type Tab = "ask" | "quote";

const EXAMPLES: Record<Tab, string[]> = {
  ask: [
    "How long does a claimant have to object to a recommended decision?",
    "What happens if the employee hasn't reached MMI for an impairment rating?",
    "Who qualifies as an eligible survivor under Part E?",
  ],
  quote: ["impairment rating physician qualifications", "60 days to file an objection", "21.4c(1)"],
};

export default function ProcedureManualPage() {
  const { data: session } = useSession();
  const [index, setIndex] = useState<ManualIndex | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [semanticReady, setSemanticReady] = useState(false);

  const [tab, setTab] = useState<Tab>("ask");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ManualUnit[]>([]);
  const [searched, setSearched] = useState(false);

  const [asking, setAsking] = useState(false);
  const [ask, setAsk] = useState<(AskResponse & { question: string }) | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (session?.user) trackEvent.formViewed("procedure-manual", session.user.id);
  }, [session]);

  // The manual (~4 MB) loads in its own chunk; the search model loads after it.
  useEffect(() => {
    Promise.all([import("@/data/manual/units.json"), import("@/data/manual/embeddings.json")])
      .then(([units, emb]) => {
        setIndex(buildIndex(units.default as ManualData, emb.default as ManualEmbeddings));
        loadEmbedder()
          .then(() => setSemanticReady(true))
          .catch((err) => console.warn("Semantic search unavailable, using keywords only:", err));
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)));
  }, []);

  async function runSearch(q: string, k: number) {
    if (!index) return [];
    let queryVector: Float32Array | undefined;
    if (semanticReady) {
      try {
        queryVector = await (await loadEmbedder())(q);
      } catch {
        // keyword-only
      }
    }
    return index.search(q, { k, queryVector });
  }

  // Find a quote: live results as you type.
  useEffect(() => {
    if (tab !== "quote" || !index) return;
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearched(false);
      return;
    }
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      const r = await runSearch(q, 15);
      if (seq === searchSeq.current) {
        setResults(r);
        setSearched(true);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab, index, semanticReady]);

  async function submitAsk(e?: FormEvent, question = query) {
    e?.preventDefault();
    const q = question.trim();
    if (!q || !index || asking) return;
    setAsking(true);
    setAskError(null);
    setHighlight(null);
    try {
      const sources = await runSearch(q, 8);
      setAsk({ question: q, answer: null, sources });
      const res = await fetch("/api/manual/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, sourceIds: sources.map((s) => s.id) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Request failed (${res.status})`);
      setAsk({ question: q, ...(await res.json()) });
    } catch (err) {
      setAskError(err instanceof Error ? err.message : String(err));
    } finally {
      setAsking(false);
    }
  }

  const knownCites = useMemo(() => new Set(ask?.sources.map((s) => s.cite) ?? []), [ask]);

  function jumpToCite(cite: string) {
    const unit = ask?.sources.find((s) => s.cite === cite);
    if (!unit) return;
    setHighlight(unit.id);
    document.getElementById(`src-${unit.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function pickExample(text: string) {
    setQuery(text);
    if (tab === "ask") submitAsk(undefined, text);
  }

  if (loadError) {
    return <PageError title="Couldn’t load the Procedure Manual" message={loadError} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        description={
          <>
            Ask a question or find an exact quote from the Federal (EEOICPA) Procedure Manual
            {index && ` — Version ${index.meta.version}, published ${index.meta.published}`}.
          </>
        }
      />
      <Card variant="elevated">
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <span>General procedure questions only. Don’t enter claimant names, case numbers, or medical details.</span>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-muted p-1" role="tablist">
            {(
              [
                ["ask", "Ask", MessageCircleQuestion],
                ["quote", "Find a quote", Quote],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submitAsk} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={!index}
                aria-label={tab === "ask" ? "Your question" : "Search the manual"}
                placeholder={
                  tab === "ask" ? "Ask a question about the claims process…" : "Search words, a topic, or a cite like 21.4c(1)…"
                }
                className="h-11 w-full rounded-lg border border-input-border bg-input pl-9 pr-3 text-base text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {tab === "ask" && (
              <button
                type="submit"
                disabled={!index || asking || !query.trim()}
                className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Ask
              </button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Try:</span>
            {EXAMPLES[tab].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => pickExample(ex)}
                disabled={!index}
                className="rounded-full border border-border px-3 py-1 text-foreground hover:bg-muted"
              >
                {ex}
              </button>
            ))}
          </div>

          {!index && <LoadingSpinner size="sm" label="Loading the manual…" />}
        </CardContent>
      </Card>

      {tab === "ask" && (askError || ask) && (
        <div className="space-y-4">
          <Card variant="elevated">
            <CardContent className="p-6 space-y-3">
              {ask && <p className="text-sm font-medium text-muted-foreground">{ask.question}</p>}
              {askError ? (
                <p className="text-destructive">Something went wrong: {askError}</p>
              ) : asking ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Reading the manual…
                </div>
              ) : ask?.answer ? (
                <>
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                    <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      <strong>This answer is AI-generated and may contain mistakes.</strong> Verify the details against the
                      Procedure Manual sources below before relying on it.
                    </span>
                  </div>
                  <AnswerText text={ask.answer} knownCites={knownCites} onCiteClick={jumpToCite} />
                  <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                    Click a cite to jump to its source. Quotation marks are used only for text verified word-for-word
                    against the manual.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  {ask?.unavailableReason ?? "No answer."} Here are the most relevant sections instead.
                </p>
              )}
            </CardContent>
          </Card>

          {ask && ask.sources.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sources</h2>
              {ask.sources.map((u) => (
                <SourceCard key={u.id} unit={u} meta={index!.meta} highlighted={highlight === u.id} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "quote" && searched && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {results.length ? "Highlight text to copy part of a paragraph" : "No matching sections"}
          </h2>
          {results.map((u) => (
            <SourceCard key={u.id} unit={u} meta={index!.meta} />
          ))}
        </div>
      )}
    </div>
  );
}
