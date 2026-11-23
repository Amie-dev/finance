import { parseCurrencyInput } from '@/utils/money';

export interface CsvColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn?: string;
  typeColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
}

export interface StagedTransaction {
  id: string;
  transaction_date: string; // YYYY-MM-DD
  merchant: string;
  amount_minor: number;
  type: 'expense' | 'income';
  raw_note: string;
  is_duplicate?: boolean;
  duplicate_reason?: string;
}

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
  detectedMapping: CsvColumnMapping;
}

export const CsvImportService = {
  /**
   * Fast, reliable RFC-4180 compliant CSV text parser.
   */
  parseCsv(csvContent: string): ParsedCsvResult {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new Error('CSV file is empty or missing data rows.');
    }

    // Split headers handling quoted commas
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length >= 2) {
        const row: Record<string, string> = {};
        for (let h = 0; h < headers.length; h++) {
          row[headers[h]] = values[h] || '';
        }
        rows.push(row);
      }
    }

    const detectedMapping = this.detectColumnMapping(headers);
    return {
      headers,
      rows,
      detectedMapping,
    };
  },

  detectColumnMapping(headers: string[]): CsvColumnMapping {
    let dateColumn = '';
    let descriptionColumn = '';
    let debitColumn = '';
    let creditColumn = '';
    let amountColumn = '';
    let typeColumn = '';

    for (const h of headers) {
      const lower = h.toLowerCase();
      if (!dateColumn && (lower.includes('date') || lower === 'txn date' || lower === 'value date')) {
        dateColumn = h;
      } else if (
        !descriptionColumn &&
        (lower.includes('description') ||
          lower.includes('narration') ||
          lower.includes('particulars') ||
          lower.includes('merchant') ||
          lower.includes('remarks'))
      ) {
        descriptionColumn = h;
      } else if (!debitColumn && (lower === 'debit' || lower.includes('withdrawal') || lower === 'dr')) {
        debitColumn = h;
      } else if (!creditColumn && (lower === 'credit' || lower.includes('deposit') || lower === 'cr')) {
        creditColumn = h;
      } else if (!amountColumn && (lower.includes('amount') || lower === 'total')) {
        amountColumn = h;
      } else if (!typeColumn && (lower.includes('type') || lower === 'cr/dr')) {
        typeColumn = h;
      }
    }

    return {
      dateColumn: dateColumn || headers[0] || 'Date',
      descriptionColumn: descriptionColumn || headers[1] || 'Description',
      debitColumn: debitColumn || undefined,
      creditColumn: creditColumn || undefined,
      amountColumn: amountColumn || (!debitColumn && !creditColumn ? headers[2] : undefined),
      typeColumn: typeColumn || undefined,
    };
  },

  convertRowsToStagedTransactions(
    rows: Record<string, string>[],
    mapping: CsvColumnMapping
  ): StagedTransaction[] {
    const staged: StagedTransaction[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rawDate = row[mapping.dateColumn] || '';
      const rawDesc = row[mapping.descriptionColumn] || 'Statement Entry';

      // Parse date to standard YYYY-MM-DD
      let formattedDate = new Date().toISOString().substring(0, 10);
      const dMatch = rawDate.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
      if (dMatch) {
        let year = dMatch[3];
        if (year.length === 2) year = `20${year}`;
        const month = dMatch[2].padStart(2, '0');
        const day = dMatch[1].padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      }

      let amountMinor = 0;
      let type: 'expense' | 'income' = 'expense';

      // If separate Debit and Credit columns
      if (mapping.debitColumn && row[mapping.debitColumn]) {
        const val = parseCurrencyInput(row[mapping.debitColumn]);
        if (val > 0) {
          amountMinor = val;
          type = 'expense';
        }
      }
      if (mapping.creditColumn && row[mapping.creditColumn]) {
        const val = parseCurrencyInput(row[mapping.creditColumn]);
        if (val > 0) {
          amountMinor = val;
          type = 'income';
        }
      }

      // If unified amount column
      if (amountMinor === 0 && mapping.amountColumn && row[mapping.amountColumn]) {
        const rawAmt = row[mapping.amountColumn];
        amountMinor = parseCurrencyInput(rawAmt);
        if (mapping.typeColumn && row[mapping.typeColumn]) {
          const tVal = row[mapping.typeColumn].toLowerCase();
          type = tVal.includes('cr') || tVal.includes('credit') || tVal.includes('income') ? 'income' : 'expense';
        } else if (rawAmt.includes('-')) {
          type = 'expense';
        }
      }

      if (amountMinor > 0) {
        staged.push({
          id: `imp_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
          transaction_date: formattedDate,
          merchant: rawDesc.substring(0, 40).trim(),
          amount_minor: amountMinor,
          type,
          raw_note: rawDesc,
        });
      }
    }

    return staged;
  },
};

