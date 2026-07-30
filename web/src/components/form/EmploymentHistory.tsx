"use client";

/**
 * The EE-3's employment history block.
 *
 * Shared with Claims Assembly, which generates an EE-3 as part of a first
 * claim — the record shape here is what /api/generate/ee3 expects, so the two
 * callers have to stay on the same one.
 *
 * Collapse state lives with the caller: a failed submit expands whichever
 * section holds the first error before scrolling to it.
 */

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  Minus,
  Briefcase,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";

/** More than this and the form is filled out by hand instead. */
export const MAX_EMPLOYERS = 3;

export interface EmploymentRecord {
  start_date: string;
  end_date?: string;
  facility_name: string;
  specific_location: string;
  city: string;
  state: string;
  contractor: string;
  position_title: string;
  work_duties: string;
  union_member?: boolean;
  dosimetry_worn?: boolean;
}

/** The slice of a form's values this section owns. */
export interface EmploymentHistoryValues {
  employment_history: EmploymentRecord[];
}

/** Date problems by record index — zod can't say which end is wrong. */
export type EmploymentDateErrors = Record<
  number,
  { start?: string; end?: string }
>;

export const emptyEmploymentRecord = (): EmploymentRecord => ({
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

/** Per-record start/end date problems, keyed by index. Pure. */
export function validateEmploymentDates(
  records: EmploymentRecord[]
): EmploymentDateErrors {
  const dateErrors: EmploymentDateErrors = {};

  records.forEach((employment, index) => {
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

  return dateErrors;
}

export interface EmploymentHistorySectionProps {
  form: UseFormReturn<EmploymentHistoryValues>;
  dateErrors: EmploymentDateErrors;
  collapsed: Set<number>;
  onCollapsedChange: (next: Set<number>) => void;
}

export function EmploymentHistorySection({
  form,
  dateErrors,
  collapsed,
  onCollapsedChange,
}: EmploymentHistorySectionProps) {
  const [showPreview, setShowPreview] = useState<{ [key: number]: boolean }>({});

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "employment_history",
  });

  const watchedHistory = form.watch("employment_history");
  const errors = form.formState.errors;

  const toggleCollapse = (index: number) => {
    const next = new Set(collapsed);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    onCollapsedChange(next);
  };

  const togglePreview = (index: number) => {
    setShowPreview((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const isEmploymentComplete = (index: number) => {
    const employment = watchedHistory?.[index];
    if (!employment) return false;
    return (
      !!employment.start_date &&
      !!employment.facility_name &&
      !!employment.specific_location &&
      !!employment.city &&
      !!employment.state &&
      !!employment.contractor &&
      !!employment.position_title &&
      !!employment.work_duties
    );
  };

  return (
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
                if (fields.length >= MAX_EMPLOYERS) {
                  alert(
                    `Maximum of ${MAX_EMPLOYERS} employers can be added through this form. For more than ${MAX_EMPLOYERS} employers, please fill out the EE-3 form manually.`
                  );
                  return;
                }
                const newIndex = fields.length;
                append(emptyEmploymentRecord());
                // Auto-expand the new employment section
                const next = new Set(collapsed);
                next.delete(newIndex);
                onCollapsedChange(next);
              }}
              variant="outline"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              disabled={fields.length >= MAX_EMPLOYERS}
            >
              Add Employment
            </Button>

            {fields.length > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={() => onCollapsedChange(new Set())}
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
                    onCollapsedChange(
                      new Set(Array.from({ length: fields.length }, (_, i) => i))
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
          const isCollapsed = collapsed.has(index);
          const employment = watchedHistory?.[index];
          const previewData = showPreview[index] && employment;
          const recordErrors = errors.employment_history?.[index];

          return (
            <Card
              key={field.id}
              variant="outlined"
              className={`mb-6 last:mb-0 transition-all duration-200 ${
                isComplete ? "border-success/50 bg-success/5" : "border-border"
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
                        onClick={() => togglePreview(index)}
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
                      onClick={() => toggleCollapse(index)}
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
                        dateErrors[index]?.start ||
                        recordErrors?.start_date?.message
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
                        dateErrors[index]?.end || recordErrors?.end_date?.message
                      }
                      {...form.register(`employment_history.${index}.end_date`)}
                    />

                    <Input
                      label="Facility Name"
                      required
                      error={recordErrors?.facility_name?.message}
                      {...form.register(
                        `employment_history.${index}.facility_name`
                      )}
                    />

                    <Input
                      label="Specific Location"
                      required
                      error={recordErrors?.specific_location?.message}
                      {...form.register(
                        `employment_history.${index}.specific_location`
                      )}
                    />

                    <Input
                      label="City"
                      required
                      error={recordErrors?.city?.message}
                      {...form.register(`employment_history.${index}.city`)}
                    />

                    <Input
                      label="State"
                      maxLength={2}
                      placeholder="NM"
                      required
                      helperText="Two letter state code"
                      error={recordErrors?.state?.message}
                      {...form.register(`employment_history.${index}.state`)}
                    />

                    <Input
                      label="Contractor"
                      required
                      error={recordErrors?.contractor?.message}
                      {...form.register(
                        `employment_history.${index}.contractor`
                      )}
                    />

                    <Input
                      label="Position Title"
                      required
                      error={recordErrors?.position_title?.message}
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
                        error={recordErrors?.work_duties?.message}
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
  );
}
