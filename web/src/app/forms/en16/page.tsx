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
import { FileText, CheckCircle, Zap } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PortalAccess } from "@/components/portal/PortalAccess";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";

// Zod schema for form validation
const en16Schema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  name: z.string().min(1, "Client name is required"),
  case_id: z.string().min(1, "Case ID is required"),
});

type EN16FormData = z.infer<typeof en16Schema>;

interface Client {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    [key: string]: string | string[] | undefined;
  };
}

export default function EN16Form() {
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
      trackEvent.formViewed('en16', session.user.id);
    }
  }, [session]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<EN16FormData>({
    resolver: zodResolver(en16Schema),
    defaultValues: {
      client_id: "",
      name: "",
      case_id: "",
    },
  });

  // Handle client selection and auto-fill
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId) as any;
    if (client) {
      // Reset form to default values first (clears all form-specific fields)
      form.reset();

      // Set client_id since reset cleared it
      form.setValue("client_id", clientId);

      const fields = client.fields;

      // Parse name using shared utility
      const displayName = parseClientName(fields.Name || "");
      form.setValue("name", displayName);
      form.setValue("case_id", fields["Case ID"] || "");
    }
  };

  const onSubmit = async (data: EN16FormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id) as any;
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const requestData = {
        client_record: selectedClient,
        form_data: {
          claimant: data.name,
          case_id: data.case_id,
        },
      };

      const response = await fetch("/api/generate/en16", {
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

        // Generate filename from name
        const nameParts = data.name.trim().split(" ");
        const firstInitial = nameParts[0]?.[0] || "X";
        const lastName = nameParts[nameParts.length - 1] || "Client";
        const currentDate = new Date()
          .toLocaleDateString("en-US")
          .replace(/\//g, ".");
        a.download = `EN16_${firstInitial}.${lastName}_${currentDate}.pdf`;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Track PDF generation
        if (session?.user) {
          trackEvent.pdfGenerated('en16', session.user.id, data.client_id);
        }

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate EN-16");
      }
    } catch (error) {
      console.error("Error generating EN-16:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate EN-16"
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
              <Zap className="h-12 w-12 mx-auto" />
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
              <Zap className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-2xl">EN-16 Form Generator</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  DOL required questionnaire
                </p>
              </div>
            </div>
            <Badge variant="default" size="lg">
              Energy Notification
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
          label="Select Client"
          cardTitle="Client Selection"
        />

        {/* Client Information (Auto-filled) */}
        {form.watch("client_id") && (
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-success" />
                <CardTitle>Client Information</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Information auto-populated from the selected client record
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Input
                  label="Client's Full Name"
                  required
                  error={form.formState.errors.name?.message}
                  helperText="Client's full legal name as it appears on their official documents"
                  {...form.register("name")}
                />

                <Input
                  label="Case ID"
                  required
                  error={form.formState.errors.case_id?.message}
                  helperText="The case identification number assigned to this client"
                  {...form.register("case_id")}
                  readOnly
                  className="bg-muted/30"
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
                  icon={<Zap className="h-5 w-5" />}
                >
                  {loading
                    ? "Generating EN-16..."
                    : "Generate Client's EN-16 Form"}
                </Button>
              </div>

              {!form.watch("client_id") && (
                <p className="text-sm text-muted-foreground">
                  Select a client above to generate their EN-16 form
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
                    🎉 EN-16 form generated successfully!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your EN-16 energy notification form has been downloaded and
                    is ready for submission.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <PortalAccess client={submittedClient as any} autoOpen={true} />
        </>
      )}
    </div>
  );
}
