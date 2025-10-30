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

export interface TextDrawOptions {
  x: number;
  y: number;
  size?: number;
  color?: [number, number, number];
}
