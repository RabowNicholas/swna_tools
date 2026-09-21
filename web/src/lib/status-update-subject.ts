/**
 * Shared between the status update form (client) and generator (server). Kept free of
 * pdf-lib and fs imports so the form can use it without pulling the generator into the
 * client bundle.
 */

/** The template's own wording: "request a status update on ___". */
export const DEFAULT_STATUS_UPDATE_SUBJECT = "the above-referenced claim";

/**
 * Rough input cap. The real limit is the 3-line slot in the template, which the generator
 * enforces on font metrics; this just stops the field growing far past it.
 */
export const STATUS_UPDATE_SUBJECT_MAX_LENGTH = 90;
