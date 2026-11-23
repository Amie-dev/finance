import { describe, it, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { migration001 } from '@/db/migrations/001_initial_schema';
import { DatabaseClient } from '@/db/types';
import { AccountRepository } from '@/db/repositories/accountRepository';
import { TransactionRepository } from '@/db/repositories/transactionRepository';
import { CsvImportService } from '../csvImportService';
import { DuplicateDetectionService } from '../duplicateDetection';

class BunSqliteAdapter implements DatabaseClient {
  private db: Database;
  constructor(db: Database) {
    this.db = db;
  }
  async execute<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }
  async executeMutation(sql: string, params: any[] = []): Promise<{ rowsAffected: number; insertId?: number }> {
    const res = this.db.prepare(sql).run(...params);
    return { rowsAffected: res.changes, insertId: Number(res.lastInsertRowid) };
  }
  async transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = await callback(this);
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }
}

describe('SmartMoney CSV Statement Import & Duplicate Detection', () => {
  it('parses multi-column bank statement with Debit and Credit headers', () => {
    const csvContent = `Date,Narration,Withdrawal (Dr),Deposit (Cr),Balance
15/11/2026,UPI/SWIGGY/12345/Food,450.00,,9550.00
16/11/2026,SALARY CREDIT CORP,,75000.00,84550.00
18/11/2026,AMAZON RETAIL,1299.00,,83251.00`;

    const parsed = CsvImportService.parseCsv(csvContent);
    expect(parsed.rows.length).toBe(3);
    expect(parsed.detectedMapping.dateColumn).toBe('Date');
    expect(parsed.detectedMapping.descriptionColumn).toBe('Narration');
    expect(parsed.detectedMapping.debitColumn).toBe('Withdrawal (Dr)');
    expect(parsed.detectedMapping.creditColumn).toBe('Deposit (Cr)');

    const staged = CsvImportService.convertRowsToStagedTransactions(
      parsed.rows,
      parsed.detectedMapping
    );

    expect(staged.length).toBe(3);
    expect(staged[0].amount_minor).toBe(45000);
    expect(staged[0].type).toBe('expense');
    expect(staged[0].transaction_date).toBe('2026-11-15');

    expect(staged[1].amount_minor).toBe(7500000);
    expect(staged[1].type).toBe('income');
    expect(staged[1].transaction_date).toBe('2026-11-16');
  });

  it('detects existing duplicate transactions correctly', async () => {
    const db = new Database(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    for (const stmt of migration001.up) db.run(stmt);
    const client = new BunSqliteAdapter(db);

    await AccountRepository.create(client, {
      id: 'acc_bank',
      name: 'HDFC',
      type: 'bank',
      initial_balance: 1000000,
      currency: 'INR',
    });

    // Seed existing transaction
    await TransactionRepository.create(client, {
      id: 'txn_existing',
      account_id: 'acc_bank',
      amount_minor: 45000,
      type: 'expense',
      category_id: 'cat_food',
      merchant: 'Swiggy',
      transaction_date: '2026-11-15',
      raw_note: 'Food',
      scrubbed_note: 'Food',
    });

    // Staged list with 1 duplicate and 1 new
    const stagedList = [
      {
        id: 'stg_1',
        transaction_date: '2026-11-15',
        amount_minor: 45000, // duplicate!
        merchant: 'UPI/SWIGGY',
        type: 'expense' as const,
        raw_note: 'Lunch',
      },
      {
        id: 'stg_2',
        transaction_date: '2026-11-18',
        amount_minor: 129900, // new
        merchant: 'AMAZON',
        type: 'expense' as const,
        raw_note: 'Shopping',
      },
    ];

    const flagged = await DuplicateDetectionService.flagDuplicates(client, 'acc_bank', stagedList);

    expect(flagged[0].is_duplicate).toBe(true);
    expect(flagged[0].duplicate_reason).toContain('Matches existing transaction');

    expect(flagged[1].is_duplicate).toBe(false);
  });
});

