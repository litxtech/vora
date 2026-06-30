import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HELP_CENTER_ACCENT } from '@/features/help/constants';
import { radius, spacing } from '@/constants/theme';

type HelpCenterHeroProps = {
  requestCount: number;
  teamCount: number;
  mode: 'requests' | 'teams';
};

export const HelpCenterHero = memo(function HelpCenterHero({
  requestCount,
  teamCount,
  mode,
}: HelpCenterHeroProps) {
  return (
    <LinearGradient
      colors={[HELP_CENTER_ACCENT, '#C2185B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.glow} />
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="heart" size={22} color="#fff" />
        </View>
        <View style={styles.copy}>
          <Text variant="label" style={styles.title}>
            Topluluk Desteği
          </Text>
          <Text variant="caption" style={styles.subtitle}>
            {mode === 'requests'
              ? 'Acil ihtiyaçları paylaşın, yardım elinizi uzatın'
              : 'Gönüllü ekiplere katılın, birlikte güçlenin'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text variant="label" style={styles.statValue}>
            {requestCount}
          </Text>
          <Text variant="caption" style={styles.statLabel}>
            Aktif talep
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text variant="label" style={styles.statValue}>
            {teamCount}
          </Text>
          <Text variant="caption" style={styles.statLabel}>
            Gönüllü ekip
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -28,
    right: -20,
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 16,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginHorizontal: spacing.sm,
  },
});
