import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { ACHIEVEMENT_CONFIG, BADGE_CONFIG } from '@/features/profile/constants';
import type { UserAchievement, UserBadge } from '@/features/profile/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type BadgeGridProps = {
  badges: UserBadge[];
  achievements: UserAchievement[];
};

export function BadgeGrid({ badges, achievements }: BadgeGridProps) {
  const { colors } = useTheme();

  if (badges.length === 0 && achievements.length === 0) {
    return (
      <GlassCard style={styles.empty}>
        <Text secondary variant="caption" style={{ textAlign: 'center' }}>
          Henüz rozet veya başarım yok.
        </Text>
      </GlassCard>
    );
  }

  return (
    <View style={styles.container}>
      {badges.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.accent, { backgroundColor: colors.primary }]} />
            <Text variant="label">Rozetler</Text>
          </View>
          <View style={styles.grid}>
            {badges.map((b) => {
              const cfg = BADGE_CONFIG[b.badgeType];
              if (!cfg) return null;
              return (
                <GlassCard key={b.badgeType} style={styles.item}>
                  <View style={[styles.iconWrap, { backgroundColor: `${cfg.color}22` }]}>
                    <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={24} color={cfg.color} />
                  </View>
                  <Text variant="label">{cfg.label}</Text>
                  <Text secondary variant="caption" style={styles.desc}>
                    {cfg.description}
                  </Text>
                </GlassCard>
              );
            })}
          </View>
        </View>
      ) : null}

      {achievements.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.accent, { backgroundColor: colors.accent }]} />
            <Text variant="label">Başarımlar</Text>
          </View>
          <View style={styles.grid}>
            {achievements.map((a) => {
              const cfg = ACHIEVEMENT_CONFIG[a.achievementKey];
              if (!cfg) return null;
              return (
                <GlassCard key={a.achievementKey} style={styles.item}>
                  <View style={[styles.iconWrap, { backgroundColor: `${colors.accent}22` }]}>
                    <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={24} color={colors.accent} />
                  </View>
                  <Text variant="label">{cfg.label}</Text>
                  <Text secondary variant="caption" style={styles.desc}>
                    {cfg.description}
                  </Text>
                </GlassCard>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accent: { width: 3, height: 16, borderRadius: 2 },
  empty: { paddingVertical: spacing.xl, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: { width: '47%', alignItems: 'center', gap: spacing.xs, padding: spacing.md },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: { textAlign: 'center' },
});
