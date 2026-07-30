/**
 * The claimant and employment fields an EE-3 needs.
 *
 * Shared by the EE-3 form and Claims Assembly, which generates an EE-3 on a
 * client's first claim — both have to reject the same input.
 */

import { z } from "zod";

export const employmentSchema = z
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

export const employmentHistorySchema = z
  .array(employmentSchema)
  .min(1, "At least one employment record is required");

/**
 * The same shape with nothing required.
 *
 * Claims Assembly always carries an employment_history in its form values but
 * only holds it to employmentHistorySchema when the claim actually needs an
 * EE-3 — a client with a prior claim never fills this in.
 */
export const employmentDraftSchema = z.object({
  start_date: z.string(),
  end_date: z.string().optional(),
  facility_name: z.string(),
  specific_location: z.string(),
  city: z.string(),
  state: z.string(),
  contractor: z.string(),
  position_title: z.string(),
  work_duties: z.string(),
  union_member: z.boolean().optional(),
  dosimetry_worn: z.boolean().optional(),
});

export const ee3Schema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  former_name: z.string().optional(),
  ssn: z.string().regex(/^\d{9}$/, "SSN must be 9 digits"),
  employment_history: employmentHistorySchema,
});

export type EE3FormValues = z.infer<typeof ee3Schema>;
