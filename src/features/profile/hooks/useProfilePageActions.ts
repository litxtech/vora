import { useCallback } from 'react';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { openAdminPanel } from '@/features/admin/services/adminNavigation';
import { PROXIMITY_MATCH_ROUTES } from '@/features/proximity-match/constants';
import { PURCHASE_HISTORY_ROUTE } from '@/features/purchase-history/constants';
import { WALLET_ROUTE } from '@/features/wallet/constants';
import { canModerate } from '@/constants/roles';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { PROFILE_FEATURE } from '@/features/profile/featureFlags';
import { BUSINESS_FEATURE } from '@/features/business-center/featureFlags';
import { useAuth } from '@/providers/AuthProvider';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import { ACCOUNT_SWITCH_ROUTES } from '@/features/account-switch/constants';
import { useMyProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { useUserSoundStats } from '@/features/sounds/hooks/useUserSoundStats';

export type ProfilePageActionTone = 'default' | 'premium' | 'wallet' | 'admin' | 'provider';

export type ProfilePageAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: ProfilePageActionTone;
  active?: boolean;
  onPress: () => void;
};

type UseProfilePageActionsOptions = {
  isPremium: boolean;
  onInsightsPress?: () => void;
  onSoundStatsPress?: () => void;
  soundStatsActive?: boolean;
};

export function useProfilePageActions({
  isPremium,
  onInsightsPress,
  onSoundStatsPress,
  soundStatsActive = false,
}: UseProfilePageActionsOptions): ProfilePageAction[] {
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
  const showSettings = useFeatureVisible(PROFILE_FEATURE.settingsGear);
  const showSoundCreate = useFeatureVisible('user-sounds');
  const soundStats = useUserSoundStats(showSoundCreate ? user?.id : null);
  const showSoundStats = showSoundCreate && (soundStats?.totalSounds ?? 0) > 0;
  const showBusinessApplicationFlag = useFeatureVisible(BUSINESS_FEATURE.section.application);
  const showBusinessHubFlag = useFeatureVisible(BUSINESS_FEATURE.section.accountHub);
  const isBusinessAccount = effectiveAccountType === 'business';
  const showBusinessApplication =
    showBusinessApplicationFlag &&
    profile?.account_type === 'personal' &&
    !hasOwnedBusiness &&
    !linkedSibling &&
    !outgoingPendingUsername;

  const actions: ProfilePageAction[] = [
    ...(showEditProfile
      ? [
          {
            key: 'edit-profile',
            label: 'Profili Düzenle',
            icon: 'create-outline' as const,
            tone: 'default' as const,
            onPress: () => router.push('/profile/edit' as Href),
          },
        ]
      : []),
    ...(effectiveAccountType === 'personal' && provider
      ? [
          {
            key: 'provider-manage',
            label: provider.showOnProfile ? 'Usta Profilim' : 'Usta profili gizli',
            icon: (provider.showOnProfile ? 'construct-outline' : 'eye-off-outline') as keyof typeof Ionicons.glyphMap,
            tone: 'provider' as const,
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
    {
      key: 'purchase-history',
      label: 'Satın Alma Geçmişi',
      icon: 'receipt-outline',
      tone: 'default',
      onPress: () => router.push(PURCHASE_HISTORY_ROUTE as Href),
    },
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
    ...(showSoundCreate
      ? [
          {
            key: 'sound-create',
            label: 'Ses Oluştur',
            icon: 'mic-outline' as const,
            tone: 'default' as const,
            onPress: () => router.push('/sounds/create' as Href),
          },
          {
            key: 'sound-mine',
            label: 'Seslerim',
            icon: 'library-outline' as const,
            tone: 'default' as const,
            onPress: () => router.push('/sounds/mine' as Href),
          },
        ]
      : []),
    {
      key: 'caps-library',
      label: 'Caps Merkezi',
      icon: 'happy-outline',
      tone: 'default',
      onPress: () => router.push('/caps' as Href),
    },
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
    ...(showSoundStats
      ? [
          {
            key: 'sound-stats',
            label: 'Ses İstatistikleri',
            icon: 'musical-notes-outline' as const,
            tone: 'default' as const,
            active: soundStatsActive,
            onPress: () =>
              onSoundStatsPress ? onSoundStatsPress() : router.push('/sounds' as Href),
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
    ...(showSettings
      ? [
          {
            key: 'settings',
            label: 'Ayarlar',
            icon: 'settings-outline' as const,
            tone: 'default' as const,
            onPress: () => router.push('/settings' as Href),
          },
        ]
      : []),
  ];

  return actions;
}
