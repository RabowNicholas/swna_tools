"use client";

import { ReactNode, useState } from "react";
import { useSession } from "next-auth/react";
import { useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Database, CheckCircle, AlertCircle } from "lucide-react";
import { buildLogEntry } from "@/lib/airtable-log";

interface Client {
  id: string;
  fields: {
    Name?: string;
    [key: string]: string | string[] | undefined;
  };
}

/**
 * Extra fields to write in the same request as the log entry, or the reason the
 * write can't go ahead — resolved at click time so a value Airtable would
 * reject is caught here rather than failing the whole update.
 */
export type ExtraFields =
  | { fields: Record<string, string | string[]> }
  | { error: string };

/**
 * An optional set of Status tags to offer alongside the log entry, so a tag
 * that always follows a submission can be applied without opening Airtable.
 * The picked tag is prepended to the record's existing Status rather than
 * replacing it — see the `prepend` handling in `/api/clients`.
 */
export interface StatusPicker {
  /** Sentence above the choices */
  label: string;
  options: {
    value: string;
    label: string;
    /**
     * Tags this choice supersedes, dropped from Status in the same write —
     * for a tag that answers an earlier one rather than sitting beside it.
     */
    removes?: string[];
  }[];
}

/**
 * A free-text field asking what was submitted, for tools where the submission
 * isn't one fixed document. What the user types is passed to `action` and
 * nothing is written until it's filled in.
 */
export interface SubmissionField {
  /** Label above the box */
  label: string;
  placeholder?: string;
  helperText?: string;
}

interface AirtableLogCardProps {
  client: Client;
  /**
   * The completed act to log, built from the reference number the portal gave
   * back and whichever Status tag was picked, e.g. `Submitted RD waiver,
   * Option 1 (*12345)`. Goes through `buildLogEntry` so every tool's entries
   * read the same way.
   */
  action: (
    reference: string,
    statusTags: string[],
    submission: string
  ) => string;
  /**
   * What was submitted, in the form "the waiver" — fills the default
   * description and confirmation.
   */
  subject: string;
  /** Overrides the sentence under the title when the write does more than log */
  description?: ReactNode;
  /** Overrides the confirmation shown once the write has landed */
  confirmation?: (reference: string) => ReactNode;
  /** Overrides the preview above the button, which defaults to the log line */
  preview?: ReactNode;
  extraFields?: () => ExtraFields;
  /** Offers a Status tag to add in the same write. Omit to show no picker. */
  statusPicker?: StatusPicker;
  /**
   * Asks the user what was submitted before the write can go ahead. Omit for
   * tools that already know — the log line is fixed there.
   */
  submissionField?: SubmissionField;
}

/**
 * The card every portal-submitted tool shows after generating its document:
 * paste the reference number the portal gave back, and the submission is
 * prepended to the client's Airtable Log.
 *
 * Nothing is written until the user confirms the reference number, so a
 * document that never made it into the portal never gets logged. State lives
 * here — give the card a `key` that changes per submission so regenerating
 * starts it fresh.
 */
export function AirtableLogCard({
  client,
  action,
  subject,
  description,
  confirmation,
  preview,
  extraFields,
  statusPicker,
  submissionField,
}: AirtableLogCardProps) {
  const { data: session } = useSession();
  const { refreshClients } = useClients();
  const [referenceNumber, setReferenceNumber] = useState("");
  const [statusTag, setStatusTag] = useState<string | null>(null);
  const [submission, setSubmission] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = client.fields.Name;
  // Picking a tag is optional — a submission that warrants no tag still logs.
  const pickedOption = statusPicker?.options.find((o) => o.value === statusTag);
  const statusTags = statusPicker && statusTag ? [statusTag] : [];
  const removedTags = pickedOption?.removes ?? [];
  const submitted = submission.trim();
  // A card that asks what was submitted can't log until it's been answered.
  const ready = !!referenceNumber.trim() && (!submissionField || !!submitted);
  const logEntry = (reference: string) =>
    buildLogEntry(action(reference, statusTags, submitted), session?.user?.email);

  const handleUpdate = async () => {
    const reference = referenceNumber.trim();
    if (!reference || !ready) return;

    const extra = extraFields?.();
    if (extra && "error" in extra) {
      setError(extra.error);
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      // Any extra fields go in the same request as the log entry so the record
      // can't be updated without the log, or logged without the update.
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: client.id,
          ...(extra ? { fields: extra.fields } : {}),
          prepend: {
            Log: logEntry(reference),
            // Goes through `prepend` rather than `fields` so the tag is merged
            // ahead of the record's existing Status instead of replacing it.
            ...(statusTags.length ? { Status: statusTags } : {}),
          },
          // Resolved against the record's current Status in the same PATCH, so
          // the superseded tag can't survive the one that replaces it.
          ...(removedTags.length ? { remove: { Status: removedTags } } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details ||
            errorData.error ||
            "Failed to update client in Airtable"
        );
      }

      setUpdated(true);
    } catch (err) {
      console.error("Error updating Airtable:", err);
      setError(
        err instanceof Error
          ? `${err.message}. Please try again.`
          : "Failed to update Airtable. Please try again."
      );
      setUpdating(false);
      return;
    }

    // Keep the cached client list in step with what Airtable now holds. This is
    // after the fact — a stale cache must not be reported as a failed update,
    // since the record has already been written.
    try {
      await refreshClients(true);
    } catch (err) {
      console.error("Failed to refresh client cache after update:", err);
    }
    setUpdating(false);
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle>Update Airtable</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {description ?? (
            <>
              Once you&apos;ve submitted in the portal, paste the reference
              number below to log {subject} on the client&apos;s record.
            </>
          )}
        </p>
      </CardHeader>
      <CardContent>
        {updated ? (
          <div className="flex items-start">
            <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
            <div className="ml-4">
              <h3 className="text-base font-medium text-foreground mb-1">
                Airtable updated
              </h3>
              <p className="text-sm text-muted-foreground">
                {confirmation?.(referenceNumber.trim()) ?? (
                  <>
                    {subject.charAt(0).toUpperCase()}
                    {subject.slice(1)} was added to {clientName}&apos;s log with
                    reference {referenceNumber.trim()}.
                    {statusTags.length > 0 && (
                      <>
                        {" "}
                        The {statusTags.join(" and ")} tag was added to Status
                        {removedTags.length > 0 && (
                          <> and {removedTags.join(" and ")} was removed</>
                        )}
                        .
                      </>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {submissionField && (
              <Input
                label={submissionField.label}
                required
                placeholder={submissionField.placeholder}
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                disabled={updating}
                helperText={submissionField.helperText}
              />
            )}

            <Input
              label="Portal Reference Number"
              required
              placeholder="Paste the reference number from the portal"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              disabled={updating}
              helperText="Shown by the submission portal after you submit"
            />

            {statusPicker && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  {statusPicker.label}
                </label>
                <div className="flex flex-wrap gap-2">
                  {statusPicker.options.map((opt) => {
                    const selected = statusTag === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        // Clicking the picked tag again clears it, so a mispick
                        // doesn't need a reload to undo.
                        onClick={() =>
                          setStatusTag(selected ? null : opt.value)
                        }
                        disabled={updating}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                          selected
                            ? "border-primary bg-primary/5 font-medium text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statusTag
                    ? removedTags.length > 0
                      ? `Adds the ${statusTag} tag to the client's Status and removes ${removedTags.join(
                          " and "
                        )}, keeping the other tags already on the record.`
                      : `Adds the ${statusTag} tag to the client's Status, keeping the tags already on the record.`
                    : "Optional — leave unpicked to log without changing Status."}
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="ml-2">{error}</span>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              {preview ?? (
                <>
                  Adds to {clientName}&apos;s log:{" "}
                  <span className="font-medium text-foreground">
                    {logEntry(referenceNumber.trim() || "REFERENCE")}
                  </span>
                </>
              )}
            </div>

            <Button
              type="button"
              onClick={handleUpdate}
              disabled={!ready || updating}
              loading={updating}
              icon={<Database className="h-5 w-5" />}
            >
              {updating ? "Updating Airtable..." : "Update Airtable"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
