import { DatabaseClient, Transaction, TransactionType } from '../types';

export interface TransactionWithDetails extends Transaction {
  account_name: string;
  category_name: string;
  category_icon: string;
  category_color: string;
}

export interface TransactionFilter {
  account_id?: string;
  category_id?: string;
  type?: TransactionType;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  search?: string;
  limit?: number;
  offset?: number;
}

export const TransactionRepository = {
  async getFiltered(
    client: DatabaseClient,
    filter: TransactionFilter = {}
  ): Promise<TransactionWithDetails[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filter.account_id) {
      conditions.push('t.account_id = ?');
      values.push(filter.account_id);
    }
    if (filter.category_id) {
      conditions.push('t.category_id = ?');
      values.push(filter.category_id);
    }
    if (filter.type) {
      conditions.push('t.type = ?');
      values.push(filter.type);
    }
    if (filter.start_date) {
      conditions.push('t.transaction_date >= ?');
      values.push(filter.start_date);
    }
    if (filter.end_date) {
      conditions.push('t.transaction_date <= ?');
      values.push(filter.end_date);
    }
    if (filter.search) {
      conditions.push('(t.merchant LIKE ? OR t.raw_note LIKE ?)');
      const pattern = `%${filter.search}%`;
      values.push(pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    values.push(limit, offset);

    const query = `
      SELECT 
        t.*,
        a.name AS account_name,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ? OFFSET ?;
    `;

    return await client.execute<TransactionWithDetails>(query, values);
  },

  async getRecent(client: DatabaseClient, limit = 5): Promise<TransactionWithDetails[]> {
    return await this.getFiltered(client, { limit });
  },

  async getById(client: DatabaseClient, id: string): Promise<TransactionWithDetails | null> {
    const query = `
      SELECT 
        t.*,
        a.name AS account_name,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
      LIMIT 1;
    `;
    const rows = await client.execute<TransactionWithDetails>(query, [id]);
    return rows[0] || null;
  },

  async create(
    client: DatabaseClient,
    txn: Omit<Transaction, 'needs_embedding' | 'created_at' | 'updated_at'>
  ): Promise<Transaction> {
    const now = new Date().toISOString();
    return await client.transaction(async (tx) => {
      await tx.executeMutation(
        `INSERT INTO transactions (
          id, account_id, amount_minor, type, category_id, merchant,
          transaction_date, raw_note, scrubbed_note, needs_embedding, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [
          txn.id,
          txn.account_id,
          txn.amount_minor,
          txn.type,
          txn.category_id,
          txn.merchant || null,
          txn.transaction_date,
          txn.raw_note || null,
          txn.scrubbed_note || null,
          now,
          now,
        ]
      );

      // Enqueue embedding background job
      await tx.executeMutation(
        `INSERT INTO embedding_jobs (id, transaction_id, status, retry_count, last_error, created_at, updated_at)
         VALUES (?, ?, 'pending', 0, NULL, ?, ?);`,
        [`emb_${txn.id}`, txn.id, now, now]
      );

      return {
        ...txn,
        needs_embedding: 1,
        created_at: now,
        updated_at: now,
      };
    });
  },

  async update(
    client: DatabaseClient,
    id: string,
    updates: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const now = new Date().toISOString();
    await client.transaction(async (tx) => {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.account_id !== undefined) {
        fields.push('account_id = ?');
        values.push(updates.account_id);
      }
      if (updates.amount_minor !== undefined) {
        fields.push('amount_minor = ?');
        values.push(updates.amount_minor);
      }
      if (updates.type !== undefined) {
        fields.push('type = ?');
        values.push(updates.type);
      }
      if (updates.category_id !== undefined) {
        fields.push('category_id = ?');
        values.push(updates.category_id);
      }
      if (updates.merchant !== undefined) {
        fields.push('merchant = ?');
        values.push(updates.merchant);
      }
      if (updates.transaction_date !== undefined) {
        fields.push('transaction_date = ?');
        values.push(updates.transaction_date);
      }
      if (updates.raw_note !== undefined) {
        fields.push('raw_note = ?');
        values.push(updates.raw_note);
      }
      if (updates.scrubbed_note !== undefined) {
        fields.push('scrubbed_note = ?');
        values.push(updates.scrubbed_note);
      }

      fields.push('needs_embedding = 1');
      fields.push('updated_at = ?');
      values.push(now);
      values.push(id);

      await tx.executeMutation(
        `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?;`,
        values
      );

      // Re-enqueue or reset embedding job
      await tx.executeMutation(
        `INSERT INTO embedding_jobs (id, transaction_id, status, retry_count, last_error, created_at, updated_at)
         VALUES (?, ?, 'pending', 0, NULL, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = 'pending', retry_count = 0, updated_at = ?;`,
        [`emb_${id}`, id, now, now, now]
      );
    });
  },

  async delete(client: DatabaseClient, id: string): Promise<void> {
    await client.transaction(async (tx) => {
      await tx.executeMutation(`DELETE FROM receipts WHERE transaction_id = ?;`, [id]);
      await tx.executeMutation(`DELETE FROM embedding_jobs WHERE transaction_id = ?;`, [id]);
      await tx.executeMutation(`DELETE FROM transactions WHERE id = ?;`, [id]);
    });
  },

  async getMonthlyTotals(
    client: DatabaseClient,
    yearMonth?: string
  ): Promise<{ income_minor: number; expense_minor: number; net_savings_minor: number }> {
    const ym = yearMonth || new Date().toISOString().substring(0, 7);
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0) AS income_minor,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0) AS expense_minor
      FROM transactions
      WHERE strftime('%Y-%m', transaction_date) = ?;
    `;
    const rows = await client.execute<{ income_minor: number; expense_minor: number }>(query, [ym]);
    const income = rows[0]?.income_minor || 0;
    const expense = rows[0]?.expense_minor || 0;
    return {
      income_minor: income,
      expense_minor: expense,
      net_savings_minor: income - expense,
    };
  },
};

