/**
 * The consequential illnesses an EE-1a lists.
 *
 * Shared by the EE-1a form and Claims Assembly, which generates an EE-1a for a
 * consequential claim — both have to reject the same input.
 */

import { z } from "zod";

/** The form has five lines, a to e. */
export const MAX_CONSEQUENTIAL_DIAGNOSES = 5;

/**
 * Nothing required here: a row is checked by validateConsequentialDiagnoses,
 * which can say which half of it is wrong.
 */
export const consequentialDiagnosisSchema = z.object({
  diagnosis_text: z.string(),
  diagnosis_date: z.string(),
});

export type ConsequentialDiagnosis = z.infer<typeof consequentialDiagnosisSchema>;

export const emptyConsequentialDiagnosis = (): ConsequentialDiagnosis => ({
  diagnosis_text: "",
  diagnosis_date: "",
});

export interface ConsequentialDiagnosisError {
  diagnosis_text?: string;
  diagnosis_date?: string;
}

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

/** Every row's problems, by index — an empty object for a row that's fine. Pure. */
export function validateConsequentialDiagnoses(
  rows: ConsequentialDiagnosis[]
): ConsequentialDiagnosisError[] {
  return rows.map((row) => {
    const error: ConsequentialDiagnosisError = {};

    if (!row.diagnosis_text || row.diagnosis_text.trim() === "") {
      error.diagnosis_text = "Diagnosis description is required";
    }

    if (!row.diagnosis_date || row.diagnosis_date.trim() === "") {
      error.diagnosis_date = "Diagnosis date is required";
    } else {
      const dateError = validateDate(row.diagnosis_date, "Diagnosis date");
      if (dateError) error.diagnosis_date = dateError;
    }

    return error;
  });
}

export const hasConsequentialDiagnosisErrors = (
  errors: ConsequentialDiagnosisError[]
): boolean => errors.some((err) => err.diagnosis_text || err.diagnosis_date);
