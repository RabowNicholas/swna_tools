"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useClients } from "@/hooks/useClients";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FileDown, AlertCircle, CheckCircle, User } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";
import {
  DiagnosisCategoriesSection,
  emptyDiagnosisCategories,
  emptyDiagnosisErrors,
  hasAnyValidDiagnosis,
  validateDiagnoses,
  type DiagnosisCategories,
  type DiagnosisErrors,
} from "@/components/form/DiagnosisCategories";
import { SignatureUpload } from "@/components/form/SignatureUpload";
import { ee1Schema, type EE1FormValues } from "@/lib/schemas/ee1";
import { formatSSN, generateEE1 } from "@/lib/claims/generate";
import { getStateAbbreviation } from "@/lib/states";
import { trackEvent } from "@/lib/analytics";

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

export default function EE1Form() {
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
      trackEvent.formViewed('ee1', session.user.id);
    }
  }, [session]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [diagnosisErrors, setDiagnosisErrors] = useState<DiagnosisErrors>(
    emptyDiagnosisErrors()
  );
  const [diagnosisCategories, setDiagnosisCategories] =
    useState<DiagnosisCategories>(emptyDiagnosisCategories());

  const form = useForm<EE1FormValues>({
    resolver: zodResolver(ee1Schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      first_name: "",
      middle_initial: "",
      last_name: "",
      ssn: "",
      dob: "",
      sex: "Male",
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
    const client = clients.find((c) => c.id === clientId) as any;
    if (client) {
      // Reset form to default values first (clears all fields)
      form.reset();

      // Reset diagnosis state
      setDiagnosisCategories(emptyDiagnosisCategories());
      setDiagnosisErrors(emptyDiagnosisErrors());

      // Reset signature state
      setSignatureFile(null);

      // Set client_id since reset cleared it
      form.setValue("client_id", clientId);

      const fields = client.fields;

      // Parse name using shared utility
      const rawName = fields.Name || "";
      const fullName = parseClientName(rawName);
      const nameParts = fullName.split(" ");
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        let middleInitial = "";
        let lastName = "";

        // Check if second part is a middle initial (single letter or letter with period)
        if (nameParts.length >= 3 && nameParts[1].replace(".", "").length === 1) {
          middleInitial = nameParts[1].replace(".", "").toUpperCase();
          lastName = nameParts.slice(2).join(" ");
        } else {
          lastName = nameParts.slice(1).join(" ");
        }

        form.setValue("first_name", firstName);
        form.setValue("middle_initial", middleInitial);
        form.setValue("last_name", lastName);
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
      form.setValue(
        "address_state",
        getStateAbbreviation(fields["State"] || "")
      );
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

  // Validation helper — the component owns the rules, the page owns the state
  const runDiagnosisValidation = () => {
    const errors = validateDiagnoses(diagnosisCategories);
    setDiagnosisErrors(errors);
    return Object.values(errors).flat();
  };


  const handleSubmitClick = async () => {
    setAttemptedSubmit(true);

    // Trigger validation
    const isValid = await form.trigger();

    if (!isValid) {
      // Find the first error field and scroll to it
      const errors = form.formState.errors;
      let firstErrorField: string | null = null;

      // Check fields in order of appearance
      if (errors.client_id) firstErrorField = "client_id";
      else if (errors.first_name) firstErrorField = "first_name";
      else if (errors.middle_initial) firstErrorField = "middle_initial";
      else if (errors.last_name) firstErrorField = "last_name";
      else if (errors.ssn) firstErrorField = "ssn";
      else if (errors.dob) firstErrorField = "dob";
      else if (errors.sex) firstErrorField = "sex";
      else if (errors.address_main) firstErrorField = "address_main";
      else if (errors.address_city) firstErrorField = "address_city";
      else if (errors.address_state) firstErrorField = "address_state";
      else if (errors.address_zip) firstErrorField = "address_zip";
      else if (errors.phone) firstErrorField = "phone";

      // Scroll to and focus the first error field
      if (firstErrorField) {
        setTimeout(() => {
          const element = document.querySelector(
            `[name="${firstErrorField}"]`
          ) as HTMLElement;
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.focus();
          }
        }, 100);
      }

      return;
    }

    // Check diagnosis validation
    const diagnosisErrorsList = runDiagnosisValidation();
    if (diagnosisErrorsList.length > 0) {
      // Scroll to diagnosis section
      setTimeout(() => {
        const diagnosisSection = document.getElementById("diagnosis-section");
        if (diagnosisSection) {
          diagnosisSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
      return;
    }

    // If valid, submit the form
    form.handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: EE1FormValues) => {
    setLoading(true);
    try {
      // Validate diagnoses
      const validationErrors = runDiagnosisValidation();
      if (validationErrors.length > 0) {
        validationErrors.forEach((error) => alert(error));
        setLoading(false);
        return;
      }

      const selectedClient = clients.find((c) => c.id === data.client_id) as any;
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const pdfBytes = await generateEE1(
        selectedClient,
        {
          first_name: data.first_name,
          middle_initial: data.middle_initial || "",
          last_name: data.last_name,
          ssn: formatSSN(data.ssn),
          dob: data.dob, // Keep as string in YYYY-MM-DD format
          sex: data.sex,
          address_main: data.address_main,
          address_city: data.address_city,
          address_state: data.address_state,
          address_zip: data.address_zip,
          phone: data.phone,
          diagnosis_categories: diagnosisCategories,
        },
        signatureFile
      );

      // Download the PDF
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EE1_${data.first_name.charAt(0) || "X"}.${
        data.last_name
      }_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Track PDF generation
      if (session?.user) {
        trackEvent.pdfGenerated('ee1', session.user.id, data.client_id);
      }

      setFormSubmitted(true);
      setSubmittedClient(selectedClient);
    } catch (error) {
      console.error("Error generating EE-1:", error);
      alert(error instanceof Error ? error.message : "Failed to generate EE-1");
    } finally {
      setLoading(false);
    }
  };

  const hasValidDiagnosis = hasAnyValidDiagnosis(diagnosisCategories);


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
          <div className="text-red-600 mb-4">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Clients
          </h3>
          <p className="text-gray-600">{clientsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Generate EE-1 Form
          </h1>
          <p className="text-muted-foreground">
            Worker&apos;s Claim for Benefits Under the Energy Employees
            Occupational Illness Compensation Program Act
          </p>
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
          label="Choose which client you're preparing this form for"
        />

        {/* Personal Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-success" />
              <CardTitle>Client Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the client&apos;s personal information as it appears on
              their official documents
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Details Column */}
              <div className="space-y-6">
                <h4 className="font-medium text-foreground">
                  👤 Personal Details
                </h4>

                <Input
                  label="Client's First Name"
                  required
                  error={form.formState.errors.first_name?.message}
                  helperText="Client's legal first name as it appears on their official documents"
                  {...form.register("first_name")}
                />

                <Input
                  label="Client's Middle Initial"
                  maxLength={1}
                  placeholder="Q"
                  error={form.formState.errors.middle_initial?.message}
                  helperText="Optional - Enter middle initial only (single letter)"
                  {...form.register("middle_initial")}
                />

                <Input
                  label="Client's Last Name"
                  required
                  error={form.formState.errors.last_name?.message}
                  helperText="Client's legal last name as it appears on their official documents"
                  {...form.register("last_name")}
                />

                <Input
                  label="Client's Social Security Number"
                  placeholder="123456789"
                  maxLength={9}
                  required
                  error={form.formState.errors.ssn?.message}
                  helperText="Enter 9 digits only (dashes will be added automatically)"
                  {...form.register("ssn")}
                />

                <Input
                  label="Client's Date of Birth"
                  type="date"
                  required
                  error={form.formState.errors.dob?.message}
                  helperText="Select the client's date of birth"
                  {...form.register("dob")}
                />

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Client&apos;s Sex *
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

              {/* Contact Information Column */}
              <div className="space-y-6">
                <h4 className="font-medium text-foreground">
                  🏠 Client&apos;s Contact Information
                </h4>

                <Input
                  label="Client's Street Address"
                  required
                  error={form.formState.errors.address_main?.message}
                  helperText="Client's street address (include apartment/unit number if applicable)"
                  {...form.register("address_main")}
                />

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="Client's City"
                      required
                      error={form.formState.errors.address_city?.message}
                      {...form.register("address_city")}
                    />
                  </div>
                  <Input
                    label="State"
                    required
                    maxLength={2}
                    placeholder="NY"
                    error={form.formState.errors.address_state?.message}
                    helperText="2-letter code"
                    {...form.register("address_state")}
                  />
                </div>

                <Input
                  label="Client's ZIP Code"
                  required
                  maxLength={10}
                  placeholder="12345"
                  error={form.formState.errors.address_zip?.message}
                  helperText="5-digit ZIP code (e.g., 12345 or 12345-6789)"
                  {...form.register("address_zip")}
                />

                <Input
                  label="Client's Phone Number"
                  required
                  placeholder="555.123.4567"
                  error={form.formState.errors.phone?.message}
                  helperText="Phone number in format: 123.123.1234"
                  {...form.register("phone")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Diagnoses Section */}
        <DiagnosisCategoriesSection
          value={diagnosisCategories}
          onChange={setDiagnosisCategories}
          errors={diagnosisErrors}
          attemptedSubmit={attemptedSubmit}
        />

        {/* Signature Section */}
        <SignatureUpload file={signatureFile} onChange={setSignatureFile} />


        {/* Submit Button */}
        <div className="flex flex-col gap-4 items-center">
          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={loading}
            size="lg"
            loading={loading}
            icon={<FileDown className="h-4 w-4" />}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/50"
          >
            {loading ? "Generating..." : "Generate EE-1"}
          </Button>

          {attemptedSubmit &&
            (Object.keys(form.formState.errors).length > 0 ||
              !hasValidDiagnosis) && (
              <div className="flex items-center text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mr-2" />
                Please complete all required fields and select at least one
                diagnosis before generating the form.
              </div>
            )}
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
                    EE-1 Generated Successfully!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your EE-1 form has been downloaded and is ready for
                    submission.
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
