import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { VerificationRow } from '@/features/vora-hizmetler/components/ProviderBadgeRow';
import { ProviderPortfolioSection } from '@/features/vora-hizmetler/components/ProviderPortfolioSection';
import { ProviderProfileHero } from '@/features/vora-hizmetler/components/ProviderProfileHero';
import { HizmetWalletPreview } from '@/features/vora-hizmetler/components/HizmetWalletPreview';
import { ProviderProfileStatsRow } from '@/features/vora-hizmetler/components/ProviderProfileStatsRow';
import { ProviderReviewsSection } from '@/features/vora-hizmetler/components/ProviderReviewsSection';
import { HizmetSectionHeader } from '@/features/vora-hizmetler/components/HizmetUi';
import { HizmetListingPickerSheet } from '@/features/vora-hizmetler/components/HizmetListingPickerSheet';
import {
  serviceCategoryColor,
  serviceCategoryIcon,
  serviceCategoryLabel,
  VORA_HIZMETLER_ACCENT,
  VORA_HIZMETLER_GRADIENT,
} from '@/features/vora-hizmetler/constants';
import { VORA_HIZMETLER_FEATURE } from '@/features/vora-hizmetler/featureFlags';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { useProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { useHizmetDocumentViewer } from '@/features/vora-hizmetler/hooks/useHizmetDocumentViewer';
import { openServiceChat } from '@/features/vora-hizmetler/services/messaging';
import { inviteProviderToRequest } from '@/features/vora-hizmetler/services/requestData';
import { openProviderComposePost, sharePublicWorkToFeed } from '@/features/vora-hizmetler/services/portfolioShare';
import {
  toggleProviderFavorite,
  toggleProviderSubscription,
} from '@/features/vora-hizmetler/services/providerData';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

export function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { provider, publicWorks, certificates, reviews, loading, reloadProfile } = useProviderProfile(
    id ?? null,
    user?.id,
  );
  const { imageViewer, opening, openDocument, closeViewer } = useHizmetDocumentViewer();
  const [messaging, setMessaging] = useState(false);
  const [listingPickerOpen, setListingPickerOpen] = useState(false);

  const showMessage = useFeatureVisible(VORA_HIZMETLER_FEATURE.providerMessage);
  const showApply = useFeatureVisible(VORA_HIZMETLER_FEATURE.providerApply);
  const showCreateRequest = useFeatureVisible(VORA_HIZMETLER_FEATURE.providerCreateRequest);
  const showFavorite = useFeatureVisible(VORA_HIZMETLER_FEATURE.providerFavorite);
  const showSubscribe = useFeatureVisible(VORA_HIZMETLER_FEATURE.providerSubscribe);
  const showManage = useFeatureVisible(VORA_HIZMETLER_FEATURE.providerManage);

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={VORA_HIZMETLER_ACCENT} size="large" />
          <Text secondary variant="caption">
            Usta profili yükleniyor…
          </Text>
        </View>
      </GradientBackground>
    );
  }

  if (!provider) {
    return (
      <GradientBackground>
        <ScreenBackButton />
        <Text variant="body" style={{ padding: spacing.lg }}>
          Profil bulunamadı.
        </Text>
      </GradientBackground>
    );
  }

  const isOwnProfile = user?.id === provider.userId;

  const handleFavorite = async () => {
    if (!user?.id) {
      Alert.alert('Giriş gerekli', 'Favorilere eklemek için oturum açın.');
      return;
    }
    await toggleProviderFavorite(provider.id, user.id, provider.isFavorited ?? false);
    void reloadProfile();
  };

  const handleSubscribe = async () => {
    if (!user?.id) {
      Alert.alert('Giriş gerekli', 'Takip etmek için oturum açın.');
      return;
    }
    await toggleProviderSubscription(provider.id, user.id, provider.isSubscribed ?? false);
    Alert.alert(
      provider.isSubscribed ? 'Takip bırakıldı' : 'Takip ediliyor',
      provider.isSubscribed
        ? 'Kampanya bildirimleri kapatıldı.'
        : 'Bu ustanın kampanyalarını takip edeceksiniz.',
    );
    void reloadProfile();
  };

  const handleMessage = async () => {
    if (!user?.id) {
      Alert.alert('Giriş gerekli', 'Mesaj göndermek için oturum açın.');
      return;
    }
    if (isOwnProfile) return;

    setMessaging(true);
    const result = await openServiceChat(provider.userId);
    setMessaging(false);
    if (result.error) Alert.alert('Mesaj', result.error);
  };

  const handleCreateRequest = () => {
    const category = provider.categories[0];
    router.push({
      pathname: '/vora-hizmetler/create-request',
      params: category ? { category } : undefined,
    } as never);
  };

  const handleApplyWithListing = () => {
    if (!user?.id) {
      Alert.alert('Giriş gerekli', 'Başvuru göndermek için oturum açın.');
      return;
    }
    setListingPickerOpen(true);
  };

  const handleListingInvite = async (listing: { id: string; title: string }) => {
    const result = await inviteProviderToRequest(listing.id, provider.id);
    if (result.error) {
      Alert.alert('Başvuru gönderilemedi', result.error);
      return;
    }
    setListingPickerOpen(false);
    Alert.alert(
      'Davet gönderildi',
      `"${listing.title}" ilanınız ${provider.displayName} ustasına iletildi. Teklif vermesi için bildirim gitti.`,
    );
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <ScreenBackButton />

        <ProviderProfileHero provider={provider} />

        <ProviderProfileStatsRow
          completedJobs={provider.completedJobs}
          completionRate={provider.completionRate}
          responseMinutes={provider.responseMinutes}
          membershipYears={provider.membershipYears}
        />

        {isOwnProfile && user?.id ? (
          <HizmetWalletPreview userId={user.id} providerId={provider.id} />
        ) : null}

        <Pressable
          onPress={
            isOwnProfile
              ? () => router.push('/vora-hizmetler/provider-verification' as never)
              : undefined
          }
          disabled={!isOwnProfile}
        >
          <VerificationRow
            identityVerified={provider.identityVerified}
            workplaceVerified={provider.workplaceVerified}
          />
        </Pressable>

        {!isOwnProfile ? (
          <View style={styles.actions}>
            {showMessage ? (
            <Pressable
              onPress={handleMessage}
              disabled={messaging}
              style={({ pressed }) => [{ opacity: pressed || messaging ? 0.88 : 1 }]}
            >
              <LinearGradient
                colors={[...VORA_HIZMETLER_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                {messaging ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                    <Text variant="label" style={styles.primaryBtnText}>
                      Mesaj Gönder
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
            ) : null}

            {showApply ? (
            <Pressable
              onPress={handleApplyWithListing}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="document-text-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
              <Text variant="label" style={{ color: VORA_HIZMETLER_ACCENT }}>
                İlanımla Başvur
              </Text>
            </Pressable>
            ) : null}

            {showCreateRequest ? (
            <Pressable
              onPress={handleCreateRequest}
              style={({ pressed }) => [
                styles.tertiaryBtn,
                { opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.textSecondary} />
              <Text secondary variant="caption" style={{ fontWeight: '700' }}>
                Yeni ilan aç
              </Text>
            </Pressable>
            ) : null}

            {showFavorite || showSubscribe ? (
            <View style={styles.quickActions}>
              {showFavorite ? (
              <QuickAction
                icon={provider.isFavorited ? 'heart' : 'heart-outline'}
                label="Favori"
                active={provider.isFavorited}
                activeColor="#EF4444"
                onPress={handleFavorite}
              />
              ) : null}
              {showSubscribe ? (
              <QuickAction
                icon={provider.isSubscribed ? 'notifications' : 'notifications-outline'}
                label="Takip"
                active={provider.isSubscribed}
                activeColor={VORA_HIZMETLER_ACCENT}
                onPress={handleSubscribe}
              />
              ) : null}
            </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.actions}>
            {showManage ? (
            <Pressable
              onPress={() => router.push('/vora-hizmetler/provider-manage' as never)}
              style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
            >
              <LinearGradient
                colors={[...VORA_HIZMETLER_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Ionicons name="settings-outline" size={18} color="#fff" />
                <Text variant="label" style={styles.primaryBtnText}>
                  Profili Yönet
                </Text>
              </LinearGradient>
            </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.push('/vora-hizmetler/provider-edit' as never)}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="create-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
              <Text variant="label" style={{ color: VORA_HIZMETLER_ACCENT }}>
                Profili Düzenle
              </Text>
            </Pressable>
            <Pressable
              onPress={openProviderComposePost}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="share-social-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
              <Text variant="label" style={{ color: VORA_HIZMETLER_ACCENT }}>
                Gönderi Paylaş
              </Text>
            </Pressable>
          </View>
        )}

        {provider.bio ? (
          <GlassCard style={styles.section}>
            <HizmetSectionHeader title="Hakkında" icon="reader-outline" />
            <Text secondary variant="body" style={styles.bio}>
              {provider.bio}
            </Text>
          </GlassCard>
        ) : null}

        {provider.categories.length ? (
          <GlassCard style={styles.section}>
            <HizmetSectionHeader title="Hizmetler" subtitle="Uzmanlık alanları" icon="construct-outline" />
            <View style={styles.tagRow}>
              {provider.categories.map((cat) => {
                const color = serviceCategoryColor(cat);
                const icon = serviceCategoryIcon(cat) as keyof typeof Ionicons.glyphMap;
                return (
                  <View
                    key={cat}
                    style={[styles.serviceChip, { backgroundColor: `${color}14`, borderColor: `${color}30` }]}
                  >
                    <Ionicons name={icon} size={14} color={color} />
                    <Text variant="caption" style={{ color, fontWeight: '700' }}>
                      {serviceCategoryLabel(cat)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </GlassCard>
        ) : null}

        <ProviderPortfolioSection
          items={publicWorks}
          isOwnProfile={isOwnProfile}
          onShareItem={isOwnProfile ? (item) => void sharePublicWorkToFeed(item) : undefined}
          onAddWork={
            isOwnProfile
              ? () => router.push('/vora-hizmetler/provider-portfolio' as never)
              : undefined
          }
          onManageWorks={
            isOwnProfile
              ? () => router.push('/vora-hizmetler/provider-portfolio' as never)
              : undefined
          }
        />

        <ProviderReviewsSection
          providerId={provider.id}
          rating={provider.rating}
          reviewCount={provider.reviewCount}
          reviews={reviews}
          isOwnProfile={isOwnProfile}
        />

        {certificates.length ? (
          <GlassCard style={styles.section}>
            <HizmetSectionHeader title="Sertifikalar" icon="ribbon-outline" />
            {certificates.map((cert, index) => (
              <Pressable
                key={cert.id}
                disabled={!cert.documentUrl || opening}
                onPress={() => {
                  if (cert.documentUrl) void openDocument(cert.documentUrl, cert.title);
                }}
                style={({ pressed }) => [
                  styles.certItem,
                  { borderColor: colors.border, opacity: pressed && cert.documentUrl ? 0.88 : 1 },
                  index === 0 && styles.certItemFirst,
                ]}
              >
                <LinearGradient
                  colors={[...VORA_HIZMETLER_GRADIENT]}
                  style={styles.certAccent}
                />
                <View style={styles.certBody}>
                  <Text variant="label">{cert.title}</Text>
                  {cert.issuedAt ? (
                    <Text secondary variant="caption">
                      {new Date(cert.issuedAt).toLocaleDateString('tr-TR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  ) : null}
                  {cert.documentUrl ? (
                    <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '600' }}>
                      Belgeyi görüntüle
                    </Text>
                  ) : null}
                </View>
                {opening ? (
                  <ActivityIndicator size="small" color={VORA_HIZMETLER_ACCENT} />
                ) : (
                  <Ionicons name="document-text-outline" size={20} color={VORA_HIZMETLER_ACCENT} />
                )}
              </Pressable>
            ))}
          </GlassCard>
        ) : null}
      </ScrollView>

      <HizmetListingPickerSheet
        visible={listingPickerOpen}
        onClose={() => setListingPickerOpen(false)}
        userId={user?.id ?? null}
        providerName={provider.displayName}
        onSelect={handleListingInvite}
        onCreateNew={handleCreateRequest}
      />

      <FullScreenMediaViewer
        urls={imageViewer?.urls ?? []}
        visible={Boolean(imageViewer)}
        startIndex={imageViewer?.startIndex ?? 0}
        onClose={closeViewer}
      />
    </GradientBackground>
  );
}

function QuickAction({
  icon,
  label,
  active,
  activeColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          borderColor: active ? `${activeColor}55` : colors.border,
          backgroundColor: active ? `${activeColor}10` : colors.surfaceElevated,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={active ? activeColor : colors.textSecondary} />
      <Text variant="caption" style={{ color: active ? activeColor : colors.textSecondary, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 96,
    gap: spacing.lg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: 120,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    shadowColor: VORA_HIZMETLER_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#fff',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  tertiaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  section: {
    gap: spacing.md,
  },
  bio: {
    lineHeight: 22,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  certItemFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  certAccent: {
    width: 4,
    height: 36,
    borderRadius: radius.full,
  },
  certBody: {
    flex: 1,
    gap: 2,
  },
});
