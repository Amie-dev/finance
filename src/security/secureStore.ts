import * as SecureStore from 'expo-secure-store';

export const SECURE_KEYS = {
  BIOMETRIC_ENABLED: 'smartmoney_biometric_enabled',
  AUTOLOCK_TIMEOUT: 'smartmoney_autolock_timeout', // in milliseconds, '0' = immediate
  PIN_CODE: 'smartmoney_pin_code',
  LAST_ACTIVE_TIMESTAMP: 'smartmoney_last_active',
};

export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch (error) {
    console.error(`[SecureStore] Error saving key "${key}":`, error);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`[SecureStore] Error reading key "${key}":`, error);
    return null;
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`[SecureStore] Error deleting key "${key}":`, error);
  }
}

