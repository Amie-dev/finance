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
import { Category } from '@/db/types';
import { X, Target } from 'lucide-react-native';

interface AddBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  onSubmit: (data: {
    category_id: string;
    monthly_limit_minor: number;
    alert_threshold: number;
    start_month: string;
  }) => Promise<void>;
}

export const AddBudgetModal: React.FC<AddBudgetModalProps> = ({
  visible,
  onClose,
  categories,
  onSubmit,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState(expenseCategories[0]?.id || '');
  const [limitInput, setLimitInput] = useState('');
  const [thresholdInput, setThresholdInput] = useState('80');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

  const handleSubmit = async () => {
    const limitMinor = parseCurrencyInput(limitInput);
    if (limitMinor <= 0) {
      setError('Please specify a monthly budget limit.');
      return;
    }

    const catId = selectedCategoryId || expenseCategories[0]?.id;
    if (!catId) {
      setError('Please select an expense category.');
      return;
    }

    const threshold = parseInt(thresholdInput, 10) || 80;

    setLoading(true);
    setError('');
    try {
      await onSubmit({
        category_id: catId,
        monthly_limit_minor: limitMinor,
        alert_threshold: threshold,
        start_month: currentMonth,
      });
      setLimitInput('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create budget.');
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Target size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold }]}>
                Set Category Budget
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.sm, marginBottom: spacing.xs }]}>
              Select Expense Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={styles.pillRow}>
                {expenseCategories.map((cat) => {
                  const isSelected = (selectedCategoryId || expenseCategories[0]?.id) === cat.id;
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

            {/* Monthly Limit */}
            <Input
              label={`Monthly Limit for ${currentMonth} (₹)`}
              placeholder="e.g. 10000"
              keyboardType="decimal-pad"
              value={limitInput}
              onChangeText={setLimitInput}
              autoFocus
              containerStyle={{ marginBottom: spacing.md }}
              style={{ fontSize: 20, fontWeight: '700' }}
            />

            {/* Alert Threshold */}
            <Input
              label="Warning Alert Threshold (%)"
              placeholder="80"
              keyboardType="number-pad"
              value={thresholdInput}
              onChangeText={setThresholdInput}
              containerStyle={{ marginBottom: spacing.lg }}
            />

            {error ? (
              <Text style={[styles.error, { color: colors.danger, marginBottom: spacing.md }]}>
                {error}
              </Text>
            ) : null}

            <Button
              title="Save Monthly Budget"
              onPress={handleSubmit}
              loading={loading}
              size="lg"
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
    maxHeight: '80%',
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
