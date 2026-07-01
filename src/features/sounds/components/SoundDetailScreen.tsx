import { useCallback, useEffect, useState } from 'react';
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
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { SOUND_REPORT_REASONS, soundBadgeLabel } from '@/features/sounds/constants';
import { useMusicPreview } from '@/features/music/hooks/useMusicPreview';
import {
  checkSoundEngagement,
  fetchSoundById,
  recordSoundListen,
  reportSound,
  toggleSoundFavorite,
  toggleSoundLike,
} from '@/features/sounds/services/soundData';
import { soundToMusicSelection } from '@/features/sounds/services/recordSoundUsage';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
import type { Sound } from '@/features/sounds/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function SoundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const soundId = Array.isArray(id) ? id[0] : id;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const setMusicSelection = useMusicSelectionStore((s) => s.setSelection);
  const { togglePreview, stopPreview, playingId } = useMusicPreview();

  const [sound, setSound] = useState<Sound | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!soundId) return;
    setLoading(true);
    const data = await fetchSoundById(soundId);
    setSound(data);
    if (data && user?.id) {
      const engagement = await checkSoundEngagement(data.id, user.id);
      setLiked(engagement.liked);
      setFavorited(engagement.favorited);
    }
    setLoading(false);
  }, [soundId, user?.id]);

  useEffect(() => {
    void load();
    return () => stopPreview();
  }, [load, stopPreview]);

  const handlePreview = async () => {
    if (!sound) return;
    const result = await togglePreview(sound.id, sound.audioUrl);
    if (result.ok && playingId !== sound.id) {
      void recordSoundListen(sound.id, 0, false);
    }
  };

  const handleUse = () => {
    if (!sound) return;
    stopPreview();
    setMusicSelection(
      soundToMusicSelection({
        id: sound.id,
        title: sound.title,
        audioUrl: sound.audioUrl,
        durationSec: sound.durationSec,
        authorUsername: sound.author?.username,
      }),
    );
    router.push('/capture' as Href);
  };

  const handleShare = async () => {
    if (!sound) return;
    await Share.share({ message: `${sound.title} — Vora Ses`, url: `https://vora.app/sounds/${sound.id}` });
  };

  const handleLike = async () => {
    if (!sound || !user) return;
    setBusy(true);
    const result = await toggleSoundLike(sound.id);
    setBusy(false);
    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }
    setLiked(result.liked);
    setSound((prev) =>
      prev ? { ...prev, likeCount: prev.likeCount + (result.liked ? 1 : -1) } : prev,
    );
  };

  const handleFavorite = async () => {
    if (!sound || !user) return;
    setBusy(true);
    const result = await toggleSoundFavorite(sound.id);
    setBusy(false);
    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }
    setFavorited(result.favorited);
    setSound((prev) =>
      prev ? { ...prev, favoriteCount: prev.favoriteCount + (result.favorited ? 1 : -1) } : prev,
    );
  };

  const handleReport = () => {
    if (!sound || !user) return;
    Alert.alert(
      'Şikayet Et',
      'Bir neden seçin',
      [
        ...SOUND_REPORT_REASONS.map((reason) => ({
          text: reason.label,
          onPress: () => {
            void reportSound(sound.id, reason.id).then((result) => {
              if (result.error) Alert.alert('Hata', result.error);
              else Alert.alert('Teşekkürler', 'Şikayetiniz alındı.');
            });
          },
        })),
        { text: 'İptal', style: 'cancel' },
      ],
    );
  };

  const badge = sound ? soundBadgeLabel(sound.badgeTier) : null;

  return (
    <GradientBackground>
      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.topBar}>
          <ScreenBackButton />
          <Text variant="label" style={styles.topTitle}>
            Ses
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : !sound ? (
          <View style={styles.loader}>
            <Text secondary>Ses bulunamadı</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <Pressable onPress={() => void handlePreview()} style={styles.hero}>
              {sound.coverUrl ? (
                <Image source={{ uri: sound.coverUrl }} style={styles.heroImage} />
              ) : (
                <LinearGradient colors={['#4f46e5', '#9333ea', '#db2777']} style={styles.heroImage}>
                  <Ionicons name="musical-notes" size={48} color="#fff" />
                </LinearGradient>
              )}
              <View style={styles.playOverlay}>
                <Ionicons name={playingId === sound.id ? 'pause' : 'play'} size={28} color="#fff" />
              </View>
            </Pressable>

            <Text variant="title" style={styles.title}>
              {sound.title}
            </Text>
            <Pressable onPress={() => router.push(`/u/${sound.author?.username ?? sound.authorId}` as Href)}>
              <Text secondary>
                {sound.author?.username ? `@${sound.author.username}` : 'Kullanıcı'} · {formatDate(sound.createdAt)}
              </Text>
            </Pressable>

            {badge ? (
              <View style={[styles.badge, { backgroundColor: `${colors.accent}18` }]}>
                <Ionicons name="ribbon-outline" size={14} color={colors.accent} />
                <Text variant="caption" style={{ color: colors.accent, fontWeight: '700' }}>
                  {badge}
                </Text>
              </View>
            ) : null}

            {sound.description ? (
              <Text secondary style={styles.description}>
                {sound.description}
              </Text>
            ) : null}

            <View style={styles.statsGrid}>
              {[
                { label: 'Kullanım', value: sound.usageCount },
                { label: 'Dinlenme', value: sound.listenCount },
                { label: 'Beğeni', value: sound.likeCount },
                { label: 'Kaydetme', value: sound.favoriteCount },
                { label: 'Paylaşım', value: sound.shareCount },
                { label: 'Trend', value: Math.round(sound.trendScore) },
              ].map((item) => (
                <View key={item.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text variant="title">{item.value.toLocaleString('tr-TR')}</Text>
                  <Text secondary variant="caption">
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.actions}>
              <Button onPress={handleUse}>Bu Sesi Kullan</Button>
              <View style={styles.row}>
                <Pressable onPress={() => void handleFavorite()} disabled={busy} style={[styles.actionChip, { borderColor: colors.border }]}>
                  <Ionicons name={favorited ? 'bookmark' : 'bookmark-outline'} size={18} color={colors.text} />
                  <Text variant="caption">Favori</Text>
                </Pressable>
                <Pressable onPress={() => void handleLike()} disabled={busy} style={[styles.actionChip, { borderColor: colors.border }]}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={colors.danger} />
                  <Text variant="caption">Beğen</Text>
                </Pressable>
                <Pressable onPress={() => void handleShare()} style={[styles.actionChip, { borderColor: colors.border }]}>
                  <Ionicons name="share-outline" size={18} color={colors.text} />
                  <Text variant="caption">Paylaş</Text>
                </Pressable>
                <Pressable onPress={handleReport} style={[styles.actionChip, { borderColor: colors.border }]}>
                  <Ionicons name="flag-outline" size={18} color={colors.textSecondary} />
                  <Text variant="caption">Şikayet</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  topTitle: { fontWeight: '700' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, gap: spacing.md },
  hero: {
    alignSelf: 'center',
    position: 'relative',
  },
  heroImage: {
    width: 180,
    height: 180,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playOverlay: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '800', textAlign: 'center' },
  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  description: { textAlign: 'center' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionChip: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
});
