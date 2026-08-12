"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useClients } from "@/hooks/useClients";
import { trackEvent } from "@/lib/analytics";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  FileDown,
  AlertCircle,
  CheckCircle,
  FileText,
  User,
  Stethoscope,
  Briefcase,
  Paperclip,
  Plus,
  Trash2,
  Lock,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { buildLogEntry } from "@/lib/airtable-log";
import {
  ClientSelector,
  type ClientSelectorClient,
} from "@/components/form/ClientSelector";
import type { Client } from "@/lib/clientStorage";
import {
  ILO_PROFUSIONS,
  doctorsForCondition,
  findLetterTemplate,
  letterChargeDescription,
  letterConditions,
} from "@/lib/generators/letter-templates";
import { assembleClaim, formatPageRange } from "@/lib/claims/assemble";

const CONDITIONS = letterConditions();

const CURRENT_YEAR = new Date().getFullYear();

const doctorLetterSchema = z
  .object({
    client_id: z.string().min(1, "Please select a client"),
    condition_id: z.string().min(1, "Please choose what the letter is for"),
    doctor_id: z.string().min(1, "Please choose which doctor will sign"),
    first_mi: z.string().min(1, "First name and middle initial are required"),
    last_name: z.string().min(1, "Last name is required"),
    sex: z.enum(["male", "female"]),
    dob: z.string(),
    case_id: z.string(),
    position: z.string().min(1, "Job title is required"),
    facility: z.string().min(1, "Facility name is required"),
    facility_abbr: z.string().min(1, "Facility abbreviation is required"),
    employment_basis: z.enum(["recalled", "doe_verified"]),
    work_date_ranges: z
      .array(z.object({ from: z.string(), to: z.string() }))
      .min(1, "Add at least one stretch of employment"),
    // Chronic silicosis fields. Validated conditionally below so a future condition
    // with a different field set doesn't have to fill these in.
    dx_date: z.string(),
    profusion: z.string(),
    impression: z.string(),
    // Tyler's review found impressions that had drifted from the B-read, including
    // "perfusion" for "profusion". The letter quotes the B-read as a matter of record,
    // so the drafter confirms they checked it before the letter can be generated.
    impression_verified: z.boolean(),
  })
  // The letter identifies the claimant by case ID, falling back to date of birth.
  // With neither, the letterhead has nothing tying it to a claim.
  .refine((data) => data.case_id.trim() || data.dob.trim(), {
    message: "Enter a Case ID, or a date of birth if no case ID exists yet",
    path: ["case_id"],
  })
  .refine(
    (d) => d.condition_id !== "chronic-silicosis" || d.dx_date.trim().length > 0,
    { message: "B-read date is required", path: ["dx_date"] }
  )
  .refine(
    (d) => d.condition_id !== "chronic-silicosis" || d.profusion.trim().length > 0,
    { message: "Profusion is required", path: ["profusion"] }
  )
  .refine(
    (d) => d.condition_id !== "chronic-silicosis" || d.impression.trim().length > 0,
    { message: "Impression is required", path: ["impression"] }
  )
  .refine(
    (d) => d.condition_id !== "chronic-silicosis" || d.impression_verified,
    {
      message: "Confirm the impression matches the B-read word for word",
      path: ["impression_verified"],
    }
  )
  .superRefine((d, ctx) => {
    d.work_date_ranges.forEach((range, index) => {
      const validate = (value: string, key: "from" | "to", label: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
          ctx.addIssue({
            code: "custom",
            message: `${label} is required`,
            path: ["work_date_ranges", index, key],
          });
          return null;
        }
        if (d.employment_basis === "doe_verified") return trimmed;
        // Recalled employment is stated in years only, so a year is all we accept.
        if (!/^\d{4}$/.test(trimmed)) {
          ctx.addIssue({
            code: "custom",
            message: "Use a 4-digit year",
            path: ["work_date_ranges", index, key],
          });
          return null;
        }
        const year = Number(trimmed);
        if (year < 1940 || year > CURRENT_YEAR) {
          ctx.addIssue({
            code: "custom",
            message: `Year must be between 1940 and ${CURRENT_YEAR}`,
            path: ["work_date_ranges", index, key],
          });
          return null;
        }
        return trimmed;
      };

      const from = validate(range.from, "from", "Start");
      const to = validate(range.to, "to", "End");
      if (from && to && to < from) {
        ctx.addIssue({
          code: "custom",
          message: "End cannot be before start",
          path: ["work_date_ranges", index, "to"],
        });
      }
    });
  });

type DoctorLetterFormData = z.infer<typeof doctorLetterSchema>;

/**
 * Airtable stores names as "Last, First M. - SSN4". The letter needs the two halves
 * separately, unlike parseClientName which recombines them into "First Last".
 */
function splitClientName(rawName: string): { firstMI: string; lastName: string } {
  if (!rawName) return { firstMI: "", lastName: "" };
  const [last, rest] = rawName.split(",", 2);
  if (!rest) return { firstMI: "", lastName: rawName.trim() };
  return {
    firstMI: rest.split("-")[0]?.trim() || "",
    lastName: last.trim(),
  };
}

/** Today as YYYY-MM-DD in local time, for a date input's default. */
function todayInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

/** MM.DD.YY, the suffix convention used across the app's log and billing entries. */
function todayStamp(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}.${String(
    now.getDate()
  ).padStart(2, "0")}.${String(now.getFullYear()).slice(-2)}`;
}

export default function DoctorLetterForm() {
  const { data: session } = useSession();
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refreshClients,
  } = useClients();

  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);
  const [submittedCharge, setSubmittedCharge] = useState<string | null>(null);
  const [submittedPages, setSubmittedPages] = useState<{
    total: number;
    bRead: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set once a billing row lands and cleared once the whole flow completes, so it only
  // ever holds a charge whose log entry failed. Retrying then skips straight to the log
  // instead of charging twice — Airtable has no undo for a duplicate row. A deliberate
  // re-draft starts from null and bills normally.
  const [unloggedChargeFor, setUnloggedChargeFor] = useState<string | null>(null);
  // The B-read is merged onto the end of the letter. It stays in the browser and is never
  // posted to the server, the same split Claims Assembly uses for medical records.
  const [bReadFile, setBReadFile] = useState<File | null>(null);
  // The file input is uncontrolled, so clearing state alone leaves the old filename on
  // screen. Bumping this remounts it.
  const [uploadGeneration, setUploadGeneration] = useState(0);

  useEffect(() => {
    if (session?.user) {
      trackEvent.formViewed("doctor-letter", session.user.id);
    }
  }, [session]);

  const form = useForm<DoctorLetterFormData>({
    resolver: zodResolver(doctorLetterSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      condition_id: CONDITIONS.length === 1 ? CONDITIONS[0].id : "",
      doctor_id: "",
      first_mi: "",
      last_name: "",
      sex: "male",
      dob: "",
      case_id: "",
      position: "",
      facility: "Nevada Test Site",
      facility_abbr: "NTS",
      employment_basis: "recalled",
      work_date_ranges: [{ from: "", to: "" }],
      dx_date: "",
      profusion: "",
      impression: "",
      impression_verified: false,
    },
  });

  const conditionId = form.watch("condition_id");
  const doctorId = form.watch("doctor_id");
  const employmentBasis = form.watch("employment_basis");
  const impression = form.watch("impression");
  const profusion = form.watch("profusion");

  const {
    fields: workDateFields,
    append: appendWorkDate,
    remove: removeWorkDate,
    replace: replaceWorkDates,
  } = useFieldArray({ control: form.control, name: "work_date_ranges" });

  // Advisory only — these never block generation, because a B-read can legitimately word
  // things in ways a rule would flag. They exist to catch the two mistakes Tyler found.
  const impressionWarnings = useMemo(() => {
    const warnings: string[] = [];
    const text = impression?.trim() ?? "";
    if (!text) return warnings;
    if (/perfusion/i.test(text)) {
      warnings.push(
        'This says "perfusion". The B-read term is "profusion" — check the original before continuing.'
      );
    }
    if (profusion && !text.includes(profusion)) {
      warnings.push(
        `The profusion selected above (${profusion}) does not appear in this text. Confirm they agree.`
      );
    }
    return warnings;
  }, [impression, profusion]);

  const doctors = useMemo(
    () => (conditionId ? doctorsForCondition(conditionId) : []),
    [conditionId]
  );
  const template = useMemo(
    () => (conditionId && doctorId ? findLetterTemplate(conditionId, doctorId) : null),
    [conditionId, doctorId]
  );
  const charge = template ? letterChargeDescription(template) : null;

  // With only one doctor writing for the chosen condition there is nothing to pick,
  // so select them rather than making the user open a one-item dropdown.
  useEffect(() => {
    if (doctors.length === 1 && form.getValues("doctor_id") !== doctors[0].id) {
      form.setValue("doctor_id", doctors[0].id);
    } else if (
      doctors.length !== 1 &&
      !doctors.some((d) => d.id === form.getValues("doctor_id"))
    ) {
      form.setValue("doctor_id", "");
    }
  }, [doctors, form]);

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    // Keep the letter selection across the reset — it describes the job, not the client
    const keep = {
      condition_id: form.getValues("condition_id"),
      doctor_id: form.getValues("doctor_id"),
    };
    form.reset();
    form.setValue("client_id", clientId);
    form.setValue("condition_id", keep.condition_id);
    form.setValue("doctor_id", keep.doctor_id);

    const { firstMI, lastName } = splitClientName(client.fields.Name || "");
    form.setValue("first_mi", firstMI);
    form.setValue("last_name", lastName);
    form.setValue("case_id", client.fields["Case ID"] || "");
    form.setValue("dob", client.fields["Date of Birth"] || "");

    // A different client is a fresh draft — the previous letter's success card, billing
    // state and B-read must not carry over.
    setFormSubmitted(false);
    setSubmittedClient(null);
    setSubmittedCharge(null);
    setUnloggedChargeFor(null);
    setError(null);
    setBReadFile(null);
    setUploadGeneration((n) => n + 1);
  };

  const scrollTo = (id: string) => {
    setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSubmitClick = async () => {
    setAttemptedSubmit(true);
    const isFormValid = await form.trigger();

    if (!isFormValid) {
      const firstErrorField = document.querySelector(
        '[aria-invalid="true"]'
      ) as HTMLElement | null;
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
        firstErrorField.focus();
      }
      return;
    }

    // The B-read goes out with every letter, so a letter cannot be produced without it.
    if (!bReadFile) {
      setError("Still needed: B-Read");
      scrollTo("documents-section");
      return;
    }

    form.handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: DoctorLetterFormData) => {
    setLoading(true);
    setError(null);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }
      if (!bReadFile) {
        throw new Error("Still needed: B-Read");
      }

      const selectedTemplate = findLetterTemplate(data.condition_id, data.doctor_id);
      if (!selectedTemplate) {
        throw new Error(
          "There is no letter template for that condition and doctor yet."
        );
      }
      const chargeDescription = letterChargeDescription(selectedTemplate);

      const response = await fetch("/api/generate/doctor-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          form_data: data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Failed to generate letter"
        );
      }

      const letterBytes = await response.arrayBuffer();
      const filename =
        /filename="([^"]+)"/.exec(
          response.headers.get("Content-Disposition") ?? ""
        )?.[1] ?? `${selectedTemplate.filenamePrefix}_${todayStamp()}.pdf`;

      // Merged in the browser so the B-read never reaches the server. Done before the
      // Airtable writes: a merge failure should leave no charge behind.
      const assembled = await assembleClaim([
        { slotId: "letter", label: "Letter", bytes: letterBytes },
        {
          slotId: "b-read",
          label: "B-Read",
          bytes: await bReadFile.arrayBuffer(),
        },
      ]);

      const blob = new Blob([assembled.pdfBytes as BlobPart], {
        type: "application/pdf",
      });
      const stamp = todayStamp();

      // Airtable is written before the download, the way the invoice tool does it, so a
      // letter never leaves the office without its charge recorded.
      if (unloggedChargeFor !== selectedClient.id) {
        const billingResponse = await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: selectedClient.id,
            description: `${chargeDescription} ${stamp}`,
          }),
        });

        if (!billingResponse.ok) {
          const errorData = await billingResponse.json().catch(() => ({}));
          throw new Error(
            `${
              errorData.details || errorData.error || "Failed to create billing record"
            }. Nothing was written and the letter was NOT downloaded — safe to try again.`
          );
        }
        setUnloggedChargeFor(selectedClient.id);
      }

      const clientResponse = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: selectedClient.id,
          fields: { "Last update": todayInputValue() },
          prepend: {
            Log: buildLogEntry(chargeDescription, session?.user?.email),
          },
        }),
      });

      if (!clientResponse.ok) {
        const errorData = await clientResponse.json().catch(() => ({}));
        throw new Error(
          `${
            errorData.details || errorData.error || "Failed to update the client record"
          }. The billing record WAS created — press Generate again to retry just the log entry.`
        );
      }

      // Both writes landed, so the charge is no longer orphaned.
      setUnloggedChargeFor(null);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // The generator already sanitized the filename; reuse it rather than rebuilding
      // a second version here that could drift from it.
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (session?.user) {
        trackEvent.pdfGenerated("doctor-letter", session.user.id, data.client_id);
      }

      setFormSubmitted(true);
      setSubmittedClient(selectedClient);
      setSubmittedCharge(`${chargeDescription} ${stamp}`);
      const bReadRange = assembled.ranges.find((r) => r.slotId === "b-read");
      setSubmittedPages({
        total: assembled.pageCount,
        bRead: bReadRange ? formatPageRange(bReadRange) : "",
      });

      try {
        await refreshClients(true);
      } catch (refreshError) {
        console.error("Failed to refresh client cache:", refreshError);
      }
    } catch (err) {
      console.error("Error generating doctor letter:", err);
      setError(err instanceof Error ? err.message : "Failed to generate letter");
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

  const err = (field: keyof DoctorLetterFormData) =>
    attemptedSubmit ? form.formState.errors[field]?.message : undefined;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">
          🩺 Doctor Letter Drafting
        </h1>
        <p className="text-muted-foreground">
          Draft a causation letter for a physician to review and sign.
        </p>
      </div>

      <form className="space-y-8">
        <ClientSelector
          // Client leaves Name optional; the selector requires it. Every record in
          // the base has one, so the narrowing is safe.
          clients={clients as ClientSelectorClient[]}
          value={form.watch("client_id")}
          onChange={(clientId) => {
            form.setValue("client_id", clientId);
            handleClientChange(clientId);
          }}
          onRefresh={() => refreshClients(true)}
          error={err("client_id")}
          label="Choose which client this letter is for"
        />

        {/* Which letter */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Letter</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              What the letter establishes causation for, and who will sign it.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Drafting For"
                required
                placeholder="Select a condition"
                error={err("condition_id")}
                helperText="The condition the letter addresses"
                options={CONDITIONS.map((c) => ({ value: c.id, label: c.label }))}
                {...form.register("condition_id")}
              />
              <Select
                label="Signing Doctor"
                required
                placeholder={
                  conditionId ? "Select a doctor" : "Choose a condition first"
                }
                disabled={!conditionId}
                error={err("doctor_id")}
                helperText="Physicians who write this letter"
                options={doctors.map((d) => ({ value: d.id, label: d.label }))}
                {...form.register("doctor_id")}
              />
            </div>

            {conditionId && doctorId && !template && (
              <p className="mt-4 text-sm text-destructive">
                There is no letter template for that combination yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Employee identification */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-success" />
              <CardTitle>Employee</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              The letter identifies the claimant by Case ID. If no case ID has been
              assigned yet, the date of birth is used instead.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="First Name & Middle Initial"
                  required
                  error={err("first_mi")}
                  helperText="As it should read in the letter, e.g. John A."
                  {...form.register("first_mi")}
                />
                <Input
                  label="Last Name"
                  required
                  error={err("last_name")}
                  {...form.register("last_name")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Case ID"
                  error={err("case_id")}
                  helperText="Leave blank if none has been assigned yet"
                  {...form.register("case_id")}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  error={err("dob")}
                  helperText="Printed only when there is no Case ID"
                  {...form.register("dob")}
                />
              </div>

              <div>
                <span className="block text-sm font-medium mb-2 text-foreground">
                  Sex
                  <span className="text-red-500 ml-1" aria-label="required">
                    *
                  </span>
                </span>
                <p className="text-sm text-muted-foreground mb-3">
                  Sets Mr./Ms. and his/her throughout the letter.
                </p>
                <div className="flex gap-3">
                  {(
                    [
                      { value: "male", label: "Male — Mr. / his" },
                      { value: "female", label: "Female — Ms. / her" },
                    ] as const
                  ).map((opt) => {
                    const selected = form.watch("sex") === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          value={opt.value}
                          checked={selected}
                          onChange={() =>
                            form.setValue("sex", opt.value, {
                              shouldValidate: true,
                            })
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-foreground">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment and exposure */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle>Employment & Exposure</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Where and when the claimant worked, from the case file.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Job Title"
                  required
                  error={err("position")}
                  helperText='Just the title — "a" or "an" is added automatically'
                  placeholder="electrician"
                  {...form.register("position")}
                />
                <Input
                  label="Facility"
                  required
                  error={err("facility")}
                  helperText="Full name of the DOE facility"
                  {...form.register("facility")}
                />
              </div>

              <Input
                label="Facility Abbreviation"
                required
                error={err("facility_abbr")}
                helperText="Used throughout the rest of the letter"
                {...form.register("facility_abbr")}
              />

              <div>
                <span className="block text-sm font-medium mb-2 text-foreground">
                  Where the Dates Come From
                  <span className="text-red-500 ml-1" aria-label="required">
                    *
                  </span>
                </span>
                <p className="text-sm text-muted-foreground mb-3">
                  This changes the sentence in the letter, and how precisely the dates
                  are stated.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(
                    [
                      {
                        value: "recalled",
                        label: "Recalled by the patient",
                        detail: "Years only. The usual case.",
                      },
                      {
                        value: "doe_verified",
                        label: "DOE verified",
                        detail:
                          "Exact dates. Only when DOE has verified them on a prior or active case.",
                      },
                    ] as const
                  ).map((opt) => {
                    const selected = employmentBasis === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          value={opt.value}
                          checked={selected}
                          onChange={() => {
                            form.setValue("employment_basis", opt.value, {
                              shouldValidate: attemptedSubmit,
                            });
                            // The two modes hold incompatible values. A year left behind
                            // in a date input reads as empty but is still "1982" in the
                            // form, which would reach the generator and fail there.
                            replaceWorkDates([{ from: "", to: "" }]);
                          }}
                          className="mt-1 h-4 w-4 accent-primary"
                        />
                        <span>
                          <span className="block text-foreground">{opt.label}</span>
                          <span className="block text-sm text-muted-foreground">
                            {opt.detail}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  The letter will read:{" "}
                  <span className="text-foreground">
                    {employmentBasis === "doe_verified"
                      ? "“Described employment is DOE verified to have occurred from …”"
                      : "“Described employment is recalled by the patient to have occurred from approximately …”"}
                  </span>
                </p>
              </div>

              <div>
                <span className="block text-sm font-medium mb-2 text-foreground">
                  Employment Dates
                  <span className="text-red-500 ml-1" aria-label="required">
                    *
                  </span>
                </span>
                <p className="text-sm text-muted-foreground mb-3">
                  {employmentBasis === "doe_verified"
                    ? "Exactly as DOE verified them."
                    : "Years only — a month and day imply a precision recall doesn’t have."}{" "}
                  Add a row for each separate stretch; they are joined into one list.
                </p>

                <div className="space-y-3">
                  {workDateFields.map((field, index) => {
                    const rangeErrors = attemptedSubmit
                      ? form.formState.errors.work_date_ranges?.[index]
                      : undefined;
                    return (
                      <div key={field.id} className="flex items-start gap-3">
                        <Input
                          label={index === 0 ? "From" : undefined}
                          type={
                            employmentBasis === "doe_verified" ? "date" : "text"
                          }
                          inputMode={
                            employmentBasis === "doe_verified"
                              ? undefined
                              : "numeric"
                          }
                          maxLength={
                            employmentBasis === "doe_verified" ? undefined : 4
                          }
                          placeholder={
                            employmentBasis === "doe_verified" ? undefined : "1982"
                          }
                          error={rangeErrors?.from?.message}
                          {...form.register(`work_date_ranges.${index}.from`)}
                        />
                        <Input
                          label={index === 0 ? "To" : undefined}
                          type={
                            employmentBasis === "doe_verified" ? "date" : "text"
                          }
                          inputMode={
                            employmentBasis === "doe_verified"
                              ? undefined
                              : "numeric"
                          }
                          maxLength={
                            employmentBasis === "doe_verified" ? undefined : 4
                          }
                          placeholder={
                            employmentBasis === "doe_verified" ? undefined : "1986"
                          }
                          error={rangeErrors?.to?.message}
                          {...form.register(`work_date_ranges.${index}.to`)}
                        />
                        <button
                          type="button"
                          onClick={() => removeWorkDate(index)}
                          disabled={workDateFields.length === 1}
                          aria-label={`Remove employment range ${index + 1}`}
                          className={`rounded-md p-2 transition-colors ${
                            index === 0 ? "mt-7" : "mt-1"
                          } ${
                            workDateFields.length === 1
                              ? "cursor-not-allowed text-muted-foreground/40"
                              : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => appendWorkDate({ from: "", to: "" })}
                  icon={<Plus className="h-4 w-4" />}
                >
                  Add another stretch
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Condition-specific findings. Each condition gets its own card here. */}
        {conditionId === "chronic-silicosis" && (
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                <CardTitle>B-Read Findings</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Straight off the B-read returned by the radiologist.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="B-Read Date"
                    type="date"
                    required
                    error={err("dx_date")}
                    helperText="Also used as the date of diagnosis"
                    {...form.register("dx_date")}
                  />
                  <Select
                    label="Profusion"
                    required
                    placeholder="Select the ILO profusion"
                    error={err("profusion")}
                    helperText="As graded on the B-read"
                    options={ILO_PROFUSIONS.map((p) => ({ value: p, label: p }))}
                    {...form.register("profusion")}
                  />
                </div>

                <div>
                  <Textarea
                    label="Impression"
                    required
                    rows={4}
                    error={err("impression")}
                    helperText="Quoted verbatim in the letter. Omit the surrounding quotation marks — the letter supplies them."
                    placeholder="Small rounded opacities, profusion 1/0, primarily in the upper lung zones"
                    {...form.register("impression")}
                  />

                  {impressionWarnings.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {impressionWarnings.map((warning) => (
                        <div
                          key={warning}
                          className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
                          <p className="text-sm text-foreground">{warning}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="mt-4 flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-primary"
                      {...form.register("impression_verified")}
                    />
                    <span className="text-sm text-foreground">
                      I compared this impression against the B-read word for word.
                      <span className="text-red-500 ml-1" aria-label="required">
                        *
                      </span>
                    </span>
                  </label>
                  {err("impression_verified") && (
                    <p className="mt-1 text-sm text-destructive">
                      {err("impression_verified")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents merged onto the end of the letter */}
        <Card variant="elevated" id="documents-section">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Paperclip className="h-5 w-5 text-primary" />
              <CardTitle>Documents</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Attached to the back of the finished letter.
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    bReadFile
                      ? "bg-success text-white"
                      : "bg-accent text-foreground"
                  }`}
                >
                  1
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">B-Read</span>
                    <span className="rounded bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                      Appended to the letter
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The same B-read the findings above were taken from.
                  </p>
                  <input
                    key={`b-read-${uploadGeneration}`}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => {
                      setBReadFile(e.target.files?.[0] ?? null);
                      setError(null);
                    }}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent/80"
                  />
                  {bReadFile && (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <CheckCircle className="h-4 w-4" />
                      <span className="truncate">{bReadFile.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>
                The B-read is merged into the letter here in your browser. It is never
                uploaded to the server.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col gap-4 items-center">
          {charge && (
            <p className="text-sm text-muted-foreground text-center">
              Generating also logs{" "}
              <span className="font-medium text-foreground">{charge}</span> on the
              client and adds a matching billing record.
            </p>
          )}

          {attemptedSubmit && !form.formState.isValid && (
            <div className="text-sm text-muted-foreground">
              Please correct the errors above to continue
            </div>
          )}

          {!bReadFile && (
            <div className="text-sm text-muted-foreground">
              Still needed: <span className="text-foreground">B-Read</span>
            </div>
          )}

          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={loading || !template}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/50 min-w-[200px]"
            size="xl"
            loading={loading}
            icon={<FileDown className="h-5 w-5" />}
          >
            {loading ? "Generating Letter..." : "Generate Letter"}
          </Button>

          {error && (
            <Card
              variant="elevated"
              className="bg-destructive/10 border-destructive/20 w-full"
            >
              <CardContent>
                <div className="flex items-start">
                  <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                  <p className="ml-4 text-sm text-foreground">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {formSubmitted && submittedClient && (
          <Card variant="elevated" className="bg-success/10 border-success/20">
            <CardContent>
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Letter drafted and downloaded
                  </h3>
                  {submittedPages && (
                    <p className="text-sm text-muted-foreground mb-1">
                      {submittedPages.total} pages, signed, with the B-read on{" "}
                      {submittedPages.bRead.includes("–") ? "pages" : "page"}{" "}
                      {submittedPages.bRead}. Read it through before it goes out.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Added to {submittedClient.fields.Name}&apos;s log and billing:{" "}
                    <span className="font-medium text-foreground">
                      {submittedCharge}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>

      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          The letter downloads finished: dated today, signed by the doctor, with the
          B-read already on the end. Nothing to convert or attach afterwards.
        </p>
      </div>
    </div>
  );
}
