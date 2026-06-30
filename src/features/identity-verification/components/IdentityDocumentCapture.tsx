import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import type { PickedImage } from '@/features/identity-verification/types';
import { useTheme } from '@/providers/ThemeProvider';

type IdentityDocumentCaptureProps = {
  label: string;
  hint: string;
  value: PickedImage | null;
  onChange: (file: PickedImage | null) => void;
  required?: boolean;
};

function fileNameFromUri(uri: string, fallback: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] || fallback;
}

export function IdentityDocumentCapture({
  label,
  hint,
  value,
  onChange,
  required = true,
}: IdentityDocumentCaptureProps) {
  const { colors } = useTheme();

  const pickImage = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('İzin gerekli', 'Kamera erişimi için izin vermeniz gerekiyor.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        mediaTypes: ['images'],
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      onChange({
        uri: asset.uri,
        name: fileNameFromUri(asset.uri, 'photo.jpg'),
      });
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      mediaTypes: ['images'],
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    onChange({
      uri: asset.uri,
      name: fileNameFromUri(asset.uri, 'photo.jpg'),
    });
  };

  const showPicker = () => {
    Alert.alert(label, 'Belgeyi nasıl eklemek istersiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kamera', onPress: () => pickImage('camera') },
      { text: 'Galeri', onPress: () => pickImage('gallery') },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text variant="label">
          {label}
          {!required ? ' (opsiyonel)' : ''}
        </Text>
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Text variant="caption" style={{ color: colors.danger }}>
              Kaldır
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text variant="caption" secondary>
        {hint}
      </Text>

      <Pressable
        onPress={showPicker}
        style={[
          styles.dropzone,
          {
            borderColor: value ? colors.primary : colors.border,
            backgroundColor: colors.surfaceElevated,
          },
        ]}
      >
        {value ? (
          <Image source={{ uri: value.uri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="camera-outline" size={28} color={colors.primary} />
            <Text variant="caption" style={{ color: colors.primary }}>
              Fotoğraf ekle
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropzone: {
    borderWidth: 1,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    overflow: 'hidden',
    minHeight: 140,
  },
  preview: { width: '100%', height: 180 },
  placeholder: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
