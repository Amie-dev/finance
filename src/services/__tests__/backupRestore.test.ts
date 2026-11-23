import { describe, it, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { migration001 } from '@/db/migrations/001_initial_schema';
import { DatabaseClient } from '@/db/types';
import { AccountRepository } from '@/db/repositories/accountRepository';
import { TransactionRepository } from '@/db/repositories/transactionRepository';
import { TransferRepository } from '@/db/repositories/transferRepository';
import { BudgetRepository } from '@/db/repositories/budgetRepository';
import { CryptoEngine } from '../backup/crypto';
import { BackupService } from '../backup/backupService';
import { RestoreService } from '../backup/restoreService';

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

describe('SmartMoney AES-256-GCM Encrypted Backup & Restore', () => {
  it('encrypts and decrypts payload with PBKDF2-derived key', async () => {
    const secretData = JSON.stringify({ message: 'Confidential financial records', balance: 500000 });
    const password = 'SuperSecurePassword123!';

    const encrypted = await CryptoEngine.encrypt(secretData, password);
    expect(encrypted.ciphertextBase64).toBeDefined();
    expect(encrypted.saltHex).toBeDefined();
    expect(encrypted.ivHex).toBeDefined();

    const decrypted = await CryptoEngine.decrypt(
      encrypted.ciphertextBase64,
      password,
      encrypted.saltHex,
      encrypted.ivHex
    );

    expect(decrypted).toBe(secretData);
  });

  it('rejects decryption with an incorrect password immediately', async () => {
    const secretData = 'Secret data';
    const encrypted = await CryptoEngine.encrypt(secretData, 'correctPassword');

    expect(
      CryptoEngine.decrypt(
        encrypted.ciphertextBase64,
        'wrongPassword',
        encrypted.saltHex,
        encrypted.ivHex
      )
    ).rejects.toThrow('Decryption failed');
  });

  it('creates full encrypted backup and restores exact database state after wipe', async () => {
    const db = new Database(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    for (const stmt of migration001.up) db.run(stmt);
    const client = new BunSqliteAdapter(db);

    // 1. Setup accounts
    await AccountRepository.create(client, {
      id: 'acc_hdfc',
      name: 'HDFC Savings',
      type: 'bank',
      initial_balance: 5000000, // ₹50,000.00
      currency: 'INR',
    });

    await AccountRepository.create(client, {
      id: 'acc_wallet',
      name: 'Paytm Wallet',
      type: 'wallet',
      initial_balance: 100000, // ₹1,000.00
      currency: 'INR',
    });

    // 2. Add transactions & transfers
    await TransactionRepository.create(client, {
      id: 't_grocery',
      account_id: 'acc_hdfc',
      amount_minor: 150000, // ₹1,500.00
      type: 'expense',
      category_id: 'cat_groceries',
      merchant: 'Nature Basket',
      transaction_date: '2026-11-20',
      raw_note: 'Organic vegetables',
      scrubbed_note: 'Organic vegetables',
    });

    await TransferRepository.create(client, {
      id: 'trf_1',
      from_account_id: 'acc_hdfc',
      to_account_id: 'acc_wallet',
      amount_minor: 50000, // ₹500.00
      transfer_date: '2026-11-21',
      note: 'Load wallet',
    });

    await BudgetRepository.create(client, {
      id: 'bdg_groc',
      category_id: 'cat_groceries',
      monthly_limit_minor: 1000000,
      alert_threshold: 80,
      start_month: '2026-11',
    });

    // Initial check
    const accountsBefore = await AccountRepository.getAllWithBalances(client);
    const hdfcBefore = accountsBefore.find((a) => a.id === 'acc_hdfc')!;
    // 5,000,000 - 150,000 - 50,000 = 4,800,000
    expect(hdfcBefore.current_balance).toBe(4800000);

    // 3. Create encrypted backup
    const backupPassword = 'MasterRestoreKey2026!';
    const { archive } = await BackupService.createEncryptedBackup(client, backupPassword);

    expect(archive.magic).toBe('SMARTMONEY_ENCRYPTED_BACKUP');

    // 4. Wipe the database to simulate a new device or factory reset
    db.run('DELETE FROM transfers;');
    db.run('DELETE FROM transactions;');
    db.run('DELETE FROM budgets;');
    db.run('DELETE FROM accounts;');

    const accountsWiped = await AccountRepository.getAllWithBalances(client);
    expect(accountsWiped.length).toBe(0);

    // 5. Restore from encrypted archive
    const restoreResult = await RestoreService.restoreFromArchive(
      client,
      archive,
      backupPassword,
      'replace'
    );

    expect(restoreResult.restoredCounts.accounts).toBe(2);
    expect(restoreResult.restoredCounts.transactions).toBe(1);
    expect(restoreResult.restoredCounts.transfers).toBe(1);

    // 6. Verify restored database ledger balances
    const accountsRestored = await AccountRepository.getAllWithBalances(client);
    expect(accountsRestored.length).toBe(2);

    const hdfcRestored = accountsRestored.find((a) => a.id === 'acc_hdfc')!;
    expect(hdfcRestored.current_balance).toBe(4800000);

    const walletRestored = accountsRestored.find((a) => a.id === 'acc_wallet')!;
    // 100,000 + 50,000 = 150,000
    expect(walletRestored.current_balance).toBe(150000);
  });
});

