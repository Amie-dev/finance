import { DatabaseClient, AIConversation, AIMessage } from '../types';
import { ChatMessage } from '@/ai/llm/types';

export const ConversationRepository = {
  async getOrCreateConversation(
    client: DatabaseClient,
    title = 'SmartMoney Assistant'
  ): Promise<AIConversation> {
    const rows = await client.execute<AIConversation>(
      `SELECT * FROM ai_conversations ORDER BY updated_at DESC LIMIT 1;`
    );
    if (rows.length > 0) {
      return rows[0];
    }

    const id = `conv_${Date.now()}`;
    const now = new Date().toISOString();
    await client.executeMutation(
      `INSERT INTO ai_conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?);`,
      [id, title, now, now]
    );

    return { id, title, created_at: now, updated_at: now };
  },

  async getMessages(client: DatabaseClient, conversationId: string): Promise<ChatMessage[]> {
    const rows = await client.execute<AIMessage>(
      `SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC;`,
      [conversationId]
    );

    return rows.map((r) => {
      let parsedContent: any = r.content;
      let tool_calls = undefined;
      let tool_call_id = undefined;

      try {
        const parsed = JSON.parse(r.content);
        if (parsed.tool_calls) {
          tool_calls = parsed.tool_calls;
          parsedContent = parsed.content || null;
        } else if (parsed.tool_call_id) {
          tool_call_id = parsed.tool_call_id;
          parsedContent = parsed.content;
        }
      } catch {
        // Plain text content
      }

      return {
        id: r.id,
        role: r.role as any,
        content: parsedContent,
        tool_calls,
        tool_call_id,
        created_at: r.created_at,
      };
    });
  },

  async addMessage(
    client: DatabaseClient,
    conversationId: string,
    message: ChatMessage
  ): Promise<ChatMessage> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    let storedContent = message.content || '';
    if (message.tool_calls) {
      storedContent = JSON.stringify({
        content: message.content,
        tool_calls: message.tool_calls,
      });
    } else if (message.tool_call_id) {
      storedContent = JSON.stringify({
        content: message.content,
        tool_call_id: message.tool_call_id,
        name: message.name,
      });
    }

    await client.executeMutation(
      `INSERT INTO ai_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?);`,
      [id, conversationId, message.role, storedContent, now]
    );

    await client.executeMutation(
      `UPDATE ai_conversations SET updated_at = ? WHERE id = ?;`,
      [now, conversationId]
    );

    return { ...message, id, created_at: now };
  },

  async clearConversation(client: DatabaseClient, conversationId: string): Promise<void> {
    await client.executeMutation(`DELETE FROM ai_messages WHERE conversation_id = ?;`, [conversationId]);
  },
};
