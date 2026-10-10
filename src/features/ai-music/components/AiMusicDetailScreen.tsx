import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { AiMusicProgress } from '@/features/ai-music/components/AiMusicProgress';
import { AiMusicTransport } from '@/features/ai-music/components/AiMusicTransport';
import {
  aiMusicShareMessage,
  aiMusicStyleLabel,
  formatAiMusicAllowance,
  formatAiMusicClock,
} from '@/features/ai-music/constants';
import { useAiMusicPlayer } from '@/features/ai-music/hooks/useAiMusicPlayer';
import {
  approveAiMusicWork,
  deleteAiMusicWork,
  fetchAiMusicShares,
  fetchAiMusicWork,
  publishAiMusicWork,
  setAiMusicCover,
  updateAiMusicTitle,
  withdrawAiMusicWork,
} from '@/features/ai-music/services/aiMusicData';
import { saveAiMusicToPhone, shareAiMusicOnWhatsApp } from '@/features/ai-music/services/aiMusicExport';
import { fetchAiMusicBalance } from '@/features/ai-music/services/aiMusicMinutes';
import type { AiMusicBalance, AiMusicShare, AiMusicWork } from '@/features/ai-music/types';
import { MusicRangeTrimSlider } from '@/features/music/components/MusicRangeTrimSlider';
import { useLockStackBackGesture } from '@/features/music/hooks/useLockStackBackGesture';
import { formatMusicDuration } from '@/features/music/utils/formatMusicTime';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
import { uploadAiMusicCover } from '@/features/ai-music/services/coverUpload';
import { openReelsAtReel } from '@/features/reels/services/reelsNavigation';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const KIND_LABEL: Record<AiMusicShare['kind'], string> = {
  post: 'Gönderi',
  reel: 'Reel',
  story: 'Hikaye',
};

const VOCAL_LABEL = { instrumental: 'Yalnız müzik', female: 'Kadın ses', male: 'Erkek ses' };

const STATUS_LABEL: Record<string, string> = {
  generating: 'Hazırlanıyor',
  ready: 'Sende',
  published: 'Kütüphanede',
  failed: 'Tamamlanamadı',
};

export function AiMusicDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const workId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const setMusicSelection = useMusicSelectionStore((s) => s.setSelection);
  const [work, setWork] = useState<AiMusicWork | null>(null);
  const [shares, setShares] = useState<AiMusicShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stepBusy, setStepBusy] = useState<'approve' | 'publish' | null>(null);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [balance, setBalance] = useState<AiMusicBalance | null>(null);
  const [exportBusy, setExportBusy] = useState<'save' | 'whatsapp' | null>(null);
  const clipFor = useRef<string | null>(null);

  const player = useAiMusicPlayer(work?.audioUrl ?? null, work?.durationSec ?? 0);
  const trackDuration = Math.max(work?.durationSec ?? 0, player.duration);

  const load = useCallback(async () => {
    if (!workId) return;
    const next = await fetchAiMusicWork(workId);
    setWork(next);
    setTitle(next?.title ?? '');
    if (next && clipFor.current !== next.id) {
      clipFor.current = next.id;
      setClipStart(0);
      setClipEnd(next.durationSec);
    }
    setShares(next && next.status !== 'generating' ? await fetchAiMusicShares(next.id) : []);
    if (user) setBalance(await fetchAiMusicBalance());
    setLoading(false);
  }, [user, workId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (work?.status !== 'generating') return;
    const timer = setInterval(() => {
      void load();
    }, 2000);
    return () => clearInterval(timer);
  }, [load, work?.status]);

  const isOwner = !!user && work?.authorId === user.id;
  const canListen = !!work?.audioUrl && work.status !== 'generating' && work.status !== 'failed';
  const clipSec = Math.max(0, clipEnd - clipStart);
  useLockStackBackGesture(canListen && trackDuration > 0);

  const saveTitle = async () => {
    if (!work) return;
    setBusy(true);
    const error = await updateAiMusicTitle(work.id, title);
    setBusy(false);
    if (error) {
      Alert.alert('Kaydedilemedi', error);
      return;
    }
    setEditing(false);
    await load();
  };

  const confirmApprove = async () => {
    if (!work) return;
    setStepBusy('approve');
    const error = await approveAiMusicWork(work.id);
    setStepBusy(null);
    if (error) {
      Alert.alert('Onaylanamadı', error);
      return;
    }
    await load();
  };

  const handleApprove = () => {
    if (!work || work.approvedAt) return;
    Alert.alert(
      'Parçayı onayla',
      `${formatAiMusicAllowance(work.durationSec)} düşer. Kırpma ve düzenleme dakika düşürmez.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Onayla', onPress: () => void confirmApprove() },
      ],
    );
  };

  const confirmPublish = async () => {
    if (!work) return;
    setStepBusy('publish');
    const result = await publishAiMusicWork(work.id);
    setStepBusy(null);
    if (result.error) {
      Alert.alert('Gönderilemedi', result.error);
      return;
    }
    await load();
  };

  const handlePublish = () => {
    if (!work?.approvedAt || work.status === 'published') return;
    Alert.alert(
      'Kütüphaneye gönder',
      'Parça müzik kütüphanesinde açılır.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Gönder', onPress: () => void confirmPublish() },
      ],
    );
  };

  const handleWithdraw = () => {
    if (!work) return;
    Alert.alert(
      'Kütüphaneden kaldır',
      'Parça herkese açık kullanımdan kalkar. Sende durmaya devam eder.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            void withdrawAiMusicWork(work.id).then(async (error) => {
              if (error) Alert.alert('Kaldırılamadı', error);
              else await load();
            });
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    if (!work) return;
    Alert.alert('Parçayı sil', 'Bu parça senden ve platformdan tamamen silinir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          player.stop();
          void deleteAiMusicWork(work.id).then((error) => {
            if (error) {
              Alert.alert('Silinemedi', error);
              return;
            }
            router.back();
          });
        },
      },
    ]);
  };

  const pickCover = async () => {
    if (!work || !user || work.status === 'generating') return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Galeri izni gerekli', 'Kapak seçmek için galeri erişimine izin ver.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      });
      const uri = picked.assets?.[0]?.uri;
      if (picked.canceled || !uri) return;
      setBusy(true);
      const uploaded = await uploadAiMusicCover(user.id, uri);
      if (uploaded.error || !uploaded.path) {
        setBusy(false);
        Alert.alert('Kapak eklenemedi', uploaded.error ?? 'Görsel yüklenemedi.');
        return;
      }
      const saved = await setAiMusicCover(work.id, uploaded.url, uploaded.path);
      setBusy(false);
      if (saved.error) {
        Alert.alert('Kapak kaydedilemedi', saved.error);
        return;
      }
      setWork((current) =>
        current && current.id === work.id
          ? { ...current, coverUrl: uploaded.url, coverStoragePath: uploaded.path }
          : current,
      );
      await load();
    } catch (err) {
      setBusy(false);
      Alert.alert('Kapak eklenemedi', err instanceof Error ? err.message : 'Görsel seçilemedi.');
    }
  };

  const useClip = (mode: 'post' | 'reels' | 'story') => {
    if (!work?.audioUrl || work.status !== 'published') return;
    const trackId = work.musicTrackId ?? work.soundId;
    if (!trackId) return;
    player.stop();
    setMusicSelection({
      source: work.musicTrackId ? 'music' : 'sound',
      trackId,
      displayTitle: work.title,
      artist: work.rightsHolder,
      audioUrl: work.audioUrl,
      durationSec: trackDuration,
      musicStartSec: clipStart,
      musicEndSec: clipEnd > clipStart ? clipEnd : trackDuration,
      musicVolume: 0.8,
      originalAudioVolume: 1,
    });
    router.push(`/capture?mode=${mode}` as Href);
  };

  const saveToPhone = async () => {
    if (!work?.audioUrl || exportBusy) return;
    setExportBusy('save');
    const result = await saveAiMusicToPhone({
      workId: work.id,
      title: work.title,
      audioUrl: work.audioUrl,
    });
    setExportBusy(null);
    if (result.error) {
      Alert.alert('İndirilemedi', result.error);
      return;
    }
    if (result.saved === 'library') {
      Alert.alert('İndirildi', 'Parça telefonunun müzik klasörüne kaydedildi.');
    }
  };

  const shareOnWhatsApp = async () => {
    if (!work?.audioUrl || exportBusy) return;
    setExportBusy('whatsapp');
    const result = await shareAiMusicOnWhatsApp({
      workId: work.id,
      title: work.title,
      audioUrl: work.audioUrl,
    });
    setExportBusy(null);
    if (result.error) Alert.alert('Paylaşılamadı', result.error);
  };

  const shareClip = () => {
    if (!work) return;
    if (work.status !== 'published') {
      Alert.alert('Önce kütüphane', 'Seçtiğin bölümü paylaşmak için parçayı müzik kütüphanesine gönder.');
      return;
    }
    Alert.alert('Bu bölümü paylaş', `${formatMusicDuration(clipSec)} kullanılacak.`, [
      { text: 'Gönderi', onPress: () => useClip('post') },
      { text: 'Reels', onPress: () => useClip('reels') },
      { text: 'Hikaye', onPress: () => useClip('story') },
      {
        text: 'Bağlantı',
        onPress: () => {
          void Share.share({
            message: aiMusicShareMessage({
              title: work.title,
              rightsNotice: work.rightsNotice,
              soundId: work.soundId,
            }),
          });
        },
      },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const openMenu = () => {
    if (!work || !isOwner) return;
    const actions: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      {
        text: 'Lisans kodunu kopyala',
        onPress: () => {
          void Clipboard.setStringAsync(work.copyrightCode);
        },
      },
    ];
    if (work.status === 'published') {
      actions.push({ text: 'Kütüphaneden kaldır', onPress: handleWithdraw });
    }
    if (work.status !== 'generating') {
      actions.push({ text: 'Parçayı sil', style: 'destructive', onPress: handleDelete });
    }
    actions.push({ text: 'Vazgeç', style: 'cancel' });
    Alert.alert(work.title, undefined, actions);
  };

  const openShare = (item: AiMusicShare) => {
    if (item.kind === 'reel') {
      openReelsAtReel(item.contentId, { id: item.contentId, thumbnailUrl: item.thumbUrl, musicPlayback: null });
      return;
    }
    if (item.kind === 'story') {
      router.push(`/stories/${item.authorId}` as Href);
      return;
    }
    router.push(`/detail/posts/${item.contentId}` as Href);
  };

  return (
    <GradientBackground>
      <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.topBar}>
          <ScreenBackButton />
          <Text variant="label">Parça</Text>
          {isOwner && work && work.status !== 'generating' ? (
            <Pressable onPress={openMenu} hitSlop={12} style={styles.iconBtn}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.iconBtn} />
          )}
        </View>

        {loading && !work ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : !work ? (
          <View style={styles.center}>
            <Text secondary>Parça bulunamadı</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {work.status === 'generating' ? (
              <View style={[styles.card, { borderColor: colors.accent, backgroundColor: colors.surface }]}>
                <AiMusicProgress stage={work.stage} progress={work.progress} />
                <Text secondary>Bu ekrandan çıkabilirsin. Parça bitince bildirim gelir.</Text>
              </View>
            ) : null}

            <View style={styles.hero}>
              <Pressable
                disabled={!isOwner || work.status === 'generating' || busy}
                onPress={() => void pickCover()}
                style={styles.coverWrap}
              >
                {work.coverUrl ? (
                  <Image source={{ uri: work.coverUrl }} style={styles.cover} />
                ) : (
                  <LinearGradient colors={['#0B3A4A', '#0E7490', '#14B8A6']} style={styles.cover}>
                    <Ionicons name="musical-notes" size={48} color="#F8FAFC" />
                  </LinearGradient>
                )}
                {isOwner && work.status !== 'generating' ? (
                  <View style={styles.coverBadge}>
                    <Ionicons name="image-outline" size={14} color="#0F172A" />
                    <Text style={styles.coverBadgeText}>{work.coverUrl ? 'Kapağı değiştir' : 'Kapak ekle'}</Text>
                  </View>
                ) : null}
              </Pressable>
              {isOwner && work.status !== 'generating' ? (
                <Pressable
                  disabled={busy}
                  onPress={() => void pickCover()}
                  style={[styles.coverAction, { borderColor: colors.accent, backgroundColor: `${colors.accent}14` }]}
                >
                  <Ionicons name="image-outline" size={18} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontWeight: '800' }}>
                    {work.coverUrl ? 'Kapak resmini değiştir' : 'Kapak resmi ekle'}
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.titleRow}>
                {editing ? (
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                    style={[styles.titleInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  />
                ) : (
                  <Text variant="h2" style={styles.title} numberOfLines={2}>
                    {work.title}
                  </Text>
                )}
                {isOwner && work.status !== 'generating' ? (
                  <Pressable
                    onPress={() => {
                      if (editing) void saveTitle();
                      else setEditing(true);
                    }}
                    hitSlop={8}
                    style={[styles.editBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Ionicons name={editing ? 'checkmark' : 'pencil'} size={16} color={colors.text} />
                  </Pressable>
                ) : null}
              </View>
              {editing ? (
                <Pressable onPress={() => { setEditing(false); setTitle(work.title); }}>
                  <Text secondary variant="caption">Vazgeç</Text>
                </Pressable>
              ) : null}

              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: `${colors.accent}18` }]}>
                  <Ionicons name="time-outline" size={14} color={colors.accent} />
                  <Text variant="caption" style={{ color: colors.accent, fontWeight: '800' }}>
                    {formatAiMusicAllowance(trackDuration)}
                  </Text>
                  <Text variant="caption" style={{ color: colors.accent, fontWeight: '700' }}>
                    {formatAiMusicClock(trackDuration)}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
                  <Text variant="caption">{STATUS_LABEL[work.status] ?? work.status}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
                  <Text variant="caption">{VOCAL_LABEL[work.vocal]}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
                  <Text variant="caption">{aiMusicStyleLabel(work.style)}</Text>
                </View>
              </View>
            </View>

            {canListen ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AiMusicTransport
                  playing={player.playing}
                  position={player.position}
                  duration={trackDuration}
                  onToggle={() => void player.toggle()}
                  onSeek={(sec) => void player.seek(sec)}
                  onSkip={(delta) => void player.skip(delta)}
                />
              </View>
            ) : null}

            {canListen && work.audioUrl ? (
              <View style={styles.exportBlock}>
                <View style={styles.exportRow}>
                  <Pressable
                    disabled={exportBusy != null}
                    onPress={() => void saveToPhone()}
                    style={({ pressed }) => [
                      styles.exportBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        opacity: exportBusy != null ? 0.7 : pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    {exportBusy === 'save' ? (
                      <ActivityIndicator color={colors.accent} />
                    ) : (
                      <Ionicons name="download-outline" size={20} color={colors.accent} />
                    )}
                    <Text style={{ fontWeight: '800' }}>Telefona indir</Text>
                  </Pressable>
                  <Pressable
                    disabled={exportBusy != null}
                    onPress={() => void shareOnWhatsApp()}
                    style={({ pressed }) => [
                      styles.exportBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: '#25D36655',
                        opacity: exportBusy != null ? 0.7 : pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    {exportBusy === 'whatsapp' ? (
                      <ActivityIndicator color="#25D366" />
                    ) : (
                      <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                    )}
                    <Text style={{ fontWeight: '800' }}>WhatsApp</Text>
                  </Pressable>
                </View>
                <Text secondary variant="caption">
                  {Platform.OS === 'ios'
                    ? 'Kaydetmek için Dosyalar’ı seç. WhatsApp aynı menüden ses dosyasını alır.'
                    : Platform.OS === 'web'
                      ? 'MP3 indirilir. WhatsApp parçanın bağlantısını açar.'
                      : 'MP3 müzik klasörüne kaydedilir. WhatsApp, açılan menüden seçilir.'}
                </Text>
              </View>
            ) : null}

            {canListen && trackDuration > 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text variant="label">Bölüm seç</Text>
                <Text secondary variant="caption">
                  İstediğin aralığı sürükle. Paylaşımda {formatMusicDuration(clipSec)} çalar.
                </Text>
                <MusicRangeTrimSlider
                  trackDurationSec={trackDuration}
                  startSec={clipStart}
                  endSec={clipEnd > clipStart ? clipEnd : trackDuration}
                  onRangeChange={(start, end) => {
                    setClipStart(start);
                    setClipEnd(end);
                  }}
                />
                <Pressable
                  onPress={() => void player.playRange(clipStart, clipEnd > clipStart ? clipEnd : trackDuration)}
                  style={[styles.listenClip, { borderColor: colors.accent }]}
                >
                  <Ionicons name="play-circle-outline" size={18} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontWeight: '700' }}>Seçili bölümü dinle</Text>
                </Pressable>
              </View>
            ) : null}

            {isOwner ? (
              <Pressable
                onPress={() => router.push('/sounds/ai/packages' as Href)}
                style={[styles.allowance, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="time-outline" size={16} color={colors.accent} />
                <Text style={{ flex: 1 }}>
                  {balance ? `${formatAiMusicAllowance(balance.availableSec)} müzik dakikası` : 'Müzik dakikası'}
                </Text>
                <Text variant="caption" style={{ color: colors.accent, fontWeight: '700' }}>Dakika al</Text>
              </Pressable>
            ) : null}

            {isOwner && work.audioUrl && (work.status === 'ready' || work.status === 'published') ? (
              <View style={styles.actionStack}>
                <StepAction
                  step="1"
                  icon={work.approvedAt ? 'checkmark' : 'shield-checkmark-outline'}
                  title={work.approvedAt ? 'Onaylandı' : 'Onayla'}
                  hint={
                    work.approvedAt
                      ? 'Dakika düştü'
                      : `${formatAiMusicAllowance(work.durationSec)} düşer`
                  }
                  tone={work.approvedAt ? 'done' : 'accent'}
                  disabled={!!work.approvedAt || stepBusy != null}
                  loading={stepBusy === 'approve'}
                  onPress={handleApprove}
                />
                <StepAction
                  step="2"
                  icon={work.status === 'published' ? 'checkmark' : 'library-outline'}
                  title={work.status === 'published' ? 'Kütüphanede' : 'Kütüphaneye gönder'}
                  hint={libraryHint(work.status, !!work.approvedAt)}
                  tone={work.status === 'published' ? 'done' : work.approvedAt ? 'accent' : 'locked'}
                  disabled={!work.approvedAt || work.status === 'published' || stepBusy != null}
                  loading={stepBusy === 'publish'}
                  onPress={handlePublish}
                />
              </View>
            ) : null}

            {work.status === 'published' && work.audioUrl ? (
              <Button title="Bu bölümü paylaş" size="compact" onPress={shareClip} />
            ) : null}

            {work.status === 'published' ? (
              <Text secondary variant="caption">
                Kütüphanedeki parça gönderi, Reels ve hikâyede bu süreyle kullanılabilir.
              </Text>
            ) : null}

            {work.prompt ? <Text secondary>{work.prompt}</Text> : null}
            {work.lyrics ? <Text>{work.lyrics}</Text> : null}
            {work.errorMessage ? <Text style={{ color: colors.danger }}>{work.errorMessage}</Text> : null}

            <Pressable
              onPress={() => {
                void Clipboard.setStringAsync(work.copyrightCode);
                Alert.alert('Kopyalandı', work.copyrightCode);
              }}
              style={[styles.notice, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Ionicons name="shield-checkmark" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text variant="label">Telif kaydı</Text>
                <Text variant="caption" style={{ marginTop: 4 }}>{work.rightsNotice}</Text>
                <Text variant="caption" style={{ marginTop: 6, fontWeight: '800' }}>{work.copyrightCode}</Text>
              </View>
            </Pressable>

            {work.status === 'published' ? (
              <View style={styles.stats}>
                <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text variant="title">{work.accountUsageCount}</Text>
                  <Text secondary variant="caption">Hesap</Text>
                </View>
                <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text variant="title">{work.shareCount}</Text>
                  <Text secondary variant="caption">Paylaşım</Text>
                </View>
              </View>
            ) : null}

            <Text variant="label" style={styles.section}>Bu müziği paylaşanlar</Text>
            {shares.length === 0 ? (
              <Text secondary>Henüz gönderi, reel veya hikayede kullanılmadı.</Text>
            ) : (
              shares.map((item) => (
                <Pressable
                  key={`${item.kind}-${item.contentId}`}
                  onPress={() => openShare(item)}
                  style={[styles.shareRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  {item.thumbUrl ? (
                    <Image source={{ uri: item.thumbUrl }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: `${colors.accent}18` }]}>
                      <Ionicons name="images-outline" size={18} color={colors.accent} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" style={{ fontWeight: '700' }}>
                      {KIND_LABEL[item.kind]} · @{item.username}
                    </Text>
                    <Text secondary numberOfLines={2}>{item.caption || 'Paylaşım'}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </GradientBackground>
  );
}

function libraryHint(status: string, approved: boolean): string {
  if (status === 'published') return 'Herkese açık';
  if (approved) return 'Müzik kütüphanesine eklenir';
  return 'Önce onayla';
}

function StepAction({
  step,
  icon,
  title,
  hint,
  tone,
  disabled,
  loading,
  onPress,
}: {
  step: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
  tone: 'accent' | 'done' | 'locked';
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const filled = tone === 'accent';
  const done = tone === 'done';
  const ink = filled ? '#F8FAFC' : done ? colors.accent : colors.textMuted;
  const fill = filled ? colors.accent : colors.surface;
  const border = filled ? colors.accent : done ? `${colors.accent}55` : colors.border;

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepBtn,
        {
          backgroundColor: fill,
          borderColor: border,
          opacity: tone === 'locked' ? 0.72 : pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.stepBadge, { backgroundColor: filled ? 'rgba(255,255,255,0.2)' : `${colors.accent}16` }]}>
        {loading ? (
          <ActivityIndicator color={ink} size="small" />
        ) : (
          <Text style={{ color: ink, fontWeight: '800' }}>{step}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: filled ? '#F8FAFC' : colors.text, fontWeight: '800' }}>{title}</Text>
        <Text variant="caption" style={{ color: filled ? 'rgba(248,250,252,0.82)' : colors.textMuted }}>
          {hint}
        </Text>
      </View>
      <Ionicons name={icon} size={22} color={ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  hero: { alignItems: 'center', gap: spacing.sm },
  coverWrap: { position: 'relative' },
  cover: {
    width: 168,
    height: 168,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  coverBadgeText: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  coverAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  title: { flex: 1, textAlign: 'center' },
  titleInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    fontWeight: '700',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  actionStack: { gap: spacing.sm },
  exportBlock: { gap: spacing.xs },
  exportRow: { flexDirection: 'row', gap: spacing.sm },
  exportBtn: {
    flex: 1,
    minHeight: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.sm,
  },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    minHeight: 52,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  listenClip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  notice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.md },
  section: { marginTop: spacing.sm },
  shareRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.md },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
});
