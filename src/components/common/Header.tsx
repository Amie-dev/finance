import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  style,
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: colors.borderLight }, style]}>
      <View style={styles.leftContainer}>{leftAction}</View>
      <View style={styles.titleContainer}>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            {
              color: colors.text,
              fontSize: typography.sizes.lg,
              fontWeight: typography.weights.bold,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[
              styles.subtitle,
              {
                color: colors.textMuted,
                fontSize: typography.sizes.xs,
                marginTop: 2,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.rightContainer}>{rightAction}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftContainer: {
    minWidth: 40,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  rightContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
