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
  User,
  Home,
  Stethoscope,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";

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

// Zod schema for form validation (simplified to match Streamlit version)
const desertPulmSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  patient_name: z.string().min(1, "Patient's full name is required"),
  phone_number: z.string().optional(),
  dob: z.string().min(1, "Date of birth is required"),
  case_id: z.string().min(1, "Case ID is required"),
  address_main: z.string().min(1, "Street address is required"),
  address_city: z.string().min(1, "City is required"),
  address_state: z.string().min(1, "State is required"),
  address_zip: z.string().min(1, "ZIP code is required"),
  dx_code: z.string().min(1, "Diagnosis code is required"),
});

type DesertPulmFormData = z.infer<typeof desertPulmSchema>;

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

export default function DesertPulmForm() {
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
      trackEvent.formViewed('desert-pulm', session.user.id);
    }
  }, [session]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<DesertPulmFormData>({
    resolver: zodResolver(desertPulmSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      patient_name: "",
      phone_number: "",
      dob: "",
      case_id: "",
      address_main: "",
      address_city: "",
      address_state: "",
      address_zip: "",
      dx_code: "",
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
      const fields = client.fields;

      // Parse name using shared utility
      const displayName = parseClientName(fields.Name || "");
      form.setValue("patient_name", displayName);
      form.setValue("case_id", fields["Case ID"] || "");
      form.setValue("phone_number", fields["Phone"] || "");
      form.setValue("address_main", fields["Street Address"] || "");
      form.setValue("address_city", fields["City"] || "");
      form.setValue(
        "address_state",
        getStateAbbreviation(fields["State"] || "")
      );
      form.setValue("address_zip", fields["ZIP Code"] || "");

      // Handle DOB
      const dob = fields["Date of Birth"];
      if (dob) {
        try {
          const date = new Date(dob);
          if (!isNaN(date.getTime())) {
            form.setValue("dob", date.toISOString().split("T")[0]);
          }
        } catch {
          // Ignore invalid dates
        }
      }
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

  const onSubmit = async (data: DesertPulmFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id) as Client | undefined;
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const requestData = {
        client_record: selectedClient,
        form_data: {
          patient_name: data.patient_name,
          phone_number: data.phone_number,
          dob: data.dob,
          case_id: data.case_id,
          address_main: data.address_main,
          address_city: data.address_city,
          address_state: data.address_state,
          address_zip: data.address_zip,
          dx_code: data.dx_code,
        },
      };

      const response = await fetch("/api/generate/desert-pulm", {
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
        a.download = `Desert_Pulm_Referral_${data.patient_name.replace(
          /\s+/g,
          "_"
        )}_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Track PDF generation
        if (session?.user) {
          trackEvent.pdfGenerated('desert-pulm', session.user.id, data.client_id);
        }

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate Desert Pulmonary referral"
        );
      }
    } catch (error) {
      console.error("Error generating Desert Pulmonary referral:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate Desert Pulmonary referral"
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
          🫁 Desert Pulmonary Referral Form Generator
        </h1>
        <p className="text-muted-foreground">
          Generate Referral Form for Desert Pulmonary Rehab & Diagnostics
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
          label="Choose which client you're preparing this referral for"
        />

        {/* Patient Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-success" />
              <CardTitle>Patient Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the patient's information as it appears in their records
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Patient's Full Name"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.patient_name?.message
                      : undefined
                  }
                  helperText="Patient's full legal name as it appears on their official documents"
                  {...form.register("patient_name")}
                />

                <Input
                  label="Case ID"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.case_id?.message
                      : undefined
                  }
                  helperText="The case identification number assigned to this patient"
                  {...form.register("case_id")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Patient's Phone Number"
                  placeholder="555.123.4567"
                  error={
                    attemptedSubmit
                      ? form.formState.errors.phone_number?.message
                      : undefined
                  }
                  helperText="Patient's phone number in format: XXX.XXX.XXXX"
                  {...form.register("phone_number")}
                />

                <Input
                  label="Date of Birth"
                  type="date"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.dob?.message
                      : undefined
                  }
                  helperText="Enter the patient's date of birth"
                  {...form.register("dob")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient's Contact Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Home className="h-5 w-5 text-primary" />
              <CardTitle>Patient's Contact Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Patient's address information
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="Patient's Street Address"
                required
                placeholder="123 Main Street"
                error={
                  attemptedSubmit
                    ? form.formState.errors.address_main?.message
                    : undefined
                }
                helperText="Patient's street address (include apartment/unit number if applicable)"
                {...form.register("address_main")}
              />

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Input
                    label="Patient's City"
                    required
                    placeholder="Anytown"
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
                  required
                  placeholder="NY"
                  maxLength={2}
                  error={
                    attemptedSubmit
                      ? form.formState.errors.address_state?.message
                      : undefined
                  }
                  helperText="2-letter code"
                  {...form.register("address_state")}
                />
              </div>

              <Input
                label="Patient's ZIP Code"
                required
                placeholder="12345"
                maxLength={5}
                error={
                  attemptedSubmit
                    ? form.formState.errors.address_zip?.message
                    : undefined
                }
                helperText="Patient's 5-digit ZIP code"
                {...form.register("address_zip")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-5 w-5 text-info" />
              <CardTitle>Medical Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Diagnosis information from the final decision
            </p>
          </CardHeader>
          <CardContent>
            <Select
              label="DX (Diagnosis)"
              required
              error={
                attemptedSubmit
                  ? form.formState.errors.dx_code?.message
                  : undefined
              }
              helperText="Select the diagnosis from the final decision"
              {...form.register("dx_code")}
            >
              <option value="">Select diagnosis...</option>
              <option value="Silicosis (J62.8)">Silicosis (J62.8)</option>
              <option value="Obstructive sleep apnea (G47.33)">
                Obstructive sleep apnea (G47.33)
              </option>
              <option value="Hypoxemia (R06.02)">Hypoxemia (R06.02)</option>
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
            {loading ? "Generating Referral..." : "Generate Desert Pulmonary Referral"}
          </Button>
        </div>

        {/* Success Message */}
        {formSubmitted && (
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
                    Desert Pulmonary referral form generated successfully!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your Desert Pulmonary referral form has been downloaded
                    and is ready for submission.
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
