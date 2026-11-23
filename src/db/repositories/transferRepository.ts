import { DatabaseClient, Transfer } from '../types';

export interface TransferWithDetails extends Transfer {
  from_account_name: string;
  to_account_name: string;
}

export const TransferRepository = {
  async getAll(client: DatabaseClient, limit = 50): Promise<TransferWithDetails[]> {
    const query = `
      SELECT 
        t.*,
        a1.name AS from_account_name,
        a2.name AS to_account_name
      FROM transfers t
      JOIN accounts a1 ON t.from_account_id = a1.id
      JOIN accounts a2 ON t.to_account_id = a2.id
      ORDER BY t.transfer_date DESC
      LIMIT ?;
    `;
    return await client.execute<TransferWithDetails>(query, [limit]);
  },

  async create(
    client: DatabaseClient,
    transfer: Transfer
  ): Promise<Transfer> {
    if (transfer.from_account_id === transfer.to_account_id) {
      throw new Error('Source and destination accounts must be distinct.');
    }
    if (transfer.amount_minor <= 0) {
      throw new Error('Transfer amount must be strictly positive.');
    }

    return await client.transaction(async (tx) => {
      await tx.executeMutation(
        `INSERT INTO transfers (id, from_account_id, to_account_id, amount_minor, transfer_date, note)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [
          transfer.id,
          transfer.from_account_id,
          transfer.to_account_id,
          transfer.amount_minor,
          transfer.transfer_date,
          transfer.note || null,
        ]
      );
      return transfer;
    });
  },

  async delete(client: DatabaseClient, id: string): Promise<void> {
    await client.executeMutation(`DELETE FROM transfers WHERE id = ?;`, [id]);
  },
};

