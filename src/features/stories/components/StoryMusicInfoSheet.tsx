import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaEditorBottomSheet } from '@/features/compose/components/MediaEditorBottomSheet';
import { Text } from '@/components/ui/Text';
import { navigateToPublicProfile } from '@/features/profile/services/profileNavigation';
import { fetchMusicTrackById } from '@/features/music/services/musicData';
import { isPersistableMusicTrackId } from '@/features/music/utils/trackId';
import { fetchSoundById } from '@/features/sounds/services/soundData';
import type { StoryMusicAddedBy } from '@/features/stories/types/storyMusic';
import type { StoryMusicManifest } from '@/features/stories/utils/storyManifest';
import { spacing, radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StoryMusicInfoSheetProps = {
  visible: boolean;
  music: StoryMusicManifest;
  addedBy: StoryMusicAddedBy;
  onClose: () => void;
};

type MusicInfo = {
  coverUrl: string | null;
  usageCount: number;
  viewCount: number;
  artist: string;
  isSound: boolean;
};

export function StoryMusicInfoSheet({
  visible,
  music,
  addedBy,
  onClose,
}: StoryMusicInfoSheetProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<MusicInfo | null>(null);

  useEffect(() => {
    if (!visible) {
      setInfo(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      let resolved: MusicInfo | null = null;

      if (isPersistableMusicTrackId(music.trackId)) {
        const track = await fetchMusicTrackById(music.trackId);
        if (track) {
          resolved = {
            coverUrl: track.coverUrl,
            usageCount: track.usageCount,
            viewCount: track.viewCount,
            artist: track.artist,
            isSound: false,
          };
        }
      }

      if (!resolved) {
        const sound = await fetchSoundById(music.trackId);
        if (sound) {
          resolved = {
            coverUrl: sound.coverUrl,
            usageCount: sound.usageCount,
            viewCount: sound.listenCount,
            artist: sound.author?.username ? `@${sound.author.username}` : 'Orijinal ses',
            isSound: true,
          };
        }
      }

      if (!cancelled) {
        setInfo(
          resolved ?? {
            coverUrl: null,
            usageCount: 0,
            viewCount: 0,
            artist: music.artist,
            isSound: false,
          },
        );
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, music.trackId, music.artist]);

  const displayArtist = info?.artist || music.artist;
  const usageLabel = info?.isSound ? 'kullanım' : 'paylaşımda kullanıldı';

  return (
    <MediaEditorBottomSheet visible={visible} onClose={onClose} title="Müzik" heightFraction={0.42}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.trackRow}>
            {info?.coverUrl ? (
              <Image source={{ uri: info.coverUrl }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverFallback, { backgroundColor: `${colors.primary}22` }]}>
                <Ionicons name="musical-notes" size={28} color={colors.primary} />
              </View>
            )}
            <View style={styles.trackMeta}>
              <Text variant="label" numberOfLines={2} style={styles.trackTitle}>
                {music.displayTitle}
              </Text>
              <Text secondary variant="caption" numberOfLines={1}>
                {displayArtist}
              </Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Ionicons name="repeat-outline" size={18} color={colors.accent} />
              <Text variant="title" style={styles.statValue}>
                {(info?.usageCount ?? 0).toLocaleString('tr-TR')}
              </Text>
              <Text secondary variant="caption">
                {usageLabel}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="headset-outline" size={18} color={colors.primary} />
              <Text variant="title" style={styles.statValue}>
                {(info?.viewCount ?? 0).toLocaleString('tr-TR')}
              </Text>
              <Text secondary variant="caption">
                dinlenme
              </Text>
            </View>
          </View>

          <Text variant="caption" secondary style={styles.sectionLabel}>
            Hikâyeye ekleyen
          </Text>
          <Pressable
            style={[styles.authorRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              onClose();
              navigateToPublicProfile({ userId: addedBy.userId });
            }}
          >
            {addedBy.avatarUrl ? (
              <Image source={{ uri: addedBy.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.border }]}>
                <Ionicons name="person" size={18} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.authorMeta}>
              <View style={styles.nameRow}>
                <Text variant="label" numberOfLines={1}>
                  {addedBy.fullName?.trim() || addedBy.username}
                </Text>
                {addedBy.isVerified ? (
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                ) : null}
              </View>
              <Text secondary variant="caption">
                @{addedBy.username}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      )}
    </MediaEditorBottomSheet>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  body: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  trackTitle: {
    fontWeight: '700',
  },
  statCard: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontWeight: '800',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  sectionLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
