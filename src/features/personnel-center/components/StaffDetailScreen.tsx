import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import { openChat } from '@/features/messaging/services/messagingNavigation';
import { sharePersonnelListingInChat } from '@/features/personnel-center/services/personnelShareData';
import {
  PERSONNEL_ACCENT,
  PERSONNEL_GRADIENT,
  jobTypeLabel,
  staffEditPath,
} from '@/features/personnel-center/constants';
import { ListingApplicationStatsRow } from '@/features/personnel-center/components/ListingApplicationStatsRow';
import { ListingOwnerStatsCard } from '@/features/personnel-center/components/ListingOwnerStatsCard';
import { PersonnelApplySheet } from '@/features/personnel-center/components/PersonnelApplySheet';
import { usePersonnelApply } from '@/features/personnel-center/hooks/usePersonnelApply';
import {
  EMPTY_LISTING_APPLICATION_STATS,
  fetchListingApplicationStats,
} from '@/features/personnel-center/services/listingApplicationStats';
import {
  fetchStaffListingDetail,
  fillStaffRequest,
  removeStaffRequest,
} from '@/features/personnel-center/services/listingData';
import { PersonnelMotivationBanner } from '@/features/personnel-center/components/PersonnelMotivationBanner';
import {
  fetchPersonnelCenterStats,
  type PersonnelCenterStats,
} from '@/features/personnel-center/services/personnelStats';
import type { ListingApplicationStats, StaffListingDetail } from '@/features/personnel-center/types';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { PERSONNEL_FEATURE } from '@/features/personnel-center/featureFlags';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function InfoTile({
  icon,
  label,
  value,
  accent,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const content = (
    <View style={[styles.infoTile, { backgroundColor: `${accent}10`, borderColor: `${accent}22` }]}>
      <View style={[styles.infoIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={styles.infoText}>
        <Text variant="caption" muted>
          {label}
        </Text>
        <Text variant="body" numberOfLines={3}>
          {value}
        </Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
      {content}
    </Pressable>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function StaffDetailScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showDetailShare = useFeatureVisible(PERSONNEL_FEATURE.detailShare);
  const showDetailReport = useFeatureVisible(PERSONNEL_FEATURE.detailReport);
  const showDetailApply = useFeatureVisible(PERSONNEL_FEATURE.detailApply);
  const showDetailMessage = useFeatureVisible(PERSONNEL_FEATURE.detailMessage);
  const showDetailEdit = useFeatureVisible(PERSONNEL_FEATURE.detailEdit);
  const showDetailRemove = useFeatureVisible(PERSONNEL_FEATURE.detailRemove);
  const showDetailFill = useFeatureVisible(PERSONNEL_FEATURE.detailFill);

  const [listing, setListing] = useState<StaffListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [filling, setFilling] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const { applyTarget, openApplySheet, closeApplySheet, submitApplication } = usePersonnelApply(user?.id, {
    onSubmitted: () => {
      if (id) fetchListingApplicationStats('staff', id).then(setApplicationStats);
    },
  });
  const [centerStats, setCenterStats] = useState<PersonnelCenterStats | null>(null);
  const [applicationStats, setApplicationStats] = useState<ListingApplicationStats>(
    EMPTY_LISTING_APPLICATION_STATS,
  );

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const data = await fetchStaffListingDetail(id);
    if (!data || data.status === 'removed') {
      setError('Talep bulunamadı veya yayından kaldırıldı.');
      setListing(null);
    } else {
      setListing(data);
      fetchPersonnelCenterStats(data.regionId).then(setCenterStats);
      fetchListingApplicationStats('staff', data.id).then(setApplicationStats);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = user?.id === listing?.authorId;
  const isFilled = listing?.status === 'filled';
  const locationLabel = listing?.locationLabel ?? listing?.district ?? '—';
  const salaryLabel = listing?.salaryRange?.trim() || 'Görüşülecek';
  const positionsLabel = listing?.positions.length
    ? listing.positions.join(', ')
    : 'Belirtilmedi';

  const handleShare = async () => {
    if (!listing) return;
    await Share.share({
      message: `${listing.title}\n${listing.positionsCount ?? 1} kişi · ${jobTypeLabel(listing.jobType)}\n\nVora uygulamasında personel talebini görüntüle.`,
      title: listing.title,
    });
  };

  const handleApply = async () => {
    if (!(await requireAuth('Başvuru')) || !id || !listing || isFilled) return;
    openApplySheet('staff', id, listing.title);
  };

  const handleMessage = async () => {
    if (!(await requireAuth('Mesaj')) || !listing?.authorId || !user) return;
    const result = await sharePersonnelListingInChat(
      'staff',
      listing.id,
      listing.authorId,
      user.id,
      'Merhaba, personel talebiniz hakkında bilgi almak istiyorum.',
    );
    if (result.error) {
      Alert.alert('Mesaj', result.error);
      return;
    }
    if (result.conversationId) openChat(result.conversationId);
  };

  const handleEdit = () => {
    if (!listing) return;
    router.push(staffEditPath(listing.id) as never);
  };

  const handleFill = () => {
    if (!listing || !user?.id) return;
    Alert.alert('Personel Bulundu', 'Talep kapatılacak ve başvuranlar bilgilendirilecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kapat',
        onPress: async () => {
          setFilling(true);
          const result = await fillStaffRequest(listing.id);
          setFilling(false);
          if (result.error) Alert.alert('Hata', result.error);
          else void load();
        },
      },
    ]);
  };

  const handleRemove = () => {
    if (!listing || !user?.id) return;
    Alert.alert('Talebi Kaldır', 'Personel talebi yayından kaldırılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setRemoving(true);
          const result = await removeStaffRequest(listing.id, user.id);
          setRemoving(false);
          if (result.error) Alert.alert('Hata', result.error);
          else {
            Alert.alert('Kaldırıldı', 'Talep yayından kaldırıldı.', [
              { text: 'Tamam', onPress: () => router.back() },
            ]);
          }
        },
      },
    ]);
  };

  const openMaps = () => {
    if (!listing?.latitude || !listing?.longitude) return;
    openUrl(
      `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`,
    );
  };

  const callPhone = () => {
    if (!listing?.businessPhone) return;
    openUrl(`tel:${listing.businessPhone.replace(/\s/g, '')}`);
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={PERSONNEL_ACCENT} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (error || !listing) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.lg }]}>
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: `${colors.surface}E6` }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <GlassCard>
            <Text secondary>{error ?? 'Talep mevcut değil.'}</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (isOwner ? 100 : 90) }}
      >
        <View style={[styles.heroWrap, { marginTop: insets.top }]}>
          <LinearGradient
            colors={
              isDark
                ? ([`${PERSONNEL_ACCENT}66`, `${PERSONNEL_ACCENT}33`, colors.background] as const)
                : ([`${PERSONNEL_ACCENT}88`, `${PERSONNEL_ACCENT}44`, colors.surfaceElevated] as const)
            }
            style={styles.heroPlaceholder}
          >
            <Ionicons name="people" size={72} color={`${PERSONNEL_ACCENT}55`} />
          </LinearGradient>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)', `${colors.background}F0`]}
            locations={[0, 0.5, 1]}
            style={styles.coverFade}
            pointerEvents="none"
          />

          <View style={styles.heroTopBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.heroTopActions}>
              {showDetailShare ? (
              <Pressable onPress={() => void handleShare()} style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}>
                <Ionicons name="share-outline" size={20} color={colors.text} />
              </Pressable>
              ) : null}
              {!isOwner && showDetailReport ? (
                <Pressable
                  onPress={async () => {
                    if (await requireAuth('Şikayet')) setShowReport(true);
                  }}
                  style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}
                >
                  <Ionicons name="flag-outline" size={20} color={colors.textMuted} />
                </Pressable>
              ) : isOwner && showDetailRemove ? (
                <Pressable onPress={handleRemove} disabled={removing} style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroBadges}>
              {listing.isUrgent ? (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Ionicons name="flash" size={11} color="#fff" />
                  <Text variant="caption" style={styles.badgeText}>
                    Acil
                  </Text>
                </View>
              ) : null}
              <View style={[styles.badge, { backgroundColor: `${PERSONNEL_ACCENT}DD` }]}>
                <Text variant="caption" style={styles.badgeText}>
                  {listing.positionsCount ?? 1} kişi
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                <Text variant="caption" style={styles.badgeText}>
                  {jobTypeLabel(listing.jobType)}
                </Text>
              </View>
            </View>
            <Text variant="h2" style={styles.heroTitle}>
              {listing.title}
            </Text>
            {listing.businessName ? (
              <Text secondary variant="caption">
                {listing.businessName}
              </Text>
            ) : null}
            <Text variant="h3" style={{ color: PERSONNEL_ACCENT, fontWeight: '800' }}>
              {salaryLabel}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.statCell, { backgroundColor: `${colors.surface}AA`, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={14} color={PERSONNEL_ACCENT} />
            <Text variant="caption" style={{ fontWeight: '700' }}>
              {formatDate(listing.createdAt)}
            </Text>
            <Text secondary variant="caption">
              yayın tarihi
            </Text>
          </View>

          {centerStats && !isOwner ? <PersonnelMotivationBanner stats={centerStats} compact /> : null}

          {!isOwner ? (
            <GlassCard style={styles.section}>
              <Text variant="label">Başvuru durumu</Text>
              <ListingApplicationStatsRow stats={applicationStats} />
            </GlassCard>
          ) : null}

          {listing.positions.length > 0 ? (
            <View style={styles.positionsWrap}>
              {listing.positions.map((pos) => (
                <View key={pos} style={[styles.positionChip, { backgroundColor: `${PERSONNEL_ACCENT}14`, borderColor: `${PERSONNEL_ACCENT}33` }]}>
                  <Text variant="caption" style={{ color: PERSONNEL_ACCENT, fontWeight: '700' }}>
                    {pos}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <GlassCard style={styles.section}>
            <Text variant="label">Talep detayı</Text>
            <Text secondary style={styles.body}>
              {listing.description}
            </Text>
          </GlassCard>

          <View style={styles.tiles}>
            <InfoTile icon="briefcase-outline" label="Pozisyonlar" value={positionsLabel} accent={PERSONNEL_ACCENT} />
            <InfoTile icon="people-outline" label="Kişi sayısı" value={String(listing.positionsCount ?? 1)} accent={PERSONNEL_ACCENT} />
            <InfoTile icon="location-outline" label="Konum" value={locationLabel} accent={PERSONNEL_ACCENT} />
            {listing.housingProvided ? (
              <InfoTile icon="bed-outline" label="Konaklama" value="Sağlanır" accent={colors.success} />
            ) : null}
            {listing.mealProvided ? (
              <InfoTile icon="restaurant-outline" label="Yemek" value="Sağlanır" accent={colors.success} />
            ) : null}
            {listing.businessPhone ? (
              <InfoTile
                icon="call-outline"
                label="İşletme telefonu"
                value={listing.businessPhone}
                accent={colors.success}
                onPress={callPhone}
              />
            ) : null}
            {listing.businessAddress ? (
              <InfoTile icon="business-outline" label="Adres" value={listing.businessAddress} accent={PERSONNEL_ACCENT} />
            ) : null}
          </View>

          {listing.latitude != null && listing.longitude != null ? (
            <Pressable
              onPress={openMaps}
              style={({ pressed }) => [
                styles.mapBtn,
                { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="navigate-outline" size={18} color={PERSONNEL_ACCENT} />
              <Text variant="caption" style={{ fontWeight: '600' }}>
                Haritada Gör
              </Text>
            </Pressable>
          ) : null}

          {isFilled ? (
            <GlassCard style={[styles.filledBanner, { borderColor: `${colors.success}44`, backgroundColor: `${colors.success}10` }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
                Personel bulundu — yeni başvuru kabul edilmiyor.
              </Text>
            </GlassCard>
          ) : null}

          {isOwner ? (
            <>
              <ListingOwnerStatsCard listingType="staff" listingId={listing.id} />
            <GlassCard style={[styles.ownerCard, { borderColor: `${PERSONNEL_ACCENT}33` }]}>
              <View style={styles.ownerHeader}>
                <Ionicons name="person-circle" size={20} color={PERSONNEL_ACCENT} />
                <Text variant="label">Talebiniz</Text>
              </View>
              <View style={styles.ownerActions}>
                {showDetailEdit ? (
                <Pressable
                  onPress={handleEdit}
                  style={({ pressed }) => [
                    styles.ownerBtn,
                    { backgroundColor: `${PERSONNEL_ACCENT}14`, borderColor: PERSONNEL_ACCENT, opacity: pressed ? 0.88 : 1 },
                  ]}
                >
                  <Ionicons name="create-outline" size={18} color={PERSONNEL_ACCENT} />
                  <Text variant="caption" style={{ fontWeight: '700', color: PERSONNEL_ACCENT }}>
                    Düzenle
                  </Text>
                </Pressable>
                ) : null}
                {!isFilled && showDetailFill ? (
                  <Pressable
                    onPress={handleFill}
                    disabled={filling}
                    style={({ pressed }) => [
                      styles.ownerBtn,
                      { backgroundColor: `${colors.success}10`, borderColor: colors.success, opacity: filling || pressed ? 0.88 : 1 },
                    ]}
                  >
                    <Ionicons name="checkmark-done-outline" size={18} color={colors.success} />
                    <Text variant="caption" style={{ fontWeight: '700', color: colors.success }}>
                      Bulundu
                    </Text>
                  </Pressable>
                ) : null}
                {showDetailRemove ? (
                <Pressable
                  onPress={handleRemove}
                  disabled={removing}
                  style={({ pressed }) => [
                    styles.ownerBtn,
                    { backgroundColor: `${colors.danger}10`, borderColor: colors.danger, opacity: removing || pressed ? 0.88 : 1 },
                  ]}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text variant="caption" style={{ fontWeight: '700', color: colors.danger }}>
                    Kaldır
                  </Text>
                </Pressable>
                ) : null}
              </View>
            </GlassCard>
            </>
          ) : null}
        </View>
      </ScrollView>

      {!isOwner && !isFilled && (showDetailMessage || showDetailApply) ? (
        <View
          style={[
            styles.stickyBar,
            {
              paddingBottom: insets.bottom + spacing.sm,
              borderTopColor: colors.border,
              backgroundColor: `${colors.surface}F2`,
            },
          ]}
        >
          {showDetailMessage ? (
          <Pressable
            onPress={handleMessage}
            style={({ pressed }) => [
              styles.stickySecondary,
              { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
            <Text variant="caption" style={{ fontWeight: '700' }}>
              Mesaj
            </Text>
          </Pressable>
          ) : null}
          {showDetailApply ? (
          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [{ flex: 1, borderRadius: radius.full, overflow: 'hidden', opacity: pressed ? 0.88 : 1 }]}
          >
            <LinearGradient
              colors={[PERSONNEL_GRADIENT[0], PERSONNEL_GRADIENT[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.stickyCta}
            >
              <>
                <Ionicons name="paper-plane" size={20} color="#fff" />
                <Text variant="label" style={{ color: '#fff' }}>
                  Başvur
                </Text>
              </>
            </LinearGradient>
          </Pressable>
          ) : null}
        </View>
      ) : isOwner && showDetailEdit ? (
        <View
          style={[
            styles.stickyBar,
            {
              paddingBottom: insets.bottom + spacing.sm,
              borderTopColor: colors.border,
              backgroundColor: `${colors.surface}F2`,
            },
          ]}
        >
          <Pressable
            onPress={handleEdit}
            style={({ pressed }) => [{ flex: 1, borderRadius: radius.full, overflow: 'hidden', opacity: pressed ? 0.88 : 1 }]}
          >
            <LinearGradient
              colors={[PERSONNEL_GRADIENT[0], PERSONNEL_GRADIENT[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.stickyCta}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text variant="label" style={{ color: '#fff' }}>
                Talebi Düzenle
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : null}

      {showDetailReport && id ? (
        <ReportSheet visible={showReport} targetType="staff_request" targetId={id} onClose={() => setShowReport(false)} />
      ) : null}

      <PersonnelApplySheet
        visible={applyTarget?.listingId === id}
        listingTitle={listing.title}
        userId={user?.id ?? null}
        onClose={closeApplySheet}
        onSubmit={submitApplication}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { padding: spacing.lg, gap: spacing.md },
  heroWrap: { position: 'relative', minHeight: 280 },
  heroPlaceholder: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFade: { ...StyleSheet.absoluteFillObject },
  heroTopBar: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTopActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
    gap: spacing.xs,
  },
  heroBadges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  heroTitle: { fontWeight: '800', color: '#fff' },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.md },
  statCell: {
    alignItems: 'center',
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  positionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  positionChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  section: { gap: spacing.sm },
  body: { lineHeight: 22 },
  tiles: { gap: spacing.sm },
  infoTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, gap: 2 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  ownerCard: { gap: spacing.sm, borderWidth: 1 },
  filledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  ownerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ownerActions: { flexDirection: 'row', gap: spacing.sm },
  ownerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stickySecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    minWidth: 100,
  },
  stickyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
});
