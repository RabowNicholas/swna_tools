// The one list of tools in the app. The sidebar, the home page, the search
// box and every page's title all read from here, so a tool added here shows
// up everywhere at once.

import {
  FilePlus2,
  UserPen,
  Inbox,
  Stethoscope,
  Gauge,
  MessageSquare,
  BookOpen,
  ChartColumn,
  type LucideIcon,
} from "lucide-react";

export interface Tool {
  name: string;
  href: string;
  /** One plain sentence a new hire can understand. */
  description: string;
}

export interface ToolSection {
  id: string;
  title: string;
  /** Shown under the title on the home page. */
  summary: string;
  icon: LucideIcon;
  tools: Tool[];
  /** Back-office tools, kept apart at the bottom of the sidebar. */
  manage?: boolean;
}

export const TOOL_SECTIONS: ToolSection[] = [
  {
    id: "new-claim",
    title: "Start a new claim",
    summary: "File the forms for a new claim.",
    icon: FilePlus2,
    tools: [
      { name: "Claims Assembly", href: "/forms/claims-assembly", description: "Build the full claim package: EE-1, EE-3 and your documents, merged and named." },
      { name: "EE-1", href: "/forms/ee1", description: "The worker's claim for benefits." },
      { name: "EE-1a", href: "/forms/ee1a", description: "A claim for a new condition caused by an illness DOL already accepted." },
      { name: "EE-3", href: "/forms/ee3", description: "The client's employment history." },
    ],
  },
  {
    id: "client-changed",
    title: "Client info changed",
    summary: "Tell DOL about a new address, phone or representative.",
    icon: UserPen,
    tools: [
      { name: "Address Change", href: "/forms/address-change", description: "Tell DOL the client has a new address." },
      { name: "Phone Change", href: "/forms/phone-change", description: "Tell DOL the client has a new phone number." },
      { name: "Change of AR", href: "/forms/change-of-ar", description: "Change the client's authorized representative." },
    ],
  },
  {
    id: "respond-dol",
    title: "Respond to DOL",
    summary: "Letters, forms and records for when DOL needs something.",
    icon: Inbox,
    tools: [
      { name: "RD Waiver", href: "/forms/rd-waiver", description: "Waive the objection period on a Recommended Decision." },
      { name: "Status Update", href: "/forms/dol-status-update", description: "Send DOL an update on the client's case." },
      { name: "Custom Letter", href: "/forms/dol-letter", description: "Write any other letter to DOL." },
      { name: "Withdrawal", href: "/forms/withdrawal", description: "Withdraw a client's claim." },
      { name: "EN-16", href: "/forms/en16", description: "Fill out the EN-16 questionnaire DOL asks for." },
      { name: "Client Manager", href: "/clients", description: "View and edit a client's record." },
      { name: "DOL Portal", href: "/portal", description: "Submit to the DOL portal with the client's details ready to paste." },
    ],
  },
  {
    id: "medical",
    title: "Medical & testing",
    summary: "Referrals, doctor letters and IR scheduling.",
    icon: Stethoscope,
    tools: [
      { name: "Desert Pulmonary Referral", href: "/forms/desert-pulm", description: "Refer a client to Desert Pulmonary Rehab & Diagnostics." },
      { name: "Doctor Letter", href: "/forms/doctor-letter", description: "Draft a causation letter for a physician to review and sign." },
      { name: "IR Schedule Notice", href: "/forms/ir-notice", description: "Create the notice for a client's scheduled Independent Review." },
    ],
  },
  {
    id: "impairment",
    title: "Impairment",
    summary: "Impairment evaluation paperwork.",
    icon: Gauge,
    tools: [
      { name: "EE-10", href: "/forms/ee10", description: "Request approval of the doctor who will do the impairment evaluation." },
    ],
  },
  {
    id: "contact",
    title: "Contact a client",
    summary: "Send a client a message.",
    icon: MessageSquare,
    tools: [
      { name: "Text a Client", href: "/forms/text-message", description: "Send a ready-made text and log it to the client's record." },
    ],
  },
  {
    id: "lookup",
    title: "Look something up",
    summary: "The Procedure Manual and how-to guides.",
    icon: BookOpen,
    tools: [
      { name: "Procedure Manual", href: "/guides/procedure-manual", description: "Ask a question or find an exact quote from the Procedure Manual." },
      { name: "IR Process Guide", href: "/guides/ir-process", description: "Step by step, from the Final Decision letter to IR testing complete." },
    ],
  },
  {
    id: "manage",
    title: "Manage",
    summary: "Pipeline, reports and billing.",
    icon: ChartColumn,
    manage: true,
    tools: [
      { name: "Claims Pipeline", href: "/pipeline", description: "See where every claim stands and what needs follow-up." },
      { name: "AO Weekly Report", href: "/reports/ao-weekly", description: "Find AO clients with recent claim activity to report." },
      { name: "Invoice", href: "/forms/invoice", description: "Create an invoice for a client." },
    ],
  },
];

export const ALL_TOOLS: Tool[] = TOOL_SECTIONS.flatMap((s) => s.tools);

export function findTool(pathname: string): { tool: Tool; section: ToolSection } | null {
  for (const section of TOOL_SECTIONS) {
    const tool = section.tools.find((t) => t.href === pathname);
    if (tool) return { tool, section };
  }
  return null;
}

export function searchTools(query: string): Array<{ tool: Tool; section: ToolSection }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return TOOL_SECTIONS.flatMap((section) =>
    section.tools
      .filter((t) =>
        [t.name, t.description, section.title].some((s) => s.toLowerCase().includes(q))
      )
      .map((tool) => ({ tool, section }))
  );
}
