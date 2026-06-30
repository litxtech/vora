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
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import { EventAttendeesSheet } from '@/features/events/components/EventAttendeesSheet';
import { EventQrDisplay } from '@/features/events/components/EventQrDisplay';
import { EventUpdatesSection } from '@/features/events/components/EventUpdatesSection';
import {
  EVENT_CENTER_DEF,
  EVENT_MAP_CATEGORY_LABELS,
  eventAccentColor,
  eventCategoryLabel,
  eventEditPath,
  formatEventCountdown,
  formatEventDate,
  isEventLiveNow,
} from '@/features/events/constants';
import {
  deleteEvent,
  fetchEventAttendees,
  fetchEventConversationId,
  fetchEventRsvp,
  incrementEventView,
  setEventRsvp,
} from '@/features/events/services/eventData';
import { fetchEventTicket, startEventTicketCheckout, type EventTicket } from '@/features/events/services/ticketService';
import { eventGoBack } from '@/features/events/services/eventNavigation';
import type { EventAttendee, EventRsvpStatus } from '@/features/events/types';
import { useContentFollow } from '@/features/map/hooks/useContentFollow';
import { fetchMapDetail, type MapDetailRecord } from '@/features/map/services/detailData';
import { getCachedMapDetail, setCachedMapDetail } from '@/features/map/services/mapDetailCache';
import { openChat } from '@/features/messaging/services/messagingNavigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type RsvpOption = { status: EventRsvpStatus; label: string; icon: keyof typeof Ionicons.glyphMap };

const RSVP_OPTIONS: RsvpOption[] = [
  { status: 'going', label: 'Katılacağım', icon: 'checkmark-circle' },
  { status: 'maybe', label: 'Belki', icon: 'help-circle' },
  { status: 'not_going', label: 'Katılmayacağım', icon: 'close-circle' },
];

function LivePulse({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 1400, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.1, { duration: 1400, easing: Easing.out(Easing.ease) }),
        withTiming(0.5, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.liveWrap}>
      <Animated.View style={[styles.livePulse, pulseStyle, { backgroundColor: color }]} />
      <View style={[styles.liveDot, { backgroundColor: color }]} />
      <Text variant="caption" style={styles.liveLabel}>
        CANLI
      </Text>
    </View>
  );
}

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
        <Text variant="body" numberOfLines={2}>
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

function AttendeeStack({ attendees, accent }: { attendees: EventAttendee[]; accent: string }) {
  const going = attendees.filter((a) => a.status === 'going').slice(0, 5);
  if (going.length === 0) return null;

  return (
    <View style={styles.avatarStack}>
      {going.map((a, i) => (
        <View
          key={a.userId}
          style={[
            styles.stackAvatar,
            {
              marginLeft: i === 0 ? 0 : -10,
              borderColor: accent,
              zIndex: going.length - i,
            },
          ]}
        >
          {a.avatarUrl ? (
            <Image source={{ uri: a.avatarUrl }} style={styles.stackAvatarImg} />
          ) : (
            <View style={[styles.stackAvatarPlaceholder, { backgroundColor: `${accent}22` }]}>
              <Ionicons name="person" size={14} color={accent} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

export function EventDetailScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { id, demo, checkout } = useLocalSearchParams<{ id: string; demo?: string; checkout?: string }>();

  const [record, setRecord] = useState<MapDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<EventRsvpStatus | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [showAttendees, setShowAttendees] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<EventTicket | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { following, loading: followLoading, toggle: toggleFollow } = useContentFollow('event', id ?? null);

  const accent = eventAccentColor(record?.eventMeta?.mapCategory);
  const startsAt = record?.eventMeta?.startsAt;
  const endsAt = record?.eventMeta?.endsAt;
  const live = startsAt ? isEventLiveNow(startsAt, endsAt) : false;
  const countdown = startsAt ? formatEventCountdown(startsAt, endsAt) : null;

  const organizerField = useMemo(
    () => record?.fields.find((f) => f.label === 'Organizatör'),
    [record],
  );

  useEffect(() => {
    if (!id || demo === '1') return;

    let cancelled = false;

    const run = async (background: boolean) => {
      const cached = getCachedMapDetail('events', id);
      if (cached && !background) {
        setRecord(cached);
        setLoading(false);
      } else if (!background && !cached) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await fetchMapDetail('events', id);
        if (cancelled) return;
        if (!data) {
          if (!cached) {
            setError('Etkinlik bulunamadı.');
            setRecord(null);
          }
          return;
        }
        setCachedMapDetail('events', id, data);
        setRecord(data);
      } catch {
        if (!cancelled && !cached) setError('Detaylar yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const cached = getCachedMapDetail('events', id);
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
    if (!id || demo === '1') return;
    incrementEventView(id, 'detail');
    fetchEventAttendees(id).then(setAttendees);
    fetchEventConversationId(id).then(setConversationId);
    if (user?.id) fetchEventRsvp(id, user.id).then(setRsvpStatus);
  }, [id, demo, user?.id]);

  useEffect(() => {
    if (!id || !user?.id || record?.eventMeta?.ticketType !== 'paid') return;
    fetchEventTicket(id, user.id).then(setTicket);
  }, [id, user?.id, record?.eventMeta?.ticketType]);

  useEffect(() => {
    if (checkout === 'success' && id && user?.id) {
      fetchEventRsvp(id, user.id).then(setRsvpStatus);
      fetchEventTicket(id, user.id).then(setTicket);
      Alert.alert('Ödeme alındı', 'Biletiniz onaylandı, etkinliğe katılımınız kaydedildi.');
    }
  }, [checkout, id, user?.id]);

  const openMaps = () => {
    if (!record?.latitude || !record?.longitude) return;
    void openUrl(
      `https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`,
    );
  };

  const handleFollow = async () => {
    if (!(await requireAuth('Takip'))) return;
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
    await Share.share({ message: `${record.title}\n\nVora uygulamasında etkinliği görüntüle.` });
  };

  const handleBuyTicket = async () => {
    if (!(await requireAuth('Bilet')) || !id) return;
    setTicketLoading(true);
    const result = await startEventTicketCheckout(id);
    setTicketLoading(false);
    if (result.error) Alert.alert('Hata', result.error);
    else if (user?.id) fetchEventTicket(id, user.id).then(setTicket);
  };

  const handleEdit = () => {
    if (!id) return;
    router.push(eventEditPath(id) as never);
  };

  const handleDelete = () => {
    if (!id || !user?.id) return;

    Alert.alert(
      'Etkinliği Sil',
      'Bu etkinlik kalıcı olarak kaldırılacak. Devam etmek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const result = await deleteEvent(id, user.id);
            setDeleting(false);
            if (result.error) {
              Alert.alert('Hata', result.error);
              return;
            }
            Alert.alert('Silindi', 'Etkinlik kaldırıldı.', [
              { text: 'Tamam', onPress: () => eventGoBack() },
            ]);
          },
        },
      ],
    );
  };

  const isOrganizer = user?.id === record?.ownerId;
  const isPaidEvent = record?.eventMeta?.ticketType === 'paid';
  const hasPaidTicket = ticket?.status === 'paid';
  const goingCount = attendees.filter((a) => a.status === 'going').length;
  const maybeCount = attendees.filter((a) => a.status === 'maybe').length;
  const viewCount = record?.eventMeta?.viewCount ?? 0;

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={EVENT_CENTER_DEF.accent} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (error || !record) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.lg }]}>
          <Pressable onPress={eventGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <GlassCard>
            <Text secondary>{error ?? 'Etkinlik mevcut değil.'}</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  const mapCategoryLabel =
    record.eventMeta?.mapCategory && record.eventMeta.mapCategory in EVENT_MAP_CATEGORY_LABELS
      ? EVENT_MAP_CATEGORY_LABELS[record.eventMeta.mapCategory as keyof typeof EVENT_MAP_CATEGORY_LABELS]
      : null;

  return (
    <GradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={[styles.heroWrap, { marginTop: insets.top }]}>
          <View style={styles.coverWrap}>
            {record.coverUrl ? (
              <>
                <Image source={{ uri: record.coverUrl }} style={styles.heroCoverImage} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.35)', `${colors.background}F0`]}
                  locations={[0, 0.5, 1]}
                  style={styles.coverFade}
                  pointerEvents="none"
                />
              </>
            ) : (
              <LinearGradient
                colors={
                  isDark
                    ? ([`${accent}66`, `${accent}33`, colors.background] as const)
                    : ([`${accent}88`, `${accent}44`, colors.surfaceElevated] as const)
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCover}
              >
                <Ionicons name="calendar" size={100} color={`${accent}33`} style={styles.heroPatternIcon} />
              </LinearGradient>
            )}

            <View style={styles.heroTopBar}>
              <Pressable
                onPress={eventGoBack}
                style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}
              >
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
              <View style={styles.heroTopActions}>
                <Pressable
                  onPress={() => void shareEvent()}
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

            {live ? (
              <View style={styles.liveBadgePos}>
                <LivePulse color="#FF3B30" />
              </View>
            ) : null}
          </View>

          <View style={styles.heroBody}>
            <View style={styles.chips}>
              {mapCategoryLabel ? (
                <View style={[styles.chip, { backgroundColor: `${accent}18` }]}>
                  <Ionicons name="pricetag" size={11} color={accent} />
                  <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
                    {mapCategoryLabel}
                  </Text>
                </View>
              ) : null}
              {record.eventMeta?.category ? (
                <View style={[styles.chip, { backgroundColor: `${colors.primary}14` }]}>
                  <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                    {eventCategoryLabel(record.eventMeta.category)}
                  </Text>
                </View>
              ) : null}
              {isPaidEvent ? (
                <View style={[styles.chip, { backgroundColor: `${colors.warning}18` }]}>
                  <Ionicons name="ticket-outline" size={11} color={colors.warning} />
                  <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
                    {hasPaidTicket ? 'Biletli' : 'Ücretli'}
                  </Text>
                </View>
              ) : (
                <View style={[styles.chip, { backgroundColor: `${colors.success}18` }]}>
                  <Text variant="caption" style={{ color: colors.success, fontWeight: '600' }}>
                    Ücretsiz
                  </Text>
                </View>
              )}
              {record.isDemo ? (
                <View style={[styles.chip, { backgroundColor: `${colors.warning}18` }]}>
                  <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
                    Demo
                  </Text>
                </View>
              ) : null}
            </View>

            <Text variant="h2" style={styles.eventTitle}>
              {record.title}
            </Text>

            {countdown ? (
              <View style={styles.countdownRow}>
                <Ionicons
                  name={live ? 'radio' : 'time-outline'}
                  size={15}
                  color={live ? '#FF3B30' : accent}
                />
                <Text
                  variant="caption"
                  style={{ color: live ? '#FF3B30' : accent, fontWeight: '700' }}
                >
                  {countdown}
                </Text>
                {startsAt && !live ? (
                  <Text secondary variant="caption">
                    · {formatEventDate(startsAt)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {record.subtitle && record.subtitle !== 'Etkinlik' ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text secondary variant="caption">
                  {record.subtitle}
                </Text>
              </View>
            ) : null}

            <View style={styles.statsRow}>
              <Pressable style={styles.statPill} onPress={() => setShowAttendees(true)}>
                <Ionicons name="people" size={14} color={accent} />
                <Text variant="caption" style={{ fontWeight: '700' }}>
                  {goingCount}
                </Text>
                <Text secondary variant="caption">
                  katılacak
                </Text>
              </Pressable>
              <View style={styles.statPill}>
                <Ionicons name="help-circle-outline" size={14} color={colors.textMuted} />
                <Text variant="caption" style={{ fontWeight: '600' }}>
                  {maybeCount}
                </Text>
                <Text secondary variant="caption">
                  belki
                </Text>
              </View>
              <View style={styles.statPill}>
                <Ionicons name="eye-outline" size={14} color={colors.textMuted} />
                <Text secondary variant="caption">
                  {viewCount.toLocaleString('tr-TR')}
                </Text>
              </View>
            </View>

            <AttendeeStack attendees={attendees} accent={accent} />
          </View>
        </View>

        <View style={styles.content}>
          {!record.isDemo ? (
            <View style={styles.rsvpBlock}>
              <Text variant="label">Katılım Durumun</Text>
              <View style={[styles.rsvpSegment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {RSVP_OPTIONS.map((opt) => {
                  const selected = rsvpStatus === opt.status;

                  return (
                    <Pressable
                      key={opt.status}
                      disabled={rsvpLoading}
                      onPress={() => handleRsvp(opt.status)}
                      style={[
                        styles.rsvpOption,
                        selected && { backgroundColor: `${accent}18`, borderColor: accent },
                        !selected && { borderColor: 'transparent' },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={16}
                        color={selected ? accent : colors.textMuted}
                      />
                      <Text
                        variant="caption"
                        style={{
                          color: selected ? accent : colors.textSecondary,
                          fontWeight: selected ? '700' : '400',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {record.description ? (
            <SectionBlock title="Hakkında">
              <Text secondary style={styles.bodyText}>
                {record.description}
              </Text>
            </SectionBlock>
          ) : null}

          <View style={styles.infoGrid}>
            {organizerField && organizerField.value !== '—' ? (
              <InfoTile icon="person-outline" label="Organizatör" value={organizerField.value} accent={accent} />
            ) : null}
            {startsAt ? (
              <InfoTile
                icon="calendar-outline"
                label="Başlangıç"
                value={formatEventDate(startsAt)}
                accent={accent}
              />
            ) : null}
            {endsAt ? (
              <InfoTile icon="time-outline" label="Bitiş" value={formatEventDate(endsAt)} accent={accent} />
            ) : null}
            {record.subtitle && record.subtitle !== '—' ? (
              <InfoTile
                icon="location-outline"
                label="Konum"
                value={record.subtitle}
                accent={accent}
                onPress={record.latitude != null ? openMaps : undefined}
              />
            ) : null}
          </View>

          {id && record.ownerId ? (
            <EventUpdatesSection eventId={id} organizerId={record.ownerId} isDemo={record.isDemo} />
          ) : null}

          {isOrganizer && record.eventMeta?.qrToken && id ? (
            <SectionBlock title="Giriş QR Kodu">
              <EventQrDisplay
                token={record.eventMeta.qrToken}
                title={record.title}
                eventId={id}
                startsAt={record.eventMeta.startsAt}
                locationName={record.subtitle}
              />
            </SectionBlock>
          ) : null}

          {isOrganizer && !record.isDemo ? (
            <SectionBlock title="Organizatör">
              <View style={styles.organizerActions}>
                <Pressable
                  onPress={handleEdit}
                  style={({ pressed }) => [
                    styles.organizerBtn,
                    { backgroundColor: `${accent}14`, borderColor: accent, opacity: pressed ? 0.88 : 1 },
                  ]}
                >
                  <Ionicons name="create-outline" size={18} color={accent} />
                  <Text variant="caption" style={{ fontWeight: '700', color: accent }}>
                    Düzenle
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  disabled={deleting}
                  style={({ pressed }) => [
                    styles.organizerBtn,
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
              </View>
            </SectionBlock>
          ) : null}

          <View style={styles.actionGrid}>
            {!record.isDemo ? (
              <Pressable
                onPress={() => void handleFollow()}
                disabled={followLoading}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: following ? `${accent}18` : colors.surface,
                    borderColor: following ? accent : colors.border,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={following ? 'heart' : 'heart-outline'}
                  size={18}
                  color={following ? accent : colors.text}
                />
                <Text variant="caption" style={{ fontWeight: '600' }}>
                  {following ? 'Takip Ediliyor' : 'Takip Et'}
                </Text>
              </Pressable>
            ) : null}

            {conversationId && !record.isDemo ? (
              <Pressable
                onPress={openEventChat}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Ionicons name="chatbubbles-outline" size={18} color={colors.text} />
                <Text variant="caption" style={{ fontWeight: '600' }}>
                  Sohbet
                </Text>
              </Pressable>
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
                  Yol Tarifi
                </Text>
              </Pressable>
            ) : null}

            {(rsvpStatus === 'going' || hasPaidTicket) && !isOrganizer && !record.isDemo ? (
              <Pressable
                onPress={() => router.push('/event-center/scan' as never)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: `${accent}14`, borderColor: accent, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Ionicons name="qr-code-outline" size={18} color={accent} />
                <Text variant="caption" style={{ fontWeight: '600', color: accent }}>
                  QR Giriş
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {!record.isDemo && isPaidEvent && !isOrganizer && !hasPaidTicket ? (
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
          <View style={styles.stickyPrice}>
            <Text variant="caption" muted>
              Bilet fiyatı
            </Text>
            <Text variant="label" style={{ color: accent }}>
              {((record.eventMeta?.ticketPriceCents ?? 0) / 100).toFixed(2)} TRY
            </Text>
          </View>
          <Pressable
            onPress={() => void handleBuyTicket()}
            disabled={ticketLoading}
            style={({ pressed }) => [
              styles.stickyCta,
              { backgroundColor: accent, opacity: ticketLoading || pressed ? 0.85 : 1 },
            ]}
          >
            {ticketLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="ticket" size={18} color="#fff" />
                <Text variant="label" style={{ color: '#fff' }}>
                  Bilet Al
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : !record.isDemo && rsvpStatus !== 'going' ? (
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
            onPress={() => handleRsvp('going')}
            disabled={rsvpLoading}
            style={({ pressed }) => [
              styles.stickyCtaFull,
              { backgroundColor: accent, opacity: rsvpLoading || pressed ? 0.85 : 1 },
            ]}
          >
            {rsvpLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text variant="label" style={{ color: '#fff' }}>
                  Katılacağım
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      <EventAttendeesSheet
        visible={showAttendees}
        attendees={attendees}
        onClose={() => setShowAttendees(false)}
      />

      {id ? (
        <ReportSheet
          visible={showReport}
          targetType="event"
          targetId={id}
          onClose={() => setShowReport(false)}
        />
      ) : null}
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
  heroCoverImage: {
    width: '100%',
    height: '100%',
  },
  coverFade: {
    ...StyleSheet.absoluteFillObject,
  },
  heroCover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPatternIcon: {
    opacity: 0.5,
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
  liveBadgePos: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
  },
  liveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  livePulse: {
    position: 'absolute',
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveLabel: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
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
  eventTitle: {
    lineHeight: 30,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  stackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  stackAvatarImg: {
    width: '100%',
    height: '100%',
  },
  stackAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rsvpBlock: {
    gap: spacing.sm,
  },
  rsvpSegment: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  rsvpOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  section: {
    gap: spacing.sm,
  },
  bodyText: {
    lineHeight: 24,
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
  organizerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  organizerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stickyPrice: {
    gap: 2,
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
  stickyCtaFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
});
