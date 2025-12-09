// Pipeline stage configuration for claims process visualization

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  statusTags: string[];
  color: string; // Tailwind color class
  order: number;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'new_clients',
    name: 'New Clients (Initial Intake)',
    description: 'New clients - waiting on forms/testing',
    statusTags: [
      'Wait on SWNA Forms',
      'Wait on SWNA Forms ',
      'CXR/PFT Requested',
      '1st Cont. Need',
      'Advised to Get Testing',
      'Needs Testing Advisement',
    ],
    color: 'bg-blue-500',
    order: 1,
  },
  {
    id: 'stalled_clients',
    name: 'Stalled Clients (Follow-Up)',
    description: 'Need client follow-up/response',
    statusTags: [
      'Waiting on Client',
      'Follow-Up Needed',
      'Client Needs Contact',
    ],
    color: 'bg-yellow-500',
    order: 2,
  },
  {
    id: 'internal_work',
    name: 'Internal Work Queue',
    description: 'Our responsibility - drafting, reviews, assembly',
    statusTags: [
      'File Review - Toupin',
      'Ready to send Toupin',
      'Ready to send Herold',
      'Drafting',
      'Drafting (CS)',
      'Drafting (Emphysema)',
      'Drafting (PN)',
      'Working on CQs',
      'CXR Ready for Dr. Smith',
      'In B-Read - Smith',
      'Med Pending',
      'MR Requested',
      'Ready to File',
      'Claim Pre-Submitted',
    ],
    color: 'bg-purple-500',
    order: 3,
  },
  {
    id: 'dol_initial',
    name: 'With DOL - Initial Processing',
    description: 'Submitted, waiting for DOL to process',
    statusTags: [
      'Claim Submitted',
      'Claim Established',
      'Claim Developed',
    ],
    color: 'bg-indigo-500',
    order: 4,
  },
  {
    id: 'dol_rfis',
    name: 'DOL RFIs',
    description: 'Requests for information from DOL',
    statusTags: [
      'DOL RFI',
      'WH RFI',
      'Med RFI',
      'CQ RFI',
      'Surv RFI',
      'NTS Request in Progress',
    ],
    color: 'bg-orange-500',
    order: 5,
  },
  {
    id: 'recommended_decision',
    name: 'Recommended Decision',
    description: 'RD received from DOL',
    statusTags: [
      'RD Accept',
      'RD Deny',
      'RD Accept E/Deny B',
    ],
    color: 'bg-cyan-500',
    order: 6,
  },
  {
    id: 'impairment_rating',
    name: 'Impairment Rating Process',
    description: 'Part E IR work - scheduling to completion',
    statusTags: [
      'Pre-IR',
      'Pre-Dr. Lewis IR',
      'Pre-La Plata IR',
      'IR (Dr. Lewis)',
      'IR (La Plata)',
      'IR (Dr. Soo Hoo)',
      'IR (Dr. Lakatosh)',
      'IR Recommended',
      'RD Accept IR',
    ],
    color: 'bg-amber-500',
    order: 7,
  },
  {
    id: 'final_decision',
    name: 'Final Decision',
    description: 'FD received - accepted or issues',
    statusTags: [
      'FD Accept',
      'FD Deny',
      'FD Deny B',
      'FD Deny ',
      'Objected',
      'Remanded',
      'Blind Filed',
    ],
    color: 'bg-teal-500',
    order: 8,
  },
  {
    id: 'needs_invoicing',
    name: 'Needs Invoicing',
    description: 'Ready to invoice - our action required',
    statusTags: [
      'Needs Invoicing',
    ],
    color: 'bg-pink-500',
    order: 9,
  },
  {
    id: 'payment_outstanding',
    name: 'Payment Outstanding',
    description: 'Invoice sent, waiting on payment',
    statusTags: [
      'Payment Outstanding',
    ],
    color: 'bg-rose-500',
    order: 10,
  },
  {
    id: 'complete_paid',
    name: 'Complete/Paid',
    description: 'Successful completions',
    statusTags: [
      'Complete - PAID',
      'Complete SURV - PAID',
      'Complete No Payment',
      'Part B Paid',
      'Part B Eligible (Needs CXR)',
    ],
    color: 'bg-green-500',
    order: 11,
  },
  {
    id: 'issues_closed',
    name: 'Issues/Closed Cases',
    description: 'Special cases, withdrawn, or inactive',
    statusTags: [
      'Withdrawn',
      'Stagnant',
      'Deceased',
      'DOD',
      'Terminal',
      'Low Priority',
      'Waiting Until 10-yr Latency',
      'Healthy',
      'Probate',
      'Survivor Claim',
      'YMP Case',
      'ATTN: Update Now - Tyler',
      'Need Update GHHC',
      'Physician',
      'Referred to Adult H&W Pulmonology',
      'Referred to Sunrise Health',
      'Short Timeframe WH',
    ],
    color: 'bg-gray-500',
    order: 12,
  },
];

// Helper function to find which stage(s) a status tag belongs to
export function getStagesForStatus(statusTag: string): PipelineStage[] {
  return PIPELINE_STAGES.filter(stage =>
    stage.statusTags.includes(statusTag)
  );
}

// Helper function to get all status tags across all stages
export function getAllStatusTags(): string[] {
  return PIPELINE_STAGES.flatMap(stage => stage.statusTags);
}
