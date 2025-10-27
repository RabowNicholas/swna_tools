'use client';

import { useState, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import {
  FileDown,
  MapPin,
  AlertCircle,
  CheckCircle,
  Calendar,
  Home,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { ClientSelector, parseClientName } from '@/components/form/ClientSelector';

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
const addressChangeSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  client_name: z.string().min(1, "Client name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  dol_number: z.string().optional(),
  change_date: z.string().min(1, "Address change date is required"),
  // Previous Address
  previous_address_street: z.string().min(1, "Previous street address is required"),
  previous_address_city: z.string().min(1, "Previous city is required"),
  previous_address_state: z.string().min(1, "Previous state is required"),
  previous_address_zip: z.string().min(1, "Previous ZIP code is required"),
  // New Address
  new_address_street: z.string().min(1, "New street address is required"),
  new_address_city: z.string().min(1, "New city is required"),
  new_address_state: z.string().min(1, "New state is required"),
  new_address_zip: z.string().min(1, "New ZIP code is required"),
  // Contact Information
  phone_number: z.string().optional(),
  email_address: z.string().optional(),
  effective_date: z.string().min(1, "Effective date is required"),
  reason_for_change: z.string().optional(),
  additional_notes: z.string().optional(),
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
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<AddressChangeFormData>({
    resolver: zodResolver(addressChangeSchema),
    defaultValues: {
      client_id: "",
      client_name: "",
      case_id: "",
      dol_number: "",
      change_date: new Date().toISOString().split("T")[0],
      previous_address_street: "",
      previous_address_city: "",
      previous_address_state: "",
      previous_address_zip: "",
      new_address_street: "",
      new_address_city: "",
      new_address_state: "",
      new_address_zip: "",
      phone_number: "",
      email_address: "",
      effective_date: new Date().toISOString().split("T")[0],
      reason_for_change: "",
      additional_notes: "",
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
      const displayName = parseClientName(fields.Name || '');
      form.setValue("client_name", displayName);
      form.setValue("case_id", fields["Case ID"] || "");
      
      // Fill previous address from current client data
      form.setValue("previous_address_street", fields["Street Address"] || "");
      form.setValue("previous_address_city", fields["City"] || "");
      form.setValue("previous_address_state", getStateAbbreviation(fields["State"] || ""));
      form.setValue("previous_address_zip", fields["ZIP Code"] || "");
      
      // Fill contact information
      form.setValue("phone_number", fields["Phone"] || "");
      form.setValue("email_address", fields["Email"] || "");
    }
  };

  const onSubmit = async (data: AddressChangeFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const requestData = {
        client_record: selectedClient,
        form_data: {
          client_name: data.client_name,
          case_id: data.case_id,
          dol_number: data.dol_number,
          change_date: data.change_date,
          previous_address_street: data.previous_address_street,
          previous_address_city: data.previous_address_city,
          previous_address_state: data.previous_address_state,
          previous_address_zip: data.previous_address_zip,
          new_address_street: data.new_address_street,
          new_address_city: data.new_address_city,
          new_address_state: data.new_address_state,
          new_address_zip: data.new_address_zip,
          phone_number: data.phone_number,
          email_address: data.email_address,
          effective_date: data.effective_date,
          reason_for_change: data.reason_for_change,
          additional_notes: data.additional_notes,
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
        a.download = `AddressChange_${data.client_name.replace(/\s+/g, "_")}_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate address change letter");
      }
    } catch (error) {
      console.error("Error generating address change letter:", error);
      alert(error instanceof Error ? error.message : "Failed to generate address change letter");
    } finally {
      setLoading(false);
    }
  };

  // Calculate form completion
  const watchedFields = form.watch();
  const requiredFieldsComplete = [
    watchedFields.client_id,
    watchedFields.client_name,
    watchedFields.case_id,
    watchedFields.change_date,
    watchedFields.previous_address_street,
    watchedFields.previous_address_city,
    watchedFields.previous_address_state,
    watchedFields.previous_address_zip,
    watchedFields.new_address_street,
    watchedFields.new_address_city,
    watchedFields.new_address_state,
    watchedFields.new_address_zip,
    watchedFields.effective_date,
  ].filter(Boolean).length;

  const totalRequiredFields = 13;
  const progressPercentage = (requiredFieldsComplete / totalRequiredFields) * 100;

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
          <Badge
            variant={progressPercentage === 100 ? "success" : "secondary"}
            size="lg"
          >
            {Math.round(progressPercentage)}% Complete
          </Badge>
        </div>

        <Progress
          value={progressPercentage}
          variant={progressPercentage === 100 ? "success" : "default"}
          showLabel
          label="Form Completion"
        />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Client Selection */}
        <ClientSelector
          clients={clients}
          value={form.watch('client_id')}
          onChange={(clientId) => {
            form.setValue("client_id", clientId);
            handleClientChange(clientId);
          }}
          error={form.formState.errors.client_id?.message}
          label="Choose which client you're preparing this address change letter for"
        />

        {/* Case Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-warning" />
              <CardTitle>Case Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Information about the case requiring address update
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Client Name"
                  required
                  error={form.formState.errors.client_name?.message}
                  helperText="Full name of the client"
                  {...form.register("client_name")}
                />

                <Input
                  label="Case ID"
                  required
                  error={form.formState.errors.case_id?.message}
                  helperText="DOL case identification number"
                  {...form.register("case_id")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="DOL Number (Optional)"
                  error={form.formState.errors.dol_number?.message}
                  helperText="Department of Labor reference number, if available"
                  {...form.register("dol_number")}
                />

                <Input
                  label="Change Date"
                  type="date"
                  required
                  error={form.formState.errors.change_date?.message}
                  helperText="Date of this address change notification"
                  {...form.register("change_date")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Previous Address */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Home className="h-5 w-5 text-error" />
              <CardTitle>Previous Address</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              The address currently on file with the Department of Labor
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="Previous Street Address"
                required
                error={form.formState.errors.previous_address_street?.message}
                helperText="Street address currently on file"
                {...form.register("previous_address_street")}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="Previous City"
                    required
                    error={form.formState.errors.previous_address_city?.message}
                    {...form.register("previous_address_city")}
                  />
                </div>
                <Input
                  label="State"
                  maxLength={2}
                  placeholder="NY"
                  required
                  error={form.formState.errors.previous_address_state?.message}
                  helperText="2-letter code"
                  {...form.register("previous_address_state")}
                />
              </div>

              <Input
                label="Previous ZIP Code"
                maxLength={5}
                required
                error={form.formState.errors.previous_address_zip?.message}
                helperText="5-digit ZIP code"
                {...form.register("previous_address_zip")}
              />
            </div>
          </CardContent>
        </Card>

        {/* New Address */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-success" />
              <CardTitle>New Address</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              The new address to be updated in DOL records
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="New Street Address"
                required
                error={form.formState.errors.new_address_street?.message}
                helperText="New street address"
                {...form.register("new_address_street")}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="New City"
                    required
                    error={form.formState.errors.new_address_city?.message}
                    {...form.register("new_address_city")}
                  />
                </div>
                <Input
                  label="State"
                  maxLength={2}
                  placeholder="NY"
                  required
                  error={form.formState.errors.new_address_state?.message}
                  helperText="2-letter code"
                  {...form.register("new_address_state")}
                />
              </div>

              <Input
                label="New ZIP Code"
                maxLength={5}
                required
                error={form.formState.errors.new_address_zip?.message}
                helperText="5-digit ZIP code"
                {...form.register("new_address_zip")}
              />

              <Input
                label="Effective Date"
                type="date"
                required
                error={form.formState.errors.effective_date?.message}
                helperText="Date when the new address becomes effective"
                {...form.register("effective_date")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-info" />
              <CardTitle>Contact Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Updated contact information (optional)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Phone Number"
                  error={form.formState.errors.phone_number?.message}
                  helperText="Updated phone number"
                  {...form.register("phone_number")}
                />

                <Input
                  label="Email Address"
                  type="email"
                  error={form.formState.errors.email_address?.message}
                  helperText="Updated email address"
                  {...form.register("email_address")}
                />
              </div>

              <Textarea
                label="Reason for Address Change (Optional)"
                error={form.formState.errors.reason_for_change?.message}
                helperText="Brief explanation for the address change"
                rows={3}
                {...form.register("reason_for_change")}
              />

              <Textarea
                label="Additional Notes (Optional)"
                error={form.formState.errors.additional_notes?.message}
                helperText="Any additional comments or special instructions"
                rows={3}
                {...form.register("additional_notes")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card variant="elevated" className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-background to-success/5">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Progress indicator */}
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full transition-colors",
                    progressPercentage === 100 ? "bg-success animate-pulse" : "bg-muted-foreground/30"
                  )} />
                  <span className="text-sm font-medium text-muted-foreground">
                    Form {progressPercentage === 100 ? 'Complete' : 'In Progress'}
                  </span>
                </div>
                
                {progressPercentage < 100 && (
                  <div className="flex items-center justify-center text-sm text-muted-foreground max-w-md mx-auto">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Complete all required fields to generate your address change letter</span>
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
                    'Generate Address Change Letter'
                  ) : (
                    'Complete Form to Generate'
                  )}
                </Button>
              </div>

              {/* Additional context when ready */}
              {progressPercentage === 100 && !loading && (
                <div className="text-xs text-muted-foreground bg-success/10 border border-success/20 rounded-lg p-3 max-w-md mx-auto">
                  ✓ Ready to generate your formal address change notification letter
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                      🎉 Address change letter generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your formal address change notification letter has been downloaded and is ready for
                      submission to the Department of Labor.
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
                        Ready to submit your address change letter to the Department of Labor portal? 
                        Click below to open the portal helper with this client's information pre-loaded.
                      </p>
                      <Button
                        onClick={() => {
                          const portalUrl = `/portal?clientId=${submittedClient.id}&formType=Address Change`;
                          window.open(portalUrl, '_blank');
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