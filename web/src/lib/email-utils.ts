/**
 * Email utilities for IR request drafting
 * Ported from Python email_templates.py and email_config.py
 */

// Email addresses configuration
export const EMAIL_ADDRESSES = {
  doctors: {
    "La Plata": "impairments@lpmedx.com",
    "Dr. Lewis": "admin@drlewis.org",
  },
  ao: "roxy@aomedicalgroup.com",
  hhc: {
    nv: "ar.nv@givinghhc.com",
    tn: "ar.tn@givinghhc.com",
  },
  laPlataCC: "cali.candelaria@lpmedx.com",
} as const;

// Client status tags
export const CLIENT_STATUS = {
  AO: "AO Client",
  GHHC: "GHHC Client",
} as const;

// Email templates
const STANDARD_TEMPLATE = `Hello,

Our client has elected to have {doctor} perform their impairment evaluation. I have attached their causation and contact information here.

Name: {name}
Phone: {phone}
DOB: {dob}
Case ID: {case_id}
Address: {address}

Thank you, and please let us know how we can further assist.`;

const DR_LEWIS_TEMPLATE = `Hello,

Our client has elected to have Dr. Lewis perform their impairment evaluation. I have attached their causation and contact information here.

Name: {name}
Phone: {phone}
DOB: {dob}
Case ID: {case_id}
Address: {address}
Verified WH Dates: {work_history_dates}

Thank you, and please let us know how we can further assist.`;

interface Client {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    Status?: string | string[];
    Tags?: string | string[];
    "Client Type"?: string | string[];
    [key: string]: string | string[] | undefined;
  };
}

/**
 * Detect client status from Airtable record
 */
export function detectClientStatus(client: Client): string {
  try {
    const fields = client.fields;

    // Possible field names for status/tags
    const possibleStatusFields = [
      "Status",
      "Tags",
      "Client Type",
      "Classification",
      "Type",
      "Category",
      "Client Status",
    ];

    for (const fieldName of possibleStatusFields) {
      const fieldValue = fields[fieldName];
      if (fieldValue) {
        // Handle array format
        if (Array.isArray(fieldValue)) {
          for (const tag of fieldValue) {
            if (tag === CLIENT_STATUS.AO || tag === CLIENT_STATUS.GHHC) {
              return tag;
            }
          }
        }
        // Handle string format
        else if (typeof fieldValue === "string") {
          if (fieldValue === CLIENT_STATUS.AO || fieldValue === CLIENT_STATUS.GHHC) {
            return fieldValue;
          }
          // Check if status is contained within the string
          if (fieldValue.includes(CLIENT_STATUS.AO)) return CLIENT_STATUS.AO;
          if (fieldValue.includes(CLIENT_STATUS.GHHC)) return CLIENT_STATUS.GHHC;
        }
      }
    }

    return ""; // No status found
  } catch (error) {
    return ""; // Error reading status
  }
}

/**
 * Check if client is GHHC client
 */
export function isGHHCClient(clientStatus: string): boolean {
  return clientStatus === CLIENT_STATUS.GHHC;
}

/**
 * Check if client is AO client
 */
export function isAOClient(clientStatus: string): boolean {
  return clientStatus === CLIENT_STATUS.AO;
}

/**
 * Get email recipients based on doctor and client status
 */
export function getEmailRecipients(
  doctor: "La Plata" | "Dr. Lewis",
  clientStatus: string,
  hhcLocation?: "NV" | "TN"
): { to: string[]; cc: string[] } {
  // TO recipient is always the selected doctor
  const to = [EMAIL_ADDRESSES.doctors[doctor]];

  // CC recipients based on client status
  const cc: string[] = [];

  // Add La Plata CC for all clients when La Plata is selected
  if (doctor === "La Plata") {
    cc.push(EMAIL_ADDRESSES.laPlataCC);
  }

  // Add CC based on client status
  if (clientStatus === CLIENT_STATUS.AO) {
    cc.push(EMAIL_ADDRESSES.ao);
  } else if (clientStatus === CLIENT_STATUS.GHHC && hhcLocation) {
    if (hhcLocation === "NV") {
      cc.push(EMAIL_ADDRESSES.hhc.nv);
    } else if (hhcLocation === "TN") {
      cc.push(EMAIL_ADDRESSES.hhc.tn);
    }
  }

  return { to, cc };
}

/**
 * Format email body with client information
 */
export function formatEmailBody(
  doctor: "La Plata" | "Dr. Lewis",
  name: string,
  phone: string,
  dob: string,
  caseId: string,
  address: string,
  workHistoryDates?: string
): string {
  const template = doctor === "Dr. Lewis" ? DR_LEWIS_TEMPLATE : STANDARD_TEMPLATE;

  let formattedBody = template
    .replace("{doctor}", doctor)
    .replace("{name}", name)
    .replace("{phone}", phone)
    .replace("{dob}", dob)
    .replace("{case_id}", caseId)
    .replace("{address}", address);

  // Add work history for Dr. Lewis
  if (doctor === "Dr. Lewis" && workHistoryDates) {
    formattedBody = formattedBody.replace("{work_history_dates}", workHistoryDates);
  }

  return formattedBody;
}

/**
 * Generate subject line for IR request
 */
export function getSubjectLine(clientName: string): string {
  try {
    const nameParts = clientName.trim().split(" ");
    if (nameParts.length >= 2) {
      const firstInitial = nameParts[0][0].toUpperCase();
      const lastName = nameParts[nameParts.length - 1];
      return `IR Request: ${firstInitial}. ${lastName}`;
    } else {
      return `IR Request: ${clientName}`;
    }
  } catch (error) {
    return `IR Request: ${clientName}`;
  }
}

/**
 * Create mailto: URL with encoded parameters
 */
export function createMailtoLink(
  to: string[],
  cc: string[],
  subject: string,
  body: string
): string {
  const params = new URLSearchParams();

  if (cc.length > 0) {
    params.append("cc", cc.join(","));
  }
  params.append("subject", subject);
  params.append("body", body);

  return `mailto:${to[0]}?${params.toString()}`;
}

/**
 * Format complete email for copying (with headers)
 */
export function formatCompleteEmail(
  to: string[],
  cc: string[],
  subject: string,
  body: string
): string {
  return `TO: ${to.join(", ")}
CC: ${cc.join(", ")}
Subject: ${subject}

${body}`;
}
