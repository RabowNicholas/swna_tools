/**
 * Common types for PDF generators
 */

export interface ClientRecord {
  Name?: string;
  [key: string]: any;
}

export interface BaseFormData {
  name: string;
  case_id: string;
  [key: string]: any;
}

export interface EE10FormData extends BaseFormData {
  dob?: string;
  address_main: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  phone: string;
  claim_type: 'Initial Impairment Claim' | 'Repeat Impairment Claim';
}

export interface GeneratorResult {
  filename: string;
  pdfBytes: Buffer;
}

/**
 * A generator that emits something other than a PDF.
 *
 * `GeneratorResult` names its payload `pdfBytes`, which every PDF generator and route
 * already reads. Rather than rename it across all of them, non-PDF generators return
 * this and their route sets `Content-Type` from `mimeType`.
 */
export interface DocumentResult {
  filename: string;
  bytes: Buffer;
  mimeType: string;
}

export interface TextDrawOptions {
  x: number;
  y: number;
  size?: number;
  color?: [number, number, number];
}
