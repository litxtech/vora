import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { PersonnelActionRow, type PersonnelAction } from '@/features/personnel-center/components/PersonnelActionRow';
import {
  messageUser,
  openSeekerDetail,
  openUserProfile,
} from '@/features/personnel-center/services/personnelActions';
import type { JobSeekerListing } from '@/features/personnel-center/types';
import { formatDistance } from '@/features/map/utils/geo';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type SeekerCardProps = {
  seeker: JobSeekerListing;
};

export function SeekerCard({ seeker }: SeekerCardProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();

  const isOwnProfile = user?.id === seeker.userId;

  const actions = useMemo((): PersonnelAction[] => {
    const items: PersonnelAction[] = [
      {
        id: 'detail',
        label: 'Detay',
        icon: 'document-text-outline',
        onPress: () => openSeekerDetail(seeker.id),
      },
      {
        id: 'profile',
        label: 'Profil',
        icon: 'person-outline',
        onPress: () => openUserProfile(seeker.userId),
      },
    ];

    if (!isOwnProfile) {
      items.push({
        id: 'message',
        label: 'Mesaj',
        icon: 'chatbubble-outline',
        variant: 'primary',
        onPress: () => messageUser(seeker.userId, { onRequireAuth: () => requireAuth('Mesaj') }),
      });
    }

    return items;
  }, [isOwnProfile, requireAuth, seeker.id, seeker.userId]);

  return (
    <GlassCard style={styles.card}>
      <Pressable onPress={() => openSeekerDetail(seeker.id)}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: `${colors.accent}22` }]}>
            <Ionicons name="person" size={18} color={colors.accent} />
          </View>
          <View style={styles.info}>
            <Text variant="label">{seeker.title}</Text>
            <Text secondary variant="caption">
              {seeker.displayName ? `${seeker.displayName} · ` : ''}
              {seeker.occupation}
              {seeker.experienceYears > 0 ? ` · ${seeker.experienceYears} yıl` : ''}
            </Text>
          </View>
          {seeker.isReady ? (
            <View style={[styles.readyBadge, { backgroundColor: `${colors.success}18` }]}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text variant="caption" style={{ color: colors.success }}>
                Hazır
              </Text>
            </View>
          ) : null}
        </View>

        {seeker.description ? (
          <Text secondary variant="caption" numberOfLines={2}>
            {seeker.description}
          </Text>
        ) : null}

        {seeker.skills.length > 0 ? (
          <View style={styles.skills}>
            {seeker.skills.slice(0, 4).map((skill) => (
              <View key={skill} style={[styles.skill, { borderColor: colors.border }]}>
                <Text variant="caption" secondary>
                  {skill}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text secondary variant="caption">
            {seeker.district ?? 'Konum belirtilmedi'}
            {seeker.phoneVisible ? ' · Telefon paylaşımlı' : ''}
          </Text>
          {seeker.distanceKm != null ? (
            <Text variant="caption" style={{ color: colors.primary }}>
              {formatDistance(seeker.distanceKm)}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <PersonnelActionRow actions={actions} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skill: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
});
