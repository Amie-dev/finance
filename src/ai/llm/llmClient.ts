import { LLMClient, ChatMessage, ToolDefinition, LLMResponse, ToolCall } from './types';

export const SMARTMONEY_SYSTEM_PROMPT = `
You are SmartMoney, a private, intelligent personal finance assistant.
Your core principles:
1. Always base financial facts, totals, balances, and budgets on the provided tools.
2. Never invent or hallucinate financial numbers. Monetary units are in Indian Rupees (INR, ₹).
3. Be concise, direct, helpful, and transparent.
4. When users ask to record or add expenses/income, use the 'propose_add_transaction' tool so they can confirm the entry.
5. All sensitive notes and UPI IDs have been scrubbed locally before reaching you.
`.trim();

/**
 * Intelligent Offline Simulation LLM Client
 * Parses natural language questions, selects appropriate financial tools,
 * and summarizes tool results deterministically. Allows 100% offline usage and testing.
 */
export class MockOfflineLLMClient implements LLMClient {
  name = 'smartmoney-offline-agent';

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1];

    // If last message was a tool result, formulate human explanation
    if (lastMessage.role === 'tool') {
      const toolName = lastMessage.name || '';
      let toolData: any = {};
      try {
        toolData = JSON.parse(lastMessage.content || '{}');
      } catch {
        toolData = lastMessage.content;
      }

      if (toolName === 'get_category_totals') {
        const rows = Array.isArray(toolData) ? toolData : [];
        if (rows.length === 0) {
          return { content: 'You have no recorded expenses in that category for this period.' };
        }
        const lines = rows.map(
          (r: any) => `• ${r.name}: ₹${(r.total_spent_minor / 100).toLocaleString('en-IN')}`
        );
        return {
          content: `Here is your category spending summary:\n${lines.join('\n')}`,
        };
      }

      if (toolName === 'get_cashflow_trend') {
        const income = (toolData.income_minor || 0) / 100;
        const expense = (toolData.expense_minor || 0) / 100;
        const savings = (toolData.net_savings_minor || 0) / 100;
        return {
          content: `Here is your monthly cashflow:\n• Total Income: ₹${income.toLocaleString('en-IN')}\n• Total Expenses: ₹${expense.toLocaleString('en-IN')}\n• Net Savings: ₹${savings.toLocaleString('en-IN')} (${savings >= 0 ? 'Surplus' : 'Deficit'})`,
        };
      }

      if (toolName === 'check_budget_status') {
        const budgets = Array.isArray(toolData) ? toolData : [];
        if (budgets.length === 0) {
          return { content: 'You currently have no active category budgets set for this month.' };
        }
        const lines = budgets.map((b: any) => {
          const spent = (b.spent_minor / 100).toLocaleString('en-IN');
          const limit = (b.monthly_limit_minor / 100).toLocaleString('en-IN');
          const status = b.is_exceeded ? ' [EXCEEDED]' : b.is_warning ? ' [NEARING LIMIT]' : '';
          return `• ${b.category_name}: ₹${spent} / ₹${limit} (${b.percentage}%)${status}`;
        });
        return {
          content: `Here is your current monthly budget status:\n${lines.join('\n')}`,
        };
      }

      if (toolName === 'semantic_search_transactions' || toolName === 'search_transactions') {
        const rows = Array.isArray(toolData) ? toolData : [];
        if (rows.length === 0) {
          return { content: 'I could not find any matching transactions for your search.' };
        }
        const lines = rows.map((t: any) => {
          const amt = (t.amount_minor / 100).toLocaleString('en-IN');
          return `• ${t.transaction_date}: ${t.merchant || t.category_name} — ₹${amt} (${t.category_name})`;
        });
        return {
          content: `I found ${rows.length} matching transaction(s):\n${lines.join('\n')}`,
        };
      }

      if (toolName === 'get_top_merchants') {
        const merchants = Array.isArray(toolData) ? toolData : [];
        if (merchants.length === 0) {
          return { content: 'No merchant expenses recorded yet.' };
        }
        const lines = merchants.map(
          (m: any, idx: number) =>
            `${idx + 1}. ${m.merchant}: ₹${(m.total_spent_minor / 100).toLocaleString('en-IN')} (${m.count} txns)`
        );
        return {
          content: `Here are your top spending merchants:\n${lines.join('\n')}`,
        };
      }

      if (toolName === 'get_account_summary') {
        const accs = Array.isArray(toolData) ? toolData : [];
        const lines = accs.map((a: any) => `• ${a.name}: ₹${(a.current_balance / 100).toLocaleString('en-IN')}`);
        return {
          content: `Here is your current accounts summary:\n${lines.join('\n')}`,
        };
      }

      if (toolName === 'propose_add_transaction') {
        return {
          content: `I have prepared the transaction for your review. Please confirm or cancel below.`,
        };
      }

      return { content: `Data retrieved:\n${JSON.stringify(toolData, null, 2)}` };
    }

    const userText = (lastMessage.content || '').toLowerCase();
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Intent 1: Record / Add Expense or Income
    if (
      userText.includes('add') ||
      userText.includes('spent') ||
      userText.includes('paid') ||
      userText.includes('record')
    ) {
      // Extract amount
      const amountMatch = userText.match(/(?:rs\.?|₹|\binr)?\s*(\d+(?:[.,]\d+)?)/i);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 500;
      const isIncome = userText.includes('income') || userText.includes('received') || userText.includes('salary');

      return {
        content: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'propose_add_transaction',
              arguments: JSON.stringify({
                amount_minor: Math.round(amount * 100),
                type: isIncome ? 'income' : 'expense',
                merchant: userText.includes('swiggy') ? 'Swiggy' : userText.includes('uber') ? 'Uber' : 'Store',
                category_name: isIncome ? 'Salary' : userText.includes('food') || userText.includes('swiggy') ? 'Food & Dining' : 'General Expense',
                note: lastMessage.content || '',
              }),
            },
          },
        ],
      };
    }

    // Intent 2: Budget status
    if (userText.includes('budget')) {
      return {
        content: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'check_budget_status',
              arguments: JSON.stringify({ month: currentMonth }),
            },
          },
        ],
      };
    }

    // Intent 3: Cashflow / Monthly summary / Savings
    if (
      userText.includes('cashflow') ||
      userText.includes('saving') ||
      userText.includes('overview') ||
      userText.includes('how much did i spend this month')
    ) {
      return {
        content: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'get_cashflow_trend',
              arguments: JSON.stringify({ month: currentMonth }),
            },
          },
        ],
      };
    }

    // Intent 4: Top merchants
    if (userText.includes('merchant') || userText.includes('who did i pay most') || userText.includes('biggest expense')) {
      return {
        content: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'get_top_merchants',
              arguments: JSON.stringify({ start_date: `${currentMonth}-01`, limit: 5 }),
            },
          },
        ],
      };
    }

    // Intent 5: Category spending
    if (
      userText.includes('category') ||
      userText.includes('food') ||
      userText.includes('dining') ||
      userText.includes('shopping') ||
      userText.includes('travel')
    ) {
      return {
        content: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'get_category_totals',
              arguments: JSON.stringify({ start_date: `${currentMonth}-01` }),
            },
          },
        ],
      };
    }

    // Intent 6: Accounts
    if (userText.includes('account') || userText.includes('balance') || userText.includes('net worth')) {
      return {
        content: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'get_account_summary',
              arguments: JSON.stringify({}),
            },
          },
        ],
      };
    }

    // Intent 7: Default semantic transaction search
    return {
      content: null,
      tool_calls: [
        {
          id: `call_${Date.now()}`,
          type: 'function',
          function: {
            name: 'semantic_search_transactions',
            arguments: JSON.stringify({ query_text: lastMessage.content || '', limit: 5 }),
          },
        },
      ],
    };
  }
}

/**
 * Cloud OpenAI LLM Client with Function Calling
 */
export class CloudOpenAILLMClient implements LLMClient {
  name = 'openai-chat-gpt4o-mini';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const formattedMessages = [
      { role: 'system', content: SMARTMONEY_SYSTEM_PROMPT },
      ...messages.map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'tool',
            tool_call_id: m.tool_call_id,
            content: m.content || '',
          };
        }
        if (m.tool_calls) {
          return {
            role: 'assistant',
            content: m.content,
            tool_calls: m.tool_calls,
          };
        }
        return {
          role: m.role,
          content: m.content,
        };
      }),
    ];

    const payload: any = {
      model: this.model,
      messages: formattedMessages,
      temperature: 0.1,
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI Chat API Error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    return {
      content: choice.message.content || null,
      tool_calls: choice.message.tool_calls,
    };
  }
}

let activeLLMClient: LLMClient = new MockOfflineLLMClient();

export function getActiveLLMClient(): LLMClient {
  return activeLLMClient;
}

export function setActiveLLMClient(client: LLMClient): void {
  activeLLMClient = client;
}
