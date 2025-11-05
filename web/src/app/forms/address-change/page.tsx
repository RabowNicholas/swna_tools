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
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
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
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<AddressChangeFormData>({
    resolver: zodResolver(addressChangeSchema),
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
      const fields = client.fields;

      // Parse name using shared utility
      const displayName = parseClientName(fields.Name || "");
      form.setValue("claimant_name", displayName);
      form.setValue("case_id", fields["Case ID"] || "");
    }
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

  // Calculate form completion
  const watchedFields = form.watch();
  const requiredFieldsComplete = [
    watchedFields.client_id,
    watchedFields.claimant_name,
    watchedFields.case_id,
    watchedFields.street_address,
    watchedFields.city,
    watchedFields.state,
    watchedFields.zip_code,
  ].filter(Boolean).length;

  const totalRequiredFields = 7;
  const progressPercentage =
    (requiredFieldsComplete / totalRequiredFields) * 100;

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
      {/* Header with Progress */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              🏠 Address Change Letter Generator
            </h1>
            <p className="text-muted-foreground">
              Generate formal address change notification letter for DOL case
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
          label="Choose which client you're preparing this address change letter for"
        />

        {/* Client Information and New Address in 2 columns - matching Streamlit layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column - Client Information */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-info" />
                <CardTitle>Client Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Input
                  label="Claimant Name"
                  required
                  error={form.formState.errors.claimant_name?.message}
                  helperText="Client's full name as it should appear in the letter"
                  disabled={!form.watch("client_id")}
                  {...form.register("claimant_name")}
                />

                <Input
                  label="Case ID"
                  required
                  error={form.formState.errors.case_id?.message}
                  helperText="Case ID from Airtable client record"
                  disabled={!form.watch("client_id")}
                  {...form.register("case_id")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Right column - New Address Information */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Home className="h-5 w-5 text-success" />
                <CardTitle>New Address Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Input
                  label="Street Address"
                  required
                  placeholder="123 Main Street"
                  error={form.formState.errors.street_address?.message}
                  helperText="New street address for the client"
                  {...form.register("street_address")}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="City"
                      required
                      placeholder="Anytown"
                      error={form.formState.errors.city?.message}
                      helperText="City for the new address"
                      {...form.register("city")}
                    />
                  </div>
                  <Input
                    label="State"
                    required
                    placeholder="ST"
                    maxLength={2}
                    error={form.formState.errors.state?.message}
                    helperText="State abbreviation"
                    {...form.register("state")}
                  />
                  <Input
                    label="ZIP Code"
                    required
                    placeholder="12345"
                    maxLength={5}
                    error={form.formState.errors.zip_code?.message}
                    helperText="5-digit ZIP code"
                    {...form.register("zip_code")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <Card
          variant="elevated"
          className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-background to-success/5"
        >
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Progress indicator */}
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-3">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full transition-colors",
                      progressPercentage === 100
                        ? "bg-success animate-pulse"
                        : "bg-muted-foreground/30"
                    )}
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    Form{" "}
                    {progressPercentage === 100 ? "Complete" : "In Progress"}
                  </span>
                </div>

                {progressPercentage < 100 && (
                  <div className="flex items-center justify-center text-sm text-muted-foreground max-w-md mx-auto">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      Complete all required fields to generate your address
                      change letter
                    </span>
                  </div>
                )}
              </div>

              {/* Main action button */}
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={loading || progressPercentage < 100}
                  variant={progressPercentage === 100 ? "primary" : "secondary"}
                  hierarchy="primary"
                  size="xl"
                  loading={loading}
                  className={cn(
                    "min-w-[200px] transition-all duration-200",
                    loading && "animate-pulse"
                  )}
                  icon={loading ? undefined : <FileDown className="h-5 w-5" />}
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Generating Letter...</span>
                    </span>
                  ) : progressPercentage === 100 ? (
                    "Generate Address Change Letter"
                  ) : (
                    "Complete Form to Generate"
                  )}
                </Button>
              </div>

              {/* Additional context when ready */}
              {progressPercentage === 100 && !loading && (
                <div className="text-xs text-muted-foreground bg-success/10 border border-success/20 rounded-lg p-3 max-w-md mx-auto">
                  ✓ Ready to generate your formal address change notification
                  letter
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                      🎉 Address change letter generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your formal address change notification letter has been
                      downloaded and is ready for submission to the Department
                      of Labor.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Portal Access */}
            {submittedClient && (
              <Card variant="elevated" className="bg-blue-50 border-blue-200">
                <CardContent>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">🌐</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-blue-900 mb-2">
                        Submit to DOL Portal
                      </h3>
                      <p className="text-blue-700 text-sm mb-4">
                        Ready to submit your address change letter to the
                        Department of Labor portal? Click below to open the
                        portal helper with this client's information pre-loaded.
                      </p>
                      <Button
                        onClick={() => {
                          const portalUrl = `/portal?clientId=${submittedClient.id}&formType=Address Change`;
                          window.open(portalUrl, "_blank");
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        🚀 Open DOL Portal Helper
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </form>
    </div>
  );
}
