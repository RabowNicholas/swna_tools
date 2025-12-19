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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  FileDown,
  AlertCircle,
  CheckCircle,
  Stethoscope,
  FileText,
  User,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { PortalAccess } from "@/components/portal/PortalAccess";
import { EmailDraft } from "@/components/email/EmailDraft";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";
import { detectClientStatus, isGHHCClient } from "@/lib/email-utils";

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

// Zod schema for form validation
const ee10Schema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  name: z.string().min(1, "Client name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  dob: z.string()
    .min(1, "Date of birth is required")
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Date must be in format: MM/DD/YYYY"),
  doctor: z.enum(["La Plata", "Dr. Lewis"], {
    message: "Please select a doctor",
  }),
  claim_type: z.enum(["Initial Impairment Claim", "Repeat Impairment Claim"], {
    message: "Please select a claim type",
  }),
  address_main: z.string().min(1, "Street address is required"),
  address_city: z.string().min(1, "City is required"),
  address_state: z
    .string()
    .min(2, "State is required")
    .max(2, "State must be 2 characters"),
  address_zip: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits"),
  phone: z
    .string()
    .regex(
      /^\d{3}\.\d{3}\.\d{4}$/,
      "Phone number must be in format: 123.123.1234"
    ),
  work_history_dates: z.string().optional(),
  ghhc_location: z.enum(["NV", "TN", ""], {
    message: "Please select a GHHC location",
  }).optional(),
}).refine((data) => {
  // Work history required for Dr. Lewis
  if (data.doctor === "Dr. Lewis" && !data.work_history_dates) {
    return false;
  }
  return true;
}, {
  message: "Work history dates are required for Dr. Lewis",
  path: ["work_history_dates"],
});

type EE10FormData = z.infer<typeof ee10Schema>;

interface Client {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    [key: string]: string | undefined;
  };
}

export default function EE10Form() {
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
      trackEvent.formViewed('ee10', session.user.id);
    }
  }, [session]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const form = useForm<EE10FormData>({
    resolver: zodResolver(ee10Schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      name: "",
      case_id: "",
      dob: "",
      doctor: "La Plata",
      claim_type: "Initial Impairment Claim",
      address_main: "",
      address_city: "",
      address_state: "",
      address_zip: "",
      phone: "",
      work_history_dates: "",
      ghhc_location: "",
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
      setSelectedClient(client);

      // Parse client name using shared utility
      const displayName = parseClientName(client.fields.Name || "");
      form.setValue("name", displayName);

      // Set other fields
      form.setValue("case_id", client.fields["Case ID"] || "");

      // Format and set DOB
      if (client.fields["Date of Birth"]) {
        try {
          const date = new Date(client.fields["Date of Birth"]);
          if (!isNaN(date.getTime())) {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            form.setValue("dob", `${month}/${day}/${year}`);
          }
        } catch (error) {
          console.error('Error formatting DOB:', error);
          form.setValue("dob", "");
        }
      }

      form.setValue("address_main", client.fields["Street Address"] || "");
      form.setValue("address_city", client.fields["City"] || "");
      form.setValue(
        "address_state",
        getStateAbbreviation(client.fields["State"] || "")
      );
      form.setValue("address_zip", client.fields["ZIP Code"] || "");
      form.setValue("phone", client.fields["Phone"] || "");
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

  const onSubmit = async (data: EE10FormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id) as any;
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const requestData = {
        client_record: selectedClient,
        doctor: data.doctor,
        form_data: {
          name: data.name,
          case_id: data.case_id,
          address_main: data.address_main,
          address_city: data.address_city,
          address_state: data.address_state,
          address_zip: data.address_zip,
          phone: data.phone,
          claim_type: data.claim_type,
        },
      };

      const response = await fetch("/api/generate/ee10", {
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

        // Extract first initial and last name for filename
        const nameParts = data.name.trim().split(" ");
        const firstName = nameParts[0] || "X";
        const lastName = nameParts.slice(1).join(" ") || "Unknown";

        a.download = `EE10_${firstName.charAt(0)}.${lastName}_${new Date()
          .toLocaleDateString("en-US")
          .replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Track PDF generation
        if (session?.user) {
          trackEvent.pdfGenerated('ee10', session.user.id, data.client_id);
        }

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate EE-10");
      }
    } catch (error) {
      console.error("Error generating EE-10:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate EE-10"
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
          EE-10 Form Generator
        </h1>
        <p className="text-muted-foreground">
          Request for approval of evaluating doctor for impairment evaluation
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
          label="Choose which client you're preparing this form for"
        />

        {/* Doctor Selection */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <CardTitle>Doctor Selection</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Select the medical professional who will be handling this case
            </p>
          </CardHeader>
          <CardContent>
            <Select
              label="Choose Doctor"
              required
              error={
                attemptedSubmit
                  ? form.formState.errors.doctor?.message
                  : undefined
              }
              helperText="Select the doctor who will review the employment records"
              {...form.register("doctor")}
            >
              <option value="La Plata">La Plata</option>
              <option value="Dr. Lewis">Dr. Lewis</option>
            </Select>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-success" />
              <CardTitle>Client Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the client's information as it appears in their records
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Name and Case ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Client's Full Name"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.name?.message
                      : undefined
                  }
                  helperText="Client's full legal name"
                  {...form.register("name")}
                />

                <Input
                  label="Case ID"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.case_id?.message
                      : undefined
                  }
                  helperText="The case identification number"
                  {...form.register("case_id")}
                />
              </div>

              {/* Date of Birth */}
              <Input
                label="Date of Birth"
                required
                placeholder="MM/DD/YYYY"
                error={
                  attemptedSubmit
                    ? form.formState.errors.dob?.message
                    : undefined
                }
                helperText="Client's date of birth for medical records"
                {...form.register("dob")}
              />

              {/* Address */}
              <Input
                label="Street Address"
                required
                error={
                  attemptedSubmit
                    ? form.formState.errors.address_main?.message
                    : undefined
                }
                helperText="Client's street address (include apartment/unit number if applicable)"
                {...form.register("address_main")}
              />

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Input
                    label="City"
                    required
                    error={
                      attemptedSubmit
                        ? form.formState.errors.address_city?.message
                        : undefined
                    }
                    {...form.register("address_city")}
                  />
                </div>
                <Input
                  label="State"
                  maxLength={2}
                  placeholder="NY"
                  required
                  helperText="2-letter code"
                  error={
                    attemptedSubmit
                      ? form.formState.errors.address_state?.message
                      : undefined
                  }
                  {...form.register("address_state")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="ZIP Code"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.address_zip?.message
                      : undefined
                  }
                  helperText="5 or 9 digit ZIP code"
                  {...form.register("address_zip")}
                />

                <Input
                  label="Phone Number"
                  placeholder="555.123.4567"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.phone?.message
                      : undefined
                  }
                  helperText="Format: 123.123.1234"
                  {...form.register("phone")}
                />
              </div>

              {/* Conditional: Work History Dates for Dr. Lewis */}
              {form.watch("doctor") === "Dr. Lewis" && (
                <Input
                  label="Verified Work History Dates"
                  required
                  placeholder="MM/YYYY-MM/YYYY"
                  error={
                    attemptedSubmit
                      ? form.formState.errors.work_history_dates?.message
                      : undefined
                  }
                  helperText="Example: 01/2020-06/2023"
                  {...form.register("work_history_dates")}
                />
              )}

              {/* Conditional: GHHC Location for GHHC clients */}
              {selectedClient && isGHHCClient(detectClientStatus(selectedClient)) && (
                <Select
                  label="GHHC Location"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.ghhc_location?.message
                      : undefined
                  }
                  helperText="Select the GHHC office location for this client"
                  {...form.register("ghhc_location")}
                >
                  <option value="">Select location</option>
                  <option value="NV">Nevada (NV)</option>
                  <option value="TN">Tennessee (TN)</option>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Claim Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Claim Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Specify the type of claim being processed for this client
            </p>
          </CardHeader>
          <CardContent>
            <Select
              label="Claim Type"
              required
              error={
                attemptedSubmit
                  ? form.formState.errors.claim_type?.message
                  : undefined
              }
              helperText="Select whether this is the client's first impairment claim or a repeat claim"
              {...form.register("claim_type")}
            >
              <option value="Initial Impairment Claim">
                Initial Impairment Claim
              </option>
              <option value="Repeat Impairment Claim">
                Repeat Impairment Claim
              </option>
            </Select>
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
            {loading ? "Generating Form..." : "Generate EE-10 Form"}
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
                      EE-10 form generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your EE-10 form has been downloaded and is ready for
                      submission.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Portal Access */}
            {submittedClient && (
              <>
                <PortalAccess client={submittedClient} autoOpen={true} />

                {/* Email Drafting */}
                <EmailDraft
                  client={submittedClient}
                  doctor={form.watch("doctor")}
                  formData={{
                    name: form.watch("name"),
                    caseId: form.watch("case_id"),
                    phone: form.watch("phone"),
                    address: `${form.watch("address_main")}\n${form.watch(
                      "address_city"
                    )}, ${form.watch("address_state")} ${form.watch(
                      "address_zip"
                    )}`.trim(),
                    dob: form.watch("dob"),
                    workHistoryDates: form.watch("work_history_dates") || undefined,
                    hhcLocation: form.watch("ghhc_location") as 'NV' | 'TN' | undefined,
                  }}
                />
              </>
            )}
          </>
        )}
      </form>
    </div>
  );
}
