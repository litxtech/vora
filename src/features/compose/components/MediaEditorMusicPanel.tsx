import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MusicEditorPanel } from '@/features/music/components/MusicEditorPanel';
import { fetchMusicTrackById } from '@/features/music/services/musicData';
import { fetchSoundById } from '@/features/sounds/services/soundData';
import type { MusicSelection, MusicTrack } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MediaEditorMusicPanelProps = {
  visible: boolean;
  music: MusicSelection;
  /** Hikâye / gönderi medya türü — video için kaydırma kırpma, foto için aralık kırpma */
  mediaType?: 'image' | 'video';
  /** Video hikâyede müzik kırpma penceresi (saniye) */
  clipDurationSec?: number;
  previewPlaying: boolean;
  onTogglePreview: () => void;
  onChangeTrack: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<MusicSelection>) => void;
  onClose: () => void;
  /** Kırpma bitti — temiz önizlemeye geç (hikâye akışı) */
  onDone?: () => void;
};

export function MediaEditorMusicPanel({
  visible,
  music,
  mediaType = 'image',
  clipDurationSec,
  previewPlaying,
  onTogglePreview,
  onChangeTrack,
  onRemove,
  onUpdate,
  onClose,
  onDone,
}: MediaEditorMusicPanelProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [track, setTrack] = useState<MusicTrack | null>(null);

  useEffect(() => {
    if (music.source === 'sound') {
      void fetchSoundById(music.trackId).then((sound) => {
        if (!sound) {
          setTrack(null);
          return;
        }
        setTrack({
          id: sound.id,
          title: sound.title,
          displayTitle: sound.title,
          artist: sound.author?.username ? `@${sound.author.username}` : 'Orijinal Ses',
          album: null,
          categoryId: null,
          categorySlug: null,
          categoryLabel: null,
          coverUrl: sound.coverUrl,
          audioUrl: sound.audioUrl,
          durationSec: sound.durationSec,
          licenseStatus: 'licensed',
          licenseInfo: null,
          publicationStatus: 'active',
          isTrending: sound.isTrending,
          isFeatured: false,
          isEditorPick: false,
          sortOrder: 0,
          usageCount: sound.usageCount,
          viewCount: sound.listenCount,
          lastUsedAt: sound.lastUsedAt,
          createdAt: sound.createdAt,
        });
      });
      return;
    }
    void fetchMusicTrackById(music.trackId).then(setTrack);
  }, [music.source, music.trackId]);

  if (!visible || !track) return null;

  const isPhoto = mediaType === 'image';
  const resolvedClipDuration =
    clipDurationSec ?? Math.max(0.5, music.musicEndSec - music.musicStartSec);

  return (
    <View
      style={[
        styles.sheet,
        { paddingBottom: insets.bottom + spacing.sm, maxHeight: onDone ? '62%' : '52%' },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {isPhoto ? 'Müziği kırp' : music.source === 'sound' ? 'Sesi kırp' : 'Müziği kırp'}
        </Text>
        <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="chevron-down" size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MusicEditorPanel
          mode={isPhoto ? 'photo' : 'video'}
          track={track}
          clipDurationSec={resolvedClipDuration}
          musicStartSec={music.musicStartSec}
          musicEndSec={music.musicEndSec}
          musicVolume={music.musicVolume}
          originalAudioVolume={isPhoto ? 0 : music.originalAudioVolume}
          isPlaying={previewPlaying}
          onStartChange={(sec) => onUpdate({ musicStartSec: sec })}
          onRangeChange={(startSec, endSec) => onUpdate({ musicStartSec: startSec, musicEndSec: endSec })}
          onMusicVolumeChange={(volume) => onUpdate({ musicVolume: volume })}
          onOriginalVolumeChange={(volume) => onUpdate({ originalAudioVolume: volume })}
          onRemove={onRemove}
          onChangeTrack={onChangeTrack}
          onTogglePreview={onTogglePreview}
        />

        {onDone ? (
          <Pressable
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={onDone}
          >
            <Ionicons name="eye-outline" size={18} color="#fff" />
            <Text style={styles.doneBtnText}>Önizle</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 14,
    backgroundColor: 'rgba(12,12,16,0.96)',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 0 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
