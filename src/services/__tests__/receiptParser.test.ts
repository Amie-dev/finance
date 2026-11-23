import { describe, it, expect } from 'bun:test';
import { ReceiptParser } from '../receiptParser';

describe('SmartMoney Receipt Parser', () => {
  it('extracts merchant, grand total, date, and category hint from retail receipt', () => {
    const receiptText = `
STARBUCKS COFFEE
INDIRANAGAR BANGALORE
GSTIN: 29ABCDE1234F1Z5
DATE: 23/11/2026
1 CAFFE LATTE 280.00
1 MUFFIN 220.00
SUBTOTAL 500.00
GRAND TOTAL: ₹ 525.00
THANK YOU
    `.trim();

    const parsed = ReceiptParser.parse(receiptText);

    expect(parsed.merchant).toBe('STARBUCKS COFFEE');
    expect(parsed.amount_minor).toBe(52500); // 525.00 INR = 52500 paise
    expect(parsed.transaction_date).toBe('2026-11-23');
    expect(parsed.category_hint).toBe('cat_food');
    expect(parsed.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('detects grocery category and parses alternate date format', () => {
    const supermarketBill = `
DMART SUPERMARKET
HYDERABAD STORE
TAX INVOICE
DATE: 2026-11-05
ATTA 10KG 450.00
RICE 5KG 320.00
COOKING OIL 210.00
TOTAL AMOUNT: 980.00
VISIT AGAIN
    `.trim();

    const parsed = ReceiptParser.parse(supermarketBill);

    expect(parsed.merchant).toBe('DMART SUPERMARKET');
    expect(parsed.amount_minor).toBe(98000);
    expect(parsed.transaction_date).toBe('2026-11-05');
    expect(parsed.category_hint).toBe('cat_groceries');
  });

  it('handles receipts with net amount due formatting', () => {
    const pharmacyBill = `
APOLLO PHARMACY
INVOICE #92019
DATE: 12/10/2026
MEDICINES 340.00
NET PAYABLE: 340.00
    `.trim();

    const parsed = ReceiptParser.parse(pharmacyBill);

    expect(parsed.merchant).toBe('APOLLO PHARMACY');
    expect(parsed.amount_minor).toBe(34000);
    expect(parsed.transaction_date).toBe('2026-10-12');
    expect(parsed.category_hint).toBe('cat_health');
  });
});
