import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Header } from '@/components/common/Header';
import { Badge } from '@/components/common/Badge';
import { getDatabaseClient } from '@/db/client';
import { ConversationRepository } from '@/db/repositories/conversationRepository';
import { AgentOrchestrator } from '@/ai/agent/agentOrchestrator';
import { MutationGuardrail } from '@/ai/agent/mutationGuardrail';
import { ActionProposal } from '@/ai/tools/toolRegistry';
import { ChatMessage } from '@/ai/llm/types';
import { ConfirmationCard } from '@/components/chat/ConfirmationCard';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Lock,
} from 'lucide-react-native';

const QUICK_PROMPTS = [
  'How much did I spend this month?',
  'Check budget status',
  'Who are my top merchants?',
  'Add ₹250 for Starbucks coffee',
];

export const ChatScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingProposals, setPendingProposals] = useState<ActionProposal[]>([]);

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  useEffect(() => {
    async function initChat() {
      try {
        const client = await getDatabaseClient();
        const conv = await ConversationRepository.getOrCreateConversation(client);
        setConversationId(conv.id);
        const msgs = await ConversationRepository.getMessages(client, conv.id);
        setMessages(msgs);
      } catch (err) {
        console.error('[ChatScreen] Error initializing chat:', err);
      }
    }
    initChat();
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading || !conversationId) return;

    setInput('');
    setLoading(true);

    try {
      const client = await getDatabaseClient();
      const result = await AgentOrchestrator.processUserMessage(client, conversationId, text);

      setMessages(result.messages);
      if (result.proposals.length > 0) {
        setPendingProposals((prev) => [...prev, ...result.proposals]);
      }

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('[ChatScreen] Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!conversationId) return;
    const client = await getDatabaseClient();
    await ConversationRepository.clearConversation(client, conversationId);
    setMessages([]);
    setPendingProposals([]);
  };

  const handleConfirmProposal = async (proposal: ActionProposal) => {
    const client = await getDatabaseClient();
    await MutationGuardrail.executeConfirmedProposal(client, proposal);
  };

  const handleCancelProposal = (proposal: ActionProposal) => {
    MutationGuardrail.cancelProposal(proposal);
  };

  return (
    <ScreenWrapper>
      <Header
        title="SmartMoney AI"
        subtitle="Private Finance Assistant"
        rightAction={
          <TouchableOpacity onPress={handleClearHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Trash2 size={18} color={colors.textMuted} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.messageList, { padding: spacing.lg }]}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Privacy Protection Banner */}
          <View
            style={[
              styles.privacyBanner,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                borderRadius: borderRadius.md,
                padding: spacing.sm,
              },
            ]}
          >
            <Lock size={14} color={colors.primary} />
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginLeft: 6 }}>
              Local PII Shield Active • Deterministic SQL Tools Enforced
            </Text>
          </View>

          {messages.length === 0 ? (
            <View style={[styles.emptyContainer, { paddingVertical: spacing['2xl'] }]}>
              <View
                style={[
                  styles.botIconWrapper,
                  {
                    backgroundColor: colors.cardHighlight,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Sparkles size={36} color={colors.primary} />
              </View>
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.sizes.lg,
                  fontWeight: typography.weights.bold,
                  marginTop: spacing.md,
                }}
              >
                Ask SmartMoney Anything
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sizes.sm,
                  textAlign: 'center',
                  marginTop: spacing.xs,
                  maxWidth: 280,
                }}
              >
                Ask about spending, budgets, cashflow, or propose transactions in plain language.
              </Text>
            </View>
          ) : (
            messages
              .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
              .map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <View
                    key={m.id || idx}
                    style={[
                      styles.messageRow,
                      isUser ? styles.userRow : styles.assistantRow,
                      { marginBottom: spacing.md },
                    ]}
                  >
                    {!isUser && (
                      <View
                        style={[
                          styles.avatar,
                          {
                            backgroundColor: colors.primary,
                            borderRadius: borderRadius.full,
                            marginRight: spacing.xs,
                          },
                        ]}
                      >
                        <Bot size={14} color={colors.textInverse} />
                      </View>
                    )}

                    <View
                      style={[
                        styles.bubble,
                        isUser
                          ? [styles.userBubble, { backgroundColor: colors.primary, borderRadius: borderRadius.lg }]
                          : [
                              styles.assistantBubble,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.borderLight,
                                borderRadius: borderRadius.lg,
                              },
                            ],
                        { padding: spacing.md },
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          {
                            color: isUser ? colors.textInverse : colors.text,
                            fontSize: typography.sizes.sm,
                            lineHeight: typography.lineHeights.base,
                          },
                        ]}
                      >
                        {m.content}
                      </Text>
                    </View>
                  </View>
                );
              })
          )}

          {/* Pending Mutation Proposals */}
          {pendingProposals.map((prop) => (
            <ConfirmationCard
              key={prop.id}
              proposal={prop}
              onConfirm={handleConfirmProposal}
              onCancel={handleCancelProposal}
            />
          ))}

          {loading && (
            <View style={styles.loadingRow}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: borderRadius.full,
                    marginRight: spacing.xs,
                  },
                ]}
              >
                <Bot size={14} color={colors.textInverse} />
              </View>
              <View
                style={[
                  styles.bubble,
                  styles.assistantBubble,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                    borderRadius: borderRadius.lg,
                    padding: spacing.md,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View style={styles.quickChipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: spacing.md }}>
            <View style={styles.chipRow}>
              {QUICK_PROMPTS.map((q) => (
                <TouchableOpacity
                  key={q}
                  onPress={() => handleSendMessage(q)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500' }}>
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          <TextInput
            placeholder="Ask about finances or record spend..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSendMessage()}
            style={[styles.input, { color: colors.text, fontSize: typography.sizes.sm }]}
          />
          <TouchableOpacity
            onPress={() => handleSendMessage()}
            disabled={!input.trim() || loading}
            style={[
              styles.sendButton,
              {
                backgroundColor: input.trim() && !loading ? colors.primary : colors.surfaceHover,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Send size={16} color={input.trim() && !loading ? colors.textInverse : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  messageList: {
    paddingBottom: 20,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  botIconWrapper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '82%',
  },
  userBubble: {},
  assistantBubble: {
    borderWidth: 1,
  },
  messageText: {},
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  quickChipsContainer: {
    paddingVertical: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
