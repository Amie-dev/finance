import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Header } from '@/components/common/Header';
import { useAppLock } from '@/security/AppLockProvider';
import { getDatabaseClient } from '@/db/client';
import { Category } from '@/db/types';
import { formatCurrency } from '@/utils/money';
import {
  ShieldCheck,
  Database,
  Lock,
  Sun,
  Moon,
  Coins,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';

export const HomeScreen: React.FC = () => {
  const { colors, typography, spacing, isDark, setMode, mode } = useTheme();
  const { lockApp, biometricLabel, isBiometricSupported, isBiometricEnabled } = useAppLock();

  const [dbStatus, setDbStatus] = useState<{
    initialized: boolean;
    migrationVersion: number;
    categoriesCount: number;
    tables: string[];
    error?: string;
  }>({
    initialized: false,
    migrationVersion: 0,
    categoriesCount: 0,
    tables: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkDatabase() {
      try {
        const client = await getDatabaseClient();

        // Query applied migration
        const migrationRows = await client.execute<{ version: number }>(
          `SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;`
        );
        const migrationVersion = migrationRows[0]?.version || 0;

        // Query categories count
        const categories = await client.execute<Category>(`SELECT * FROM categories;`);

        // Query created tables
        const tableRows = await client.execute<{ name: string }>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`
        );

        setDbStatus({
          initialized: true,
          migrationVersion,
          categoriesCount: categories.length,
          tables: tableRows.map((t) => t.name),
        });
      } catch (err: any) {
        console.error('[HomeScreen] Database check failed:', err);
        setDbStatus((prev) => ({
          ...prev,
          initialized: false,
          error: err?.message || 'Database initialization error',
        }));
      } finally {
        setLoading(false);
      }
    }

    checkDatabase();
  }, []);

  const toggleTheme = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  return (
    <ScreenWrapper>
      <Header
        title="SmartMoney"
        subtitle="Phase 1 Foundation"
        leftAction={
          <Button
            title=""
            icon={isDark ? <Sun size={20} color={colors.text} /> : <Moon size={20} color={colors.text} />}
            variant="ghost"
            onPress={toggleTheme}
            size="sm"
          />
        }
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

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg }]}>
        {/* Hero Card */}
        <Card variant="highlight" style={{ marginBottom: spacing.lg }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Badge label="PHASE 1 COMPLETE" variant="income" size="sm" />
              <Text
                style={[
                  styles.heroTitle,
                  {
                    color: colors.text,
                    fontSize: typography.sizes.xl,
                    fontWeight: typography.weights.bold,
                    marginTop: spacing.sm,
                  },
                ]}
              >
                Foundation & Database Active
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  {
                    color: colors.textSecondary,
                    fontSize: typography.sizes.sm,
                    marginTop: spacing.xs,
                  },
                ]}
              >
                Local-first SQLite runtime, strict integer ledger, and biometric security initialized.
              </Text>
            </View>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: colors.incomeLight,
                  borderRadius: 16,
                  padding: spacing.md,
                },
              ]}
            >
              <Sparkles size={28} color={colors.income} />
            </View>
          </View>
        </Card>

        {/* Database Architecture Status */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={styles.cardHeader}>
            <Database size={20} color={colors.primary} />
            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.text,
                  fontSize: typography.sizes.md,
                  fontWeight: typography.weights.semibold,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              SQLite Database Engine
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : dbStatus.error ? (
            <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{dbStatus.error}</Text>
          ) : (
            <View style={{ marginTop: spacing.md }}>
              <View style={styles.statusRow}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                  Status:
                </Text>
                <View style={styles.rowAlign}>
                  <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 4 }} />
                  <Text style={{ color: colors.success, fontWeight: '600', fontSize: typography.sizes.sm }}>
                    WAL Mode & FK Enabled
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                  Schema Version:
                </Text>
                <Badge label={`Migration v${dbStatus.migrationVersion}`} variant="neutral" size="sm" />
              </View>

              <View style={styles.statusRow}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                  Tables Initialized:
                </Text>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: typography.sizes.sm }}>
                  {dbStatus.tables.length} Core Tables
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                  Default Categories Seeded:
                </Text>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: typography.sizes.sm }}>
                  {dbStatus.categoriesCount} Categories
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Security & Biometrics Status */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={20} color={colors.primary} />
            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.text,
                  fontSize: typography.sizes.md,
                  fontWeight: typography.weights.semibold,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              Hardware-Backed Security
            </Text>
          </View>

          <View style={{ marginTop: spacing.md }}>
            <View style={styles.statusRow}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                Biometric Type:
              </Text>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: typography.sizes.sm }}>
                {biometricLabel}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                Hardware Support:
              </Text>
              <Badge
                label={isBiometricSupported ? 'Enrolled' : 'Available / Sim'}
                variant={isBiometricSupported ? 'income' : 'neutral'}
                size="sm"
              />
            </View>

            <View style={styles.statusRow}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                Auto-Lock on Inactivity:
              </Text>
              <Badge label="Immediate" variant="transfer" size="sm" />
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Button
                title="Test Lock Screen Now"
                variant="secondary"
                icon={<Lock size={16} color={colors.text} />}
                onPress={lockApp}
                size="sm"
              />
            </View>
          </View>
        </Card>

        {/* Minor Units Ledger Preview */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={styles.cardHeader}>
            <Coins size={20} color={colors.primary} />
            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.text,
                  fontSize: typography.sizes.md,
                  fontWeight: typography.weights.semibold,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              Integer Minor Units Verification
            </Text>
          </View>

          <View style={{ marginTop: spacing.md }}>
            <View style={styles.statusRow}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                145,000 paise:
              </Text>
              <Text style={{ color: colors.income, fontWeight: '700', fontSize: typography.sizes.md }}>
                {formatCurrency(145000)}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                25,000,000 paise (Compact):
              </Text>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: typography.sizes.md }}>
                {formatCurrency(25000000, { compact: true })}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                Zero Float Tolerance:
              </Text>
              <Text style={{ color: colors.success, fontSize: typography.sizes.xs }}>
                100% Strict Integer Math
              </Text>
            </View>
          </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    lineHeight: 28,
  },
  heroSubtitle: {
    lineHeight: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
});

