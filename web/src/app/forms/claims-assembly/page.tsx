"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  FileStack,
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Upload,
  Lock,
  User,
  Wand2,
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import {
  ClientSelector,
  parseClientName,
  type ClientSelectorClient,
} from "@/components/form/ClientSelector";
import {
  DiagnosisCategoriesSection,
  emptyDiagnosisCategories,
  emptyDiagnosisErrors,
  validateDiagnoses,
  type DiagnosisCategories,
  type DiagnosisErrors,
} from "@/components/form/DiagnosisCategories";
import { SignatureUpload } from "@/components/form/SignatureUpload";
import {
  EmploymentHistorySection,
  emptyEmploymentRecord,
  validateEmploymentDates,
  type EmploymentDateErrors,
  type EmploymentHistoryValues,
} from "@/components/form/EmploymentHistory";
import {
  phoneSchema,
  ssnSchema,
  stateSchema,
  zipSchema,
} from "@/lib/schemas/ee1";
import { employmentDraftSchema, employmentHistorySchema } from "@/lib/schemas/ee3";
import { getStateAbbreviation } from "@/lib/states";
import {
  CONDITIONS,
  COVER_SHEET_PATH,
  getCondition,
  requiredDocuments,
  claimFileName,
  type DocumentSlot,
} from "@/lib/claims/manifest";
import {
  assembleClaim,
  formatPageRange,
  AssemblyError,
  type AssemblyInput,
  type PageRange,
} from "@/lib/claims/assemble";
import { formatSSN, generateEE1, generateEE3 } from "@/lib/claims/generate";

const CLAIM_TYPES = [
  { value: "primary", label: "Primary" },
  { value: "consequential", label: "Consequential (CQ) — not supported yet", disabled: true },
  { value: "survivorship", label: "Survivorship — not supported yet", disabled: true },
  { value: "blind_file", label: "Blind-file — not supported yet", disabled: true },
];

/**
 * Everything the claim needs, gathered in one pass.
 *
 * Most of it only matters when this tool is the one building the EE-1 or the
 * EE-3 — an assembler who already has a signed paper copy shouldn't have to
 * re-key a phone number to staple it in — so the rules that belong to those
 * forms are applied conditionally rather than up front.
 */
const claimSchema = z
  .object({
    client_id: z.string().min(1, "Please select a client"),
    condition_id: z.string().min(1, "Select the claimed condition"),
    other_abbreviation: z.string().optional(),
    has_prior_claim: z.boolean(),
    generate_ee1: z.boolean(),
    generate_ee3: z.boolean(),

    first_name: z.string().min(1, "First name is required"),
    middle_initial: z
      .string()
      .max(1, "Middle initial must be 1 character")
      .optional(),
    last_name: z.string().min(1, "Last name is required"),
    former_name: z.string().optional(),
    ssn: z.string(),
    dob: z.string(),
    sex: z.enum(["Male", "Female"]),
    address_main: z.string(),
    address_city: z.string(),
    address_state: z.string(),
    address_zip: z.string(),
    phone: z.string(),

    employment_history: z.array(employmentDraftSchema),
  })
  .superRefine((data, ctx) => {
    const require = (
      schema: z.ZodType<string>,
      path: string,
      value: string
    ) => {
      const result = schema.safeParse(value);
      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          path: [path],
          message: result.error.issues[0]?.message ?? "Required",
        });
      }
    };

    if (data.condition_id === "other" && !data.other_abbreviation?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["other_abbreviation"],
        message: "Enter the abbreviation to use in the filename",
      });
    }

    // Both generators put the SSN on the form
    if (data.generate_ee1 || data.generate_ee3) {
      require(ssnSchema, "ssn", data.ssn);
    }

    if (data.generate_ee1) {
      require(z.string().min(1, "Date of birth is required"), "dob", data.dob);
      require(
        z.string().min(1, "Street address is required"),
        "address_main",
        data.address_main
      );
      require(z.string().min(1, "City is required"), "address_city", data.address_city);
      require(stateSchema, "address_state", data.address_state);
      require(zipSchema, "address_zip", data.address_zip);
      require(phoneSchema, "phone", data.phone);
    }

    // The EE-3 is only part of a first claim, and only when we're building it
    if (!data.has_prior_claim && data.generate_ee3) {
      const result = employmentHistorySchema.safeParse(data.employment_history);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            code: "custom",
            path: ["employment_history", ...issue.path],
            message: issue.message,
          });
        }
      }
    }
  });

type ClaimFormValues = z.infer<typeof claimSchema>;

export default function ClaimsAssemblyPage() {
  const { data: session } = useSession();
  const { clients, loading: clientsLoading, error: clientsError, refreshClients } =
    useClientContext();

  useEffect(() => {
    if (session?.user) {
      trackEvent.formViewed("claims-assembly", session.user.id);
    }
  }, [session]);

  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      condition_id: "",
      other_abbreviation: "",
      has_prior_claim: false,
      generate_ee1: true,
      generate_ee3: true,
      first_name: "",
      middle_initial: "",
      last_name: "",
      former_name: "",
      ssn: "",
      dob: "",
      sex: "Male",
      address_main: "",
      address_city: "",
      address_state: "",
      address_zip: "",
      phone: "",
      employment_history: [emptyEmploymentRecord()],
    },
  });

  const values = form.watch();

  // EE-1 detail
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [diagnosisCategories, setDiagnosisCategories] =
    useState<DiagnosisCategories>(emptyDiagnosisCategories());
  const [diagnosisErrors, setDiagnosisErrors] = useState<DiagnosisErrors>(
    emptyDiagnosisErrors()
  );

  // EE-3 detail
  const [collapsedEmployment, setCollapsedEmployment] = useState<Set<number>>(
    new Set()
  );
  const [employmentDateErrors, setEmploymentDateErrors] =
    useState<EmploymentDateErrors>({});

  // Uploaded file per slot id
  const [files, setFiles] = useState<Record<string, File>>({});
  /** Bumped to remount the file inputs when the uploads are cleared */
  const [uploadGeneration, setUploadGeneration] = useState(0);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    name: string;
    ranges: PageRange[];
    pageCount: number;
  } | null>(null);

  const condition = getCondition(values.condition_id);
  const selectedClient = clients.find((c) => c.id === values.client_id);

  const slots: DocumentSlot[] = useMemo(
    () =>
      condition
        ? requiredDocuments(condition.category, {
            needsEE3: !values.has_prior_claim,
          })
        : [],
    [condition, values.has_prior_claim]
  );

  /** A generated slot the assembler switched back to an upload. */
  const isGeneratorOff = (slot: DocumentSlot) =>
    (slot.generator === "ee1" && !values.generate_ee1) ||
    (slot.generator === "ee3" && !values.generate_ee3);

  const needsUpload = (slot: DocumentSlot) =>
    slot.source === "upload" || (slot.source === "generated" && isGeneratorOff(slot));

  const abbreviation =
    condition?.id === "other"
      ? values.other_abbreviation?.trim() ?? ""
      : condition?.abbreviation ?? "";

  const buildsEE1 = slots.some((s) => s.generator === "ee1" && !isGeneratorOff(s));
  const buildsEE3 = slots.some((s) => s.generator === "ee3" && !isGeneratorOff(s));

  const missing = slots.filter((s) => needsUpload(s) && s.required && !files[s.id]);

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  /**
   * Switching client starts a new claim.
   *
   * Nothing on the page belongs to two clients — condition, uploads, signature
   * and employment history are all claim-specific — so every field goes back to
   * its default and only the Airtable details for the new client are filled in.
   */
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    clearResult();

    form.reset({
      ...form.formState.defaultValues,
      client_id: clientId,
      employment_history: [emptyEmploymentRecord()],
    } as ClaimFormValues);

    setDiagnosisCategories(emptyDiagnosisCategories());
    setDiagnosisErrors(emptyDiagnosisErrors());
    setEmploymentDateErrors({});
    setCollapsedEmployment(new Set());
    setSignatureFile(null);
    setAttemptedSubmit(false);
    setFiles({});
    // The file inputs are uncontrolled, so clearing state isn't enough to drop
    // the filename the browser is still showing — remount them.
    setUploadGeneration((n) => n + 1);

    if (!client) return;

    const fields = client.fields as Record<string, string | undefined>;

    // parseClientName turns Airtable's "Last, First - 1234" into "First [M] Last"
    const fullName = parseClientName(fields.Name || "");
    const nameParts = fullName.split(" ");
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      let middleInitial = "";
      let lastName = "";

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

    const dob = fields["Date of Birth"];
    if (dob) {
      const date = new Date(dob);
      if (!isNaN(date.getTime())) {
        form.setValue("dob", date.toISOString().split("T")[0]);
      }
    }
  };

  /**
   * Start the EE-1's diagnosis off from the condition being claimed.
   *
   * The two describe the same illness, and a claim whose EE-1 doesn't name the
   * condition on the cover sheet comes straight back. Only seeds an untouched
   * selection — an assembler who has already ticked boxes keeps them.
   */
  const seedDiagnosis = (conditionId: string) => {
    const selected = getCondition(conditionId);
    if (!selected) return;

    setDiagnosisCategories((prev) => {
      if (Object.values(prev).some((category) => category.selected)) return prev;

      const next = emptyDiagnosisCategories();
      if (selected.category === "cancer") {
        next.cancer.selected = true;
      } else if (selected.id === "chronic_silicosis") {
        next.chronic_silicosis.selected = true;
      } else if (selected.id !== "other") {
        next.other.selected = true;
        next.other.diagnoses[0].text = selected.label;
      }
      return next;
    });
  };

  const selectFile = (slotId: string, file: File | undefined) => {
    clearResult();
    setFiles((prev) => {
      const next = { ...prev };
      if (file) next[slotId] = file;
      else delete next[slotId];
      return next;
    });
  };

  const scrollTo = (elementId: string) => {
    setTimeout(() => {
      document
        .getElementById(elementId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  /**
   * The EE-1 and EE-3 are generated here, the rest is supplied; everything is
   * merged in the browser so no claimant medical record is ever uploaded.
   */
  const handleAssemble = async () => {
    setAttemptedSubmit(true);
    setError(null);
    setResult(null);

    const isValid = await form.trigger();

    const dateErrors = buildsEE3
      ? validateEmploymentDates(form.getValues("employment_history"))
      : {};
    setEmploymentDateErrors(dateErrors);

    const diagnosisResult = buildsEE1
      ? validateDiagnoses(diagnosisCategories)
      : emptyDiagnosisErrors();
    setDiagnosisErrors(diagnosisResult);
    const diagnosisFailed = Object.values(diagnosisResult).flat().length > 0;

    if (!isValid || Object.keys(dateErrors).length > 0 || diagnosisFailed) {
      setError("Some claim details still need attention.");
      if (isValid && diagnosisFailed) scrollTo("diagnosis-section");
      return;
    }

    if (missing.length > 0) {
      setError(`Still needed: ${missing.map((s) => s.label).join(", ")}`);
      scrollTo("documents-section");
      return;
    }

    if (!condition || !selectedClient) return;

    setAssembling(true);

    try {
      const data = form.getValues();
      const inputs: AssemblyInput[] = [];

      for (const slot of slots) {
        if (slot.source === "template") {
          const response = await fetch(slot.templatePath ?? COVER_SHEET_PATH);
          // Templates sit behind the auth middleware, so an expired session
          // redirects to the login page — a 200 of HTML rather than a failure.
          // Check the type, or the merge fails later with an opaque parse error.
          const isPdf = response.headers.get("content-type")?.includes("pdf");
          if (!response.ok || !isPdf) {
            throw new AssemblyError(
              `Could not load the ${slot.label.toLowerCase()}. Your session may have expired — refresh the page and try again.`,
              slot.id
            );
          }
          inputs.push({
            slotId: slot.id,
            label: slot.label,
            bytes: await response.arrayBuffer(),
          });
          continue;
        }

        if (slot.source === "generated" && !isGeneratorOff(slot)) {
          const bytes =
            slot.generator === "ee1"
              ? await generateEE1(
                  selectedClient,
                  {
                    first_name: data.first_name,
                    middle_initial: data.middle_initial || "",
                    last_name: data.last_name,
                    ssn: formatSSN(data.ssn),
                    dob: data.dob,
                    sex: data.sex,
                    address_main: data.address_main,
                    address_city: data.address_city,
                    address_state: data.address_state,
                    address_zip: data.address_zip,
                    phone: data.phone,
                    diagnosis_categories: diagnosisCategories,
                  },
                  signatureFile,
                  slot.id
                )
              : await generateEE3(
                  selectedClient,
                  {
                    first_name: data.first_name,
                    middle_name: data.middle_initial || "",
                    last_name: data.last_name,
                    former_name: data.former_name,
                    ssn: formatSSN(data.ssn),
                    employment_history: data.employment_history,
                  },
                  slot.id
                );

          inputs.push({ slotId: slot.id, label: slot.label, bytes });
          continue;
        }

        const file = files[slot.id];
        if (!file) continue;
        inputs.push({
          slotId: slot.id,
          label: slot.label,
          bytes: await file.arrayBuffer(),
        });
      }

      const assembled = await assembleClaim(inputs);
      const name = claimFileName({
        conditionAbbr: abbreviation,
        firstName: data.first_name,
        lastName: data.last_name,
      });

      const blob = new Blob([assembled.pdfBytes as BlobPart], {
        type: "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (session?.user) {
        trackEvent.pdfGenerated("claims-assembly", session.user.id, data.client_id);
      }

      setResult({ name, ranges: assembled.ranges, pageCount: assembled.pageCount });
    } catch (err) {
      console.error("Error assembling claim:", err);
      setError(
        err instanceof AssemblyError || err instanceof Error
          ? err.message
          : "Failed to assemble the claim. Please try again."
      );
    } finally {
      setAssembling(false);
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
        <div className="text-center space-y-2">
          <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
          <h3 className="text-lg font-medium text-foreground">
            Error Loading Clients
          </h3>
          <p className="text-muted-foreground">{clientsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">📑 Claims Assembly</h1>
        <p className="text-muted-foreground">
          Pick the client and the condition, fill in the claim once, and this
          builds the EE-1 and EE-3, merges them with the documents you supply,
          and names the finished claim.
        </p>
      </div>

      {/* Client */}
      <ClientSelector
        clients={clients as unknown as ClientSelectorClient[]}
        value={values.client_id}
        onChange={(clientId) => {
          form.setValue("client_id", clientId);
          handleClientChange(clientId);
        }}
        onRefresh={() => refreshClients(true)}
        error={form.formState.errors.client_id?.message}
        label="Choose the client this claim is for"
      />

      {/* Claim setup */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <ClipboardList className="h-5 w-5 text-success" />
            <CardTitle>Claim Details</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            These determine which documents are required and what the finished
            claim is called
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Claim Type"
                required
                value="primary"
                onChange={() => undefined}
                options={CLAIM_TYPES}
                helperText="Consequential, survivorship and blind-file claims are still assembled by hand"
              />

              <Select
                label="Condition"
                required
                value={values.condition_id}
                onChange={(e) => {
                  form.setValue("condition_id", e.target.value);
                  seedDiagnosis(e.target.value);
                  clearResult();
                }}
                placeholder="Select the claimed condition"
                options={CONDITIONS.map((c) => ({ value: c.id, label: c.label }))}
                error={form.formState.errors.condition_id?.message}
                helperText="Sets the medical evidence the claim needs"
              />
            </div>

            {condition?.id === "other" && (
              <Input
                label="Condition Abbreviation"
                required
                placeholder="e.g. CKD"
                error={form.formState.errors.other_abbreviation?.message}
                helperText="Used in the claim filename"
                {...form.register("other_abbreviation")}
              />
            )}

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={values.has_prior_claim}
                onChange={(e) => {
                  form.setValue("has_prior_claim", e.target.checked);
                  clearResult();
                }}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">
                  A claim has already been submitted for this client
                </span>
                <span className="block text-muted-foreground">
                  By us or a previous AR. Removes the EE-3, which is only filed
                  on a client&apos;s first claim.
                </span>
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {condition && (
        <>
          {/* Claimant details — feeds both generated forms and the filename */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-success" />
                <CardTitle>Claimant Details</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Filled in from Airtable — correct anything that&apos;s out of
                date before assembling
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <h4 className="font-medium text-foreground">
                    👤 Personal Details
                  </h4>

                  <Input
                    label="First Name"
                    required
                    error={form.formState.errors.first_name?.message}
                    {...form.register("first_name")}
                  />

                  <Input
                    label="Middle Initial"
                    maxLength={1}
                    placeholder="Q"
                    error={form.formState.errors.middle_initial?.message}
                    helperText="Optional"
                    {...form.register("middle_initial")}
                  />

                  <Input
                    label="Last Name"
                    required
                    error={form.formState.errors.last_name?.message}
                    {...form.register("last_name")}
                  />

                  <Input
                    label="Former Name"
                    helperText="If applicable — EE-3 only"
                    {...form.register("former_name")}
                  />

                  <Input
                    label="Social Security Number"
                    placeholder="123456789"
                    maxLength={9}
                    required
                    error={form.formState.errors.ssn?.message}
                    helperText="Enter 9 digits only (dashes will be added automatically)"
                    {...form.register("ssn")}
                  />

                  <Input
                    label="Date of Birth"
                    type="date"
                    required
                    error={form.formState.errors.dob?.message}
                    {...form.register("dob")}
                  />

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Sex *
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

                <div className="space-y-6">
                  <h4 className="font-medium text-foreground">
                    🏠 Contact Information
                  </h4>

                  <Input
                    label="Street Address"
                    required
                    error={form.formState.errors.address_main?.message}
                    {...form.register("address_main")}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Input
                        label="City"
                        required
                        error={form.formState.errors.address_city?.message}
                        {...form.register("address_city")}
                      />
                    </div>
                    <Input
                      label="State"
                      required
                      maxLength={2}
                      placeholder="NM"
                      error={form.formState.errors.address_state?.message}
                      helperText="2-letter code"
                      {...form.register("address_state")}
                    />
                  </div>

                  <Input
                    label="ZIP Code"
                    required
                    maxLength={10}
                    placeholder="12345"
                    error={form.formState.errors.address_zip?.message}
                    {...form.register("address_zip")}
                  />

                  <Input
                    label="Phone Number"
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

          {/* EE-1 detail */}
          {buildsEE1 && (
            <>
              <DiagnosisCategoriesSection
                value={diagnosisCategories}
                onChange={(next) => {
                  setDiagnosisCategories(next);
                  clearResult();
                }}
                errors={diagnosisErrors}
                attemptedSubmit={attemptedSubmit}
              />
              <SignatureUpload
                file={signatureFile}
                onChange={(file) => {
                  setSignatureFile(file);
                  clearResult();
                }}
              />
            </>
          )}

          {/* EE-3 detail */}
          {buildsEE3 && (
            <EmploymentHistorySection
              form={form as unknown as UseFormReturn<EmploymentHistoryValues>}
              dateErrors={employmentDateErrors}
              collapsed={collapsedEmployment}
              onCollapsedChange={setCollapsedEmployment}
            />
          )}

          {/* Document slots */}
          <Card variant="elevated" id="documents-section">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileStack className="h-5 w-5 text-primary" />
                <CardTitle>Documents</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Listed in the order they&apos;ll appear in the assembled claim
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {slots.map((slot, index) => {
                  const file = files[slot.id];
                  const upload = needsUpload(slot);
                  const satisfied = !upload || !!file;

                  return (
                    <div
                      key={slot.id}
                      className="flex items-start gap-4 rounded-lg border border-border p-4"
                    >
                      <div
                        className={
                          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium " +
                          (satisfied
                            ? "bg-success/15 text-success"
                            : "bg-accent text-muted-foreground")
                        }
                      >
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {slot.label}
                          </span>
                          {slot.source === "template" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                              <CheckCircle className="h-3 w-3" />
                              Added automatically
                            </span>
                          )}
                          {slot.source === "generated" && !upload && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                              <Wand2 className="h-3 w-3" />
                              Built by this tool
                            </span>
                          )}
                          {upload && !slot.required && (
                            <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                              Optional
                            </span>
                          )}
                        </div>

                        {slot.hint && !upload && (
                          <p className="text-sm text-muted-foreground">
                            {slot.hint}
                          </p>
                        )}

                        {upload && (
                          <div className="space-y-2">
                            {slot.source === "upload" && slot.hint && (
                              <p className="text-sm text-muted-foreground">
                                {slot.hint}
                              </p>
                            )}
                            <input
                              key={`${slot.id}-${uploadGeneration}`}
                              type="file"
                              accept="application/pdf,.pdf"
                              onChange={(e) =>
                                selectFile(slot.id, e.target.files?.[0])
                              }
                              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent/80"
                            />
                            {file && (
                              <p className="flex items-center gap-1 text-sm text-success">
                                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </p>
                            )}
                          </div>
                        )}

                        {slot.source === "generated" && (
                          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={upload}
                              onChange={(e) => {
                                const field =
                                  slot.generator === "ee1"
                                    ? "generate_ee1"
                                    : "generate_ee3";
                                form.setValue(field, !e.target.checked);
                                if (!e.target.checked) selectFile(slot.id, undefined);
                                clearResult();
                              }}
                              className="h-4 w-4 rounded border-border"
                            />
                            Use a signed copy I already have instead
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
                <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                Only the EE-1 and EE-3 details are sent to our server, to fill
                out those forms. The medical records are merged in your browser
                and never uploaded.
              </p>
            </CardContent>
          </Card>

          {/* Assemble */}
          <div className="flex flex-col items-center gap-4">
            {missing.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Still needed: {missing.map((s) => s.label).join(", ")}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="button"
              onClick={handleAssemble}
              disabled={assembling}
              loading={assembling}
              size="xl"
              className="min-w-[220px] bg-purple-600 text-white shadow-lg shadow-purple-500/50 hover:bg-purple-700"
              icon={<Upload className="h-5 w-5" />}
            >
              {assembling ? "Assembling..." : "Assemble Claim"}
            </Button>
          </div>
        </>
      )}

      {/* Result */}
      {result && (
        <Card variant="elevated" className="bg-success/10 border-success/20">
          <CardContent>
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 flex-shrink-0 text-success" />
              <div className="ml-4 space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    Claim assembled
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {result.pageCount} pages, downloaded as{" "}
                    <span className="font-medium text-foreground">
                      {result.name}.pdf
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  {result.ranges.map((range) => (
                    <div key={range.slotId} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {range.label}
                      </span>
                      {" — page "}
                      {formatPageRange(range)}
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">
                  Leave it in your Claim Drafts folder until another team member
                  has checked it.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
