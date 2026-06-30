import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { BoostCampaignDisplay } from '@/features/profile/components/BoostCampaignDisplay';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import {
  fetchFeaturedProfiles,
  PROFILE_BOOST_BENEFITS,
  type FeaturedProfileCard,
} from '@/features/profile/services/featuredProfiles';
import { radius, spacing } from '@/constants/theme';
import type { RegionId } from '@/constants/regions';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { useTheme } from '@/providers/ThemeProvider';

function FeaturedProfileRow({ profile }: { profile: FeaturedProfileCard }) {
  const { colors } = useTheme();
  const location = [profile.district, profile.regionName].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={() => router.push(`/user/${profile.id}` as never)}
      style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
    >
      <GlassCard style={styles.row}>
        <ProfileAvatar
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          size={52}
          isPremium={profile.isPremium}
          isVerified={profile.isVerified}
        />
        <View style={styles.rowMeta}>
          <View style={styles.nameLine}>
            <Text variant="label" numberOfLines={1}>
              {profile.fullName ?? profile.username}
            </Text>
            <View style={[styles.boostPill, { backgroundColor: `${colors.primary}14` }]}>
              <Ionicons name="rocket" size={10} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700', fontSize: 10 }}>
                Öne Çıkan
              </Text>
            </View>
          </View>
          <Text secondary variant="caption">
            @{profile.username}
          </Text>
          {profile.occupation && !profile.campaignMessage ? (
            <Text secondary variant="caption" numberOfLines={1}>
              {profile.occupation}
            </Text>
          ) : null}
          {profile.campaignMessage ? (
            <BoostCampaignDisplay message={profile.campaignMessage} compact />
          ) : location ? (
            <Text secondary variant="caption" numberOfLines={1}>
              {location}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </GlassCard>
    </Pressable>
  );
}

export function FeaturedProfilesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const featuredProfilesVisible = useFeatureVisible('featured-profiles');
  const regionId = (profile?.region_id as RegionId | undefined) ?? null;

  const [profiles, setProfiles] = useState<FeaturedProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!regionId || !featuredProfilesVisible) {
      setProfiles([]);
      return;
    }
    const rows = await fetchFeaturedProfiles(regionId, {
      excludeUserId: user?.id,
      limit: 30,
      isKaradenizWideScope: true,
    });
    setProfiles(rows);
  }, [regionId, user?.id, featuredProfilesVisible]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (!featuredProfilesVisible) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl }]}>
          <AuthHeader
            title="Öne Çıkan Profiller"
            subtitle="Premium üyelerin 7 günlük vitrin profilleri"
          />
          <GlassCard style={styles.empty}>
            <Ionicons name="eye-off-outline" size={32} color={colors.textMuted} />
            <Text variant="label">Öne çıkan profiller kapalı</Text>
            <Text secondary variant="caption">
              Bu bölüm yönetici tarafından geçici olarak kapatıldı.
            </Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <AuthHeader
              title="Öne Çıkan Profiller"
              subtitle="Premium üyelerin 7 günlük vitrin profilleri"
            />
            <GlassCard style={styles.infoCard}>
              <Text variant="label">Premium öne çıkarma ne sağlar?</Text>
              {PROFILE_BOOST_BENEFITS.map((line) => (
                <View key={line} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  <Text secondary variant="caption" style={styles.benefitText}>
                    {line}
                  </Text>
                </View>
              ))}
            </GlassCard>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <GlassCard style={styles.empty}>
              <Ionicons name="rocket-outline" size={32} color={colors.textMuted} />
              <Text secondary>Şu an öne çıkarılan profil yok.</Text>
            </GlassCard>
          )
        }
        renderItem={({ item }) => <FeaturedProfileRow profile={item} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  infoCard: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  benefitText: {
    flex: 1,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowMeta: {
    flex: 1,
    gap: 2,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  boostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
});
