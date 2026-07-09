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
  FileText,
  User,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PortalAccess } from "@/components/portal/PortalAccess";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";

// Zod schema for form validation
const rdWaiverSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  claimant_name: z.string().min(1, "Claimant name is required"),
  employee_name: z.string().min(1, "Employee name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  rd_decision_date: z.string().min(1, "RD decision date is required"),
  option: z.enum(["1", "2"]),
});

type RDWaiverFormData = z.infer<typeof rdWaiverSchema>;

interface Client {
  id: string;
  fields: {
    Name: string;
    "Social Security Number"?: string;
    "Case ID"?: string;
    [key: string]: string | undefined;
  };
}

export default function RDWaiverForm() {
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
      trackEvent.formViewed("rd-waiver", session.user.id);
    }
  }, [session]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<RDWaiverFormData>({
    resolver: zodResolver(rdWaiverSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      claimant_name: "",
      employee_name: "",
      case_id: "",
      rd_decision_date: "", // left blank on purpose — user enters it
      option: "2", // default to Option 2 (waive all rights)
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
      // Preserve the chosen waiver option across the reset below
      const currentOption = form.getValues("option");

      // Reset form to default values first (clears RD decision date)
      form.reset();

      // Set client_id since reset cleared it
      form.setValue("client_id", clientId);
      form.setValue("option", currentOption);

      const fields = client.fields;

      // Parse name using shared utility
      const displayName = parseClientName(fields.Name || "");
      form.setValue("claimant_name", displayName);
      form.setValue("employee_name", displayName);
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

  const onSubmit = async (data: RDWaiverFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find(
        (c) => c.id === data.client_id
      ) as Client | undefined;
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      // Date input gives YYYY-MM-DD; generator expects MM/DD/YYYY
      const [year, month, day] = data.rd_decision_date.split("-");
      const rdDecisionDate = `${month}/${day}/${year}`;

      const requestData = {
        client_record: selectedClient,
        form_data: {
          claimant_name: data.claimant_name,
          employee_name: data.employee_name,
          case_id: data.case_id,
          rd_decision_date: rdDecisionDate,
          option: data.option,
        },
      };

      const response = await fetch("/api/generate/rd-waiver", {
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
        a.download = `RD_accept_waiver_${data.claimant_name.replace(
          /\s+/g,
          "_"
        )}_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Track PDF generation
        if (session?.user) {
          trackEvent.pdfGenerated("rd-waiver", session.user.id, data.client_id);
        }

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate RD accept waiver"
        );
      }
    } catch (error) {
      console.error("Error generating RD accept waiver:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate RD accept waiver"
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
          📝 RD Accept Waiver Generator
        </h1>
        <p className="text-muted-foreground">
          Generate the Waiver for Recommended Decision (RD) Acceptance for a DOL
          case
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
          label="Choose which client you're preparing this waiver for"
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
                  helperText="Full name of the claimant as it appears on official documents"
                  {...form.register("claimant_name")}
                />

                <Input
                  label="Employee Name"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.employee_name?.message
                      : undefined
                  }
                  helperText="Employee name (typically same as claimant unless different)"
                  {...form.register("employee_name")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Case & Decision Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Case & Decision Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Case ID and the date of the Recommended Decision
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Case ID"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.case_id?.message
                      : undefined
                  }
                  helperText="The case identification number assigned to this client"
                  {...form.register("case_id")}
                />

                <Input
                  label="RD Decision Date"
                  type="date"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.rd_decision_date?.message
                      : undefined
                  }
                  helperText="Date when the Recommended Decision was issued"
                  {...form.register("rd_decision_date")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Waiver Option Selection */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Waiver Option</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Select which option to sign. Only one option is signed on the
              generated waiver.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(
                [
                  {
                    value: "2",
                    title: "Option 2 — Waive all rights",
                    desc: "Waive your right to object to ALL findings and conclusions in the Recommended Decision.",
                  },
                  {
                    value: "1",
                    title: "Option 1 — Waive acceptance only",
                    desc: "Waive objection to the accepted portion of your claim, but reserve your right to object to the recommended denial of benefits.",
                  },
                ] as const
              ).map((opt) => {
                const selected = form.watch("option") === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      checked={selected}
                      onChange={() =>
                        form.setValue("option", opt.value, {
                          shouldValidate: true,
                        })
                      }
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <div>
                      <div className="font-medium text-foreground">
                        {opt.title}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {opt.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
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
            {loading ? "Generating Waiver..." : "Generate RD Accept Waiver"}
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
                      RD accept waiver generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your completed RD acceptance waiver has been downloaded
                      and is ready for submission.
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
