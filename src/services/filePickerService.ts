import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export interface PickedDocumentResult {
  uri: string;
  name: string;
  size?: number;
  content: string;
}

export const FilePickerService = {
  async pickCsvFile(): Promise<PickedDocumentResult | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const file = result.assets[0];
    const content = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return {
      uri: file.uri,
      name: file.name,
      size: file.size,
      content,
    };
  },
};

