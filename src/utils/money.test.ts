import { describe, it, expect } from 'bun:test';
import {
  formatCurrency,
  parseCurrencyInput,
  addMoney,
  subtractMoney,
  calculateProgressPercentage,
} from './money';

describe('SmartMoney Money Utility', () => {
  it('formats standard INR amounts with minor units (paise)', () => {
    expect(formatCurrency(145000)).toBe('₹1,450.00');
    expect(formatCurrency(0)).toBe('₹0.00');
    expect(formatCurrency(50)).toBe('₹0.50');
    expect(formatCurrency(99)).toBe('₹0.99');
    expect(formatCurrency(100)).toBe('₹1.00');
  });

  it('formats large amounts using Indian numbering system', () => {
    // 1 Lakh = 1,00,000.00 = 10,000,000 paise
    expect(formatCurrency(10000000)).toBe('₹1,00,000.00');
    // 10 Lakhs = 10,00,000.00 = 100,000,000 paise
    expect(formatCurrency(100000000)).toBe('₹10,00,000.00');
    // 1 Crore = 1,00,00,000.00 = 1,000,000,000 paise
    expect(formatCurrency(1000000000)).toBe('₹1,00,00,000.00');
  });

  it('formats negative balances cleanly', () => {
    expect(formatCurrency(-250000)).toBe('-₹2,500.00');
  });

  it('formats compact representations correctly', () => {
    // 25 Lakhs (25,00,000.00 = 250,000,000 paise)
    expect(formatCurrency(250000000, { compact: true })).toBe('₹25.00 L');
    // 1.5 Crores (1,50,00,000.00 = 1,500,000,000 paise)
    expect(formatCurrency(1500000000, { compact: true })).toBe('₹1.50 Cr');
  });

  it('parses user currency input into integer minor units', () => {
    expect(parseCurrencyInput('1450')).toBe(145000);
    expect(parseCurrencyInput('1,450.00')).toBe(145000);
    expect(parseCurrencyInput('₹1,450.50')).toBe(145050);
    expect(parseCurrencyInput('0.25')).toBe(25);
    expect(parseCurrencyInput('')).toBe(0);
    expect(parseCurrencyInput('abc')).toBe(0);
  });

  it('executes integer arithmetic without floating point drift', () => {
    // 0.1 + 0.2 float problem: in integers, 10 + 20 = 30 paise
    expect(addMoney(10, 20)).toBe(30);
    expect(subtractMoney(10000, 3500)).toBe(6500);
  });

  it('calculates budget progress percentage accurately', () => {
    expect(calculateProgressPercentage(50000, 100000)).toBe(50);
    expect(calculateProgressPercentage(120000, 100000)).toBe(100);
    expect(calculateProgressPercentage(0, 100000)).toBe(0);
  });
});

