"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FileText, CheckCircle } from "lucide-react";
import { PortalAccess } from "@/components/portal/PortalAccess";
import { AirtableLogCard } from "@/components/airtable/AirtableLogCard";
import {
  ClientSelector,
  parseClientName,
  type ClientSelectorClient,
} from "@/components/form/ClientSelector";
import type { Client } from "@/lib/clientStorage";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageLoading, PageError } from "@/components/ui/PageStatus";
import { SaveToClientFolder } from "@/components/files/SaveToClientFolder";

// Zod schema for form validation
const reopenSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  claimant_name: z.string().min(1, "Client name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  letter_date: z.string().min(1, "Letter date is required"),
  claimed_condition: z.string().min(1, "Claimed condition is required"),
});

type ReopenFormData = z.infer<typeof reopenSchema>;

export default function ReopenForm() {
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refreshClients,
  } = useClientContext();
  const [loading, setLoading] = useState(false);

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);
  // The condition as it was written into the letter, so a later edit to the
  // form can't log a condition different from the one reopened
  const [submittedCondition, setSubmittedCondition] = useState("");
  // Bumped per generated letter, and used as the log card's key so a
  // regenerated letter starts a fresh submission
  const [submissionId, setSubmissionId] = useState(0);
  const [generatedFile, setGeneratedFile] = useState<Blob | null>(null);

  const form = useForm<ReopenFormData>({
    resolver: zodResolver(reopenSchema),
    defaultValues: {
      client_id: "",
      claimant_name: "",
      case_id: "",
      letter_date: new Date().toISOString().split("T")[0],
      claimed_condition: "",
    },
  });

  // Handle client selection and auto-fill
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      // Reset form to default values first (clears claimed_condition, dates)
      form.reset();

      // Set client_id since reset cleared it
      form.setValue("client_id", clientId);

      // Parse client name using shared utility
      const displayName = parseClientName(client.fields.Name || "");
      form.setValue("claimant_name", displayName);
      form.setValue("case_id", client.fields["Case ID"] || "");
    }
  };

  const onSubmit = async (data: ReopenFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const requestData = {
        client_record: selectedClient,
        form_data: {
          claimant_name: data.claimant_name,
          case_id: data.case_id,
          letter_date: data.letter_date,
          claimed_condition: data.claimed_condition,
        },
      };

      const response = await fetch("/api/generate/reopen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const blob = await response.blob();
        // Saved to the client's folder from the card below
        setGeneratedFile(blob);

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
        setSubmittedCondition(data.claimed_condition);
        setSubmissionId((id) => id + 1);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate reopen letter"
        );
      }
    } catch (error) {
      console.error("Error generating reopen letter:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate reopen letter"
      );
    } finally {
      setLoading(false);
    }
  };

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
        {/* Client Selection */}
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

        {/* Letter Details */}
        {form.watch("client_id") && (
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Reopen Letter Details</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Information for the letter asking DOL to reopen the claim
              </p>
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

                <Input
                  label="Letter Date"
                  type="date"
                  required
                  error={form.formState.errors.letter_date?.message}
                  {...form.register("letter_date")}
                />

                <Input
                  label="Claimed Condition"
                  required
                  error={form.formState.errors.claimed_condition?.message}
                  placeholder="e.g. Lung cancer, Beryllium sensitivity, etc."
                  helperText="The condition whose claim is being reopened"
                  {...form.register("claimed_condition")}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Button */}
        <Card
          variant="elevated"
        >
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !form.watch("client_id") ||
                    !form.watch("claimed_condition")
                  }
                  variant="primary"
                  hierarchy="primary"
                  size="xl"
                  loading={loading}
                  className="min-w-[250px]"
                  icon={<FileText className="h-5 w-5" />}
                >
                  {loading
                    ? "Generating Reopen Letter..."
                    : "Generate Reopen Letter"}
                </Button>
              </div>

              {!form.watch("client_id") && (
                <p className="text-sm text-muted-foreground">
                  Select a client above to generate their reopen letter
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Success Message and Portal Access */}
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
                    Reopen letter generated
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Save the reopen letter to the client&apos;s folder below,
                    then submit it to the Department of Labor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {submittedClient && generatedFile && (
            <SaveToClientFolder
              key={submissionId}
              client={submittedClient}
              blob={generatedFile}
              destination="reopen"
            />
          )}

          <PortalAccess
            client={submittedClient}
            autoOpen={true}
            file={generatedFile}
            tool="reopen"
          />

          {/* Airtable update — after submitting in the portal, paste the
              reference number to log the reopening on the client */}
          <AirtableLogCard
            key={submissionId}
            client={submittedClient}
            subject="the reopening request"
            action={(reference) =>
              `Submitted request to reopen claim for ${submittedCondition} (*${reference})`
            }
            autoStatus={{
              add: [],
              remove: ["Withdrawn"],
            }}
          />
        </>
      )}
    </div>
  );
}
