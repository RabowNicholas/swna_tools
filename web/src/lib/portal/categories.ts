// The DOL Energy Document Portal's upload categories, by the value its
// dropdown uses (mapped from the live portal 2026-10-14), and which one each
// tool's document goes under by default.

import type { DestinationId } from "@/lib/files/destinations";

export interface PortalCategory {
  value: number;
  label: string;
}

export const DOL_CATEGORIES: PortalCategory[] = [
  { value: 11, label: "Claims and Forms - All Others" },
  { value: 12, label: "Death Records" },
  { value: 13, label: "Employment Evidence" },
  { value: 14, label: "Fiscal Documents" },
  { value: 15, label: "Home Health Care Documents" },
  { value: 16, label: "Identification of Authorized Representative" },
  { value: 17, label: "Medical Records" },
  { value: 18, label: "Objections to Recommended Decision Including Hearing Documents" },
  { value: 19, label: "Occupational History Interview" },
  { value: 20, label: "Other Documents" },
  { value: 124, label: "OWCP-26" },
  { value: 122, label: "OWCP-915" },
  { value: 123, label: "OWCP-957" },
  { value: 21, label: "Phone or Address Change" },
  { value: 22, label: "Reconsideration Request" },
  { value: 23, label: "Reopening Request" },
  { value: 24, label: "Request of Copy of Case File" },
  { value: 25, label: "Survivorship Evidence" },
  { value: 26, label: "Telephone Records" },
  { value: 27, label: "Waivers or Partial Waivers to Recommended Decision" },
  { value: 121, label: "Ancillary Medical Services" },
];

const OTHER = 20;
const CLAIMS_AND_FORMS = 11;

/** The category each portal tool's document is filed under unless changed */
export const DEFAULT_CATEGORY: Partial<Record<DestinationId, number>> = {
  "change-of-ar": 16,
  "phone-change": 21,
  "address-change": 21,
  "rd-waiver": 27,
  en16: CLAIMS_AND_FORMS,
  ee10: CLAIMS_AND_FORMS,
  "ir-notice": OTHER,
  withdrawal: OTHER,
  "dol-status-update": OTHER,
  "dol-letter": OTHER,
};

export function categoryFor(value: number): PortalCategory {
  return DOL_CATEGORIES.find((c) => c.value === value) ?? DOL_CATEGORIES.find((c) => c.value === OTHER)!;
}
