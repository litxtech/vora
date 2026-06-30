import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  INCIDENT_ACCENT,
  INCIDENT_MAX_MEDIA,
  INCIDENT_VIDEO_MAX_DURATION_SEC,
} from '@/features/incidents/constants';
import type { IncidentPendingMedia } from '@/features/incidents/services/incidentMediaUpload';
import { isLocalVideoUri } from '@/lib/media/isVideoUrl';
import { prepareLocalImageUri } from '@/lib/media/prepareLocalImage';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  media: IncidentPendingMedia[];
  onChange: (media: IncidentPendingMedia[]) => void;
  disabled?: boolean;
};

function assetToPending(asset: ImagePicker.ImagePickerAsset): IncidentPendingMedia {
  const isVideo = asset.type === 'video' || isLocalVideoUri(asset.uri);
  return {
    uri: asset.uri,
    kind: isVideo ? 'video' : 'image',
    mimeType: asset.mimeType ?? null,
    durationMs: asset.duration ?? undefined,
  };
}

export function IncidentMediaPicker({ media, onChange, disabled = false }: Props) {
  const { colors } = useTheme();

  const hasVideo = media.some((item) => item.kind === 'video');
  const remainingSlots = INCIDENT_MAX_MEDIA - media.length;

  const ensurePermission = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Galeri izni', 'Fotoğraf veya video eklemek için galeri erişimi gerekli.');
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    if (disabled || remainingSlots <= 0 || hasVideo) return;
    if (!(await ensurePermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.9,
      copyToCacheDirectory: true,
    });

    if (result.canceled || result.assets.length === 0) return;

    const next: IncidentPendingMedia[] = [];
    for (const asset of result.assets.slice(0, remainingSlots)) {
      try {
        const stableUri = await prepareLocalImageUri(asset.uri, asset.mimeType);
        next.push({ ...assetToPending(asset), uri: stableUri });
      } catch {
        Alert.alert('Fotoğraf', 'Seçilen fotoğraf okunamadı. Lütfen tekrar deneyin.');
        return;
      }
    }
    onChange([...media, ...next].slice(0, INCIDENT_MAX_MEDIA));
  };

  const pickVideo = async () => {
    if (disabled) return;
    if (media.length > 0) {
      Alert.alert('Video', 'Tek bir video ekleyebilirsiniz (fotoğraflarla birlikte değil).');
      return;
    }
    if (!(await ensurePermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      quality: 0.85,
      copyToCacheDirectory: true,
      videoMaxDuration: INCIDENT_VIDEO_MAX_DURATION_SEC,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const durationMs = asset.duration ?? 0;
    if (durationMs > INCIDENT_VIDEO_MAX_DURATION_SEC * 1000) {
      Alert.alert(
        'Video çok uzun',
        `Olay videoları en fazla ${Math.floor(INCIDENT_VIDEO_MAX_DURATION_SEC / 60)} dakika olabilir.`,
      );
      return;
    }

    onChange([assetToPending(asset)]);
  };

  const removeAt = (index: number) => {
    onChange(media.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.wrap}>
      {media.length > 0 ? (
        <View style={styles.thumbs}>
          {media.map((item, index) => (
            <View key={`${item.uri}-${index}`} style={styles.thumb}>
              <Image source={{ uri: item.uri }} style={styles.thumbImage} resizeMode="cover" />
              {item.kind === 'video' ? (
                <View style={styles.videoBadge}>
                  <Ionicons name="videocam" size={12} color="#fff" />
                </View>
              ) : null}
              <Pressable onPress={() => removeAt(index)} hitSlop={8} style={styles.removeBtn}>
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={pickImages}
          disabled={disabled || remainingSlots <= 0 || hasVideo}
          style={[
            styles.addBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceElevated,
              opacity: disabled || remainingSlots <= 0 || hasVideo ? 0.45 : 1,
            },
          ]}
        >
          <Ionicons name="image-outline" size={16} color={INCIDENT_ACCENT} />
          <Text variant="caption" style={{ color: colors.text, fontWeight: '700' }}>
            Fotoğraf{remainingSlots > 0 && !hasVideo ? ` (${remainingSlots})` : ''}
          </Text>
        </Pressable>

        <Pressable
          onPress={pickVideo}
          disabled={disabled || media.length > 0}
          style={[
            styles.addBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceElevated,
              opacity: disabled || media.length > 0 ? 0.45 : 1,
            },
          ]}
        >
          <Ionicons name="videocam-outline" size={16} color={INCIDENT_ACCENT} />
          <Text variant="caption" style={{ color: colors.text, fontWeight: '700' }}>
            Video
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.full,
    padding: 3,
  },
  removeBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.full,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
});
