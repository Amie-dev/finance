/**
 * SmartMoney Local PII Scrubber
 *
 * Scans notes, transaction descriptions, and metadata to redact
 * Personally Identifiable Information (PII) before any external API
 * or embedding call is performed.
 */

export interface ScrubResult {
  scrubbedText: string;
  hasRedactions: boolean;
  redactedTypes: string[];
}

// 1. Email pattern
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;

// 2. UPI ID pattern (e.g., user@okhdfcbank, 9876543210@paytm, merchant@upi)
// Checked after email so standard email domains with dots are handled,
// but UPI handles typically don't have dots in the bank code or handle common VPA domains.
const UPI_REGEX = /\b[a-zA-Z0-9._-]{2,40}@(okaxis|okhdfcbank|oksbi|okicici|paytm|ybl|ibl|axl|upi|apl|icici|hdfcbank|sbi|postbank|barodampay|federal)\b/gi;
const GENERIC_UPI_REGEX = /\b[a-zA-Z0-9._-]{2,40}@[a-zA-Z]{3,20}\b/gi;

// 3. Indian PAN Card: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g;

// 4. Credit / Debit Card: 16 digits (with or without dashes/spaces)
const CARD_REGEX = /\b(?:\d{4}[ -]){3}\d{4}\b|\b\d{16}\b/g;

// 5. Indian Aadhaar: 12 digits formatted as 4-4-4 (e.g. 5432 1098 7654)
const AADHAAR_FORMATTED_REGEX = /\b[2-9]{1}\d{3}\s\d{4}\s\d{4}\b/g;

// 6. Indian Mobile Numbers: +91 followed by 10 digits, or standalone 10 digits starting with 6, 7, 8, 9
const PHONE_PREFIX_REGEX = /(?:\+91\s?|91\s?)?[6-9]\d{9}\b/g;

// 7. Sensitive tokens (OTP, CVV, PIN, Password)
const SENSITIVE_CREDENTIALS_REGEX = /\b(?:otp|cvv|pin|password|passcode)[:\s=]+([a-zA-Z0-9]{3,10})\b/gi;

function isValidLuhn(digitsOnly: string): boolean {
  if (digitsOnly.length < 13 || digitsOnly.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digitsOnly.length - 1; i >= 0; i--) {
    let digit = parseInt(digitsOnly.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function scrubText(text: string | null | undefined): ScrubResult {
  if (!text || text.trim() === '') {
    return {
      scrubbedText: text || '',
      hasRedactions: false,
      redactedTypes: [],
    };
  }

  let result = text;
  const redactedTypes: Set<string> = new Set();

  // 1. Scrub credentials (OTP, CVV, PIN)
  if (SENSITIVE_CREDENTIALS_REGEX.test(result)) {
    result = result.replace(SENSITIVE_CREDENTIALS_REGEX, '[CREDENTIAL_REDACTED]');
    redactedTypes.add('CREDENTIAL');
  }

  // 2. Scrub Payment Cards (16 digits formatted or passing Luhn)
  result = result.replace(CARD_REGEX, (match) => {
    const cleanDigits = match.replace(/\D/g, '');
    if (cleanDigits.length === 16 || isValidLuhn(cleanDigits)) {
      redactedTypes.add('CARD');
      return '[CARD_NUMBER]';
    }
    return match;
  });

  // 3. Scrub Indian PAN
  if (PAN_REGEX.test(result)) {
    result = result.replace(PAN_REGEX, '[GOVT_ID]');
    redactedTypes.add('PAN');
  }

  // 4. Scrub Aadhaar
  if (AADHAAR_FORMATTED_REGEX.test(result)) {
    result = result.replace(AADHAAR_FORMATTED_REGEX, '[GOVT_ID]');
    redactedTypes.add('AADHAAR');
  }

  // 5. Scrub Email Addresses
  if (EMAIL_REGEX.test(result)) {
    result = result.replace(EMAIL_REGEX, '[EMAIL]');
    redactedTypes.add('EMAIL');
  }

  // 6. Scrub UPI IDs
  if (UPI_REGEX.test(result)) {
    result = result.replace(UPI_REGEX, '[UPI_ID]');
    redactedTypes.add('UPI');
  } else if (GENERIC_UPI_REGEX.test(result)) {
    result = result.replace(GENERIC_UPI_REGEX, (match) => {
      // Don't replace if it looks like a file name or was already handled
      if (match.includes('.com') || match.includes('.in') || match.includes('.org')) {
        return '[EMAIL]';
      }
      redactedTypes.add('UPI');
      return '[UPI_ID]';
    });
  }

  // 7. Scrub Phone Numbers
  result = result.replace(PHONE_PREFIX_REGEX, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))) {
      redactedTypes.add('PHONE');
      return '[PHONE]';
    }
    return match;
  });

  return {
    scrubbedText: result,
    hasRedactions: redactedTypes.size > 0,
    redactedTypes: Array.from(redactedTypes),
  };
}
