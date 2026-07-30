/**
 * The claimant fields an EE-1 needs.
 *
 * Shared by the EE-1 form and Claims Assembly, which generates an EE-1 of its
 * own — both have to reject the same input.
 */

import { z } from "zod";

/**
 * Individual field rules, exported so Claims Assembly can apply the same ones
 * conditionally — it only needs them when it is generating the EE-1.
 */
export const ssnSchema = z.string().regex(/^\d{9}$/, "SSN must be 9 digits");
export const stateSchema = z
  .string()
  .min(2, "State is required")
  .max(2, "State must be 2 characters");
export const zipSchema = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits");
export const phoneSchema = z
  .string()
  .regex(
    /^\d{3}\.\d{3}\.\d{4}$/,
    "Phone number must be in format: 123.123.1234"
  );

export const ee1Schema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  first_name: z.string().min(1, "First name is required"),
  middle_initial: z
    .string()
    .max(1, "Middle initial must be 1 character")
    .optional(),
  last_name: z.string().min(1, "Last name is required"),
  ssn: ssnSchema,
  dob: z.string().min(1, "Date of birth is required"),
  sex: z
    .enum(["Male", "Female"])
    .refine((val) => val, { message: "Sex is required" }),
  address_main: z.string().min(1, "Street address is required"),
  address_city: z.string().min(1, "City is required"),
  address_state: stateSchema,
  address_zip: zipSchema,
  phone: phoneSchema,
});

export type EE1FormValues = z.infer<typeof ee1Schema>;
