"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { trackEvent } from "@/lib/analytics";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FileText, CheckCircle, X, ExternalLink } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PortalAccess, CopyField } from "@/components/portal/PortalAccess";
import { AirtableLogCard } from "@/components/airtable/AirtableLogCard";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";
import { PageHeader } from "@/components/layout/PageHeader";

// ECOMP, where the full case file is downloaded before the claim closes out
const ECOMP_URL = "https://owcp.industrypartners.dol.gov/#/";

// Zod schema for form validation
const withdrawalSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  claimant_name: z.string().min(1, "Client name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  letter_date: z.string().min(1, "Letter date is required"),
  claimed_condition: z.string().min(1, "Claimed condition is required"),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

interface Client {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    [key: string]: string | string[] | undefined;
  };
}

export default function WithdrawalForm() {
  const { data: session } = useSession();
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refreshClients,
  } = useClientContext();
  const [loading, setLoading] = useState(false);

  // Track form view
  useEffect(() => {
    if (session?.user) {
      trackEvent.formViewed('withdrawal', session.user.id);
    }
  }, [session]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);
  // The condition as it was written into the letter, so a later edit to the
  // form can't log a condition different from the one withdrawn
  const [submittedCondition, setSubmittedCondition] = useState("");
  // The case ID the letter went out under, for looking the case up in ECOMP
  const [submittedCaseId, setSubmittedCaseId] = useState("");
  // Required before the withdrawal can be logged
  const [caseFileDownloaded, setCaseFileDownloaded] = useState(false);
  // Bumped per generated letter, and used as the log card's key so a
  // regenerated letter starts a fresh submission
  const [submissionId, setSubmissionId] = useState(0);

  const form = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
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
    const client = clients.find((c) => c.id === clientId) as any;
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

  const onSubmit = async (data: WithdrawalFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id) as any;
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

      const response = await fetch("/api/generate/withdrawal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        // Download the PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Generate filename
        const nameForFile = data.claimant_name.replace(/\s+/g, "_");
        const currentDate = new Date()
          .toLocaleDateString("en-US")
          .replace(/\//g, ".");
        a.download = `Withdrawal_Letter_${nameForFile}_${currentDate}.pdf`;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Track PDF generation
        if (session?.user) {
          trackEvent.pdfGenerated('withdrawal', session.user.id, data.client_id);
        }

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
        setSubmittedCondition(data.claimed_condition);
        setSubmittedCaseId(data.case_id);
        setCaseFileDownloaded(false);
        setSubmissionId((id) => id + 1);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate withdrawal letter"
        );
      }
    } catch (error) {
      console.error("Error generating withdrawal letter:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate withdrawal letter"
      );
    } finally {
      setLoading(false);
    }
  };

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" label="Loading clients..." />
      </div>
    );
  }

  if (clientsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card variant="elevated" className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-destructive mb-4">
              <X className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Error Loading Clients
            </h3>
            <p className="text-muted-foreground">{clientsError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Client Selection */}
        <ClientSelector
          clients={clients as any}
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
                <CardTitle>Withdrawal Letter Details</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Information for the withdrawal letter
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Claimant Name"
                    required
                    error={form.formState.errors.claimant_name?.message}
                    helperText="Client's full name as it should appear in the letter"
                    {...form.register("claimant_name")}
                    readOnly
                    className="bg-muted/30"
                  />

                  <Input
                    label="Case ID"
                    required
                    error={form.formState.errors.case_id?.message}
                    helperText="Case ID from Airtable client record"
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
                  helperText="Date for the withdrawal letter"
                  {...form.register("letter_date")}
                />

                <Input
                  label="Claimed Condition"
                  required
                  error={form.formState.errors.claimed_condition?.message}
                  placeholder="e.g. Lung cancer, Beryllium sensitivity, etc."
                  helperText="The specific condition being withdrawn from the claim"
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
                    ? "Generating Withdrawal Letter..."
                    : "Generate Withdrawal Letter"}
                </Button>
              </div>

              {!form.watch("client_id") && (
                <p className="text-sm text-muted-foreground">
                  Select a client above to generate their withdrawal letter
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
                    Withdrawal letter generated
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your formal withdrawal letter has been downloaded and is
                    ready for submission to the Department of Labor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <PortalAccess client={submittedClient as any} autoOpen={true} />

          {/* Airtable update — after submitting in the portal, paste the
              reference number and download the full case file from ECOMP,
              then log both on the client in one entry */}
          <AirtableLogCard
            key={submissionId}
            client={submittedClient}
            subject="the withdrawal"
            action={(reference) =>
              `Submitted withdrawal of claim for ${submittedCondition} (*${reference}); Downloaded full case file`
            }
            autoStatus={{
              add: ["Withdrawn"],
              remove: [],
            }}
            ready={caseFileDownloaded}
          >
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Download the full case file from ECOMP
                </p>
                <p className="text-sm text-muted-foreground">
                  Open ECOMP, look the case up by its case ID, and download the
                  entire case file.
                </p>
              </div>
              <CopyField label="Case ID" value={submittedCaseId} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<ExternalLink className="h-4 w-4" />}
                onClick={() =>
                  window.open(ECOMP_URL, "_blank", "noopener,noreferrer")
                }
              >
                Open ECOMP
              </Button>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary flex-shrink-0"
                  checked={caseFileDownloaded}
                  onChange={(e) => setCaseFileDownloaded(e.target.checked)}
                />
                <span className="text-sm text-foreground">
                  Downloaded the full case file
                  <span className="text-destructive"> *</span>
                </span>
              </label>
            </div>
          </AirtableLogCard>
        </>
      )}
    </div>
  );
}
