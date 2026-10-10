import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { Text } from '@/components/ui/Text';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import { isLocalVideoUri } from '@/lib/media/isVideoUrl';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type CanlarDraftMedia = {
  uri: string;
  kind: 'image' | 'video';
};

const MAX_IMAGES = 6;

function isVideo(item: CanlarDraftMedia) {
  return item.kind === 'video' || isLocalVideoUri(item.uri);
}

function merge(current: CanlarDraftMedia[], incoming: CanlarDraftMedia[], videos: boolean) {
  if (videos) {
    const nextVideo = incoming[0];
    const images = current.filter((item) => !isVideo(item)).slice(0, MAX_IMAGES);
    return nextVideo ? [nextVideo, ...images] : current;
  }
  const images = [...current.filter((item) => !isVideo(item)), ...incoming].slice(0, MAX_IMAGES);
  const video = current.find((item) => isVideo(item));
  if (!video) return images;
  const index = current.findIndex((item) => isVideo(item));
  const next = [...images];
  next.splice(Math.min(index, next.length), 0, video);
  return next;
}

function move(items: CanlarDraftMedia[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  if (!item) return items;
  next.splice(target, 0, item);
  return next;
}

export function CanlarComposeMedia({
  items,
  onChange,
}: {
  items: CanlarDraftMedia[];
  onChange: (next: CanlarDraftMedia[]) => void;
}) {
  const { colors } = useTheme();
  const [openAt, setOpenAt] = useState<number | null>(null);
  const imageCount = items.filter((item) => !isVideo(item)).length;
  const hasVideo = items.some((item) => isVideo(item));

  const take = async (videos: boolean) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', videos ? 'Video çekmek için kamera izni gerekir.' : 'Fotoğraf çekmek için kamera izni gerekir.');
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: videos ? ['videos'] : ['images'],
      videoMaxDuration: 90,
      quality: videos ? 1 : 0.8,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;
    const asset = picked.assets[0];
    onChange(merge(items, [{ uri: asset.uri, kind: videos ? 'video' : 'image' }], videos));
  };

  const pick = async (videos: boolean) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Galeriden seçmek için izin gerekir.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: videos ? ['videos'] : ['images'],
      allowsMultipleSelection: !videos,
      selectionLimit: videos ? 1 : Math.max(1, MAX_IMAGES - imageCount),
      videoMaxDuration: 90,
      quality: videos ? 1 : 0.8,
    });
    if (picked.canceled) return;
    const incoming = picked.assets
      .map((asset) => ({ uri: asset.uri, kind: (videos ? 'video' : 'image') as CanlarDraftMedia['kind'] }))
      .filter((item) => item.uri);
    onChange(merge(items, incoming, videos));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        <Chip icon="camera-outline" label="Fotoğraf çek" disabled={imageCount >= MAX_IMAGES} onPress={() => void take(false)} />
        <Chip icon="videocam-outline" label="Video çek" disabled={hasVideo} onPress={() => void take(true)} />
        <Chip icon="image-outline" label="Galeriden resim" disabled={imageCount >= MAX_IMAGES} onPress={() => void pick(false)} />
        <Chip icon="film-outline" label="Galeriden video" disabled={hasVideo} onPress={() => void pick(true)} />
      </View>
      {items.length > 0 ? (
        <>
          <Text secondary variant="caption">İlk sıra önizlemedir. Video eklenince öne alınır; oklarla sırayı değiştirebilirsiniz.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {items.map((item, index) => (
              <View key={`${item.uri}-${index}`} style={styles.card}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isVideo(item) ? 'Videoyu büyük aç' : 'Fotoğrafı büyük aç'}
                  onPress={() => setOpenAt(index)}
                  style={[styles.thumb, { backgroundColor: colors.surfaceElevated, borderColor: index === 0 ? CANLAR_ACCENT : colors.border }]}
                >
                  {isVideo(item) ? (
                    <View style={styles.video}>
                      <Ionicons name="play" size={22} color="#fff" />
                    </View>
                  ) : (
                    <Image source={{ uri: item.uri }} style={styles.image} contentFit="cover" />
                  )}
                  {index === 0 ? <Text style={styles.badge}>Önizleme</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Medyayı kaldır"
                    onPress={() => onChange(items.filter((entry) => entry.uri !== item.uri))}
                    style={styles.remove}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </Pressable>
                <View style={styles.order}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Öne al"
                    disabled={index === 0}
                    onPress={() => onChange(move(items, index, -1))}
                    style={{ opacity: index === 0 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.text} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Arkaya al"
                    disabled={index === items.length - 1}
                    onPress={() => onChange(move(items, index, 1))}
                    style={{ opacity: index === items.length - 1 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-forward" size={18} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}
      <FullScreenMediaViewer
        urls={items.map((item) => item.uri)}
        kinds={items.map((item) => (isVideo(item) ? 'video' : 'image'))}
        visible={openAt != null}
        startIndex={openAt ?? 0}
        onClose={() => setOpenAt(null)}
      />
    </View>
  );
}

function Chip({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: colors.border, backgroundColor: colors.surface, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <Ionicons name={icon} size={16} color={CANLAR_ACCENT} />
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  chipLabel: { fontWeight: '700', fontSize: 13 },
  row: { gap: spacing.sm, paddingVertical: 2 },
  card: { width: 108, gap: 4 },
  thumb: { width: 108, height: 108, borderRadius: 16, overflow: 'hidden', borderWidth: 2 },
  image: { width: '100%', height: '100%' },
  video: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1c1c1c' },
  badge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.55)',
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  order: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
});
