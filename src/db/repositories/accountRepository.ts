import { DatabaseClient, Account, AccountWithBalance, AccountType } from '../types';

export const AccountRepository = {
  async getAllWithBalances(client: DatabaseClient): Promise<AccountWithBalance[]> {
    const query = `
      SELECT 
        a.id,
        a.name,
        a.type,
        a.initial_balance,
        a.currency,
        a.is_archived,
        a.created_at,
        a.updated_at,
        (
          a.initial_balance + 
          COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE account_id = a.id AND type = 'income'), 0) - 
          COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE account_id = a.id AND type = 'expense'), 0) + 
          COALESCE((SELECT SUM(amount_minor) FROM transfers WHERE to_account_id = a.id), 0) - 
          COALESCE((SELECT SUM(amount_minor) FROM transfers WHERE from_account_id = a.id), 0)
        ) AS current_balance,
        COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE account_id = a.id AND type = 'income'), 0) AS total_income,
        COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE account_id = a.id AND type = 'expense'), 0) AS total_expense
      FROM accounts a
      WHERE a.is_archived = 0
      ORDER BY a.name ASC;
    `;
    return await client.execute<AccountWithBalance>(query);
  },

  async getByIdWithBalance(client: DatabaseClient, id: string): Promise<AccountWithBalance | null> {
    const query = `
      SELECT 
        a.id,
        a.name,
        a.type,
        a.initial_balance,
        a.currency,
        a.is_archived,
        a.created_at,
        a.updated_at,
        (
          a.initial_balance + 
          COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE account_id = a.id AND type = 'income'), 0) - 
          COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE account_id = a.id AND type = 'expense'), 0) + 
          COALESCE((SELECT SUM(amount_minor) FROM transfers WHERE to_account_id = a.id), 0) - 
          COALESCE((SELECT SUM(amount_minor) FROM transfers WHERE from_account_id = a.id), 0)
        ) AS current_balance,
        COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE account_id = a.id AND type = 'income'), 0) AS total_income,
        COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE account_id = a.id AND type = 'expense'), 0) AS total_expense
      FROM accounts a
      WHERE a.id = ? AND a.is_archived = 0
      LIMIT 1;
    `;
    const rows = await client.execute<AccountWithBalance>(query, [id]);
    return rows[0] || null;
  },

  async getTotalNetWorth(client: DatabaseClient): Promise<number> {
    const accounts = await this.getAllWithBalances(client);
    return accounts.reduce((acc, curr) => acc + curr.current_balance, 0);
  },

  async create(
    client: DatabaseClient,
    account: Omit<Account, 'is_archived' | 'created_at' | 'updated_at'>
  ): Promise<Account> {
    const now = new Date().toISOString();
    await client.executeMutation(
      `INSERT INTO accounts (id, name, type, initial_balance, currency, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?);`,
      [account.id, account.name, account.type, account.initial_balance, account.currency || 'INR', now, now]
    );
    return {
      ...account,
      currency: account.currency || 'INR',
      is_archived: 0,
      created_at: now,
      updated_at: now,
    };
  },

  async update(
    client: DatabaseClient,
    id: string,
    updates: Partial<Pick<Account, 'name' | 'type' | 'initial_balance' | 'currency'>>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.initial_balance !== undefined) {
      fields.push('initial_balance = ?');
      values.push(updates.initial_balance);
    }
    if (updates.currency !== undefined) {
      fields.push('currency = ?');
      values.push(updates.currency);
    }

    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await client.executeMutation(
      `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?;`,
      values
    );
  },

  async archive(client: DatabaseClient, id: string): Promise<void> {
    await client.executeMutation(
      `UPDATE accounts SET is_archived = 1, updated_at = ? WHERE id = ?;`,
      [new Date().toISOString(), id]
    );
  },
};

