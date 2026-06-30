import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeLinearGradient } from '@/components/ui/SafeLinearGradient';
import { Text } from '@/components/ui/Text';
import { BoostCampaignDisplay } from '@/features/profile/components/BoostCampaignDisplay';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import type { FeaturedProfileCard } from '@/features/profile/services/featuredProfiles';
import { radius, spacing } from '@/constants/theme';
import { shouldUsePlainScreenBackground } from '@/lib/device/androidPerfProfile';
import { themedAlphaHex } from '@/lib/ui/gradientColors';
import { prefetchProfileBundle } from '@/features/profile/services/profileSessionLoad';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type FeaturedProfilesCarouselProps = {
  title?: string;
  profiles: FeaturedProfileCard[];
  onSeeAll?: () => void;
};

export function FeaturedProfilesCarousel({
  title = 'Öne Çıkan Profiller',
  profiles,
  onSeeAll,
}: FeaturedProfilesCarouselProps) {
  const { colors } = useTheme();
  const { user } = useAuth();

  if (profiles.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.accent, { backgroundColor: colors.primary }]} />
          <Text variant="label">{title}</Text>
        </View>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} style={styles.seeAll}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              Tümü
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {profiles.map((profile) => {
          const location = [profile.district, profile.regionName].filter(Boolean).join(', ');
          const fallbackSubtitle =
            profile.occupation?.trim() || profile.bio?.trim() || location || `@${profile.username}`;

          const cardInner = (
            <>
              <View style={styles.badge}>
                <Ionicons name="rocket" size={10} color={colors.primary} />
                <Text variant="caption" style={{ color: colors.primary, fontWeight: '700', fontSize: 10 }}>
                  Öne Çıkan
                </Text>
              </View>

              <ProfileAvatar
                username={profile.username}
                avatarUrl={profile.avatarUrl}
                size={56}
                isPremium={profile.isPremium}
                isVerified={profile.isVerified}
              />

              <View style={styles.meta}>
                <Text variant="label" numberOfLines={1}>
                  {profile.fullName ?? profile.username}
                </Text>
                <Text secondary variant="caption" numberOfLines={1}>
                  @{profile.username}
                </Text>
                {profile.campaignMessage ? (
                  <BoostCampaignDisplay message={profile.campaignMessage} compact />
                ) : (
                  <Text secondary variant="caption" numberOfLines={2} style={styles.subtitle}>
                    {fallbackSubtitle}
                  </Text>
                )}
              </View>
            </>
          );

          return (
            <Pressable
              key={profile.id}
              onPressIn={() => prefetchProfileBundle(profile.id, user?.id ?? null)}
              onPress={() => router.push(`/user/${profile.id}` as never)}
              style={styles.cardOuter}
            >
              {shouldUsePlainScreenBackground() ? (
                <View
                  style={[
                    styles.card,
                    { borderColor: colors.border, backgroundColor: themedAlphaHex(colors.surface, 'F2') },
                  ]}
                >
                  {cardInner}
                </View>
              ) : (
                <SafeLinearGradient
                  colors={[themedAlphaHex(colors.primary, '24'), themedAlphaHex(colors.surface, 'F2')]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.card, { borderColor: colors.border }]}
                >
                  {cardInner}
                </SafeLinearGradient>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accent: { width: 3, height: 16, borderRadius: 2 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  scroll: { gap: spacing.sm, paddingRight: spacing.md },
  cardOuter: { borderRadius: radius.lg, overflow: 'hidden' },
  card: {
    width: 168,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 200,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(30,136,229,0.12)',
  },
  meta: { gap: 2, flex: 1 },
  subtitle: { marginTop: spacing.xs, lineHeight: 16 },
});
