export type { EmbeddingProvider } from './types';
import { EmbeddingProvider } from './types';

/**
 * Deterministic Local Vector Hash for testing and offline environments.
 * Uses consistent hashing to produce 1536-dimensional normalized vectors
 * that guarantee identical strings produce identical vectors, and similar
 * word combinations share higher dot product similarity.
 */
export class LocalDeterministicEmbeddingProvider implements EmbeddingProvider {
  name = 'local-deterministic';
  dimension = 1536;

  async generateEmbedding(text: string): Promise<number[]> {
    const vector = new Array(this.dimension).fill(0);
    const normalized = text.toLowerCase().trim();
    if (!normalized) return vector;

    // Tokenize words
    const words = normalized.split(/\W+/).filter(Boolean);

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }

      // Project into vector dimensions
      for (let d = 0; d < 12; d++) {
        const index = Math.abs((hash * (d + 1)) % this.dimension);
        vector[index] += 1.0 / (w + 1);
      }
    }

    // L2 Normalize vector to unit length
    let norm = 0;
    for (let i = 0; i < this.dimension; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }
}

/**
 * Cloud OpenAI Embedding Provider (text-embedding-3-small).
 */
export class CloudOpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai-text-embedding-3-small';
  dimension = 1536;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API Key is missing');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Embedding API Error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}

let activeProvider: EmbeddingProvider = new LocalDeterministicEmbeddingProvider();

export function getActiveEmbeddingProvider(): EmbeddingProvider {
  return activeProvider;
}

export function setActiveEmbeddingProvider(provider: EmbeddingProvider): void {
  activeProvider = provider;
}
