'use client';

import { useState, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  FileDown,
  User,
  AlertCircle,
  CheckCircle,
  Stethoscope,
  FileText,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { PortalAccess } from '@/components/portal/PortalAccess';

// State name to abbreviation mapping
const STATE_NAME_TO_ABBR: Record<string, string> = {
  "Alabama": "AL",
  "Alaska": "AK",
  "Arizona": "AZ",
  "Arkansas": "AR",
  "California": "CA",
  "Colorado": "CO",
  "Connecticut": "CT",
  "Delaware": "DE",
  "Florida": "FL",
  "Georgia": "GA",
  "Hawaii": "HI",
  "Idaho": "ID",
  "Illinois": "IL",
  "Indiana": "IN",
  "Iowa": "IA",
  "Kansas": "KS",
  "Kentucky": "KY",
  "Louisiana": "LA",
  "Maine": "ME",
  "Maryland": "MD",
  "Massachusetts": "MA",
  "Michigan": "MI",
  "Minnesota": "MN",
  "Mississippi": "MS",
  "Missouri": "MO",
  "Montana": "MT",
  "Nebraska": "NE",
  "Nevada": "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  "Ohio": "OH",
  "Oklahoma": "OK",
  "Oregon": "OR",
  "Pennsylvania": "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  "Tennessee": "TN",
  "Texas": "TX",
  "Utah": "UT",
  "Vermont": "VT",
  "Virginia": "VA",
  "Washington": "WA",
  "West Virginia": "WV",
  "Wisconsin": "WI",
  "Wyoming": "WY",
  "District of Columbia": "DC",
  "Puerto Rico": "PR",
  "Virgin Islands": "VI",
  "American Samoa": "AS",
  "Guam": "GU",
  "Northern Mariana Islands": "MP"
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
  doctor: z.enum(["La Plata", "Dr. Lewis"], {
    errorMap: () => ({ message: "Please select a doctor" })
  }),
  claim_type: z.enum(["Initial Impairment Claim", "Repeat Impairment Claim"], {
    errorMap: () => ({ message: "Please select a claim type" })
  }),
  address_main: z.string().min(1, "Street address is required"),
  address_city: z.string().min(1, "City is required"),
  address_state: z.string().min(2, "State is required").max(2, "State must be 2 characters"),
  address_zip: z.string().regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits"),
  phone: z.string().regex(/^\d{3}\.\d{3}\.\d{4}$/, "Phone number must be in format: 123.123.1234"),
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
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<EE10FormData>({
    resolver: zodResolver(ee10Schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      client_id: "",
      name: "",
      case_id: "",
      doctor: "La Plata",
      claim_type: "Initial Impairment Claim",
      address_main: "",
      address_city: "",
      address_state: "",
      address_zip: "",
      phone: "",
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

      // Parse name and convert to "First Last" format
      const rawName = fields.Name || "";
      try {
        const [last, rest] = rawName.split(",", 2);
        const first = rest.split("-")[0].trim();
        const fullName = `${first} ${last.trim()}`;
        form.setValue("name", fullName);
      } catch {
        form.setValue("name", rawName);
      }

      // Set other fields
      form.setValue("case_id", fields["Case ID"] || "");
      form.setValue("address_main", fields["Street Address"] || "");
      form.setValue("address_city", fields["City"] || "");
      form.setValue("address_state", getStateAbbreviation(fields["State"] || ""));
      form.setValue("address_zip", fields["ZIP Code"] || "");
      form.setValue("phone", fields["Phone"] || "");
    }
  };

  // Handle submit click with manual validation
  const handleSubmitClick = async () => {
    setAttemptedSubmit(true);

    // Trigger form validation
    const isFormValid = await form.trigger();

    if (!isFormValid) {
      // Find first error field and scroll to it
      const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      const selectedClient = clients.find((c) => c.id === data.client_id);
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

        a.download = `EE10_${firstName.charAt(0)}.${lastName}_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate EE-10");
      }
    } catch (error) {
      console.error("Error generating EE-10:", error);
      alert(error instanceof Error ? error.message : "Failed to generate EE-10");
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
          <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Clients</h3>
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
          Request for Assistance in Obtaining Employment Records or Other Information
        </p>
      </div>

      <form className="space-y-8">
        {/* Client Selection */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Client Selection</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              label="Choose which client you're preparing this form for"
              placeholder="Select..."
              required
              error={attemptedSubmit ? form.formState.errors.client_id?.message : undefined}
              {...form.register("client_id")}
              onChange={(e) => {
                form.setValue("client_id", e.target.value);
                handleClientChange(e.target.value);
              }}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.fields.Name}
                </option>
              ))}
            </Select>
            {form.watch('client_id') && (
              <div className="mt-2 text-sm text-success flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Selected:{" "}
                {
                  clients.find((c) => c.id === form.watch('client_id'))?.fields
                    .Name
                }
              </div>
            )}
          </CardContent>
        </Card>

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
              error={attemptedSubmit ? form.formState.errors.doctor?.message : undefined}
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
                  error={attemptedSubmit ? form.formState.errors.name?.message : undefined}
                  helperText="Client's full legal name"
                  {...form.register("name")}
                />

                <Input
                  label="Case ID"
                  required
                  error={attemptedSubmit ? form.formState.errors.case_id?.message : undefined}
                  helperText="The case identification number"
                  {...form.register("case_id")}
                />
              </div>

              {/* Address */}
              <Input
                label="Street Address"
                required
                error={attemptedSubmit ? form.formState.errors.address_main?.message : undefined}
                helperText="Client's street address (include apartment/unit number if applicable)"
                {...form.register("address_main")}
              />

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Input
                    label="City"
                    required
                    error={attemptedSubmit ? form.formState.errors.address_city?.message : undefined}
                    {...form.register("address_city")}
                  />
                </div>
                <Input
                  label="State"
                  maxLength={2}
                  placeholder="NY"
                  required
                  helperText="2-letter code"
                  error={attemptedSubmit ? form.formState.errors.address_state?.message : undefined}
                  {...form.register("address_state")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="ZIP Code"
                  required
                  error={attemptedSubmit ? form.formState.errors.address_zip?.message : undefined}
                  helperText="5 or 9 digit ZIP code"
                  {...form.register("address_zip")}
                />

                <Input
                  label="Phone Number"
                  placeholder="555.123.4567"
                  required
                  error={attemptedSubmit ? form.formState.errors.phone?.message : undefined}
                  helperText="Format: 123.123.1234"
                  {...form.register("phone")}
                />
              </div>
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
              error={attemptedSubmit ? form.formState.errors.claim_type?.message : undefined}
              helperText="Select whether this is the client's first impairment claim or a repeat claim"
              {...form.register("claim_type")}
            >
              <option value="Initial Impairment Claim">Initial Impairment Claim</option>
              <option value="Repeat Impairment Claim">Repeat Impairment Claim</option>
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
            {loading ? 'Generating Form...' : 'Generate EE-10 Form'}
          </Button>
        </div>

        {/* Success Message */}
        {formSubmitted && (
          <>
            <Card variant="elevated" className="bg-success/10 border-success/20">
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
                      Your EE-10 form has been downloaded and is ready for submission.
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
