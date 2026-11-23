import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { checkBiometricSupport, authenticateWithBiometrics, BiometricStatus } from './biometrics';
import { getSecureItem, setSecureItem, SECURE_KEYS } from './secureStore';

interface AppLockContextValue {
  isLocked: boolean;
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
  biometricLabel: string;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  unlockApp: () => Promise<boolean>;
  lockApp: () => void;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

export const AppLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(true);
  const [biometricLabel, setBiometricLabel] = useState<string>('Biometrics');

  const backgroundTimestampRef = useRef<number | null>(null);
  const autolockTimeoutRef = useRef<number>(0); // 0 = immediate lock on background

  useEffect(() => {
    async function initSecurity() {
      const status: BiometricStatus = await checkBiometricSupport();
      setIsBiometricSupported(status.hasHardware && status.isEnrolled);
      setBiometricLabel(status.typeLabel);

      const storedEnabled = await getSecureItem(SECURE_KEYS.BIOMETRIC_ENABLED);
      if (storedEnabled !== null) {
        setIsBiometricEnabled(storedEnabled === 'true');
      }

      const storedTimeout = await getSecureItem(SECURE_KEYS.AUTOLOCK_TIMEOUT);
      if (storedTimeout !== null) {
        autolockTimeoutRef.current = parseInt(storedTimeout, 10);
      }
    }

    initSecurity();
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundTimestampRef.current = Date.now();
      } else if (nextAppState === 'active') {
        if (backgroundTimestampRef.current !== null && isBiometricEnabled) {
          const elapsed = Date.now() - backgroundTimestampRef.current;
          if (elapsed >= autolockTimeoutRef.current) {
            setIsLocked(true);
          }
        }
        backgroundTimestampRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isBiometricEnabled]);

  const setBiometricEnabledHandler = async (enabled: boolean) => {
    setIsBiometricEnabled(enabled);
    await setSecureItem(SECURE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  };

  const unlockApp = async (): Promise<boolean> => {
    const authResult = await authenticateWithBiometrics('Unlock SmartMoney to access your finances');
    if (authResult.success) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lockApp = () => {
    setIsLocked(true);
  };

  return (
    <AppLockContext.Provider
      value={{
        isLocked,
        isBiometricSupported,
        isBiometricEnabled,
        biometricLabel,
        setBiometricEnabled: setBiometricEnabledHandler,
        unlockApp,
        lockApp,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
};

export const useAppLock = (): AppLockContextValue => {
  const context = useContext(AppLockContext);
  if (!context) {
    throw new Error('useAppLock must be used within an AppLockProvider');
  }
  return context;
};

