import { DatabaseClient } from '@/db/types';
import { StagedTransaction } from './csvImportService';

export const DuplicateDetectionService = {
  /**
   * Scans staged transactions against existing records in SQLite.
   * Matches exact account_id, amount_minor, and transaction_date.
   */
  async flagDuplicates(
    client: DatabaseClient,
    accountId: string,
    stagedList: StagedTransaction[]
  ): Promise<StagedTransaction[]> {
    if (stagedList.length === 0) return [];

    // Query existing transactions for this account
    const existing = await client.execute<{
      amount_minor: number;
      transaction_date: string;
      merchant: string | null;
    }>(
      `SELECT amount_minor, transaction_date, merchant 
       FROM transactions 
       WHERE account_id = ?;`,
      [accountId]
    );

    // Build fast lookup set
    const existingKeys = new Set(
      existing.map((e) => `${e.transaction_date}_${e.amount_minor}`)
    );

    return stagedList.map((item) => {
      const key = `${item.transaction_date}_${item.amount_minor}`;
      if (existingKeys.has(key)) {
        return {
          ...item,
          is_duplicate: true,
          duplicate_reason: `Matches existing transaction on ${item.transaction_date} for ₹${(item.amount_minor / 100).toFixed(2)}`,
        };
      }
      return {
        ...item,
        is_duplicate: false,
      };
    });
  },
};
