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

interface AirtableLogCardProps {
  client: Client;
  /**
   * The completed act to log, built from the reference number the portal gave
   * back, e.g. `Submitted RD waiver, Option 1 (*12345)`. Goes through
   * `buildLogEntry` so every tool's entries read the same way.
   */
  action: (reference: string) => string;
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
}: AirtableLogCardProps) {
  const { data: session } = useSession();
  const { refreshClients } = useClients();
  const [referenceNumber, setReferenceNumber] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = client.fields.Name;
  const logEntry = (reference: string) =>
    buildLogEntry(action(reference), session?.user?.email);

  const handleUpdate = async () => {
    const reference = referenceNumber.trim();
    if (!reference) return;

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
          },
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
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Portal Reference Number"
              required
              placeholder="Paste the reference number from the portal"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              disabled={updating}
              helperText="Shown by the submission portal after you submit"
            />

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
              disabled={!referenceNumber.trim() || updating}
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
