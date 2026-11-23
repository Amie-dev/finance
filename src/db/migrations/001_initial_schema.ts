export const migration001 = {
  version: 1,
  name: '001_initial_schema',
  up: [
    // 1. Accounts
    `CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'bank',
      initial_balance INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'INR',
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 2. Categories
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'tag',
      color TEXT NOT NULL DEFAULT '#10B981',
      is_default INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0
    );`,

    // 3. Transactions
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      type TEXT NOT NULL,
      category_id TEXT NOT NULL,
      merchant TEXT,
      transaction_date TEXT NOT NULL,
      raw_note TEXT,
      scrubbed_note TEXT,
      needs_embedding INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );`,

    // 4. Transfers
    `CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      from_account_id TEXT NOT NULL,
      to_account_id TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      transfer_date TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE RESTRICT
    );`,

    // 5. Budgets
    `CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      monthly_limit_minor INTEGER NOT NULL,
      alert_threshold INTEGER NOT NULL DEFAULT 80,
      start_month TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );`,

    // 6. Receipts
    `CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      created_at TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );`,

    // 7. Embedding Jobs
    `CREATE TABLE IF NOT EXISTS embedding_jobs (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );`,

    // 8. AI Conversations & Messages
    `CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    );`,

    // 9. User Settings
    `CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 10. Performance Indexes
    `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_needs_embedding ON transactions(needs_embedding);`,
    `CREATE INDEX IF NOT EXISTS idx_budgets_category_month ON budgets(category_id, start_month);`,
    `CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_account_id);`,
    `CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_account_id);`,
    `CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status ON embedding_jobs(status, retry_count);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id);`,

    // 11. Seed Default Categories
    `INSERT OR IGNORE INTO categories (id, name, type, icon, color, is_default, is_archived) VALUES
      ('cat_food', 'Food & Dining', 'expense', 'utensils', '#F97316', 1, 0),
      ('cat_groceries', 'Groceries', 'expense', 'shopping-cart', '#10B981', 1, 0),
      ('cat_shopping', 'Shopping', 'expense', 'shopping-bag', '#EC4899', 1, 0),
      ('cat_transport', 'Transportation', 'expense', 'car', '#3B82F6', 1, 0),
      ('cat_utilities', 'Bills & Utilities', 'expense', 'zap', '#EAB308', 1, 0),
      ('cat_entertainment', 'Entertainment', 'expense', 'film', '#8B5CF6', 1, 0),
      ('cat_health', 'Health & Fitness', 'expense', 'heart-pulse', '#EF4444', 1, 0),
      ('cat_travel', 'Travel', 'expense', 'plane', '#06B6D4', 1, 0),
      ('cat_general', 'General Expense', 'expense', 'help-circle', '#64748B', 1, 0),
      ('cat_salary', 'Salary', 'income', 'briefcase', '#10B981', 1, 0),
      ('cat_freelance', 'Freelance & Business', 'income', 'laptop', '#3B82F6', 1, 0),
      ('cat_investments', 'Investments & Dividends', 'income', 'trending-up', '#8B5CF6', 1, 0),
      ('cat_gifts', 'Gifts & Grants', 'income', 'gift', '#F59E0B', 1, 0),
      ('cat_other_income', 'Other Income', 'income', 'dollar-sign', '#64748B', 1, 0);`
  ],
};
