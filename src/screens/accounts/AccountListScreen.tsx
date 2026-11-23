import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
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
import { AccountRepository } from '@/db/repositories/accountRepository';
import { AccountWithBalance } from '@/db/types';
import { AddAccountModal } from '@/components/accounts/AddAccountModal';
import { Plus, Landmark, Banknote, CreditCard, Wallet, TrendingUp, Archive } from 'lucide-react-native';

export const AccountListScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const client = await getDatabaseClient();
      const rows = await AccountRepository.getAllWithBalances(client);
      setAccounts(rows);
    } catch (err) {
      console.error('[AccountListScreen] Error loading accounts:', err);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  };

  const handleCreateAccount = async (data: any) => {
    const client = await getDatabaseClient();
    await AccountRepository.create(client, {
      ...data,
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    });
    await loadAccounts();
  };

  const handleArchiveAccount = (account: AccountWithBalance) => {
    Alert.alert(
      'Archive Account',
      `Are you sure you want to archive "${account.name}"? Transactions will remain in ledger history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            const client = await getDatabaseClient();
            await AccountRepository.archive(client, account.id);
            await loadAccounts();
          },
        },
      ]
    );
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Landmark size={22} color={colors.primary} />;
      case 'cash':
        return <Banknote size={22} color={colors.income} />;
      case 'credit':
        return <CreditCard size={22} color={colors.expense} />;
      case 'wallet':
        return <Wallet size={22} color={colors.transfer} />;
      case 'investment':
        return <TrendingUp size={22} color="#8B5CF6" />;
      default:
        return <Landmark size={22} color={colors.primary} />;
    }
  };

  const totalBalanceMinor = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);

  return (
    <ScreenWrapper>
      <Header
        title="Accounts"
        subtitle={`${accounts.length} Active Accounts`}
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

      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Total Across Accounts Header Card */}
        <Card variant="highlight" style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: '500' }}>
            CONSOLIDATED ASSETS
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes['2xl'],
              fontWeight: typography.weights.bold,
              marginTop: spacing.xs,
            }}
          >
            {formatCurrency(totalBalanceMinor)}
          </Text>
        </Card>

        {accounts.length === 0 ? (
          <View style={[styles.emptyContainer, { paddingVertical: spacing['3xl'] }]}>
            <Landmark size={48} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.base, marginTop: spacing.md }}>
              No accounts added yet.
            </Text>
            <Button
              title="Add Your First Account"
              onPress={() => setShowAddModal(true)}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : (
          accounts.map((acc) => (
            <Card key={acc.id} style={{ marginBottom: spacing.md }}>
              <View style={styles.accountRow}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: colors.surfaceHover,
                      borderRadius: borderRadius.lg,
                      marginRight: spacing.md,
                    },
                  ]}
                >
                  {getAccountIcon(acc.type)}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={{ color: colors.text, fontSize: typography.sizes.md, fontWeight: '600' }}>
                      {acc.name}
                    </Text>
                    <Badge label={acc.type.toUpperCase()} variant="neutral" size="sm" />
                  </View>

                  <Text
                    style={{
                      color: acc.current_balance >= 0 ? colors.text : colors.expense,
                      fontSize: typography.sizes.lg,
                      fontWeight: '700',
                      marginTop: 4,
                    }}
                  >
                    {formatCurrency(acc.current_balance)}
                  </Text>

                  <View style={styles.statsRow}>
                    <Text style={{ color: colors.income, fontSize: typography.sizes.xs }}>
                      +{formatCurrency(acc.total_income)}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs, marginHorizontal: 6 }}>
                      •
                    </Text>
                    <Text style={{ color: colors.expense, fontSize: typography.sizes.xs }}>
                      -{formatCurrency(acc.total_expense)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleArchiveAccount(acc)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginLeft: spacing.sm }}
                >
                  <Archive size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <AddAccountModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateAccount}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});

