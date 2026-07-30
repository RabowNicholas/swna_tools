"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useClients } from "@/hooks/useClients";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FileDown, CheckCircle, AlertCircle, User } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";
import {
  EmploymentHistorySection,
  emptyEmploymentRecord,
  validateEmploymentDates,
  type EmploymentDateErrors,
  type EmploymentHistoryValues,
} from "@/components/form/EmploymentHistory";
import { ee3Schema, type EE3FormValues } from "@/lib/schemas/ee3";
import { formatSSN, generateEE3 } from "@/lib/claims/generate";
import { trackEvent } from "@/lib/analytics";



export default function EE3Form() {
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
      trackEvent.formViewed('ee3', session.user.id);
    }
  }, [session]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [lastFormData, setLastFormData] = useState<EE3FormValues | null>(null);
  const [collapsedEmployment, setCollapsedEmployment] = useState<Set<number>>(
    new Set()
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [employmentDateErrors, setEmploymentDateErrors] =
    useState<EmploymentDateErrors>({});

  const form = useForm<EE3FormValues>({
    resolver: zodResolver(ee3Schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      former_name: "",
      ssn: "",
      employment_history: [emptyEmploymentRecord()],
    },
  });

  // Show error if clients failed to load
  useEffect(() => {
    if (clientsError) {
      console.error("Failed to load clients:", clientsError);
    }
  }, [clientsError]);


  // Handle client selection
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      // Reset form to default values first (clears all fields including former_name, employment_history)
      form.reset();

      // Reset UI state for employment sections
      setCollapsedEmployment(new Set());
      setEmploymentDateErrors({});

      // Set client_id since reset cleared it
      form.setValue("client_id", clientId);

      // Parse name using shared utility
      // parseClientName returns "First [Middle] Last" format
      const rawName = client.fields.Name || "";
      const fullName = parseClientName(rawName);
      const nameParts = fullName.split(" ");
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        const middleName = nameParts.length > 2 ? nameParts[1][0] : "";
        form.setValue("first_name", firstName);
        form.setValue("middle_name", middleName);
        form.setValue("last_name", lastName);
      }

      // Set SSN if available
      const ssn = client.fields["Social Security Number"];
      if (ssn) {
        const cleanSSN = ssn.toString().replace(/\D/g, "");
        if (cleanSSN.length === 9) {
          form.setValue("ssn", cleanSSN);
        }
      }
    }
  };

  const handleSubmitClick = async () => {
    setAttemptedSubmit(true);

    // Validate employment dates
    const dateErrors = validateEmploymentDates(
      form.getValues("employment_history")
    );
    setEmploymentDateErrors(dateErrors);

    // Trigger validation on all fields - this will show error messages
    const isValid = await form.trigger();

    if (!isValid || Object.keys(dateErrors).length > 0) {
      // Find the first error field and scroll to it
      const errors = form.formState.errors;
      let firstErrorField: string | null = null;

      // Check top-level fields first
      if (errors.client_id) firstErrorField = "client_id";
      else if (errors.first_name) firstErrorField = "first_name";
      else if (errors.last_name) firstErrorField = "last_name";
      else if (errors.ssn) firstErrorField = "ssn";
      else if (errors.employment_history) {
        // Find first employment history error
        for (let i = 0; i < form.getValues("employment_history").length; i++) {
          const empErrors = errors.employment_history?.[i];
          if (empErrors) {
            // Expand the collapsed section if needed
            setCollapsedEmployment((prev) => {
              const newSet = new Set(prev);
              newSet.delete(i);
              return newSet;
            });

            // Find specific field with error
            const fieldKeys = Object.keys(empErrors);
            if (fieldKeys.length > 0) {
              firstErrorField = `employment_history.${i}.${fieldKeys[0]}`;
            }
            break;
          }
        }
      }

      // Scroll to and focus the first error field
      if (firstErrorField) {
        setTimeout(() => {
          const element = document.querySelector(
            `[name="${firstErrorField}"]`
          ) as HTMLElement;
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.focus();
          }
        }, 100);
      }

      return;
    }

    // If valid, submit the form
    form.handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: EE3FormValues) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const pdfBytes = await generateEE3(selectedClient, {
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
        former_name: data.former_name,
        ssn: formatSSN(data.ssn),
        employment_history: data.employment_history,
      });

      // Download the PDF
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EE3_${data.first_name.charAt(0) || "X"}.${
        data.last_name
      }_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Track PDF generation
      if (session?.user) {
        trackEvent.pdfGenerated('ee3', session.user.id, data.client_id);
      }

      // Mark form as submitted and store data for portal access
      setFormSubmitted(true);
      setLastFormData(data);
    } catch (error) {
      console.error("Error generating EE-3:", error);
      alert(error instanceof Error ? error.message : "Failed to generate EE-3");
    } finally {
      setLoading(false);
    }
  };


  const handlePortalAccess = async () => {
    if (!lastFormData) return;

    setPortalLoading(true);
    try {
      const selectedClient = clients.find(
        (c) => c.id === lastFormData.client_id
      );
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      // Extract case ID and SSN last 4 from client data
      const caseId = selectedClient.fields["Case ID"] || "";
      const clientName = selectedClient.fields.Name || "";
      const ssnLast4 =
        clientName.split("-").pop()?.trim() || lastFormData.ssn.slice(-4);

      const portalData = {
        case_id: caseId,
        last_name: lastFormData.last_name,
        ssn_last4: ssnLast4,
        client_name: `${lastFormData.first_name} ${lastFormData.last_name}`,
      };

      const response = await fetch("/api/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(portalData),
      });

      const result = await response.json();

      if (response.ok) {
        alert(
          "Portal automation completed! Please select and upload your PDF file manually."
        );
      } else {
        throw new Error(result.error || "Portal automation failed");
      }
    } catch (error) {
      console.error("Portal access error:", error);
      alert(error instanceof Error ? error.message : "Portal access failed");
    } finally {
      setPortalLoading(false);
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
          <div className="text-red-600 mb-4">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Clients
          </h3>
          <p className="text-gray-600">{clientsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header with Progress */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Generate EE-3 Form
            </h1>
            <p className="text-muted-foreground">
              Employee employment history documentation
            </p>
          </div>
        </div>

      </div>

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
        />

        {/* Personal Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-success" />
              <CardTitle>Personal Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                required
                error={form.formState.errors.first_name?.message}
                {...form.register("first_name")}
              />

              <Input
                label="Middle Initial"
                maxLength={1}
                helperText="If applicable"
                {...form.register("middle_name")}
              />

              <Input
                label="Last Name"
                required
                error={form.formState.errors.last_name?.message}
                {...form.register("last_name")}
              />

              <Input
                label="Former Name"
                helperText="If applicable"
                {...form.register("former_name")}
              />

              <Input
                label="Social Security Number"
                placeholder="123456789"
                maxLength={9}
                required
                error={form.formState.errors.ssn?.message}
                helperText="Enter 9 digits only (no dashes)"
                {...form.register("ssn")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Employment History */}
        <EmploymentHistorySection
          form={form as unknown as UseFormReturn<EmploymentHistoryValues>}
          dateErrors={employmentDateErrors}
          collapsed={collapsedEmployment}
          onCollapsedChange={setCollapsedEmployment}
        />


        {/* Action Buttons */}
        <div className="flex flex-col gap-4 items-center">
          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={loading}
            size="lg"
            loading={loading}
            icon={<FileDown className="h-4 w-4" />}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/50"
          >
            {loading ? "Generating..." : "Generate EE-3"}
          </Button>

          {attemptedSubmit && Object.keys(form.formState.errors).length > 0 && (
            <div className="flex items-center text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mr-2" />
              Please complete all required fields before generating the form.
            </div>
          )}
        </div>

        {formSubmitted && (
          <Card variant="elevated" className="bg-success/10 border-success/20">
            <CardContent>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    EE-3 Generated Successfully!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your EE-3 form has been downloaded and is ready for
                    submission.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
