import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FeedMediaPreview } from '@/components/media/FeedMediaPreview';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { EventAttendeesSheet } from '@/features/events/components/EventAttendeesSheet';
import { EventQrDisplay } from '@/features/events/components/EventQrDisplay';
import { EventUpdatesSection } from '@/features/events/components/EventUpdatesSection';
import {
  fetchEventAttendees,
  fetchEventConversationId,
  fetchEventRsvp,
  incrementEventView,
  setEventRsvp,
} from '@/features/events/services/eventData';
import { fetchEventTicket, startEventTicketCheckout, type EventTicket } from '@/features/events/services/ticketService';
import { LostTipSheet } from '@/features/lost-found/components/LostTipSheet';
import { resolveLostItem, submitLostItemTip } from '@/features/lost-found/services/lostItemData';
import type { EventAttendee, EventRsvpStatus } from '@/features/events/types';
import { DetailMetaRow } from '@/features/map/components/DetailMetaRow';
import { LAYER_BY_ID } from '@/features/map/constants';
import { useContentFollow } from '@/features/map/hooks/useContentFollow';
import { recordPostView } from '@/features/feed/services/feedData';
import { fetchMapDetail, type MapDetailRecord } from '@/features/map/services/detailData';
import {
  getCachedMapDetail,
  setCachedMapDetail,
} from '@/features/map/services/mapDetailCache';
import { supabase } from '@/lib/supabase/client';
import { PersonnelApplySheet } from '@/features/personnel-center/components/PersonnelApplySheet';
import { usePersonnelApply } from '@/features/personnel-center/hooks/usePersonnelApply';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import { mapDetailToReportTarget } from '@/features/moderation/services/reportTargets';
import { openChat } from '@/features/messaging/services/messagingNavigation';
import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import type { ContentFollowType, MapDetailType } from '@/features/map/types';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type MapDetailScreenProps = {
  type: MapDetailType;
};

function followTypeForLayer(type: MapDetailType): ContentFollowType | null {
  if (type === 'events') return 'event';
  if (type === 'incidents') return 'incident';
  return null;
}

export function MapDetailScreen({ type }: MapDetailScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { id, demo, checkout } = useLocalSearchParams<{ id: string; demo?: string; checkout?: string }>();
  const [record, setRecord] = useState<MapDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { applyTarget, openApplySheet, closeApplySheet, submitApplication, submitting } =
    usePersonnelApply(user?.id);
  const [showReport, setShowReport] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<EventRsvpStatus | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [showAttendees, setShowAttendees] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<EventTicket | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [showTipSheet, setShowTipSheet] = useState(false);
  const [tipLoading, setTipLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  const reportTargetType = mapDetailToReportTarget(type);

  const followType = followTypeForLayer(type);
  const { following, loading: followLoading, toggle: toggleFollow } = useContentFollow(
    followType ?? 'event',
    followType ? id : null,
  );

  const layer = LAYER_BY_ID[type];
  const phoneField = useMemo(
    () =>
      record?.fields.find(
        (field) =>
          (field.label === 'Telefon' || field.label === 'İletişim') &&
          field.value !== '—' &&
          field.value.trim().length > 0,
      ),
    [record],
  );

  useEffect(() => {
    if (!id || demo === '1') return;

    let cancelled = false;

    const run = async (background: boolean) => {
      const cached = getCachedMapDetail(type, id);
      if (cached && !background) {
        setRecord(cached);
        setLoading(false);
      } else if (!background && !cached) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await fetchMapDetail(type, id);
        if (cancelled) return;
        if (!data) {
          if (!cached) {
            setError('Kayıt bulunamadı.');
            setRecord(null);
          }
          return;
        }
        setCachedMapDetail(type, id, data);
        setRecord(data);
      } catch {
        if (!cancelled && !cached) setError('Detaylar yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const cached = getCachedMapDetail(type, id);
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
  }, [type, id, demo]);

  useEffect(() => {
    if (type !== 'events' || !id || demo === '1') return;

    incrementEventView(id, 'detail');
    fetchEventAttendees(id).then(setAttendees);
    fetchEventConversationId(id).then(setConversationId);

    if (user?.id) {
      fetchEventRsvp(id, user.id).then(setRsvpStatus);
    }
  }, [type, id, demo, user?.id]);

  useEffect(() => {
    if (type !== 'posts' || !id || demo === '1') return;
    recordPostView(id);
  }, [type, id, demo]);

  useEffect(() => {
    if (type !== 'businesses' || !id || demo === '1') return;
    supabase.rpc('increment_business_view_count', { p_business_id: id });
  }, [type, id, demo]);

  useEffect(() => {
    if (type !== 'events' || !id || !user?.id || record?.eventMeta?.ticketType !== 'paid') return;
    fetchEventTicket(id, user.id).then(setTicket);
  }, [type, id, user?.id, record?.eventMeta?.ticketType]);

  useEffect(() => {
    if (checkout === 'success' && id && user?.id) {
      fetchEventRsvp(id, user.id).then(setRsvpStatus);
      fetchEventTicket(id, user.id).then(setTicket);
      Alert.alert('Ödeme alındı', 'Biletiniz onaylandı, etkinliğe katılımınız kaydedildi.');
    }
  }, [checkout, id, user?.id]);

  const openMaps = () => {
    if (!record?.latitude || !record?.longitude) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`;
    openUrl(url);
  };

  const callPhone = () => {
    if (!phoneField?.value) return;
    openUrl(`tel:${phoneField.value.replace(/\s/g, '')}`);
  };

  const sendMessage = async () => {
    if (!(await requireAuth('Mesaj'))) return;
    if (!record?.ownerId) {
      Alert.alert('Mesaj', 'Bu kayıt için mesaj gönderilemiyor.');
      return;
    }

    const { conversationId, error } = await getOrCreateDirectConversation(record.ownerId);
    if (error) {
      Alert.alert('Mesaj', error);
      return;
    }
    if (conversationId) openChat(conversationId);
  };

  const handleApply = async () => {
    if (!(await requireAuth('Başvuru')) || !id || !record) return;
    const listingType = type === 'staff' ? 'staff' : 'job';
    openApplySheet(listingType, id, record.title);
  };

  const handleFollow = async () => {
    if (!followType || !(await requireAuth('Takip'))) return;
    const result = await toggleFollow();
    if (result?.error) Alert.alert('Hata', result.error);
    else if (result?.following) Alert.alert('Takip ediliyor', 'Yeni gelişmeler bildirim olarak gelecek.');
  };

  const handleRsvp = async (status: EventRsvpStatus) => {
    if (!(await requireAuth('Katılım')) || !id || !user) return;

    const isPaid = record?.eventMeta?.ticketType === 'paid';
    if (isPaid && status === 'going' && ticket?.status !== 'paid') {
      Alert.alert('Bilet gerekli', 'Bu etkinliğe katılmak için önce bilet satın almalısınız.');
      return;
    }

    setRsvpLoading(true);
    const result = await setEventRsvp(id, user.id, status);
    setRsvpLoading(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    setRsvpStatus(status === 'not_going' ? null : status);
    fetchEventAttendees(id).then(setAttendees);

    if (status === 'going') {
      const convId = conversationId ?? (await fetchEventConversationId(id));
      if (convId) setConversationId(convId);
    }
  };

  const openEventChat = async () => {
    if (!conversationId) {
      Alert.alert('Sohbet', 'Etkinlik sohbeti henüz hazır değil.');
      return;
    }
    if (!(await requireAuth('Sohbet'))) return;
    if (rsvpStatus !== 'going' && rsvpStatus !== 'maybe' && record?.ownerId !== user?.id) {
      Alert.alert('Sohbet', 'Sohbete katılmak için etkinliğe katılmanız gerekir.');
      return;
    }
    openChat(conversationId);
  };

  const shareEvent = async () => {
    if (!record) return;
    await Share.share({
      message: `${record.title}\n\nVora uygulamasında etkinliği görüntüle.`,
    });
  };

  const handleBuyTicket = async () => {
    if (!(await requireAuth('Bilet')) || !id) return;
    setTicketLoading(true);
    const result = await startEventTicketCheckout(id);
    setTicketLoading(false);
    if (result.error) Alert.alert('Hata', result.error);
    else if (user?.id) fetchEventTicket(id, user.id).then(setTicket);
  };

  const isOrganizer = user?.id === record?.ownerId;
  const isPaidEvent = record?.eventMeta?.ticketType === 'paid';
  const hasPaidTicket = ticket?.status === 'paid';

  const handleResolveLost = async () => {
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
            fetchMapDetail(type, id).then(setRecord);
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

  const goingCount = attendees.filter((a) => a.status === 'going').length;
  const maybeCount = attendees.filter((a) => a.status === 'maybe').length;

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (error || !record) {
    return (
      <GradientBackground>
        <View style={styles.page}>
          <AuthHeader title="Detay" subtitle="İçerik bulunamadı" />
          <GlassCard>
            <Text secondary>{error ?? 'Kayıt mevcut değil.'}</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader title={layer.label} subtitle={record.isDemo ? 'Örnek içerik' : 'Detay sayfası'} />

        <GlassCard style={styles.hero}>
          {type === 'events' && record.coverUrl ? (
            <Image source={{ uri: record.coverUrl }} style={styles.coverImage} />
          ) : (
            <View style={[styles.iconWrap, { backgroundColor: `${layer.color}22` }]}>
              <Ionicons name={layer.icon as keyof typeof Ionicons.glyphMap} size={28} color={layer.color} />
            </View>
          )}
          <Text variant="h2">{record.title}</Text>
          {record.subtitle ? <Text secondary>{record.subtitle}</Text> : null}
          {record.isDemo ? (
            <View style={[styles.demoBadge, { borderColor: colors.warning, backgroundColor: `${colors.warning}18` }]}>
              <Text variant="caption" style={{ color: colors.warning }}>
                Demo veri — gerçek kayıt değil
              </Text>
            </View>
          ) : null}
        </GlassCard>

        {record.description ? (
          <GlassCard style={styles.section}>
            <Text variant="label">Açıklama</Text>
            <Text secondary style={styles.body}>
              {record.description}
            </Text>
          </GlassCard>
        ) : null}

        {(type === 'posts' || type === 'lost_found') && record.mediaUrls && record.mediaUrls.length > 0 ? (
          <GlassCard style={styles.section}>
            <Text variant="label">Medya</Text>
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
          </GlassCard>
        ) : null}

        <GlassCard style={styles.section}>
          <Text variant="label">Bilgiler</Text>
          {record.fields.map((field) => (
            <DetailMetaRow key={field.label} label={field.label} value={field.value} />
          ))}
        </GlassCard>

        {type === 'events' && id && record.ownerId ? (
          <EventUpdatesSection eventId={id} organizerId={record.ownerId} isDemo={record.isDemo} />
        ) : null}

        {type === 'events' && isOrganizer && record.eventMeta?.qrToken ? (
          <GlassCard style={styles.section}>
            <Text variant="label">Giriş QR Kodu</Text>
            <EventQrDisplay
              token={record.eventMeta.qrToken}
              title={record.title}
              eventId={id!}
              startsAt={record.eventMeta.startsAt}
              locationName={record.subtitle}
            />
          </GlassCard>
        ) : null}

        <View style={styles.actions}>
          {reportTargetType && !record.isDemo ? (
            <Button
              title="Şikayet Et"
              variant="outline"
              onPress={async () => {
                if (await requireAuth('Şikayet')) setShowReport(true);
              }}
            />
          ) : null}

          {type === 'jobs' || type === 'staff' ? (
            <Button title="Başvur" loading={submitting} onPress={handleApply} />
          ) : null}

          {(type === 'jobs' || type === 'staff' || type === 'job_seekers') && record.ownerId ? (
            <Button title="Mesaj Gönder" variant="ghost" onPress={sendMessage} />
          ) : null}

          {type === 'job_seekers' && record.ownerId ? (
            <Button
              title="Profili Gör"
              variant="outline"
              onPress={() => router.push(`/user/${record.ownerId}` as never)}
            />
          ) : null}

          {followType ? (
            <Button
              title={following ? 'Takip Ediliyor' : 'Takip Et'}
              variant={following ? 'secondary' : 'primary'}
              loading={followLoading}
              onPress={handleFollow}
            />
          ) : null}

          {type === 'lost_found' && !record.isDemo ? (
            <>
              {record.ownerId && user?.id !== record.ownerId ? (
                <>
                  <Button title="İpucu Gönder" variant="outline" onPress={async () => {
                    if (await requireAuth('İpucu')) setShowTipSheet(true);
                  }} />
                  <Button title="Mesaj Gönder" variant="ghost" onPress={sendMessage} />
                </>
              ) : null}
              {user?.id === record.ownerId ? (
                <Button title="Çözüldü İşaretle" loading={resolving} onPress={handleResolveLost} />
              ) : null}
              <Button title="Paylaş" variant="ghost" onPress={shareEvent} />
            </>
          ) : null}

          {type === 'events' && !record.isDemo ? (
            <>
              {isPaidEvent && !isOrganizer ? (
                hasPaidTicket ? (
                  <Text variant="caption" style={{ color: colors.success }}>
                    Biletiniz aktif
                  </Text>
                ) : (
                  <Button
                    title={`Bilet Al · ${((record.eventMeta?.ticketPriceCents ?? 0) / 100).toFixed(2)} TRY`}
                    loading={ticketLoading}
                    onPress={handleBuyTicket}
                  />
                )
              ) : null}
              <View style={styles.rsvpRow}>
                <Button
                  title="Katılacağım"
                  variant={rsvpStatus === 'going' ? 'primary' : 'outline'}
                  loading={rsvpLoading}
                  onPress={() => handleRsvp('going')}
                />
                <Button
                  title="Belki"
                  variant={rsvpStatus === 'maybe' ? 'secondary' : 'outline'}
                  loading={rsvpLoading}
                  onPress={() => handleRsvp('maybe')}
                />
                <Button
                  title="Katılmayacağım"
                  variant="ghost"
                  loading={rsvpLoading}
                  onPress={() => handleRsvp('not_going')}
                />
              </View>
              <Pressable onPress={() => setShowAttendees(true)}>
                <Text variant="caption" style={{ color: colors.primary }}>
                  {goingCount} katılacak · {maybeCount} belki · Katılımcı listesi
                </Text>
              </Pressable>
              {conversationId ? (
                <Button title="Etkinlik Sohbeti" variant="outline" onPress={openEventChat} />
              ) : null}
              {(rsvpStatus === 'going' || hasPaidTicket) && !isOrganizer ? (
                <Button title="QR ile Giriş Yap" variant="outline" onPress={() => router.push('/event-center/scan' as never)} />
              ) : null}
              <Button title="Paylaş" variant="ghost" onPress={shareEvent} />
            </>
          ) : null}

          {record.latitude != null && record.longitude != null ? (
            <>
              <Button title="Yol Tarifi" variant="outline" onPress={openMaps} />
              <Pressable style={[styles.coords, { borderColor: colors.border }]} onPress={openMaps}>
                <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                <Text variant="caption" style={{ color: colors.primary }}>
                  {record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}
                </Text>
              </Pressable>
            </>
          ) : null}

          {phoneField ? (
            <Button title="Telefon Et" variant="outline" onPress={callPhone} />
          ) : null}

          {type === 'businesses' && record.ownerId ? (
            <Button title="Mesaj Gönder" variant="ghost" onPress={sendMessage} />
          ) : null}
        </View>
      </ScrollView>

      {type === 'lost_found' ? (
        <LostTipSheet
          visible={showTipSheet}
          onClose={() => setShowTipSheet(false)}
          onSubmit={handleSubmitTip}
          loading={tipLoading}
        />
      ) : null}

      {type === 'events' ? (
        <EventAttendeesSheet
          visible={showAttendees}
          attendees={attendees}
          onClose={() => setShowAttendees(false)}
        />
      ) : null}

      {reportTargetType && id ? (
        <ReportSheet
          visible={showReport}
          targetType={reportTargetType}
          targetId={id}
          onClose={() => setShowReport(false)}
        />
      ) : null}

      <PersonnelApplySheet
        visible={!!applyTarget && applyTarget.listingId === id}
        listingTitle={record?.title ?? 'İlan'}
        userId={user?.id ?? null}
        onClose={closeApplySheet}
        onSubmit={submitApplication}
      />

      <FullScreenMediaViewer
        urls={record?.mediaUrls ?? []}
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  mediaRow: {
    marginBottom: spacing.sm,
  },
  mediaImage: {
    width: 160,
    height: 160,
    borderRadius: radius.md,
    marginRight: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  demoBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  body: {
    lineHeight: 24,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
  rsvpRow: {
    gap: spacing.sm,
  },
  coords: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
