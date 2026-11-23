import { describe, it, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { migration001 } from '../migrations/001_initial_schema';
import { DatabaseClient } from '../types';
import { AccountRepository } from '../repositories/accountRepository';
import { CategoryRepository } from '../repositories/categoryRepository';
import { TransactionRepository } from '../repositories/transactionRepository';
import { TransferRepository } from '../repositories/transferRepository';
import { BudgetRepository } from '../repositories/budgetRepository';

class BunSqliteAdapter implements DatabaseClient {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async execute<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async executeMutation(sql: string, params: any[] = []): Promise<{ rowsAffected: number; insertId?: number }> {
    const result = this.db.prepare(sql).run(...params);
    return {
      rowsAffected: result.changes,
      insertId: Number(result.lastInsertRowid),
    };
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

describe('SmartMoney Core Ledger Repositories', () => {
  let db: Database;
  let client: DatabaseClient;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    for (const statement of migration001.up) {
      db.run(statement);
    }
    client = new BunSqliteAdapter(db);
  });

  it('calculates dynamic account balances accurately across income, expenses, and transfers', async () => {
    // 1. Create two accounts
    const bank = await AccountRepository.create(client, {
      id: 'acc_bank',
      name: 'HDFC Bank',
      type: 'bank',
      initial_balance: 10000000, // ₹1,00,000.00
      currency: 'INR',
    });

    const cash = await AccountRepository.create(client, {
      id: 'acc_cash',
      name: 'Physical Cash',
      type: 'cash',
      initial_balance: 500000, // ₹5,000.00
      currency: 'INR',
    });

    // Initial check
    let accounts = await AccountRepository.getAllWithBalances(client);
    expect(accounts.find((a) => a.id === 'acc_bank')?.current_balance).toBe(10000000);
    expect(accounts.find((a) => a.id === 'acc_cash')?.current_balance).toBe(500000);

    // 2. Add an expense from Bank (₹1,500.00 = 150000 paise)
    await TransactionRepository.create(client, {
      id: 'txn_1',
      account_id: 'acc_bank',
      amount_minor: 150000,
      type: 'expense',
      category_id: 'cat_food',
      merchant: 'Swiggy',
      transaction_date: '2026-11-20',
      raw_note: 'Team dinner',
      scrubbed_note: 'Team dinner',
    });

    // 3. Add income to Bank (₹50,000.00 = 5000000 paise)
    await TransactionRepository.create(client, {
      id: 'txn_2',
      account_id: 'acc_bank',
      amount_minor: 5000000,
      type: 'income',
      category_id: 'cat_salary',
      merchant: 'Employer Corp',
      transaction_date: '2026-11-21',
      raw_note: 'Monthly salary',
      scrubbed_note: 'Monthly salary',
    });

    // 4. Transfer ₹2,000.00 (200000 paise) from Bank to Cash (ATM withdrawal)
    await TransferRepository.create(client, {
      id: 'trf_1',
      from_account_id: 'acc_bank',
      to_account_id: 'acc_cash',
      amount_minor: 200000,
      transfer_date: '2026-11-22',
      note: 'ATM cash withdrawal',
    });

    accounts = await AccountRepository.getAllWithBalances(client);
    const updatedBank = accounts.find((a) => a.id === 'acc_bank')!;
    const updatedCash = accounts.find((a) => a.id === 'acc_cash')!;

    // Expected Bank: 10,000,000 + 5,000,000 - 150,000 - 200,000 = 14,650,000 paise (₹1,46,500.00)
    expect(updatedBank.current_balance).toBe(14650000);
    expect(updatedBank.total_income).toBe(5000000);
    expect(updatedBank.total_expense).toBe(150000);

    // Expected Cash: 500,000 + 200,000 = 700,000 paise (₹7,000.00)
    expect(updatedCash.current_balance).toBe(700000);

    // Total Net Worth: 14,650,000 + 700,000 = 15,350,000 paise
    const totalNetWorth = await AccountRepository.getTotalNetWorth(client);
    expect(totalNetWorth).toBe(15350000);
  });

  it('rejects invalid transfers (same account or zero amount)', async () => {
    await AccountRepository.create(client, {
      id: 'acc_test',
      name: 'Test Account',
      type: 'bank',
      initial_balance: 100000,
      currency: 'INR',
    });

    // Same account transfer
    expect(
      TransferRepository.create(client, {
        id: 'trf_err',
        from_account_id: 'acc_test',
        to_account_id: 'acc_test',
        amount_minor: 50000,
        transfer_date: '2026-11-23',
        note: 'Invalid',
      })
    ).rejects.toThrow();

    // Zero amount transfer
    expect(
      TransferRepository.create(client, {
        id: 'trf_err2',
        from_account_id: 'acc_test',
        to_account_id: 'nonexistent',
        amount_minor: 0,
        transfer_date: '2026-11-23',
        note: 'Invalid',
      })
    ).rejects.toThrow();
  });

  it('computes monthly budget spend, percentage, and warnings accurately', async () => {
    await AccountRepository.create(client, {
      id: 'acc_main',
      name: 'Main Bank',
      type: 'bank',
      initial_balance: 5000000,
      currency: 'INR',
    });

    // Create budget for Food & Dining: ₹10,000.00 (1000000 paise) with 80% alert threshold
    await BudgetRepository.create(client, {
      id: 'bdg_food',
      category_id: 'cat_food',
      monthly_limit_minor: 1000000,
      alert_threshold: 80,
      start_month: '2026-11',
    });

    // Spend 1: ₹5,000.00 (500000 paise) -> 50%
    await TransactionRepository.create(client, {
      id: 't_food1',
      account_id: 'acc_main',
      amount_minor: 500000,
      type: 'expense',
      category_id: 'cat_food',
      merchant: 'Restaurant',
      transaction_date: '2026-11-05',
      raw_note: null,
      scrubbed_note: null,
    });

    let budgets = await BudgetRepository.getBudgetsWithSpend(client, '2026-11');
    expect(budgets.length).toBe(1);
    expect(budgets[0].spent_minor).toBe(500000);
    expect(budgets[0].percentage).toBe(50);
    expect(budgets[0].is_warning).toBe(false);
    expect(budgets[0].is_exceeded).toBe(false);

    // Spend 2: Additional ₹3,500.00 (350000 paise) -> Total ₹8,500.00 (85%) -> warning triggered
    await TransactionRepository.create(client, {
      id: 't_food2',
      account_id: 'acc_main',
      amount_minor: 350000,
      type: 'expense',
      category_id: 'cat_food',
      merchant: 'Cafe',
      transaction_date: '2026-11-15',
      raw_note: null,
      scrubbed_note: null,
    });

    budgets = await BudgetRepository.getBudgetsWithSpend(client, '2026-11');
    expect(budgets[0].spent_minor).toBe(850000);
    expect(budgets[0].percentage).toBe(85);
    expect(budgets[0].is_warning).toBe(true);
    expect(budgets[0].is_exceeded).toBe(false);

    // Spend 3: Additional ₹2,000.00 (200000 paise) -> Total ₹10,500.00 (105%) -> exceeded
    await TransactionRepository.create(client, {
      id: 't_food3',
      account_id: 'acc_main',
      amount_minor: 200000,
      type: 'expense',
      category_id: 'cat_food',
      merchant: 'Bakery',
      transaction_date: '2026-11-20',
      raw_note: null,
      scrubbed_note: null,
    });

    budgets = await BudgetRepository.getBudgetsWithSpend(client, '2026-11');
    expect(budgets[0].spent_minor).toBe(1050000);
    expect(budgets[0].percentage).toBe(105);
    expect(budgets[0].is_exceeded).toBe(true);
  });
});
