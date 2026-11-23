import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Button } from '@/components/common/Button';
import { Shield, Lock } from 'lucide-react-native';

interface AuthLockScreenProps {
  biometricLabel: string;
  onUnlock: () => void;
}

export const AuthLockScreen: React.FC<AuthLockScreenProps> = ({
  biometricLabel,
  onUnlock,
}) => {
  const { colors, typography, spacing } = useTheme();

  useEffect(() => {
    // Attempt biometric prompt automatically when lock screen opens
    onUnlock();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: colors.cardHighlight,
              borderColor: colors.border,
            },
          ]}
        >
          <Shield size={48} color={colors.primary} />
        </View>

        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontSize: typography.sizes['2xl'],
              fontWeight: typography.weights.bold,
              marginTop: spacing.xl,
            },
          ]}
        >
          SmartMoney is Locked
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: colors.textSecondary,
              fontSize: typography.sizes.base,
              marginTop: spacing.sm,
            },
          ]}
        >
          Your financial data is protected with hardware-backed encryption. Authenticate to proceed.
        </Text>

        <View style={{ marginTop: spacing['3xl'], width: '100%', maxWidth: 280 }}>
          <Button
            title={`Unlock with ${biometricLabel}`}
            icon={<Lock size={18} color={colors.textInverse} />}
            onPress={onUnlock}
            size="lg"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
