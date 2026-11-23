import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme';
import { AppLockProvider, useAppLock } from '@/security/AppLockProvider';
import { AuthLockScreen } from '@/screens/AuthLockScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { getDatabaseClient } from '@/db/client';

function AppContent() {
  const { colors } = useTheme();
  const { isLocked, unlockApp, biometricLabel } = useAppLock();
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await getDatabaseClient();
        setIsDbReady(true);
      } catch (err) {
        console.error('[App] Failed to initialize DB:', err);
        setIsDbReady(true); // Allow screen to show error state
      }
    }
    init();
  }, []);

  if (!isDbReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <HomeScreen />
      {isLocked && (
        <AuthLockScreen biometricLabel={biometricLabel} onUnlock={unlockApp} />
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppLockProvider>
          <AppContent />
        </AppLockProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
