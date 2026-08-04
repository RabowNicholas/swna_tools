/**
 * The house format for entries the app writes to a client's Airtable Log, so
 * every tool's entries read the same way and stay greppable by the TOOLS APP
 * suffix.
 *
 *   "<action> via Tools App. Triggered by [email] MM.DD.YY. TOOLS APP"
 *
 * `action` should read as a completed act with any detail in parentheses, e.g.
 * "Submitted RD waiver, Option 1 (waive all rights) (*12345)".
 */
export function buildLogEntry(
  action: string,
  userEmail?: string | null
): string {
  const now = new Date();
  const logDate = `${String(now.getMonth() + 1).padStart(2, "0")}.${String(
    now.getDate()
  ).padStart(2, "0")}.${String(now.getFullYear()).slice(-2)}`;

  return `${action} via Tools App. Triggered by [${
    userEmail || "unknown"
  }] ${logDate}. TOOLS APP`;
}
