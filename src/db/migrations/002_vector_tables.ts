import { Migration } from '../migrationRunner';

export const migration002: Migration = {
  version: 2,
  name: '002_vector_tables',
  up: [
    // Standard table for universal persistence of transaction vectors
    `CREATE TABLE IF NOT EXISTS local_vec_transactions (
      transaction_id TEXT PRIMARY KEY,
      vector_json TEXT NOT NULL,
      dimension INTEGER NOT NULL DEFAULT 1536,
      created_at TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_vec_txn ON local_vec_transactions(transaction_id);`
  ],
};

