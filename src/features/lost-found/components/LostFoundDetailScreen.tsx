import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { FeedMediaPreview } from '@/components/media/FeedMediaPreview';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { LOST_FEATURE } from '@/features/lost-found/featureFlags';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import { LostTipSheet } from '@/features/lost-found/components/LostTipSheet';
import {
  LOST_CENTER_DEF,
  formatLostDate,
  formatLostTimeAgo,
  lostAccentColor,
  lostCategoryIcon,
  lostCategoryLabel,
  lostEditPath,
} from '@/features/lost-found/constants';
import {
  deleteLostItem,
  fetchLostItemTips,
  resolveLostItem,
  submitLostItemTip,
} from '@/features/lost-found/services/lostItemData';
import { lostGoBack } from '@/features/lost-found/services/lostNavigation';
import { fetchMapDetail, type MapDetailRecord } from '@/features/map/services/detailData';
import { getCachedMapDetail, setCachedMapDetail } from '@/features/map/services/mapDetailCache';
import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { openChat } from '@/features/messaging/services/messagingNavigation';
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

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassCard style={styles.section}>
      <Text variant="label">{title}</Text>
      {children}
    </GlassCard>
  );
}

export function LostFoundDetailScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { id, demo } = useLocalSearchParams<{ id: string; demo?: string }>();
  const showDetailMessage = useFeatureVisible(LOST_FEATURE.detailMessage);
  const showDetailCall = useFeatureVisible(LOST_FEATURE.detailCall);
  const showDetailTip = useFeatureVisible(LOST_FEATURE.detailTip);
  const showDetailResolve = useFeatureVisible(LOST_FEATURE.detailResolve);
  const showDetailReactivate = useFeatureVisible(LOST_FEATURE.detailReactivate);
  const showDetailDelete = useFeatureVisible(LOST_FEATURE.detailDelete);
  const showDetailShare = useFeatureVisible(LOST_FEATURE.detailShare);

  const [record, setRecord] = useState<MapDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showTipSheet, setShowTipSheet] = useState(false);
  const [tipLoading, setTipLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tips, setTips] = useState<LostItemTip[]>([]);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  const meta = record?.lostMeta;
  const accent = lostAccentColor(meta?.category);
  const typeColor = meta?.itemType === 'found' ? colors.success : colors.danger;
  const isResolved = meta?.status === 'resolved';
  const categoryIcon = lostCategoryIcon(meta?.category ?? 'other') as keyof typeof Ionicons.glyphMap;

  const contactField = useMemo(
    () => record?.fields.find((f) => f.label === 'İletişim' && f.value !== '—'),
    [record],
  );

  useEffect(() => {
    if (!id || demo === '1') return;

    let cancelled = false;

    const run = async (background: boolean) => {
      const cached = getCachedMapDetail('lost_found', id);
      if (cached && !background) {
        setRecord(cached);
        setLoading(false);
      } else if (!background && !cached) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await fetchMapDetail('lost_found', id);
        if (cancelled) return;
        if (!data) {
          if (!cached) {
            setError('İlan bulunamadı.');
            setRecord(null);
          }
          return;
        }
        setCachedMapDetail('lost_found', id, data);
        setRecord(data);
      } catch {
        if (!cancelled && !cached) setError('Detaylar yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const cached = getCachedMapDetail('lost_found', id);
    if (cached) {
      setRecord(cached);
      setLoading(false);
      void run(true);
    } else {
      void run(false);
    }

    return () => {
      cancelled = true;
    };
  }, [id, demo]);

  useEffect(() => {
    if (!id || !user?.id || !record?.ownerId || user.id !== record.ownerId) {
      setTips([]);
      return;
    }
    fetchLostItemTips(id, user.id).then(setTips);
  }, [id, user?.id, record?.ownerId]);

  const openMaps = () => {
    if (!record?.latitude || !record?.longitude) return;
    void openUrl(
      `https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`,
    );
  };

  const callContact = () => {
    const value = contactField?.value ?? meta?.contactInfo;
    if (!value) return;
    const phone = value.replace(/\s/g, '');
    if (/^\+?[\d()-]+$/.test(phone)) {
      void openUrl(`tel:${phone}`);
    }
  };

  const sendMessage = async () => {
    if (!(await requireAuth('Mesaj')) || !record?.ownerId) return;
    const { conversationId, error: msgError } = await getOrCreateDirectConversation(record.ownerId);
    if (msgError) {
      Alert.alert('Mesaj', msgError);
      return;
    }
    if (conversationId) openChat(conversationId);
  };

  const shareListing = async () => {
    if (!record) return;
    await Share.share({ message: `${record.title}\n\nVora uygulamasında ilanı görüntüle.` });
  };

  const handleResolve = async () => {
    if (!(await requireAuth('Çözüldü')) || !id || !user || !record?.ownerId) return;
    if (user.id !== record.ownerId) return;

    Alert.alert('Çözüldü işaretle', 'Bu ilanı çözüldü olarak kapatmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çözüldü',
        onPress: async () => {
          setResolving(true);
          const result = await resolveLostItem(id, user.id);
          setResolving(false);
          if (result.error) Alert.alert('Hata', result.error);
          else {
            Alert.alert('Güncellendi', 'İlan çözüldü olarak işaretlendi.');
            fetchMapDetail('lost_found', id).then(setRecord);
          }
        },
      },
    ]);
  };

  const handleSubmitTip = async (message: string, contact: string) => {
    if (!(await requireAuth('İpucu')) || !id || !user) return;
    setTipLoading(true);
    const result = await submitLostItemTip(id, user.id, message, contact || null);
    setTipLoading(false);
    setShowTipSheet(false);
    if (result.error) Alert.alert('Hata', result.error);
    else Alert.alert('Teşekkürler', 'İpucunuz ilan sahibine iletildi.');
  };

  const handleEdit = () => {
    if (!id) return;
    router.push(lostEditPath(id) as never);
  };

  const handleDelete = () => {
    if (!id || !user?.id) return;

    Alert.alert('İlanı Sil', 'Bu ilan kalıcı olarak kaldırılacak. Devam etmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const result = await deleteLostItem(id, user.id);
          setDeleting(false);
          if (result.error) {
            Alert.alert('Hata', result.error);
            return;
          }
          Alert.alert('Silindi', 'İlan kaldırıldı.', [
            { text: 'Tamam', onPress: () => lostGoBack() },
          ]);
        },
      },
    ]);
  };

  const isOwner = user?.id === record?.ownerId;
  const viewCount = meta?.viewCount ?? 0;
  const heroUrl = record?.mediaUrls?.[0] ?? null;
  const mediaCount = record?.mediaUrls?.length ?? 0;
  const locationValue = record?.fields.find((f) => f.label === 'Konum' && f.value !== '—')?.value;

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={LOST_CENTER_DEF.accent} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (error || !record) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.lg }]}>
          <Pressable onPress={lostGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <GlassCard>
            <Text secondary>{error ?? 'İlan mevcut değil.'}</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={[styles.heroWrap, { marginTop: insets.top }]}>
          <View style={styles.coverWrap}>
            {heroUrl ? (
              <Pressable onPress={async () => { setMediaViewerIndex(0); setMediaViewerOpen(true); }}>
                <Image source={{ uri: heroUrl }} style={styles.heroImage} resizeMode="cover" />
              </Pressable>
            ) : (
              <LinearGradient
                colors={
                  isDark
                    ? ([`${accent}66`, `${accent}33`, colors.background] as const)
                    : ([`${accent}88`, `${accent}44`, colors.surfaceElevated] as const)
                }
                style={styles.heroPlaceholder}
              >
                <Ionicons name={categoryIcon} size={80} color={`${accent}55`} />
              </LinearGradient>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.35)', `${colors.background}F0`]}
              locations={[0, 0.5, 1]}
              style={styles.coverFade}
              pointerEvents="none"
            />

            <View style={styles.heroTopBar}>
              <Pressable
                onPress={lostGoBack}
                style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}
              >
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
              <View style={styles.heroTopActions}>
                <Pressable
                  onPress={() => void shareListing()}
                  style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}
                >
                  <Ionicons name="share-outline" size={20} color={colors.text} />
                </Pressable>
                {!record.isDemo ? (
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

            {meta?.isUrgent && !isResolved ? (
              <View style={[styles.urgentBanner, { backgroundColor: colors.danger }]}>
                <Ionicons name="flash" size={14} color="#fff" />
                <Text variant="caption" style={styles.urgentText}>
                  ACİL İLAN
                </Text>
              </View>
            ) : null}
            {mediaCount > 1 ? (
              <View style={[styles.mediaCountBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                <Ionicons name="images" size={12} color="#fff" />
                <Text variant="caption" style={styles.mediaCountText}>
                  {mediaCount}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.heroBody}>
            <View style={styles.chips}>
              <View style={[styles.chip, { backgroundColor: `${typeColor}18` }]}>
                <Ionicons
                  name={meta?.itemType === 'found' ? 'checkmark-circle' : 'help-circle'}
                  size={12}
                  color={typeColor}
                />
                <Text variant="caption" style={{ color: typeColor, fontWeight: '700' }}>
                  {meta?.itemType === 'found' ? 'Buluntu' : 'Kayıp'}
                </Text>
              </View>
              <View style={[styles.chip, { backgroundColor: `${accent}18` }]}>
                <Ionicons name={categoryIcon} size={12} color={accent} />
                <Text variant="caption" style={{ color: accent, fontWeight: '600' }}>
                  {lostCategoryLabel(meta?.category ?? 'other')}
                </Text>
              </View>
              {isResolved ? (
                <View style={[styles.chip, { backgroundColor: `${colors.success}18` }]}>
                  <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
                    Çözüldü
                  </Text>
                </View>
              ) : null}
            </View>

            <Text variant="h2" style={styles.title}>
              {record.title}
            </Text>

            {record.createdAt ? (
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={14} color={accent} />
                <Text variant="caption" style={{ color: accent, fontWeight: '600' }}>
                  {formatLostTimeAgo(record.createdAt)}
                </Text>
                <Text secondary variant="caption">
                  · {formatLostDate(record.createdAt)}
                </Text>
              </View>
            ) : null}

            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Ionicons name="eye-outline" size={14} color={colors.textMuted} />
                <Text secondary variant="caption">
                  {viewCount.toLocaleString('tr-TR')} görüntülenme
                </Text>
              </View>
            </View>

            {meta?.rewardAmount ? (
              <View style={[styles.rewardBanner, { backgroundColor: `${colors.warning}16`, borderColor: `${colors.warning}44` }]}>
                <Ionicons name="gift" size={18} color={colors.warning} />
                <View>
                  <Text variant="caption" muted>
                    Ödül
                  </Text>
                  <Text variant="label" style={{ color: colors.warning }}>
                    {meta.rewardAmount}
                  </Text>
                </View>
              </View>
            ) : null}

            {isResolved ? (
              <View style={[styles.resolvedBanner, { backgroundColor: `${colors.success}14`, borderColor: `${colors.success}44` }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
                  Bu ilan çözüldü olarak işaretlendi
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          {isOwner && !record.isDemo ? (
            <GlassCard style={[styles.ownerCard, { borderColor: `${LOST_CENTER_DEF.accent}33` }]}>
              <View style={styles.ownerHeader}>
                <Ionicons name="person-circle" size={20} color={LOST_CENTER_DEF.accent} />
                <Text variant="label">İlanınız</Text>
              </View>
              <View style={styles.ownerActions}>
                <Pressable
                  onPress={handleEdit}
                  style={({ pressed }) => [
                    styles.ownerBtn,
                    { backgroundColor: `${accent}14`, borderColor: accent, opacity: pressed ? 0.88 : 1 },
                  ]}
                >
                  <Ionicons name="create-outline" size={18} color={accent} />
                  <Text variant="caption" style={{ fontWeight: '700', color: accent }}>
                    Düzenle
                  </Text>
                </Pressable>
                {!isResolved && showDetailResolve ? (
                  <Pressable
                    onPress={handleResolve}
                    disabled={resolving}
                    style={({ pressed }) => [
                      styles.ownerBtn,
                      {
                        backgroundColor: `${colors.success}12`,
                        borderColor: colors.success,
                        opacity: resolving || pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    {resolving ? (
                      <ActivityIndicator color={colors.success} size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                        <Text variant="caption" style={{ fontWeight: '700', color: colors.success }}>
                          Çözüldü
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : null}
                {showDetailDelete ? (
                <Pressable
                  onPress={handleDelete}
                  disabled={deleting}
                  style={({ pressed }) => [
                    styles.ownerBtn,
                    {
                      backgroundColor: `${colors.danger}10`,
                      borderColor: colors.danger,
                      opacity: deleting || pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  {deleting ? (
                    <ActivityIndicator color={colors.danger} size="small" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      <Text variant="caption" style={{ fontWeight: '700', color: colors.danger }}>
                        Sil
                      </Text>
                    </>
                  )}
                </Pressable>
                ) : null}
              </View>
            </GlassCard>
          ) : null}

          {record.description ? (
            <SectionBlock title="Açıklama">
              <Text secondary style={styles.bodyText}>
                {record.description}
              </Text>
            </SectionBlock>
          ) : null}

          {record.mediaUrls && record.mediaUrls.length > 0 ? (
            <SectionBlock title="Fotoğraflar">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                {record.mediaUrls.map((url, index) => (
                  <FeedMediaPreview
                    key={`${url}-${index}`}
                    url={url}
                    style={styles.mediaImage}
                    onPress={async () => {
                      setMediaViewerIndex(index);
                      setMediaViewerOpen(true);
                    }}
                  />
                ))}
              </ScrollView>
            </SectionBlock>
          ) : null}

          <View style={styles.infoGrid}>
            {contactField ? (
              <InfoTile
                icon="call-outline"
                label="İletişim"
                value={contactField.value}
                accent={accent}
                onPress={callContact}
              />
            ) : null}
            {record.subtitle ? (
              <InfoTile icon="pricetag-outline" label="Tür" value={record.subtitle} accent={accent} />
            ) : null}
            {locationValue ? (
              <InfoTile
                icon="location-outline"
                label="Konum"
                value={locationValue}
                accent={accent}
                onPress={record.latitude != null ? openMaps : undefined}
              />
            ) : null}
          </View>

          {isOwner && tips.length > 0 ? (
            <SectionBlock title={`İpuçları (${tips.length})`}>
              <View style={styles.tipsList}>
                {tips.map((tip) => (
                  <View key={tip.id} style={[styles.tipRow, { borderColor: colors.border }]}>
                    <View style={styles.tipHeader}>
                      <Ionicons name="bulb-outline" size={16} color={accent} />
                      <Text variant="caption" style={{ fontWeight: '700' }}>
                        {tip.reporterName ?? 'Kullanıcı'}
                      </Text>
                      <Text secondary variant="caption">
                        {formatLostTimeAgo(tip.createdAt)}
                      </Text>
                    </View>
                    <Text secondary>{tip.message}</Text>
                    {tip.contactInfo ? (
                      <Text variant="caption" style={{ color: accent }}>
                        İletişim: {tip.contactInfo}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </SectionBlock>
          ) : null}

          <View style={styles.actionGrid}>
            {!record.isDemo && record.ownerId && user?.id !== record.ownerId && !isResolved && (showDetailTip || showDetailMessage) ? (
              <>
                {showDetailTip ? (
                <Pressable
                  onPress={async () => {
                    if (await requireAuth('İpucu')) setShowTipSheet(true);
                  }}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: `${accent}14`, borderColor: accent, opacity: pressed ? 0.88 : 1 },
                  ]}
                >
                  <Ionicons name="bulb-outline" size={18} color={accent} />
                  <Text variant="caption" style={{ fontWeight: '600', color: accent }}>
                    İpucu Gönder
                  </Text>
                </Pressable>
                ) : null}
                {showDetailMessage ? (
                <Pressable
                  onPress={() => void sendMessage()}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
                  ]}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
                  <Text variant="caption" style={{ fontWeight: '600' }}>
                    Mesaj
                  </Text>
                </Pressable>
                ) : null}
              </>
            ) : null}

            {record.latitude != null && record.longitude != null ? (
              <Pressable
                onPress={openMaps}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Ionicons name="navigate-outline" size={18} color={accent} />
                <Text variant="caption" style={{ fontWeight: '600' }}>
                  Haritada Gör
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {!record.isDemo && !isResolved && !isOwner && showDetailTip ? (
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
            onPress={async () => {
              if (await requireAuth('İpucu')) setShowTipSheet(true);
            }}
            style={({ pressed }) => [
              styles.stickyCta,
              { backgroundColor: LOST_CENTER_DEF.accent, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Ionicons name="bulb" size={20} color="#fff" />
            <Text variant="label" style={{ color: '#fff' }}>
              İpucu Gönder
            </Text>
          </Pressable>
        </View>
      ) : !record.isDemo && isOwner && !isResolved && showDetailResolve ? (
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
            style={({ pressed }) => [
              styles.stickySecondary,
              { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Ionicons name="create-outline" size={18} color={accent} />
            <Text variant="caption" style={{ fontWeight: '700', color: accent }}>
              Düzenle
            </Text>
          </Pressable>
          <Pressable
            onPress={handleResolve}
            disabled={resolving}
            style={({ pressed }) => [
              styles.stickyCta,
              { backgroundColor: colors.success, opacity: resolving || pressed ? 0.88 : 1 },
            ]}
          >
            {resolving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text variant="label" style={{ color: '#fff' }}>
                  Çözüldü
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      <LostTipSheet
        visible={showTipSheet}
        onClose={() => setShowTipSheet(false)}
        onSubmit={handleSubmitTip}
        loading={tipLoading}
      />

      {id ? (
        <ReportSheet
          visible={showReport}
          targetType="lost_item"
          targetId={id}
          onClose={() => setShowReport(false)}
        />
      ) : null}

      <FullScreenMediaViewer
        urls={record.mediaUrls ?? []}
        visible={mediaViewerOpen}
        startIndex={mediaViewerIndex}
        onClose={() => setMediaViewerOpen(false)}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroWrap: {
    marginBottom: spacing.sm,
  },
  coverWrap: {
    position: 'relative',
    height: 280,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFade: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopBar: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  urgentBanner: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  urgentText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mediaCountBadge: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  mediaCountText: {
    color: '#fff',
    fontWeight: '700',
  },
  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  ownerCard: {
    gap: spacing.md,
    borderWidth: 1,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ownerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ownerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tipsList: {
    gap: spacing.sm,
  },
  tipRow: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  title: {
    lineHeight: 30,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  bodyText: {
    lineHeight: 24,
  },
  mediaRow: {
    marginTop: spacing.xs,
  },
  mediaImage: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    marginRight: spacing.sm,
  },
  infoGrid: {
    gap: spacing.sm,
  },
  infoTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stickySecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  stickyCta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
});
