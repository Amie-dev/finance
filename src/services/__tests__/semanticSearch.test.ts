import { describe, it, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { migration001 } from '@/db/migrations/001_initial_schema';
import { migration002 } from '@/db/migrations/002_vector_tables';
import { DatabaseClient } from '@/db/types';
import { AccountRepository } from '@/db/repositories/accountRepository';
import { TransactionRepository } from '@/db/repositories/transactionRepository';
import { EmbeddingJobRepository } from '@/db/repositories/embeddingJobRepository';
import { LocalDeterministicEmbeddingProvider } from '@/ai/embeddings/embeddingProvider';
import { EmbeddingQueueWorker } from '@/services/embeddingQueueWorker';
import { SemanticSearchService } from '@/services/semanticSearchService';

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

describe('SmartMoney Vector RAG Pipeline & Semantic Search', () => {
  let db: Database;
  let client: DatabaseClient;
  const embeddingProvider = new LocalDeterministicEmbeddingProvider();

  beforeEach(async () => {
    db = new Database(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    for (const stmt of migration001.up) db.run(stmt);
    for (const stmt of migration002.up) db.run(stmt);
    client = new BunSqliteAdapter(db);

    // Setup base account
    await AccountRepository.create(client, {
      id: 'acc_salary',
      name: 'Salary Account',
      type: 'bank',
      initial_balance: 5000000,
      currency: 'INR',
    });
  });

  it('enqueues embedding job and scrubs PII before generating vector', async () => {
    // Insert transaction containing PII (phone number and UPI)
    await TransactionRepository.create(client, {
      id: 'txn_pizza',
      account_id: 'acc_salary',
      amount_minor: 85000,
      type: 'expense',
      category_id: 'cat_food',
      merchant: 'Dominos Pizza',
      transaction_date: '2026-11-20',
      raw_note: 'Team party order with Rahul 9876543210 rahul@okhdfcbank',
      scrubbed_note: null,
    });

    // Check pending job count
    const pendingCount = await EmbeddingJobRepository.getPendingCount(client);
    expect(pendingCount).toBe(1);

    // Process the queue with worker
    const processResult = await EmbeddingQueueWorker.processQueue(client, embeddingProvider);
    expect(processResult.processed).toBe(1);
    expect(processResult.errors).toBe(0);

    // Verify transaction scrubbed_note was updated with redacted PII
    const txn = await TransactionRepository.getById(client, 'txn_pizza');
    expect(txn?.scrubbed_note).toBe('Team party order with Rahul [PHONE] [UPI_ID]');
    expect(txn?.needs_embedding).toBe(0);

    // Verify vector was stored in local_vec_transactions
    const vectorRows = await client.execute<any>(
      `SELECT * FROM local_vec_transactions WHERE transaction_id = 'txn_pizza';`
    );
    expect(vectorRows.length).toBe(1);
    expect(vectorRows[0].dimension).toBe(1536);
  });

  it('performs semantic search matching natural language intent', async () => {
    // 1. Insert multiple varied transactions
    await TransactionRepository.create(client, {
      id: 'txn_1',
      account_id: 'acc_salary',
      amount_minor: 120000,
      type: 'expense',
      category_id: 'cat_food',
      merchant: 'Barbeque Nation',
      transaction_date: '2026-11-10',
      raw_note: 'Saturday dinner buffet with family',
      scrubbed_note: null,
    });

    await TransactionRepository.create(client, {
      id: 'txn_2',
      account_id: 'acc_salary',
      amount_minor: 45000,
      type: 'expense',
      category_id: 'cat_transport',
      merchant: 'Uber',
      transaction_date: '2026-11-12',
      raw_note: 'Ride to international airport terminal',
      scrubbed_note: null,
    });

    await TransactionRepository.create(client, {
      id: 'txn_3',
      account_id: 'acc_salary',
      amount_minor: 350000,
      type: 'expense',
      category_id: 'cat_shopping',
      merchant: 'Zara',
      transaction_date: '2026-11-15',
      raw_note: 'Winter jackets and clothes shopping',
      scrubbed_note: null,
    });

    // 2. Process all embedding jobs
    await EmbeddingQueueWorker.processQueue(client, embeddingProvider);

    // 3. Search for "dinner buffet"
    const dinnerResults = await SemanticSearchService.search(client, 'dinner buffet', {
      provider: embeddingProvider,
      minSimilarity: 0.1,
    });
    expect(dinnerResults.length).toBeGreaterThan(0);
    expect(dinnerResults[0].id).toBe('txn_1');
    expect(dinnerResults[0].merchant).toBe('Barbeque Nation');

    // 4. Search for "airport taxi ride"
    const taxiResults = await SemanticSearchService.search(client, 'airport taxi ride', {
      provider: embeddingProvider,
      minSimilarity: 0.1,
    });
    expect(taxiResults.length).toBeGreaterThan(0);
    expect(taxiResults[0].id).toBe('txn_2');
    expect(taxiResults[0].merchant).toBe('Uber');
  });
});
