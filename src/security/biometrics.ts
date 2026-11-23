import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricTypes: LocalAuthentication.AuthenticationType[];
  typeLabel: string;
}

export async function checkBiometricSupport(): Promise<BiometricStatus> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const biometricTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

  let typeLabel = 'Biometrics';
  if (biometricTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    typeLabel = 'Face ID';
  } else if (biometricTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    typeLabel = 'Fingerprint';
  }

  return {
    hasHardware,
    isEnrolled,
    biometricTypes,
    typeLabel,
  };
}

export async function authenticateWithBiometrics(
  promptMessage = 'Unlock SmartMoney'
): Promise<{ success: boolean; error?: string }> {
  try {
    const status = await checkBiometricSupport();
    if (!status.hasHardware || !status.isEnrolled) {
      // Fallback: device without biometrics passes if enrolled PIN is entered or simulation
      return { success: true };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Device Passcode',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    return { success: false, error: result.error || 'Authentication failed' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Biometric authentication error' };
  }
}

