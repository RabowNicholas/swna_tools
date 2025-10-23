"use client";

import { useState, useEffect, useRef } from "react";
import { useClients } from "@/hooks/useClients";
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
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Upload,
  FileText,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

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

// Date validation helper
const validateDate = (date: string, label: string): string | null => {
  if (!date) return null;

  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date("1900-01-01");

  if (isNaN(dateObj.getTime())) {
    return `${label} must be a valid date`;
  }

  if (dateObj > today) {
    return `${label} cannot be in the future`;
  }

  if (dateObj < minDate) {
    return `${label} must be after January 1, 1900`;
  }

  return null;
};

// Zod schema for form validation
const ee1aSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  address_main: z.string().min(1, "Street address is required"),
  address_city: z.string().min(1, "City is required"),
  address_state: z
    .string()
    .min(2, "State is required")
    .max(2, "State must be 2 characters"),
  address_zip: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits"),
  phone: z
    .string()
    .regex(
      /^\d{3}\.\d{3}\.\d{4}$/,
      "Phone number must be in format: 123.123.1234"
    ),
  diagnoses: z
    .array(
      z.object({
        diagnosis_text: z.string(),
        diagnosis_date: z.string(),
      })
    )
    .min(1, "At least one diagnosis is required"),
});

type EE1AFormData = z.infer<typeof ee1aSchema>;

interface DiagnosisError {
  diagnosis_text?: string;
  diagnosis_date?: string;
}

export default function EE1AForm() {
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
  } = useClients();
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [diagnosisErrors, setDiagnosisErrors] = useState<DiagnosisError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EE1AFormData>({
    resolver: zodResolver(ee1aSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      first_name: "",
      last_name: "",
      case_id: "",
      address_main: "",
      address_city: "",
      address_state: "",
      address_zip: "",
      phone: "",
      diagnoses: [{ diagnosis_text: "", diagnosis_date: "" }],
    },
  });

  // Watch diagnoses for dynamic validation
  const diagnoses = form.watch("diagnoses");

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
      form.setValue("case_id", fields["Case ID"] || "");
      form.setValue("address_main", fields["Street Address"] || "");
      form.setValue("address_city", fields["City"] || "");
      form.setValue(
        "address_state",
        getStateAbbreviation(fields["State"] || "")
      );
      form.setValue("address_zip", fields["ZIP Code"] || "");
      form.setValue("phone", fields["Phone"] || "");
    }
  };

  // Handle signature file upload
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add diagnosis
  const addDiagnosis = () => {
    const currentDiagnoses = form.getValues("diagnoses");
    if (currentDiagnoses.length < 5) {
      form.setValue("diagnoses", [
        ...currentDiagnoses,
        { diagnosis_text: "", diagnosis_date: "" },
      ]);
      setDiagnosisErrors([...diagnosisErrors, {}]);
    } else {
      alert("Maximum of 5 diagnoses allowed");
    }
  };

  // Remove diagnosis
  const removeDiagnosis = (index: number) => {
    const currentDiagnoses = form.getValues("diagnoses");
    if (currentDiagnoses.length > 1) {
      form.setValue(
        "diagnoses",
        currentDiagnoses.filter((_, i) => i !== index)
      );
      setDiagnosisErrors(diagnosisErrors.filter((_, i) => i !== index));
    }
  };

  // Validate diagnoses
  const validateDiagnoses = (): boolean => {
    const currentDiagnoses = form.getValues("diagnoses");
    const errors: DiagnosisError[] = [];
    let hasError = false;

    currentDiagnoses.forEach((diagnosis, index) => {
      const diagError: DiagnosisError = {};

      if (!diagnosis.diagnosis_text || diagnosis.diagnosis_text.trim() === "") {
        diagError.diagnosis_text = "Diagnosis description is required";
        hasError = true;
      }

      if (!diagnosis.diagnosis_date || diagnosis.diagnosis_date.trim() === "") {
        diagError.diagnosis_date = "Diagnosis date is required";
        hasError = true;
      } else {
        const dateError = validateDate(
          diagnosis.diagnosis_date,
          "Diagnosis date"
        );
        if (dateError) {
          diagError.diagnosis_date = dateError;
          hasError = true;
        }
      }

      errors[index] = diagError;
    });

    setDiagnosisErrors(errors);
    return !hasError;
  };

  // Handle submit click with manual validation
  const handleSubmitClick = async () => {
    setAttemptedSubmit(true);

    // Trigger form validation
    const isFormValid = await form.trigger();
    const areDiagnosesValid = validateDiagnoses();

    // Check signature file
    if (!signatureFile) {
      alert("Please upload the client's signature");
      return;
    }

    if (!isFormValid || !areDiagnosesValid) {
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

  const onSubmit = async (data: EE1AFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      if (!signatureFile) {
        throw new Error("Signature file is required");
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("signature_file", signatureFile);

      // Add form data as JSON
      const requestData = {
        client_record: selectedClient,
        form_data: {
          first_name: data.first_name,
          last_name: data.last_name,
          case_id: data.case_id,
          address_main: data.address_main,
          address_city: data.address_city,
          address_state: data.address_state,
          address_zip: data.address_zip,
          phone: data.phone,
          diagnoses: data.diagnoses,
        },
      };

      formData.append("data", JSON.stringify(requestData));

      const response = await fetch("/api/generate/ee1a", {
        method: "POST",
        body: formData,
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
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate EE-1a");
      }
    } catch (error) {
      console.error("Error generating EE-1a:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate EE-1a"
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

  const hasAnyDiagnosisError = diagnosisErrors.some(
    (err) => err.diagnosis_text || err.diagnosis_date
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">
          EE-1a Form Generator
        </h1>
        <p className="text-muted-foreground">
          Consequential Illness Claim - For conditions resulting from an
          already-accepted illness
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
              error={
                attemptedSubmit
                  ? form.formState.errors.client_id?.message
                  : undefined
              }
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
            {form.watch("client_id") && (
              <div className="mt-2 text-sm text-success flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Selected:{" "}
                {
                  clients.find((c) => c.id === form.watch("client_id"))?.fields
                    .Name
                }
              </div>
            )}
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
              Information about the worker filing this consequential illness
              claim
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Name fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="First Name"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.first_name?.message
                      : undefined
                  }
                  {...form.register("first_name")}
                />

                <Input
                  label="Last Name"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.last_name?.message
                      : undefined
                  }
                  {...form.register("last_name")}
                />
              </div>

              {/* Case ID */}
              <Input
                label="Case ID"
                required
                error={
                  attemptedSubmit
                    ? form.formState.errors.case_id?.message
                    : undefined
                }
                helperText="Enter your existing accepted illness case ID"
                {...form.register("case_id")}
              />

              {/* Address */}
              <Input
                label="Street Address"
                required
                error={
                  attemptedSubmit
                    ? form.formState.errors.address_main?.message
                    : undefined
                }
                {...form.register("address_main")}
              />

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Input
                    label="City"
                    required
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
                  maxLength={2}
                  placeholder="NY"
                  required
                  helperText="2-letter code"
                  error={
                    attemptedSubmit
                      ? form.formState.errors.address_state?.message
                      : undefined
                  }
                  {...form.register("address_state")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="ZIP Code"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.address_zip?.message
                      : undefined
                  }
                  helperText="5 or 9 digit ZIP code"
                  {...form.register("address_zip")}
                />

                <Input
                  label="Phone Number"
                  placeholder="555.123.4567"
                  required
                  error={
                    attemptedSubmit
                      ? form.formState.errors.phone?.message
                      : undefined
                  }
                  helperText="Format: 123.123.1234"
                  {...form.register("phone")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consequential Illnesses */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>Consequential Illnesses</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  List conditions that resulted from your accepted illness (max
                  5)
                </p>
              </div>
              {diagnoses.length < 5 && (
                <Button
                  type="button"
                  onClick={addDiagnosis}
                  variant="outline"
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                >
                  Add Diagnosis
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {hasAnyDiagnosisError && attemptedSubmit && (
              <div
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--destructive) 15%, transparent)",
                  borderColor: "var(--destructive)",
                }}
                className="mb-6 p-4 rounded-lg border-2 flex items-start"
              >
                <AlertCircle
                  className="h-5 w-5 flex-shrink-0 mt-0.5"
                  style={{ color: "var(--destructive)" }}
                />
                <div className="ml-3">
                  <h4
                    className="font-medium"
                    style={{ color: "var(--destructive)" }}
                  >
                    Please complete all diagnosis information
                  </h4>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--destructive)" }}
                  >
                    Each diagnosis must have both a description and a valid
                    date.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {diagnoses.map((diagnosis, index) => (
                <Card
                  key={index}
                  style={
                    attemptedSubmit &&
                    (diagnosisErrors[index]?.diagnosis_text ||
                      diagnosisErrors[index]?.diagnosis_date)
                      ? {
                          borderColor: "var(--destructive)",
                          backgroundColor:
                            "color-mix(in srgb, var(--destructive) 10%, transparent)",
                        }
                      : undefined
                  }
                  className={cn(
                    "border-2 transition-all",
                    !attemptedSubmit ||
                      (!diagnosisErrors[index]?.diagnosis_text &&
                        !diagnosisErrors[index]?.diagnosis_date)
                      ? "border-border"
                      : ""
                  )}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-foreground">
                          Diagnosis #{index + 1}
                        </h4>
                        {diagnoses.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeDiagnosis(index)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            icon={<Trash2 className="h-4 w-4" />}
                          >
                            Remove
                          </Button>
                        )}
                      </div>

                      <Input
                        label="Diagnosis Description"
                        required
                        placeholder="Describe the consequential illness..."
                        error={
                          attemptedSubmit
                            ? diagnosisErrors[index]?.diagnosis_text
                            : undefined
                        }
                        {...form.register(`diagnoses.${index}.diagnosis_text`)}
                      />

                      <Input
                        label="Diagnosis Date"
                        type="date"
                        required
                        error={
                          attemptedSubmit
                            ? diagnosisErrors[index]?.diagnosis_date
                            : undefined
                        }
                        helperText="Date this condition was diagnosed"
                        {...form.register(`diagnoses.${index}.diagnosis_date`)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Signature Upload */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Signature</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload an image of the claimant's signature
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                className="hidden"
              />

              {!signatureFile ? (
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full py-8 border-2 border-dashed"
                  icon={<Upload className="h-5 w-5" />}
                >
                  Click to upload signature image
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-border rounded-lg p-4 bg-muted/30">
                    {signaturePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signaturePreview}
                        alt="Signature preview"
                        className="max-h-32 mx-auto"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-success" />
                      {signatureFile.name}
                    </span>
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
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
            {loading ? "Generating Form..." : "Generate EE-1a Form"}
          </Button>
        </div>

        {/* Success Message */}
        {formSubmitted && (
          <Card variant="elevated" className="bg-success/10 border-success/20">
            <CardContent>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    EE-1a form generated successfully!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your consequential illness claim form has been downloaded
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
