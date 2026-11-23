import { DatabaseClient } from '@/db/types';
import { ChatMessage, LLMClient } from '@/ai/llm/types';
import { ToolRegistry, ActionProposal } from '@/ai/tools/toolRegistry';
import { scrubText } from '@/security/piiScrubber';
import { ConversationRepository } from '@/db/repositories/conversationRepository';
import { getActiveLLMClient } from '@/ai/llm/llmClient';

export interface AgentRunResult {
  reply: string;
  proposals: ActionProposal[];
  messages: ChatMessage[];
}

export const AgentOrchestrator = {
  async processUserMessage(
    client: DatabaseClient,
    conversationId: string,
    userInput: string,
    llm?: LLMClient
  ): Promise<AgentRunResult> {
    const activeLLM = llm || getActiveLLMClient();
    const proposals: ActionProposal[] = [];

    // 1. Scrub user input through local PII scrubber before sending to AI
    const { scrubbedText } = scrubText(userInput);

    // 2. Persist user message
    await ConversationRepository.addMessage(client, conversationId, {
      role: 'user',
      content: scrubbedText,
    });

    // 3. Fetch conversation history
    let messages = await ConversationRepository.getMessages(client, conversationId);

    // 4. Multi-turn Tool Calling Loop (Limit max turns to 3)
    let turns = 0;
    const maxTurns = 3;
    let finalReply = '';

    while (turns < maxTurns) {
      turns++;

      const toolDefs = ToolRegistry.getAllDefinitions();
      const response = await activeLLM.chat(messages, toolDefs);

      if (response.tool_calls && response.tool_calls.length > 0) {
        // Record assistant intent message with tool calls
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls,
        };
        await ConversationRepository.addMessage(client, conversationId, assistantMsg);
        messages.push(assistantMsg);

        // Execute each requested tool locally
        for (const call of response.tool_calls) {
          const fnName = call.function.name;
          let fnArgs: any = {};
          try {
            fnArgs = JSON.parse(call.function.arguments);
          } catch {
            fnArgs = {};
          }

          let toolResult: any;
          try {
            toolResult = await ToolRegistry.executeTool(client, fnName, fnArgs);
            if (fnName === 'propose_add_transaction') {
              proposals.push(toolResult as ActionProposal);
            }
          } catch (err: any) {
            toolResult = { error: err?.message || 'Tool execution failed' };
          }

          // Record tool result
          const toolMsg: ChatMessage = {
            role: 'tool',
            name: fnName,
            tool_call_id: call.id,
            content: JSON.stringify(toolResult),
          };
          await ConversationRepository.addMessage(client, conversationId, toolMsg);
          messages.push(toolMsg);
        }
      } else {
        // Final assistant text response
        finalReply = response.content || 'I have analyzed your request.';
        const assistantFinalMsg: ChatMessage = {
          role: 'assistant',
          content: finalReply,
        };
        await ConversationRepository.addMessage(client, conversationId, assistantFinalMsg);
        messages.push(assistantFinalMsg);
        break;
      }
    }

    return {
      reply: finalReply,
      proposals,
      messages,
    };
  },
};

