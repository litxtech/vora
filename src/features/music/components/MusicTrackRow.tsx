import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { formatMusicDuration } from '@/features/music/utils/formatMusicTime';
import { isMusicTrackPlayable } from '@/features/music/constants';
import type { MusicTrack } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicTrackRowProps = {
  track: MusicTrack;
  active?: boolean;
  previewing?: boolean;
  onListen: () => void;
  onAdd: () => void;
};

export function MusicTrackRow({ track, active, previewing, onListen, onAdd }: MusicTrackRowProps) {
  const { colors } = useTheme();
  const playable = isMusicTrackPlayable(track.audioUrl);

  return (
    <View
      style={[
        styles.row,
        previewing && { backgroundColor: `${colors.primary}12` },
        active && !previewing && { backgroundColor: `${colors.accent}08` },
      ]}
    >
      <View style={styles.coverWrap}>
        {track.coverUrl ? (
          <Image source={{ uri: track.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback, { backgroundColor: `${colors.primary}14` }]}>
            <Ionicons name="musical-note" size={16} color={colors.primary} />
          </View>
        )}
        {previewing ? (
          <View style={[styles.playingBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="volume-medium" size={10} color="#fff" />
          </View>
        ) : null}
      </View>

      <View style={styles.meta}>
        <Text variant="label" numberOfLines={1} style={styles.title}>
          {track.displayTitle}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          {track.artist || 'Bilinmeyen sanatçı'}
          {' · '}
          {formatMusicDuration(track.durationSec)}
        </Text>
      </View>

      <View style={styles.actions}>
        {playable ? (
          <Pressable
            style={[
              styles.actionBtn,
              previewing
                ? { backgroundColor: colors.primary }
                : { backgroundColor: `${colors.textMuted}12`, borderColor: `${colors.border}88` },
            ]}
            onPress={onListen}
            hitSlop={6}
            accessibilityLabel={previewing ? 'Duraklat' : 'Dinle'}
            accessibilityRole="button"
          >
            <Ionicons
              name={previewing ? 'pause' : 'play'}
              size={14}
              color={previewing ? '#fff' : colors.text}
            />
            <Text
              variant="caption"
              style={{
                color: previewing ? '#fff' : colors.textSecondary,
                fontWeight: '600',
                fontSize: 11,
              }}
            >
              {previewing ? 'Dur' : 'Dinle'}
            </Text>
          </Pressable>
        ) : (
          <View style={[styles.actionBtn, styles.disabledBtn]}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.textMuted} />
          </View>
        )}

        {active ? (
          <View style={[styles.actionBtn, styles.addDone, { backgroundColor: `${colors.accent}18` }]}>
            <Ionicons name="checkmark" size={16} color={colors.accent} />
          </View>
        ) : playable ? (
          <Pressable
            style={[styles.actionBtn, styles.addBtn, { backgroundColor: colors.accent }]}
            onPress={onAdd}
            hitSlop={6}
            accessibilityLabel="Videoya ekle"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={15} color="#fff" />
            <Text variant="caption" style={styles.addBtnText}>
              Ekle
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
  },
  coverWrap: { position: 'relative' },
  cover: { width: 46, height: 46, borderRadius: radius.sm },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  playingBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  meta: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: {
    minWidth: 52,
    height: 36,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  addBtn: {},
  addDone: {},
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
});
