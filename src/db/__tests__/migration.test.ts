import { describe, it, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { migration001 } from '../migrations/001_initial_schema';

describe('SmartMoney Database Schema & Migrations', () => {
  it('successfully creates all 10 core tables and indexes without syntax error', () => {
    const db = new Database(':memory:');
    db.run('PRAGMA foreign_keys = ON;');

    for (const statement of migration001.up) {
      db.run(statement);
    }

    // Verify tables exist
    const tables = db
      .query(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`)
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    const expectedTables = [
      'accounts',
      'categories',
      'transactions',
      'transfers',
      'budgets',
      'receipts',
      'embedding_jobs',
      'ai_conversations',
      'ai_messages',
      'user_settings',
    ];

    for (const expected of expectedTables) {
      expect(tableNames).toContain(expected);
    }

    // Verify default category seeds
    const categories = db.query(`SELECT * FROM categories;`).all() as any[];
    expect(categories.length).toBeGreaterThanOrEqual(14);

    const foodCat = categories.find((c) => c.id === 'cat_food');
    expect(foodCat).toBeDefined();
    expect(foodCat.name).toBe('Food & Dining');
    expect(foodCat.type).toBe('expense');

    const salaryCat = categories.find((c) => c.id === 'cat_salary');
    expect(salaryCat).toBeDefined();
    expect(salaryCat.name).toBe('Salary');
    expect(salaryCat.type).toBe('income');

    db.close();
  });

  it('enforces foreign key constraints correctly', () => {
    const db = new Database(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');

    for (const statement of migration001.up) {
      db.run(statement);
    }

    // Verify foreign keys is enabled
    const fkStatus = db.query('PRAGMA foreign_keys;').get() as { foreign_keys: number };
    expect(fkStatus.foreign_keys).toBe(1);

    // Inserting a transaction with nonexistent account must throw a foreign key error
    expect(() => {
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount_minor, type, category_id, transaction_date, created_at, updated_at)
        VALUES ('txn_1', 'nonexistent_acc', 50000, 'expense', 'cat_food', '2026-11-23', '2026-11-23T12:00:00Z', '2026-11-23T12:00:00Z')
      `).run();
    }).toThrow();

    // Now insert a valid account and category, and insert transaction - must succeed
    db.prepare(`
      INSERT INTO accounts (id, name, type, initial_balance, currency, is_archived, created_at, updated_at)
      VALUES ('acc_hdfc', 'HDFC Bank', 'bank', 1000000, 'INR', 0, '2026-11-23T12:00:00Z', '2026-11-23T12:00:00Z')
    `).run();

    db.prepare(`
      INSERT INTO transactions (id, account_id, amount_minor, type, category_id, transaction_date, created_at, updated_at)
      VALUES ('txn_1', 'acc_hdfc', 50000, 'expense', 'cat_food', '2026-11-23', '2026-11-23T12:00:00Z', '2026-11-23T12:00:00Z')
    `).run();

    const txns = db.query(`SELECT * FROM transactions WHERE id = 'txn_1';`).all() as any[];
    expect(txns.length).toBe(1);
    expect(txns[0].amount_minor).toBe(50000);

    db.close();
  });
});
