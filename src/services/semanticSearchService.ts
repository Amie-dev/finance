import { DatabaseClient } from '@/db/types';
import { VectorClient } from '@/db/vector/vectorClient';
import { TransactionRepository, TransactionWithDetails } from '@/db/repositories/transactionRepository';
import type { EmbeddingProvider } from '@/ai/embeddings/types';
import { getActiveEmbeddingProvider } from '@/ai/embeddings/embeddingProvider';
import { scrubText } from '@/security/piiScrubber';

export interface SemanticSearchResult extends TransactionWithDetails {
  similarity: number;
}

export const SemanticSearchService = {
  async search(
    client: DatabaseClient,
    naturalQuery: string,
    options: {
      limit?: number;
      minSimilarity?: number;
      provider?: EmbeddingProvider;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    if (!naturalQuery || naturalQuery.trim() === '') {
      return [];
    }

    const { limit = 10, minSimilarity = 0.25, provider } = options;
    const embeddingProvider = provider || getActiveEmbeddingProvider();

    // 1. Scrub user query through PII scrubber before processing
    const { scrubbedText } = scrubText(naturalQuery);

    // 2. Generate embedding for search query
    const queryVector = await embeddingProvider.generateEmbedding(scrubbedText);

    // 3. Search KNN from vector store
    const knnMatches = await VectorClient.searchKNN(
      client,
      queryVector,
      limit,
      minSimilarity
    );

    if (knnMatches.length === 0) {
      // Fallback: If no vector matches found (or pending queue), query exact match on SQL
      const fallbackRows = await TransactionRepository.getFiltered(client, {
        search: scrubbedText,
        limit,
      });
      return fallbackRows.map((r) => ({ ...r, similarity: 1.0 }));
    }

    // 4. Retrieve full transaction entities for matches
    const results: SemanticSearchResult[] = [];
    for (const match of knnMatches) {
      const txn = await TransactionRepository.getById(client, match.transaction_id);
      if (txn) {
        results.push({
          ...txn,
          similarity: Math.round(match.similarity * 100) / 100,
        });
      }
    }

    return results;
  },
};
