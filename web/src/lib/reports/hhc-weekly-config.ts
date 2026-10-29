import { CLIENT_STATUS } from '@/lib/email-utils';

// HHC groups the weekly report can run for. A group can cover more than one
// detected client status (GHHC is split by state everywhere else).
export const HHC_GROUPS = [
  { id: 'ao', label: 'AO', statuses: [CLIENT_STATUS.AO] },
  { id: 'ghhc', label: 'GHHC', statuses: [CLIENT_STATUS.GHHC_NV, CLIENT_STATUS.GHHC_TN] },
  { id: 'roots', label: 'Roots', statuses: [CLIENT_STATUS.ROOTS] },
  { id: 'atomic', label: 'Atomic', statuses: [CLIENT_STATUS.ATOMIC] },
] as const;

export type HHCGroupId = typeof HHC_GROUPS[number]['id'];

export const DEFAULT_GROUP: HHCGroupId = 'ao';

export function findGroup(id: string | null | undefined) {
  return HHC_GROUPS.find(group => group.id === id);
}

// Candidate Status tags for the weekly report. Toggled on/off per report
// run in the UI — this list is just the hardcoded set of options offered.

export const DEFAULT_ON_TAGS = [
  'Claim Submitted',
  'Withdrawn',
  'RD Deny',
  'FD Deny',
  'IR Submitted',
] as const;

export const DEFAULT_OFF_TAGS = [
  'RD Accept',
  'RD Accept IR',
  'RD Deny IR',
  'FD Deny B',
  'Remanded',
  'Objected',
  'Complete - PAID',
] as const;

export const ALL_CANDIDATE_TAGS = [...DEFAULT_ON_TAGS, ...DEFAULT_OFF_TAGS];

// YYYY-MM-DD in the local time zone. toISOString() gives the UTC date, which
// is already tomorrow on a Mountain-time evening.
export function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// YYYY-MM-DD -> MM/DD/YY
export function formatDateShort(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${month}/${day}/${year.slice(2)}`;
}

export function formatRange(from: string, to: string): string {
  return `${formatDateShort(from)} – ${formatDateShort(to)}`;
}
