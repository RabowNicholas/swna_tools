// Candidate Status tags for the AO weekly report. Toggled on/off per report
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
