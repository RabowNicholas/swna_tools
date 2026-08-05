"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useClients } from "@/hooks/useClients";
import { trackEvent } from "@/lib/analytics";
import { useForm } from "react-hook-form";
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
  LETTER_TEMPLATES,
  letterChargeDescription,
} from "@/lib/generators/docx/letter-templates";

const TEMPLATE = LETTER_TEMPLATES["cs-letter"];

const csLetterSchema = z
  .object({
    client_id: z.string().min(1, "Please select a client"),
    first_mi: z.string().min(1, "First name and middle initial are required"),
    last_name: z.string().min(1, "Last name is required"),
    sex: z.enum(["male", "female"]),
    dob: z.string(),
    case_id: z.string(),
    letter_date: z.string().min(1, "Letter date is required"),
    position: z.string().min(1, "Job title is required"),
    facility: z.string().min(1, "Facility name is required"),
    facility_abbr: z.string().min(1, "Facility abbreviation is required"),
    work_dates: z.string().min(1, "Employment dates are required"),
    dx_date: z.string().min(1, "B-read date is required"),
    profusion: z.string().min(1, "Profusion is required"),
    impression: z.string().min(1, "Impression is required"),
  })
  // The letter identifies the claimant by case ID, falling back to date of birth.
  // With neither, the letterhead has nothing tying it to a claim.
  .refine((data) => data.case_id.trim() || data.dob.trim(), {
    message: "Enter a Case ID, or a date of birth if no case ID exists yet",
    path: ["case_id"],
  });

type CSLetterFormData = z.infer<typeof csLetterSchema>;

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

const CHARGE = letterChargeDescription(TEMPLATE);

export default function CSLetterForm() {
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
  const [error, setError] = useState<string | null>(null);
  // Set once a billing row lands and cleared once the whole flow completes, so it only
  // ever holds a charge whose log entry failed. Retrying then skips straight to the log
  // instead of charging twice — Airtable has no undo for a duplicate row. A deliberate
  // re-draft starts from null and bills normally.
  const [unloggedChargeFor, setUnloggedChargeFor] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      trackEvent.formViewed("cs-letter", session.user.id);
    }
  }, [session]);

  const form = useForm<CSLetterFormData>({
    resolver: zodResolver(csLetterSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      first_mi: "",
      last_name: "",
      sex: "male",
      dob: "",
      case_id: "",
      letter_date: todayInputValue(),
      position: "",
      facility: "Nevada Test Site",
      facility_abbr: "NTS",
      work_dates: "",
      dx_date: "",
      profusion: "",
      impression: "",
    },
  });

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    form.reset();
    form.setValue("client_id", clientId);

    const { firstMI, lastName } = splitClientName(client.fields.Name || "");
    form.setValue("first_mi", firstMI);
    form.setValue("last_name", lastName);
    form.setValue("case_id", client.fields["Case ID"] || "");
    form.setValue("dob", client.fields["Date of Birth"] || "");

    // A different client is a fresh draft — the previous letter's success card and
    // billing state must not carry over.
    setFormSubmitted(false);
    setSubmittedClient(null);
    setUnloggedChargeFor(null);
    setError(null);
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

    form.handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: CSLetterFormData) => {
    setLoading(true);
    setError(null);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const response = await fetch("/api/generate/cs-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_data: data }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || "Failed to generate letter");
      }

      const blob = await response.blob();
      const stamp = todayStamp();

      // Airtable is written before the download, the way the invoice tool does it, so a
      // letter never leaves the office without its charge recorded.
      if (unloggedChargeFor !== selectedClient.id) {
        const billingResponse = await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: selectedClient.id,
            description: `${CHARGE} ${stamp}`,
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
          prepend: { Log: buildLogEntry(CHARGE, session?.user?.email) },
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
      a.download =
        /filename="([^"]+)"/.exec(
          response.headers.get("Content-Disposition") ?? ""
        )?.[1] ?? `${TEMPLATE.filenamePrefix}_${stamp}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (session?.user) {
        trackEvent.pdfGenerated("cs-letter", session.user.id, data.client_id);
      }

      setFormSubmitted(true);
      setSubmittedClient(selectedClient);

      try {
        await refreshClients(true);
      } catch (refreshError) {
        console.error("Failed to refresh client cache:", refreshError);
      }
    } catch (err) {
      console.error("Error generating CS letter:", err);
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

  const err = (field: keyof CSLetterFormData) =>
    attemptedSubmit ? form.formState.errors[field]?.message : undefined;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">
          🫁 Chronic Silicosis Letter
        </h1>
        <p className="text-muted-foreground">
          Draft the chronic silicosis causation letter for {TEMPLATE.signedBy} to
          sign, from the B-read returned on the client&apos;s chest X-ray.
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
                  label="Employment Dates"
                  required
                  error={err("work_dates")}
                  helperText="Reads after “occurred from approximately”"
                  placeholder="June 1974 to March 1988"
                  {...form.register("work_dates")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Facility"
                  required
                  error={err("facility")}
                  helperText="Full name of the DOE facility"
                  {...form.register("facility")}
                />
                <Input
                  label="Facility Abbreviation"
                  required
                  error={err("facility_abbr")}
                  helperText="Used throughout the rest of the letter"
                  {...form.register("facility_abbr")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* B-read findings */}
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

              <Textarea
                label="Impression"
                required
                rows={4}
                error={err("impression")}
                helperText="Quoted verbatim in the letter. Omit the surrounding quotation marks — the template supplies them."
                placeholder="Small rounded opacities, profusion 1/0, primarily in the upper lung zones"
                {...form.register("impression")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col gap-4 items-center">
          <p className="text-sm text-muted-foreground text-center">
            Generating also logs <span className="font-medium">{CHARGE}</span> on the
            client and adds a matching billing record.
          </p>

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
            {loading ? "Generating Letter..." : "Generate CS Letter"}
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
                  <p className="text-sm text-muted-foreground">
                    Send it to {TEMPLATE.signedBy} for signature. Added to{" "}
                    {submittedClient.fields.Name}&apos;s log and billing:{" "}
                    <span className="font-medium text-foreground">
                      {CHARGE} {todayStamp()}
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
          The letter downloads as a Word document so it can be reviewed and adjusted
          before it goes out for signature.
        </p>
      </div>
    </div>
  );
}
