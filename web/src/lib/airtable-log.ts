/**
 * The house format for entries the app writes to a client's Airtable Log,
 * shaped like the ones people write by hand: the date, then their initials.
 *
 *   "<action> via Tools App. M.D.YY INITIALS"
 *
 * `action` should read as a completed act with any detail in parentheses, e.g.
 * "Submitted RD waiver, Option 1 (waive all rights) (*12345)".
 *
 * `signer` is the person's initials (session.user.initials, set in Settings),
 * falling back to their name.
 */
export function buildLogEntry(action: string, signer?: string | null): string {
  const now = new Date();
  const logDate = `${now.getMonth() + 1}.${now.getDate()}.${String(now.getFullYear()).slice(-2)}`;

  return `${action} via Tools App. ${logDate} ${signer?.trim() || "Unknown"}`;
}

/** Who to sign a Log entry as: initials, or the name if there are none */
export function signerOf(
  user?: { initials?: string | null; name?: string | null } | null
): string | undefined {
  return user?.initials?.trim() || user?.name?.trim() || undefined;
}
