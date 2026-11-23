export type AccountType = 'bank' | 'cash' | 'credit' | 'investment' | 'wallet' | 'other';
export type TransactionType = 'expense' | 'income';
export type CategoryType = 'expense' | 'income';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initial_balance: number; // minor units (paise)
  currency: string;
  is_archived: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface AccountWithBalance extends Account {
  current_balance: number; // computed dynamically
  total_income: number;
  total_expense: number;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_default: number;
  is_archived: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  amount_minor: number; // minor units (paise)
  type: TransactionType;
  category_id: string;
  merchant: string | null;
  transaction_date: string; // ISO YYYY-MM-DD
  raw_note: string | null;
  scrubbed_note: string | null;
  needs_embedding: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount_minor: number; // minor units (paise)
  transfer_date: string;
  note: string | null;
}

export interface Budget {
  id: string;
  category_id: string;
  monthly_limit_minor: number; // minor units (paise)
  alert_threshold: number; // percentage (e.g. 80 for 80%)
  start_month: string; // YYYY-MM
  created_at: string;
}

export interface Receipt {
  id: string;
  transaction_id: string;
  file_path: string;
  mime_type: string;
  created_at: string;
}

export interface EmbeddingJob {
  id: string;
  transaction_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at: string;
}

export interface UserSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface QueryResult<T> {
  rows: T[];
  rowsAffected: number;
  insertId?: number;
}

export interface DatabaseClient {
  execute<T = any>(sql: string, params?: any[]): Promise<T[]>;
  executeMutation(sql: string, params?: any[]): Promise<{ rowsAffected: number; insertId?: number }>;
  transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T>;
}

