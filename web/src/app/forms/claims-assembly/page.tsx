"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { trackEvent } from "@/lib/analytics";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  FileStack,
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Upload,
  Lock,
} from "lucide-react";
import {
  CONDITIONS,
  COVER_SHEET_PATH,
  getCondition,
  requiredDocuments,
  claimFileName,
  type DocumentSlot,
} from "@/lib/claims/manifest";
import {
  assembleClaim,
  formatPageRange,
  AssemblyError,
  type AssemblyInput,
  type PageRange,
} from "@/lib/claims/assemble";

const CLAIM_TYPES = [
  { value: "primary", label: "Primary" },
  { value: "consequential", label: "Consequential (CQ) — not supported yet", disabled: true },
  { value: "survivorship", label: "Survivorship — not supported yet", disabled: true },
  { value: "blind_file", label: "Blind-file — not supported yet", disabled: true },
];

export default function ClaimsAssemblyPage() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      trackEvent.formViewed("claims-assembly", session.user.id);
    }
  }, [session]);

  const [conditionId, setConditionId] = useState("");
  const [otherAbbreviation, setOtherAbbreviation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hasPriorClaim, setHasPriorClaim] = useState(false);

  // Uploaded file per slot id
  const [files, setFiles] = useState<Record<string, File>>({});

  const [assembling, setAssembling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; ranges: PageRange[]; pageCount: number } | null>(null);

  const condition = getCondition(conditionId);

  const slots: DocumentSlot[] = useMemo(
    () => (condition ? requiredDocuments(condition.category, { needsEE3: !hasPriorClaim }) : []),
    [condition, hasPriorClaim]
  );

  const abbreviation =
    condition?.id === "other" ? otherAbbreviation.trim() : condition?.abbreviation ?? "";

  const uploadSlots = slots.filter((s) => s.source === "upload");
  const missing = uploadSlots.filter((s) => s.required && !files[s.id]);

  const canAssemble =
    !!condition &&
    abbreviation.length > 0 &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    missing.length === 0 &&
    !assembling;

  const selectFile = (slotId: string, file: File | undefined) => {
    setResult(null);
    setError(null);
    setFiles((prev) => {
      const next = { ...prev };
      if (file) next[slotId] = file;
      else delete next[slotId];
      return next;
    });
  };

  // Everything below runs in the browser — the claim's documents are read from
  // local files and merged here, so no client medical record is ever uploaded.
  const handleAssemble = async () => {
    if (!condition) return;

    setAssembling(true);
    setError(null);
    setResult(null);

    try {
      const inputs: AssemblyInput[] = [];

      for (const slot of slots) {
        if (slot.source === "template") {
          const response = await fetch(slot.templatePath ?? COVER_SHEET_PATH);
          // Templates sit behind the auth middleware, so an expired session
          // redirects to the login page — a 200 of HTML rather than a failure.
          // Check the type, or the merge fails later with an opaque parse error.
          const isPdf = response.headers.get("content-type")?.includes("pdf");
          if (!response.ok || !isPdf) {
            throw new Error(
              `Could not load the ${slot.label.toLowerCase()}. Your session may have expired — refresh the page and try again.`
            );
          }
          inputs.push({ slotId: slot.id, label: slot.label, bytes: await response.arrayBuffer() });
          continue;
        }

        const file = files[slot.id];
        if (!file) continue;
        inputs.push({ slotId: slot.id, label: slot.label, bytes: await file.arrayBuffer() });
      }

      const assembled = await assembleClaim(inputs);
      const name = claimFileName({
        conditionAbbr: abbreviation,
        firstName,
        lastName,
      });

      const blob = new Blob([assembled.pdfBytes as BlobPart], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (session?.user) {
        trackEvent.pdfGenerated("claims-assembly", session.user.id);
      }

      setResult({ name, ranges: assembled.ranges, pageCount: assembled.pageCount });
    } catch (err) {
      console.error("Error assembling claim:", err);
      setError(
        err instanceof AssemblyError || err instanceof Error
          ? err.message
          : "Failed to assemble the claim. Please try again."
      );
    } finally {
      setAssembling(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">📑 Claims Assembly</h1>
        <p className="text-muted-foreground">
          Pick the condition and this lists the documents the claim needs, in order. Add them and it
          builds the assembled claim, named and ready for review.
        </p>
      </div>

      {/* Claim setup */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <ClipboardList className="h-5 w-5 text-success" />
            <CardTitle>Claim Details</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            These determine which documents are required and what the finished claim is called
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Claim Type"
                required
                value="primary"
                onChange={() => undefined}
                options={CLAIM_TYPES}
                helperText="Consequential, survivorship and blind-file claims are still assembled by hand"
              />

              <Select
                label="Condition"
                required
                value={conditionId}
                onChange={(e) => {
                  setConditionId(e.target.value);
                  setResult(null);
                }}
                placeholder="Select the claimed condition"
                options={CONDITIONS.map((c) => ({ value: c.id, label: c.label }))}
                helperText="Sets the medical evidence the claim needs"
              />
            </div>

            {condition?.id === "other" && (
              <Input
                label="Condition Abbreviation"
                required
                placeholder="e.g. CKD"
                value={otherAbbreviation}
                onChange={(e) => setOtherAbbreviation(e.target.value)}
                helperText="Used in the claim filename"
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Claimant First Name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                helperText="Only the initial appears in the filename"
              />
              <Input
                label="Claimant Last Name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPriorClaim}
                onChange={(e) => {
                  setHasPriorClaim(e.target.checked);
                  setResult(null);
                }}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">
                  A claim has already been submitted for this client
                </span>
                <span className="block text-muted-foreground">
                  By us or a previous AR. Removes the EE-3, which is only filed on a client&apos;s
                  first claim.
                </span>
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Document slots */}
      {condition && (
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileStack className="h-5 w-5 text-primary" />
              <CardTitle>Documents</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Listed in the order they&apos;ll appear in the assembled claim
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {slots.map((slot, index) => {
                const file = files[slot.id];
                const satisfied = slot.source === "template" || !!file;

                return (
                  <div
                    key={slot.id}
                    className="flex items-start gap-4 rounded-lg border border-border p-4"
                  >
                    <div
                      className={
                        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium " +
                        (satisfied
                          ? "bg-success/15 text-success"
                          : "bg-accent text-muted-foreground")
                      }
                    >
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{slot.label}</span>
                        {slot.source === "template" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                            <CheckCircle className="h-3 w-3" />
                            Added automatically
                          </span>
                        )}
                      </div>

                      {slot.hint && (
                        <p className="text-sm text-muted-foreground">{slot.hint}</p>
                      )}

                      {slot.source === "upload" && (
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(e) => selectFile(slot.id, e.target.files?.[0])}
                            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent/80"
                          />
                          {file && (
                            <p className="flex items-center gap-1 text-sm text-success">
                              <CheckCircle className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              Documents are merged in your browser. Nothing is uploaded or stored.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Assemble */}
      {condition && (
        <div className="flex flex-col items-center gap-4">
          {missing.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Still needed: {missing.map((s) => s.label).join(", ")}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="button"
            onClick={handleAssemble}
            disabled={!canAssemble}
            loading={assembling}
            size="xl"
            className="min-w-[220px] bg-purple-600 text-white shadow-lg shadow-purple-500/50 hover:bg-purple-700"
            icon={<Upload className="h-5 w-5" />}
          >
            {assembling ? "Assembling..." : "Assemble Claim"}
          </Button>
        </div>
      )}

      {/* Result */}
      {result && (
        <Card variant="elevated" className="bg-success/10 border-success/20">
          <CardContent>
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 flex-shrink-0 text-success" />
              <div className="ml-4 space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-foreground">Claim assembled</h3>
                  <p className="text-sm text-muted-foreground">
                    {result.pageCount} pages, downloaded as{" "}
                    <span className="font-medium text-foreground">{result.name}.pdf</span>
                  </p>
                </div>

                <div className="space-y-1">
                  {result.ranges.map((range) => (
                    <div key={range.slotId} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{range.label}</span>
                      {" — page "}
                      {formatPageRange(range)}
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">
                  Leave it in your Claim Drafts folder until another team member has checked it.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
