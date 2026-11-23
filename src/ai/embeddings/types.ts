export interface EmbeddingProvider {
  name: string;
  dimension: number;
  generateEmbedding(text: string): Promise<number[]>;
}

export interface EmbeddingJobWithTxn {
  id: string;
  transaction_id: string;
  status: string;
  retry_count: number;
  last_error: string | null;
  merchant: string | null;
  category_name: string;
  scrubbed_note: string | null;
  raw_note: string | null;
  amount_minor: number;
  transaction_date: string;
}
