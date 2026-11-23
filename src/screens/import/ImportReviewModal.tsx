import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { formatCurrency } from '@/utils/money';
import { AccountWithBalance, Category } from '@/db/types';
import { CsvImportService, StagedTransaction, CsvColumnMapping } from '@/services/csvImportService';
import { DuplicateDetectionService } from '@/services/duplicateDetection';
import { getDatabaseClient } from '@/db/client';
import { TransactionRepository } from '@/db/repositories/transactionRepository';
import { FilePickerService } from '@/services/filePickerService';
import {
  FileText,
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react-native';

interface ImportReviewModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: AccountWithBalance[];
  categories: Category[];
  onImportComplete: () => Promise<void>;
}

export const ImportReviewModal: React.FC<ImportReviewModalProps> = ({
  visible,
  onClose,
  accounts,
  categories,
  onImportComplete,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [stagedList, setStagedList] = useState<StagedTransaction[]>([]);
  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleSelectFile = async () => {
    setLoading(true);
    try {
      const file = await FilePickerService.pickCsvFile();
      if (!file) {
        setLoading(false);
        return;
      }

      setFileName(file.name);

      // 1. Parse CSV
      const parsed = CsvImportService.parseCsv(file.content);

      // 2. Convert to staged transactions
      const staged = CsvImportService.convertRowsToStagedTransactions(
        parsed.rows,
        parsed.detectedMapping
      );

      // 3. Run duplicate detection against SQLite
      const client = await getDatabaseClient();
      const flagged = await DuplicateDetectionService.flagDuplicates(
        client,
        selectedAccountId || accounts[0]?.id,
        staged
      );

      setStagedList(flagged);

      // Pre-select non-duplicates by default
      const nonDuplicates = new Set<string>();
      for (const t of flagged) {
        if (!t.is_duplicate) {
          nonDuplicates.add(t.id);
        }
      }
      setSelectedTxnIds(nonDuplicates);
      setStep('review');
    } catch (err: any) {
      Alert.alert('Import Error', err?.message || 'Could not parse CSV file.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectTxn = (id: string) => {
    setSelectedTxnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (selectNonDuplicatesOnly = false) => {
    const next = new Set<string>();
    for (const t of stagedList) {
      if (!selectNonDuplicatesOnly || !t.is_duplicate) {
        next.add(t.id);
      }
    }
    setSelectedTxnIds(next);
  };

  const handleCommitImport = async () => {
    if (selectedTxnIds.size === 0) {
      Alert.alert('No Transactions Selected', 'Please check at least one transaction to import.');
      return;
    }

    setLoading(true);
    try {
      const client = await getDatabaseClient();
      const defaultExpenseCategory = categories.find((c) => c.type === 'expense') || categories[0];
      const defaultIncomeCategory = categories.find((c) => c.type === 'income') || categories[0];

      // Commit inside an atomic database transaction
      await client.transaction(async (tx) => {
        for (const item of stagedList) {
          if (selectedTxnIds.has(item.id)) {
            const catId = item.type === 'income' ? defaultIncomeCategory.id : defaultExpenseCategory.id;
            await TransactionRepository.create(tx, {
              id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              account_id: selectedAccountId || accounts[0]?.id,
              amount_minor: item.amount_minor,
              type: item.type,
              category_id: catId,
              merchant: item.merchant,
              transaction_date: item.transaction_date,
              raw_note: item.raw_note,
              scrubbed_note: item.raw_note,
            });
          }
        }
      });

      Alert.alert('Import Complete', `Successfully imported ${selectedTxnIds.size} transactions into your ledger.`);
      await onImportComplete();
      setStep('upload');
      onClose();
    } catch (err: any) {
      Alert.alert('Commit Failed', err?.message || 'Could not save transactions.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderRadius: borderRadius['2xl'] }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FileText size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold }]}>
                {step === 'upload' ? 'Import Bank Statement (CSV)' : 'Review & Confirm Import'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {step === 'upload' ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <View
                style={[
                  styles.uploadGraphic,
                  {
                    backgroundColor: colors.cardHighlight,
                    borderColor: colors.border,
                    borderRadius: borderRadius.xl,
                  },
                ]}
              >
                <Upload size={48} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: typography.sizes.md, marginTop: spacing.sm }}>
                  Select CSV Statement
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, textAlign: 'center', marginTop: 4 }}>
                  Supports HDFC, ICICI, SBI, Axis, and standard bank formats
                </Text>
              </View>

              {/* Destination Account Picker */}
              <View style={{ width: '100%', marginVertical: spacing.lg }}>
                <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.sm, marginBottom: spacing.xs }]}>
                  Import Into Account
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
              </View>

              <Button
                title="Choose File"
                icon={<Upload size={18} color={colors.textInverse} />}
                onPress={handleSelectFile}
                loading={loading}
                size="lg"
                style={{ width: '100%' }}
              />
            </View>
          ) : (
            <View style={{ flex: 1, padding: spacing.md }}>
              {/* Review Header Toolbar */}
              <View style={[styles.toolbar, { borderBottomColor: colors.borderLight, paddingBottom: spacing.sm }]}>
                <View>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: typography.sizes.base }}>
                    {fileName}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
                    {selectedTxnIds.size} of {stagedList.length} selected
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Button
                    title="Select New Only"
                    onPress={() => handleSelectAll(true)}
                    variant="ghost"
                    size="sm"
                  />
                  <Button
                    title="Select All"
                    onPress={() => handleSelectAll(false)}
                    variant="ghost"
                    size="sm"
                  />
                </View>
              </View>

              {/* Staged List ScrollView */}
              <ScrollView style={{ flex: 1, marginVertical: spacing.sm }}>
                {stagedList.map((item) => {
                  const isChecked = selectedTxnIds.has(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => toggleSelectTxn(item.id)}
                      style={[
                        styles.stagedRow,
                        {
                          backgroundColor: isChecked ? colors.surface : colors.background,
                          borderColor: item.is_duplicate ? colors.warning : colors.borderLight,
                          borderRadius: borderRadius.md,
                          padding: spacing.md,
                          marginBottom: spacing.xs,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {/* Checkbox indicator */}
                        <View
                          style={[
                            styles.checkbox,
                            {
                              backgroundColor: isChecked ? colors.primary : 'transparent',
                              borderColor: isChecked ? colors.primary : colors.textMuted,
                              borderRadius: borderRadius.xs,
                            },
                          ]}
                        >
                          {isChecked && <CheckCircle2 size={16} color={colors.textInverse} />}
                        </View>

                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: colors.text, fontSize: typography.sizes.sm, fontWeight: '600' }}>
                              {item.merchant}
                            </Text>
                            {item.is_duplicate && (
                              <Badge
                                label="POSSIBLE DUPLICATE"
                                variant="warning"
                                size="sm"
                                style={{ marginLeft: 6 }}
                              />
                            )}
                          </View>
                          <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs, marginTop: 2 }}>
                            {item.transaction_date} • {item.raw_note}
                          </Text>
                          {item.duplicate_reason && (
                            <Text style={{ color: colors.warning, fontSize: 11, marginTop: 2 }}>
                              {item.duplicate_reason}
                            </Text>
                          )}
                        </View>

                        <Text
                          style={{
                            color: item.type === 'income' ? colors.income : colors.expense,
                            fontWeight: '700',
                            fontSize: typography.sizes.sm,
                          }}
                        >
                          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount_minor)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Button
                title={`Import ${selectedTxnIds.size} Selected Transactions`}
                onPress={handleCommitImport}
                loading={loading}
                size="lg"
                style={{ marginTop: spacing.xs }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '92%',
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
  uploadGraphic: {
    width: '100%',
    padding: 28,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
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
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  stagedRow: {
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

