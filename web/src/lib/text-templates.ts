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
   * Derives extra tokens from what was typed into `fields`, for a value the
   * client shouldn't have to compute by hand — e.g. a dollar figure from a
   * percentage. Runs after the raw field values are collected, so a returned
   * token can override one of the same name.
   */
  computeTokens?: (fieldValues: Record<string, string>) => Record<string, string>;
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
      "There's nothing further you need to do at this time. I'll update you as " +
      "soon as the Final Decision is issued. If you have any questions, feel " +
      "free to give me a call.",
    logSummary: "RD acceptance (Part B & E)",
  },
  {
    id: "rd-accept-part-e",
    tool: "rd-waiver",
    name: "RD Accept — Part E Only",
    description:
      "Acceptance covering Part E only, with no dollar figure to quote yet.",
    body:
      "Hi {client_name}, this is {sender_name} with SWNA. The DOL has issued a " +
      "Recommended Decision of Acceptance for your claim under Part E. I've " +
      "submitted the waiver on your behalf so the claim can move forward. " +
      "There's nothing further you need to do at this time. I'll update you as " +
      "soon as the Final Decision is issued. If you have any questions, feel " +
      "free to give me a call.",
    logSummary: "RD acceptance (Part E)",
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
      "processed. There's nothing further you need to do at this time. I'll " +
      "update you as soon as the Final Decision is issued. If you have any " +
      "questions, feel free to give me a call.",
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
  {
    id: "en16-submitted",
    tool: "en16",
    name: "EN-16 Submitted",
    description:
      "A questionnaire came in with a DOL letter and we've filled it out and sent it back.",
    body:
      "Hi {client_name}, this is {sender_name} with SWNA. We received a letter " +
      "from the DOL with a questionnaire attached. We've submitted one of " +
      "these for you before, so I've gone ahead and filled this one out and " +
      "submitted it as well. There's nothing further you need to do at this " +
      "time. If you have any questions, feel free to give me a call.",
    logSummary: "EN-16 questionnaire",
  },
  {
    id: "ir-report-submitted",
    tool: "text-message",
    name: "IR Report Submitted",
    description:
      "A new impairment rating came back and has been submitted to the DOL.",
    body:
      "Hi {client_name} this is {sender_name} with SWNA. We just received your " +
      "new impairment report. Your doctor rated you at {percentage}%, up from " +
      "your previous rating of {previous_percentage}%, and I've submitted that " +
      "report to the Department of Labor for review.\n" +
      "For compensation, every 1% is worth $2,500 under Part E. At " +
      "{percentage}%, this equals ${amount} in potential compensation if the " +
      "DOL accepts the rating — an increase of ${increase_amount} over your " +
      "previous rating.\n" +
      "I'll keep you updated as soon as we hear back from them. Let me know if " +
      "you have any questions.",
    fields: [
      {
        key: "previous_percentage",
        label: "Previous Impairment Rating (%)",
        placeholder: "15",
        helperText: "The rating from their last impairment report",
        required: true,
      },
      {
        key: "percentage",
        label: "Impairment Rating (%)",
        placeholder: "25",
        helperText: "The rating from the new impairment report",
        required: true,
      },
    ],
    // $2,500 per percentage point under Part E — the client never types the
    // dollar figures, they're derived from the ratings so they can't drift
    // apart from what's typed into the fields.
    computeTokens: (fieldValues): Record<string, string> => {
      const percentage = parseFloat(fieldValues.percentage);
      const previousPercentage = parseFloat(fieldValues.previous_percentage);
      if (!Number.isFinite(percentage)) return {};

      const tokens: Record<string, string> = {
        amount: formatAmount(String(percentage * 2500)),
      };
      if (Number.isFinite(previousPercentage)) {
        tokens.increase_amount = formatAmount(
          String((percentage - previousPercentage) * 2500)
        );
      }
      return tokens;
    },
    logSummary:
      "IR report submitted ({previous_percentage}% → {percentage}%, " +
      "${amount}, +${increase_amount})",
  },
];

/**
 * Templates a given form should offer, in the order they're defined. Omit
 * `tool` to get every template regardless of which form it belongs to — used
 * by the standalone text-message tool, which isn't tied to one document flow.
 */
export function getTemplatesForTool(tool?: string): TextTemplate[] {
  return tool
    ? TEXT_TEMPLATES.filter((template) => template.tool === tool)
    : TEXT_TEMPLATES;
}

/**
 * The name to greet someone by in a text. Client records hold "Last, First -
 * 1234", which the forms parse to "First Last" for the documents they
 * generate — but a text that opens with someone's full legal name reads like a
 * form letter, so only the first name carries through to the greeting.
 *
 * A name of one word comes back unchanged, and the field stays editable for
 * the people this guesses wrong: someone who goes by a middle name, a
 * two-word first name, anyone whose record was typed in a different shape.
 */
export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
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
