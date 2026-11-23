import { describe, it, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { migration001 } from '@/db/migrations/001_initial_schema';
import { migration002 } from '@/db/migrations/002_vector_tables';
import { DatabaseClient } from '@/db/types';
import { AccountRepository } from '@/db/repositories/accountRepository';
import { TransactionRepository } from '@/db/repositories/transactionRepository';
import { BudgetRepository } from '@/db/repositories/budgetRepository';
import { ConversationRepository } from '@/db/repositories/conversationRepository';
import { ToolRegistry } from '@/ai/tools/toolRegistry';
import { MockOfflineLLMClient } from '@/ai/llm/llmClient';
import { AgentOrchestrator } from '@/ai/agent/agentOrchestrator';
import { MutationGuardrail } from '@/ai/agent/mutationGuardrail';

class BunSqliteAdapter implements DatabaseClient {
  private db: Database;
  constructor(db: Database) {
    this.db = db;
  }
  async execute<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }
  async executeMutation(sql: string, params: any[] = []): Promise<{ rowsAffected: number; insertId?: number }> {
    const res = this.db.prepare(sql).run(...params);
    return { rowsAffected: res.changes, insertId: Number(res.lastInsertRowid) };
  }
  async transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = await callback(this);
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }
}

describe('SmartMoney AI Finance Agent & Tool Registry', () => {
  let db: Database;
  let client: DatabaseClient;
  let mockLLM: MockOfflineLLMClient;
  const currentMonth = new Date().toISOString().substring(0, 7);

  beforeEach(async () => {
    db = new Database(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    for (const stmt of migration001.up) db.run(stmt);
    for (const stmt of migration002.up) db.run(stmt);
    client = new BunSqliteAdapter(db);
    mockLLM = new MockOfflineLLMClient();

    // Setup account
    await AccountRepository.create(client, {
      id: 'acc_salary',
      name: 'Salary Bank',
      type: 'bank',
      initial_balance: 5000000,
      currency: 'INR',
    });

    // Seed transaction
    await TransactionRepository.create(client, {
      id: 't_food',
      account_id: 'acc_salary',
      amount_minor: 125000, // ₹1,250.00
      type: 'expense',
      category_id: 'cat_food',
      merchant: 'Swiggy',
      transaction_date: `${currentMonth}-10`,
      raw_note: 'Team biryani lunch',
      scrubbed_note: 'Team biryani lunch',
    });
  });

  it('executes get_category_totals tool and returns accurate minor unit totals', async () => {
    const result = await ToolRegistry.executeTool(client, 'get_category_totals', {
      start_date: `${currentMonth}-01`,
      end_date: `${currentMonth}-31`,
    });

    expect(result.length).toBeGreaterThan(0);
    const foodEntry = result.find((r: any) => r.name === 'Food & Dining');
    expect(foodEntry).toBeDefined();
    expect(foodEntry.total_spent_minor).toBe(125000);
  });

  it('runs multi-turn agent loop to answer spending question', async () => {
    const conv = await ConversationRepository.getOrCreateConversation(client, 'Test Chat');

    const result = await AgentOrchestrator.processUserMessage(
      client,
      conv.id,
      'How much did I spend on food this month?',
      mockLLM
    );

    expect(result.reply).toContain('Food & Dining');
    expect(result.reply).toContain('1,250');
    expect(result.messages.length).toBeGreaterThanOrEqual(4); // User -> Assistant (call) -> Tool (result) -> Assistant (reply)
  });

  it('enforces mutation guardrail: creates proposal and requires explicit confirmation', async () => {
    const conv = await ConversationRepository.getOrCreateConversation(client, 'Test Chat');

    // 1. User asks to record an expense
    const result = await AgentOrchestrator.processUserMessage(
      client,
      conv.id,
      'Record 450 rs for coffee at Starbucks',
      mockLLM
    );

    expect(result.proposals.length).toBe(1);
    const proposal = result.proposals[0];
    expect(proposal.type).toBe('add_transaction');
    expect(proposal.status).toBe('pending');
    expect(proposal.payload.amount_minor).toBe(45000);
    expect(proposal.payload.merchant).toBe('Store');

    // Verify transaction NOT yet in database before confirmation
    const txnsBefore = await TransactionRepository.getFiltered(client, { search: 'coffee' });
    expect(txnsBefore.length).toBe(0);

    // 2. Explicit User Confirmation
    const execResult = await MutationGuardrail.executeConfirmedProposal(client, proposal);
    expect(execResult.success).toBe(true);
    expect(proposal.status).toBe('confirmed');

    // Verify transaction IS now in database
    const txnsAfter = await TransactionRepository.getFiltered(client, { limit: 10 });
    const coffeeTxn = txnsAfter.find((t) => t.amount_minor === 45000);
    expect(coffeeTxn).toBeDefined();
    expect(coffeeTxn?.amount_minor).toBe(45000);
  });
});

