"use client";

/**
 * The page behind the Reopen Claim and Reconsideration tools. Both generate a
 * one-page letter to DOL, merge supporting PDFs onto its back, then go
 * through the same save, portal, and Airtable steps as the Withdrawal tool.
 *
 * Reconsideration must come with a doctor's letter: DOL denies a request that
 * only disagrees with the Final Decision (Procedure Manual 26.6c). For a
 * reopening, supporting documents are optional.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FileText, CheckCircle, Paperclip, AlertTriangle } from "lucide-react";
import { PortalAccess } from "@/components/portal/PortalAccess";
import { AirtableLogCard } from "@/components/airtable/AirtableLogCard";
import {
  ClientSelector,
  parseClientName,
  type ClientSelectorClient,
} from "@/components/form/ClientSelector";
import { AttachmentList, mergeAttachments } from "@/components/form/AttachmentList";
import type { Client } from "@/lib/clientStorage";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageLoading, PageError } from "@/components/ui/PageStatus";
import { SaveToClientFolder } from "@/components/files/SaveToClientFolder";

export type ClaimRequestKind = "reopen" | "reconsideration";

// DOL denies a reconsideration request filed more than 30 days after the FD
const RECONSIDERATION_WINDOW_DAYS = 30;

const CONFIG = {
  reopen: {
    endpoint: "/api/generate/reopen",
    letter: "reopen letter",
    Letter: "Reopen Letter",
    detailsBlurb: "Information for the letter asking DOL to reopen the claim",
    conditionHelp: "The condition whose claim is being reopened",
    attachmentsBlurb:
      "Optional. A doctor's letter or other new evidence, attached to the back of the letter in the order listed.",
    attachmentsPrompt: "PDFs to attach",
    attachmentsRequired: false,
    logSubject: "the reopening request",
    autoStatus: { add: [] as string[], remove: ["Withdrawn"] as string[] },
  },
  reconsideration: {
    endpoint: "/api/generate/reconsideration",
    letter: "reconsideration request",
    Letter: "Reconsideration Request",
    detailsBlurb:
      "Information for the letter asking DOL to reconsider its Final Decision",
    conditionHelp: "The condition the Final Decision denied",
    attachmentsBlurb:
      "Required. The doctor's letter supporting the request, plus any other evidence, attached to the back of the letter in the order listed.",
    attachmentsPrompt: "the doctor's letter",
    attachmentsRequired: true,
    logSubject: "the reconsideration request",
    autoStatus: undefined,
  },
} as const;

const schema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  claimant_name: z.string().min(1, "Client name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  letter_date: z.string().min(1, "Letter date is required"),
  claimed_condition: z.string().min(1, "Claimed condition is required"),
  decision_date: z.string(),
});

type FormData = z.infer<typeof schema>;

/** Whole days from a "YYYY-MM-DD" date to today, in local time */
function daysSince(iso: string): number | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const then = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

/** "YYYY-MM-DD" as MM/DD/YYYY for the Airtable log */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

export function ClaimRequestForm({ kind }: { kind: ClaimRequestKind }) {
  const config = CONFIG[kind];
  const isRecon = kind === "reconsideration";
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refreshClients,
  } = useClientContext();
  const [loading, setLoading] = useState(false);

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);
  // What went into the letter, so a later edit to the form can't log
  // something different from what was sent
  const [submitted, setSubmitted] = useState({
    condition: "",
    decisionDate: "",
    attachments: 0,
  });
  // Bumped per generated letter, and used as the log card's key so a
  // regenerated letter starts a fresh submission
  const [submissionId, setSubmissionId] = useState(0);
  const [generatedFile, setGeneratedFile] = useState<Blob | null>(null);
  // PDFs merged onto the back of the letter, in this order
  const [attachments, setAttachments] = useState<File[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(
      isRecon
        ? schema.extend({
            decision_date: z.string().min(1, "Final Decision date is required"),
          })
        : schema
    ),
    defaultValues: {
      client_id: "",
      claimant_name: "",
      case_id: "",
      letter_date: new Date().toISOString().split("T")[0],
      claimed_condition: "",
      decision_date: "",
    },
  });

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      // Reset to defaults first (clears the condition and dates)
      form.reset();
      setAttachments([]);
      form.setValue("client_id", clientId);
      form.setValue("claimant_name", parseClientName(client.fields.Name || ""));
      form.setValue("case_id", client.fields["Case ID"] || "");
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }
      if (config.attachmentsRequired && attachments.length === 0) {
        throw new Error("Attach the doctor's letter before generating.");
      }

      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_record: selectedClient,
          form_data: {
            claimant_name: data.claimant_name,
            case_id: data.case_id,
            letter_date: data.letter_date,
            claimed_condition: data.claimed_condition,
            ...(isRecon
              ? { decision_date: data.decision_date }
              : { has_enclosures: attachments.length > 0 }),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate ${config.letter}`);
      }

      // The letter goes first, then each attachment in the order listed, so
      // it uploads to the portal as one packet, saved to the client's folder
      // from the card below
      setGeneratedFile(await mergeAttachments(await response.blob(), attachments));

      setFormSubmitted(true);
      setSubmittedClient(selectedClient);
      setSubmitted({
        condition: data.claimed_condition.trim(),
        decisionDate: data.decision_date,
        attachments: attachments.length,
      });
      setSubmissionId((id) => id + 1);
    } catch (error) {
      console.error(`Error generating ${config.letter}:`, error);
      alert(error instanceof Error ? error.message : `Failed to generate ${config.letter}`);
    } finally {
      setLoading(false);
    }
  };

  const logLine = (reference: string) =>
    isRecon
      ? `Submitted request for reconsideration of FD dated ${shortDate(
          submitted.decisionDate
        )} for ${submitted.condition} with doctor's letter (*${reference})`
      : `Submitted request to reopen claim for ${submitted.condition}${
          submitted.attachments > 0 ? " with supporting documentation" : ""
        } (*${reference})`;

  const decisionAge = isRecon ? daysSince(form.watch("decision_date")) : null;
  const missingAttachment = config.attachmentsRequired && attachments.length === 0;

  if (clientsLoading) {
    return <PageLoading label="Loading clients…" />;
  }

  if (clientsError) {
    return <PageError title="Couldn’t load clients" message={clientsError} onRetry={() => refreshClients(true)} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <ClientSelector
          clients={clients as ClientSelectorClient[]}
          value={form.watch("client_id")}
          onChange={(clientId) => {
            form.setValue("client_id", clientId);
            handleClientChange(clientId);
          }}
          onRefresh={() => refreshClients(true)}
          error={form.formState.errors.client_id?.message}
        />

        {form.watch("client_id") && (
          <>
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>{config.Letter} Details</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">{config.detailsBlurb}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Claimant Name"
                      required
                      error={form.formState.errors.claimant_name?.message}
                      helperText="As it should appear in the letter"
                      {...form.register("claimant_name")}
                      readOnly
                      className="bg-muted/30"
                    />

                    <Input
                      label="Case ID"
                      required
                      error={form.formState.errors.case_id?.message}
                      {...form.register("case_id")}
                      readOnly
                      className="bg-muted/30"
                    />
                  </div>

                  <div className={isRecon ? "grid grid-cols-1 md:grid-cols-2 gap-6" : undefined}>
                    <Input
                      label="Letter Date"
                      type="date"
                      required
                      error={form.formState.errors.letter_date?.message}
                      {...form.register("letter_date")}
                    />

                    {isRecon && (
                      <Input
                        label="Final Decision Date"
                        type="date"
                        required
                        error={form.formState.errors.decision_date?.message}
                        helperText="The date on the Final Decision being challenged"
                        {...form.register("decision_date")}
                      />
                    )}
                  </div>

                  {decisionAge !== null && decisionAge > RECONSIDERATION_WINDOW_DAYS && (
                    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-warning" />
                      <p>
                        This Final Decision is {decisionAge} days old. DOL denies
                        reconsideration requests filed more than{" "}
                        {RECONSIDERATION_WINDOW_DAYS} days after the decision, so a
                        reopening request may be the better route.
                      </p>
                    </div>
                  )}

                  <Input
                    label="Claimed Condition"
                    required
                    error={form.formState.errors.claimed_condition?.message}
                    placeholder="e.g. Lung cancer, Beryllium sensitivity, etc."
                    helperText={config.conditionHelp}
                    {...form.register("claimed_condition")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Paperclip className="h-5 w-5 text-primary" />
                  <CardTitle>
                    {isRecon ? "Doctor's Letter" : "Attachments"}
                    {config.attachmentsRequired && (
                      <span className="text-muted-foreground" aria-label="required"> *</span>
                    )}
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">{config.attachmentsBlurb}</p>
              </CardHeader>
              <CardContent>
                <AttachmentList
                  files={attachments}
                  onChange={setAttachments}
                  prompt={config.attachmentsPrompt}
                />
              </CardContent>
            </Card>
          </>
        )}

        <Card variant="elevated">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !form.watch("client_id") ||
                    !form.watch("claimed_condition") ||
                    (isRecon && !form.watch("decision_date")) ||
                    missingAttachment
                  }
                  variant="primary"
                  hierarchy="primary"
                  size="xl"
                  loading={loading}
                  className="min-w-[250px]"
                  icon={<FileText className="h-5 w-5" />}
                >
                  {loading ? `Generating ${config.Letter}...` : `Generate ${config.Letter}`}
                </Button>
              </div>

              {!form.watch("client_id") ? (
                <p className="text-sm text-muted-foreground">
                  Select a client above to generate their {config.letter}
                </p>
              ) : (
                missingAttachment && (
                  <p className="text-sm text-muted-foreground">
                    Attach the doctor&apos;s letter to generate the request
                  </p>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      {formSubmitted && submittedClient && (
        <>
          <Card variant="elevated" className="bg-success/10 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {config.Letter} generated
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {submitted.attachments > 0
                      ? `The letter and ${submitted.attachments} attachment${
                          submitted.attachments === 1 ? "" : "s"
                        } are one PDF. `
                      : ""}
                    Save it to the client&apos;s folder below, then submit it to
                    the Department of Labor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {generatedFile && (
            <SaveToClientFolder
              key={submissionId}
              client={submittedClient}
              blob={generatedFile}
              destination={kind}
            />
          )}

          <PortalAccess
            client={submittedClient}
            autoOpen={true}
            file={generatedFile}
            tool={kind}
          />

          {/* After submitting in the portal, paste the reference number to
              log the request on the client */}
          <AirtableLogCard
            key={submissionId}
            client={submittedClient}
            subject={config.logSubject}
            action={logLine}
            autoStatus={config.autoStatus}
          />
        </>
      )}
    </div>
  );
}
