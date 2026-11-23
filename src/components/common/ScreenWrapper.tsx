import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  withSafeArea?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  style,
  withSafeArea = true,
}) => {
  const { colors, isDark } = useTheme();

  const Container = withSafeArea ? SafeAreaView : View;

  return (
    <Container style={[styles.container, { backgroundColor: colors.background }, style]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
