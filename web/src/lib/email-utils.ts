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
  laPlataZeke: "zkalcich@lpmedx.com",
} as const;

// Client status tags
export const CLIENT_STATUS = {
  AO: "AO Client",
  GHHC_NV: "GHHC NV",
  GHHC_TN: "GHHC TN",
} as const;

// Helper: mobile testing applies when La Plata, not AO, not GHHC, and client is in NV
function requiresMobileTesting(doctor: string, clientStatus: string, clientState?: string): boolean {
  return doctor === "La Plata"
    && clientStatus !== CLIENT_STATUS.AO
    && clientStatus !== CLIENT_STATUS.GHHC_NV
    && clientStatus !== CLIENT_STATUS.GHHC_TN
    && clientState === "NV";
}

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

const MOBILE_TESTING_TEMPLATE = `Hello,

Our client has elected to have {doctor} perform their impairment evaluation. I have attached their causation and contact information here.

Name: {name}
Phone: {phone}
DOB: {dob}
Case ID: {case_id}
Address: {address}

**We would also like to request mobile testing for our client. Please coordinate with your mobile testing team to schedule the 6MWT and PFT at the client's location.**

Thank you, and please let us know how we can further assist.`;

const AO_TEMPLATE = `Hello,

Our client has elected to have {doctor} perform their impairment evaluation. I have attached their causation and contact information here.

Name: {name}
Phone: {phone}
DOB: {dob}
Case ID: {case_id}
Address: {address}

[AO Team], please assist with obtaining a recent office visit note for this client when available.

Thank you, and please let us know how we can further assist.`;

const GHHC_NV_TEMPLATE = `Hello,

Our client has elected to have {doctor} perform their impairment evaluation. I have attached their causation and contact information here.

Name: {name}
Phone: {phone}
DOB: {dob}
Case ID: {case_id}
Address: {address}

[GHHC Team], please assist with coordinating the 6MWT and PFT for our client, and send us a recent OV note and ADL sheet when available.

Thank you, and please let us know how we can further assist.`;

const GHHC_TN_TEMPLATE = `Hello,

Our client has elected to have {doctor} perform their impairment evaluation. I have attached their causation and contact information here.

Name: {name}
Phone: {phone}
DOB: {dob}
Case ID: {case_id}
Address: {address}

[GHHC Team], please assist with coordinating the 6MWT and PFT for our client, and send us a recent OV note and ADL sheet when available.

Thank you, and please let us know how we can further assist.`;

// IR Notice email template
const IR_NOTICE_TEMPLATE = `We received the attached letter authorizing {client_name}'s impairment evaluation with {provider}. Please let us know if there is anything we can assist with.

As a side note: we've also informed the DOL that this client's impairment appointment would be completed by {appointment_date}, simply so that they do not continue calling the client, the client's home healthcare group, and our office with reminders to schedule an appointment in the meantime!

Thank you,`;

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
 * Resolve "GHHC Client" tag to GHHC_NV or GHHC_TN by checking the State field
 */
function resolveGHHCFromState(fields: Client['fields']): string {
  const state = fields["State"];
  if (state && typeof state === 'string') {
    if (state === 'NV' || state.toLowerCase().includes('nevada')) {
      return CLIENT_STATUS.GHHC_NV;
    }
    if (state === 'TN' || state.toLowerCase().includes('tennessee')) {
      return CLIENT_STATUS.GHHC_TN;
    }
  }
  return CLIENT_STATUS.GHHC_NV; // fallback if state is unrecognized
}

/**
 * Detect client status from Airtable record
 */
export function detectClientStatus(client: Client): string {
  try {
    const fields = client.fields;

    // Check Associated Companies for AO Medical
    const associatedCompanies = fields["Associated Companies"];
    if (associatedCompanies && Array.isArray(associatedCompanies)) {
      for (const company of associatedCompanies) {
        if (company.toLowerCase().includes("ao")) {
          return CLIENT_STATUS.AO;
        }
      }
    }

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
            if (tag === CLIENT_STATUS.AO) return CLIENT_STATUS.AO;
            if (tag === CLIENT_STATUS.GHHC_NV) return CLIENT_STATUS.GHHC_NV;
            if (tag === CLIENT_STATUS.GHHC_TN) return CLIENT_STATUS.GHHC_TN;
            if (tag === "GHHC Client") return resolveGHHCFromState(fields);
          }
        }
        // Handle string format
        else if (typeof fieldValue === "string") {
          if (fieldValue === CLIENT_STATUS.AO) return CLIENT_STATUS.AO;
          if (fieldValue === CLIENT_STATUS.GHHC_NV) return CLIENT_STATUS.GHHC_NV;
          if (fieldValue === CLIENT_STATUS.GHHC_TN) return CLIENT_STATUS.GHHC_TN;
          if (fieldValue === "GHHC Client") return resolveGHHCFromState(fields);
          // Check if status is contained within the string
          if (fieldValue.includes(CLIENT_STATUS.AO)) return CLIENT_STATUS.AO;
          if (fieldValue.includes(CLIENT_STATUS.GHHC_NV)) return CLIENT_STATUS.GHHC_NV;
          if (fieldValue.includes(CLIENT_STATUS.GHHC_TN)) return CLIENT_STATUS.GHHC_TN;
          if (fieldValue.includes("GHHC Client")) return resolveGHHCFromState(fields);
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
  return clientStatus === CLIENT_STATUS.GHHC_NV || clientStatus === CLIENT_STATUS.GHHC_TN;
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
  clientState?: string
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
  } else if (clientStatus === CLIENT_STATUS.GHHC_NV) {
    cc.push(EMAIL_ADDRESSES.hhc.nv);
  } else if (clientStatus === CLIENT_STATUS.GHHC_TN) {
    cc.push(EMAIL_ADDRESSES.hhc.tn);
  }

  // Add Zeke at La Plata for mobile testing cases (not AO, in NV)
  if (requiresMobileTesting(doctor, clientStatus, clientState)) {
    cc.push(EMAIL_ADDRESSES.laPlataZeke);
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
  workHistoryDates?: string,
  clientStatus?: string,
  clientState?: string
): string {
  let template: string;
  if (doctor === "Dr. Lewis") {
    template = DR_LEWIS_TEMPLATE;
  } else if (clientStatus === CLIENT_STATUS.AO) {
    template = AO_TEMPLATE;
  } else if (clientStatus === CLIENT_STATUS.GHHC_NV) {
    template = GHHC_NV_TEMPLATE;
  } else if (clientStatus === CLIENT_STATUS.GHHC_TN) {
    template = GHHC_TN_TEMPLATE;
  } else if (requiresMobileTesting(doctor, clientStatus ?? "", clientState)) {
    template = MOBILE_TESTING_TEMPLATE;
  } else {
    template = STANDARD_TEMPLATE;
  }

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

/**
 * Format IR Notice email body
 */
export function formatIRNoticeEmailBody(
  clientName: string,
  providerName: string,
  appointmentDate: string
): string {
  return IR_NOTICE_TEMPLATE
    .replace("{client_name}", clientName)
    .replace("{provider}", providerName)
    .replace("{appointment_date}", appointmentDate);
}

/**
 * Get testing and OVN coordination steps based on doctor, client status, and state
 */
export function getCoordinationSteps(
  doctor: "La Plata" | "Dr. Lewis",
  clientStatus: string,
  clientState?: string
): { testing: string[]; ovn: string[] } {
  if (doctor === "Dr. Lewis") {
    return {
      testing: ["Dr. Lewis handles all testing — no action needed"],
      ovn: ["OVN not required for Dr. Lewis"],
    };
  }

  // La Plata: AO paths
  if (clientStatus === CLIENT_STATUS.AO) {
    if (clientState === "NV") {
      return {
        testing: ["Send Desert Pulm referral form + general availability to Roxy at AO"],
        ovn: ["AO will provide OV note and ADL"],
      };
    } else {
      return {
        testing: ["Work with client directly — help them coordinate 6MWT and PFT"],
        ovn: ["AO will provide OV note and ADL"],
      };
    }
  }

  // La Plata: GHHC NV
  if (clientStatus === CLIENT_STATUS.GHHC_NV) {
    return {
      testing: ["Mobile testing + GHHC coordination requested in La Plata email (Zeke CC'd)"],
      ovn: ["OV note and ADL requested in La Plata email"],
    };
  }

  // La Plata: GHHC TN (non-NV GHHC)
  if (clientStatus === CLIENT_STATUS.GHHC_TN) {
    return {
      testing: ["GHHC coordination requested in La Plata email"],
      ovn: ["OV note and ADL requested in La Plata email"],
    };
  }

  // La Plata: No HHC
  if (clientState === "NV") {
    return {
      testing: ["Mobile testing requested in La Plata email (Zeke CC'd)"],
      ovn: ["Client must obtain their own OV note (portal, in person, or fax to 702-825-0145)"],
    };
  }

  return {
    testing: ["Work with client directly — help them coordinate 6MWT and PFT"],
    ovn: ["Client must obtain their own OV note (portal, in person, or fax to 702-825-0145)"],
  };
}

/**
 * Generate subject line for IR Notice
 */
export function getIRNoticeSubjectLine(clientName: string): string {
  try {
    const nameParts = clientName.trim().split(" ");
    if (nameParts.length >= 2) {
      const firstInitial = nameParts[0][0].toUpperCase();
      const lastName = nameParts[nameParts.length - 1];
      return `IR Auth: ${firstInitial}. ${lastName}`;
    } else {
      return `IR Auth: ${clientName}`;
    }
  } catch (error) {
    return `IR Auth: ${clientName}`;
  }
}
