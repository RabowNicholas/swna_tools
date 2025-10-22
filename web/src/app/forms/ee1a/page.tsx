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
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import {
  FileDown,
  User,
  Heart,
  AlertCircle,
  CheckCircle,
  Info,
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
const ee1aSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  ssn: z.string().regex(/^\d{9}$/, "SSN must be 9 digits"),
  dob: z.string().min(1, "Date of birth is required"),
  sex: z
    .enum(["Male", "Female"])
    .refine((val) => val, { message: "Sex is required" }),
  address_main: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  phone: z.string().optional(),
  // Additional EE1A specific fields
  relationship_to_employee: z.string().min(1, "Relationship to employee is required"),
  employee_name: z.string().min(1, "Employee name is required"),
  employee_ssn: z.string().regex(/^\d{9}$/, "Employee SSN must be 9 digits"),
  employee_dob: z.string().min(1, "Employee date of birth is required"),
});

type EE1AFormData = z.infer<typeof ee1aSchema>;

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

export default function EE1AForm() {
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<EE1AFormData>({
    resolver: zodResolver(ee1aSchema),
    defaultValues: {
      client_id: "",
      first_name: "",
      last_name: "",
      ssn: "",
      dob: "",
      sex: "Male",
      address_main: "",
      address_city: "",
      address_state: "",
      address_zip: "",
      phone: "",
      relationship_to_employee: "",
      employee_name: "",
      employee_ssn: "",
      employee_dob: "",
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
      if (nameParts.length >= 2) {
        const lastName = nameParts[0].trim();
        const firstPart = nameParts[1].split("-")[0].trim();
        form.setValue("last_name", lastName);
        form.setValue("first_name", firstPart);
      }

      // Set other fields
      const ssn = fields["Social Security Number"];
      if (ssn) {
        const cleanSSN = ssn.toString().replace(/\D/g, "");
        if (cleanSSN.length === 9) {
          form.setValue("ssn", cleanSSN);
        }
      }

      form.setValue("address_main", fields["Street Address"] || "");
      form.setValue("address_city", fields["City"] || "");
      form.setValue("address_state", getStateAbbreviation(fields["State"] || ""));
      form.setValue("address_zip", fields["ZIP Code"] || "");
      form.setValue("phone", fields["Phone"] || "");

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

  const onSubmit = async (data: EE1AFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const requestData = {
        client_record: selectedClient,
        form_data: {
          first_name: data.first_name,
          last_name: data.last_name,
          ssn: `${data.ssn.slice(0, 3)}-${data.ssn.slice(3, 5)}-${data.ssn.slice(5)}`,
          dob: data.dob,
          sex: data.sex,
          address_main: data.address_main,
          address_city: data.address_city,
          address_state: data.address_state,
          address_zip: data.address_zip,
          phone: data.phone,
          relationship_to_employee: data.relationship_to_employee,
          employee_name: data.employee_name,
          employee_ssn: `${data.employee_ssn.slice(0, 3)}-${data.employee_ssn.slice(3, 5)}-${data.employee_ssn.slice(5)}`,
          employee_dob: data.employee_dob,
        },
      };

      const response = await fetch("/api/generate/ee1a", {
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
        a.download = `EE1A_${data.first_name.charAt(0) || "X"}.${
          data.last_name
        }_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate EE-1a");
      }
    } catch (error) {
      console.error("Error generating EE-1a:", error);
      alert(error instanceof Error ? error.message : "Failed to generate EE-1a");
    } finally {
      setLoading(false);
    }
  };

  // Calculate form completion
  const watchedFields = form.watch();
  const requiredFieldsComplete = [
    watchedFields.client_id,
    watchedFields.first_name,
    watchedFields.last_name,
    watchedFields.ssn,
    watchedFields.dob,
    watchedFields.sex,
    watchedFields.relationship_to_employee,
    watchedFields.employee_name,
    watchedFields.employee_ssn,
    watchedFields.employee_dob,
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
              📋 EE-1a Form Generator
            </h1>
            <p className="text-muted-foreground">
              Generate Supplemental Claim for Benefits Under the Energy
              Employees Occupational Illness Compensation Program Act
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
              label="Choose which client you're preparing this form for"
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

        {/* Claimant Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-success" />
              <CardTitle>Claimant Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Information about the person filing this supplemental claim
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Details */}
              <div className="space-y-6">
                <h4 className="font-medium text-foreground">
                  👤 Personal Details
                </h4>

                <Input
                  label="Claimant's First Name"
                  required
                  error={form.formState.errors.first_name?.message}
                  helperText="Claimant's legal first name"
                  {...form.register("first_name")}
                />

                <Input
                  label="Claimant's Last Name"
                  required
                  error={form.formState.errors.last_name?.message}
                  helperText="Claimant's legal last name"
                  {...form.register("last_name")}
                />

                <Input
                  label="Claimant's Social Security Number"
                  placeholder="123456789"
                  maxLength={9}
                  required
                  error={form.formState.errors.ssn?.message}
                  helperText="Enter 9 digits only (dashes will be added automatically)"
                  {...form.register("ssn")}
                />

                <Input
                  label="Claimant's Date of Birth"
                  type="date"
                  required
                  error={form.formState.errors.dob?.message}
                  helperText="Select the claimant's date of birth"
                  {...form.register("dob")}
                />

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Claimant's Sex *
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="Male"
                        {...form.register("sex")}
                        className="text-primary focus:ring-primary"
                      />
                      <span>Male</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="Female"
                        {...form.register("sex")}
                        className="text-primary focus:ring-primary"
                      />
                      <span>Female</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-6">
                <h4 className="font-medium text-foreground">
                  🏠 Contact Information
                </h4>

                <Input
                  label="Street Address"
                  helperText="Claimant's street address"
                  {...form.register("address_main")}
                />

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="City"
                      {...form.register("address_city")}
                    />
                  </div>
                  <Input
                    label="State"
                    maxLength={2}
                    placeholder="NY"
                    helperText="2-letter code"
                    {...form.register("address_state")}
                  />
                </div>

                <Input
                  label="ZIP Code"
                  maxLength={5}
                  helperText="5-digit ZIP code"
                  {...form.register("address_zip")}
                />

                <Input
                  label="Phone Number"
                  placeholder="555.123.4567"
                  helperText="Phone number in format: XXX.XXX.XXXX"
                  {...form.register("phone")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-error" />
              <CardTitle>Employee Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Information about the employee this claim relates to
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Select
                label="Relationship to Employee"
                required
                error={form.formState.errors.relationship_to_employee?.message}
                {...form.register("relationship_to_employee")}
              >
                <option value="">Select relationship...</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </Select>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Employee's Full Name"
                  required
                  error={form.formState.errors.employee_name?.message}
                  helperText="Full legal name of the employee"
                  {...form.register("employee_name")}
                />

                <Input
                  label="Employee's Date of Birth"
                  type="date"
                  required
                  error={form.formState.errors.employee_dob?.message}
                  helperText="Employee's date of birth"
                  {...form.register("employee_dob")}
                />
              </div>

              <Input
                label="Employee's Social Security Number"
                placeholder="123456789"
                maxLength={9}
                required
                error={form.formState.errors.employee_ssn?.message}
                helperText="Enter 9 digits only (dashes will be added automatically)"
                {...form.register("employee_ssn")}
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
                    <span>Complete all required fields to generate your EE-1a form</span>
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
                      <span>Generating Form...</span>
                    </span>
                  ) : progressPercentage === 100 ? (
                    'Generate EE-1a Form'
                  ) : (
                    'Complete Form to Generate'
                  )}
                </Button>
              </div>

              {/* Additional context when ready */}
              {progressPercentage === 100 && !loading && (
                <div className="text-xs text-muted-foreground bg-success/10 border border-success/20 rounded-lg p-3 max-w-md mx-auto">
                  ✓ Ready to generate your EE-1a supplemental claim form
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
                      🎉 EE-1a form generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your EE-1a supplemental claim form has been downloaded and is ready for
                      submission.
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
                        Ready to submit your EE-1a form to the Department of Labor portal? 
                        Click below to open the portal helper with this client's information pre-loaded.
                      </p>
                      <Button
                        onClick={() => {
                          const portalUrl = `/portal?clientId=${submittedClient.id}&formType=EE-1a`;
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