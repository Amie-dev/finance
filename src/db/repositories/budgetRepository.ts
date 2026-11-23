import { DatabaseClient, Budget } from '../types';

export interface BudgetWithSpend extends Budget {
  category_name: string;
  category_icon: string;
  category_color: string;
  spent_minor: number;
  percentage: number;
  is_exceeded: boolean;
  is_warning: boolean;
}

export const BudgetRepository = {
  async getBudgetsWithSpend(
    client: DatabaseClient,
    yearMonth?: string
  ): Promise<BudgetWithSpend[]> {
    const ym = yearMonth || new Date().toISOString().substring(0, 7);
    const query = `
      SELECT 
        b.id,
        b.category_id,
        b.monthly_limit_minor,
        b.alert_threshold,
        b.start_month,
        b.created_at,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        COALESCE(SUM(t.amount_minor), 0) AS spent_minor
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
           AND t.type = 'expense'
           AND strftime('%Y-%m', t.transaction_date) = b.start_month
      WHERE b.start_month = ?
      GROUP BY b.id
      ORDER BY spent_minor DESC;
    `;

    const rows = await client.execute<any>(query, [ym]);
    return rows.map((r) => {
      const percentage =
        r.monthly_limit_minor > 0
          ? Math.round((r.spent_minor / r.monthly_limit_minor) * 100)
          : 0;
      return {
        ...r,
        percentage,
        is_exceeded: r.spent_minor >= r.monthly_limit_minor,
        is_warning: percentage >= r.alert_threshold && r.spent_minor < r.monthly_limit_minor,
      };
    });
  },

  async create(
    client: DatabaseClient,
    budget: Omit<Budget, 'created_at'>
  ): Promise<Budget> {
    const now = new Date().toISOString();
    await client.executeMutation(
      `INSERT INTO budgets (id, category_id, monthly_limit_minor, alert_threshold, start_month, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        budget.id,
        budget.category_id,
        budget.monthly_limit_minor,
        budget.alert_threshold || 80,
        budget.start_month,
        now,
      ]
    );
    return {
      ...budget,
      alert_threshold: budget.alert_threshold || 80,
      created_at: now,
    };
  },

  async update(
    client: DatabaseClient,
    id: string,
    monthly_limit_minor: number,
    alert_threshold: number
  ): Promise<void> {
    await client.executeMutation(
      `UPDATE budgets SET monthly_limit_minor = ?, alert_threshold = ? WHERE id = ?;`,
      [monthly_limit_minor, alert_threshold, id]
    );
  },

  async delete(client: DatabaseClient, id: string): Promise<void> {
    await client.executeMutation(`DELETE FROM budgets WHERE id = ?;`, [id]);
  },
};
