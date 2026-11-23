import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'surface' | 'highlight' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'surface',
}) => {
  const { colors, borderRadius, spacing } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'highlight':
        return colors.cardHighlight;
      case 'outlined':
        return 'transparent';
      case 'surface':
      default:
        return colors.surface;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderColor: variant === 'outlined' ? colors.border : colors.borderLight,
    borderWidth: 1,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};
