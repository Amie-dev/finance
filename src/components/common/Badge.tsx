import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface BadgeProps {
  label: string;
  variant?: 'income' | 'expense' | 'transfer' | 'neutral' | 'warning';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  style,
}) => {
  const { colors, typography, borderRadius, spacing } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'income':
        return { bg: colors.incomeLight, text: colors.income };
      case 'expense':
        return { bg: colors.expenseLight, text: colors.expense };
      case 'transfer':
        return { bg: colors.transferLight, text: colors.transfer };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning };
      case 'neutral':
      default:
        return { bg: colors.surfaceHover, text: colors.textSecondary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderRadius: borderRadius.full,
          paddingHorizontal: size === 'sm' ? spacing.xs + 2 : spacing.sm + 2,
          paddingVertical: size === 'sm' ? 2 : spacing.xxs + 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: text,
          fontSize: size === 'sm' ? typography.sizes.xs : typography.sizes.sm,
          fontWeight: typography.weights.semibold,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

