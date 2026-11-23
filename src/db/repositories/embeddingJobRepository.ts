import { DatabaseClient } from '../types';
import { EmbeddingJobWithTxn } from '@/ai/embeddings/types';

export const EmbeddingJobRepository = {
  async getPendingJobs(
    client: DatabaseClient,
    limit = 10
  ): Promise<EmbeddingJobWithTxn[]> {
    const query = `
      SELECT 
        j.id,
        j.transaction_id,
        j.status,
        j.retry_count,
        j.last_error,
        t.merchant,
        c.name AS category_name,
        t.scrubbed_note,
        t.raw_note,
        t.amount_minor,
        t.transaction_date
      FROM embedding_jobs j
      JOIN transactions t ON j.transaction_id = t.id
      JOIN categories c ON t.category_id = c.id
      WHERE j.status = 'pending' AND j.retry_count < 5
      ORDER BY j.created_at ASC
      LIMIT ?;
    `;
    return await client.execute<EmbeddingJobWithTxn>(query, [limit]);
  },

  async markCompleted(client: DatabaseClient, jobId: string, transactionId: string): Promise<void> {
    const now = new Date().toISOString();
    await client.transaction(async (tx) => {
      await tx.executeMutation(
        `UPDATE embedding_jobs SET status = 'completed', updated_at = ? WHERE id = ?;`,
        [now, jobId]
      );
      await tx.executeMutation(
        `UPDATE transactions SET needs_embedding = 0, updated_at = ? WHERE id = ?;`,
        [now, transactionId]
      );
    });
  },

  async markFailed(
    client: DatabaseClient,
    jobId: string,
    errorMessage: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await client.executeMutation(
      `UPDATE embedding_jobs 
       SET status = 'failed', retry_count = retry_count + 1, last_error = ?, updated_at = ? 
       WHERE id = ?;`,
      [errorMessage, now, jobId]
    );
  },

  async getPendingCount(client: DatabaseClient): Promise<number> {
    const rows = await client.execute<{ count: number }>(
      `SELECT COUNT(*) AS count FROM embedding_jobs WHERE status = 'pending' AND retry_count < 5;`
    );
    return rows[0]?.count || 0;
  },
};

