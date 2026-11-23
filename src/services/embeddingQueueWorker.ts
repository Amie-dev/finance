import { DatabaseClient } from '@/db/types';
import { EmbeddingJobRepository } from '@/db/repositories/embeddingJobRepository';
import { VectorClient } from '@/db/vector/vectorClient';
import type { EmbeddingProvider } from '@/ai/embeddings/types';
import { getActiveEmbeddingProvider } from '@/ai/embeddings/embeddingProvider';
import { scrubText } from '@/security/piiScrubber';

let isProcessing = false;

export const EmbeddingQueueWorker = {
  async processQueue(
    client: DatabaseClient,
    provider?: EmbeddingProvider
  ): Promise<{ processed: number; errors: number }> {
    if (isProcessing) {
      return { processed: 0, errors: 0 };
    }

    isProcessing = true;
    let processed = 0;
    let errors = 0;

    const embeddingProvider = provider || getActiveEmbeddingProvider();

    try {
      const pendingJobs = await EmbeddingJobRepository.getPendingJobs(client, 10);
      if (pendingJobs.length === 0) {
        return { processed: 0, errors: 0 };
      }

      for (const job of pendingJobs) {
        try {
          // Prepare sanitized text
          const rawNote = job.raw_note || '';
          const scrubResult = scrubText(rawNote);
          const cleanNote = scrubResult.scrubbedText;

          const textPayload = [
            job.merchant || '',
            job.category_name || '',
            cleanNote,
          ]
            .filter(Boolean)
            .join(' ')
            .trim();

          // Generate vector embedding
          const vector = await embeddingProvider.generateEmbedding(textPayload);

          // Store vector in local vector store
          await VectorClient.insertVector(client, job.transaction_id, vector);

          // Update transaction's scrubbed_note
          await client.executeMutation(
            `UPDATE transactions SET scrubbed_note = ? WHERE id = ?;`,
            [cleanNote, job.transaction_id]
          );

          // Mark job complete
          await EmbeddingJobRepository.markCompleted(client, job.id, job.transaction_id);
          processed++;
        } catch (err: any) {
          errors++;
          console.error(`[EmbeddingQueueWorker] Failed to process job ${job.id}:`, err);
          await EmbeddingJobRepository.markFailed(
            client,
            job.id,
            err?.message || 'Unknown embedding generation error'
          );
        }
      }
    } finally {
      isProcessing = false;
    }

    return { processed, errors };
  },
};
