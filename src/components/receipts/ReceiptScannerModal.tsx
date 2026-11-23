import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { formatCurrency, parseCurrencyInput } from '@/utils/money';
import { AccountWithBalance, Category } from '@/db/types';
import { ImagePickerService } from '@/services/imagePickerService';
import { OCRService } from '@/services/ocrService';
import { ReceiptParser, ParsedReceiptData } from '@/services/receiptParser';
import {
  Camera,
  Image as ImageIcon,
  X,
  Scan,
  Check,
  AlertCircle,
} from 'lucide-react-native';

interface ReceiptScannerModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: AccountWithBalance[];
  categories: Category[];
  onSaveTransaction: (data: {
    account_id: string;
    amount_minor: number;
    type: 'expense';
    category_id: string;
    merchant: string;
    transaction_date: string;
    raw_note: string;
  }) => Promise<void>;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  visible,
  onClose,
  accounts,
  categories,
  onSaveTransaction,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'capture' | 'review'>('capture');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [confidence, setConfidence] = useState(0);

  const handleProcessImage = async (imageUri: string) => {
    setLoading(true);
    try {
      // 1. Run OCR extraction
      const ocrResult = await OCRService.extractText(imageUri);

      // 2. Parse receipt structure
      const parsed: ParsedReceiptData = ReceiptParser.parse(ocrResult.fullText);

      setMerchant(parsed.merchant || 'Store');
      setAmountInput((parsed.amount_minor / 100).toFixed(2));
      setDate(parsed.transaction_date);
      setConfidence(parsed.confidence);

      // Match category
      const matchedCat = categories.find((c) => c.id === parsed.category_hint) || categories[0];
      setSelectedCategoryId(matchedCat?.id || '');

      setStep('review');
    } catch (err: any) {
      Alert.alert('Scan Failed', err?.message || 'Could not parse receipt text.');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const img = await ImagePickerService.takePhoto();
      if (img) {
        await handleProcessImage(img.uri);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Could not open camera.');
    }
  };

  const handlePickGallery = async () => {
    try {
      const img = await ImagePickerService.pickFromGallery();
      if (img) {
        await handleProcessImage(img.uri);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Could not select photo.');
    }
  };

  const handleSave = async () => {
    const amountMinor = parseCurrencyInput(amountInput);
    if (amountMinor <= 0) {
      Alert.alert('Invalid Amount', 'Please provide a valid bill amount.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Account Required', 'Please select an account for this payment.');
      return;
    }

    const catId = selectedCategoryId || categories[0]?.id;

    setLoading(true);
    try {
      await onSaveTransaction({
        account_id: selectedAccountId,
        amount_minor: amountMinor,
        type: 'expense',
        category_id: catId,
        merchant: merchant.trim(),
        transaction_date: date,
        raw_note: `Scanned receipt from ${merchant.trim()}`,
      });

      setStep('capture');
      onClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not record transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('capture');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderRadius: borderRadius['2xl'] }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Scan size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold }]}>
                {step === 'capture' ? 'Scan Receipt' : 'Review Receipt Details'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={[styles.loadingBox, { padding: spacing['2xl'] }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: typography.sizes.base, fontWeight: '600', marginTop: spacing.md }}>
                Scanning & Extracting Bill Details...
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 4 }}>
                100% on-device OCR processing
              </Text>
            </View>
          ) : step === 'capture' ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <View style={[styles.scannerGraphic, { borderColor: colors.primary, borderRadius: borderRadius.xl }]}>
                <Scan size={64} color={colors.primary} />
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: spacing.sm, textAlign: 'center' }}>
                  Position receipt inside frame
                </Text>
              </View>

              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, textAlign: 'center', marginVertical: spacing.lg }}>
                Photograph your paper bill or select an existing receipt from your photo gallery.
              </Text>

              <Button
                title="Take Photo with Camera"
                icon={<Camera size={18} color={colors.textInverse} />}
                onPress={handleTakePhoto}
                size="lg"
                style={{ width: '100%', marginBottom: spacing.md }}
              />

              <Button
                title="Choose from Photo Library"
                icon={<ImageIcon size={18} color={colors.text} />}
                variant="secondary"
                onPress={handlePickGallery}
                size="lg"
                style={{ width: '100%' }}
              />
            </View>
          ) : (
            <ScrollView style={{ padding: spacing.lg }}>
              {/* Confidence Badge */}
              <View style={[styles.confidenceRow, { marginBottom: spacing.md }]}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
                  OCR Confidence:
                </Text>
                <Badge
                  label={`${Math.round(confidence * 100)}% High Accuracy`}
                  variant="income"
                  size="sm"
                />
              </View>

              {/* Merchant */}
              <Input
                label="Merchant / Store Name"
                value={merchant}
                onChangeText={setMerchant}
                containerStyle={{ marginBottom: spacing.md }}
              />

              {/* Amount */}
              <Input
                label="Extracted Total (₹)"
                value={amountInput}
                onChangeText={setAmountInput}
                keyboardType="decimal-pad"
                containerStyle={{ marginBottom: spacing.md }}
                style={{ fontSize: 22, fontWeight: '700' }}
              />

              {/* Date */}
              <Input
                label="Transaction Date (YYYY-MM-DD)"
                value={date}
                onChangeText={setDate}
                containerStyle={{ marginBottom: spacing.md }}
              />

              {/* Paid With Account Selector */}
              <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.sm, marginBottom: spacing.xs }]}>
                Payment Account
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={styles.pillRow}>
                  {accounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => setSelectedAccountId(acc.id)}
                        style={[
                          styles.pill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.background,
                            borderColor: colors.border,
                            borderRadius: borderRadius.full,
                          },
                        ]}
                      >
                        <Text style={{ color: isSelected ? colors.textInverse : colors.text, fontWeight: '500' }}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Category Selector */}
              <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.sm, marginBottom: spacing.xs }]}>
                Assigned Category
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
                <View style={styles.pillRow}>
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setSelectedCategoryId(cat.id)}
                          style={[
                            styles.pill,
                            {
                              backgroundColor: isSelected ? cat.color : colors.background,
                              borderColor: colors.border,
                              borderRadius: borderRadius.full,
                            },
                          ]}
                        >
                          <Text style={{ color: isSelected ? '#FFFFFF' : colors.text, fontWeight: '500' }}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </ScrollView>

              <Button
                title="Confirm & Save to Ledger"
                onPress={handleSave}
                loading={loading}
                size="lg"
                style={{ marginBottom: spacing.lg }}
              />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {},
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerGraphic: {
    width: 200,
    height: 140,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
});

