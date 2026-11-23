import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/theme';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Header } from '@/components/common/Header';
import { formatCurrency } from '@/utils/money';
import { getDatabaseClient } from '@/db/client';
import { TransactionRepository } from '@/db/repositories/transactionRepository';
import { PieChart, TrendingUp, Store } from 'lucide-react-native';

interface CategorySpend {
  category_id: string;
  name: string;
  color: string;
  total_spent_minor: number;
  percentage: number;
}

interface MerchantSpend {
  merchant: string;
  total_spent_minor: number;
  count: number;
}

export const AnalyticsScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategorySpend[]>([]);
  const [topMerchants, setTopMerchants] = useState<MerchantSpend[]>([]);
  const [cashflow, setCashflow] = useState({
    income_minor: 0,
    expense_minor: 0,
    net_savings_minor: 0,
  });

  const currentMonth = new Date().toISOString().substring(0, 7);

  const loadAnalytics = useCallback(async () => {
    try {
      const client = await getDatabaseClient();
      const [cf, catRows, merchantRows] = await Promise.all([
        TransactionRepository.getMonthlyTotals(client, currentMonth),
        client.execute<any>(
          `SELECT 
             c.id AS category_id,
             c.name,
             c.color,
             COALESCE(SUM(t.amount_minor), 0) AS total_spent_minor
           FROM categories c
           JOIN transactions t ON t.category_id = c.id
           WHERE t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
           GROUP BY c.id
           ORDER BY total_spent_minor DESC;`,
          [currentMonth]
        ),
        client.execute<any>(
          `SELECT 
             merchant,
             SUM(amount_minor) AS total_spent_minor,
             COUNT(*) AS count
           FROM transactions
           WHERE type = 'expense' AND merchant IS NOT NULL AND merchant != ''
                 AND strftime('%Y-%m', transaction_date) = ?
           GROUP BY merchant
           ORDER BY total_spent_minor DESC
           LIMIT 5;`,
          [currentMonth]
        ),
      ]);

      setCashflow(cf);

      const totalExpense = cf.expense_minor || 1;
      const parsedCategories = catRows.map((r: any) => ({
        category_id: r.category_id,
        name: r.name,
        color: r.color,
        total_spent_minor: r.total_spent_minor,
        percentage: Math.round((r.total_spent_minor / totalExpense) * 100),
      }));

      setCategoryBreakdown(parsedCategories);
      setTopMerchants(merchantRows);
    } catch (err) {
      console.error('[AnalyticsScreen] Error loading analytics:', err);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  return (
    <ScreenWrapper>
      <Header title="Analytics" subtitle={`Month: ${currentMonth}`} />

      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Monthly Net Savings Ratio */}
        <Card variant="highlight" style={{ marginBottom: spacing.lg }}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: '500' }}>
                SAVINGS RATE
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.sizes['2xl'],
                  fontWeight: typography.weights.bold,
                  marginTop: spacing.xs,
                }}
              >
                {cashflow.income_minor > 0
                  ? `${Math.round((cashflow.net_savings_minor / cashflow.income_minor) * 100)}%`
                  : '0%'}
              </Text>
            </View>
            <Badge
              label={cashflow.net_savings_minor >= 0 ? 'Surplus' : 'Deficit'}
              variant={cashflow.net_savings_minor >= 0 ? 'income' : 'expense'}
              size="sm"
            />
          </View>
        </Card>

        {/* Category Expense Breakdown */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={styles.rowAlign}>
            <PieChart size={20} color={colors.primary} />
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.text,
                  fontSize: typography.sizes.md,
                  fontWeight: typography.weights.semibold,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              Category Spending Distribution
            </Text>
          </View>

          {categoryBreakdown.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.sizes.sm, marginTop: spacing.md }}>
              No expense records for this month yet.
            </Text>
          ) : (
            <View style={{ marginTop: spacing.md }}>
              {categoryBreakdown.map((cat) => (
                <View key={cat.category_id} style={{ marginBottom: spacing.md }}>
                  <View style={styles.rowBetween}>
                    <View style={styles.rowAlign}>
                      <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                      <Text style={{ color: colors.text, fontSize: typography.sizes.sm, fontWeight: '500' }}>
                        {cat.name}
                      </Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: typography.sizes.sm, fontWeight: '700' }}>
                      {formatCurrency(cat.total_spent_minor)} ({cat.percentage}%)
                    </Text>
                  </View>

                  {/* Percentage Bar */}
                  <View style={[styles.barTrack, { backgroundColor: colors.background, borderRadius: borderRadius.full }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.min(cat.percentage, 100)}%`,
                          backgroundColor: cat.color,
                          borderRadius: borderRadius.full,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Top Merchants Card */}
        <Card style={{ marginBottom: spacing.xl }}>
          <View style={styles.rowAlign}>
            <Store size={20} color={colors.primary} />
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.text,
                  fontSize: typography.sizes.md,
                  fontWeight: typography.weights.semibold,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              Top Payees & Merchants
            </Text>
          </View>

          {topMerchants.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.sizes.sm, marginTop: spacing.md }}>
              No merchant transactions logged this month.
            </Text>
          ) : (
            <View style={{ marginTop: spacing.sm }}>
              {topMerchants.map((m, idx) => (
                <View key={m.merchant} style={[styles.merchantRow, { borderBottomColor: colors.borderLight }]}>
                  <View style={styles.rowAlign}>
                    <Text style={[styles.rankText, { color: colors.textMuted }]}>#{idx + 1}</Text>
                    <View style={{ marginLeft: spacing.sm }}>
                      <Text style={{ color: colors.text, fontSize: typography.sizes.base, fontWeight: '500' }}>
                        {m.merchant}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs }}>
                        {m.count} transaction{m.count > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.expense, fontWeight: '700', fontSize: typography.sizes.base }}>
                    {formatCurrency(m.total_spent_minor)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
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
  sectionTitle: {},
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  barTrack: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: {
    height: '100%',
  },
  merchantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    width: 24,
  },
});

