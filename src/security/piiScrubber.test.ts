import { describe, it, expect } from 'bun:test';
import { scrubText } from './piiScrubber';

describe('SmartMoney Local PII Scrubber', () => {
  it('returns clean text unchanged', () => {
    const text = 'Lunch at Cafe Coffee Day with colleagues';
    const result = scrubText(text);
    expect(result.scrubbedText).toBe(text);
    expect(result.hasRedactions).toBe(false);
    expect(result.redactedTypes.length).toBe(0);
  });

  it('redacts Indian phone numbers', () => {
    const test1 = 'Call Rohan on 9876543210 for share';
    expect(scrubText(test1).scrubbedText).toBe('Call Rohan on [PHONE] for share');

    const test2 = 'Paid +91 9820012345 for groceries';
    expect(scrubText(test2).scrubbedText).toBe('Paid [PHONE] for groceries');
  });

  it('redacts UPI IDs', () => {
    const test1 = 'Sent rent via rahul@okhdfcbank';
    const res1 = scrubText(test1);
    expect(res1.scrubbedText).toBe('Sent rent via [UPI_ID]');
    expect(res1.hasRedactions).toBe(true);

    const test2 = 'Refund from merchant 9876543210@paytm';
    expect(scrubText(test2).scrubbedText).toBe('Refund from merchant [UPI_ID]');
  });

  it('redacts email addresses', () => {
    const text = 'Sent invoice copy to john.doe@example.com for reimbursement';
    expect(scrubText(text).scrubbedText).toBe('Sent invoice copy to [EMAIL] for reimbursement');
  });

  it('redacts credit and debit card numbers', () => {
    const text = 'Used card 4111 2222 3333 4444 for laptop purchase';
    expect(scrubText(text).scrubbedText).toBe('Used card [CARD_NUMBER] for laptop purchase');
  });

  it('redacts Indian PAN and Aadhaar numbers', () => {
    const panText = 'Tax TDS deducted with PAN ABCDE1234F';
    expect(scrubText(panText).scrubbedText).toBe('Tax TDS deducted with PAN [GOVT_ID]');

    const aadhaarText = 'KYC verification with Aadhaar 5432 1098 7654';
    expect(scrubText(aadhaarText).scrubbedText).toBe('KYC verification with Aadhaar [GOVT_ID]');
  });

  it('redacts sensitive credentials (OTP, CVV, PIN)', () => {
    const text = 'Transaction approval OTP: 492019 do not share';
    expect(scrubText(text).scrubbedText).toBe('Transaction approval [CREDENTIAL_REDACTED] do not share');
  });

  it('handles multiple mixed PII patterns in a single note', () => {
    const mixed = 'Rohan (9876543210, rohan@gmail.com) paid 4111-2222-3333-4444 via rohan@paytm';
    const result = scrubText(mixed);
    expect(result.scrubbedText).toBe('Rohan ([PHONE], [EMAIL]) paid [CARD_NUMBER] via [UPI_ID]');
    expect(result.hasRedactions).toBe(true);
    expect(result.redactedTypes).toContain('PHONE');
    expect(result.redactedTypes).toContain('EMAIL');
    expect(result.redactedTypes).toContain('CARD');
    expect(result.redactedTypes).toContain('UPI');
  });
});
