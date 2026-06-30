import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PROXIMITY_MATCH_ACCENT, PROXIMITY_MATCH_RADIUS_M } from '@/features/proximity-match/constants';
import type { ProximityMatchCandidate } from '@/features/proximity-match/types';
import { getFloatingTabBarReserve } from '@/constants/tabBar';
import { radius, spacing } from '@/constants/theme';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import { useTheme } from '@/providers/ThemeProvider';

type ProximityMatchPromptProps = {
  candidate: ProximityMatchCandidate;
  submitting: boolean;
  onMatch: () => void;
  onDecline: () => void;
};

function displayName(candidate: ProximityMatchCandidate): string {
  return candidate.fullName?.trim() || candidate.username;
}

export function ProximityMatchPrompt({
  candidate,
  submitting,
  onMatch,
  onDecline,
}: ProximityMatchPromptProps) {
  const { colors } = useTheme();
  const tabBarBottomInset = useStableTabBarInset();
  const bottomOffset = getFloatingTabBarReserve(tabBarBottomInset) + spacing.sm;
  const name = displayName(candidate);
  const distanceLabel =
    candidate.distanceM < 100
      ? `${Math.round(candidate.distanceM)} m`
      : `${(candidate.distanceM / 1000).toFixed(1)} km`;

  return (
    <View style={[styles.host, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: `${PROXIMITY_MATCH_ACCENT}55`,
            shadowColor: '#000',
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.pulseDot, { backgroundColor: PROXIMITY_MATCH_ACCENT }]} />
          <Text variant="label" style={{ color: PROXIMITY_MATCH_ACCENT, fontWeight: '700' }}>
            Yakınında bir Vora kullanıcısı var
          </Text>
        </View>

        <Text secondary variant="caption">
          {PROXIMITY_MATCH_RADIUS_M} m içinde · ~{distanceLabel} uzaklıkta
        </Text>

        <View style={styles.profileRow}>
          <View style={[styles.avatarWrap, { borderColor: `${PROXIMITY_MATCH_ACCENT}55` }]}>
            {candidate.avatarUrl ? (
              <Image source={{ uri: candidate.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.surface }]}>
                <Text variant="label">{name.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
          </View>

          <View style={styles.meta}>
            <View style={styles.nameRow}>
              <Text variant="label" numberOfLines={1}>
                {name}
              </Text>
              {candidate.isVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              ) : null}
            </View>
            <Text secondary variant="caption" numberOfLines={1}>
              @{candidate.username}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onDecline}
            disabled={submitting}
            style={({ pressed }) => [
              styles.declineBtn,
              { borderColor: colors.border, opacity: pressed || submitting ? 0.7 : 1 },
            ]}
          >
            <Text variant="caption" style={{ fontWeight: '600' }}>
              Hayır
            </Text>
          </Pressable>

          <Pressable
            onPress={onMatch}
            disabled={submitting}
            style={({ pressed }) => [
              styles.matchBtn,
              { backgroundColor: PROXIMITY_MATCH_ACCENT, opacity: pressed || submitting ? 0.85 : 1 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="heart" size={14} color="#fff" />
                <Text variant="caption" style={styles.matchLabel}>
                  Eşleş
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    elevation: 24,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  declineBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBtn: {
    flex: 1.4,
    minHeight: 44,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  matchLabel: {
    color: '#fff',
    fontWeight: '700',
  },
});
