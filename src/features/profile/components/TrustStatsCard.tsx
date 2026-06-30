import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { ProfileCollapsibleSection } from '@/features/profile/components/shared/ProfileCollapsibleSection';
import { getTrustScoreColor, getTrustScoreTier, REPORTER_LEVELS, TRUST_SCORE_MAX } from '@/features/profile/constants';
import type { PublicProfile } from '@/features/profile/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type TrustStatsCardProps = {
  profile: PublicProfile;
  layout?: 'collapsible' | 'section';
  hideTrustScore?: boolean;
};

export function TrustStatsCard({ profile, layout = 'collapsible', hideTrustScore = false }: TrustStatsCardProps) {
  const { colors } = useTheme();
  const trustColor = getTrustScoreColor(profile.trustScore);
  const trustTier = getTrustScoreTier(profile.trustScore);
  const level = REPORTER_LEVELS[profile.reporterLevel] ?? REPORTER_LEVELS[1];

  const items = [
    {
      icon: 'shield-checkmark' as const,
      label: trustTier,
      value: `${profile.trustScore}/${TRUST_SCORE_MAX}`,
      color: trustColor,
      subtitle: 'Güven Puanı',
    },
    { icon: 'checkmark-done' as const, label: 'Doğrulanmış', value: String(profile.verifiedContentCount), color: colors.primary },
    { icon: 'mic' as const, label: `${level.emoji} ${level.label}`, value: null, color: colors.accent, subtitle: level.description },
    { icon: 'trophy' as const, label: 'Katkı Puanı', value: String(profile.contributionScore), color: colors.warning },
  ].filter((item) => !(hideTrustScore && item.icon === 'shield-checkmark'));

  const grid = (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.label} style={styles.itemOuter}>
          <LinearGradient
            colors={[`${item.color}22`, 'transparent']}
            style={[styles.item, { borderColor: `${item.color}33` }]}
          >
            <Ionicons name={item.icon} size={20} color={item.color} />
            {item.value != null ? (
              <Text variant="h3" style={{ color: item.color, fontWeight: '800' }}>
                {item.value}
              </Text>
            ) : (
              <Text variant="label" numberOfLines={1} style={{ fontSize: 13 }}>
                {item.label}
              </Text>
            )}
            <Text secondary variant="caption" numberOfLines={item.subtitle ? 2 : 1} style={styles.caption}>
              {item.subtitle ?? item.label}
            </Text>
          </LinearGradient>
        </View>
      ))}
    </View>
  );

  if (layout === 'section') return grid;

  return (
    <ProfileCollapsibleSection
      title="Güven İstatistikleri"
      icon="shield-checkmark"
      iconColor={trustColor}
    >
      {grid}
    </ProfileCollapsibleSection>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itemOuter: { flex: 1, minWidth: '45%' },
  item: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
  },
  caption: { textAlign: 'center', fontSize: 11 },
});
