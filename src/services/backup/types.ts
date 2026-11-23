export interface BackupMetadata {
  version: number;
  appName: string;
  createdAt: string;
  recordCounts: {
    accounts: number;
    categories: number;
    transactions: number;
    transfers: number;
    budgets: number;
  };
}

export interface BackupDataPayload {
  metadata: BackupMetadata;
  accounts: any[];
  categories: any[];
  transactions: any[];
  transfers: any[];
  budgets: any[];
  user_settings: any[];
}

export interface EncryptedBackupArchive {
  magic: 'SMARTMONEY_ENCRYPTED_BACKUP';
  version: 1;
  saltHex: string;
  ivHex: string;
  ciphertextBase64: string;
  createdAt: string;
}
