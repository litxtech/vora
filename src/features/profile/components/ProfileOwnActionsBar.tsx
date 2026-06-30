import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { openAdminPanel } from '@/features/admin/services/adminNavigation';
import { PROXIMITY_MATCH_ROUTES } from '@/features/proximity-match/constants';
import { WALLET_ROUTE } from '@/features/wallet/constants';
import { canModerate } from '@/constants/roles';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { PROFILE_FEATURE } from '@/features/profile/featureFlags';
import { BUSINESS_FEATURE } from '@/features/business-center/featureFlags';
import { useAuth } from '@/providers/AuthProvider';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import { ACCOUNT_SWITCH_ROUTES } from '@/features/account-switch/constants';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { useMyProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileOwnActionsBarProps = {
  isPremium: boolean;
  onInsightsPress?: () => void;
};

type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'default' | 'premium' | 'wallet' | 'admin';
  onPress: () => void;
};

export function ProfileOwnActionsBar({
  isPremium,
  onInsightsPress,
}: ProfileOwnActionsBarProps) {
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const { effectiveAccountType, linkedSibling, outgoingPendingUsername, hasOwnedBusiness } =
    useAccountSwitch();
  const { provider, reloadProfile } = useMyProviderProfile(user?.id ?? null);

  useFocusEffect(
    useCallback(() => {
      void reloadProfile();
    }, [reloadProfile]),
  );
  const showAdminPanel = profile?.role ? canModerate(profile.role) : false;
  const showPremium = useFeatureVisible('premium');
  const showProximityMatches = useFeatureVisible('proximity-match');
  const showWallet = useFeatureVisible('wallet');
  const showEditProfile = useFeatureVisible(PROFILE_FEATURE.editProfile);
  const showInsights = useFeatureVisible(PROFILE_FEATURE.insights);
  const showCloseFriends = useFeatureVisible(PROFILE_FEATURE.closeFriends);
  const showBusinessApplicationFlag = useFeatureVisible(BUSINESS_FEATURE.section.application);
  const showBusinessHubFlag = useFeatureVisible(BUSINESS_FEATURE.section.accountHub);
  const isBusinessAccount = effectiveAccountType === 'business';
  const showBusinessApplication =
    showBusinessApplicationFlag &&
    profile?.account_type === 'personal' &&
    !hasOwnedBusiness &&
    !linkedSibling &&
    !outgoingPendingUsername;

  const quickActions: QuickAction[] = [
    ...(effectiveAccountType === 'personal' && provider
      ? [
          {
            key: 'provider-manage',
            label: provider.showOnProfile ? 'Usta Profilim' : 'Usta profili gizli',
            icon: (provider.showOnProfile ? 'construct-outline' : 'eye-off-outline') as keyof typeof Ionicons.glyphMap,
            tone: 'default' as const,
            onPress: () => router.push('/vora-hizmetler/provider-manage' as Href),
          },
        ]
      : []),
    ...(showBusinessApplication
      ? [
          {
            key: 'business-apply',
            label: 'İşletme Başvurusu',
            icon: 'storefront-outline' as const,
            tone: 'default' as const,
            onPress: () => router.push(ACCOUNT_SWITCH_ROUTES.businessApplication as Href),
          },
        ]
      : []),
    ...(isBusinessAccount && showBusinessHubFlag
      ? [
          {
            key: 'business-hub',
            label: 'İşletme Paneli',
            icon: 'storefront-outline' as const,
            tone: 'default' as const,
            onPress: () => router.push('/business-center/account' as Href),
          },
        ]
      : []),
    ...(showWallet
      ? [
          {
            key: 'wallet',
            label: 'Cüzdan',
            icon: 'wallet-outline' as const,
            tone: 'wallet' as const,
            onPress: () => router.push(WALLET_ROUTE as Href),
          },
        ]
      : []),
    ...(showAdminPanel
      ? [
          {
            key: 'admin-panel',
            label: 'Admin',
            icon: 'shield-checkmark-outline' as const,
            tone: 'admin' as const,
            onPress: () => openAdminPanel(),
          },
        ]
      : []),
    ...(showInsights
      ? [
          {
            key: 'insights',
            label: 'İstatistik',
            icon: 'stats-chart-outline' as const,
            tone: 'default' as const,
            onPress: () =>
              onInsightsPress ? onInsightsPress() : router.push('/settings/insights' as Href),
          },
        ]
      : []),
    ...(showCloseFriends
      ? [
          {
            key: 'close-friends',
            label: 'Yakın Arkadaşlar',
            icon: 'heart-outline' as const,
            tone: 'default' as const,
            onPress: () => router.push('/profile/close-friends' as Href),
          },
        ]
      : []),
    ...(showProximityMatches
      ? [
          {
            key: 'proximity-matches',
            label: 'Eşleşilenler',
            icon: 'people-outline' as const,
            tone: 'default' as const,
            onPress: () => router.push(PROXIMITY_MATCH_ROUTES.matches as Href),
          },
        ]
      : []),
    ...(showPremium
      ? [
          {
            key: 'premium',
            label: isPremium ? 'Aboneliğim' : "Premium'a Geç",
            icon: 'diamond-outline' as const,
            tone: 'premium' as const,
            onPress: () => router.push('/settings/premium' as Href),
          },
        ]
      : []),
  ];

  return (
    <View style={styles.container}>
      {showEditProfile ? (
        <View style={styles.primaryRow}>
          <Pressable
            onPress={() => router.push('/profile/edit' as Href)}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text variant="caption" style={styles.primaryBtnTextMain}>
              Profili Düzenle
            </Text>
          </Pressable>
        </View>
      ) : null}

      {quickActions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickScrollOuter}
          contentContainerStyle={styles.quickScroll}
        >
          {quickActions.map((action) => {
            const isProviderAction = action.key === 'provider-manage';
            const accent =
              action.tone === 'premium'
                ? '#FFB300'
                : action.tone === 'wallet'
                  ? colors.warning
                  : action.tone === 'admin'
                    ? colors.primary
                    : isProviderAction
                      ? VORA_HIZMETLER_ACCENT
                      : colors.textSecondary;

            const chipBg =
              action.tone === 'wallet'
                ? `${colors.warning}14`
                : action.tone === 'admin'
                  ? `${colors.primary}14`
                  : action.tone === 'premium'
                    ? 'rgba(255,179,0,0.12)'
                    : isProviderAction
                      ? `${VORA_HIZMETLER_ACCENT}14`
                      : colors.surfaceElevated;

            const chipBorder =
              action.tone === 'wallet'
                ? `${colors.warning}55`
                : action.tone === 'admin'
                  ? `${colors.primary}55`
                  : action.tone === 'premium'
                    ? 'rgba(255,179,0,0.35)'
                    : isProviderAction
                      ? `${VORA_HIZMETLER_ACCENT}55`
                      : colors.border;

            return (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.actionChip,
                  {
                    backgroundColor: chipBg,
                    borderColor: chipBorder,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Ionicons name={action.icon} size={15} color={accent} />
                <Text
                  variant="caption"
                  numberOfLines={1}
                  style={[
                    styles.chipLabel,
                    (action.tone !== 'default' || isProviderAction) && { color: accent, fontWeight: '700' },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  primaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  primaryBtnSecondary: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryBtnTextMain: {
    color: '#fff',
    fontWeight: '700',
  },
  quickScrollOuter: {
    marginHorizontal: -spacing.lg,
  },
  quickScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: { fontSize: 12, fontWeight: '600' },
});
