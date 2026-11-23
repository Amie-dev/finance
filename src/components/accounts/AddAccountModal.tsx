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
import { AccountType } from '@/db/types';
import { X, Landmark, Wallet, CreditCard, Banknote, TrendingUp } from 'lucide-react-native';

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: AccountType;
    initial_balance: number;
    currency: string;
  }) => Promise<void>;
}

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: any }[] = [
  { type: 'bank', label: 'Bank Account', icon: Landmark },
  { type: 'cash', label: 'Cash in Hand', icon: Banknote },
  { type: 'credit', label: 'Credit Card', icon: CreditCard },
  { type: 'wallet', label: 'Digital Wallet', icon: Wallet },
  { type: 'investment', label: 'Investments', icon: TrendingUp },
];

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balanceInput, setBalanceInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please provide an account name.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const initial_balance = parseCurrencyInput(balanceInput);
      await onSubmit({
        name: name.trim(),
        type,
        initial_balance,
        currency: 'INR',
      });
      setName('');
      setBalanceInput('');
      setType('bank');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
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
              Add Financial Account
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            {/* Account Name */}
            <Input
              label="Account Name"
              placeholder="e.g. HDFC Salary, SBI Savings"
              value={name}
              onChangeText={setName}
              autoFocus
              containerStyle={{ marginBottom: spacing.md }}
            />

            {/* Account Type Selector */}
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.sm, marginBottom: spacing.xs }]}>
              Account Type
            </Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((t) => {
                const IconComponent = t.icon;
                const isSelected = type === t.type;
                return (
                  <TouchableOpacity
                    key={t.type}
                    onPress={() => setType(t.type)}
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor: isSelected ? colors.primaryLight + '20' : colors.background,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderRadius: borderRadius.md,
                        padding: spacing.sm,
                      },
                    ]}
                  >
                    <IconComponent size={20} color={isSelected ? colors.primary : colors.textSecondary} />
                    <Text
                      style={[
                        styles.typeText,
                        {
                          color: isSelected ? colors.primary : colors.textSecondary,
                          fontSize: typography.sizes.xs,
                          fontWeight: isSelected ? '600' : '400',
                          marginTop: 4,
                        },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Initial Balance */}
            <Input
              label="Starting Balance (₹)"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={balanceInput}
              onChangeText={setBalanceInput}
              containerStyle={{ marginTop: spacing.md, marginBottom: spacing.lg }}
            />

            {error ? (
              <Text style={[styles.error, { color: colors.danger, marginBottom: spacing.md }]}>
                {error}
              </Text>
            ) : null}

            <Button
              title="Create Account"
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '85%',
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  typeText: {
    textAlign: 'center',
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
  },
});
