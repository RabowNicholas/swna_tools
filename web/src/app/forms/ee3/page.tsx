"use client";

import { useState, useEffect } from "react";
import { useClients } from "@/hooks/useClients";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  Minus,
  FileDown,
  Briefcase,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";

// Zod schema for form validation
const employmentSchema = z
  .object({
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().optional(),
    facility_name: z.string().min(1, "Facility name is required"),
    specific_location: z.string().min(1, "Specific location is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    contractor: z.string().min(1, "Contractor is required"),
    position_title: z.string().min(1, "Position title is required"),
    work_duties: z.string().min(1, "Work duties are required"),
    union_member: z.boolean().optional(),
    dosimetry_worn: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Validate start date
      if (data.start_date) {
        const startDate = new Date(data.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minDate = new Date("1900-01-01");

        if (startDate > today) {
          return false;
        }
        if (startDate < minDate) {
          return false;
        }
      }

      // Validate end date if provided
      if (data.end_date) {
        const endDate = new Date(data.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minDate = new Date("1900-01-01");

        if (endDate > today) {
          return false;
        }
        if (endDate < minDate) {
          return false;
        }

        // End date must be after start date
        if (data.start_date) {
          const startDate = new Date(data.start_date);
          if (endDate < startDate) {
            return false;
          }
        }
      }

      return true;
    },
    {
      message: "Invalid employment dates",
    }
  );

const ee3Schema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  former_name: z.string().optional(),
  ssn: z.string().regex(/^\d{9}$/, "SSN must be 9 digits"),
  employment_history: z
    .array(employmentSchema)
    .min(1, "At least one employment record is required"),
});

type EE3FormData = z.infer<typeof ee3Schema>;

interface Client {
  id: string;
  fields: {
    Name: string;
    "Social Security Number"?: string;
    "Case ID"?: string;
    [key: string]: string | undefined;
  };
}

// Helper to validate employment dates and return specific error messages
const validateEmploymentDate = (date: string, label: string): string | null => {
  if (!date) return null;

  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date("1900-01-01");

  if (dateObj > today) {
    return `${label} cannot be in the future`;
  }

  if (dateObj < minDate) {
    return `${label} must be after January 1, 1900`;
  }

  return null;
};

export default function EE3Form() {
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refreshClients,
  } = useClients();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [lastFormData, setLastFormData] = useState<EE3FormData | null>(null);
  const [collapsedEmployment, setCollapsedEmployment] = useState<Set<number>>(
    new Set()
  );
  const [showPreview, setShowPreview] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [employmentDateErrors, setEmploymentDateErrors] = useState<
    Record<number, { start?: string; end?: string }>
  >({});

  const form = useForm<EE3FormData>({
    resolver: zodResolver(ee3Schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      first_name: "",
      last_name: "",
      former_name: "",
      ssn: "",
      employment_history: [
        {
          start_date: "",
          end_date: "",
          facility_name: "",
          specific_location: "",
          city: "",
          state: "",
          contractor: "",
          position_title: "",
          work_duties: "",
          union_member: false,
          dosimetry_worn: false,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "employment_history",
  });

  // Toggle employment section collapse
  const toggleEmploymentCollapse = (index: number) => {
    setCollapsedEmployment((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Toggle employment preview
  const toggleEmploymentPreview = (index: number) => {
    setShowPreview((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Check if employment record is complete
  const isEmploymentComplete = (index: number) => {
    const employment = watchedFields.employment_history?.[index];
    if (!employment) return false;
    return (
      !!employment.start_date &&
      employment.facility_name &&
      employment.specific_location &&
      employment.city &&
      employment.state &&
      employment.contractor &&
      employment.position_title &&
      employment.work_duties
    );
  };

  // Show error if clients failed to load
  useEffect(() => {
    if (clientsError) {
      console.error("Failed to load clients:", clientsError);
    }
  }, [clientsError]);

  // Handle client selection
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      // Parse name using shared utility
      const rawName = client.fields.Name || "";
      const fullName = parseClientName(rawName);
      const nameParts = fullName.split(" ");
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ");
        form.setValue("first_name", firstName);
        form.setValue("last_name", lastName);
      }

      // Set SSN if available
      const ssn = client.fields["Social Security Number"];
      if (ssn) {
        const cleanSSN = ssn.toString().replace(/\D/g, "");
        if (cleanSSN.length === 9) {
          form.setValue("ssn", cleanSSN);
        }
      }
    }
  };

  const handleSubmitClick = async () => {
    setAttemptedSubmit(true);

    // Validate employment dates
    const employmentHistory = form.getValues("employment_history");
    const dateErrors: Record<number, { start?: string; end?: string }> = {};

    employmentHistory.forEach((employment, index) => {
      const startError = validateEmploymentDate(
        employment.start_date,
        "Start date"
      );
      const endError = employment.end_date
        ? validateEmploymentDate(employment.end_date, "End date")
        : null;

      // Check if end date is after start date
      let endDateError = endError;
      if (
        employment.start_date &&
        employment.end_date &&
        !startError &&
        !endError
      ) {
        const start = new Date(employment.start_date);
        const end = new Date(employment.end_date);
        if (end < start) {
          endDateError = "End date must be after start date";
        }
      }

      if (startError || endDateError) {
        dateErrors[index] = {
          start: startError || undefined,
          end: endDateError || undefined,
        };
      }
    });

    setEmploymentDateErrors(dateErrors);

    // Trigger validation on all fields - this will show error messages
    const isValid = await form.trigger();

    if (!isValid || Object.keys(dateErrors).length > 0) {
      // Find the first error field and scroll to it
      const errors = form.formState.errors;
      let firstErrorField: string | null = null;

      // Check top-level fields first
      if (errors.client_id) firstErrorField = "client_id";
      else if (errors.first_name) firstErrorField = "first_name";
      else if (errors.last_name) firstErrorField = "last_name";
      else if (errors.ssn) firstErrorField = "ssn";
      else if (errors.employment_history) {
        // Find first employment history error
        for (let i = 0; i < form.getValues("employment_history").length; i++) {
          const empErrors = errors.employment_history?.[i];
          if (empErrors) {
            // Expand the collapsed section if needed
            setCollapsedEmployment((prev) => {
              const newSet = new Set(prev);
              newSet.delete(i);
              return newSet;
            });

            // Find specific field with error
            const fieldKeys = Object.keys(empErrors);
            if (fieldKeys.length > 0) {
              firstErrorField = `employment_history.${i}.${fieldKeys[0]}`;
            }
            break;
          }
        }
      }

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

    // If valid, submit the form
    form.handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: EE3FormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      // Format employment history dates
      const formattedEmploymentHistory = data.employment_history.map((job) => ({
        ...job,
        start_date: job.start_date
          ? new Date(job.start_date).toISOString().split("T")[0]
          : null,
        end_date: job.end_date
          ? new Date(job.end_date).toISOString().split("T")[0]
          : null,
      }));

      const requestData = {
        client_record: selectedClient,
        form_data: {
          first_name: data.first_name,
          last_name: data.last_name,
          former_name: data.former_name,
          ssn: `${data.ssn.slice(0, 3)}-${data.ssn.slice(
            3,
            5
          )}-${data.ssn.slice(5)}`,
          employment_history: formattedEmploymentHistory,
        },
      };

      const response = await fetch("/api/generate/ee3", {
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
        a.download = `EE3_${data.first_name.charAt(0) || "X"}.${
          data.last_name
        }_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Mark form as submitted and store data for portal access
        setFormSubmitted(true);
        setLastFormData(data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate EE-3");
      }
    } catch (error) {
      console.error("Error generating EE-3:", error);
      alert(error instanceof Error ? error.message : "Failed to generate EE-3");
    } finally {
      setLoading(false);
    }
  };

  const handlePortalAccess = async () => {
    if (!lastFormData) return;

    setPortalLoading(true);
    try {
      const selectedClient = clients.find(
        (c) => c.id === lastFormData.client_id
      );
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      // Extract case ID and SSN last 4 from client data
      const caseId = selectedClient.fields["Case ID"] || "";
      const clientName = selectedClient.fields.Name || "";
      const ssnLast4 =
        clientName.split("-").pop()?.trim() || lastFormData.ssn.slice(-4);

      const portalData = {
        case_id: caseId,
        last_name: lastFormData.last_name,
        ssn_last4: ssnLast4,
        client_name: `${lastFormData.first_name} ${lastFormData.last_name}`,
      };

      const response = await fetch("/api/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(portalData),
      });

      const result = await response.json();

      if (response.ok) {
        alert(
          "Portal automation completed! Please select and upload your PDF file manually."
        );
      } else {
        throw new Error(result.error || "Portal automation failed");
      }
    } catch (error) {
      console.error("Portal access error:", error);
      alert(error instanceof Error ? error.message : "Portal access failed");
    } finally {
      setPortalLoading(false);
    }
  };

  // Calculate form completion progress
  const watchedFields = form.watch();
  const totalRequiredFields = 4; // client_id, first_name, last_name, ssn
  const employmentRequiredFields =
    watchedFields.employment_history?.length * 7 || 0; // 7 required fields per employment
  const totalFields = totalRequiredFields + employmentRequiredFields;

  const completedFields =
    [
      watchedFields.client_id,
      watchedFields.first_name,
      watchedFields.last_name,
      watchedFields.ssn,
    ].filter(Boolean).length +
    (watchedFields.employment_history?.reduce((acc, emp) => {
      return (
        acc +
        [
          emp.start_date,
          emp.facility_name,
          emp.specific_location,
          emp.city,
          emp.state,
          emp.contractor,
          emp.position_title,
          emp.work_duties,
        ].filter(Boolean).length
      );
    }, 0) || 0);

  const progressPercentage =
    totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

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
      {/* Header with Progress */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Generate EE-3 Form
            </h1>
            <p className="text-muted-foreground">
              Employee employment history documentation with automated portal
              submission
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
          clients={clients as any}
          value={form.watch("client_id")}
          onChange={(clientId) => {
            form.setValue("client_id", clientId);
            handleClientChange(clientId);
          }}
          onRefresh={() => refreshClients(true)}
          error={form.formState.errors.client_id?.message}
          label="Select Client"
        />

        {/* Personal Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-success" />
              <CardTitle>Personal Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                required
                error={form.formState.errors.first_name?.message}
                {...form.register("first_name")}
              />

              <Input
                label="Last Name"
                required
                error={form.formState.errors.last_name?.message}
                {...form.register("last_name")}
              />

              <Input
                label="Former Name"
                helperText="If applicable"
                {...form.register("former_name")}
              />

              <Input
                label="Social Security Number"
                placeholder="123456789"
                maxLength={9}
                required
                error={form.formState.errors.ssn?.message}
                helperText="Enter 9 digits only (no dashes)"
                {...form.register("ssn")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Employment History */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <CardTitle>Employment History</CardTitle>
                <Badge variant="outline">
                  {fields.length} Job{fields.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  onClick={() => {
                    if (fields.length >= 3) {
                      alert(
                        "Maximum of 3 employers can be added through this form. For more than 3 employers, please fill out the EE-3 form manually."
                      );
                      return;
                    }
                    const newIndex = fields.length;
                    append({
                      start_date: "",
                      end_date: "",
                      facility_name: "",
                      specific_location: "",
                      city: "",
                      state: "",
                      contractor: "",
                      position_title: "",
                      work_duties: "",
                      union_member: false,
                      dosimetry_worn: false,
                    });
                    // Auto-expand the new employment section
                    setCollapsedEmployment((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(newIndex);
                      return newSet;
                    });
                  }}
                  variant="outline"
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  disabled={fields.length >= 3}
                >
                  Add Employment
                </Button>

                {fields.length > 1 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      onClick={() => setCollapsedEmployment(new Set())}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Expand All
                    </Button>
                    <span className="text-muted-foreground">•</span>
                    <Button
                      type="button"
                      onClick={() =>
                        setCollapsedEmployment(
                          new Set(
                            Array.from({ length: fields.length }, (_, i) => i)
                          )
                        )
                      }
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Collapse All
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {fields.map((field, index) => {
              const isComplete = isEmploymentComplete(index);
              const isCollapsed = collapsedEmployment.has(index);
              const employment = watchedFields.employment_history?.[index];
              const previewData = showPreview[index] && employment;

              return (
                <Card
                  key={field.id}
                  variant="outlined"
                  className={`mb-6 last:mb-0 transition-all duration-200 ${
                    isComplete
                      ? "border-success/50 bg-success/5"
                      : "border-border"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                            isComplete
                              ? "bg-success text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <span className="text-sm font-medium">
                              #{index + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <CardTitle className="text-lg">
                              Employment #{index + 1}
                            </CardTitle>
                            {isComplete && (
                              <Badge variant="success" size="sm">
                                Complete
                              </Badge>
                            )}
                          </div>
                          {previewData && (
                            <div className="text-sm text-muted-foreground mt-1 space-y-1">
                              <div className="flex items-center space-x-4">
                                <span className="font-medium">
                                  {employment?.facility_name}
                                </span>
                                <span>{employment?.position_title}</span>
                              </div>
                              <div className="text-xs">
                                {employment?.city}, {employment?.state} •{" "}
                                {employment?.start_date} -{" "}
                                {employment?.end_date || "Present"}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isComplete && (
                          <Button
                            type="button"
                            onClick={() => toggleEmploymentPreview(index)}
                            variant="ghost"
                            size="sm"
                            icon={
                              showPreview[index] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )
                            }
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {showPreview[index] ? "Hide" : "Preview"}
                          </Button>
                        )}

                        <Button
                          type="button"
                          onClick={() => toggleEmploymentCollapse(index)}
                          variant="ghost"
                          size="sm"
                          icon={
                            isCollapsed ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isCollapsed ? "Expand" : "Collapse"}
                        </Button>

                        {fields.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => remove(index)}
                            variant="outline"
                            size="sm"
                            icon={<Minus className="h-4 w-4" />}
                            className="text-destructive hover:text-destructive border-destructive/20 hover:border-destructive"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {!isCollapsed && (
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                          type="date"
                          label="Start Date"
                          required
                          error={
                            employmentDateErrors[index]?.start ||
                            form.formState.errors.employment_history?.[index]
                              ?.start_date?.message
                          }
                          {...form.register(
                            `employment_history.${index}.start_date`
                          )}
                        />

                        <Input
                          type="date"
                          label="End Date"
                          helperText="Leave blank if current position"
                          error={
                            employmentDateErrors[index]?.end ||
                            form.formState.errors.employment_history?.[index]
                              ?.end_date?.message
                          }
                          {...form.register(
                            `employment_history.${index}.end_date`
                          )}
                        />

                        <Input
                          label="Facility Name"
                          required
                          error={
                            form.formState.errors.employment_history?.[index]
                              ?.facility_name?.message
                          }
                          {...form.register(
                            `employment_history.${index}.facility_name`
                          )}
                        />

                        <Input
                          label="Specific Location"
                          required
                          error={
                            form.formState.errors.employment_history?.[index]
                              ?.specific_location?.message
                          }
                          {...form.register(
                            `employment_history.${index}.specific_location`
                          )}
                        />

                        <Input
                          label="City"
                          required
                          error={
                            form.formState.errors.employment_history?.[index]
                              ?.city?.message
                          }
                          {...form.register(`employment_history.${index}.city`)}
                        />

                        <Input
                          label="State"
                          maxLength={2}
                          placeholder="NM"
                          required
                          helperText="Two letter state code"
                          error={
                            form.formState.errors.employment_history?.[index]
                              ?.state?.message
                          }
                          {...form.register(
                            `employment_history.${index}.state`
                          )}
                        />

                        <Input
                          label="Contractor"
                          required
                          error={
                            form.formState.errors.employment_history?.[index]
                              ?.contractor?.message
                          }
                          {...form.register(
                            `employment_history.${index}.contractor`
                          )}
                        />

                        <Input
                          label="Position Title"
                          required
                          error={
                            form.formState.errors.employment_history?.[index]
                              ?.position_title?.message
                          }
                          {...form.register(
                            `employment_history.${index}.position_title`
                          )}
                        />

                        <div className="md:col-span-2">
                          <Textarea
                            label="Work Duties"
                            required
                            rows={3}
                            showCharCount
                            maxLength={500}
                            helperText="Describe your primary job responsibilities"
                            error={
                              form.formState.errors.employment_history?.[index]
                                ?.work_duties?.message
                            }
                            {...form.register(
                              `employment_history.${index}.work_duties`
                            )}
                          />
                        </div>

                        <div className="md:col-span-2 space-y-4">
                          <h4 className="text-sm font-medium text-foreground mb-3">
                            Additional Information
                          </h4>
                          <div className="flex flex-col sm:flex-row gap-4">
                            <label className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer">
                              <input
                                type="checkbox"
                                {...form.register(
                                  `employment_history.${index}.union_member`
                                )}
                                className="rounded border-border text-primary focus:ring-ring"
                              />
                              <span className="text-sm font-medium">
                                Union Member
                              </span>
                            </label>

                            <label className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer">
                              <input
                                type="checkbox"
                                {...form.register(
                                  `employment_history.${index}.dosimetry_worn`
                                )}
                                className="rounded border-border text-primary focus:ring-ring"
                              />
                              <span className="text-sm font-medium">
                                Dosimetry Badge Worn
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {/* Action Buttons */}
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
            {loading ? "Generating..." : "Generate EE-3"}
          </Button>

          {attemptedSubmit && Object.keys(form.formState.errors).length > 0 && (
            <div className="flex items-center text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mr-2" />
              Please complete all required fields before generating the form.
            </div>
          )}
        </div>

        {formSubmitted && (
          <Card variant="elevated" className="bg-success/10 border-success/20">
            <CardContent>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    EE-3 Generated Successfully!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your EE-3 form has been downloaded and is ready for
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
