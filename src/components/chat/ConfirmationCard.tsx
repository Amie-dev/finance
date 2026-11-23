import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ActionProposal } from '@/ai/tools/toolRegistry';
import { formatCurrency } from '@/utils/money';
import { Check, X, ShieldAlert, Sparkles } from 'lucide-react-native';

interface ConfirmationCardProps {
  proposal: ActionProposal;
  onConfirm: (proposal: ActionProposal) => Promise<void>;
  onCancel: (proposal: ActionProposal) => void;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  proposal,
  onConfirm,
  onCancel,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled'>(proposal.status);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(proposal);
      setStatus('confirmed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel(proposal);
    setStatus('cancelled');
  };

  const { amount_minor, type, category_name, merchant, note } = proposal.payload;

  return (
    <Card variant="highlight" style={[styles.card, { borderColor: colors.primary, borderRadius: borderRadius.lg }]}>
      <View style={styles.headerRow}>
        <View style={styles.rowAlign}>
          <ShieldAlert size={16} color={colors.warning} />
          <Text style={[styles.cardTitle, { color: colors.text, fontSize: typography.sizes.sm, fontWeight: '700', marginLeft: 6 }]}>
            CONFIRM TRANSACTION
          </Text>
        </View>
        <Badge
          label={status.toUpperCase()}
          variant={status === 'confirmed' ? 'income' : status === 'cancelled' ? 'expense' : 'warning'}
          size="sm"
        />
      </View>

      <View style={{ marginVertical: spacing.sm }}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
          The AI assistant proposed adding this entry:
        </Text>
        <View style={[styles.detailBox, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm, marginTop: 6 }]}>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>Amount:</Text>
            <Text style={{ color: type === 'income' ? colors.income : colors.expense, fontSize: typography.sizes.md, fontWeight: '700' }}>
              {type === 'income' ? '+' : '-'}{formatCurrency(amount_minor)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>Category:</Text>
            <Text style={{ color: colors.text, fontSize: typography.sizes.xs, fontWeight: '600' }}>
              {category_name}
            </Text>
          </View>
          {merchant ? (
            <View style={styles.detailRow}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>Merchant:</Text>
              <Text style={{ color: colors.text, fontSize: typography.sizes.xs, fontWeight: '600' }}>
                {merchant}
              </Text>
            </View>
          ) : null}
          {note ? (
            <View style={styles.detailRow}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>Note:</Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
                {note}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {status === 'pending' ? (
        <View style={styles.actionRow}>
          <Button
            title="Confirm & Save"
            icon={<Check size={16} color={colors.textInverse} />}
            onPress={handleConfirm}
            loading={loading}
            size="sm"
            style={{ flex: 1, marginRight: spacing.xs }}
          />
          <Button
            title="Cancel"
            icon={<X size={16} color={colors.text} />}
            variant="ghost"
            onPress={handleCancel}
            size="sm"
          />
        </View>
      ) : (
        <Text
          style={{
            color: status === 'confirmed' ? colors.income : colors.danger,
            fontSize: typography.sizes.xs,
            fontWeight: '600',
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          {status === 'confirmed' ? '✓ Transaction recorded in ledger' : '✕ Proposal dismissed'}
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    letterSpacing: 0.5,
  },
  detailBox: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
});
