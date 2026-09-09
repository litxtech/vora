import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import type { PickedImage } from '@/features/identity-verification/types';
import { useTheme } from '@/providers/ThemeProvider';

/** Gerçek kimlik kartı oranı (85.6 × 54 mm). */
const ID_CARD_RATIO = 85.6 / 54;

type IdentityDocumentCaptureProps = {
  label: string;
  hint: string;
  value: PickedImage | null;
  onChange: (file: PickedImage | null) => void;
  required?: boolean;
  /** 'card' kimlik oranı, 'selfie' dikeye yakın kare. */
  shape?: 'card' | 'selfie';
  icon?: keyof typeof Ionicons.glyphMap;
};

function fileNameFromUri(uri: string, fallback: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] || fallback;
}

function CornerGuides({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.corner, styles.cornerTL, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerTR, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerBL, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerBR, { borderColor: color }]} />
    </View>
  );
}

export function IdentityDocumentCapture({
  label,
  hint,
  value,
  onChange,
  required = true,
  shape = 'card',
  icon = 'card-outline',
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
        cameraType:
          shape === 'selfie' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
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

  const aspect = shape === 'selfie' ? 1 : ID_CARD_RATIO;
  const done = Boolean(value);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.stateDot,
              { backgroundColor: done ? colors.success : colors.surfaceElevated, borderColor: done ? colors.success : colors.border },
            ]}
          >
            <Ionicons
              name={done ? 'checkmark' : icon}
              size={done ? 13 : 14}
              color={done ? '#fff' : colors.textSecondary}
            />
          </View>
          <Text variant="label">
            {label}
            {!required ? (
              <Text variant="caption" secondary>
                {'  '}· opsiyonel
              </Text>
            ) : null}
          </Text>
        </View>
        {done ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Text variant="caption" style={{ color: colors.danger, fontWeight: '600' }}>
              Kaldır
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.frame,
          {
            aspectRatio: aspect,
            borderColor: done ? colors.success : colors.border,
            backgroundColor: colors.surfaceElevated,
            borderStyle: done ? 'solid' : 'dashed',
          },
        ]}
      >
        {value ? (
          <>
            <Image source={{ uri: value.uri }} style={styles.preview} resizeMode="cover" />
            <View style={styles.previewActions}>
              <Pressable
                onPress={() => void pickImage('camera')}
                style={[styles.previewBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
                hitSlop={6}
              >
                <Ionicons name="camera" size={15} color="#fff" />
                <Text variant="caption" style={styles.previewBtnText}>
                  Yeniden çek
                </Text>
              </Pressable>
            </View>
            <View style={[styles.doneBadge, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          </>
        ) : (
          <>
            <CornerGuides color={colors.primary} />
            <View style={styles.placeholder}>
              <Ionicons
                name={shape === 'selfie' ? 'person-circle-outline' : icon}
                size={34}
                color={colors.textSecondary}
              />
              <Text variant="caption" secondary style={styles.hintText}>
                {hint}
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => void pickImage('camera')}
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="camera" size={16} color="#fff" />
                  <Text variant="caption" style={styles.actionBtnTextLight}>
                    Kamera
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void pickImage('gallery')}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
                  ]}
                >
                  <Ionicons name="images-outline" size={16} color={colors.primary} />
                  <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                    Galeri
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 22;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stateDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  previewActions: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  previewBtnText: { color: '#fff', fontWeight: '600' },
  doneBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  hintText: { textAlign: 'center', maxWidth: 260 },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  actionBtnTextLight: { color: '#fff', fontWeight: '700' },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 6,
  },
});
