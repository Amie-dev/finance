import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Header } from '@/components/common/Header';
import { formatCurrency } from '@/utils/money';
import { getDatabaseClient } from '@/db/client';
import { TransactionRepository, TransactionWithDetails } from '@/db/repositories/transactionRepository';
import { TransferRepository } from '@/db/repositories/transferRepository';
import { AccountRepository } from '@/db/repositories/accountRepository';
import { CategoryRepository } from '@/db/repositories/categoryRepository';
import { AccountWithBalance, Category, TransactionType } from '@/db/types';
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal';
import { Search, Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';

export const TransactionListScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      const client = await getDatabaseClient();
      const [txns, accs, cats] = await Promise.all([
        TransactionRepository.getFiltered(client, {
          search: search.trim() || undefined,
          type: typeFilter === 'all' ? undefined : typeFilter,
          category_id: selectedCategoryId === 'all' ? undefined : selectedCategoryId,
          limit: 100,
        }),
        AccountRepository.getAllWithBalances(client),
        CategoryRepository.getAll(client),
      ]);

      setTransactions(txns);
      setAccounts(accs);
      setCategories(cats);
    } catch (err) {
      console.error('[TransactionListScreen] Error loading transactions:', err);
    }
  }, [search, typeFilter, selectedCategoryId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleAddTransaction = async (data: any) => {
    const client = await getDatabaseClient();
    await TransactionRepository.create(client, {
      ...data,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    });
    await loadTransactions();
  };

  const handleAddTransfer = async (data: any) => {
    const client = await getDatabaseClient();
    await TransferRepository.create(client, {
      ...data,
      id: `trf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    });
    await loadTransactions();
  };

  const handleDeleteTransaction = (txn: TransactionWithDetails) => {
    Alert.alert(
      'Delete Entry',
      `Delete ${txn.merchant || txn.category_name} (${formatCurrency(txn.amount_minor)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const client = await getDatabaseClient();
            await TransactionRepository.delete(client, txn.id);
            await loadTransactions();
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper>
      <Header
        title="Ledger"
        subtitle={`${transactions.length} Records`}
        rightAction={
          <Button
            title=""
            icon={<Plus size={20} color={colors.text} />}
            variant="ghost"
            onPress={() => setShowAddModal(true)}
            size="sm"
          />
        }
      />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            placeholder="Search merchant or notes..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text, fontSize: typography.sizes.sm }]}
          />
        </View>

        {/* Type Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setTypeFilter('all')}
            style={[
              styles.typeTab,
              {
                backgroundColor: typeFilter === 'all' ? colors.primary : colors.surface,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Text style={{ color: typeFilter === 'all' ? colors.textInverse : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTypeFilter('expense')}
            style={[
              styles.typeTab,
              {
                backgroundColor: typeFilter === 'expense' ? colors.expense : colors.surface,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Text style={{ color: typeFilter === 'expense' ? '#FFFFFF' : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              Expenses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTypeFilter('income')}
            style={[
              styles.typeTab,
              {
                backgroundColor: typeFilter === 'income' ? colors.income : colors.surface,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Text style={{ color: typeFilter === 'income' ? '#FFFFFF' : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              Income
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {transactions.length === 0 ? (
          <View style={[styles.emptyContainer, { paddingVertical: spacing['3xl'] }]}>
            <Text style={{ color: colors.textMuted, fontSize: typography.sizes.base }}>
              No matching transactions found.
            </Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <Card key={tx.id} style={{ marginBottom: spacing.sm }}>
              <View style={styles.txnItem}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: tx.type === 'income' ? colors.incomeLight : colors.expenseLight,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                >
                  {tx.type === 'income' ? (
                    <ArrowUpRight size={18} color={colors.income} />
                  ) : (
                    <ArrowDownRight size={18} color={colors.expense} />
                  )}
                </View>

                <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
                  <Text style={{ color: colors.text, fontSize: typography.sizes.base, fontWeight: '600' }}>
                    {tx.merchant || tx.category_name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs, marginTop: 2 }}>
                    {tx.category_name} • {tx.account_name} • {tx.transaction_date}
                  </Text>
                  {tx.raw_note ? (
                    <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 }}>
                      {tx.raw_note}
                    </Text>
                  ) : null}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      color: tx.type === 'income' ? colors.income : colors.expense,
                      fontWeight: '700',
                      fontSize: typography.sizes.base,
                    }}
                  >
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount_minor)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteTransaction(tx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginTop: 6 }}
                  >
                    <Trash2 size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        accounts={accounts}
        categories={categories}
        onSubmitTransaction={handleAddTransaction}
        onSubmitTransfer={handleAddTransfer}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  typeTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
