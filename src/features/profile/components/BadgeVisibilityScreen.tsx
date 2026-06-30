import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { fetchIzdivacAppBadges } from '@/features/izdivac';
import { fetchUserBadges } from '@/features/profile/services/profileData';
import {
  PROFILE_BADGE_VISIBILITY_DEFS,
  ownedProfileBadgeKeys,
  setBadgeHidden,
  type ProfileBadgeKey,
} from '@/features/profile/services/badgeVisibility';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function BadgeVisibilityScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();

  const [ownedKeys, setOwnedKeys] = useState<ProfileBadgeKey[] | null>(null);
  const [hidden, setHidden] = useState<Set<ProfileBadgeKey>>(new Set());
  const [pending, setPending] = useState<ProfileBadgeKey | null>(null);

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;

    setHidden(new Set((profile.hidden_badges ?? []) as ProfileBadgeKey[]));

    Promise.all([fetchUserBadges(user.id), fetchIzdivacAppBadges(user.id)]).then(
      ([badges, izdivacBadges]) => {
        if (cancelled) return;
        const badgeSet = new Set(badges.map((b) => b.badgeType));
        const owned = ownedProfileBadgeKeys({
          isVerified: profile.is_verified,
          isBusinessVerified: profile.account_type === 'business',
          isPremium: profile.is_premium,
          isPlatformCharm: badgeSet.has('platform_charm'),
          isPioneer: badgeSet.has('pioneer'),
          isPlatformSupporter: badgeSet.has('platform_supporter'),
          role: profile.role ?? null,
          izdivacBadges,
        });
        setOwnedKeys(owned);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.hidden_badges, profile?.is_verified, profile?.is_premium, profile?.account_type, profile?.izdivac_access_granted, profile?.role]);

  const orderedDefs = useMemo(() => {
    if (!ownedKeys) return [];
    const set = new Set(ownedKeys);
    return PROFILE_BADGE_VISIBILITY_DEFS.filter((def) => set.has(def.key));
  }, [ownedKeys]);

  const toggle = async (key: ProfileBadgeKey, nextVisible: boolean) => {
    if (!user) return;
    const nextHidden = !nextVisible;

    setHidden((prev) => {
      const next = new Set(prev);
      if (nextHidden) next.add(key);
      else next.delete(key);
      return next;
    });
    setPending(key);

    const { error } = await setBadgeHidden(user.id, key, nextHidden);
    setPending(null);

    if (error) {
      setHidden((prev) => {
        const next = new Set(prev);
        if (nextHidden) next.delete(key);
        else next.add(key);
        return next;
      });
    }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader
          title="Tik Görünürlüğü"
          subtitle="Profilinizde isminizin yanında görünen tikleri tek tek gizleyebilirsiniz"
          showBack
        />

        <GlassCard style={styles.intro}>
          <View style={[styles.introIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
          </View>
          <Text secondary variant="caption" style={styles.introText}>
            Gizlediğiniz tikler profilinizde hiç kimseye gösterilmez. Tiki istediğiniz zaman tekrar
            açabilirsiniz.
          </Text>
        </GlassCard>

        {ownedKeys === null ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : orderedDefs.length === 0 ? (
          <GlassCard style={styles.empty}>
            <Ionicons name="sparkles-outline" size={28} color={colors.textMuted} />
            <Text secondary variant="caption" style={styles.emptyText}>
              Henüz gizlenebilecek bir tikiniz yok. Tik kazandığınızda burada görünür.
            </Text>
          </GlassCard>
        ) : (
          <GlassCard style={styles.section} padded={false}>
            <View style={styles.list}>
              {orderedDefs.map((def, index) => {
                const isHidden = hidden.has(def.key);
                return (
                  <View
                    key={def.key}
                    style={[
                      styles.row,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    ]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: `${def.color}1F` }]}>
                      <Ionicons name={def.icon} size={18} color={def.color} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text variant="label">{def.label}</Text>
                      <Text variant="caption" secondary>
                        {isHidden ? 'Gizli — profilde gösterilmiyor' : def.description}
                      </Text>
                    </View>
                    <Switch
                      value={!isHidden}
                      onValueChange={(v) => toggle(def.key, v)}
                      disabled={pending === def.key}
                      trackColor={{ false: colors.border, true: def.color }}
                      thumbColor="#fff"
                      ios_backgroundColor={colors.border}
                    />
                  </View>
                );
              })}
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  introIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: { flex: 1, lineHeight: 18 },
  section: {},
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: 2 },
  centered: { padding: spacing.xl, alignItems: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { textAlign: 'center', maxWidth: 260 },
});
