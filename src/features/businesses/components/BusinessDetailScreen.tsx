import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import {
  BUSINESS_ACCENT,
  BUSINESS_GRADIENT,
  businessCategoryAccent,
  businessCategoryIcon,
} from '@/features/businesses/constants';
import {
  fetchBusinessCampaigns,
  fetchBusinessDetail,
  fetchBusinessEvents,
  fetchBusinessJobs,
  incrementBusinessViewCount,
} from '@/features/businesses/services/businessDetailData';
import {
  getCachedBusinessDetail,
  setCachedBusinessDetail,
} from '@/features/businesses/services/businessDetailCache';
import type {
  BusinessCampaignPreview,
  BusinessDetail,
  BusinessEventPreview,
  BusinessJobPreview,
} from '@/features/businesses/types';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import { BusinessShopPreviewSection } from '@/features/business-center/components/BusinessShopPreviewSection';
import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { openChat } from '@/features/messaging/services/messagingNavigation';
import { BusinessVerifiedTick } from '@/features/profile/components/BusinessVerifiedTick';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useTheme } from '@/providers/ThemeProvider';

type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
};

function formatMemberSince(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

function formatEventDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function HeroGlow({ accent }: { accent: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.heroGlow, glowStyle, { backgroundColor: `${accent}44` }]}
      pointerEvents="none"
    />
  );
}

function StatPill({
  icon,
  label,
  value,
  accent,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
  delay: number;
}) {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(420).springify().damping(18)}
      style={[styles.statPill, { backgroundColor: colors.surface, borderColor: `${accent}28` }]}
    >
      <View style={[styles.statIcon, { backgroundColor: `${accent}16` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <View style={styles.statText}>
        <Text variant="caption" muted>
          {label}
        </Text>
        <Text variant="label" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </Animated.View>
  );
}

function SectionBlock({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400).springify().damping(20)}>
      <GlassCard style={styles.section}>
        <Text variant="label">{title}</Text>
        {children}
      </GlassCard>
    </Animated.View>
  );
}

export function BusinessDetailScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { requireAuth } = useRequireAuth();
  const { id, demo, fromShop } = useLocalSearchParams<{ id: string; demo?: string; fromShop?: string }>();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [campaigns, setCampaigns] = useState<BusinessCampaignPreview[]>([]);
  const [events, setEvents] = useState<BusinessEventPreview[]>([]);
  const [jobs, setJobs] = useState<BusinessJobPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [viewerUrls, setViewerUrls] = useState<string[]>([]);

  const isDemo = demo === '1';

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const run = async (background: boolean) => {
      const cached = getCachedBusinessDetail(id);
      if (cached && !background) {
        setBusiness(cached);
        setLoading(false);
      } else if (!background && !cached) {
        setLoading(true);
      }
      setError(null);

      try {
        const detail = await fetchBusinessDetail(id);
        if (cancelled) return;
        if (!detail) {
          if (!cached) {
            setError('İşletme bulunamadı.');
            setBusiness(null);
          }
          return;
        }

        setCachedBusinessDetail(id, detail);
        setBusiness(detail);

        if (!detail.isDemo) {
          void incrementBusinessViewCount(detail.id);
          const [campaignRows, jobRows, eventRows] = await Promise.all([
            fetchBusinessCampaigns(detail.id),
            fetchBusinessJobs(detail.id),
            detail.ownerId ? fetchBusinessEvents(detail.ownerId) : Promise.resolve([]),
          ]);
          if (cancelled) return;
          setCampaigns(campaignRows);
          setJobs(jobRows);
          setEvents(eventRows);
        }
      } catch {
        if (!cancelled && !cached) setError('Detaylar yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setCampaigns([]);
    setEvents([]);
    setJobs([]);

    const cached = getCachedBusinessDetail(id);
    if (cached) {
      setBusiness(cached);
      setLoading(false);
      void run(true);
    } else {
      void run(false);
    }

    return () => {
      cancelled = true;
    };
  }, [id, isDemo]);

  const openMaps = () => {
    if (business?.latitude == null || business.longitude == null) return;
    void openUrl(
      `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`,
    );
  };

  const callPhone = () => {
    if (!business?.phone) return;
    void openUrl(`tel:${business.phone.replace(/\s/g, '')}`);
  };

  const openWebsite = () => {
    if (!business?.website) return;
    void openUrl(business.website);
  };

  const sendMessage = async () => {
    if (!(await requireAuth('Mesaj')) || !business?.ownerId) return;
    const { conversationId, error: msgError } = await getOrCreateDirectConversation(business.ownerId);
    if (msgError) {
      Alert.alert('Mesaj', msgError);
      return;
    }
    if (conversationId) openChat(conversationId);
  };

  const shareBusiness = async () => {
    if (!business) return;
    await Share.share({
      message: `${business.name} — Vora uygulamasında işletmeyi görüntüle.`,
    });
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={BUSINESS_ACCENT} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (error || !business) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.lg }]}>
          <ScreenBackButton style={styles.backBtn} />
          <GlassCard>
            <Text secondary>{error ?? 'İşletme mevcut değil.'}</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  const accent = businessCategoryAccent(business.category);
  const categoryIcon = businessCategoryIcon(business.category);
  const locationLine = [business.district, business.regionName].filter(Boolean).join(', ');
  const memberSince = formatMemberSince(business.createdAt);

  const quickActions: QuickAction[] = [
    {
      key: 'call',
      label: 'Ara',
      icon: 'call-outline',
      onPress: callPhone,
      disabled: !business.phone,
    },
    {
      key: 'map',
      label: 'Harita',
      icon: 'map-outline',
      onPress: openMaps,
      disabled: business.latitude == null || business.longitude == null,
    },
    {
      key: 'message',
      label: 'Mesaj',
      icon: 'chatbubble-outline',
      onPress: () => void sendMessage(),
      disabled: !business.ownerId || business.isDemo,
    },
    {
      key: 'web',
      label: 'Web',
      icon: 'globe-outline',
      onPress: openWebsite,
      disabled: !business.website,
    },
  ];

  let contentIndex = 0;
  const nextDelay = (base: number) => base + contentIndex++ * 60;

  return (
    <GradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        <Animated.View entering={FadeIn.duration(360)} style={styles.heroWrap}>
          <View style={[styles.coverWrap, { marginBottom: 48 + spacing.xs }]}>
            {business.coverUrl ? (
              <>
                <Pressable onPress={() => setViewerUrls([business.coverUrl!])}>
                  <Image
                    source={{ uri: business.coverUrl }}
                    style={[styles.heroCoverImage, { height: 220 + insets.top }]}
                    resizeMode="cover"
                  />
                </Pressable>
                <LinearGradient
                  colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.25)', `${colors.background}F2`]}
                  locations={[0, 0.5, 1]}
                  style={styles.coverFade}
                  pointerEvents="none"
                />
              </>
            ) : (
              <LinearGradient
                colors={
                  isDark
                    ? ([`${accent}70`, `${accent}30`, colors.background] as const)
                    : ([`${accent}90`, `${accent}45`, colors.surfaceElevated] as const)
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroCover, { height: 220 + insets.top, paddingTop: insets.top }]}
              >
                <HeroGlow accent={accent} />
                <View style={styles.heroPattern}>
                  <Ionicons name={categoryIcon} size={110} color={`${accent}28`} />
                </View>
              </LinearGradient>
            )}

            <View style={[styles.heroTopBar, { paddingTop: insets.top + spacing.xs }]}>
              <Pressable
                onPress={() => router.back()}
                style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}
              >
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
              <View style={styles.heroTopActions}>
                <Pressable
                  onPress={() => void shareBusiness()}
                  style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}
                >
                  <Ionicons name="share-outline" size={20} color={colors.text} />
                </Pressable>
                {!business.isDemo ? (
                  <Pressable
                    onPress={async () => {
                      if (await requireAuth('Şikayet')) setShowReport(true);
                    }}
                    style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}
                  >
                    <Ionicons name="flag-outline" size={20} color={colors.text} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <Animated.View
              entering={FadeInDown.delay(120).duration(480).springify().damping(16)}
              style={styles.avatarOverlay}
            >
              <LinearGradient colors={BUSINESS_GRADIENT} style={styles.logoGradientRing}>
                <Pressable
                  onPress={() => business.logoUrl && setViewerUrls([business.logoUrl])}
                  disabled={!business.logoUrl}
                  style={[styles.logoInner, { backgroundColor: colors.background }]}
                >
                  {business.logoUrl ? (
                    <Image source={{ uri: business.logoUrl }} style={styles.logo} />
                  ) : (
                    <View style={[styles.logoPlaceholder, { backgroundColor: colors.surface }]}>
                      <Ionicons name={categoryIcon} size={34} color={accent} />
                    </View>
                  )}
                </Pressable>
              </LinearGradient>
            </Animated.View>
          </View>

          <Animated.View
            entering={FadeInUp.delay(180).duration(440).springify().damping(18)}
            style={styles.heroBody}
          >
            <View style={styles.chips}>
              <View style={[styles.chip, { backgroundColor: `${accent}18` }]}>
                <Ionicons name={categoryIcon} size={11} color={accent} />
                <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
                  {business.categoryLabel}
                </Text>
              </View>
              {business.isVerified ? (
                <View style={[styles.chip, { backgroundColor: 'rgba(255,179,0,0.14)' }]}>
                  <BusinessVerifiedTick size={13} />
                  <Text variant="caption" style={{ color: '#FFB300', fontWeight: '700' }}>
                    Doğrulanmış
                  </Text>
                </View>
              ) : null}
              {business.isDemo ? (
                <View style={[styles.chip, { backgroundColor: `${colors.warning}18` }]}>
                  <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
                    Demo
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.nameRow}>
              <Text variant="h2" style={styles.businessName} numberOfLines={2}>
                {business.name}
              </Text>
              {business.isVerified ? <BusinessVerifiedTick size={22} /> : null}
            </View>

            {locationLine ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={accent} />
                <Text secondary variant="caption">
                  {locationLine}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </Animated.View>

        <View style={styles.statsRow}>
          <StatPill
            icon="eye-outline"
            label="Görüntülenme"
            value={business.viewCount.toLocaleString('tr-TR')}
            accent={accent}
            delay={220}
          />
          {memberSince ? (
            <StatPill icon="calendar-outline" label="Üyelik" value={memberSince} accent={accent} delay={280} />
          ) : null}
        </View>

        <Animated.View
          entering={FadeInUp.delay(240).duration(420).springify().damping(18)}
          style={styles.quickActionsWrap}
        >
          <LinearGradient
            colors={[`${accent}22`, `${accent}08`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.quickActionsBg, { borderColor: `${accent}24` }]}
          >
            <View style={styles.quickActions}>
              {quickActions.map((action, index) => (
                <Animated.View
                  key={action.key}
                  entering={FadeInUp.delay(260 + index * 50).duration(380).springify()}
                  style={styles.quickActionCell}
                >
                  <Pressable
                    onPress={action.onPress}
                    disabled={action.disabled}
                    style={({ pressed }) => [
                      styles.quickAction,
                      {
                        backgroundColor: colors.surface,
                        borderColor: `${accent}20`,
                        opacity: action.disabled ? 0.4 : pressed ? 0.9 : 1,
                        transform: [{ scale: pressed && !action.disabled ? 0.96 : 1 }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={action.disabled ? [`${colors.border}44`, `${colors.border}22`] : BUSINESS_GRADIENT}
                      style={styles.quickActionIcon}
                    >
                      <Ionicons
                        name={action.icon}
                        size={20}
                        color={action.disabled ? colors.textMuted : '#FFFFFF'}
                      />
                    </LinearGradient>
                    <Text variant="caption" style={{ fontWeight: '700' }}>
                      {action.label}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {!business.isDemo && fromShop !== '1' ? (
          <Animated.View entering={FadeInUp.delay(nextDelay(280)).duration(400).springify()}>
            <BusinessShopPreviewSection businessId={business.id} />
          </Animated.View>
        ) : null}

        {business.description ? (
          <SectionBlock title="Hakkında" delay={nextDelay(320)}>
            <Text secondary style={styles.bodyText}>
              {business.description}
            </Text>
          </SectionBlock>
        ) : null}

        {campaigns.length > 0 ? (
          <SectionBlock title="Kampanyalar" delay={nextDelay(320)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {campaigns.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInUp.delay(80 + index * 40).duration(360).springify()}
                >
                  <Pressable
                    style={[
                      styles.previewCard,
                      { borderColor: `${accent}28`, backgroundColor: colors.surfaceElevated },
                    ]}
                  >
                    <View style={[styles.previewAccent, { backgroundColor: accent }]} />
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.previewImage} />
                    ) : (
                      <View style={[styles.previewImagePlaceholder, { backgroundColor: `${accent}14` }]}>
                        <Ionicons name="megaphone-outline" size={24} color={accent} />
                      </View>
                    )}
                    <Text variant="label" numberOfLines={2} style={styles.previewTitle}>
                      {item.title}
                    </Text>
                    <Text secondary variant="caption" numberOfLines={2}>
                      {item.description}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>
          </SectionBlock>
        ) : null}

        {events.length > 0 ? (
          <SectionBlock title="Yaklaşan Etkinlikler" delay={nextDelay(320)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {events.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInUp.delay(80 + index * 40).duration(360).springify()}
                >
                  <Pressable
                    onPress={() => router.push(`/detail/events/${item.id}` as never)}
                    style={[
                      styles.previewCard,
                      { borderColor: `${accent}28`, backgroundColor: colors.surfaceElevated },
                    ]}
                  >
                    <View style={[styles.previewAccent, { backgroundColor: accent }]} />
                    {item.coverUrl ? (
                      <Image source={{ uri: item.coverUrl }} style={styles.previewImage} />
                    ) : (
                      <View style={[styles.previewImagePlaceholder, { backgroundColor: `${accent}14` }]}>
                        <Ionicons name="calendar-outline" size={24} color={accent} />
                      </View>
                    )}
                    <Text variant="label" numberOfLines={2} style={styles.previewTitle}>
                      {item.title}
                    </Text>
                    <Text secondary variant="caption">
                      {formatEventDate(item.startsAt)}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>
          </SectionBlock>
        ) : null}

        {jobs.length > 0 ? (
          <SectionBlock title="Açık İlanlar" delay={nextDelay(320)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {jobs.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInUp.delay(80 + index * 40).duration(360).springify()}
                >
                  <Pressable
                    onPress={() => router.push(`/detail/jobs/${item.id}` as never)}
                    style={[
                      styles.previewCard,
                      { borderColor: `${accent}28`, backgroundColor: colors.surfaceElevated },
                    ]}
                  >
                    <View style={[styles.previewAccent, { backgroundColor: accent }]} />
                    <View style={[styles.previewImagePlaceholder, { backgroundColor: `${accent}14` }]}>
                      <Ionicons name="briefcase-outline" size={24} color={accent} />
                    </View>
                    <Text variant="label" numberOfLines={2} style={styles.previewTitle}>
                      {item.title}
                    </Text>
                    {item.salaryRange ? (
                      <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
                        {item.salaryRange}
                      </Text>
                    ) : null}
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>
          </SectionBlock>
        ) : null}
      </ScrollView>

      {id && !business.isDemo ? (
        <ReportSheet visible={showReport} targetType="business" targetId={id} onClose={() => setShowReport(false)} />
      ) : null}

      <FullScreenMediaViewer
        urls={viewerUrls}
        visible={viewerUrls.length > 0}
        onClose={() => setViewerUrls([])}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    marginBottom: spacing.md,
  },
  heroWrap: {
    marginBottom: spacing.xs,
  },
  coverWrap: {
    position: 'relative',
    marginBottom: 48,
  },
  heroCover: {
    height: 210,
    overflow: 'hidden',
  },
  heroCoverImage: {
    width: '100%',
    height: 210,
  },
  coverFade: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGlow: {
    position: 'absolute',
    top: 24,
    right: 32,
    width: 140,
    height: 140,
    borderRadius: radius.full,
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  heroTopActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPattern: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: spacing.lg,
    opacity: 0.9,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: -48,
    left: spacing.lg,
  },
  logoGradientRing: {
    borderRadius: radius.xl + 4,
    padding: 3,
  },
  logoInner: {
    borderRadius: radius.xl,
    padding: 2,
  },
  heroBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  logo: {
    width: 92,
    height: 92,
    borderRadius: radius.lg,
  },
  logoPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  businessName: {
    flex: 1,
    letterSpacing: -0.6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    flex: 1,
    gap: 2,
  },
  quickActionsWrap: {
    paddingHorizontal: spacing.lg,
  },
  quickActionsBg: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickActionCell: {
    flex: 1,
  },
  quickAction: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },
  bodyText: {
    lineHeight: 24,
  },
  hScroll: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  previewCard: {
    width: 172,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  previewAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  previewImage: {
    width: '100%',
    height: 88,
    borderRadius: radius.md,
  },
  previewImagePlaceholder: {
    width: '100%',
    height: 88,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    marginTop: spacing.xs,
  },
});
