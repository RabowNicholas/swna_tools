// The rules for the name and initials people set in Settings, shared by the
// form and the route that saves them.

export const NAME_MAX = 50;

/** "nr " → "NR" */
export function cleanInitials(raw: string): string {
  return raw.replace(/[^a-z]/gi, "").toUpperCase();
}

/** What's wrong with the pair, or null if it's fine */
export function profileError(name: string, initials: string): string | null {
  if (!name.trim()) return "Enter your name.";
  if (name.trim().length > NAME_MAX) return `Keep your name under ${NAME_MAX} characters.`;
  if (!/^[A-Z]{1,4}$/.test(initials)) return "Initials are 1 to 4 letters.";
  return null;
}
