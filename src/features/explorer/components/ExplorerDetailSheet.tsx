import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { MapBottomSheet } from '@/features/map/components/MapBottomSheet';
import { EXPLORER_ACCENT_COLOR } from '@/features/explorer/constants';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import type { ExplorerMarker } from '@/features/explorer/types';
import { formatMapDate } from '@/features/map/utils/geo';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ExplorerDetailSheetProps = {
  marker: ExplorerMarker | null;
  visible: boolean;
  bottomInset: number;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
};

export function ExplorerDetailSheet({
  marker,
  visible,
  bottomInset,
  onClose,
  onViewProfile,
}: ExplorerDetailSheetProps) {
  const { colors } = useTheme();
  const lastMarkerRef = useRef<ExplorerMarker | null>(null);

  useEffect(() => {
    if (marker) lastMarkerRef.current = marker;
  }, [marker]);

  const activeMarker = marker ?? lastMarkerRef.current;
  if (!activeMarker) return null;

  const displayName = activeMarker.fullName ?? activeMarker.username;
  const lastSeen = formatMapDate(activeMarker.updatedAt);

  return (
    <MapBottomSheet visible={visible} onClose={onClose} bottomInset={bottomInset}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.avatarGlow}>
            <ProfileAvatar
              username={activeMarker.username}
              avatarUrl={activeMarker.avatarUrl}
              size={64}
              isVerified={activeMarker.isVerified}
            />
          </View>
          <View style={styles.heroMeta}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text variant="caption" style={styles.liveBadgeText}>
                Canlı Kaşif
              </Text>
            </View>
            <Text variant="h3" style={{ color: colors.text }}>
              {displayName}
            </Text>
            <Text variant="caption" secondary>
              @{activeMarker.username}
            </Text>
            {lastSeen ? (
              <Text variant="caption" style={{ color: EXPLORER_ACCENT_COLOR, marginTop: 4 }}>
                Son konum · {lastSeen}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Kapat">
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={() => onViewProfile(activeMarker.userId)}>
            <LinearGradient
              colors={['#00E5C8', EXPLORER_ACCENT_COLOR, '#00897B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtnGradient}
            >
              <Ionicons name="person" size={18} color="#FFFFFF" />
              <Text variant="label" style={styles.primaryBtnText}>
                Profili Gör
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={onClose}
          >
            <Ionicons name="map-outline" size={18} color={colors.textSecondary} />
            <Text variant="caption" secondary>
              Haritada kal
            </Text>
          </Pressable>
        </View>
      </View>
    </MapBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarGlow: {
    shadowColor: EXPLORER_ACCENT_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  heroMeta: {
    flex: 1,
    gap: 2,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 191, 165, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 191, 165, 0.32)',
    marginBottom: 4,
  },
  liveBadgeText: {
    color: EXPLORER_ACCENT_COLOR,
    fontWeight: '700',
    fontSize: 11,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: EXPLORER_ACCENT_COLOR,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryBtn: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
});
