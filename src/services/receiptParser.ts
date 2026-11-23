import { parseCurrencyInput } from '@/utils/money';

export interface ParsedReceiptData {
  merchant: string | null;
  amount_minor: number;
  transaction_date: string; // YYYY-MM-DD
  category_hint: string;
  confidence: number; // 0 to 1
  raw_lines: string[];
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  cat_food: ['cafe', 'coffee', 'restaurant', 'bakery', 'kitchen', 'starbucks', 'mcdonald', 'burger', 'pizza', 'swiggy', 'zomato', 'diner'],
  cat_groceries: ['mart', 'supermarket', 'grocery', 'bazaar', 'spencer', 'dmart', 'reliance', 'zepto', 'blinkit', 'instamart'],
  cat_health: ['pharmacy', 'chemist', 'hospital', 'clinic', 'medical', 'apollo', 'medplus'],
  cat_transport: ['fuel', 'petrol', 'diesel', 'cng', 'hpcl', 'bpcl', 'ioccl', 'uber', 'ola', 'metro'],
  cat_shopping: ['apparel', 'fashion', 'retail', 'clothing', 'zara', 'h&m', 'trends', 'decathlon'],
  cat_utilities: ['electricity', 'water', 'gas', 'broadband', 'telecom', 'airtel', 'jio'],
};

export const ReceiptParser = {
  parse(rawText: string): ParsedReceiptData {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let merchant: string | null = null;
    let amount_minor = 0;
    let transaction_date = new Date().toISOString().substring(0, 10);
    let category_hint = 'cat_general';
    let confidence = 0.5;

    // 1. Merchant Detection: Check the top 4 lines
    const ignoreMerchantKeywords = ['tax invoice', 'bill', 'receipt', 'welcome', 'gstin', 'cash memo', 'order'];
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      const isIgnored = ignoreMerchantKeywords.some((k) => lower.includes(k));
      if (!isIgnored && line.length >= 3 && !/\d{4,}/.test(line)) {
        merchant = line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
        break;
      }
    }

    // 2. Date Detection (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD MMM YYYY)
    const dateMatch = rawText.match(/\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})\b/);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      // Basic sanity check
      if (parseInt(month, 10) <= 12 && parseInt(day, 10) <= 31) {
        transaction_date = `${year}-${month}-${day}`;
        confidence += 0.2;
      }
    } else {
      const isoDateMatch = rawText.match(/\b(20\d{2})[\/\.-](\d{1,2})[\/\.-](\d{1,2})\b/);
      if (isoDateMatch) {
        transaction_date = `${isoDateMatch[1]}-${isoDateMatch[2].padStart(2, '0')}-${isoDateMatch[3].padStart(2, '0')}`;
        confidence += 0.2;
      }
    }

    // 3. Amount / Grand Total Detection
    // Prefer Grand Total or Net Amount over Subtotal by checking lines in reverse
    const grandTotalRegex = /(?:grand\s+total|net\s+payable|net\s+amount|amount\s+payable|bill\s+amount|total\s+amount)[\s:]*(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const basicTotalRegex = /\b(?:total)[\s:]*(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{2})?)/i;

    const grandMatch = rawText.match(grandTotalRegex);
    if (grandMatch && grandMatch[1]) {
      amount_minor = parseCurrencyInput(grandMatch[1]);
      confidence += 0.35;
    } else {
      // Check for standalone total from bottom up
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (!line.toLowerCase().includes('subtotal') && basicTotalRegex.test(line)) {
          const match = line.match(basicTotalRegex);
          if (match && match[1]) {
            amount_minor = parseCurrencyInput(match[1]);
            confidence += 0.25;
            break;
          }
        }
      }
    }

    if (amount_minor === 0) {
      // Fallback: look for the highest currency-like number at the bottom half
      const numbers = rawText.match(/(?:rs\.?|₹)?\s*([0-9,]+\.[0-9]{2})/gi);
      if (numbers && numbers.length > 0) {
        const parsedNums = numbers.map((n) => parseCurrencyInput(n));
        amount_minor = Math.max(...parsedNums);
        confidence += 0.1;
      }
    }

    // 4. Category Classification
    const fullLower = rawText.toLowerCase();
    for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((k) => fullLower.includes(k))) {
        category_hint = catId;
        break;
      }
    }

    return {
      merchant,
      amount_minor,
      transaction_date,
      category_hint,
      confidence: Math.min(confidence, 1.0),
      raw_lines: lines,
    };
  },
};
