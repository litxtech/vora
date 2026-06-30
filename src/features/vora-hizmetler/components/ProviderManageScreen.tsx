import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { RatingStars } from '@/features/vora-hizmetler/components/ProviderBadgeRow';
import { HizmetManageMenuCard } from '@/features/vora-hizmetler/components/HizmetManageMenuCard';
import {
  HizmetEmptyState,
  HizmetGradientButton,
  HizmetHeroBanner,
  HizmetLoadingState,
  HizmetSectionHeader,
} from '@/features/vora-hizmetler/components/HizmetUi';
import {
  HizmetStatTile,
  HizmetStatsRow,
} from '@/features/vora-hizmetler/components/HizmetStatCard';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { useMyProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { syncProviderVerification, setProviderShowOnProfile } from '@/features/vora-hizmetler/services/providerData';
import { useAuth } from '@/providers/AuthProvider';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
  badge?: string;
  accent: string;
  gradient: readonly [string, string];
};

export function ProviderManageScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { provider, loading, reloadProfile } = useMyProviderProfile(user?.id ?? null);
  const [savingVisibility, setSavingVisibility] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reloadProfile();
      if (user?.id) void syncProviderVerification(user.id).then(() => reloadProfile());
    }, [reloadProfile, user?.id]),
  );

  if (loading) {
    return (
      <GradientBackground>
        <HizmetLoadingState label="Profil yükleniyor…" />
      </GradientBackground>
    );
  }

  if (!provider) {
    return (
      <GradientBackground>
        <View style={styles.page}>
          <ScreenBackButton />
          <HizmetEmptyState
            icon="construct-outline"
            title="Henüz usta profiliniz yok"
            description="Dijital kartvizitinizi oluşturun, Keşfet'te görünün ve iş taleplerine teklif verin."
            actionLabel="Profil Oluştur"
            onAction={() => router.push('/vora-hizmetler/provider-setup' as never)}
          />
        </View>
      </GradientBackground>
    );
  }

  const verifiedCount = [provider.identityVerified, provider.workplaceVerified].filter(Boolean).length;

  const menu: MenuItem[] = [
    {
      icon: 'wallet-outline',
      title: 'Ödeme Bilgileri',
      subtitle: 'IBAN — kazanç transferi',
      route: '/vora-hizmetler/payout-profile',
      accent: '#059669',
      gradient: ['#059669', '#10B981'],
    },
    {
      icon: 'create-outline',
      title: 'Profili Düzenle',
      subtitle: 'Ad, meslek, fotoğraf',
      route: '/vora-hizmetler/provider-edit',
      accent: '#0EA5E9',
      gradient: ['#0EA5E9', '#38BDF8'],
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Doğrulama',
      subtitle: `${verifiedCount}/2 tamamlandı`,
      route: '/vora-hizmetler/provider-verification',
      badge: verifiedCount === 2 ? 'Tam' : `${verifiedCount}/2`,
      accent: '#10B981',
      gradient: ['#10B981', '#34D399'],
    },
    {
      icon: 'images-outline',
      title: 'Portfolyo',
      subtitle: 'Önce/sonra fotoğraflar',
      route: '/vora-hizmetler/provider-portfolio',
      accent: '#8B5CF6',
      gradient: ['#8B5CF6', '#A78BFA'],
    },
    {
      icon: 'ribbon-outline',
      title: 'Sertifikalar',
      subtitle: 'Mesleki belgeler',
      route: '/vora-hizmetler/provider-certificates',
      accent: '#F59E0B',
      gradient: ['#F59E0B', '#FBBF24'],
    },
    {
      icon: 'star-outline',
      title: 'Değerlendirme',
      subtitle: `${provider.reviewCount} yorum`,
      route: `/vora-hizmetler/provider-reviews?providerId=${provider.id}`,
      accent: '#EC4899',
      gradient: ['#EC4899', '#F472B6'],
    },
    {
      icon: 'eye-outline',
      title: 'Önizleme',
      subtitle: 'Müşteri görünümü',
      route: `/detail/vora-hizmetler/provider/${provider.id}`,
      accent: '#06B6D4',
      gradient: ['#06B6D4', '#22D3EE'],
    },
  ];

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <ScreenBackButton />

        <HizmetHeroBanner
          title="Profil Yönetimi"
          subtitle="Kartvizitinizi güncel tutun, daha fazla iş alın"
          icon="settings-outline"
          compact
        />

        <View style={styles.profileCard}>
          <LinearGradient colors={[`${VORA_HIZMETLER_ACCENT}16`, 'transparent']} style={styles.profileCardBg} />
          <View style={styles.profileTop}>
            {provider.avatarUrl ? (
              <Image source={{ uri: provider.avatarUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={['#0EA5E9', '#38BDF8']} style={styles.avatar}>
                <Text variant="h3" style={{ color: '#fff' }}>
                  {provider.displayName[0]?.toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.profileMeta}>
              <Text variant="h3">{provider.displayName}</Text>
              <Text secondary variant="caption">
                {provider.profession}
              </Text>
              <RatingStars rating={provider.rating} reviewCount={provider.reviewCount} size={14} />
            </View>
          </View>

          <HizmetStatsRow>
            <HizmetStatTile
              index={0}
              compact
              label="Tamamlanan İş"
              value={String(provider.completedJobs)}
              icon="checkmark-done-outline"
              color="#0EA5E9"
            />
            <HizmetStatTile
              index={1}
              compact
              label="Ort. Puan"
              value={provider.rating.toFixed(1)}
              icon="star-outline"
              color="#F59E0B"
            />
            <HizmetStatTile
              index={2}
              compact
              label="Değerlendirme"
              value={String(provider.reviewCount)}
              icon="chatbubble-outline"
              color="#8B5CF6"
            />
          </HizmetStatsRow>

          <View style={[styles.statusPill, { backgroundColor: provider.isActive ? '#22C55E18' : '#EF444418' }]}>
            <View style={[styles.statusDot, { backgroundColor: provider.isActive ? '#22C55E' : '#EF4444' }]} />
            <Text variant="caption" style={{ fontWeight: '700' }}>
              {provider.isActive ? 'Profil aktif · teklif alabilirsiniz' : 'Profil pasif'}
            </Text>
          </View>

          <View style={[styles.visibilityRow, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
            <View style={styles.visibilityCopy}>
              <Text variant="label">Sosyal profilde göster</Text>
              <Text secondary variant="caption">
                Kapatırsanız ziyaretçiler kişisel profilinizde usta kartınızı görmez
              </Text>
            </View>
            <Switch
              value={provider.showOnProfile}
              onValueChange={(value) => {
                setSavingVisibility(true);
                void setProviderShowOnProfile(provider.id, value).then((result) => {
                  setSavingVisibility(false);
                  if (!result.error) void reloadProfile();
                });
              }}
              disabled={savingVisibility}
              trackColor={{ true: VORA_HIZMETLER_ACCENT, false: colors.border }}
            />
          </View>

          <HizmetGradientButton
            label="Profil Önizleme"
            icon="eye-outline"
            onPress={() => router.push(`/detail/vora-hizmetler/provider/${provider.id}` as never)}
          />
        </View>

        <HizmetSectionHeader title="Yönetim Menüsü" subtitle="Profilinizi güçlendirin" icon="grid-outline" />

        <View style={styles.menuGrid}>
          {menu.map((item, index) => (
            <HizmetManageMenuCard
              key={item.route}
              index={index}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              badge={item.badge}
              accent={item.accent}
              gradient={item.gradient}
              onPress={() => router.push(item.route as never)}
            />
          ))}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 96,
  },
  profileCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  profileCardBg: {
    ...StyleSheet.absoluteFillObject,
  },
  profileTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  visibilityCopy: {
    flex: 1,
    gap: 2,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
});
