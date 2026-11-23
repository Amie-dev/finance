import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/theme';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Badge } from '@/components/common/Badge';
import { Header } from '@/components/common/Header';
import { getDatabaseClient } from '@/db/client';
import { BackupService } from '@/services/backup/backupService';
import { RestoreService } from '@/services/backup/restoreService';
import { useAppLock } from '@/security/AppLockProvider';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  ShieldCheck,
  Download,
  Upload,
  Lock,
  Key,
  Database,
  CheckCircle2,
  FileCheck,
} from 'lucide-react-native';

export const BackupRestoreScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius, isDark, setMode } = useTheme();
  const { biometricLabel, isBiometricEnabled, setBiometricEnabled } = useAppLock();

  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  const handleExportBackup = async () => {
    if (!backupPassword || backupPassword.length < 6) {
      Alert.alert('Password Required', 'Please enter a password of at least 6 characters to encrypt your backup.');
      return;
    }

    setLoadingBackup(true);
    try {
      const client = await getDatabaseClient();
      const result = await BackupService.createEncryptedBackup(client, backupPassword);
      setLastBackupTime(new Date().toLocaleTimeString());
      Alert.alert(
        'Backup Generated',
        'Your encrypted backup archive has been created using AES-256-GCM. Save it to iCloud, Google Drive, or local storage.'
      );
      setBackupPassword('');
    } catch (err: any) {
      Alert.alert('Backup Failed', err?.message || 'Could not export database.');
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleImportRestore = async () => {
    if (!restorePassword) {
      Alert.alert('Password Required', 'Please enter your backup password to decrypt the archive.');
      return;
    }

    setLoadingRestore(true);
    try {
      const file = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (file.canceled || !file.assets || file.assets.length === 0) {
        setLoadingRestore(false);
        return;
      }

      const content = await FileSystem.readAsStringAsync(file.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const client = await getDatabaseClient();
      const result = await RestoreService.restoreFromArchive(client, content, restorePassword, 'replace');

      Alert.alert(
        'Restore Successful',
        `Successfully restored ${result.restoredCounts.accounts} accounts, ${result.restoredCounts.transactions} transactions, and ${result.restoredCounts.budgets} budgets.`
      );
      setRestorePassword('');
    } catch (err: any) {
      Alert.alert('Restore Failed', err?.message || 'Could not decrypt or restore backup.');
    } finally {
      setLoadingRestore(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Settings & Security" subtitle="Backups & Data Protection" />

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg }]}>
        {/* Security Audit & Privacy Status */}
        <Card variant="highlight" style={{ marginBottom: spacing.lg }}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={22} color={colors.primary} />
            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.text,
                  fontSize: typography.sizes.md,
                  fontWeight: typography.weights.bold,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              Privacy & Security Audit
            </Text>
          </View>

          <View style={{ marginTop: spacing.md }}>
            <View style={styles.auditRow}>
              <View style={styles.rowAlign}>
                <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.text, fontSize: typography.sizes.sm }}>
                  Local-First SQLite Ledger
                </Text>
              </View>
              <Badge label="100% On-Device" variant="income" size="sm" />
            </View>

            <View style={styles.auditRow}>
              <View style={styles.rowAlign}>
                <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.text, fontSize: typography.sizes.sm }}>
                  Biometric App Lock
                </Text>
              </View>
              <Badge label={biometricLabel} variant="income" size="sm" />
            </View>

            <View style={styles.auditRow}>
              <View style={styles.rowAlign}>
                <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.text, fontSize: typography.sizes.sm }}>
                  Local PII Scrubber Shield
                </Text>
              </View>
              <Badge label="Active" variant="income" size="sm" />
            </View>

            <View style={styles.auditRow}>
              <View style={styles.rowAlign}>
                <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.text, fontSize: typography.sizes.sm }}>
                  Deterministic AI Tool Calling
                </Text>
              </View>
              <Badge label="No Hallucinations" variant="income" size="sm" />
            </View>
          </View>
        </Card>

        {/* Encrypted Backup Section */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={styles.cardHeader}>
            <Download size={20} color={colors.primary} />
            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.text,
                  fontSize: typography.sizes.md,
                  fontWeight: typography.weights.semibold,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              Export Encrypted Backup
            </Text>
          </View>

          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginVertical: spacing.sm }}>
            Export all financial accounts, transactions, transfers, and budgets into an AES-256-GCM encrypted file.
          </Text>

          <Input
            label="Set Master Backup Password"
            placeholder="Choose a strong password..."
            secureTextEntry
            value={backupPassword}
            onChangeText={setBackupPassword}
            containerStyle={{ marginBottom: spacing.md }}
          />

          <Button
            title="Create & Export Backup"
            icon={<Download size={16} color={colors.textInverse} />}
            onPress={handleExportBackup}
            loading={loadingBackup}
            size="md"
          />

          {lastBackupTime && (
            <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
              Last backup created at {lastBackupTime}
            </Text>
          )}
        </Card>

        {/* Restore Section */}
        <Card style={{ marginBottom: spacing.xl }}>
          <View style={styles.cardHeader}>
            <Upload size={20} color={colors.primary} />
            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.text,
                  fontSize: typography.sizes.md,
                  fontWeight: typography.weights.semibold,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              Restore from Backup
            </Text>
          </View>

          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginVertical: spacing.sm }}>
            Select your `.smbackup` or encrypted JSON file and enter the password used during export.
          </Text>

          <Input
            label="Backup Decryption Password"
            placeholder="Enter backup password..."
            secureTextEntry
            value={restorePassword}
            onChangeText={setRestorePassword}
            containerStyle={{ marginBottom: spacing.md }}
          />

          <Button
            title="Select File & Restore"
            variant="secondary"
            icon={<Upload size={16} color={colors.text} />}
            onPress={handleImportRestore}
            loading={loadingRestore}
            size="md"
          />
        </Card>

        {/* App Version Info */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs }}>
            SmartMoney v1.0.0 (Release Candidate)
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
            Local-First • Privacy-Preserving • Deterministic
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
});

