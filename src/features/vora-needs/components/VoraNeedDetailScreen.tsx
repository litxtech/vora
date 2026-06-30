import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import {
  formatVoraNeedDate,
  voraNeedCategoryColor,
  voraNeedCategoryIcon,
  voraNeedCategoryLabel,
  VORA_NEED_STATUS_LABELS,
  VORA_NEED_VISIBILITY_LABELS,
  VORA_NEEDS_ACCENT,
} from '@/features/vora-needs/constants';
import {
  deleteVoraNeed,
  fetchVoraNeedById,
  hideVoraNeed,
  incrementVoraNeedView,
  reactivateVoraNeed,
  reportVoraNeed,
  toggleVoraNeedFavorite,
} from '@/features/vora-needs/services/needData';
import {
  getCachedVoraNeedDetail,
  setCachedVoraNeedDetail,
} from '@/features/vora-needs/services/voraNeedDetailCache';
import { startVoraNeedInquiry } from '@/features/vora-needs/services/needInquiry';
import type { VoraNeedListing } from '@/features/vora-needs/types';
import { regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { VORA_NEEDS_FEATURE } from '@/features/vora-needs/featureFlags';
import { useTheme } from '@/providers/ThemeProvider';

export function VoraNeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const showDetailMessage = useFeatureVisible(VORA_NEEDS_FEATURE.detailMessage);
  const showDetailFavorite = useFeatureVisible(VORA_NEEDS_FEATURE.detailFavorite);
  const showDetailReport = useFeatureVisible(VORA_NEEDS_FEATURE.detailReport);
  const showDetailReactivate = useFeatureVisible(VORA_NEEDS_FEATURE.detailReactivate);
  const showDetailHide = useFeatureVisible(VORA_NEEDS_FEATURE.detailHide);
  const showDetailDelete = useFeatureVisible(VORA_NEEDS_FEATURE.detailDelete);

  const [listing, setListing] = useState<VoraNeedListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(
    async (background = false) => {
      if (!id) return;

      const cached = getCachedVoraNeedDetail(id, user?.id ?? null);
      if (cached && !background) {
        setListing(cached);
        setLoading(false);
      } else if (!background && !cached) {
        setLoading(true);
      }

      const data = await fetchVoraNeedById(id, user?.id ?? null);
      if (data) {
        setCachedVoraNeedDetail(id, user?.id ?? null, data);
        setListing(data);
        if (!background) void incrementVoraNeedView(id);
      } else if (!cached) {
        setListing(null);
      }
      setLoading(false);
    },
    [id, user?.id],
  );

  useEffect(() => {
    const cached = id ? getCachedVoraNeedDetail(id, user?.id ?? null) : null;
    if (cached) {
      setListing(cached);
      setLoading(false);
      void load(true);
      return;
    }
    setListing(null);
    void load(false);
  }, [id, user?.id, load]);

  const isOwner = user?.id === listing?.authorId;

  const handleMessage = async () => {
    if (!id || !user?.id) {
      if (!(await requireAuth('Mesaj gönderme'))) return;
      return;
    }
    setSending(true);
    const { error, conversationId } = await startVoraNeedInquiry(id, user.id, message);
    setSending(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    if (conversationId) router.push(`/chat/${conversationId}` as never);
  };

  const handleFavorite = async () => {
    if (!listing || !user?.id) {
      if (!(await requireAuth('Favorilere ekleme'))) return;
      return;
    }
    const { isFavorited } = await toggleVoraNeedFavorite(listing.id, user.id, listing.isFavorited ?? false);
    setListing({ ...listing, isFavorited });
  };

  const handleReport = async () => {
    if (!listing || !user?.id) {
      if (!(await requireAuth('Şikayet'))) return;
      return;
    }
    Alert.alert('İlanı şikayet et', 'Bu ilanı neden şikayet ediyorsunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Spam',
        onPress: async () => {
          const { error } = await reportVoraNeed(listing.id, user.id, 'spam');
          Alert.alert(error ? 'Hata' : 'Teşekkürler', error ?? 'Şikayetiniz alındı.');
        },
      },
      {
        text: 'Uygunsuz',
        onPress: async () => {
          const { error } = await reportVoraNeed(listing.id, user.id, 'inappropriate');
          Alert.alert(error ? 'Hata' : 'Teşekkürler', error ?? 'Şikayetiniz alındı.');
        },
      },
    ]);
  };

  const handleHide = () => {
    if (!listing || !user?.id) return;
    Alert.alert('Yayından kaldır', 'İlanınız gizlenecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        onPress: async () => {
          const { error } = await hideVoraNeed(listing.id, user.id);
          if (error) Alert.alert('Hata', error);
          else void load(true);
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!listing || !user?.id) return;
    Alert.alert('İlanı sil', 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteVoraNeed(listing.id, user.id);
          if (error) Alert.alert('Hata', error);
          else router.back();
        },
      },
    ]);
  };

  const handleReactivate = async () => {
    if (!listing || !user?.id) return;
    const { error } = await reactivateVoraNeed(listing.id, user.id);
    if (error) Alert.alert('Hata', error);
    else void load(true);
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <Text secondary>Yükleniyor...</Text>
        </View>
      </GradientBackground>
    );
  }

  if (!listing) {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <Text variant="label">İlan bulunamadı</Text>
        </View>
      </GradientBackground>
    );
  }

  const categoryColor = voraNeedCategoryColor(listing.category);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {listing.imageUrl ? (
          <Image source={{ uri: listing.imageUrl }} style={styles.hero} />
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: `${categoryColor}18` }]}>
            <Ionicons
              name={voraNeedCategoryIcon(listing.category) as keyof typeof Ionicons.glyphMap}
              size={48}
              color={categoryColor}
            />
          </View>
        )}

        <GlassCard style={styles.card}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: `${categoryColor}18` }]}>
              <Text variant="caption" style={{ color: categoryColor }}>
                {voraNeedCategoryLabel(listing.category)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${VORA_NEEDS_ACCENT}18` }]}>
              <Text variant="caption" style={{ color: VORA_NEEDS_ACCENT }}>
                {VORA_NEED_VISIBILITY_LABELS[listing.visibility]}
              </Text>
            </View>
            {listing.urgency === 'urgent' ? (
              <View style={[styles.badge, { backgroundColor: `${colors.danger}18` }]}>
                <Text variant="caption" style={{ color: colors.danger }}>
                  Acil
                </Text>
              </View>
            ) : null}
            {listing.isFeatured ? (
              <View style={[styles.badge, { backgroundColor: '#FFB30022' }]}>
                <Text variant="caption" style={{ color: '#FFB300' }}>
                  Öne çıkan
                </Text>
              </View>
            ) : null}
          </View>

          <Text variant="h2">{listing.title}</Text>
          <Text secondary>{listing.description}</Text>

          <View style={styles.meta}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <Text secondary variant="caption">
              {listing.city ?? regionNameById(listing.regionId ?? '') ?? 'Genel'}
            </Text>
            <Text secondary variant="caption">
              · {formatVoraNeedDate(listing.createdAt)}
            </Text>
          </View>

          {listing.status !== 'active' ? (
            <View style={[styles.statusBanner, { backgroundColor: `${colors.warning}18` }]}>
              <Text variant="caption" style={{ color: colors.warning }}>
                Durum: {VORA_NEED_STATUS_LABELS[listing.status]}
              </Text>
            </View>
          ) : null}
        </GlassCard>

        {listing.authorUsername ? (
          <GlassCard style={styles.card}>
            <Text variant="label">İlan sahibi</Text>
            <Pressable
              style={[styles.sellerRow, { backgroundColor: `${colors.surface}AA`, borderColor: colors.border }]}
              onPress={() => router.push(`/u/${listing.authorUsername}` as never)}
            >
              <View style={styles.sellerAvatar}>
                {listing.authorAvatar ? (
                  <Image source={{ uri: listing.authorAvatar }} style={styles.sellerAvatarImage} />
                ) : (
                  <View style={[styles.sellerAvatarFallback, { backgroundColor: `${VORA_NEEDS_ACCENT}20` }]}>
                    <Ionicons name="person" size={20} color={VORA_NEEDS_ACCENT} />
                  </View>
                )}
              </View>
              <View style={styles.sellerInfo}>
                <Text variant="label">{listing.authorName ?? listing.authorUsername}</Text>
                <Text secondary variant="caption">
                  @{listing.authorUsername}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </GlassCard>
        ) : null}

        {!isOwner && listing.status === 'active' && (showDetailMessage || showDetailFavorite || showDetailReport) ? (
          <GlassCard style={styles.card}>
            <Text variant="label">İletişime geç</Text>
            {showDetailMessage ? (
            <Input
              value={message}
              onChangeText={setMessage}
              placeholder="Merhaba, ilanınızla ilgileniyorum..."
              multiline
              numberOfLines={3}
              style={styles.messageInput}
            />
            ) : null}
            <View style={styles.actions}>
              {showDetailMessage ? (
                <Button title="Mesaj gönder" loading={sending} onPress={handleMessage} />
              ) : null}
              {showDetailFavorite ? (
              <Pressable onPress={handleFavorite} style={styles.iconBtn}>
                <Ionicons
                  name={listing.isFavorited ? 'heart' : 'heart-outline'}
                  size={24}
                  color={listing.isFavorited ? colors.danger : colors.textMuted}
                />
              </Pressable>
              ) : null}
              {showDetailReport ? (
              <Pressable onPress={handleReport} style={styles.iconBtn}>
                <Ionicons name="flag-outline" size={24} color={colors.textMuted} />
              </Pressable>
              ) : null}
            </View>
          </GlassCard>
        ) : null}

        {isOwner && (showDetailReactivate || showDetailHide || showDetailDelete) ? (
          <GlassCard style={styles.card}>
            <Text variant="label">İlan yönetimi</Text>
            {listing.status === 'hidden' && showDetailReactivate ? (
              <Button title="Yeniden yayınla" onPress={handleReactivate} />
            ) : listing.status !== 'hidden' && showDetailHide ? (
              <Button title="Yayından kaldır" variant="secondary" onPress={handleHide} />
            ) : null}
            {showDetailDelete ? (
              <Button title="İlanı sil" variant="danger" onPress={handleDelete} />
            ) : null}
          </GlassCard>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  hero: {
    width: '100%',
    height: 220,
  },
  heroPlaceholder: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  statusBanner: {
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    padding: spacing.sm,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sellerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  sellerAvatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInfo: {
    flex: 1,
    gap: 2,
  },
});
