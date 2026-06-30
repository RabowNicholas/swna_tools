"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useClients } from "@/hooks/useClients";
import { trackEvent } from "@/lib/analytics";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  FileDown,
  AlertCircle,
  CheckCircle,
  Phone,
  User,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PortalAccess } from "@/components/portal/PortalAccess";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";

// Zod schema for form validation
const phoneChangeSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  claimant_name: z.string().min(1, "Claimant name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  phone_number: z.string().min(1, "Phone number is required"),
});

type PhoneChangeFormData = z.infer<typeof phoneChangeSchema>;

interface Client {
  id: string;
  fields: {
    Name: string;
    "Social Security Number"?: string;
    "Case ID"?: string;
    "Street Address"?: string;
    City?: string;
    State?: string;
    "ZIP Code"?: string;
    Phone?: string;
    Email?: string;
    "Date of Birth"?: string;
    [key: string]: string | undefined;
  };
}

export default function PhoneChangeForm() {
  const { data: session } = useSession();
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refreshClients,
  } = useClients();
  const [loading, setLoading] = useState(false);

  // Track form view
  useEffect(() => {
    if (session?.user) {
      trackEvent.formViewed('phone-change', session.user.id);
    }
  }, [session]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<PhoneChangeFormData>({
    resolver: zodResolver(phoneChangeSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      claimant_name: "",
      case_id: "",
      phone_number: "",
    },
  });

  // Show error if clients failed to load
  useEffect(() => {
    if (clientsError) {
      console.error("Failed to load clients:", clientsError);
    }
  }, [clientsError]);

  // Handle client selection and auto-fill
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      // Reset form to default values first (clears new phone field)
      form.reset();

      // Set client_id since reset cleared it
      form.setValue("client_id", clientId);

      const fields = client.fields;

      // Parse name using shared utility
      const displayName = parseClientName(fields.Name || "");
      form.setValue("claimant_name", displayName);
      form.setValue("case_id", fields["Case ID"] || "");
    }
  };

  // Handle submit click with manual validation
  const handleSubmitClick = async () => {
    setAttemptedSubmit(true);

    // Trigger form validation
    const isFormValid = await form.trigger();

    if (!isFormValid) {
      // Find first error field and scroll to it
      const firstErrorField = document.querySelector(
        '[aria-invalid="true"]'
      ) as HTMLElement;
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
        firstErrorField.focus();
      }
      return;
    }

    // If all valid, submit
    form.handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: PhoneChangeFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id) as Client | undefined;
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const requestData = {
        client_record: selectedClient,
        form_data: {
          claimant_name: data.claimant_name,
          case_id: data.case_id,
          phone_number: data.phone_number,
        },
      };

      const response = await fetch("/api/generate/phone-change", {
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
        a.download = `PhoneChange_${data.claimant_name.replace(
          /\s+/g,
          "_"
        )}_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Track PDF generation
        if (session?.user) {
          trackEvent.pdfGenerated('phone-change', session.user.id, data.client_id);
        }

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate phone change letter"
        );
      }
    } catch (error) {
      console.error("Error generating phone change letter:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate phone change letter"
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
        <div className="text-center">
          <div className="text-destructive mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Error Loading Clients
          </h3>
          <p className="text-muted-foreground">{clientsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">
          📞 Phone Number Change Letter Generator
        </h1>
        <p className="text-muted-foreground">
          Generate formal phone number change notification letter for DOL case
        </p>
      </div>

      <form className="space-y-8">
        {/* Client Selection */}
        <ClientSelector
          clients={clients as any}
          value={form.watch("client_id")}
          onChange={(clientId) => {
            form.setValue("client_id", clientId);
            handleClientChange(clientId);
          }}
          onRefresh={() => refreshClients(true)}
          error={
            attemptedSubmit
              ? form.formState.errors.client_id?.message
              : undefined
          }
          label="Choose which client you're preparing this phone change letter for"
        />

        {/* Client Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-success" />
              <CardTitle>Client Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Client's information as it appears in their records
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Claimant Name"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.claimant_name?.message
                      : undefined
                  }
                  helperText="Client's full name as it should appear in the letter"
                  {...form.register("claimant_name")}
                />

                <Input
                  label="Case ID"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.case_id?.message
                      : undefined
                  }
                  helperText="Case ID from Airtable client record"
                  {...form.register("case_id")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Phone Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-primary" />
              <CardTitle>New Phone Number</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              The new phone number to be updated in DOL records
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="New Phone Number"
                required
                placeholder="(555) 123-4567"
                error={
                  attemptedSubmit
                    ? form.formState.errors.phone_number?.message
                    : undefined
                }
                helperText="New phone number for the client"
                {...form.register("phone_number")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex flex-col gap-4 items-center">
          {attemptedSubmit && !form.formState.isValid && (
            <div className="text-sm text-muted-foreground">
              Please correct the errors above to continue
            </div>
          )}

          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/50 min-w-[200px]"
            size="xl"
            loading={loading}
            icon={<FileDown className="h-5 w-5" />}
          >
            {loading ? "Generating Letter..." : "Generate Phone Change Letter"}
          </Button>
        </div>

        {/* Success Message */}
        {formSubmitted && (
          <>
            <Card
              variant="elevated"
              className="bg-success/10 border-success/20"
            >
              <CardContent>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Phone change letter generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your formal phone number change notification letter has
                      been downloaded and is ready for submission.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Portal Access */}
            {submittedClient && (
              <PortalAccess client={submittedClient} autoOpen={true} />
            )}
          </>
        )}
      </form>
    </div>
  );
}
