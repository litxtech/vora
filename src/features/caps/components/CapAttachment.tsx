import { memo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { CapClipVideo } from '@/features/caps/components/CapClipVideo';
import { CapFullscreenModal } from '@/features/caps/components/CapFullscreenModal';
import { CapLoopVideo } from '@/features/caps/components/CapLoopVideo';
import { CapOverlayLayer } from '@/features/caps/components/CapOverlayLayer';
import {
  CAP_CREATOR_AVATAR_SIZE,
  CAP_DISPLAY_SIZE,
  formatCapUsageCount,
} from '@/features/caps/constants';
import {
  addCapToLibrary,
  isCapInLibrary,
} from '@/features/caps/services/capsData';
import type { CapCreator, CapOverlayStyle } from '@/features/caps/types';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

type CapAttachmentProps = {
  capId: string;
  imageUrl: string;
  videoUrl?: string | null;
  width?: number | null;
  height?: number | null;
  startMs?: number | null;
  endMs?: number | null;
  overlay?: CapOverlayStyle | null;
  creator: CapCreator;
  size?: number;
  showUsageHint?: boolean;
  uniqueUserCount?: number;
  /**
   * Liste/scroll içinde false tut — VideoView Surface kayması (titreme) yapmasın.
   * Tam ekran uzun basmada yine oynar.
   */
  autoplay?: boolean;
};

export const CapAttachment = memo(function CapAttachment({
  capId,
  imageUrl,
  videoUrl,
  width,
  height,
  startMs,
  endMs,
  overlay,
  creator,
  size = CAP_DISPLAY_SIZE,
  showUsageHint = false,
  uniqueUserCount,
  autoplay = true,
}: CapAttachmentProps) {
  const { user } = useAuth();
  const [fullscreen, setFullscreen] = useState(false);

  const resolvedVideo =
    (videoUrl && isVideoUrl(videoUrl) ? videoUrl : null) ||
    (isVideoUrl(imageUrl) ? imageUrl : null);
  const posterUrl =
    resolvedVideo && !isVideoUrl(imageUrl) ? imageUrl : resolvedVideo ? null : imageUrl;
  const hasClip =
    resolvedVideo != null &&
    startMs != null &&
    endMs != null &&
    endMs > startMs;
  const ratio =
    width && height && width > 0 && height > 0
      ? Math.min(3, Math.max(1 / 3, width / height))
      : 1;
  const mediaWidth = ratio >= 1 ? size : size * ratio;
  const mediaHeight = ratio >= 1 ? size / ratio : size;

  const openCreatorProfile = () => {
    router.push(`/user/${creator.id}` as Href);
  };

  const saveToLibrary = async () => {
    if (!user) {
      Alert.alert('Giriş gerekli', 'Kütüphaneye kaydetmek için giriş yapın.');
      return;
    }
    if (capId === 'unknown') {
      Alert.alert('Bilgi', 'Bu caps kaydedilemiyor.');
      return;
    }
    if (user.id === creator.id) {
      Alert.alert('Bilgi', 'Bu caps zaten sizin.');
      return;
    }
    const already = await isCapInLibrary(user.id, capId);
    if (already) {
      Alert.alert('Kütüphanede', 'Bu caps zaten kütüphanenizde.');
      return;
    }
    const { error } = await addCapToLibrary(capId);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    Alert.alert('Kaydedildi', 'Caps kütüphanenize eklendi.');
  };

  const openActions = () => {
    const options = ['Kütüphaneye kaydet', 'Caps üreticisinin profili', 'İptal'];
    const handle = (index: number) => {
      if (index === 0) void saveToLibrary();
      if (index === 1) openCreatorProfile();
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2 },
        handle,
      );
    } else {
      Alert.alert('Caps', undefined, [
        { text: 'Kütüphaneye kaydet', onPress: () => void saveToLibrary() },
        { text: 'Caps üreticisinin profili', onPress: openCreatorProfile },
        { text: 'İptal', style: 'cancel' },
      ]);
    }
  };

  return (
    <>
      <Pressable
        onPress={openActions}
        onLongPress={() => setFullscreen(true)}
        delayLongPress={220}
        style={styles.wrap}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Caps — @${creator.username}`}
      >
        <View style={[styles.media, { width: mediaWidth, height: mediaHeight }]}>
          {resolvedVideo && autoplay ? (
            hasClip ? (
              <CapClipVideo
                videoUrl={resolvedVideo}
                posterUrl={posterUrl}
                startMs={startMs}
                endMs={endMs}
                style={styles.mediaFill}
                contentFit="contain"
              />
            ) : (
              <CapLoopVideo
                videoUrl={resolvedVideo}
                posterUrl={posterUrl}
                style={styles.mediaFill}
                contentFit="contain"
              />
            )
          ) : (
            <Image
              source={{ uri: posterUrl || imageUrl }}
              style={styles.mediaFill}
              contentFit="contain"
              recyclingKey={capId}
            />
          )}
          <CapOverlayLayer overlay={overlay} />
        </View>
        <Pressable
          onPress={openCreatorProfile}
          style={styles.creatorRow}
          hitSlop={6}
          accessibilityLabel={`@${creator.username} profili`}
        >
          <ProfileAvatar
            username={creator.username}
            avatarUrl={creator.avatarUrl}
            size={CAP_CREATOR_AVATAR_SIZE + 8}
          />
          <Text variant="caption" secondary numberOfLines={1} style={styles.creatorName}>
            @{creator.username}
          </Text>
        </Pressable>
        {showUsageHint && typeof uniqueUserCount === 'number' ? (
          <Text variant="caption" secondary style={styles.usage}>
            {formatCapUsageCount(uniqueUserCount)}
          </Text>
        ) : null}
      </Pressable>

      <CapFullscreenModal
        visible={fullscreen}
        onClose={() => setFullscreen(false)}
        imageUrl={posterUrl || imageUrl}
        videoUrl={resolvedVideo}
        startMs={startMs}
        endMs={endMs}
        overlay={overlay}
      />
    </>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: 'transparent',
  },
  media: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderWidth: 0,
  },
  mediaFill: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
    maxWidth: CAP_DISPLAY_SIZE + 24,
    backgroundColor: 'transparent',
  },
  creatorName: {
    flexShrink: 1,
    fontSize: 11,
  },
  usage: {
    fontSize: 11,
  },
});
