import { DatabaseClient } from '@/db/types';
import { CryptoEngine } from './crypto';
import { BackupDataPayload, EncryptedBackupArchive } from './types';

export const RestoreService = {
  /**
   * Decrypts and restores an encrypted backup file into SQLite.
   */
  async restoreFromArchive(
    client: DatabaseClient,
    archiveJson: string | EncryptedBackupArchive,
    password: string,
    mode: 'replace' | 'merge' = 'replace'
  ): Promise<{ restoredCounts: BackupDataPayload['metadata']['recordCounts'] }> {
    let archive: EncryptedBackupArchive;

    if (typeof archiveJson === 'string') {
      try {
        archive = JSON.parse(archiveJson);
      } catch {
        throw new Error('Invalid backup file format.');
      }
    } else {
      archive = archiveJson;
    }

    if (archive.magic !== 'SMARTMONEY_ENCRYPTED_BACKUP') {
      throw new Error('File is not a valid SmartMoney encrypted backup archive.');
    }

    // 1. Decrypt using password and verified auth tag
    const decryptedJson = await CryptoEngine.decrypt(
      archive.ciphertextBase64,
      password,
      archive.saltHex,
      archive.ivHex
    );

    const payload: BackupDataPayload = JSON.parse(decryptedJson);

    // 2. Commit restored data within an atomic transaction
    await client.transaction(async (tx) => {
      if (mode === 'replace') {
        // Clear existing ledger data
        await tx.executeMutation(`DELETE FROM receipts;`);
        await tx.executeMutation(`DELETE FROM embedding_jobs;`);
        await tx.executeMutation(`DELETE FROM transfers;`);
        await tx.executeMutation(`DELETE FROM transactions;`);
        await tx.executeMutation(`DELETE FROM budgets;`);
        await tx.executeMutation(`DELETE FROM accounts;`);
      }

      // Restore accounts
      for (const a of payload.accounts) {
        await tx.executeMutation(
          `INSERT OR REPLACE INTO accounts (id, name, type, initial_balance, currency, is_archived, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [a.id, a.name, a.type, a.initial_balance, a.currency, a.is_archived, a.created_at, a.updated_at]
        );
      }

      // Restore categories
      for (const c of payload.categories) {
        await tx.executeMutation(
          `INSERT OR REPLACE INTO categories (id, name, type, icon, color, is_default, is_archived)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [c.id, c.name, c.type, c.icon, c.color, c.is_default, c.is_archived]
        );
      }

      // Restore transactions
      for (const t of payload.transactions) {
        await tx.executeMutation(
          `INSERT OR REPLACE INTO transactions (
            id, account_id, amount_minor, type, category_id, merchant,
            transaction_date, raw_note, scrubbed_note, needs_embedding, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
          [
            t.id,
            t.account_id,
            t.amount_minor,
            t.type,
            t.category_id,
            t.merchant || null,
            t.transaction_date,
            t.raw_note || null,
            t.scrubbed_note || null,
            t.created_at,
            t.updated_at,
          ]
        );
      }

      // Restore transfers
      for (const tr of payload.transfers) {
        await tx.executeMutation(
          `INSERT OR REPLACE INTO transfers (id, from_account_id, to_account_id, amount_minor, transfer_date, note)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [tr.id, tr.from_account_id, tr.to_account_id, tr.amount_minor, tr.transfer_date, tr.note || null]
        );
      }

      // Restore budgets
      for (const b of payload.budgets) {
        await tx.executeMutation(
          `INSERT OR REPLACE INTO budgets (id, category_id, monthly_limit_minor, alert_threshold, start_month, created_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [b.id, b.category_id, b.monthly_limit_minor, b.alert_threshold, b.start_month, b.created_at]
        );
      }
    });

    return { restoredCounts: payload.metadata.recordCounts };
  },
};

