import { DatabaseClient } from '../types';

export interface VectorSearchResult {
  transaction_id: string;
  similarity: number; // 0 to 1 (1 = identical)
}

/**
 * Calculates cosine similarity between two normalized vectors:
 * dot_product(a, b) / (||a|| * ||b||)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export const VectorClient = {
  async insertVector(
    client: DatabaseClient,
    transactionId: string,
    vector: number[]
  ): Promise<void> {
    const now = new Date().toISOString();
    const vectorJson = JSON.stringify(vector);

    await client.executeMutation(
      `INSERT INTO local_vec_transactions (transaction_id, vector_json, dimension, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(transaction_id) DO UPDATE SET vector_json = ?, created_at = ?;`,
      [transactionId, vectorJson, vector.length, now, vectorJson, now]
    );
  },

  async deleteVector(client: DatabaseClient, transactionId: string): Promise<void> {
    await client.executeMutation(
      `DELETE FROM local_vec_transactions WHERE transaction_id = ?;`,
      [transactionId]
    );
  },

  async searchKNN(
    client: DatabaseClient,
    queryVector: number[],
    limit = 10,
    minSimilarity = 0.4
  ): Promise<VectorSearchResult[]> {
    const rows = await client.execute<{ transaction_id: string; vector_json: string }>(
      `SELECT transaction_id, vector_json FROM local_vec_transactions;`
    );

    const scored: VectorSearchResult[] = [];

    for (const row of rows) {
      try {
        const storedVector = JSON.parse(row.vector_json) as number[];
        const similarity = cosineSimilarity(queryVector, storedVector);
        if (similarity >= minSimilarity) {
          scored.push({
            transaction_id: row.transaction_id,
            similarity,
          });
        }
      } catch (err) {
        // Skip corrupted vector entry
      }
    }

    // Sort descending by similarity
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  },
};
