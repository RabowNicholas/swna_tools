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
  Stethoscope,
  AlertCircle,
  CheckCircle,
  Calendar,
  Heart,
  Activity,
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
const desertPulmSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  client_name: z.string().min(1, "Client name is required"),
  client_dob: z.string().min(1, "Client date of birth is required"),
  case_id: z.string().min(1, "Case ID is required"),
  referral_date: z.string().min(1, "Referral date is required"),
  referring_physician: z.string().min(1, "Referring physician is required"),
  referring_physician_phone: z.string().optional(),
  referring_physician_fax: z.string().optional(),
  pulmonologist_name: z.string().min(1, "Pulmonologist name is required"),
  pulmonologist_phone: z.string().min(1, "Pulmonologist phone is required"),
  pulmonologist_fax: z.string().optional(),
  appointment_urgency: z.enum(["Routine", "Urgent", "ASAP"]),
  reason_for_referral: z.string().min(1, "Reason for referral is required"),
  current_symptoms: z.string().optional(),
  relevant_history: z.string().optional(),
  current_medications: z.string().optional(),
  previous_testing: z.string().optional(),
  insurance_info: z.string().optional(),
  special_instructions: z.string().optional(),
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
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<DesertPulmFormData>({
    resolver: zodResolver(desertPulmSchema),
    defaultValues: {
      client_id: "",
      client_name: "",
      client_dob: "",
      case_id: "",
      referral_date: new Date().toISOString().split("T")[0],
      referring_physician: "",
      referring_physician_phone: "",
      referring_physician_fax: "",
      pulmonologist_name: "",
      pulmonologist_phone: "",
      pulmonologist_fax: "",
      appointment_urgency: "Routine",
      reason_for_referral: "",
      current_symptoms: "",
      relevant_history: "",
      current_medications: "",
      previous_testing: "",
      insurance_info: "",
      special_instructions: "",
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
      
      // Handle DOB
      const dob = fields["Date of Birth"];
      if (dob) {
        try {
          const date = new Date(dob);
          if (!isNaN(date.getTime())) {
            form.setValue("client_dob", date.toISOString().split("T")[0]);
          }
        } catch {
          // Ignore invalid dates
        }
      }
    }
  };

  const onSubmit = async (data: DesertPulmFormData) => {
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
          client_dob: data.client_dob,
          case_id: data.case_id,
          referral_date: data.referral_date,
          referring_physician: data.referring_physician,
          referring_physician_phone: data.referring_physician_phone,
          referring_physician_fax: data.referring_physician_fax,
          pulmonologist_name: data.pulmonologist_name,
          pulmonologist_phone: data.pulmonologist_phone,
          pulmonologist_fax: data.pulmonologist_fax,
          appointment_urgency: data.appointment_urgency,
          reason_for_referral: data.reason_for_referral,
          current_symptoms: data.current_symptoms,
          relevant_history: data.relevant_history,
          current_medications: data.current_medications,
          previous_testing: data.previous_testing,
          insurance_info: data.insurance_info,
          special_instructions: data.special_instructions,
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
        a.download = `DesertPulm_Referral_${data.client_name.replace(/\s+/g, "_")}_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate Desert Pulmonary referral");
      }
    } catch (error) {
      console.error("Error generating Desert Pulmonary referral:", error);
      alert(error instanceof Error ? error.message : "Failed to generate Desert Pulmonary referral");
    } finally {
      setLoading(false);
    }
  };

  // Calculate form completion
  const watchedFields = form.watch();
  const requiredFieldsComplete = [
    watchedFields.client_id,
    watchedFields.client_name,
    watchedFields.client_dob,
    watchedFields.case_id,
    watchedFields.referral_date,
    watchedFields.referring_physician,
    watchedFields.pulmonologist_name,
    watchedFields.pulmonologist_phone,
    watchedFields.appointment_urgency,
    watchedFields.reason_for_referral,
  ].filter(Boolean).length;

  const totalRequiredFields = 10;
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
              🫁 Desert Pulmonary Referral Generator
            </h1>
            <p className="text-muted-foreground">
              Generate medical referral documentation for Desert Pulmonary specialists
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
              label="Choose which client you're preparing this referral for"
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

        {/* Patient Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-success" />
              <CardTitle>Patient Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Basic information about the patient being referred
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Patient Name"
                  required
                  error={form.formState.errors.client_name?.message}
                  helperText="Full name of the patient"
                  {...form.register("client_name")}
                />

                <Input
                  label="Patient Date of Birth"
                  type="date"
                  required
                  error={form.formState.errors.client_dob?.message}
                  helperText="Patient's date of birth"
                  {...form.register("client_dob")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Case ID"
                  required
                  error={form.formState.errors.case_id?.message}
                  helperText="Case identification number"
                  {...form.register("case_id")}
                />

                <Input
                  label="Referral Date"
                  type="date"
                  required
                  error={form.formState.errors.referral_date?.message}
                  helperText="Date of this referral"
                  {...form.register("referral_date")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referring Physician Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-5 w-5 text-info" />
              <CardTitle>Referring Physician Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Information about the physician making the referral
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="Referring Physician Name"
                required
                error={form.formState.errors.referring_physician?.message}
                helperText="Name of the physician making the referral"
                {...form.register("referring_physician")}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Referring Physician Phone"
                  error={form.formState.errors.referring_physician_phone?.message}
                  helperText="Phone number of the referring physician"
                  {...form.register("referring_physician_phone")}
                />

                <Input
                  label="Referring Physician Fax"
                  error={form.formState.errors.referring_physician_fax?.message}
                  helperText="Fax number of the referring physician"
                  {...form.register("referring_physician_fax")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pulmonologist Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-error" />
              <CardTitle>Pulmonologist Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Information about the pulmonologist receiving the referral
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="Pulmonologist Name"
                required
                error={form.formState.errors.pulmonologist_name?.message}
                helperText="Name of the pulmonologist"
                {...form.register("pulmonologist_name")}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Pulmonologist Phone"
                  required
                  error={form.formState.errors.pulmonologist_phone?.message}
                  helperText="Phone number of the pulmonologist"
                  {...form.register("pulmonologist_phone")}
                />

                <Input
                  label="Pulmonologist Fax"
                  error={form.formState.errors.pulmonologist_fax?.message}
                  helperText="Fax number of the pulmonologist"
                  {...form.register("pulmonologist_fax")}
                />
              </div>

              <Select
                label="Appointment Urgency"
                required
                error={form.formState.errors.appointment_urgency?.message}
                {...form.register("appointment_urgency")}
              >
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="ASAP">ASAP</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-warning" />
              <CardTitle>Medical Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Clinical information and reason for referral
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Textarea
                label="Reason for Referral"
                required
                error={form.formState.errors.reason_for_referral?.message}
                helperText="Primary reason for the pulmonary referral"
                rows={3}
                {...form.register("reason_for_referral")}
              />

              <Textarea
                label="Current Symptoms (Optional)"
                error={form.formState.errors.current_symptoms?.message}
                helperText="Patient's current respiratory symptoms"
                rows={3}
                {...form.register("current_symptoms")}
              />

              <Textarea
                label="Relevant Medical History (Optional)"
                error={form.formState.errors.relevant_history?.message}
                helperText="Relevant medical history, especially respiratory conditions"
                rows={3}
                {...form.register("relevant_history")}
              />

              <Textarea
                label="Current Medications (Optional)"
                error={form.formState.errors.current_medications?.message}
                helperText="Current medications, especially respiratory medications"
                rows={3}
                {...form.register("current_medications")}
              />

              <Textarea
                label="Previous Testing (Optional)"
                error={form.formState.errors.previous_testing?.message}
                helperText="Previous pulmonary function tests, imaging, or other relevant studies"
                rows={3}
                {...form.register("previous_testing")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-info" />
              <CardTitle>Additional Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Insurance and special instructions
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Textarea
                label="Insurance Information (Optional)"
                error={form.formState.errors.insurance_info?.message}
                helperText="Insurance coverage details and authorization information"
                rows={3}
                {...form.register("insurance_info")}
              />

              <Textarea
                label="Special Instructions (Optional)"
                error={form.formState.errors.special_instructions?.message}
                helperText="Any special instructions or considerations for the pulmonologist"
                rows={3}
                {...form.register("special_instructions")}
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
                    <span>Complete all required fields to generate your Desert Pulmonary referral</span>
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
                      <span>Generating Referral...</span>
                    </span>
                  ) : progressPercentage === 100 ? (
                    'Generate Desert Pulmonary Referral'
                  ) : (
                    'Complete Form to Generate'
                  )}
                </Button>
              </div>

              {/* Additional context when ready */}
              {progressPercentage === 100 && !loading && (
                <div className="text-xs text-muted-foreground bg-success/10 border border-success/20 rounded-lg p-3 max-w-md mx-auto">
                  ✓ Ready to generate your Desert Pulmonary medical referral
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
                      🎉 Desert Pulmonary referral generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your medical referral documentation has been downloaded and is ready for
                      submission to Desert Pulmonary.
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
                        Ready to submit your Desert Pulmonary referral to the Department of Labor portal? 
                        Click below to open the portal helper with this client's information pre-loaded.
                      </p>
                      <Button
                        onClick={() => {
                          const portalUrl = `/portal?clientId=${submittedClient.id}&formType=Desert Pulmonary`;
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