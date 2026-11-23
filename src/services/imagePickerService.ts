import * as ImagePicker from 'expo-image-picker';

export interface PickedImageResult {
  uri: string;
  width: number;
  height: number;
  mimeType?: string;
  fileName?: string;
}

export const ImagePickerService = {
  async pickFromGallery(): Promise<PickedImageResult | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Photo library permission is required to select receipts.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType || 'image/jpeg',
      fileName: asset.fileName || `receipt_${Date.now()}.jpg`,
    };
  },

  async takePhoto(): Promise<PickedImageResult | null> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Camera permission is required to photograph receipts.');
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType || 'image/jpeg',
      fileName: asset.fileName || `receipt_${Date.now()}.jpg`,
    };
  },
};

