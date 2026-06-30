import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { LocationOptionSheet } from '@/components/location/LocationSheetPicker';
import {
  ANNOUNCEMENT_ACCENTS,
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_DURATIONS,
  ANNOUNCEMENT_LINK_LABEL_MAX,
  ANNOUNCEMENT_MEDIA_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  EMPTY_ANNOUNCEMENT_DRAFT,
} from '@/features/announcements/constants';
import {
  fetchAdminAnnouncements,
  fetchMyAnnouncements,
} from '@/features/announcements/services/announcementsData';
import { uploadAnnouncementMediaItems } from '@/features/announcements/services/announcementMedia';
import {
  createAnnouncement,
  updateAnnouncement,
} from '@/features/announcements/services/manageAnnouncements';
import { fetchBusinessRecordByOwner } from '@/features/profile/services/businessProfile';
import type { AnnouncementDraft, DraftMediaItem } from '@/features/announcements/types';
import { REGIONS, type RegionId } from '@/constants/regions';
import { canModerate } from '@/constants/roles';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const ALL_REGIONS_LABEL = 'Tüm bölgeler';

function newMediaId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function endsAtFromDays(days: number | null): string | null {
  if (days == null || days <= 0) return null;
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function formatEndDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CreateAnnouncementScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isAdmin = profile?.role ? canModerate(profile.role) : false;

  const [draft, setDraft] = useState<AnnouncementDraft>(EMPTY_ANNOUNCEMENT_DRAFT);
  const [bootLoading, setBootLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canAuthor, setCanAuthor] = useState(false);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [durationId, setDurationId] = useState('none');
  const [customDays, setCustomDays] = useState('');

  const isEditing = Boolean(id);

  const patch = useCallback((next: Partial<AnnouncementDraft>) => {
    setDraft((prev) => ({ ...prev, ...next }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      if (!user) return;
      const business = await fetchBusinessRecordByOwner(user.id);
      const allowed = isAdmin || business?.registrationStatus === 'approved';
      if (cancelled) return;
      setCanAuthor(Boolean(allowed));

      if (id) {
        const list = isAdmin ? await fetchAdminAnnouncements() : await fetchMyAnnouncements();
        const found = list.find((a) => a.id === id);
        if (found && !cancelled) {
          setDraft({
            id: found.id,
            title: found.title,
            body: found.body,
            mediaType: found.mediaType,
            mediaUrl: found.mediaUrl,
            thumbnailUrl: found.thumbnailUrl,
            localMediaUri: null,
            mediaItems: found.media.map((m) => ({
              id: newMediaId(),
              type: m.type,
              localUri: null,
              url: m.url,
              thumbnailUrl: m.thumbnailUrl,
              thumbnailLocalUri: null,
            })),
            linkUrl: found.linkUrl ?? '',
            linkLabel: found.linkLabel ?? '',
            accent: found.accent,
            regionId: found.regionId,
            startsAt: found.startsAt,
            endsAt: found.endsAt,
            isPinned: found.isPinned,
            priority: found.priority,
            isActive: found.isActive,
          });
          if (found.endsAt) {
            const remaining = Math.max(
              1,
              Math.ceil((new Date(found.endsAt).getTime() - Date.now()) / 86_400_000),
            );
            setDurationId('custom');
            setCustomDays(String(remaining));
          }
        }
      }
      if (!cancelled) setBootLoading(false);
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [user, id, isAdmin]);

  const appendMedia = useCallback((items: DraftMediaItem[]) => {
    if (items.length === 0) return;
    setDraft((prev) => ({
      ...prev,
      mediaItems: [...prev.mediaItems, ...items].slice(0, ANNOUNCEMENT_MEDIA_MAX),
    }));
  }, []);

  const removeMedia = useCallback((mediaId: string) => {
    setDraft((prev) => ({
      ...prev,
      mediaItems: prev.mediaItems.filter((m) => m.id !== mediaId),
    }));
  }, []);

  const addImages = useCallback(async () => {
    const remaining = ANNOUNCEMENT_MEDIA_MAX - draft.mediaItems.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const items: DraftMediaItem[] = result.assets.slice(0, remaining).map((asset) => ({
      id: newMediaId(),
      type: 'image',
      localUri: asset.uri,
      url: null,
      thumbnailUrl: null,
      thumbnailLocalUri: null,
    }));
    appendMedia(items);
  }, [draft.mediaItems.length, appendMedia]);

  const addVideo = useCallback(async () => {
    if (draft.mediaItems.length >= ANNOUNCEMENT_MEDIA_MAX) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.85,
      videoMaxDuration: 60,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    let thumbnailLocalUri: string | null = null;
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
        time: 1000,
        quality: 0.8,
      });
      thumbnailLocalUri = uri;
    } catch {
      // poster üretilemezse sessizce geç — kartta degrade fallback gösterilir
    }
    appendMedia([
      {
        id: newMediaId(),
        type: 'video',
        localUri: asset.uri,
        url: null,
        thumbnailUrl: null,
        thumbnailLocalUri,
      },
    ]);
  }, [draft.mediaItems.length, appendMedia]);

  const regionOptions = useMemo(
    () => REGIONS.map((r) => ({ id: r.id, label: r.name, icon: 'location-outline' as const })),
    [],
  );
  const regionName = draft.regionId
    ? (REGIONS.find((r) => r.id === draft.regionId)?.name ?? ALL_REGIONS_LABEL)
    : ALL_REGIONS_LABEL;

  const canAddMore = draft.mediaItems.length < ANNOUNCEMENT_MEDIA_MAX;

  const onSave = useCallback(async () => {
    if (!user) return;
    if (draft.title.trim().length < 2) {
      Alert.alert('Eksik bilgi', 'Lütfen bir başlık gir.');
      return;
    }

    setSaving(true);
    try {
      let nextDraft = draft;

      if (draft.mediaItems.length > 0) {
        const { media, error } = await uploadAnnouncementMediaItems(user.id, draft.mediaItems);
        if (error) {
          Alert.alert('Yükleme hatası', error);
          setSaving(false);
          return;
        }
        const uploadedItems: DraftMediaItem[] = media.map((m) => ({
          id: newMediaId(),
          type: m.type,
          localUri: null,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          thumbnailLocalUri: null,
        }));
        const first = uploadedItems[0];
        nextDraft = {
          ...draft,
          mediaItems: uploadedItems,
          mediaType: first?.type ?? 'none',
          mediaUrl: first?.url ?? null,
          thumbnailUrl: first?.thumbnailUrl ?? null,
          localMediaUri: null,
        };
      } else {
        nextDraft = {
          ...draft,
          mediaType: 'none',
          mediaUrl: null,
          thumbnailUrl: null,
          localMediaUri: null,
        };
      }

      const result = isEditing && draft.id
        ? await updateAnnouncement(draft.id, nextDraft)
        : await createAnnouncement(nextDraft);

      if (result.error) {
        Alert.alert('Hata', result.error);
        setSaving(false);
        return;
      }

      if (router.canGoBack()) router.back();
    } finally {
      setSaving(false);
    }
  }, [user, draft, isEditing]);

  if (bootLoading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  if (!canAuthor) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top, padding: spacing.lg }]}>
          <Ionicons name="megaphone-outline" size={42} color={colors.textMuted} />
          <Text variant="h3" style={{ textAlign: 'center', marginTop: spacing.md }}>
            Duyuru oluşturamazsın
          </Text>
          <Text secondary style={{ textAlign: 'center', marginTop: spacing.xs }}>
            Duyuru paylaşmak için onaylı bir işletme hesabın olmalı.
          </Text>
          <Button title="Geri dön" variant="secondary" style={{ marginTop: spacing.lg }} onPress={() => router.back()} />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="h3">{isEditing ? 'Duyuruyu düzenle' : 'Yeni duyuru'}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Medya */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.mediaHeader}>
            <Text variant="label" style={styles.cardTitle}>
              Medya
            </Text>
            <Text variant="caption" secondary>
              {draft.mediaItems.length}/{ANNOUNCEMENT_MEDIA_MAX}
            </Text>
          </View>

          {draft.mediaItems.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}
            >
              {draft.mediaItems.map((item) => {
                const thumbUri =
                  item.type === 'image'
                    ? (item.localUri ?? item.url)
                    : (item.thumbnailLocalUri ?? item.thumbnailUrl);
                return (
                  <View key={item.id} style={styles.thumb}>
                    {thumbUri ? (
                      <OptimizedImage
                        uri={thumbUri}
                        style={styles.thumbImg}
                        contentFit="cover"
                        tier="thumb"
                      />
                    ) : (
                      <View style={[styles.thumbImg, styles.thumbFallback]}>
                        <Ionicons name="film-outline" size={22} color="#fff" />
                      </View>
                    )}
                    {item.type === 'video' ? (
                      <View style={styles.videoTag}>
                        <Ionicons name="play" size={11} color="#fff" />
                      </View>
                    ) : null}
                    <Pressable
                      style={styles.removeMedia}
                      onPress={() => removeMedia(item.id)}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          ) : null}

          {canAddMore ? (
            <View style={styles.mediaButtons}>
              <Pressable
                style={[styles.mediaBtn, { borderColor: colors.border }]}
                onPress={() => void addImages()}
              >
                <Ionicons name="images-outline" size={22} color={colors.primary} />
                <Text variant="caption" style={{ fontWeight: '600' }}>
                  Resim ekle
                </Text>
              </Pressable>
              <Pressable
                style={[styles.mediaBtn, { borderColor: colors.border }]}
                onPress={() => void addVideo()}
              >
                <Ionicons name="videocam-outline" size={22} color={colors.primary} />
                <Text variant="caption" style={{ fontWeight: '600' }}>
                  Video ekle
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text variant="caption" secondary>
              Maksimum {ANNOUNCEMENT_MEDIA_MAX} medya ekleyebilirsin.
            </Text>
          )}
        </View>

        {/* Metin */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Input
            label="Başlık"
            placeholder="Duyuru başlığı"
            value={draft.title}
            onChangeText={(t) => patch({ title: t.slice(0, ANNOUNCEMENT_TITLE_MAX) })}
            maxLength={ANNOUNCEMENT_TITLE_MAX}
          />
          <Input
            label="Açıklama"
            placeholder="Duyuru metni (isteğe bağlı)"
            value={draft.body}
            onChangeText={(t) => patch({ body: t.slice(0, ANNOUNCEMENT_BODY_MAX) })}
            multiline
            numberOfLines={4}
            style={styles.multiline}
            maxLength={ANNOUNCEMENT_BODY_MAX}
          />
        </View>

        {/* Bağlantı */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="label" style={styles.cardTitle}>
            Tıklanabilir bağlantı
          </Text>
          <Input
            label="Bağlantı (URL veya /uygulama-yolu)"
            placeholder="https://... veya /events/123"
            value={draft.linkUrl}
            onChangeText={(t) => patch({ linkUrl: t })}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Buton yazısı"
            placeholder="Detayı gör"
            value={draft.linkLabel}
            onChangeText={(t) => patch({ linkLabel: t.slice(0, ANNOUNCEMENT_LINK_LABEL_MAX) })}
            maxLength={ANNOUNCEMENT_LINK_LABEL_MAX}
          />
        </View>

        {/* Vurgu rengi */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="label" style={styles.cardTitle}>
            Vurgu rengi
          </Text>
          <View style={styles.accentRow}>
            {ANNOUNCEMENT_ACCENTS.map((accent) => (
              <Pressable
                key={accent}
                onPress={() => patch({ accent })}
                style={[
                  styles.accentDot,
                  { backgroundColor: accent },
                  draft.accent === accent && styles.accentDotActive,
                ]}
              >
                {draft.accent === accent ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Yayın ayarları */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="label" style={styles.cardTitle}>
            Yayın
          </Text>

          <Pressable
            style={[styles.rowBtn, { borderColor: colors.border }]}
            onPress={() => setShowRegionPicker(true)}
          >
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={{ flex: 1 }}>{regionName}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={styles.durationBlock}>
            <Text variant="caption" secondary>
              Görünme süresi
            </Text>
            <View style={styles.chipRow}>
              {ANNOUNCEMENT_DURATIONS.map((d) => {
                const active = durationId === d.id;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => {
                      setDurationId(d.id);
                      setCustomDays('');
                      patch({ endsAt: endsAtFromDays(d.days) });
                    }}
                    style={[
                      styles.durChip,
                      { borderColor: colors.border },
                      active && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}
                    >
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Input
              label="Özel süre (gün)"
              placeholder="örn. 5"
              keyboardType="number-pad"
              value={customDays}
              onChangeText={(t) => {
                const n = t.replace(/[^0-9]/g, '');
                setCustomDays(n);
                setDurationId('custom');
                patch({ endsAt: endsAtFromDays(n ? parseInt(n, 10) : null) });
              }}
            />
            <Text variant="caption" secondary>
              {draft.endsAt ? `Bitiş: ${formatEndDate(draft.endsAt)}` : 'Süresiz yayında kalır'}
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <Text>Aktif (yayında)</Text>
            <Switch value={draft.isActive} onValueChange={(v) => patch({ isActive: v })} />
          </View>

          {isAdmin ? (
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text>Üste sabitle</Text>
                <Text secondary variant="caption">
                  Sabitlenen duyurular şeridin başında gösterilir
                </Text>
              </View>
              <Switch value={draft.isPinned} onValueChange={(v) => patch({ isPinned: v })} />
            </View>
          ) : null}
        </View>

        <Button
          title={isEditing ? 'Değişiklikleri kaydet' : 'Duyuruyu yayınla'}
          loading={saving}
          onPress={() => void onSave()}
        />
      </ScrollView>

      <LocationOptionSheet<RegionId>
        visible={showRegionPicker}
        onClose={() => setShowRegionPicker(false)}
        title="Bölge seç"
        value={draft.regionId}
        options={regionOptions}
        onSelect={(value) => patch({ regionId: value })}
        allOption={{ label: ALL_REGIONS_LABEL, icon: 'earth-outline' }}
        searchPlaceholder="Bölge ara…"
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontWeight: '700',
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTag: {
    position: 'absolute',
    left: 6,
    top: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  removeMedia: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mediaBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  accentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  accentDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentDotActive: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  durationBlock: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  durChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
});
