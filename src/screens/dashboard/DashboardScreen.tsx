import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/theme';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Header } from '@/components/common/Header';
import { formatCurrency } from '@/utils/money';
import { getDatabaseClient } from '@/db/client';
import { AccountRepository } from '@/db/repositories/accountRepository';
import { TransactionRepository, TransactionWithDetails } from '@/db/repositories/transactionRepository';
import { TransferRepository } from '@/db/repositories/transferRepository';
import { BudgetRepository, BudgetWithSpend } from '@/db/repositories/budgetRepository';
import { CategoryRepository } from '@/db/repositories/categoryRepository';
import { AccountWithBalance, Category } from '@/db/types';
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal';
import { AddAccountModal } from '@/components/accounts/AddAccountModal';
import { useAppLock } from '@/security/AppLockProvider';
import {
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Lock,
  Wallet,
  Calendar,
  AlertCircle,
} from 'lucide-react-native';

interface DashboardScreenProps {
  onNavigateToTab?: (tab: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateToTab }) => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { lockApp } = useAppLock();

  const [hideBalances, setHideBalances] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [netWorthMinor, setNetWorthMinor] = useState(0);
  const [monthlyCashflow, setMonthlyCashflow] = useState({
    income_minor: 0,
    expense_minor: 0,
    net_savings_minor: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithDetails[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithSpend[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Modals
  const [showAddTxnModal, setShowAddTxnModal] = useState(false);
  const [showAddAccModal, setShowAddAccModal] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const client = await getDatabaseClient();
      const currentMonth = new Date().toISOString().substring(0, 7);

      const [nw, cf, recent, bdgs, accs, cats] = await Promise.all([
        AccountRepository.getTotalNetWorth(client),
        TransactionRepository.getMonthlyTotals(client, currentMonth),
        TransactionRepository.getRecent(client, 5),
        BudgetRepository.getBudgetsWithSpend(client, currentMonth),
        AccountRepository.getAllWithBalances(client),
        CategoryRepository.getAll(client),
      ]);

      setNetWorthMinor(nw);
      setMonthlyCashflow(cf);
      setRecentTransactions(recent);
      setBudgets(bdgs);
      setAccounts(accs);
      setCategories(cats);
    } catch (err) {
      console.error('[DashboardScreen] Error loading data:', err);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleAddTransaction = async (data: any) => {
    const client = await getDatabaseClient();
    await TransactionRepository.create(client, {
      ...data,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    });
    await loadDashboardData();
  };

  const handleAddTransfer = async (data: any) => {
    const client = await getDatabaseClient();
    await TransferRepository.create(client, {
      ...data,
      id: `trf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    });
    await loadDashboardData();
  };

  const handleAddAccount = async (data: any) => {
    const client = await getDatabaseClient();
    await AccountRepository.create(client, {
      ...data,
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    });
    await loadDashboardData();
  };

  const displayAmount = (minor: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(minor);
  };

  return (
    <ScreenWrapper>
      <Header
        title="SmartMoney"
        subtitle="Financial Overview"
        rightAction={
          <Button
            title=""
            icon={<Lock size={18} color={colors.text} />}
            variant="ghost"
            onPress={lockApp}
            size="sm"
          />
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Total Net Worth Card */}
        <Card variant="surface" style={[styles.heroCard, { borderColor: colors.borderLight }]}>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: '500' }}>
              TOTAL NET WORTH
            </Text>
            <TouchableOpacity onPress={() => setHideBalances(!hideBalances)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {hideBalances ? (
                <EyeOff size={18} color={colors.textSecondary} />
              ) : (
                <Eye size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.netWorthText,
              {
                color: colors.text,
                fontSize: typography.sizes['3xl'],
                fontWeight: typography.weights.extrabold,
                marginVertical: spacing.sm,
              },
            ]}
          >
            {displayAmount(netWorthMinor)}
          </Text>

          {/* Monthly Cashflow Inline Breakdown */}
          <View style={[styles.cashflowRow, { borderTopColor: colors.borderLight, paddingTop: spacing.md }]}>
            <View style={styles.cashflowItem}>
              <View style={styles.rowAlign}>
                <ArrowUpRight size={14} color={colors.income} />
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginLeft: 4 }}>
                  Income
                </Text>
              </View>
              <Text style={{ color: colors.income, fontWeight: '600', fontSize: typography.sizes.sm, marginTop: 2 }}>
                {displayAmount(monthlyCashflow.income_minor)}
              </Text>
            </View>

            <View style={styles.cashflowItem}>
              <View style={styles.rowAlign}>
                <ArrowDownRight size={14} color={colors.expense} />
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginLeft: 4 }}>
                  Expense
                </Text>
              </View>
              <Text style={{ color: colors.expense, fontWeight: '600', fontSize: typography.sizes.sm, marginTop: 2 }}>
                {displayAmount(monthlyCashflow.expense_minor)}
              </Text>
            </View>

            <View style={styles.cashflowItem}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
                Net Savings
              </Text>
              <Text
                style={{
                  color: monthlyCashflow.net_savings_minor >= 0 ? colors.income : colors.expense,
                  fontWeight: '600',
                  fontSize: typography.sizes.sm,
                  marginTop: 2,
                }}
              >
                {displayAmount(monthlyCashflow.net_savings_minor)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions Bar */}
        <View style={[styles.quickActions, { marginVertical: spacing.md }]}>
          {accounts.length === 0 ? (
            <Button
              title="Add Your First Account"
              icon={<Wallet size={16} color={colors.textInverse} />}
              onPress={() => setShowAddAccModal(true)}
              style={{ width: '100%' }}
            />
          ) : (
            <>
              <Button
                title="Add Entry"
                icon={<Plus size={16} color={colors.textInverse} />}
                onPress={() => setShowAddTxnModal(true)}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="+ Account"
                variant="secondary"
                onPress={() => setShowAddAccModal(true)}
                style={{ flex: 1 }}
              />
            </>
          )}
        </View>

        {/* Budget Utilization Widget */}
        {budgets.length > 0 ? (
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.text, fontSize: typography.sizes.md, fontWeight: '600' }}>
                Monthly Budgets
              </Text>
              {onNavigateToTab ? (
                <TouchableOpacity onPress={() => onNavigateToTab('Budgets')}>
                  <Text style={{ color: colors.primary, fontSize: typography.sizes.xs, fontWeight: '600' }}>
                    View All
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={{ marginTop: spacing.sm }}>
              {budgets.slice(0, 3).map((b) => (
                <View key={b.id} style={{ marginVertical: spacing.xs }}>
                  <View style={styles.rowBetween}>
                    <Text style={{ color: colors.text, fontSize: typography.sizes.sm, fontWeight: '500' }}>
                      {b.category_name}
                    </Text>
                    <Text
                      style={{
                        color: b.is_exceeded ? colors.danger : b.is_warning ? colors.warning : colors.textSecondary,
                        fontSize: typography.sizes.xs,
                        fontWeight: '600',
                      }}
                    >
                      {b.percentage}% ({displayAmount(b.spent_minor)} / {displayAmount(b.monthly_limit_minor)})
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.background, borderRadius: borderRadius.full }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(b.percentage, 100)}%`,
                          backgroundColor: b.is_exceeded ? colors.danger : b.is_warning ? colors.warning : colors.primary,
                          borderRadius: borderRadius.full,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {/* Recent Transactions List */}
        <Card style={{ marginBottom: spacing.xl }}>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.text, fontSize: typography.sizes.md, fontWeight: '600' }}>
              Recent Transactions
            </Text>
            {onNavigateToTab ? (
              <TouchableOpacity onPress={() => onNavigateToTab('Transactions')}>
                <Text style={{ color: colors.primary, fontSize: typography.sizes.xs, fontWeight: '600' }}>
                  View All
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {recentTransactions.length === 0 ? (
            <View style={[styles.emptyContainer, { paddingVertical: spacing.xl }]}>
              <Calendar size={32} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: typography.sizes.sm, marginTop: spacing.sm }}>
                No transactions recorded yet.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: spacing.sm }}>
              {recentTransactions.map((tx) => (
                <View key={tx.id} style={[styles.txnRow, { borderBottomColor: colors.borderLight }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: typography.sizes.base, fontWeight: '500' }}>
                      {tx.merchant || tx.category_name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs, marginTop: 2 }}>
                      {tx.account_name} • {tx.transaction_date}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: tx.type === 'income' ? colors.income : colors.expense,
                      fontWeight: '700',
                      fontSize: typography.sizes.base,
                    }}
                  >
                    {tx.type === 'income' ? '+' : '-'}{displayAmount(tx.amount_minor)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={showAddTxnModal}
        onClose={() => setShowAddTxnModal(false)}
        accounts={accounts}
        categories={categories}
        onSubmitTransaction={handleAddTransaction}
        onSubmitTransfer={handleAddTransfer}
      />

      {/* Add Account Modal */}
      <AddAccountModal
        visible={showAddAccModal}
        onClose={() => setShowAddAccModal(false)}
        onSubmit={handleAddAccount}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  heroCard: {
    padding: 20,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  netWorthText: {
    letterSpacing: -0.5,
  },
  cashflowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  cashflowItem: {
    alignItems: 'flex-start',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressBarBg: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
