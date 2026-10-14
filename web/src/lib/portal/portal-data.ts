// The three values the DOL portal's case lookup asks for, read off an Airtable
// client record whose Name is "Last, First - 1234".

export interface PortalData {
  caseId: string;
  lastName: string;
  ssnLast4: string;
}

export function extractPortalData(client: {
  fields: { Name?: string; "Case ID"?: string; [key: string]: unknown };
}): PortalData {
  const name = client.fields.Name || "";
  const caseId = String(client.fields["Case ID"] ?? "").trim();
  if (!name.includes(",")) return { caseId, lastName: "", ssnLast4: "" };

  // DOL's lookup wants hyphens as spaces and no other punctuation, so
  // "Smith-Jones" is looked up as "Smith Jones"
  const lastName = name
    .split(",")[0]
    .replace(/-/g, " ")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const parts = name.split(" - ");
  const ssnLast4 = parts.length > 1 ? parts[parts.length - 1].trim() : "";

  return { caseId, lastName, ssnLast4 };
}
