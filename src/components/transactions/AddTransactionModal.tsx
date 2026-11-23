import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/theme';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { parseCurrencyInput } from '@/utils/money';
import { AccountWithBalance, Category, TransactionType } from '@/db/types';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight } from 'lucide-react-native';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: AccountWithBalance[];
  categories: Category[];
  onSubmitTransaction: (data: {
    account_id: string;
    amount_minor: number;
    type: TransactionType;
    category_id: string;
    merchant?: string;
    transaction_date: string;
    raw_note?: string;
  }) => Promise<void>;
  onSubmitTransfer: (data: {
    from_account_id: string;
    to_account_id: string;
    amount_minor: number;
    transfer_date: string;
    note?: string;
  }) => Promise<void>;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  accounts,
  categories,
  onSubmitTransaction,
  onSubmitTransfer,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default category on tab change
  const filteredCategories = categories.filter((c) =>
    activeTab === 'transfer' ? true : c.type === activeTab
  );

  const handleSubmit = async () => {
    const amountMinor = parseCurrencyInput(amountInput);
    if (amountMinor <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (!selectedAccountId) {
      setError('Please select an account.');
      return;
    }

    setLoading(true);
    setError('');
    const today = new Date().toISOString().substring(0, 10);

    try {
      if (activeTab === 'transfer') {
        if (selectedAccountId === toAccountId) {
          setError('Source and Destination accounts must be different.');
          setLoading(false);
          return;
        }
        await onSubmitTransfer({
          from_account_id: selectedAccountId,
          to_account_id: toAccountId,
          amount_minor: amountMinor,
          transfer_date: today,
          note: note.trim() || undefined,
        });
      } else {
        const catId = selectedCategoryId || filteredCategories[0]?.id;
        if (!catId) {
          setError('Please select a category.');
          setLoading(false);
          return;
        }

        await onSubmitTransaction({
          account_id: selectedAccountId,
          amount_minor: amountMinor,
          type: activeTab,
          category_id: catId,
          merchant: merchant.trim() || undefined,
          transaction_date: today,
          raw_note: note.trim() || undefined,
        });
      }

      setAmountInput('');
      setMerchant('');
      setNote('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Transaction submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.surface, borderRadius: borderRadius['2xl'] }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold }]}>
              Record Entry
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            {/* Type Switcher */}
            <View style={[styles.typeSwitcher, { backgroundColor: colors.background, borderRadius: borderRadius.md }]}>
              <TouchableOpacity
                onPress={() => setActiveTab('expense')}
                style={[
                  styles.tabButton,
                  activeTab === 'expense' && { backgroundColor: colors.expenseLight, borderRadius: borderRadius.sm },
                ]}
              >
                <ArrowDownRight size={16} color={activeTab === 'expense' ? colors.expense : colors.textSecondary} />
                <Text
                  style={{
                    color: activeTab === 'expense' ? colors.expense : colors.textSecondary,
                    fontWeight: '600',
                    marginLeft: 4,
                  }}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('income')}
                style={[
                  styles.tabButton,
                  activeTab === 'income' && { backgroundColor: colors.incomeLight, borderRadius: borderRadius.sm },
                ]}
              >
                <ArrowUpRight size={16} color={activeTab === 'income' ? colors.income : colors.textSecondary} />
                <Text
                  style={{
                    color: activeTab === 'income' ? colors.income : colors.textSecondary,
                    fontWeight: '600',
                    marginLeft: 4,
                  }}
                >
                  Income
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('transfer')}
                style={[
                  styles.tabButton,
                  activeTab === 'transfer' && { backgroundColor: colors.transferLight, borderRadius: borderRadius.sm },
                ]}
              >
                <ArrowLeftRight size={16} color={activeTab === 'transfer' ? colors.transfer : colors.textSecondary} />
                <Text
                  style={{
                    color: activeTab === 'transfer' ? colors.transfer : colors.textSecondary,
                    fontWeight: '600',
                    marginLeft: 4,
                  }}
                >
                  Transfer
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <Input
              label="Amount (₹)"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amountInput}
              onChangeText={setAmountInput}
              containerStyle={{ marginVertical: spacing.md }}
              style={{ fontSize: 24, fontWeight: '700' }}
            />

            {/* Account Selector */}
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.sm, marginBottom: spacing.xs }]}>
              {activeTab === 'transfer' ? 'From Account' : 'Account'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={styles.pillRow}>
                {accounts.map((acc) => {
                  const isSelected = (selectedAccountId || accounts[0]?.id) === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => setSelectedAccountId(acc.id)}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: colors.border,
                          borderRadius: borderRadius.full,
                        },
                      ]}
                    >
                      <Text style={{ color: isSelected ? colors.textInverse : colors.text, fontWeight: '500' }}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* If Transfer: Destination Account */}
            {activeTab === 'transfer' ? (
              <>
                <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.sm, marginBottom: spacing.xs }]}>
                  To Account
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  <View style={styles.pillRow}>
                    {accounts.map((acc) => {
                      const isSelected = toAccountId === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          onPress={() => setToAccountId(acc.id)}
                          style={[
                            styles.pill,
                            {
                              backgroundColor: isSelected ? colors.transfer : colors.background,
                              borderColor: colors.border,
                              borderRadius: borderRadius.full,
                            },
                          ]}
                        >
                          <Text style={{ color: isSelected ? '#FFFFFF' : colors.text, fontWeight: '500' }}>
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            ) : (
              <>
                {/* Category Selector */}
                <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.sm, marginBottom: spacing.xs }]}>
                  Category
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  <View style={styles.pillRow}>
                    {filteredCategories.map((cat) => {
                      const isSelected = (selectedCategoryId || filteredCategories[0]?.id) === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setSelectedCategoryId(cat.id)}
                          style={[
                            styles.pill,
                            {
                              backgroundColor: isSelected ? cat.color : colors.background,
                              borderColor: colors.border,
                              borderRadius: borderRadius.full,
                            },
                          ]}
                        >
                          <Text style={{ color: isSelected ? '#FFFFFF' : colors.text, fontWeight: '500' }}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Merchant / Payee */}
                <Input
                  label="Merchant / Payee (Optional)"
                  placeholder="e.g. Swiggy, Amazon, Uber"
                  value={merchant}
                  onChangeText={setMerchant}
                  containerStyle={{ marginBottom: spacing.md }}
                />
              </>
            )}

            {/* Note */}
            <Input
              label="Notes"
              placeholder="Add details (auto-scrubbed before AI processing)"
              value={note}
              onChangeText={setNote}
              containerStyle={{ marginBottom: spacing.lg }}
            />

            {error ? (
              <Text style={[styles.error, { color: colors.danger, marginBottom: spacing.md }]}>
                {error}
              </Text>
            ) : null}

            <Button
              title={activeTab === 'transfer' ? 'Confirm Transfer' : `Save ${activeTab === 'expense' ? 'Expense' : 'Income'}`}
              onPress={handleSubmit}
              loading={loading}
              size="lg"
              variant={activeTab === 'expense' ? 'danger' : activeTab === 'income' ? 'primary' : 'secondary'}
              style={{ marginBottom: spacing.md }}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {},
  formContent: {
    padding: 16,
  },
  typeSwitcher: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  label: {
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
  },
});

