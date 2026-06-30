import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/Text';
import {
  BUSINESS_DOCUMENT_MIME_TYPES,
  MAX_BUSINESS_DOCUMENTS,
} from '@/constants/registration';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PickedFile = {
  uri: string;
  name: string;
};

type DocumentUploadPanelProps = {
  files: PickedFile[];
  onChange: (files: PickedFile[]) => void;
  error?: string | null;
};

function fileNameFromUri(uri: string, fallback: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] || fallback;
}

export function DocumentUploadPanel({ files, onChange, error }: DocumentUploadPanelProps) {
  const { colors } = useTheme();

  const addFiles = (picked: PickedFile[]) => {
    const remaining = MAX_BUSINESS_DOCUMENTS - files.length;
    if (remaining <= 0) {
      Alert.alert('Limit', `En fazla ${MAX_BUSINESS_DOCUMENTS} dosya yükleyebilirsiniz.`);
      return;
    }
    onChange([...files, ...picked.slice(0, remaining)]);
  };

  const pickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: BUSINESS_DOCUMENT_MIME_TYPES,
    });

    if (result.canceled) return;

    addFiles(
      result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name ?? fileNameFromUri(asset.uri, 'belge'),
      })),
    );
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.85,
      mediaTypes: ['images'],
    });

    if (result.canceled) return;

    addFiles(
      result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: fileNameFromUri(asset.uri, `foto_${index + 1}.jpg`),
      })),
    );
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text variant="label">İşletme Belgeleri</Text>
        <Text variant="caption" secondary>
          {files.length}/{MAX_BUSINESS_DOCUMENTS} dosya
        </Text>
      </View>
      <Text variant="caption" secondary>
        Vergi levhası, imza sirküleri, ruhsat vb. PDF veya görsel yükleyin.
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={pickDocuments}
          style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
        >
          <Ionicons name="document-outline" size={18} color={colors.primary} />
          <Text variant="caption">Dosya Seç</Text>
        </Pressable>
        <Pressable
          onPress={pickImages}
          style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
        >
          <Ionicons name="image-outline" size={18} color={colors.primary} />
          <Text variant="caption">Galeri</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fileList}>
        {files.map((file, index) => (
          <View
            key={`${file.uri}-${index}`}
            style={[styles.fileChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Ionicons name="attach-outline" size={14} color={colors.textSecondary} />
            <Text variant="caption" numberOfLines={1} style={styles.fileName}>
              {file.name}
            </Text>
            <Pressable onPress={() => removeFile(index)} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.danger} />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {error ? <Text variant="caption" style={{ color: colors.danger }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  fileList: { gap: spacing.sm, paddingVertical: spacing.xs },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: 180,
  },
  fileName: { flex: 1, maxWidth: 120 },
});
