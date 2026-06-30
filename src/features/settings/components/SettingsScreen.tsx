import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { ProfileQuickLink } from '@/features/profile/components/shared/ProfileQuickLink';
import { PremiumSupportQuickLink } from '@/features/premium-support/components/PremiumSupportQuickLink';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { spacing } from '@/constants/theme';
import { INSIGHTS_ACCENT } from '@/features/insights/constants';
import { SCREEN_TIME_ACCENT } from '@/features/screen-time/constants';
import { subscriptionsCommerceEnabled } from '@/features/profile/services/premiumAccess';
import { FeatureGate } from '@/features/feature-flags/components/FeatureGate';
import { SETTINGS_FEATURE } from '@/features/settings/featureFlags';
import { BUSINESS_FEATURE } from '@/features/business-center/featureFlags';
import { useAuth } from '@/providers/AuthProvider';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import { AccountLinkStatusCard } from '@/features/account-switch/components/AccountLinkStatusCard';
import { ACCOUNT_SWITCH_ROUTES } from '@/features/account-switch/constants';
import { cycleThemePreference, themePreferenceLabel, useTheme } from '@/providers/ThemeProvider';

export function SettingsScreen() {
  const { colors, mode, preference, setMode } = useTheme();
  const { signOut, isGuest, profile } = useAuth();
  const {
    effectiveAccountType,
    linkedSibling,
    outgoingPendingUsername,
    outgoingPendingRequestId,
    outgoingPendingTargetUserId,
    hasOwnedBusiness,
  } = useAccountSwitch();

  const isPersonalAccount = profile?.account_type === 'personal';
  const accountType = profile?.account_type ?? 'personal';
  const showBusinessApplication =
    !isGuest && isPersonalAccount && !hasOwnedBusiness && !linkedSibling && !outgoingPendingUsername;

  const confirmSignOut = (message: string) => {
    Alert.alert('Çıkış Yap', message, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await signOut('manual');
          router.replace('/(welcome)/lobby');
        },
      },
    ]);
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader title="Ayarlar" showBack />

        {/* Öne çıkan hızlı erişimler */}
        {!isGuest ? (
          <View style={styles.group}>
            <FeatureGate featureId="premium">
              <ProfileQuickLink
                icon="diamond"
                title={profile?.is_premium ? 'Aboneliğim' : 'Vora Premium'}
                subtitle={
                  profile?.is_premium
                    ? 'Paketinizi, özelliklerinizi ve yenilemeyi yönetin'
                    : 'Arama, rozet, istatistikler ve profil öne çıkarma'
                }
                accent="#FFB300"
                onPress={() => router.push('/settings/premium' as Href)}
              />
              <PremiumSupportQuickLink />
            </FeatureGate>

            <FeatureGate featureId="ads">
              <ProfileQuickLink
                icon="megaphone"
                title="Reklam Merkezi"
                subtitle={
                  subscriptionsCommerceEnabled()
                    ? 'Stüdyoda reklam hazırlayın · aylık 10 / yıllık 30 kota'
                    : 'Stüdyoda reklam hazırlayın ve yayınlayın'
                }
                accent={colors.warning}
                onPress={() => router.push('/ads' as Href)}
              />
            </FeatureGate>

            {effectiveAccountType === 'business' ? (
              <FeatureGate featureId={BUSINESS_FEATURE.section.accountHub}>
                <ProfileQuickLink
                  icon="bag-handle"
                  title="İşletme Paneli"
                  subtitle="Mağaza · ürün · otel · Stripe ödemeler"
                  accent="#7C4DFF"
                  onPress={() => router.push('/business-center/account' as Href)}
                />
              </FeatureGate>
            ) : null}

            {showBusinessApplication ? (
              <FeatureGate featureId={BUSINESS_FEATURE.section.application}>
                <ProfileQuickLink
                  icon="storefront-outline"
                  title="İşletme Başvurusu"
                  subtitle="Bireysel hesabınıza işletme profili ekleyin"
                  accent="#7C4DFF"
                  onPress={() => router.push(ACCOUNT_SWITCH_ROUTES.businessApplication as Href)}
                />
              </FeatureGate>
            ) : null}

            <AccountLinkStatusCard
              accountType={accountType}
              linkedSibling={linkedSibling}
              outgoingPendingUsername={outgoingPendingUsername}
              outgoingPendingRequestId={outgoingPendingRequestId}
              outgoingPendingTargetUserId={outgoingPendingTargetUserId}
            />

            <FeatureGate featureId={SETTINGS_FEATURE.insights}>
              <ProfileQuickLink
                icon="analytics"
                title="İçgörüler & Güven"
                subtitle="İçerik performansı, demografi, ziyaretçiler ve güven puanı"
                accent={INSIGHTS_ACCENT}
                onPress={() => router.push('/settings/insights' as Href)}
              />
            </FeatureGate>
          </View>
        ) : null}

        {/* Misafir hesap */}
        {isGuest ? (
          <GlassCard style={styles.section}>
            <Text variant="label">Misafir Hesap</Text>
            <Text secondary variant="caption">
              Profili düzenleyerek ad, kullanıcı adı ve e-postanızı değiştirebilirsiniz. E-postanızı
              doğruladığınızda hesabınız bireysel hesap gibi çalışır.
            </Text>
            <SettingsRow
              icon="swap-horizontal-outline"
              label="Şifre Belirle"
              accent={colors.primary}
              onPress={() => router.push('/(auth)/convert-account' as Href)}
            />
          </GlassCard>
        ) : null}

        {/* Hesap */}
        {!isGuest ? (
          <GlassCard style={styles.section}>
            <Text variant="label">Hesap</Text>
            <SettingsRow
              icon="lock-closed-outline"
              label="Hesap Güvenliği"
              onPress={() => router.push('/settings/account' as Href)}
            />
            {isPersonalAccount ? (
              <FeatureGate featureId={SETTINGS_FEATURE.identityVerification}>
                <SettingsRow
                  icon="id-card-outline"
                  label={profile?.is_verified ? 'Kimlik Doğrulandı' : 'Kimliğimi Doğrula'}
                  accent={profile?.is_verified ? colors.success : colors.primary}
                  onPress={() => router.push('/settings/identity-verification' as Href)}
                />
              </FeatureGate>
            ) : null}
            <FeatureGate featureId={SETTINGS_FEATURE.badgeVisibility}>
              <SettingsRow
                icon="ribbon-outline"
                label="Tik Görünürlüğü"
                onPress={() => router.push('/settings/badge-visibility' as Href)}
              />
            </FeatureGate>
          </GlassCard>
        ) : null}

        {/* Tercihler */}
        <GlassCard style={styles.section}>
          <Text variant="label">Tercihler</Text>
          <SettingsRow
            icon="moon-outline"
            label={`Tema: ${themePreferenceLabel(preference, mode)}`}
            onPress={() => setMode(cycleThemePreference(preference))}
          />
          <FeatureGate featureId={SETTINGS_FEATURE.notifications}>
            <SettingsRow
              icon="notifications-outline"
              label="Bildirim Ayarları"
              onPress={() => router.push('/settings/notifications' as Href)}
            />
          </FeatureGate>
          <FeatureGate featureId={SETTINGS_FEATURE.messaging}>
            <SettingsRow
              icon="chatbubbles-outline"
              label="Mesajlaşma Ayarları"
              onPress={() => router.push('/settings/messaging' as Href)}
            />
          </FeatureGate>
          <FeatureGate featureId={SETTINGS_FEATURE.screenTime}>
            <SettingsRow
              icon="hourglass-outline"
              label="Ekran Süresi"
              accent={SCREEN_TIME_ACCENT}
              onPress={() => router.push('/settings/screen-time' as Href)}
            />
          </FeatureGate>
        </GlassCard>

        {/* Gizlilik & Güven */}
        <FeatureGate featureId={SETTINGS_FEATURE.securityCenter}>
          <GlassCard style={styles.section}>
            <Text variant="label">Gizlilik & Güven</Text>
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Güven Merkezi"
              onPress={() => router.push('/settings/security' as Href)}
            />
          </GlassCard>
        </FeatureGate>

        {/* Merkezler */}
        <View style={styles.group}>
          <Text variant="label" style={styles.sectionTitle}>
            Merkezler
          </Text>
          <FeatureGate featureId="personnel-center">
            <ProfileQuickLink
              icon="briefcase"
              title="Personel Merkezi"
              subtitle="İş ilanları, başvurular ve personel arama"
              accent={colors.accent}
              onPress={() => router.push('/personnel-center' as Href)}
            />
          </FeatureGate>
          <FeatureGate featureId="event-center">
            <ProfileQuickLink
              icon="calendar"
              title="Etkinlik Merkezi"
              subtitle="Konser, festival, toplantı ve bölgesel etkinlikler"
              accent={colors.primary}
              onPress={() => router.push('/event-center' as Href)}
            />
          </FeatureGate>
          <FeatureGate featureId="lost-center">
            <ProfileQuickLink
              icon="search"
              title="Kayıp Merkezi"
              subtitle="Kayıp hayvan, insan, eşya ve buluntu ilanları"
              accent={colors.danger}
              onPress={() => router.push('/lost-center' as Href)}
            />
          </FeatureGate>
          <FeatureGate featureId="centers-hub">
            <ProfileQuickLink
              icon="grid"
              title="Tüm Merkezler"
              subtitle="Pazar, yolculuk, yardım ve 5 merkez daha"
              accent={colors.primary}
              onPress={() => router.push('/(tabs)/centers' as Href)}
            />
          </FeatureGate>
          <FeatureGate featureId="job-seeker">
            <ProfileQuickLink
              icon="person-add-outline"
              title="İş Arayan Profili"
              subtitle="Kariyer bilgilerinizi doldurun, işverenler görsün"
              accent={colors.success}
              onPress={() => router.push('/settings/job-seeker' as Href)}
            />
          </FeatureGate>
        </View>

        {/* Programlar */}
        <GlassCard style={styles.section}>
          <Text variant="label">Programlar</Text>
          <FeatureGate featureId="reporter">
            <SettingsRow
              icon="mic-outline"
              label="Muhabir Programı"
              onPress={() => router.push('/reporter/apply' as Href)}
            />
          </FeatureGate>
          <FeatureGate featureId="tasks">
            <SettingsRow
              icon="trophy-outline"
              label="Günlük Görevler"
              onPress={() => router.push('/tasks' as Href)}
            />
          </FeatureGate>
          <FeatureGate featureId="wallet">
            <SettingsRow
              icon="wallet-outline"
              label="Cüzdan"
              onPress={() => router.push('/wallet' as Href)}
            />
          </FeatureGate>
        </GlassCard>

        {/* Yardım & Destek */}
        <GlassCard style={styles.section}>
          <Text variant="label">Yardım & Destek</Text>
          <FeatureGate featureId={SETTINGS_FEATURE.supportCenter}>
            <SettingsRow
              icon="headset-outline"
              label="Destek Merkezi"
              onPress={() => router.push('/support-center' as Href)}
            />
          </FeatureGate>
          <FeatureGate featureId={SETTINGS_FEATURE.platformGuide}>
            <SettingsRow
              icon="book-outline"
              label="Platform Rehberi"
              onPress={() => router.push('/settings/platform-guide' as Href)}
            />
          </FeatureGate>
          <FeatureGate featureId={SETTINGS_FEATURE.contribute}>
            <SettingsRow
              icon="heart-outline"
              label="Uygulamaya Katkıda Bulun"
              accent="#10B981"
              onPress={() => router.push('/settings/contribute' as Href)}
            />
          </FeatureGate>
          {!isGuest ? (
            <FeatureGate featureId={SETTINGS_FEATURE.inviteCenter}>
              <SettingsRow
                icon="gift-outline"
                label="Davet Merkezi"
                accent={colors.accent}
                onPress={() => router.push('/settings/invite-center' as Href)}
              />
            </FeatureGate>
          ) : null}
          <FeatureGate featureId={SETTINGS_FEATURE.shareApp}>
            <SettingsRow
              icon="share-social-outline"
              label="Uygulamayı Paylaş"
              accent={colors.primary}
              onPress={() => router.push('/settings/share-app' as Href)}
            />
          </FeatureGate>
        </GlassCard>

        {/* Oturum */}
        <GlassCard style={styles.section}>
          <Text variant="label">Oturum</Text>
          {!isGuest ? (
            <SettingsRow
              icon="trash-outline"
              label="Hesap Silme"
              tone="danger"
              onPress={() => router.push('/settings/account' as Href)}
            />
          ) : null}
          <SettingsRow
            icon="log-out-outline"
            label="Çıkış Yap"
            tone="danger"
            onPress={() =>
              confirmSignOut(
                isGuest
                  ? 'Misafir oturumunuz sonlandırılacak.'
                  : 'Hesabınızdan çıkış yapılacak. Oturumunuz yalnızca siz çıkış yaptığınızda sonlanır.',
              )
            }
          />
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  section: { gap: spacing.xs },
  sectionTitle: { paddingHorizontal: spacing.xs },
  group: { gap: spacing.sm },
});
