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
import { BudgetRepository, BudgetWithSpend } from '@/db/repositories/budgetRepository';
import { CategoryRepository } from '@/db/repositories/categoryRepository';
import { Category } from '@/db/types';
import { AddBudgetModal } from '@/components/budgets/AddBudgetModal';
import { Plus, Target, Trash2, AlertTriangle } from 'lucide-react-native';

export const BudgetListScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [budgets, setBudgets] = useState<BudgetWithSpend[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

  const loadBudgets = useCallback(async () => {
    try {
      const client = await getDatabaseClient();
      const [bdgs, cats] = await Promise.all([
        BudgetRepository.getBudgetsWithSpend(client, currentMonth),
        CategoryRepository.getAll(client),
      ]);
      setBudgets(bdgs);
      setCategories(cats);
    } catch (err) {
      console.error('[BudgetListScreen] Error loading budgets:', err);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBudgets();
    setRefreshing(false);
  };

  const handleCreateBudget = async (data: any) => {
    const client = await getDatabaseClient();
    await BudgetRepository.create(client, {
      ...data,
      id: `bdg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    });
    await loadBudgets();
  };

  const handleDeleteBudget = (budget: BudgetWithSpend) => {
    Alert.alert(
      'Delete Budget',
      `Delete monthly budget for "${budget.category_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const client = await getDatabaseClient();
            await BudgetRepository.delete(client, budget.id);
            await loadBudgets();
          },
        },
      ]
    );
  };

  const totalBudgetMinor = budgets.reduce((sum, b) => sum + b.monthly_limit_minor, 0);
  const totalSpentMinor = budgets.reduce((sum, b) => sum + b.spent_minor, 0);

  return (
    <ScreenWrapper>
      <Header
        title="Budgets"
        subtitle={`Period: ${currentMonth}`}
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
        {/* Month Summary Card */}
        <Card variant="highlight" style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: '500' }}>
            OVERALL BUDGET ALLOCATION
          </Text>
          <View style={styles.rowBetween}>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.sizes['2xl'],
                fontWeight: typography.weights.bold,
                marginTop: spacing.xs,
              }}
            >
              {formatCurrency(totalSpentMinor)} / {formatCurrency(totalBudgetMinor)}
            </Text>
            <Badge
              label={`${totalBudgetMinor > 0 ? Math.round((totalSpentMinor / totalBudgetMinor) * 100) : 0}%`}
              variant={totalSpentMinor > totalBudgetMinor ? 'expense' : 'income'}
              size="sm"
            />
          </View>
        </Card>

        {budgets.length === 0 ? (
          <View style={[styles.emptyContainer, { paddingVertical: spacing['3xl'] }]}>
            <Target size={48} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.base, marginTop: spacing.md }}>
              No category budgets set for this month.
            </Text>
            <Button
              title="Set Category Budget"
              onPress={() => setShowAddModal(true)}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : (
          budgets.map((b) => (
            <Card key={b.id} style={{ marginBottom: spacing.md }}>
              <View style={styles.budgetHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowAlign}>
                    <Text style={{ color: colors.text, fontSize: typography.sizes.md, fontWeight: '600' }}>
                      {b.category_name}
                    </Text>
                    {b.is_exceeded ? (
                      <View style={[styles.statusTag, { backgroundColor: colors.expenseLight }]}>
                        <AlertTriangle size={12} color={colors.danger} />
                        <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '600', marginLeft: 3 }}>
                          EXCEEDED
                        </Text>
                      </View>
                    ) : b.is_warning ? (
                      <View style={[styles.statusTag, { backgroundColor: colors.warningLight }]}>
                        <AlertTriangle size={12} color={colors.warning} />
                        <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '600', marginLeft: 3 }}>
                          NEARING LIMIT
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 2 }}>
                    Alert at {b.alert_threshold}% utilization
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteBudget(b)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.rowBetween, { marginTop: spacing.md }]}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
                  Spent: <Text style={{ color: colors.text, fontWeight: '600' }}>{formatCurrency(b.spent_minor)}</Text>
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
                  Limit: <Text style={{ color: colors.text, fontWeight: '600' }}>{formatCurrency(b.monthly_limit_minor)}</Text>
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={[styles.progressTrack, { backgroundColor: colors.background, borderRadius: borderRadius.full }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(b.percentage, 100)}%`,
                      backgroundColor: b.is_exceeded ? colors.danger : b.is_warning ? colors.warning : colors.primary,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <AddBudgetModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        categories={categories}
        onSubmit={handleCreateBudget}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  progressTrack: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
  },
});

