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
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  FileDown,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  Calendar,
  Scale,
  Stethoscope,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { PortalAccess } from "@/components/portal/PortalAccess";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";
import { IRNoticeEmailDraft } from "@/components/email/IRNoticeEmailDraft";

// State name to abbreviation mapping
const STATE_NAME_TO_ABBR: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
  "Puerto Rico": "PR",
  "Virgin Islands": "VI",
  "American Samoa": "AS",
  Guam: "GU",
  "Northern Mariana Islands": "MP",
};

// Helper function to get state abbreviation
const getStateAbbreviation = (stateName: string): string => {
  if (!stateName) {
    return "";
  }

  // Check exact match first
  if (stateName in STATE_NAME_TO_ABBR) {
    return STATE_NAME_TO_ABBR[stateName];
  }

  // Check case-insensitive match
  for (const [fullName, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
    if (stateName.toLowerCase() === fullName.toLowerCase()) {
      return abbr;
    }
  }

  // If it's already an abbreviation (2 letters), return as-is
  if (stateName.length === 2 && /^[A-Za-z]+$/.test(stateName)) {
    return stateName.toUpperCase();
  }

  // Return original string if no match found
  return stateName;
};

// Provider options for the IR Notice
const PROVIDER_OPTIONS = [
  { value: "La Plata Medical", label: "La Plata Medical" },
  { value: "Dr. Lewis", label: "Dr. Lewis" },
];

// Zod schema for form validation (simplified to match Streamlit version)
const irNoticeSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  client_name: z.string().min(1, "Client's full name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  appointment_date: z.string().min(1, "IR appointment date is required"),
  provider_name: z.string().min(1, "Please select a provider"),
});

type IRNoticeFormData = z.infer<typeof irNoticeSchema>;

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

export default function IRNoticeForm() {
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
      trackEvent.formViewed('ir-notice', session.user.id);
    }
  }, [session]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);
  const [submittedProvider, setSubmittedProvider] = useState<string>("");
  const [submittedAppointmentDate, setSubmittedAppointmentDate] = useState<string>("");

  const form = useForm<IRNoticeFormData>({
    resolver: zodResolver(irNoticeSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      client_name: "",
      case_id: "",
      // Default to 75 days from today (matching Streamlit)
      appointment_date: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      provider_name: "La Plata Medical",
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
    const client = clients.find((c) => c.id === clientId) as any;
    if (client) {
      // Parse client name using shared utility
      const displayName = parseClientName(client.fields.Name || "");
      form.setValue("client_name", displayName);
      form.setValue("case_id", client.fields["Case ID"] || "");
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

  const onSubmit = async (data: IRNoticeFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id) as any;
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const requestData = {
        client_record: selectedClient,
        form_data: {
          client_name: data.client_name,
          file_number: data.case_id,
          appointment_date: data.appointment_date,
          provider_name: data.provider_name,
        },
      };

      const response = await fetch("/api/generate/ir-notice", {
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
        a.download = `IR_Notice_${data.client_name.replace(
          /\s+/g,
          "_"
        )}_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Track PDF generation
        if (session?.user) {
          trackEvent.pdfGenerated('ir-notice', session.user.id, data.client_id);
        }

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
        setSubmittedProvider(data.provider_name);
        setSubmittedAppointmentDate(data.appointment_date);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate IR notice letter"
        );
      }
    } catch (error) {
      console.error("Error generating IR notice letter:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate IR notice letter"
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
          🏥 IR Schedule Notice Generator
        </h1>
        <p className="text-muted-foreground">
          Generate Independent Review (IR) Schedule Notice
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
          label="Choose which client you're scheduling an IR notice for"
        />

        {/* Client Information and Appointment in 2 columns - matching Streamlit layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column - Personal Details */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-info" />
                <CardTitle>Personal Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Input
                  label="Client's Full Name"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.client_name?.message
                      : undefined
                  }
                  helperText="Client's full legal name as it appears on their official documents"
                  disabled={!form.watch("client_id")}
                  {...form.register("client_name")}
                />

                <Input
                  label="Case ID"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.case_id?.message
                      : undefined
                  }
                  helperText="The case identification number assigned to this client"
                  disabled={!form.watch("client_id")}
                  {...form.register("case_id")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Right column - Appointment Information */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-success" />
                <CardTitle>Appointment Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Select
                  label="Medical Provider"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.provider_name?.message
                      : undefined
                  }
                  helperText="Select the medical provider for the IR appointment"
                  {...form.register("provider_name")}
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>

                <Input
                  label="IR Appointment Date"
                  type="date"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.appointment_date?.message
                      : undefined
                  }
                  helperText="Select the date when the client's Independent Review is scheduled"
                  {...form.register("appointment_date")}
                />
              </div>
            </CardContent>
          </Card>
        </div>

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
            {loading ? "Generating Notice..." : "Generate Client's IR Notice"}
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
                      IR schedule notice generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your Independent Review schedule notice has been downloaded and is ready for submission.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Portal Access */}
            {submittedClient && (
              <PortalAccess client={submittedClient} autoOpen={true} />
            )}

            {/* Email Draft Section */}
            {submittedClient && submittedProvider && submittedAppointmentDate && (
              <IRNoticeEmailDraft
                client={submittedClient}
                provider={submittedProvider as "La Plata Medical" | "Dr. Lewis"}
                appointmentDate={submittedAppointmentDate}
              />
            )}
          </>
        )}
      </form>
    </div>
  );
}
