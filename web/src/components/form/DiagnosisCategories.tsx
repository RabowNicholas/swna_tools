"use client";

/**
 * The EE-1's "diagnosed conditions being claimed as work-related" block.
 *
 * Lives here rather than in the EE-1 page because Claims Assembly builds an
 * EE-1 too, and the categories, their validation rules and the shape the
 * generator expects have to stay identical between the two.
 */

import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlertCircle, Heart } from "lucide-react";

/** One free-text diagnosis plus the date it was made. */
export interface DiagnosisEntry {
  text: string;
  date: Date | null;
}

export interface DiagnosisCategories {
  cancer: {
    selected: boolean;
    diagnoses: [DiagnosisEntry, DiagnosisEntry, DiagnosisEntry];
  };
  beryllium_sensitivity: {
    selected: boolean;
    date: Date | null;
  };
  chronic_beryllium_disease: {
    selected: boolean;
    date: Date | null;
  };
  chronic_silicosis: {
    selected: boolean;
    date: Date | null;
  };
  other: {
    selected: boolean;
    diagnoses: [DiagnosisEntry, DiagnosisEntry, DiagnosisEntry];
  };
}

/** Per-category messages, plus a "general" bucket for whole-section problems. */
export type DiagnosisErrors = Record<string, string[]>;

/** The categories a fresh form starts with — also what a client switch resets to. */
export const emptyDiagnosisCategories = (): DiagnosisCategories => ({
  cancer: {
    selected: false,
    diagnoses: [
      { text: "", date: null },
      { text: "", date: null },
      { text: "", date: null },
    ],
  },
  beryllium_sensitivity: { selected: false, date: null },
  chronic_beryllium_disease: { selected: false, date: null },
  chronic_silicosis: { selected: false, date: null },
  other: {
    selected: false,
    diagnoses: [
      { text: "", date: null },
      { text: "", date: null },
      { text: "", date: null },
    ],
  },
});

export const emptyDiagnosisErrors = (): DiagnosisErrors => ({
  cancer: [],
  beryllium_sensitivity: [],
  chronic_beryllium_disease: [],
  chronic_silicosis: [],
  other: [],
  general: [],
});

/** A date that's neither in the future nor impossibly old. */
const validateDate = (date: Date | null, label: string): string | null => {
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date("1900-01-01");
  const dateToCheck = new Date(date);
  dateToCheck.setHours(0, 0, 0, 0);

  if (dateToCheck > today) {
    return `${label} cannot be in the future.`;
  }

  if (dateToCheck < minDate) {
    return `${label} must be after January 1, 1900.`;
  }

  return null;
};

/**
 * Every problem with the current selection, keyed by category.
 *
 * Pure — the caller owns the error state and decides when to show it.
 */
export function validateDiagnoses(
  categories: DiagnosisCategories
): DiagnosisErrors {
  const errors = emptyDiagnosisErrors();
  let hasValidDiagnosis = false;

  // Check Cancer
  if (categories.cancer.selected) {
    let cancerHasValid = false;
    categories.cancer.diagnoses.forEach((diagnosis, i) => {
      const label = String.fromCharCode(65 + i);
      if (diagnosis.text) {
        if (diagnosis.date) {
          const dateError = validateDate(
            diagnosis.date,
            `Cancer diagnosis ${label}`
          );
          if (dateError) {
            errors.cancer.push(dateError);
          } else {
            cancerHasValid = true;
          }
        } else {
          errors.cancer.push(`Cancer diagnosis ${label} requires a date.`);
        }
      }
    });
    if (cancerHasValid) hasValidDiagnosis = true;
    else if (!categories.cancer.diagnoses.some((d) => d.text)) {
      errors.cancer.push(
        "At least one specific cancer diagnosis is required when Cancer is selected."
      );
    }
  }

  // Check individual conditions
  const conditions = [
    { key: "beryllium_sensitivity", label: "Beryllium Sensitivity" },
    { key: "chronic_beryllium_disease", label: "Chronic Beryllium Disease" },
    { key: "chronic_silicosis", label: "Chronic Silicosis" },
  ] as const;

  conditions.forEach(({ key, label }) => {
    if (categories[key].selected) {
      if (categories[key].date) {
        const dateError = validateDate(categories[key].date, label);
        if (dateError) {
          errors[key].push(dateError);
        } else {
          hasValidDiagnosis = true;
        }
      } else {
        errors[key].push(`${label} date of diagnosis is required.`);
      }
    }
  });

  // Check Other conditions
  if (categories.other.selected) {
    let otherHasValid = false;
    categories.other.diagnoses.forEach((diagnosis, i) => {
      const label = String.fromCharCode(65 + i);
      if (diagnosis.text) {
        if (diagnosis.date) {
          const dateError = validateDate(
            diagnosis.date,
            `Other condition ${label}`
          );
          if (dateError) {
            errors.other.push(dateError);
          } else {
            otherHasValid = true;
          }
        } else {
          errors.other.push(`Other condition ${label} requires a date.`);
        }
      }
    });
    if (otherHasValid) hasValidDiagnosis = true;
    else if (!categories.other.diagnoses.some((d) => d.text)) {
      errors.other.push(
        "At least one specific other condition is required when Other is selected."
      );
    }
  }

  if (!hasValidDiagnosis) {
    errors.general.push(
      "At least one diagnosis category with date is required."
    );
  }

  return errors;
}

/** Whether anything is claimed at all — drives progress and submit gating. */
export function hasAnyValidDiagnosis(categories: DiagnosisCategories): boolean {
  return Object.values(categories).some((category) => {
    if ("selected" in category && category.selected) {
      if ("date" in category) return !!category.date;
      if ("diagnoses" in category) {
        return category.diagnoses.some(
          (d: DiagnosisEntry) => d.text && d.date
        );
      }
    }
    return false;
  });
}

export interface DiagnosisCategoriesSectionProps {
  value: DiagnosisCategories;
  onChange: (next: DiagnosisCategories) => void;
  /** Produced by validateDiagnoses(); only rendered once attemptedSubmit is true */
  errors: DiagnosisErrors;
  attemptedSubmit: boolean;
  /** Anchor the submit handler scrolls to when validation fails */
  id?: string;
}

export function DiagnosisCategoriesSection({
  value,
  onChange,
  errors,
  attemptedSubmit,
  id = "diagnosis-section",
}: DiagnosisCategoriesSectionProps) {
  const updateCategory = (
    category: keyof DiagnosisCategories,
    updates: Partial<DiagnosisCategories[keyof DiagnosisCategories]>
  ) => {
    onChange({
      ...value,
      [category]: {
        ...value[category],
        ...updates,
      },
    });
  };

  const updateEntry = (
    category: "cancer" | "other",
    index: number,
    field: "text" | "date",
    entryValue: string | Date | null
  ) => {
    onChange({
      ...value,
      [category]: {
        ...value[category],
        diagnoses: value[category].diagnoses.map((diagnosis, i) =>
          i === index ? { ...diagnosis, [field]: entryValue } : diagnosis
        ) as [DiagnosisEntry, DiagnosisEntry, DiagnosisEntry],
      },
    });
  };

  const errorCount = Object.values(errors).flat().length;

  return (
    <Card variant="elevated" id={id}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-error" />
            <CardTitle>Client&apos;s Medical Diagnoses</CardTitle>
          </div>
          {attemptedSubmit && errorCount > 0 && (
            <Badge variant="error" size="sm">
              {errorCount} Error{errorCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Client&apos;s Diagnosed Condition(s) Being Claimed as Work-Related
        </p>
        {attemptedSubmit && errors.general.length > 0 && (
          <div
            className="mt-3 p-3 border-2 rounded-lg"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--destructive) 15%, transparent)",
              borderColor: "var(--destructive)",
            }}
          >
            {errors.general.map((error, i) => (
              <div
                key={i}
                className="flex items-center text-sm text-destructive font-medium"
              >
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cancer Section */}
        <Card
          variant="outlined"
          className={
            attemptedSubmit && errors.cancer.length > 0
              ? "border-destructive bg-destructive/10"
              : value.cancer.selected
              ? "border-warning/50 bg-warning/5"
              : ""
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value.cancer.selected}
                    onChange={(e) =>
                      updateCategory("cancer", { selected: e.target.checked })
                    }
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <CardTitle className="text-lg">
                    🎗️ Cancer (List Specific Diagnosis Below)
                  </CardTitle>
                </label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Check this box if the client has been diagnosed with any cancer
            </p>
          </CardHeader>

          {value.cancer.selected && (
            <CardContent className="pt-0">
              <p className="font-medium mb-4">
                Enter up to 3 specific cancer diagnoses for this client:
              </p>
              <div className="space-y-4">
                {value.cancer.diagnoses.map((diagnosis, i) => (
                  <div key={i} className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={`Cancer diagnosis ${String.fromCharCode(65 + i)}`}
                        placeholder="e.g., Lung cancer, Mesothelioma, etc."
                        value={diagnosis.text}
                        onChange={(e) =>
                          updateEntry("cancer", i, "text", e.target.value)
                        }
                      />
                      {diagnosis.text && (
                        <Input
                          label={`Diagnosis Date ${String.fromCharCode(65 + i)}`}
                          type="date"
                          value={
                            diagnosis.date
                              ? diagnosis.date.toISOString().split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            updateEntry(
                              "cancer",
                              i,
                              "date",
                              e.target.value ? new Date(e.target.value) : null
                            )
                          }
                          helperText="Date when the client was diagnosed with this cancer"
                        />
                      )}
                    </div>
                    {i < 2 && <hr className="border-border/50" />}
                  </div>
                ))}
              </div>
              {attemptedSubmit && errors.cancer.length > 0 && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
                  {errors.cancer.map((error, i) => (
                    <div
                      key={i}
                      className="flex items-start text-sm text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Individual Conditions */}
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">
            🔬 Specific Occupational Conditions
          </h4>

          {[
            {
              key: "beryllium_sensitivity",
              label: "Beryllium Sensitivity",
              icon: "🟡",
            },
            {
              key: "chronic_beryllium_disease",
              label: "Chronic Beryllium Disease (CBD)",
              icon: "🔴",
            },
            {
              key: "chronic_silicosis",
              label: "Chronic Silicosis",
              icon: "⚫",
            },
          ].map(({ key, label, icon }) => {
            const category = value[key as keyof DiagnosisCategories] as {
              selected: boolean;
              date: Date | null;
            };

            return (
              <Card
                key={key}
                variant="outlined"
                className={
                  attemptedSubmit && errors[key]?.length > 0
                    ? "border-destructive bg-destructive/10"
                    : category.selected
                    ? "border-info/50 bg-info/5"
                    : ""
                }
              >
                <CardContent className="py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={category.selected}
                        onChange={(event) =>
                          updateCategory(key as keyof DiagnosisCategories, {
                            selected: event.target.checked,
                          })
                        }
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="font-medium">
                        {icon} {label}
                      </span>
                    </label>
                    {category.selected && (
                      <Input
                        label="Diagnosis Date"
                        type="date"
                        value={
                          category.date
                            ? category.date.toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          updateCategory(key as keyof DiagnosisCategories, {
                            date: e.target.value
                              ? new Date(e.target.value)
                              : null,
                          })
                        }
                        helperText={`Date when client was diagnosed with ${label.toLowerCase()}`}
                      />
                    )}
                  </div>
                  {attemptedSubmit && errors[key]?.length > 0 && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
                      {errors[key].map((error, i) => (
                        <div
                          key={i}
                          className="flex items-start text-sm text-destructive"
                        >
                          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Other Work-Related Conditions */}
        <Card
          variant="outlined"
          className={
            attemptedSubmit && errors.other.length > 0
              ? "border-destructive bg-destructive/10"
              : value.other.selected
              ? "border-secondary/50 bg-secondary/5"
              : ""
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value.other.selected}
                    onChange={(e) =>
                      updateCategory("other", { selected: e.target.checked })
                    }
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <CardTitle className="text-lg">
                    ⚕️ Other Work-Related Conditions
                  </CardTitle>
                </label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Due to exposure to toxic substances or radiation
            </p>
          </CardHeader>

          {value.other.selected && (
            <CardContent className="pt-0">
              <p className="font-medium mb-4">
                Enter up to 3 specific conditions for this client:
              </p>
              <div className="space-y-4">
                {value.other.diagnoses.map((diagnosis, i) => (
                  <div key={i} className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={`Other condition ${String.fromCharCode(65 + i)}`}
                        placeholder="e.g., Pulmonary fibrosis, Respiratory disease, etc."
                        value={diagnosis.text}
                        onChange={(e) =>
                          updateEntry("other", i, "text", e.target.value)
                        }
                      />
                      {diagnosis.text && (
                        <Input
                          label={`Diagnosis Date ${String.fromCharCode(65 + i)}`}
                          type="date"
                          value={
                            diagnosis.date
                              ? diagnosis.date.toISOString().split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            updateEntry(
                              "other",
                              i,
                              "date",
                              e.target.value ? new Date(e.target.value) : null
                            )
                          }
                          helperText="Date when the client was diagnosed with this condition"
                        />
                      )}
                    </div>
                    {i < 2 && <hr className="border-border/50" />}
                  </div>
                ))}
              </div>
              {attemptedSubmit && errors.other.length > 0 && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
                  {errors.other.map((error, i) => (
                    <div
                      key={i}
                      className="flex items-start text-sm text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </CardContent>
    </Card>
  );
}
