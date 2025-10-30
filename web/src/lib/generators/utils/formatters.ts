/**
 * Utility functions for formatting data in PDF generators
 */

/**
 * Formats a name from "First Last" to "Last, First"
 */
export function formatNameLastFirst(name: string): string {
  try {
    const trimmedName = name.trim();
    const parts = trimmedName.split(' ');

    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' '); // Handle multiple last names
      return `${lastName}, ${firstName}`;
    }

    return name; // Fallback to original if can't parse
  } catch {
    return name;
  }
}

/**
 * Formats a phone number by extracting area code, prefix, and line number
 * Expects format like "123-456-7890" or "(123) 456-7890"
 */
export function parsePhoneNumber(phone: string): {
  areaCode: string;
  prefix: string;
  lineNumber: string;
} {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  if (digits.length >= 10) {
    return {
      areaCode: digits.slice(0, 3),
      prefix: digits.slice(3, 6),
      lineNumber: digits.slice(6, 10),
    };
  }

  // Fallback if phone format is unexpected
  return {
    areaCode: '',
    prefix: '',
    lineNumber: '',
  };
}

/**
 * Formats current date as MM/DD/YYYY
 */
export function formatDateMMDDYYYY(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Formats current date as MM.DD.YY for filenames
 */
export function formatDateMMDDYY(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}.${day}.${year}`;
}

/**
 * Generates filename from client name
 * "First Last" -> "F.Last"
 */
export function generateFilenameFromName(name: string): string {
  try {
    const parts = name.trim().split(' ', 2);
    if (parts.length === 2) {
      const [first, last] = parts;
      return `${first[0]}.${last}`;
    }
    return name.replace(/\s+/g, '_');
  } catch {
    return name.replace(/\s+/g, '_');
  }
}
