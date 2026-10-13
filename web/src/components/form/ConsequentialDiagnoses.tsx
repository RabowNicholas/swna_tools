"use client";

/**
 * The EE-1a's list of consequential illnesses.
 *
 * Shared with Claims Assembly, which generates an EE-1a for a consequential
 * claim — the row shape here is what /api/generate/ee1a expects, so the two
 * callers have to stay on the same one.
 *
 * Error state lives with the caller, which decides when to validate.
 */

import { type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { AlertCircle, FileText, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_CONSEQUENTIAL_DIAGNOSES,
  emptyConsequentialDiagnosis,
  hasConsequentialDiagnosisErrors,
  type ConsequentialDiagnosis,
  type ConsequentialDiagnosisError,
} from "@/lib/schemas/ee1a";

/** The slice of a form's values this section owns. */
export interface ConsequentialDiagnosesValues {
  diagnoses: ConsequentialDiagnosis[];
}

export interface ConsequentialDiagnosesProps {
  form: UseFormReturn<ConsequentialDiagnosesValues>;
  errors: ConsequentialDiagnosisError[];
  onErrorsChange: (errors: ConsequentialDiagnosisError[]) => void;
  attemptedSubmit: boolean;
  /** Anchor for scrolling to the section after a failed submit */
  id?: string;
}

export function ConsequentialDiagnosesSection({
  form,
  errors,
  onErrorsChange,
  attemptedSubmit,
  id,
}: ConsequentialDiagnosesProps) {
  const diagnoses = form.watch("diagnoses");

  const addDiagnosis = () => {
    const current = form.getValues("diagnoses");
    if (current.length >= MAX_CONSEQUENTIAL_DIAGNOSES) return;

    form.setValue("diagnoses", [...current, emptyConsequentialDiagnosis()]);
    onErrorsChange([...errors, {}]);
  };

  const removeDiagnosis = (index: number) => {
    const current = form.getValues("diagnoses");
    if (current.length <= 1) return;

    form.setValue(
      "diagnoses",
      current.filter((_, i) => i !== index)
    );
    onErrorsChange(errors.filter((_, i) => i !== index));
  };

  const rowHasError = (index: number) =>
    !!(errors[index]?.diagnosis_text || errors[index]?.diagnosis_date);

  return (
    <Card variant="elevated" id={id}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Consequential Illnesses</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              List each condition and the accepted illness it comes from (max{" "}
              {MAX_CONSEQUENTIAL_DIAGNOSES})
            </p>
          </div>
          {diagnoses.length < MAX_CONSEQUENTIAL_DIAGNOSES && (
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
        {hasConsequentialDiagnosisErrors(errors) && attemptedSubmit && (
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
              <h4 className="font-medium" style={{ color: "var(--destructive)" }}>
                Please complete all diagnosis information
              </h4>
              <p className="text-sm mt-1" style={{ color: "var(--destructive)" }}>
                Each diagnosis must have both a description and a valid date.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {diagnoses.map((_, index) => (
            <Card
              key={index}
              style={
                attemptedSubmit && rowHasError(index)
                  ? {
                      borderColor: "var(--destructive)",
                      backgroundColor:
                        "color-mix(in srgb, var(--destructive) 10%, transparent)",
                    }
                  : undefined
              }
              className={cn(
                "border-2 transition-all",
                !attemptedSubmit || !rowHasError(index) ? "border-border" : ""
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
                    placeholder="e.g. Hypertension, consequential to COPD"
                    helperText="Name the condition, then “consequential to” or “aggravated by” and the accepted illness it's linked to"
                    error={
                      attemptedSubmit ? errors[index]?.diagnosis_text : undefined
                    }
                    {...form.register(`diagnoses.${index}.diagnosis_text`)}
                  />

                  <Input
                    label="Diagnosis Date"
                    type="date"
                    required
                    helperText="From the second-to-last paragraph for this condition in the diagnosis letter. It should match the date on the testing or records that go with it."
                    error={
                      attemptedSubmit ? errors[index]?.diagnosis_date : undefined
                    }
                    {...form.register(`diagnoses.${index}.diagnosis_date`)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
