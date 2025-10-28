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
  Scale,
  Stethoscope,
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
const irNoticeSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  client_name: z.string().min(1, "Client name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  dol_number: z.string().optional(),
  notice_date: z.string().min(1, "Notice date is required"),
  review_type: z.enum(["Initial Review", "Re-review", "Appeal Review"]),
  ir_provider: z.string().min(1, "Independent review provider is required"),
  ir_contact_name: z.string().min(1, "IR contact name is required"),
  ir_contact_phone: z.string().min(1, "IR contact phone is required"),
  ir_contact_email: z.string().optional(),
  medical_records_location: z.string().min(1, "Medical records location is required"),
  physician_name: z.string().min(1, "Reviewing physician name is required"),
  physician_specialty: z.string().optional(),
  review_deadline: z.string().min(1, "Review deadline is required"),
  case_summary: z.string().min(1, "Case summary is required"),
  specific_questions: z.string().optional(),
  additional_instructions: z.string().optional(),
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
  const { clients, loading: clientsLoading, error: clientsError, refreshClients } = useClients();
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<IRNoticeFormData>({
    resolver: zodResolver(irNoticeSchema),
    defaultValues: {
      client_id: "",
      client_name: "",
      case_id: "",
      dol_number: "",
      notice_date: new Date().toISOString().split("T")[0],
      review_type: "Initial Review",
      ir_provider: "",
      ir_contact_name: "",
      ir_contact_phone: "",
      ir_contact_email: "",
      medical_records_location: "",
      physician_name: "",
      physician_specialty: "",
      review_deadline: "",
      case_summary: "",
      specific_questions: "",
      additional_instructions: "",
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
      // Parse client name using shared utility
      const displayName = parseClientName(client.fields.Name || '');
      form.setValue("client_name", displayName);
      form.setValue("case_id", client.fields["Case ID"] || "");
    }
  };

  const onSubmit = async (data: IRNoticeFormData) => {
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
          notice_date: data.notice_date,
          review_type: data.review_type,
          ir_provider: data.ir_provider,
          ir_contact_name: data.ir_contact_name,
          ir_contact_phone: data.ir_contact_phone,
          ir_contact_email: data.ir_contact_email,
          medical_records_location: data.medical_records_location,
          physician_name: data.physician_name,
          physician_specialty: data.physician_specialty,
          review_deadline: data.review_deadline,
          case_summary: data.case_summary,
          specific_questions: data.specific_questions,
          additional_instructions: data.additional_instructions,
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
        a.download = `IR_Notice_${data.client_name.replace(/\s+/g, "_")}_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate IR notice letter");
      }
    } catch (error) {
      console.error("Error generating IR notice letter:", error);
      alert(error instanceof Error ? error.message : "Failed to generate IR notice letter");
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
    watchedFields.notice_date,
    watchedFields.review_type,
    watchedFields.ir_provider,
    watchedFields.ir_contact_name,
    watchedFields.ir_contact_phone,
    watchedFields.medical_records_location,
    watchedFields.physician_name,
    watchedFields.review_deadline,
    watchedFields.case_summary,
  ].filter(Boolean).length;

  const totalRequiredFields = 12;
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
              ⚖️ IR Notice La Plata Generator
            </h1>
            <p className="text-muted-foreground">
              Generate Independent Review Notice letter for La Plata medical reviews
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
          value={watchedFields.client_id}
          onChange={(clientId) => {
            form.setValue("client_id", clientId);
            handleClientChange(clientId);
          }}
          onRefresh={() => refreshClients(true)}
          error={form.formState.errors.client_id?.message}
          label="Choose which client you're preparing this IR notice for"
        />

        {/* Case Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-warning" />
              <CardTitle>Case Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Information about the case requiring independent review
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
                  label="Notice Date"
                  type="date"
                  required
                  error={form.formState.errors.notice_date?.message}
                  helperText="Date of this IR notice"
                  {...form.register("notice_date")}
                />
              </div>

              <Select
                label="Review Type"
                required
                error={form.formState.errors.review_type?.message}
                {...form.register("review_type")}
              >
                <option value="Initial Review">Initial Review</option>
                <option value="Re-review">Re-review</option>
                <option value="Appeal Review">Appeal Review</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Independent Review Provider Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Scale className="h-5 w-5 text-info" />
              <CardTitle>Independent Review Provider</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Information about the independent review organization
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="IR Provider Name"
                required
                error={form.formState.errors.ir_provider?.message}
                helperText="Name of the independent review organization"
                {...form.register("ir_provider")}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="IR Contact Name"
                  required
                  error={form.formState.errors.ir_contact_name?.message}
                  helperText="Name of the contact person at the IR organization"
                  {...form.register("ir_contact_name")}
                />

                <Input
                  label="IR Contact Phone"
                  required
                  error={form.formState.errors.ir_contact_phone?.message}
                  helperText="Phone number for the IR contact"
                  {...form.register("ir_contact_phone")}
                />
              </div>

              <Input
                label="IR Contact Email (Optional)"
                type="email"
                error={form.formState.errors.ir_contact_email?.message}
                helperText="Email address for the IR contact"
                {...form.register("ir_contact_email")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Medical Review Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-5 w-5 text-error" />
              <CardTitle>Medical Review Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Details about the medical review and reviewing physician
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="Medical Records Location"
                required
                error={form.formState.errors.medical_records_location?.message}
                helperText="Location where medical records can be accessed"
                {...form.register("medical_records_location")}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Reviewing Physician Name"
                  required
                  error={form.formState.errors.physician_name?.message}
                  helperText="Name of the physician conducting the review"
                  {...form.register("physician_name")}
                />

                <Input
                  label="Physician Specialty (Optional)"
                  error={form.formState.errors.physician_specialty?.message}
                  helperText="Medical specialty of the reviewing physician"
                  {...form.register("physician_specialty")}
                />
              </div>

              <Input
                label="Review Deadline"
                type="date"
                required
                error={form.formState.errors.review_deadline?.message}
                helperText="Deadline for completing the independent review"
                {...form.register("review_deadline")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Case Details */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-success" />
              <CardTitle>Case Details and Instructions</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Detailed information about the case and specific review requirements
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Textarea
                label="Case Summary"
                required
                error={form.formState.errors.case_summary?.message}
                helperText="Comprehensive summary of the case background and medical history"
                rows={4}
                {...form.register("case_summary")}
              />

              <Textarea
                label="Specific Questions for Review (Optional)"
                error={form.formState.errors.specific_questions?.message}
                helperText="Specific medical questions that need to be addressed in the review"
                rows={3}
                {...form.register("specific_questions")}
              />

              <Textarea
                label="Additional Instructions (Optional)"
                error={form.formState.errors.additional_instructions?.message}
                helperText="Any additional instructions or special considerations for the reviewer"
                rows={3}
                {...form.register("additional_instructions")}
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
                    <span>Complete all required fields to generate your IR notice letter</span>
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
                      <span>Generating Notice...</span>
                    </span>
                  ) : progressPercentage === 100 ? (
                    'Generate IR Notice Letter'
                  ) : (
                    'Complete Form to Generate'
                  )}
                </Button>
              </div>

              {/* Additional context when ready */}
              {progressPercentage === 100 && !loading && (
                <div className="text-xs text-muted-foreground bg-success/10 border border-success/20 rounded-lg p-3 max-w-md mx-auto">
                  ✓ Ready to generate your IR notice letter for La Plata review
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
                      🎉 IR notice letter generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your independent review notice letter has been downloaded and is ready for
                      submission to the review organization.
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
                        Ready to submit your IR notice letter to the Department of Labor portal? 
                        Click below to open the portal helper with this client's information pre-loaded.
                      </p>
                      <Button
                        onClick={() => {
                          const portalUrl = `/portal?clientId=${submittedClient.id}&formType=IR Notice`;
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