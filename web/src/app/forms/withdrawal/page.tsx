'use client';

import { useState, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import {
  FileDown,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  Calendar,
  X,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

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
const withdrawalSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  client_name: z.string().min(1, "Client name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  dol_number: z.string().optional(),
  withdrawal_date: z.string().min(1, "Withdrawal date is required"),
  withdrawal_reason: z.string().min(1, "Withdrawal reason is required"),
  claim_type: z.enum(["Part B", "Part E", "Both"]),
  attorney_name: z.string().optional(),
  attorney_firm: z.string().optional(),
  attorney_address: z.string().optional(),
  attorney_phone: z.string().optional(),
  additional_notes: z.string().optional(),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

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
    "Date of Birth"?: string;
    [key: string]: string | undefined;
  };
}

export default function WithdrawalForm() {
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      client_id: "",
      client_name: "",
      case_id: "",
      dol_number: "",
      withdrawal_date: new Date().toISOString().split("T")[0],
      withdrawal_reason: "",
      claim_type: "Part B",
      attorney_name: "",
      attorney_firm: "",
      attorney_address: "",
      attorney_phone: "",
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

      // Parse name
      const name = fields.Name || "";
      const nameParts = name.split(",");
      let clientName = name;
      if (nameParts.length >= 2) {
        const lastName = nameParts[0].trim();
        const firstPart = nameParts[1].split("-")[0].trim();
        clientName = `${firstPart} ${lastName}`;
      }

      form.setValue("client_name", clientName);
      form.setValue("case_id", fields["Case ID"] || "");
    }
  };

  const onSubmit = async (data: WithdrawalFormData) => {
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
          withdrawal_date: data.withdrawal_date,
          withdrawal_reason: data.withdrawal_reason,
          claim_type: data.claim_type,
          attorney_name: data.attorney_name,
          attorney_firm: data.attorney_firm,
          attorney_address: data.attorney_address,
          attorney_phone: data.attorney_phone,
          additional_notes: data.additional_notes,
        },
      };

      const response = await fetch("/api/generate/withdrawal", {
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
        a.download = `Withdrawal_${data.client_name.replace(/\s+/g, "_")}_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate withdrawal letter");
      }
    } catch (error) {
      console.error("Error generating withdrawal letter:", error);
      alert(error instanceof Error ? error.message : "Failed to generate withdrawal letter");
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
    watchedFields.withdrawal_date,
    watchedFields.withdrawal_reason,
    watchedFields.claim_type,
  ].filter(Boolean).length;

  const totalRequiredFields = 6;
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
              ❌ Withdrawal Letter Generator
            </h1>
            <p className="text-muted-foreground">
              Generate formal withdrawal letter for DOL case proceedings
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
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Client Selection</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              label="Choose which client you're preparing this withdrawal letter for"
              placeholder="Select..."
              required
              error={form.formState.errors.client_id?.message}
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
            {watchedFields.client_id && (
              <div className="mt-2 text-sm text-success flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Selected:{" "}
                {
                  clients.find((c) => c.id === watchedFields.client_id)?.fields
                    .Name
                }
              </div>
            )}
          </CardContent>
        </Card>

        {/* Case Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-warning" />
              <CardTitle>Case Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Information about the case being withdrawn
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

              <Input
                label="DOL Number (Optional)"
                error={form.formState.errors.dol_number?.message}
                helperText="Department of Labor reference number, if available"
                {...form.register("dol_number")}
              />

              <Select
                label="Claim Type"
                required
                error={form.formState.errors.claim_type?.message}
                {...form.register("claim_type")}
              >
                <option value="Part B">Part B</option>
                <option value="Part E">Part E</option>
                <option value="Both">Both Part B and Part E</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Details */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <X className="h-5 w-5 text-error" />
              <CardTitle>Withdrawal Details</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Specific details about the withdrawal
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="Withdrawal Date"
                type="date"
                required
                error={form.formState.errors.withdrawal_date?.message}
                helperText="Date of the withdrawal request"
                {...form.register("withdrawal_date")}
              />

              <Textarea
                label="Reason for Withdrawal"
                required
                error={form.formState.errors.withdrawal_reason?.message}
                helperText="Detailed explanation for why the case is being withdrawn"
                rows={4}
                {...form.register("withdrawal_reason")}
              />

              <Textarea
                label="Additional Notes (Optional)"
                error={form.formState.errors.additional_notes?.message}
                helperText="Any additional comments or instructions"
                rows={3}
                {...form.register("additional_notes")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Attorney Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-info" />
              <CardTitle>Attorney Information (Optional)</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Attorney or representative information, if applicable
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Attorney Name"
                  error={form.formState.errors.attorney_name?.message}
                  helperText="Name of the attorney or representative"
                  {...form.register("attorney_name")}
                />

                <Input
                  label="Law Firm"
                  error={form.formState.errors.attorney_firm?.message}
                  helperText="Name of the law firm or organization"
                  {...form.register("attorney_firm")}
                />
              </div>

              <Input
                label="Attorney Address"
                error={form.formState.errors.attorney_address?.message}
                helperText="Full mailing address of the attorney or firm"
                {...form.register("attorney_address")}
              />

              <Input
                label="Attorney Phone"
                error={form.formState.errors.attorney_phone?.message}
                helperText="Phone number of the attorney or firm"
                {...form.register("attorney_phone")}
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
                    <span>Complete all required fields to generate your withdrawal letter</span>
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
                    'Generate Withdrawal Letter'
                  ) : (
                    'Complete Form to Generate'
                  )}
                </Button>
              </div>

              {/* Additional context when ready */}
              {progressPercentage === 100 && !loading && (
                <div className="text-xs text-muted-foreground bg-success/10 border border-success/20 rounded-lg p-3 max-w-md mx-auto">
                  ✓ Ready to generate your formal withdrawal letter
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
                      🎉 Withdrawal letter generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your formal withdrawal letter has been downloaded and is ready for
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
                        Ready to submit your withdrawal letter to the Department of Labor portal? 
                        Click below to open the portal helper with this client's information pre-loaded.
                      </p>
                      <Button
                        onClick={() => {
                          const portalUrl = `/portal?clientId=${submittedClient.id}&formType=Withdrawal`;
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