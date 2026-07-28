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
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import {
  FileDown,
  MapPin,
  AlertCircle,
  CheckCircle,
  Calendar,
  Home,
  User,
  Database,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { PortalAccess } from "@/components/portal/PortalAccess";
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
const addressChangeSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  claimant_name: z.string().min(1, "Claimant name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  street_address: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip_code: z.string().min(1, "ZIP code is required"),
});

type AddressChangeFormData = z.infer<typeof addressChangeSchema>;

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

export default function AddressChangeForm() {
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
      trackEvent.formViewed('address-change', session.user.id);
    }
  }, [session]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);
  // Address as it was generated into the letter, so a later edit to the form
  // can't push something different to Airtable than what was submitted
  const [submittedAddress, setSubmittedAddress] =
    useState<AddressChangeFormData | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [updatingAirtable, setUpdatingAirtable] = useState(false);
  const [airtableUpdated, setAirtableUpdated] = useState(false);
  const [airtableError, setAirtableError] = useState<string | null>(null);

  const form = useForm<AddressChangeFormData>({
    resolver: zodResolver(addressChangeSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      claimant_name: "",
      case_id: "",
      street_address: "",
      city: "",
      state: "",
      zip_code: "",
    },
  });

  // Show error if clients failed to load
  useEffect(() => {
    if (clientsError) {
      console.error("Failed to load clients:", clientsError);
    }
  }, [clientsError]);

  // Handle client selection and auto-fill (simplified to match Streamlit)
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      // Reset form to default values first (clears new address fields)
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

  const onSubmit = async (data: AddressChangeFormData) => {
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
          street_address: data.street_address,
          city: data.city,
          state: data.state,
          zip_code: data.zip_code,
        },
      };

      const response = await fetch("/api/generate/address-change", {
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
        a.download = `AddressChange_${data.claimant_name.replace(
          /\s+/g,
          "_"
        )}_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Track PDF generation
        if (session?.user) {
          trackEvent.pdfGenerated('address-change', session.user.id, data.client_id);
        }

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
        setSubmittedAddress(data);
        // A regenerated letter starts a fresh submission, so clear any
        // reference number and result from the previous one
        setReferenceNumber("");
        setAirtableUpdated(false);
        setAirtableError(null);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate address change letter"
        );
      }
    } catch (error) {
      console.error("Error generating address change letter:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate address change letter"
      );
    } finally {
      setLoading(false);
    }
  };

  // Push the submitted address to Airtable and log the portal reference number.
  // Both go in a single request so the record can't be updated without the log.
  const handleUpdateAirtable = async () => {
    const reference = referenceNumber.trim();
    if (!submittedClient || !submittedAddress || !reference) return;

    setUpdatingAirtable(true);
    setAirtableError(null);
    try {
      const now = new Date();
      const logDate = `${String(now.getMonth() + 1).padStart(2, "0")}.${String(
        now.getDate()
      ).padStart(2, "0")}.${String(now.getFullYear()).slice(-2)}`;
      const userEmail = session?.user?.email || "unknown";

      const logEntry = `Submitted change of address (*${reference}) via Tools App. Triggered by [${userEmail}] ${logDate}. TOOLS APP`;

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: submittedClient.id,
          fields: {
            "Street Address": submittedAddress.street_address,
            City: submittedAddress.city,
            State: submittedAddress.state,
            "ZIP Code": submittedAddress.zip_code,
          },
          prepend: {
            Log: logEntry,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to update client in Airtable"
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
          🏠 Address Change Letter Generator
        </h1>
        <p className="text-muted-foreground">
          Generate formal address change notification letter for DOL case
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
          label="Choose which client you're preparing this address change letter for"
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

        {/* New Address Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Home className="h-5 w-5 text-primary" />
              <CardTitle>New Address Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              The new address to be updated in DOL records
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="Street Address"
                required
                placeholder="123 Main Street"
                error={
                  attemptedSubmit
                    ? form.formState.errors.street_address?.message
                    : undefined
                }
                helperText="New street address for the client"
                {...form.register("street_address")}
              />

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Input
                    label="City"
                    required
                    placeholder="Anytown"
                    error={
                      attemptedSubmit
                        ? form.formState.errors.city?.message
                        : undefined
                    }
                    {...form.register("city")}
                  />
                </div>
                <Input
                  label="State"
                  required
                  placeholder="ST"
                  maxLength={2}
                  error={
                    attemptedSubmit
                      ? form.formState.errors.state?.message
                      : undefined
                  }
                  helperText="2-letter code"
                  {...form.register("state")}
                />
              </div>

              <Input
                label="ZIP Code"
                required
                placeholder="12345"
                maxLength={5}
                error={
                  attemptedSubmit
                    ? form.formState.errors.zip_code?.message
                    : undefined
                }
                helperText="5-digit ZIP code"
                {...form.register("zip_code")}
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
            {loading ? "Generating Letter..." : "Generate Address Change Letter"}
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
                      Address change letter generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your formal address change notification letter has been
                      downloaded and is ready for submission.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Portal Access */}
            {submittedClient && (
              <PortalAccess client={submittedClient} autoOpen={true} />
            )}

            {/* Airtable update — after submitting in the portal, paste the
                reference number here to record the change on the client */}
            {submittedClient && (
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-primary" />
                    <CardTitle>Update Airtable</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Once you&apos;ve submitted in the portal, paste the
                    reference number below to update the client&apos;s address
                    and log it.
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
                          {submittedClient.fields.Name}&apos;s address was
                          updated and reference {referenceNumber.trim()} was
                          added to the log.
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
                        Updates{" "}
                        <span className="font-medium text-foreground">
                          {submittedAddress?.street_address},{" "}
                          {submittedAddress?.city} {submittedAddress?.state}{" "}
                          {submittedAddress?.zip_code}
                        </span>{" "}
                        on {submittedClient.fields.Name}
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
            )}
          </>
        )}
      </form>
    </div>
  );
}
