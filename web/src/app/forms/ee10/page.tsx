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
  Briefcase,
  AlertCircle,
  CheckCircle,
  Building,
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
const ee10Schema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  ssn: z.string().regex(/^\d{9}$/, "SSN must be 9 digits"),
  dob: z.string().min(1, "Date of birth is required"),
  address_main: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  phone: z.string().optional(),
  // EE10 specific fields
  employer_name: z.string().min(1, "Employer name is required"),
  supervisor_name: z.string().min(1, "Supervisor name is required"),
  supervisor_title: z.string().min(1, "Supervisor title is required"),
  supervisor_phone: z.string().min(1, "Supervisor phone is required"),
  employment_start_date: z.string().min(1, "Employment start date is required"),
  employment_end_date: z.string().optional(),
  job_title: z.string().min(1, "Job title is required"),
  job_duties: z.string().min(1, "Job duties are required"),
  work_location: z.string().min(1, "Work location is required"),
  employee_status: z.enum(["Active", "Terminated", "Retired"]),
  exposure_details: z.string().optional(),
});

type EE10FormData = z.infer<typeof ee10Schema>;

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

export default function EE10Form() {
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<EE10FormData>({
    resolver: zodResolver(ee10Schema),
    defaultValues: {
      client_id: "",
      first_name: "",
      last_name: "",
      ssn: "",
      dob: "",
      address_main: "",
      address_city: "",
      address_state: "",
      address_zip: "",
      phone: "",
      employer_name: "",
      supervisor_name: "",
      supervisor_title: "",
      supervisor_phone: "",
      employment_start_date: "",
      employment_end_date: "",
      job_title: "",
      job_duties: "",
      work_location: "",
      employee_status: "Active",
      exposure_details: "",
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

  const onSubmit = async (data: EE10FormData) => {
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
          address_main: data.address_main,
          address_city: data.address_city,
          address_state: data.address_state,
          address_zip: data.address_zip,
          phone: data.phone,
          employer_name: data.employer_name,
          supervisor_name: data.supervisor_name,
          supervisor_title: data.supervisor_title,
          supervisor_phone: data.supervisor_phone,
          employment_start_date: data.employment_start_date,
          employment_end_date: data.employment_end_date,
          job_title: data.job_title,
          job_duties: data.job_duties,
          work_location: data.work_location,
          employee_status: data.employee_status,
          exposure_details: data.exposure_details,
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
        a.download = `EE10_${data.first_name.charAt(0) || "X"}.${
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
        throw new Error(errorData.error || "Failed to generate EE-10");
      }
    } catch (error) {
      console.error("Error generating EE-10:", error);
      alert(error instanceof Error ? error.message : "Failed to generate EE-10");
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
    watchedFields.employer_name,
    watchedFields.supervisor_name,
    watchedFields.supervisor_title,
    watchedFields.supervisor_phone,
    watchedFields.employment_start_date,
    watchedFields.job_title,
    watchedFields.job_duties,
    watchedFields.work_location,
    watchedFields.employee_status,
  ].filter(Boolean).length;

  const totalRequiredFields = 14;
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
              📊 EE-10 Form Generator
            </h1>
            <p className="text-muted-foreground">
              Generate Employment Verification Form for Energy Employees
              Occupational Illness Compensation Program
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

        {/* Employee Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-success" />
              <CardTitle>Employee Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Personal information of the employee
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Employee's First Name"
                required
                error={form.formState.errors.first_name?.message}
                helperText="Employee's legal first name"
                {...form.register("first_name")}
              />

              <Input
                label="Employee's Last Name"
                required
                error={form.formState.errors.last_name?.message}
                helperText="Employee's legal last name"
                {...form.register("last_name")}
              />

              <Input
                label="Employee's Social Security Number"
                placeholder="123456789"
                maxLength={9}
                required
                error={form.formState.errors.ssn?.message}
                helperText="Enter 9 digits only (dashes will be added automatically)"
                {...form.register("ssn")}
              />

              <Input
                label="Employee's Date of Birth"
                type="date"
                required
                error={form.formState.errors.dob?.message}
                helperText="Select the employee's date of birth"
                {...form.register("dob")}
              />

              <Input
                label="Street Address"
                helperText="Employee's street address"
                {...form.register("address_main")}
              />

              <Input
                label="Phone Number"
                placeholder="555.123.4567"
                helperText="Phone number in format: XXX.XXX.XXXX"
                {...form.register("phone")}
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
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-primary" />
              <CardTitle>Employment Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Details about the employment that needs verification
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="Employer/Company Name"
                required
                error={form.formState.errors.employer_name?.message}
                helperText="Name of the employer or company"
                {...form.register("employer_name")}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Supervisor Name"
                  required
                  error={form.formState.errors.supervisor_name?.message}
                  helperText="Name of the employee's supervisor"
                  {...form.register("supervisor_name")}
                />

                <Input
                  label="Supervisor Title"
                  required
                  error={form.formState.errors.supervisor_title?.message}
                  helperText="Job title of the supervisor"
                  {...form.register("supervisor_title")}
                />
              </div>

              <Input
                label="Supervisor Phone Number"
                required
                error={form.formState.errors.supervisor_phone?.message}
                helperText="Phone number to contact the supervisor"
                {...form.register("supervisor_phone")}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Employment Start Date"
                  type="date"
                  required
                  error={form.formState.errors.employment_start_date?.message}
                  helperText="Date when employment began"
                  {...form.register("employment_start_date")}
                />

                <Input
                  label="Employment End Date (if applicable)"
                  type="date"
                  error={form.formState.errors.employment_end_date?.message}
                  helperText="Date when employment ended (leave blank if still employed)"
                  {...form.register("employment_end_date")}
                />
              </div>

              <Input
                label="Work Location"
                required
                error={form.formState.errors.work_location?.message}
                helperText="Physical location where the work was performed"
                {...form.register("work_location")}
              />

              <Select
                label="Employee Status"
                required
                error={form.formState.errors.employee_status?.message}
                {...form.register("employee_status")}
              >
                <option value="Active">Active</option>
                <option value="Terminated">Terminated</option>
                <option value="Retired">Retired</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-warning" />
              <CardTitle>Job Details</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Specific information about the job and duties
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="Job Title/Position"
                required
                error={form.formState.errors.job_title?.message}
                helperText="Official job title or position held"
                {...form.register("job_title")}
              />

              <Textarea
                label="Job Duties and Responsibilities"
                required
                error={form.formState.errors.job_duties?.message}
                helperText="Detailed description of the job duties and responsibilities"
                rows={4}
                {...form.register("job_duties")}
              />

              <Textarea
                label="Exposure Details (Optional)"
                error={form.formState.errors.exposure_details?.message}
                helperText="Details about any exposure to hazardous materials, radiation, or toxic substances"
                rows={3}
                {...form.register("exposure_details")}
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
                    <span>Complete all required fields to generate your EE-10 form</span>
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
                    'Generate EE-10 Form'
                  ) : (
                    'Complete Form to Generate'
                  )}
                </Button>
              </div>

              {/* Additional context when ready */}
              {progressPercentage === 100 && !loading && (
                <div className="text-xs text-muted-foreground bg-success/10 border border-success/20 rounded-lg p-3 max-w-md mx-auto">
                  ✓ Ready to generate your EE-10 employment verification form
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
                      🎉 EE-10 form generated successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your EE-10 employment verification form has been downloaded and is ready for
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
                        Ready to submit your EE-10 form to the Department of Labor portal? 
                        Click below to open the portal helper with this client's information pre-loaded.
                      </p>
                      <Button
                        onClick={() => {
                          const portalUrl = `/portal?clientId=${submittedClient.id}&formType=EE-10`;
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