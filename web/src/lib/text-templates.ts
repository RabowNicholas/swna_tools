/**
 * Canned client text messages.
 *
 * These lived in a Google Doc and were retyped by hand for every client. Here
 * they're data: a body with {token} placeholders, plus whatever extra inputs
 * that body needs. Adding a template is one entry in TEXT_TEMPLATES — the UI
 * picks up anything whose `tool` matches the form it's rendered on.
 *
 * Same shape as the email templates in email-utils.ts: pure strings and pure
 * fill functions, no network calls.
 */

export interface TextTemplateField {
  /** Token name in the body, e.g. "amount" fills {amount} */
  key: string;
  label: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
}

export interface TextTemplate {
  id: string;
  /** Which form surfaces this template, e.g. "rd-waiver" */
  tool: string;
  /** Picker label */
  name: string;
  /** When to reach for this one */
  description: string;
  /** Message body with {client_name}, {sender_name} and any field tokens */
  body: string;
  /** Inputs beyond client name and sender name */
  fields?: TextTemplateField[];
  /**
   * Phrase describing this text in the Airtable log. May itself contain
   * tokens, so a logged amount matches the amount that was texted.
   */
  logSummary: string;
}

export const TEXT_TEMPLATES: TextTemplate[] = [
  {
    id: "rd-accept-part-be",
    tool: "rd-waiver",
    name: "RD Accept — Part B & E",
    description:
      "Acceptance covering both parts, with no dollar figure to quote yet.",
    body:
      "Hi {client_name}, this is {sender_name} with SWNA. The DOL has issued a " +
      "Recommended Decision of Acceptance for your claim under Part B & Part E. " +
      "I've submitted the waiver on your behalf so the claim can move forward. " +
      "There's nothing further you need to do at this time. I'll keep you " +
      "updated as soon as we receive the Final Decision.",
    logSummary: "RD acceptance (Part B & E)",
  },
  {
    id: "rd-accept-monetary",
    tool: "rd-waiver",
    name: "RD Accept — Monetary Value",
    description:
      "Acceptance with an award amount to quote, so payment can be processed.",
    body:
      "Hi {client_name}, this is {sender_name} with SWNA. The DOL has issued a " +
      "Recommended Decision of Acceptance for your claim in the amount of " +
      "${amount}. I've submitted the waiver on your behalf so payment can be " +
      "processed. There's nothing further you need to do at this time—I'll " +
      "update you once the Final Decision is issued.",
    fields: [
      {
        key: "amount",
        label: "Award Amount",
        placeholder: "150,000",
        helperText:
          "The accepted amount from the Recommended Decision, without the $",
        required: true,
      },
    ],
    logSummary: "RD acceptance (${amount})",
  },
];

/** Templates a given form should offer, in the order they're defined. */
export function getTemplatesForTool(tool: string): TextTemplate[] {
  return TEXT_TEMPLATES.filter((template) => template.tool === tool);
}

/**
 * Normalize a typed dollar amount for display: "85000" and "85,000" both come
 * back as "85,000". Anything that isn't a plain number is left alone so an
 * unusual entry still reaches the message rather than being silently mangled.
 */
export function formatAmount(raw: string): string {
  const digits = raw.replace(/[$,\s]/g, "");
  if (!digits || !/^\d+(\.\d{1,2})?$/.test(digits)) return raw.trim();

  const [whole, cents] = digits.split(".");
  const withSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return cents ? `${withSeparators}.${cents}` : withSeparators;
}

/**
 * Replace {token} placeholders with the supplied values. Unfilled tokens are
 * left visible in the output — a missing amount should read "{amount}" so it
 * can't be texted as a blank.
 */
export function fillTemplate(
  body: string,
  values: Record<string, string>
): string {
  return body.replace(/\{(\w+)\}/g, (token, key: string) => {
    const value = values[key];
    return value && value.trim() ? value.trim() : token;
  });
}
