import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { volunteerTeamDetailPath } from '@/features/help/constants';
import { VOLUNTEER_CATEGORIES, type VolunteerTeam } from '@/features/volunteer/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export const VolunteerTeamCard = memo(function VolunteerTeamCard({ team }: { team: VolunteerTeam }) {
  const { colors } = useTheme();
  const cat = VOLUNTEER_CATEGORIES[team.category];

  return (
    <Pressable
      onPress={() => router.push(volunteerTeamDetailPath(team.id) as never)}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <GlassCard style={[styles.card, { borderColor: `${cat.color}28` }]} padded={false}>
        <LinearGradient
          colors={[`${cat.color}16`, `${cat.color}04`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={[styles.accent, { backgroundColor: cat.color }]} />

          <View style={styles.body}>
            <View style={styles.topRow}>
              <View style={[styles.icon, { backgroundColor: `${cat.color}22` }]}>
                <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={20} color={cat.color} />
              </View>
              <View style={styles.meta}>
                <Text variant="label" numberOfLines={1} style={styles.title}>
                  {team.name}
                </Text>
                <View style={[styles.categoryChip, { backgroundColor: `${cat.color}14` }]}>
                  <Text variant="caption" style={{ color: cat.color, fontWeight: '600', fontSize: 10 }}>
                    {cat.label}
                  </Text>
                </View>
              </View>
              <View style={[styles.memberPill, { backgroundColor: `${cat.color}18` }]}>
                <Ionicons name="people" size={12} color={cat.color} />
                <Text variant="caption" style={{ color: cat.color, fontWeight: '700', fontSize: 11 }}>
                  {team.memberCount}
                </Text>
              </View>
            </View>

            {team.description ? (
              <Text secondary variant="caption" numberOfLines={2} style={styles.description}>
                {team.description}
              </Text>
            ) : (
              <Text secondary variant="caption" style={styles.description}>
                Gönüllü ekibe katılmak için detayları görüntüleyin
              </Text>
            )}

            <View style={styles.footer}>
              <View style={[styles.activeBadge, { backgroundColor: team.isActive ? `${colors.success}18` : `${colors.textMuted}18` }]}>
                <View
                  style={[
                    styles.activeDot,
                    { backgroundColor: team.isActive ? colors.success : colors.textMuted },
                  ]}
                />
                <Text
                  variant="caption"
                  style={{
                    color: team.isActive ? colors.success : colors.textMuted,
                    fontWeight: '600',
                    fontSize: 10,
                  }}
                >
                  {team.isActive ? 'Aktif ekip' : 'Pasif'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
            </View>
          </View>
        </LinearGradient>
      </GlassCard>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    minHeight: 104,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    marginVertical: spacing.sm,
    marginLeft: spacing.xs,
    borderRadius: radius.full,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    paddingLeft: spacing.sm,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  description: {
    lineHeight: 17,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
});
