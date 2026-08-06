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
import { Badge } from "@/components/ui/Badge";
import {
  FileText,
  CheckCircle,
  X,
  Bell,
  Database,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PortalAccess } from "@/components/portal/PortalAccess";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";
import { buildLogEntry } from "@/lib/airtable-log";

// Zod schema for form validation
const dolStatusUpdateSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  claimant_name: z.string().min(1, "Client name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  letter_date: z.string().min(1, "Letter date is required"),
});

type DolStatusUpdateFormData = z.infer<typeof dolStatusUpdateSchema>;

interface Client {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    [key: string]: string | string[] | undefined;
  };
}

export default function DolStatusUpdateForm() {
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
      trackEvent.formViewed('dol-status-update', session.user.id);
    }
  }, [session]);

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [updatingAirtable, setUpdatingAirtable] = useState(false);
  const [airtableUpdated, setAirtableUpdated] = useState(false);
  const [airtableError, setAirtableError] = useState<string | null>(null);

  const form = useForm<DolStatusUpdateFormData>({
    resolver: zodResolver(dolStatusUpdateSchema),
    defaultValues: {
      client_id: "",
      claimant_name: "",
      case_id: "",
      letter_date: new Date().toISOString().split("T")[0],
    },
  });

  // Handle client selection and auto-fill
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId) as any;
    if (client) {
      // Reset form to default values first (clears status fields, dates)
      form.reset();

      // Set client_id since reset cleared it
      form.setValue("client_id", clientId);

      const displayName = parseClientName(client.fields.Name || "");
      form.setValue("claimant_name", displayName);
      form.setValue("case_id", client.fields["Case ID"] || "");
    }
  };

  const onSubmit = async (data: DolStatusUpdateFormData) => {
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
        },
      };

      const response = await fetch("/api/generate/dol-status-update", {
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
        a.download = `DOL_Status_Update_${nameForFile}_${currentDate}.pdf`;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Track PDF generation
        if (session?.user) {
          trackEvent.pdfGenerated('dol-status-update', session.user.id, data.client_id);
        }

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
        // A regenerated letter starts a fresh submission, so clear any
        // reference number and result from the previous one
        setReferenceNumber("");
        setAirtableUpdated(false);
        setAirtableError(null);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate DOL status update letter"
        );
      }
    } catch (error) {
      console.error("Error generating DOL status update letter:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate DOL status update letter"
      );
    } finally {
      setLoading(false);
    }
  };

  // The log line that will be prepended to the client's Airtable Log, built
  // from the reference number the portal gave back for the submission
  const statusUpdateLogEntry = (reference: string) =>
    buildLogEntry(
      `Submitted status update request (*${reference})`,
      session?.user?.email
    );

  // Log the status update request on the client record once it's been submitted
  // in the portal
  const handleUpdateAirtable = async () => {
    const reference = referenceNumber.trim();
    if (!submittedClient || !reference) return;

    setUpdatingAirtable(true);
    setAirtableError(null);
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: submittedClient.id,
          prepend: {
            Log: statusUpdateLogEntry(reference),
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

      setAirtableUpdated(true);
    } catch (error) {
      console.error("Error updating Airtable:", error);
      setAirtableError(
        error instanceof Error
          ? `${error.message}. Please try again.`
          : "Failed to update Airtable. Please try again."
      );
      setUpdatingAirtable(false);
      return;
    }

    // Keep the cached client list in step with what Airtable now holds. This
    // is after the fact — a stale cache must not be reported as a failed
    // update, since the record has already been written.
    try {
      await refreshClients(true);
    } catch (error) {
      console.error("Failed to refresh client cache after update:", error);
    }
    setUpdatingAirtable(false);
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
      {/* Header */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-2xl">
                  DOL Status Update Letter
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate status update notification for client's case
                </p>
              </div>
            </div>
            <Badge variant="default" size="lg">
              DOL Letter
            </Badge>
          </div>
        </CardHeader>
      </Card>

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
                <CardTitle>Status Update Letter Details</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Information for the status update letter
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
                  helperText="Date for the status update letter"
                  {...form.register("letter_date")}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Button */}
        <Card
          variant="elevated"
          className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-background to-success/5"
        >
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={loading || !form.watch("client_id")}
                  variant="primary"
                  hierarchy="primary"
                  size="xl"
                  loading={loading}
                  className="min-w-[250px]"
                  icon={<FileText className="h-5 w-5" />}
                >
                  {loading
                    ? "Generating Status Update..."
                    : "Generate Status Update Letter"}
                </Button>
              </div>

              {!form.watch("client_id") && (
                <p className="text-sm text-muted-foreground">
                  Select a client above to generate their status update letter
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
                    Status update letter generated successfully!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your status update letter has been downloaded and is ready for submission to the Department of Labor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <PortalAccess client={submittedClient as any} autoOpen={true} />

          {/* Airtable update — after submitting in the portal, paste the
              reference number here to log the request on the client */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Update Airtable</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Once you&apos;ve submitted in the portal, paste the reference
                number below to log the status update request on the
                client&apos;s record.
              </p>
            </CardHeader>
            <CardContent>
              {airtableUpdated ? (
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
                  <div className="ml-4">
                    <h3 className="text-base font-medium text-foreground mb-1">
                      Airtable updated
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      The status update request was added to{" "}
                      {submittedClient.fields.Name}&apos;s log with reference{" "}
                      {referenceNumber.trim()}.
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
                    disabled={updatingAirtable}
                    helperText="Shown by the submission portal after you submit"
                  />

                  {airtableError && (
                    <div className="flex items-start text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="ml-2">{airtableError}</span>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    Adds to {submittedClient.fields.Name}&apos;s log:{" "}
                    <span className="font-medium text-foreground">
                      {statusUpdateLogEntry(
                        referenceNumber.trim() || "REFERENCE"
                      )}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={handleUpdateAirtable}
                    disabled={!referenceNumber.trim() || updatingAirtable}
                    loading={updatingAirtable}
                    icon={<Database className="h-5 w-5" />}
                  >
                    {updatingAirtable
                      ? "Updating Airtable..."
                      : "Update Airtable"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
