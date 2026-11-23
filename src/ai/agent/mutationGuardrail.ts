import { DatabaseClient } from '@/db/types';
import { ActionProposal } from '@/ai/tools/toolRegistry';
import { TransactionRepository } from '@/db/repositories/transactionRepository';
import { AccountRepository } from '@/db/repositories/accountRepository';
import { CategoryRepository } from '@/db/repositories/categoryRepository';
import { EmbeddingQueueWorker } from '@/services/embeddingQueueWorker';

export const MutationGuardrail = {
  async executeConfirmedProposal(
    client: DatabaseClient,
    proposal: ActionProposal
  ): Promise<{ success: boolean; transaction_id?: string; message: string }> {
    if (proposal.status === 'confirmed') {
      return { success: false, message: 'Proposal has already been confirmed.' };
    }

    if (proposal.type === 'add_transaction') {
      const { amount_minor, type, category_name, merchant, note } = proposal.payload;

      // Find an account (or first available active account)
      const accounts = await AccountRepository.getAllWithBalances(client);
      if (accounts.length === 0) {
        throw new Error('No accounts available. Please create an account first.');
      }
      const targetAccount = accounts[0];

      // Find category
      const categories = await CategoryRepository.getAll(client);
      const matchedCategory =
        categories.find(
          (c) => c.name.toLowerCase() === category_name.toLowerCase() && c.type === type
        ) ||
        categories.find((c) => c.type === type) ||
        categories[0];

      const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const today = new Date().toISOString().substring(0, 10);

      await TransactionRepository.create(client, {
        id: txnId,
        account_id: targetAccount.id,
        amount_minor,
        type,
        category_id: matchedCategory.id,
        merchant: merchant || null,
        transaction_date: today,
        raw_note: note || null,
        scrubbed_note: note || null,
      });

      // Trigger background embedding
      EmbeddingQueueWorker.processQueue(client).catch(() => {});

      proposal.status = 'confirmed';
      return {
        success: true,
        transaction_id: txnId,
        message: `Successfully recorded ${type} of ₹${(amount_minor / 100).toFixed(2)} in ${matchedCategory.name}.`,
      };
    }

    return { success: false, message: 'Unsupported proposal mutation.' };
  },

  cancelProposal(proposal: ActionProposal): ActionProposal {
    proposal.status = 'cancelled';
    return proposal;
  },
};
