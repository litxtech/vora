import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  EVENT_CATEGORY_ICONS,
  EVENT_CATEGORY_OPTIONS,
  EVENT_CENTER_DEF,
  eventCategoryLabel,
  formatEventDate,
} from '@/features/events/constants';
import { uploadEventCover } from '@/features/events/services/coverUpload';
import {
  createEvent,
  fetchEventForEdit,
  fetchMyBusiness,
  updateEvent,
} from '@/features/events/services/eventData';
import { eventGoBack } from '@/features/events/services/eventNavigation';
import type { EventCategory } from '@/features/events/types';
import { supabase } from '@/lib/supabase/client';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const ACCENT = EVENT_CENTER_DEF.accent;

function parseDateTime(dateStr: string, timeStr: string): string | null {
  const [day, month, year] = dateStr.split('.').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  if (!day || !month || !year || hour == null || minute == null) return null;
  const d = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatDateInput(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR');
}

function formatTimeInput(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function FormSection({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <LinearGradient
          colors={[`${ACCENT}44`, `${ACCENT}22`]}
          style={styles.stepBadge}
        >
          <Text variant="caption" style={{ color: ACCENT, fontWeight: '800' }}>
            {step}
          </Text>
        </LinearGradient>
        <View style={styles.sectionTitles}>
          <Text variant="label">{title}</Text>
          {subtitle ? (
            <Text secondary variant="caption">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function LivePreviewCard({
  title,
  coverUri,
  category,
  locationName,
  startDate,
  startTime,
  ticketType,
  ticketPrice,
}: {
  title: string;
  coverUri: string | null;
  category: EventCategory;
  locationName: string;
  startDate: string;
  startTime: string;
  ticketType: 'free' | 'paid';
  ticketPrice: string;
}) {
  const { colors, isDark } = useTheme();
  const previewTitle = title.trim() || 'Etkinlik başlığınız';
  const startsAt = parseDateTime(startDate, startTime);
  const dateLabel = startsAt ? formatEventDate(startsAt) : 'Tarih seçin';
  const categoryLabel = eventCategoryLabel(category);
  const icon = EVENT_CATEGORY_ICONS[category] as keyof typeof Ionicons.glyphMap;

  return (
    <View style={[styles.previewCard, { borderColor: `${ACCENT}33` }]}>
      <LinearGradient
        colors={isDark ? ([`${ACCENT}33`, 'transparent'] as const) : ([`${ACCENT}22`, 'transparent'] as const)}
        style={styles.previewGlow}
      />
      <Text variant="caption" style={[styles.previewLabel, { color: ACCENT }]}>
        Canlı önizleme
      </Text>

      <View style={styles.previewCoverWrap}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.previewCover} />
        ) : (
          <LinearGradient colors={[`${ACCENT}55`, `${ACCENT}22`]} style={styles.previewCoverPlaceholder}>
            <Ionicons name={icon} size={36} color={ACCENT} />
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.previewCoverFade} />
        <View style={styles.previewCoverContent}>
          <View style={[styles.previewChip, { backgroundColor: `${ACCENT}DD` }]}>
            <Ionicons name={icon} size={10} color="#fff" />
            <Text variant="caption" style={styles.previewChipText}>
              {categoryLabel}
            </Text>
          </View>
          <Text variant="label" numberOfLines={2} style={styles.previewTitle}>
            {previewTitle}
          </Text>
          <Text variant="caption" style={styles.previewDate}>
            {dateLabel}
          </Text>
        </View>
      </View>

      <View style={styles.previewMeta}>
        {locationName.trim() ? (
          <View style={styles.previewMetaRow}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text secondary variant="caption" numberOfLines={1}>
              {locationName}
            </Text>
          </View>
        ) : null}
        <View style={styles.previewMetaRow}>
          <Ionicons
            name={ticketType === 'paid' ? 'ticket-outline' : 'gift-outline'}
            size={13}
            color={ticketType === 'paid' ? colors.warning : colors.success}
          />
          <Text
            variant="caption"
            style={{ color: ticketType === 'paid' ? colors.warning : colors.success, fontWeight: '600' }}
          >
            {ticketType === 'paid'
              ? ticketPrice.trim()
                ? `${ticketPrice.replace(',', '.')} TRY`
                : 'Ücretli bilet'
              : 'Ücretsiz giriş'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function CreateEventScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    communityId?: string | string[];
    communityName?: string | string[];
  }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isEdit = Boolean(eventId);
  const communityId = Array.isArray(params.communityId) ? params.communityId[0] : params.communityId;
  const communityName = Array.isArray(params.communityName) ? params.communityName[0] : params.communityName;

  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, profile } = useAuth();
  const [loadingEvent, setLoadingEvent] = useState(isEdit);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('meeting');
  const [locationName, setLocationName] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('tr-TR');
  });
  const [startTime, setStartTime] = useState('19:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [ticketType, setTicketType] = useState<'free' | 'paid'>('free');
  const [ticketPrice, setTicketPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const regionId = profile?.region_id ?? 'trabzon';

  const completionScore = useMemo(() => {
    let score = 0;
    if (title.trim()) score += 25;
    if (description.trim()) score += 25;
    if (locationName.trim()) score += 15;
    if (coverUri || existingCoverUrl) score += 20;
    if (parseDateTime(startDate, startTime)) score += 15;
    return score;
  }, [title, description, locationName, coverUri, existingCoverUrl, startDate, startTime]);

  useEffect(() => {
    if (!user?.id) return;
    if (!isEdit) {
      fetchMyBusiness(user.id).then((biz) => {
        if (biz) setBusinessId(biz.id);
      });
    }
  }, [user?.id, isEdit]);

  useEffect(() => {
    if (!isEdit || !eventId || !user?.id) return;

    let cancelled = false;
    setLoadingEvent(true);

    fetchEventForEdit(eventId, user.id).then((record) => {
      if (cancelled) return;
      if (!record) {
        Alert.alert('Hata', 'Etkinlik bulunamadı veya düzenleme yetkiniz yok.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        return;
      }

      setTitle(record.title);
      setDescription(record.description);
      setCategory(record.category);
      setLocationName(record.locationName ?? '');
      setMaxAttendees(record.maxAttendees != null ? String(record.maxAttendees) : '');
      setStartDate(formatDateInput(record.startsAt));
      setStartTime(formatTimeInput(record.startsAt));
      setEndDate(record.endsAt ? formatDateInput(record.endsAt) : '');
      setEndTime(record.endsAt ? formatTimeInput(record.endsAt) : '');
      setExistingCoverUrl(record.coverUrl);
      setBusinessId(record.businessId);
      setTicketType(record.ticketType);
      setTicketPrice(
        record.ticketPriceCents != null ? (record.ticketPriceCents / 100).toFixed(2) : '',
      );
      setLoadingEvent(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isEdit, eventId, user?.id]);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (!title.trim() || !description.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve açıklama zorunludur.');
      return;
    }

    const startsAt = parseDateTime(startDate, startTime);
    if (!startsAt) {
      Alert.alert('Geçersiz tarih', 'Başlangıç tarih/saat formatı: GG.AA.YYYY ve SS:DD');
      return;
    }

    let endsAt: string | null = null;
    if (endDate.trim() && endTime.trim()) {
      endsAt = parseDateTime(endDate, endTime);
    }

    let latitude: number | undefined;
    let longitude: number | undefined;
    if (!isEdit) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }
    }

    setSaving(true);
    const priceCents =
      ticketType === 'paid' && ticketPrice.trim()
        ? Math.round(parseFloat(ticketPrice.replace(',', '.')) * 100)
        : null;

    if (ticketType === 'paid' && (!priceCents || priceCents < 100)) {
      setSaving(false);
      Alert.alert('Geçersiz fiyat', 'Ücretli etkinlik için en az 1 TRY girin.');
      return;
    }

    if (isEdit && eventId) {
      let coverUrl = existingCoverUrl;
      if (coverUri) {
        const { url, error } = await uploadEventCover(user.id, eventId, coverUri);
        if (url && !error) coverUrl = url;
      }

      const result = await updateEvent({
        eventId,
        organizerId: user.id,
        businessId,
        regionId,
        title: title.trim(),
        description: description.trim(),
        category,
        startsAt,
        endsAt,
        locationName: locationName.trim() || null,
        maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
        coverUrl,
        ticketType,
        ticketPriceCents: priceCents,
      });
      setSaving(false);

      if (result.error) {
        Alert.alert('Hata', result.error);
        return;
      }

      Alert.alert('Güncellendi', 'Etkinlik bilgileri kaydedildi.', [
        { text: 'Tamam', onPress: () => router.replace(`/detail/events/${eventId}` as never) },
      ]);
      return;
    }

    const result = await createEvent({
      organizerId: user.id,
      businessId,
      regionId,
      title: title.trim(),
      description: description.trim(),
      category,
      startsAt,
      endsAt,
      locationName: locationName.trim() || null,
      maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
      coverUrl: null,
      ticketType,
      ticketPriceCents: priceCents,
      latitude,
      longitude,
      communityId: communityId ?? null,
    });
    setSaving(false);

    if (result.error || !result.id) {
      Alert.alert('Hata', result.error ?? 'Etkinlik oluşturulamadı.');
      return;
    }

    if (coverUri) {
      const { url, error } = await uploadEventCover(user.id, result.id, coverUri);
      if (url && !error) {
        await supabase.from('events').update({ cover_url: url }).eq('id', result.id);
      }
    }

    Alert.alert(
      'Etkinlik yayınlandı',
      communityName
        ? `${communityName} topluluğunda etkinlik oluşturuldu.`
        : 'Etkinliğiniz haritada ve akışta görünecek.',
      [{
        text: 'Tamam',
        onPress: () => {
          if (communityId) {
            router.replace(`/communities/${communityId}` as never);
          } else {
            router.replace(`/detail/events/${result.id}` as never);
          }
        },
      }],
    );
  };

  const coverPreview = coverUri ?? existingCoverUrl;

  if (loadingEvent) {
    return (
      <GradientBackground>
        <View style={styles.loading}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={48}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={eventGoBack} style={[styles.iconBtn, { backgroundColor: `${colors.surface}E6` }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.topBarText}>
            <Text variant="label">{isEdit ? 'Etkinlik Düzenle' : 'Etkinlik Oluştur'}</Text>
            <Text secondary variant="caption" numberOfLines={1}>
              {isEdit
                ? 'Bilgileri güncelleyin'
                : communityName
                  ? `${communityName} topluluğu`
                  : 'Topluluğunuzu bir araya getirin'}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={
            isDark
              ? ([`${ACCENT}33`, `${ACCENT}12`, 'transparent'] as const)
              : ([`${ACCENT}28`, `${ACCENT}10`, 'transparent'] as const)
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroStrip}
        >
          <View style={styles.heroRow}>
            <View style={[styles.heroIcon, { backgroundColor: `${ACCENT}22` }]}>
              <Ionicons name="sparkles" size={22} color={ACCENT} />
            </View>
            <View style={styles.heroCopy}>
              <Text variant="caption" style={{ color: ACCENT, fontWeight: '700' }}>
                %{completionScore} tamamlandı
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: `${ACCENT}22` }]}>
                <View style={[styles.progressFill, { width: `${completionScore}%`, backgroundColor: ACCENT }]} />
              </View>
            </View>
          </View>
        </LinearGradient>

        <LivePreviewCard
          title={title}
          coverUri={coverPreview}
          category={category}
          locationName={locationName}
          startDate={startDate}
          startTime={startTime}
          ticketType={ticketType}
          ticketPrice={ticketPrice}
        />

        <FormSection step={1} title="Görünüm" subtitle="Kapak ve temel bilgiler">
          <Pressable onPress={pickCover} style={[styles.coverPicker, { borderColor: colors.border }]}>
            {coverPreview ? (
              <>
                <Image source={{ uri: coverPreview }} style={styles.coverPreview} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={styles.coverOverlay} />
                <View style={styles.coverEditBadge}>
                  <Ionicons name="camera" size={16} color="#fff" />
                  <Text variant="caption" style={styles.coverEditText}>
                    Değiştir
                  </Text>
                </View>
              </>
            ) : (
              <LinearGradient
                colors={[`${ACCENT}22`, `${ACCENT}08`]}
                style={styles.coverPlaceholder}
              >
                <View style={[styles.coverIconCircle, { backgroundColor: `${ACCENT}22` }]}>
                  <Ionicons name="image" size={28} color={ACCENT} />
                </View>
                <Text variant="label">Kapak görseli ekle</Text>
                <Text secondary variant="caption">
                  Akışta ve haritada öne çıkar
                </Text>
              </LinearGradient>
            )}
          </Pressable>

          <Input
            label="Başlık"
            value={title}
            onChangeText={setTitle}
            placeholder="Örn: Karadeniz Müzik Festivali"
          />
          <Input
            label="Açıklama"
            value={description}
            onChangeText={setDescription}
            placeholder="Etkinlik detayları, program, katılım koşulları..."
            multiline
            numberOfLines={4}
            style={styles.textarea}
          />
        </FormSection>

        <FormSection step={2} title="Kategori" subtitle="Etkinliğinizin türünü seçin">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {EVENT_CATEGORY_OPTIONS.map((option) => {
              const selected = category === option.value;
              const icon = EVENT_CATEGORY_ICONS[option.value] as keyof typeof Ionicons.glyphMap;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setCategory(option.value)}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: selected ? ACCENT : colors.border,
                      backgroundColor: selected ? `${ACCENT}16` : colors.surfaceElevated,
                    },
                  ]}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: selected ? `${ACCENT}22` : `${colors.textMuted}14` }]}>
                    <Ionicons name={icon} size={18} color={selected ? ACCENT : colors.textMuted} />
                  </View>
                  <Text
                    variant="caption"
                    style={{
                      color: selected ? ACCENT : colors.textSecondary,
                      fontWeight: selected ? '700' : '400',
                      textAlign: 'center',
                    }}
                    numberOfLines={2}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </FormSection>

        <FormSection step={3} title="Zaman & Konum" subtitle="Ne zaman, nerede?">
          <Input
            label="Konum adı"
            value={locationName}
            onChangeText={setLocationName}
            placeholder="Örn: Atatürk Alanı, Samsun"
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Input label="Başlangıç tarihi" value={startDate} onChangeText={setStartDate} placeholder="GG.AA.YYYY" />
            </View>
            <View style={styles.half}>
              <Input label="Başlangıç saati" value={startTime} onChangeText={setStartTime} placeholder="SS:DD" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="Bitiş tarihi"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="Opsiyonel"
              />
            </View>
            <View style={styles.half}>
              <Input label="Bitiş saati" value={endTime} onChangeText={setEndTime} placeholder="Opsiyonel" />
            </View>
          </View>
        </FormSection>

        <FormSection step={4} title="Bilet & Katılım" subtitle="Giriş koşullarını belirleyin">
          <View style={styles.ticketRow}>
            {(['free', 'paid'] as const).map((type) => {
              const selected = ticketType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setTicketType(type)}
                  style={[
                    styles.ticketCard,
                    {
                      borderColor: selected ? ACCENT : colors.border,
                      backgroundColor: selected ? `${ACCENT}12` : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Ionicons
                    name={type === 'free' ? 'gift-outline' : 'ticket-outline'}
                    size={22}
                    color={selected ? ACCENT : colors.textMuted}
                  />
                  <Text variant="label" style={{ color: selected ? ACCENT : colors.text }}>
                    {type === 'free' ? 'Ücretsiz' : 'Ücretli'}
                  </Text>
                  <Text secondary variant="caption">
                    {type === 'free' ? 'Herkes katılabilir' : 'Bilet satışı açık'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {ticketType === 'paid' ? (
            <Input
              label="Bilet fiyatı (TRY)"
              value={ticketPrice}
              onChangeText={setTicketPrice}
              placeholder="Örn: 150"
              keyboardType="decimal-pad"
            />
          ) : null}

          <Input
            label="Katılımcı limiti"
            value={maxAttendees}
            onChangeText={setMaxAttendees}
            placeholder="Opsiyonel — Örn: 100"
            keyboardType="number-pad"
          />

          {businessId ? (
            <View style={[styles.businessNote, { backgroundColor: `${ACCENT}10`, borderColor: `${ACCENT}33` }]}>
              <Ionicons name="storefront-outline" size={16} color={ACCENT} />
              <Text secondary variant="caption" style={styles.flex}>
                İşletme hesabınızla {isEdit ? 'güncellenecek' : 'oluşturulacak'} — takipçilerinize bildirim gider.
              </Text>
            </View>
          ) : null}
        </FormSection>
      </KeyboardAwareScrollView>

      <View
        style={[
          styles.stickyBar,
          {
            paddingBottom: insets.bottom + spacing.sm,
            borderTopColor: colors.border,
            backgroundColor: `${colors.surface}F5`,
          },
        ]}
      >
        <Pressable
          onPress={() => void handleSubmit()}
          disabled={saving}
          style={({ pressed }) => [
            styles.publishBtn,
            { backgroundColor: ACCENT, opacity: saving || pressed ? 0.88 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name={isEdit ? 'save' : 'rocket'} size={20} color="#fff" />
              <Text variant="label" style={{ color: '#fff' }}>
                {isEdit ? 'Değişiklikleri Kaydet' : 'Etkinliği Yayınla'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarText: {
    flex: 1,
    gap: 2,
  },
  heroStrip: {
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  previewCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  previewGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  previewLabel: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  previewCoverWrap: {
    height: 150,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  previewCover: {
    width: '100%',
    height: '100%',
  },
  previewCoverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCoverFade: {
    ...StyleSheet.absoluteFillObject,
  },
  previewCoverContent: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    gap: 4,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  previewChipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  previewTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  previewDate: {
    color: 'rgba(255,255,255,0.9)',
  },
  previewMeta: {
    gap: spacing.xs,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  section: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitles: {
    flex: 1,
    gap: 2,
  },
  sectionBody: {
    gap: spacing.sm,
  },
  coverPicker: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 180,
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  coverEditBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  coverEditText: {
    color: '#fff',
    fontWeight: '600',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  coverIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  categoryChip: {
    width: 88,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  ticketRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ticketCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  businessNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  flex: {
    flex: 1,
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
});
