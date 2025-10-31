/**
 * Client Data Validation Utilities
 * Matches validation rules from Streamlit client_data_manager.py
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate email format
 * Matches Streamlit regex: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
 */
export function validateEmail(email: string | undefined): string | null {
  if (!email || email.trim() === '') {
    return null; // Email is optional
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }

  return null;
}

/**
 * Validate phone number
 * Accepts any format (flexible like Streamlit)
 * Just ensures it has enough digits
 */
export function validatePhone(phone: string | undefined): string | null {
  if (!phone || phone.trim() === '') {
    return null; // Phone is optional
  }

  // Extract digits only
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 10) {
    return 'Phone number must have at least 10 digits';
  }

  if (digits.length > 11) {
    return 'Phone number has too many digits';
  }

  return null;
}

/**
 * Validate Social Security Number
 * Must be exactly 9 digits (Streamlit removes dashes automatically)
 */
export function validateSSN(ssn: string | undefined): string | null {
  if (!ssn || ssn.trim() === '') {
    return null; // SSN is optional for display purposes
  }

  // Remove any non-digit characters
  const digits = ssn.replace(/\D/g, '');

  if (digits.length !== 9) {
    return 'SSN must be exactly 9 digits';
  }

  return null;
}

/**
 * Validate ZIP code
 * Must be exactly 5 digits (Streamlit requirement)
 */
export function validateZipCode(zip: string | undefined): string | null {
  if (!zip || zip.trim() === '') {
    return null; // ZIP is optional
  }

  // Remove any non-digit characters
  const digits = zip.replace(/\D/g, '');

  if (digits.length !== 5) {
    return 'ZIP code must be exactly 5 digits';
  }

  return null;
}

/**
 * Validate Date of Birth
 * Must be between 1900-01-01 and today (Streamlit requirement)
 */
export function validateDateOfBirth(dob: string | undefined): string | null {
  if (!dob || dob.trim() === '') {
    return null; // DOB is optional
  }

  const date = new Date(dob);

  // Check if valid date
  if (isNaN(date.getTime())) {
    return 'Please enter a valid date';
  }

  // Check minimum date (1900-01-01)
  const minDate = new Date('1900-01-01');
  if (date < minDate) {
    return 'Date of birth cannot be before 1900';
  }

  // Check maximum date (today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) {
    return 'Date of birth cannot be in the future';
  }

  return null;
}

/**
 * Validate street address
 */
export function validateStreetAddress(address: string | undefined): string | null {
  if (!address || address.trim() === '') {
    return null; // Optional
  }

  if (address.trim().length < 3) {
    return 'Street address is too short';
  }

  return null;
}

/**
 * Validate city name
 */
export function validateCity(city: string | undefined): string | null {
  if (!city || city.trim() === '') {
    return null; // Optional
  }

  if (city.trim().length < 2) {
    return 'City name is too short';
  }

  return null;
}

/**
 * Validate state
 * Accepts full names or abbreviations
 */
export function validateState(state: string | undefined): string | null {
  if (!state || state.trim() === '') {
    return null; // Optional
  }

  const trimmed = state.trim();

  // Must be at least 2 characters
  if (trimmed.length < 2) {
    return 'Please enter a valid state';
  }

  return null;
}

/**
 * Validate all client fields
 * Returns validation result with all errors
 */
export function validateClientData(data: {
  email?: string;
  phone?: string;
  ssn?: string;
  dob?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate each field
  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const phoneError = validatePhone(data.phone);
  if (phoneError) errors.phone = phoneError;

  const ssnError = validateSSN(data.ssn);
  if (ssnError) errors.ssn = ssnError;

  const dobError = validateDateOfBirth(data.dob);
  if (dobError) errors.dob = dobError;

  const streetError = validateStreetAddress(data.street);
  if (streetError) errors.street = streetError;

  const cityError = validateCity(data.city);
  if (cityError) errors.city = cityError;

  const stateError = validateState(data.state);
  if (stateError) errors.state = stateError;

  const zipError = validateZipCode(data.zip);
  if (zipError) errors.zip = zipError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Format phone number for display (optional utility)
 * Converts to (XXX) XXX-XXXX format if possible
 */
export function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone; // Return as-is if can't format
}

/**
 * Format SSN for display (XXX-XX-XXXX)
 * Only use for display, never store with dashes
 */
export function formatSSN(ssn: string | undefined): string {
  if (!ssn) return '';

  const digits = ssn.replace(/\D/g, '');

  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  return ssn; // Return as-is if can't format
}

/**
 * Format date for input field (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | undefined): string {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}
