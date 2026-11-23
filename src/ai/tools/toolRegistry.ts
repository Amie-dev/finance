import { DatabaseClient } from '@/db/types';
import { ToolDefinition } from '@/ai/llm/types';
import { TransactionRepository } from '@/db/repositories/transactionRepository';
import { BudgetRepository } from '@/db/repositories/budgetRepository';
import { AccountRepository } from '@/db/repositories/accountRepository';
import { SemanticSearchService } from '@/services/semanticSearchService';

export interface ActionProposal {
  id: string;
  type: 'add_transaction' | 'delete_transaction';
  status: 'pending' | 'confirmed' | 'cancelled';
  payload: {
    account_name?: string;
    amount_minor: number;
    type: 'expense' | 'income';
    category_name: string;
    merchant?: string;
    note?: string;
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_category_totals',
      description: 'Retrieve category-wise spending totals for a given date range or category.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format.' },
          end_date: { type: 'string', description: 'End date in YYYY-MM-DD format.' },
          category: { type: 'string', description: 'Optional specific category name to filter.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cashflow_trend',
      description: 'Get income vs expense cashflow and net savings for a specific month or range.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'Target month in YYYY-MM format.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_budget_status',
      description: 'Retrieve current budget limits, spent amounts, and utilization percentage.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'Target month in YYYY-MM format.' },
          category: { type: 'string', description: 'Optional category name filter.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'semantic_search_transactions',
      description: 'Find past transactions using natural language intent via local vector similarity.',
      parameters: {
        type: 'object',
        properties: {
          query_text: { type: 'string', description: 'Search phrase or question.' },
          limit: { type: 'number', description: 'Maximum results to return (default 5).' },
        },
        required: ['query_text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_account_summary',
      description: 'Retrieve account balances, total income, and total expenses across accounts.',
      parameters: {
        type: 'object',
        properties: {
          account_id: { type: 'string', description: 'Optional specific account id.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_top_merchants',
      description: 'Find payees or merchants with the highest spending.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format.' },
          limit: { type: 'number', description: 'Number of top merchants to return (default 5).' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_add_transaction',
      description: 'Propose recording a new financial transaction. Requires explicit user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          amount_minor: { type: 'number', description: 'Amount in paise/cents (integer).' },
          type: { type: 'string', enum: ['expense', 'income'], description: 'Transaction type.' },
          category_name: { type: 'string', description: 'Category name (e.g. Food & Dining, Salary).' },
          merchant: { type: 'string', description: 'Merchant or Payee name.' },
          note: { type: 'string', description: 'Optional notes.' },
        },
        required: ['amount_minor', 'type', 'category_name'],
      },
    },
  },
];

export const ToolRegistry = {
  getAllDefinitions(): ToolDefinition[] {
    return TOOL_DEFINITIONS;
  },

  async executeTool(
    client: DatabaseClient,
    name: string,
    args: Record<string, any>
  ): Promise<any> {
    const currentMonth = new Date().toISOString().substring(0, 7);

    switch (name) {
      case 'get_category_totals': {
        const startDate = args.start_date || `${currentMonth}-01`;
        const endDate = args.end_date || `${currentMonth}-31`;
        const query = `
          SELECT 
            c.name,
            c.color,
            COALESCE(SUM(t.amount_minor), 0) AS total_spent_minor
          FROM categories c
          JOIN transactions t ON t.category_id = c.id
          WHERE t.type = 'expense' AND t.transaction_date >= ? AND t.transaction_date <= ?
          GROUP BY c.id
          ORDER BY total_spent_minor DESC;
        `;
        return await client.execute(query, [startDate, endDate]);
      }

      case 'get_cashflow_trend': {
        const month = args.month || currentMonth;
        return await TransactionRepository.getMonthlyTotals(client, month);
      }

      case 'check_budget_status': {
        const month = args.month || currentMonth;
        return await BudgetRepository.getBudgetsWithSpend(client, month);
      }

      case 'semantic_search_transactions': {
        const queryText = args.query_text || '';
        const limit = args.limit || 5;
        return await SemanticSearchService.search(client, queryText, { limit });
      }

      case 'get_account_summary': {
        return await AccountRepository.getAllWithBalances(client);
      }

      case 'get_top_merchants': {
        const startDate = args.start_date || `${currentMonth}-01`;
        const limit = args.limit || 5;
        const query = `
          SELECT 
            merchant,
            SUM(amount_minor) AS total_spent_minor,
            COUNT(*) AS count
          FROM transactions
          WHERE type = 'expense' AND merchant IS NOT NULL AND merchant != ''
                AND transaction_date >= ?
          GROUP BY merchant
          ORDER BY total_spent_minor DESC
          LIMIT ?;
        `;
        return await client.execute(query, [startDate, limit]);
      }

      case 'propose_add_transaction': {
        const proposal: ActionProposal = {
          id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'add_transaction',
          status: 'pending',
          payload: {
            amount_minor: Math.round(args.amount_minor),
            type: args.type || 'expense',
            category_name: args.category_name || 'General Expense',
            merchant: args.merchant || '',
            note: args.note || '',
          },
        };
        return proposal;
      }

      default:
        throw new Error(`Tool "${name}" is not registered in allowlist.`);
    }
  },
};
