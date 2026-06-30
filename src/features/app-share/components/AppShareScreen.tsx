import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { AppShareCard } from '@/features/app-share/components/AppShareCard';
import { useAppStoreLinks } from '@/features/app-share/hooks/useAppStoreLinks';
import {
  captureAppShareCard,
  saveAppShareCardToGallery,
  shareAppShareCardImage,
  shareAppWhatsApp,
} from '@/features/app-share/services/appShare';
import { buildAppShareMessage, buildTrackedStoreUrl } from '@/features/app-share/utils/buildTrackedStoreUrl';
import type { AppShareChannel, AppSharePlatform } from '@/features/app-share/types';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const HERO_GRADIENT = ['#5E35B1', '#7E57C2', '#26A69A'] as const;

type StoreAction = {
  platform: AppSharePlatform;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  available: boolean;
  badge?: string;
};

export function AppShareScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { config, loading, hasIosLink, hasAndroidLink } = useAppStoreLinks();
  const cardRef = useRef<View>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<AppSharePlatform | null>(null);
  const [busy, setBusy] = useState(false);

  const referrerId = profile?.username ?? profile?.id ?? null;
  const referrerLabel = profile?.username ? `@${profile.username.replace(/^@/, '')}` : profile?.full_name ?? null;

  const preferredPlatform: AppSharePlatform =
    Platform.OS === 'android' && hasAndroidLink ? 'android' : hasIosLink ? 'ios' : 'android';

  const previewStoreUrl =
    buildTrackedStoreUrl({ config, platform: preferredPlatform, channel: 'share', referrerId }) ?? config.ios_url;

  const storeActions = useMemo<StoreAction[]>(
    () => [
      {
        platform: 'ios',
        label: 'App Store',
        icon: 'logo-apple',
        accent: '#FFFFFF',
        available: hasIosLink,
      },
      {
        platform: 'android',
        label: 'Google Play',
        icon: 'logo-google-playstore',
        accent: '#34A853',
        available: hasAndroidLink,
        badge: hasAndroidLink ? undefined : 'Yakında',
      },
    ],
    [hasAndroidLink, hasIosLink],
  );

  const runWithCapture = async (
    platform: AppSharePlatform,
    action: (uri: string, message: string) => Promise<{ error: string | null }>,
  ) => {
    const message = buildAppShareMessage({ config, platform, channel: 'share', referrerId });
    if (!message) {
      Alert.alert('Henüz hazır değil', 'Bu mağaza linki admin tarafından henüz eklenmedi.');
      return;
    }

    setBusy(true);
    try {
      const captured = await captureAppShareCard(cardRef);
      if (!captured.uri) {
        Alert.alert('Kart', captured.error ?? 'Görsel oluşturulamadı.');
        return;
      }

      const result = await action(captured.uri, message);
      if (result.error) {
        Alert.alert('Paylaşım', result.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const runShare = async (platform: AppSharePlatform, channel: AppShareChannel) => {
    const message = buildAppShareMessage({ config, platform, channel, referrerId });
    if (!message) {
      Alert.alert('Henüz hazır değil', 'Bu mağaza linki admin tarafından henüz eklenmedi.');
      return;
    }

    if (channel === 'copy') {
      setBusy(true);
      try {
        await Clipboard.setStringAsync(message);
        setCopiedPlatform(platform);
        setTimeout(() => setCopiedPlatform(null), 2000);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (channel === 'whatsapp') {
      await runWithCapture(platform, async (uri, shareMessage) => {
        const imageResult = await shareAppShareCardImage(uri, shareMessage);
        if (!imageResult.error) return { error: null };
        return shareAppWhatsApp(shareMessage);
      });
      return;
    }

    await runWithCapture(platform, (uri, shareMessage) => shareAppShareCardImage(uri, shareMessage));
  };

  const openStore = async (platform: AppSharePlatform) => {
    const url = buildTrackedStoreUrl({ config, platform, channel: 'share', referrerId });
    if (!url) {
      Alert.alert('Henüz hazır değil', 'Bu mağaza linki admin tarafından henüz eklenmedi.');
      return;
    }
    await openUrl(url);
  };

  const handleSaveCard = async () => {
    await runWithCapture(preferredPlatform, async (uri) => {
      const result = await saveAppShareCardToGallery(uri);
      if (!result.error) {
        Alert.alert('Kaydedildi', 'Paylaşım kartı galeriye kaydedildi.');
      }
      return result;
    });
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader title="Uygulamayı Paylaş" showBack />

        <LinearGradient colors={[...HERO_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroIconWrap}>
            <Ionicons name="share-social" size={28} color="#FFFFFF" />
          </View>
          <Text variant="h2" style={styles.heroTitle}>
            {config.title}
          </Text>
          <Text variant="body" style={styles.heroSubtitle}>
            {config.subtitle}
          </Text>
          <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <Ionicons name="image-outline" size={14} color="#FFFFFF" />
              <Text variant="caption" style={styles.heroPillText}>
                Görsel kart paylaşımı
              </Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="pulse-outline" size={14} color="#FFFFFF" />
              <Text variant="caption" style={styles.heroPillText}>
                Canlı UTM takibi
              </Text>
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <GlassCard style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text secondary variant="caption">
              Mağaza linkleri yükleniyor…
            </Text>
          </GlassCard>
        ) : (
          <>
            <GlassCard style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text variant="label">Paylaşım kartı</Text>
                <Pressable
                  disabled={busy || (!hasIosLink && !hasAndroidLink)}
                  onPress={() => void handleSaveCard()}
                  style={({ pressed }) => [{ opacity: pressed ? 0.75 : busy ? 0.5 : 1 }]}
                >
                  <Text variant="caption" style={{ color: colors.primary }}>
                    Galeriye kaydet
                  </Text>
                </Pressable>
              </View>
              <Text secondary variant="caption">
                Paylaşımda bu görsel ve link birlikte gider.
              </Text>
              <View style={styles.cardPreviewWrap}>
                <AppShareCard
                  ref={cardRef}
                  title={config.title}
                  subtitle={config.subtitle}
                  message={config.share_message}
                  storeLabel={preferredPlatform === 'ios' ? 'App Store' : 'Google Play'}
                  storeUrl={previewStoreUrl}
                  platform={preferredPlatform}
                  referrerLabel={referrerLabel}
                />
              </View>
            </GlassCard>

            <View style={styles.storeGrid}>
              {storeActions.map((store) => (
                <GlassCard
                  key={store.platform}
                  style={[
                    styles.storeCard,
                    !store.available && styles.storeCardMuted,
                    { borderColor: store.available ? `${store.accent}55` : colors.border },
                  ]}
                >
                  <View style={styles.storeHeader}>
                    <View style={[styles.storeIcon, { backgroundColor: `${store.accent}22` }]}>
                      <Ionicons name={store.icon} size={22} color={store.available ? store.accent : colors.textMuted} />
                    </View>
                    <View style={styles.storeMeta}>
                      <Text variant="label">{store.label}</Text>
                      {store.badge ? (
                        <View style={[styles.soonBadge, { backgroundColor: `${colors.warning}22` }]}>
                          <Text variant="caption" style={{ color: colors.warning }}>
                            {store.badge}
                          </Text>
                        </View>
                      ) : (
                        <Text secondary variant="caption">
                          {store.available ? 'Hazır' : 'Admin ekleyince açılır'}
                        </Text>
                      )}
                    </View>
                  </View>

                  {store.available ? (
                    <View style={styles.actionRow}>
                      <Pressable
                        disabled={busy}
                        onPress={() => void openStore(store.platform)}
                        style={({ pressed }) => [
                          styles.primaryAction,
                          { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
                        ]}
                      >
                        <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                        <Text variant="caption" style={styles.primaryActionText}>
                          Mağazayı aç
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={busy}
                        onPress={() => void runShare(store.platform, 'copy')}
                        style={({ pressed }) => [
                          styles.secondaryAction,
                          {
                            backgroundColor:
                              copiedPlatform === store.platform ? `${colors.success}20` : `${colors.primary}12`,
                            opacity: pressed ? 0.88 : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name={copiedPlatform === store.platform ? 'checkmark' : 'copy-outline'}
                          size={16}
                          color={copiedPlatform === store.platform ? colors.success : colors.primary}
                        />
                        <Text
                          variant="caption"
                          style={{
                            color: copiedPlatform === store.platform ? colors.success : colors.primary,
                          }}
                        >
                          {copiedPlatform === store.platform ? 'Kopyalandı' : 'Link kopyala'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </GlassCard>
              ))}
            </View>

            <GlassCard style={styles.quickShare}>
              <Text variant="label">Hızlı paylaş</Text>
              <Text secondary variant="caption">
                {hasIosLink || hasAndroidLink
                  ? 'Kart görseli ve takip linki birlikte paylaşılır.'
                  : 'Mağaza linkleri eklendiğinde buradan paylaşabilirsiniz.'}
              </Text>
              <View style={styles.quickActions}>
                <Pressable
                  disabled={busy || (!hasIosLink && !hasAndroidLink)}
                  onPress={() =>
                    void runShare(
                      preferredPlatform === 'android' && !hasAndroidLink ? 'ios' : preferredPlatform,
                      'share',
                    )
                  }
                  style={({ pressed }) => [
                    styles.quickButton,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.88 : busy ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons name="image-outline" size={18} color="#FFFFFF" />
                  <Text variant="label" style={styles.quickButtonText}>
                    Kart paylaş
                  </Text>
                </Pressable>
                <Pressable
                  disabled={busy || (!hasIosLink && !hasAndroidLink)}
                  onPress={() =>
                    void runShare(
                      preferredPlatform === 'android' && !hasAndroidLink ? 'ios' : preferredPlatform,
                      'whatsapp',
                    )
                  }
                  style={({ pressed }) => [
                    styles.quickButton,
                    { backgroundColor: '#25D366', opacity: pressed ? 0.88 : busy ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                  <Text variant="label" style={styles.quickButtonText}>
                    WhatsApp
                  </Text>
                </Pressable>
              </View>
            </GlassCard>
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroTitle: {
    color: '#FFFFFF',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.92)',
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroPillText: {
    color: '#FFFFFF',
  },
  loadingCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  previewCard: {
    gap: spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPreviewWrap: {
    paddingVertical: spacing.sm,
  },
  storeGrid: {
    gap: spacing.sm,
  },
  storeCard: {
    gap: spacing.md,
    borderWidth: 1,
  },
  storeCardMuted: {
    opacity: 0.92,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  soonBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryAction: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  quickShare: {
    gap: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  quickButtonText: {
    color: '#FFFFFF',
  },
});
