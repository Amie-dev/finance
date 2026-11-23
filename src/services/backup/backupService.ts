import { DatabaseClient } from '@/db/types';
import { CryptoEngine } from './crypto';
import { BackupDataPayload, EncryptedBackupArchive } from './types';

export const BackupService = {
  /**
   * Exports the entire database into an encrypted archive file and opens native share sheet.
   */
  async createEncryptedBackup(
    client: DatabaseClient,
    password: string
  ): Promise<{ archive: EncryptedBackupArchive; filePath?: string }> {
    if (!password || password.length < 6) {
      throw new Error('Backup password must be at least 6 characters.');
    }

    // 1. Dump relational data from SQLite
    const [accounts, categories, transactions, transfers, budgets, user_settings] =
      await Promise.all([
        client.execute(`SELECT * FROM accounts;`),
        client.execute(`SELECT * FROM categories;`),
        client.execute(`SELECT * FROM transactions;`),
        client.execute(`SELECT * FROM transfers;`),
        client.execute(`SELECT * FROM budgets;`),
        client.execute(`SELECT * FROM user_settings;`),
      ]);

    const payload: BackupDataPayload = {
      metadata: {
        version: 1,
        appName: 'SmartMoney',
        createdAt: new Date().toISOString(),
        recordCounts: {
          accounts: accounts.length,
          categories: categories.length,
          transactions: transactions.length,
          transfers: transfers.length,
          budgets: budgets.length,
        },
      },
      accounts,
      categories,
      transactions,
      transfers,
      budgets,
      user_settings,
    };

    // 2. Encrypt using AES-256-GCM + PBKDF2
    const plaintext = JSON.stringify(payload);
    const encrypted = await CryptoEngine.encrypt(plaintext, password);

    const archive: EncryptedBackupArchive = {
      magic: 'SMARTMONEY_ENCRYPTED_BACKUP',
      version: 1,
      saltHex: encrypted.saltHex,
      ivHex: encrypted.ivHex,
      ciphertextBase64: encrypted.ciphertextBase64,
      createdAt: payload.metadata.createdAt,
    };

    let filePath: string | undefined;

    // 3. Save to app storage file if FileSystem is available
    try {
      const FileSystem = require('expo-file-system');
      const Sharing = require('expo-sharing');

      const fileName = `SmartMoney_Backup_${new Date().toISOString().substring(0, 10)}.smbackup`;
      filePath = `${FileSystem.documentDirectory || ''}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(archive, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 4. Open native share sheet if supported
      if (Sharing && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Save SmartMoney Encrypted Backup',
        });
      }
    } catch {
      // Non-fatal if running in test environment or headless
    }

    return { archive, filePath };
  },
};
