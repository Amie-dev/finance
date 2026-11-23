/**
 * SmartMoney Money Utility & Minor Units Calculator
 *
 * All financial calculations must strictly operate in minor units (paise / cents).
 * Floating-point representation is forbidden for internal balances and queries.
 * Example: ₹1,450.00 is stored as 145000 paise.
 */

export interface FormatCurrencyOptions {
  currency?: string;
  hideSymbol?: boolean;
  compact?: boolean;
}

export function formatCurrency(
  amountMinor: number,
  options: FormatCurrencyOptions = {}
): string {
  const { currency = 'INR', hideSymbol = false, compact = false } = options;
  const majorUnits = amountMinor / 100;

  if (compact && Math.abs(majorUnits) >= 10000000) {
    // Crores
    const cr = (majorUnits / 10000000).toFixed(2);
    return `${hideSymbol ? '' : '₹'}${cr} Cr`;
  }
  if (compact && Math.abs(majorUnits) >= 100000) {
    // Lakhs
    const lk = (majorUnits / 100000).toFixed(2);
    return `${hideSymbol ? '' : '₹'}${lk} L`;
  }

  // Format using Indian Numbering System (e.g. 1,50,000.00)
  const isNegative = majorUnits < 0;
  const absValue = Math.abs(majorUnits);
  const parts = absValue.toFixed(2).split('.');
  const wholePart = parts[0];
  const decimalPart = parts[1];

  let formattedWhole = '';
  if (wholePart.length <= 3) {
    formattedWhole = wholePart;
  } else {
    const lastThree = wholePart.substring(wholePart.length - 3);
    const otherDigits = wholePart.substring(0, wholePart.length - 3);
    const withCommas = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedWhole = `${withCommas},${lastThree}`;
  }

  const symbol = hideSymbol ? '' : currency === 'INR' ? '₹' : '$';
  const prefix = isNegative ? '-' : '';

  return `${prefix}${symbol}${formattedWhole}.${decimalPart}`;
}

export function parseCurrencyInput(input: string): number {
  if (!input) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = input.replace(/[^\d.-]/g, '');
  const floatVal = parseFloat(cleaned);
  if (isNaN(floatVal)) return 0;
  // Convert to integer minor units rounding properly
  return Math.round(floatVal * 100);
}

export function addMoney(aMinor: number, bMinor: number): number {
  return Math.trunc(aMinor) + Math.trunc(bMinor);
}

export function subtractMoney(aMinor: number, bMinor: number): number {
  return Math.trunc(aMinor) - Math.trunc(bMinor);
}

export function calculateProgressPercentage(spentMinor: number, limitMinor: number): number {
  if (limitMinor <= 0) return 0;
  return Math.min(Math.round((spentMinor / limitMinor) * 100), 100);
}

